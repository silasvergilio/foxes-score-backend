const express = require("express");
const router = express.Router();
const Game = require("../models/mGame");

const TEAM_FIELDS = "name code imageFile slot location";

router.post("/", async function (req, res) {
  try {
    const game = new Game(req.body);
    await game.save();
    const populated = await game.populate([
      { path: "homeTeam", select: TEAM_FIELDS },
      { path: "awayTeam", select: TEAM_FIELDS },
    ]);
    return res
      .status(201)
      .json({ message: "Jogo salvo com sucesso!", game: populated });
  } catch (error) {
    console.error("erro ao salvar jogo: ", error);
    return res.status(500).json({ error: "Erro ao salvar jogo" });
  }
});

// GET /game/schedule?tournament=...&year=...&division=...&status=...&from=...&to=...
router.get("/schedule", async function (req, res) {
  try {
    const filter = {};
    if (req.query.tournament) filter.tournament = req.query.tournament;
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.division) filter.division = String(req.query.division);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }

    const games = await Game.find(filter)
      .sort({ round: 1, field: 1, date: 1 })
      .populate("homeTeam", TEAM_FIELDS)
      .populate("awayTeam", TEAM_FIELDS)
      .lean();

    res.status(200).json(games);
  } catch (error) {
    console.error("Erro ao buscar agenda: ", error);
    res.status(500).json({ error: "Erro ao buscar agenda" });
  }
});

router.get("/:id", async function (req, res) {
  try {
    const game = await Game.findById(req.params.id)
      .populate("homeTeam", TEAM_FIELDS)
      .populate("awayTeam", TEAM_FIELDS);
    if (!game) {
      return res.status(404).json({ error: "Jogo não encontrado" });
    }
    res.status(200).json(game);
  } catch (error) {
    console.error("Erro ao buscar jogo por ID: ", error);
    res.status(500).json({ error: "Erro ao buscar jogo" });
  }
});

router.get("/", async function (req, res) {
  try {
    const games = await Game.find(req.query)
      .populate("homeTeam", TEAM_FIELDS)
      .populate("awayTeam", TEAM_FIELDS);
    res.status(200).json(games);
  } catch (error) {
    console.error("Erro ao buscar jogos: ", error);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
});

router.put("/", async function (req, res) {
  const io = req.app.get("io");
  const { _id, ...updates } = req.body;

  if (!_id) {
    return res.status(400).json({ error: "_id do jogo é obrigatório" });
  }

  try {
    const game = await Game.findByIdAndUpdate(_id, updates, { new: true })
      .populate("homeTeam", TEAM_FIELDS)
      .populate("awayTeam", TEAM_FIELDS);
    if (!game) {
      return res.status(404).json({ error: "Jogo não encontrado" });
    }

    io.emit("gameUpdate", game);
    res.status(200).json({ message: "Jogo atualizado com sucesso!", game });
  } catch (error) {
    console.error("Erro ao atualizar jogo: ", error);
    res.status(500).json({ error: "Erro ao atualizar jogo" });
  }
});

// ────────── Live scoring (event log + lifecycle) ──────────
//
// All scoring actions on the live screen flow through these endpoints.
// State changes are computed by lib/scoringReducer.js and the resulting
// game snapshot is broadcast on the `gameUpdate` socket channel.

const GameEvent = require("../models/mGameEvent");
const Player = require("../models/mPlayer");
const reducer = require("../lib/scoringReducer");

/** Load the player docs touched by an event so reducers can mutate stats. */
async function loadPlayersFor(events) {
  const ids = new Set();
  for (const ev of events) {
    if (ev.type === "pa_result") {
      const { batter, pitcher } = ev.payload || {};
      if (batter) ids.add(String(batter));
      if (pitcher) ids.add(String(pitcher));
    }
  }
  if (ids.size === 0) return new Map();
  const players = await Player.find({ _id: { $in: [...ids] } });
  return new Map(players.map((p) => [String(p._id), p]));
}

/** Save a batch of Player documents in parallel. */
async function savePlayers(map) {
  await Promise.all([...map.values()].map((p) => p.save()));
}

/** Annotate an event with the game-clock context at apply time. */
function snapshot(event, game) {
  event.inning = game.inning;
  event.half = game.inningHalf;
  event.outs = game.outs;
}

/**
 * POST /game/:id/events
 * Body: { type, payload }
 *
 * Appends a single event, applies it (plus any cascade) to game state
 * and player stats, persists everything, and emits `gameUpdate`.
 */
router.post("/:id/events", async function (req, res) {
  const io = req.app.get("io");
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: "Jogo não encontrado" });

    const { type, payload } = req.body || {};
    if (!type) return res.status(400).json({ error: "type é obrigatório" });

    // 1) Build the queue: caller's event + any cascaded follow-ups.
    let seq = await reducer.nextSeq(GameEvent, game._id);
    const queue = [{ type, payload: payload || {} }];
    const appended = [];

    // Pre-load players for the caller's event; cascades load lazily.
    const players = await loadPlayersFor(queue);

    while (queue.length > 0) {
      const current = queue.shift();

      // If the cascade introduces new player refs, pull them in.
      if (current.type === "pa_result") {
        const ids = [];
        if (current.payload?.batter) ids.push(String(current.payload.batter));
        if (current.payload?.pitcher) ids.push(String(current.payload.pitcher));
        const missing = ids.filter((id) => !players.has(id));
        if (missing.length > 0) {
          const extra = await Player.find({ _id: { $in: missing } });
          for (const p of extra) players.set(String(p._id), p);
        }
      }

      const event = new GameEvent({
        game: game._id,
        seq: seq++,
        type: current.type,
        payload: current.payload,
      });
      snapshot(event, game);

      const followUps = reducer.applyEvent(game, event, players) || [];

      appended.push(event);
      for (const f of followUps) queue.push(f);
    }

    // 2) Persist events, game, mutated players.
    await Promise.all(appended.map((e) => e.save()));
    await game.save();
    await savePlayers(players);

    // 3) Re-fetch populated + emit.
    const populated = await Game.findById(game._id)
      .populate("homeTeam", TEAM_FIELDS)
      .populate("awayTeam", TEAM_FIELDS);
    if (io) io.emit("gameUpdate", populated);

    res.status(201).json({ game: populated, events: appended });
  } catch (err) {
    console.error("Erro ao registrar evento: ", err);
    res.status(500).json({ error: "Erro ao registrar evento" });
  }
});

/**
 * Recompute game state + player stats from the visible event log.
 * Called by undo/redo, where partial reversal of cascades would be
 * fragile — a full replay is simpler and bounded by O(N events).
 */
async function rebuildGameFromEvents(game) {
  game.status = "scheduled";
  game.inning = 1;
  game.inningHalf = "top";
  game.outs = 0;
  game.balls = 0;
  game.strikes = 0;
  game.bases = { first: false, second: false, third: false };
  game.homeScore = 0;
  game.awayScore = 0;
  game.homeInnings = [];
  game.awayInnings = [];
  game.homeCurrentBatterIdx = 0;
  game.awayCurrentBatterIdx = 0;

  const events = await GameEvent.find({
    game: game._id,
    undone: false,
  }).sort({ seq: 1 });

  const players = await loadPlayersFor(events);

  // Reset every touched player's stats so we can re-derive cleanly.
  for (const p of players.values()) {
    if (p.batting) {
      p.batting.PA = 0; p.batting.AB = 0; p.batting.R = 0;
      p.batting.H = 0; p.batting.HR = 0; p.batting.RBI = 0;
      p.batting.BB = 0; p.batting.SO = 0; p.batting.SB = 0;
      p.batting.AVG = 0;
    }
    if (p.pitching) {
      p.pitching.IP = 0; p.pitching.R = 0; p.pitching.ER = 0;
      p.pitching.ERA = 0; p.pitching.K = 0; p.pitching.H = 0;
      p.pitching.BB = 0;
    }
  }

  for (const ev of events) {
    reducer.applyEvent(game, ev, players);
  }

  await game.save();
  await savePlayers(players);
}

/**
 * POST /game/:id/events/undo
 * Marks the most recent visible event as undone, then recomputes state.
 */
router.post("/:id/events/undo", async function (req, res) {
  const io = req.app.get("io");
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: "Jogo não encontrado" });

    const last = await GameEvent.findOne({
      game: game._id,
      undone: false,
    }).sort({ seq: -1 });
    if (!last) return res.status(409).json({ error: "Nada para desfazer" });

    last.undone = true;
    await last.save();

    await rebuildGameFromEvents(game);

    const populated = await Game.findById(game._id)
      .populate("homeTeam", TEAM_FIELDS)
      .populate("awayTeam", TEAM_FIELDS);
    if (io) io.emit("gameUpdate", populated);
    res.status(200).json({ game: populated, undoneSeq: last.seq });
  } catch (err) {
    console.error("Erro no undo: ", err);
    res.status(500).json({ error: "Erro ao desfazer evento" });
  }
});

/**
 * POST /game/:id/events/redo
 * Restores the earliest undone event after the last visible one.
 */
router.post("/:id/events/redo", async function (req, res) {
  const io = req.app.get("io");
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: "Jogo não encontrado" });

    const lastVisible = await GameEvent.findOne({
      game: game._id,
      undone: false,
    }).sort({ seq: -1 });
    const minSeq = lastVisible ? lastVisible.seq + 1 : 1;

    const next = await GameEvent.findOne({
      game: game._id,
      undone: true,
      seq: { $gte: minSeq },
    }).sort({ seq: 1 });

    if (!next) return res.status(409).json({ error: "Nada para refazer" });

    next.undone = false;
    await next.save();

    await rebuildGameFromEvents(game);

    const populated = await Game.findById(game._id)
      .populate("homeTeam", TEAM_FIELDS)
      .populate("awayTeam", TEAM_FIELDS);
    if (io) io.emit("gameUpdate", populated);
    res.status(200).json({ game: populated, redoneSeq: next.seq });
  } catch (err) {
    console.error("Erro no redo: ", err);
    res.status(500).json({ error: "Erro ao refazer evento" });
  }
});

/**
 * GET /game/:id/events
 *
 *   ?undone=false  → only events that count toward current state
 *   (default)      → everything, including soft-deleted, for audit
 */
router.get("/:id/events", async function (req, res) {
  try {
    const filter = { game: req.params.id };
    if (req.query.undone === "false") filter.undone = false;
    const events = await GameEvent.find(filter).sort({ seq: 1 });
    res.status(200).json(events);
  } catch (err) {
    console.error("Erro ao listar eventos: ", err);
    res.status(500).json({ error: "Erro ao listar eventos" });
  }
});

/**
 * PUT /game/:id/start
 * Flips status to live, resets scoreboard counters, initialises lineup
 * cursors, and logs a `game_start` event.
 */
router.put("/:id/start", async function (req, res) {
  const io = req.app.get("io");
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: "Jogo não encontrado" });
    if (game.status === "finished") {
      return res.status(409).json({ error: "Jogo já está finalizado" });
    }

    const seq = await reducer.nextSeq(GameEvent, game._id);
    const event = new GameEvent({
      game: game._id, seq, type: "game_start", payload: {},
    });
    reducer.applyEvent(game, event, new Map());
    snapshot(event, game);

    await event.save();
    await game.save();

    const populated = await Game.findById(game._id)
      .populate("homeTeam", TEAM_FIELDS)
      .populate("awayTeam", TEAM_FIELDS);
    if (io) io.emit("gameUpdate", populated);
    res.status(200).json({ game: populated });
  } catch (err) {
    console.error("Erro ao iniciar jogo: ", err);
    res.status(500).json({ error: "Erro ao iniciar jogo" });
  }
});

/**
 * PUT /game/:id/end
 * Flips status to finished and logs a `game_end` event. The scoring
 * screen should switch to read-only after this.
 */
router.put("/:id/end", async function (req, res) {
  const io = req.app.get("io");
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: "Jogo não encontrado" });

    const seq = await reducer.nextSeq(GameEvent, game._id);
    const event = new GameEvent({
      game: game._id, seq, type: "game_end", payload: {},
    });
    reducer.applyEvent(game, event, new Map());
    snapshot(event, game);

    await event.save();
    await game.save();

    const populated = await Game.findById(game._id)
      .populate("homeTeam", TEAM_FIELDS)
      .populate("awayTeam", TEAM_FIELDS);
    if (io) io.emit("gameUpdate", populated);
    res.status(200).json({ game: populated });
  } catch (err) {
    console.error("Erro ao finalizar jogo: ", err);
    res.status(500).json({ error: "Erro ao finalizar jogo" });
  }
});

module.exports = router;
