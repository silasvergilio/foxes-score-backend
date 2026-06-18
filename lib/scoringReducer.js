/**
 * Scoring reducers — apply one GameEvent at a time to a Game's mutable
 * state. Also handles inline Player-stat increments (batting + pitching)
 * for `pa_result` events. The route layer is responsible for
 * persistence (saving Game + the affected Players + the event).
 *
 * Each `apply*` function:
 *   - mutates `game` in place (caller saves afterwards)
 *   - optionally returns an array of *follow-up events* that the
 *     caller should append + apply right after (this is how a 4-ball
 *     count auto-cascades into a pa_result BB, and a 3rd-out
 *     pa_result cascades into an inning_change)
 *   - touches Player stats via the `incrementBatterStats` /
 *     `incrementPitcherStats` helpers
 *
 * Stat changes can be reversed via the matching `decrement*` helpers
 * so that UNDO doesn't need to recompute every player from scratch.
 */

// ────────── Helpers ──────────

function startersOf(game, side) {
  const lineup = side === "home" ? game.homeLineup : game.awayLineup;
  return (lineup || [])
    .filter((e) => e.isStarter !== false && e.battingOrder != null)
    .sort((a, b) => (a.battingOrder ?? 99) - (b.battingOrder ?? 99));
}

function findStarterByPosition(lineup, position) {
  const entry = (lineup || []).find(
    (e) => e.isStarter !== false && e.position === position
  );
  return entry ? entry.player : null;
}

function battingSide(game) {
  return game.inningHalf === "top" ? "away" : "home";
}

function fieldingSide(game) {
  return battingSide(game) === "home" ? "away" : "home";
}

function currentBatterId(game) {
  const side = battingSide(game);
  const idxField = side === "home" ? "homeCurrentBatterIdx" : "awayCurrentBatterIdx";
  const starters = startersOf(game, side);
  if (starters.length === 0) return null;
  const idx = ((game[idxField] ?? 0) % starters.length + starters.length) % starters.length;
  return starters[idx].player;
}

function currentPitcherId(game) {
  const side = fieldingSide(game);
  return side === "home" ? game.homeCurrentPitcherId : game.awayCurrentPitcherId;
}

function advanceBatter(game) {
  const side = battingSide(game);
  const starters = startersOf(game, side);
  if (starters.length === 0) return;
  const idxField = side === "home" ? "homeCurrentBatterIdx" : "awayCurrentBatterIdx";
  game[idxField] = (((game[idxField] ?? 0) + 1) % starters.length);
}

/**
 * Push an inning's run total into the per-half innings array. The
 * `homeInnings` and `awayInnings` arrays grow one entry per completed
 * half-inning; index 0 = inning 1, etc.
 */
function recordInningRuns(game, side, runs) {
  const arr = side === "home" ? game.homeInnings : game.awayInnings;
  // `arr` is a Mongoose array; .push works.
  arr.push(runs);
}

/**
 * Innings pitched in baseball convention: 1.0 = 1 full inning,
 * 1.1 = 1 inning + ⅓, 1.2 = 1 inning + ⅔, 2.0 = 2 innings, etc.
 */
function incIP(currentIP, outs = 1) {
  const intPart = Math.floor(currentIP);
  const decPart = Math.round((currentIP - intPart) * 10); // 0 / 1 / 2
  const totalThirds = intPart * 3 + decPart + outs;
  const wholeInnings = Math.floor(totalThirds / 3);
  const remainder = totalThirds % 3;
  return wholeInnings + remainder / 10;
}

function decIP(currentIP, outs = 1) {
  const intPart = Math.floor(currentIP);
  const decPart = Math.round((currentIP - intPart) * 10);
  const totalThirds = Math.max(0, intPart * 3 + decPart - outs);
  const wholeInnings = Math.floor(totalThirds / 3);
  const remainder = totalThirds % 3;
  return wholeInnings + remainder / 10;
}

// ────────── Stat increments / reversals ──────────

/**
 * Pure outcomes recognised in v1. The IN-PLAY picker (Phase 3) will
 * widen this to include subtype outs (GO/FO/LO), errors, FC, DP, etc.
 */
const HIT_OUTCOMES = new Set(["1B", "2B", "3B", "HR"]);
const WALK_OUTCOMES = new Set(["BB", "IBB", "HBP"]);
const STRIKEOUT_OUTCOMES = new Set(["K", "Kc"]);
const SACRIFICE_OUTCOMES = new Set(["SF", "SH"]);
// Anything that produces an out and counts as an at-bat
const OUT_OUTCOMES = new Set(["OUT", "GO", "FO", "LO", "PO"]);

/**
 * Whether this outcome counts as an at-bat (vs. a plate appearance only).
 * Walks, HBP, and sacrifices are PA but not AB.
 */
function isAtBat(outcome) {
  return !WALK_OUTCOMES.has(outcome) && !SACRIFICE_OUTCOMES.has(outcome);
}

/** Does this PA outcome book the batter for an out? */
function isOutOutcome(outcome) {
  return STRIKEOUT_OUTCOMES.has(outcome) || OUT_OUTCOMES.has(outcome);
}

function ensureBattingDoc(player) {
  if (!player.batting) {
    player.batting = {
      G: 0, PA: 0, AB: 0, R: 0, H: 0, HR: 0, RBI: 0,
      BB: 0, SO: 0, SB: 0, AVG: 0,
    };
  }
}

function ensurePitchingDoc(player) {
  if (!player.pitching) {
    player.pitching = {
      G: 0, IP: 0, R: 0, ER: 0, ERA: 0, K: 0, H: 0, BB: 0,
    };
  }
}

function recomputeAVG(batting) {
  batting.AVG = batting.AB > 0
    ? Number((batting.H / batting.AB).toFixed(3))
    : 0;
}

function recomputeERA(pitching) {
  // 7-inning league convention
  pitching.ERA = pitching.IP > 0
    ? Number(((pitching.ER * 7) / pitching.IP).toFixed(2))
    : 0;
}

function incrementBatterStats(player, outcome, rbi = 0, runsScored = 0) {
  ensureBattingDoc(player);
  const b = player.batting;
  b.PA += 1;
  if (isAtBat(outcome)) b.AB += 1;
  if (HIT_OUTCOMES.has(outcome)) b.H += 1;
  if (outcome === "HR") b.HR += 1;
  if (WALK_OUTCOMES.has(outcome)) b.BB += 1;
  if (STRIKEOUT_OUTCOMES.has(outcome)) b.SO += 1;
  b.RBI += rbi;
  b.R += runsScored;
  recomputeAVG(b);
}

function decrementBatterStats(player, outcome, rbi = 0, runsScored = 0) {
  if (!player.batting) return;
  const b = player.batting;
  b.PA = Math.max(0, b.PA - 1);
  if (isAtBat(outcome)) b.AB = Math.max(0, b.AB - 1);
  if (HIT_OUTCOMES.has(outcome)) b.H = Math.max(0, b.H - 1);
  if (outcome === "HR") b.HR = Math.max(0, b.HR - 1);
  if (WALK_OUTCOMES.has(outcome)) b.BB = Math.max(0, b.BB - 1);
  if (STRIKEOUT_OUTCOMES.has(outcome)) b.SO = Math.max(0, b.SO - 1);
  b.RBI = Math.max(0, b.RBI - rbi);
  b.R = Math.max(0, b.R - runsScored);
  recomputeAVG(b);
}

function incrementPitcherStats(player, outcome, runsScored = 0) {
  ensurePitchingDoc(player);
  const p = player.pitching;
  if (HIT_OUTCOMES.has(outcome)) p.H += 1;
  if (WALK_OUTCOMES.has(outcome)) p.BB += 1;
  if (STRIKEOUT_OUTCOMES.has(outcome)) p.K += 1;
  if (isOutOutcome(outcome)) p.IP = incIP(p.IP, 1);
  p.R += runsScored;
  p.ER += runsScored; // v1: assume all runs are earned (no error tracking yet)
  recomputeERA(p);
}

function decrementPitcherStats(player, outcome, runsScored = 0) {
  if (!player.pitching) return;
  const p = player.pitching;
  if (HIT_OUTCOMES.has(outcome)) p.H = Math.max(0, p.H - 1);
  if (WALK_OUTCOMES.has(outcome)) p.BB = Math.max(0, p.BB - 1);
  if (STRIKEOUT_OUTCOMES.has(outcome)) p.K = Math.max(0, p.K - 1);
  if (isOutOutcome(outcome)) p.IP = decIP(p.IP, 1);
  p.R = Math.max(0, p.R - runsScored);
  p.ER = Math.max(0, p.ER - runsScored);
  recomputeERA(p);
}

// ────────── Reducers (one per event type) ──────────

/** Returns the next seq number for a game's event log. */
async function nextSeq(GameEvent, gameId) {
  const last = await GameEvent.findOne({ game: gameId })
    .sort({ seq: -1 })
    .select("seq")
    .lean();
  return (last?.seq ?? 0) + 1;
}

/**
 * Initialise game state for the first pitch. Idempotent if called on
 * an already-live game (will just re-reset scoreboard counters).
 */
function applyGameStart(game) {
  game.status = "live";
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
  game.homeCurrentPitcherId = findStarterByPosition(game.homeLineup, "P");
  game.awayCurrentPitcherId = findStarterByPosition(game.awayLineup, "P");
}

function applyGameEnd(game) {
  game.status = "finished";
}

/**
 * Returns an array of follow-up events to apply (and append to the log)
 * if the pitch caused a walk or a strikeout cascade.
 */
function applyPitch(game, event) {
  const { pitchType } = event.payload || {};
  if (!["ball", "strike", "foul"].includes(pitchType)) {
    throw new Error(`Unknown pitchType: ${pitchType}`);
  }

  const follow = [];
  if (pitchType === "ball") {
    game.balls = (game.balls ?? 0) + 1;
    if (game.balls >= 4) {
      follow.push({
        type: "pa_result",
        payload: {
          outcome: "BB",
          batter: currentBatterId(game),
          pitcher: currentPitcherId(game),
        },
      });
    }
  } else if (pitchType === "strike") {
    game.strikes = (game.strikes ?? 0) + 1;
    if (game.strikes >= 3) {
      follow.push({
        type: "pa_result",
        payload: {
          outcome: "K",
          batter: currentBatterId(game),
          pitcher: currentPitcherId(game),
        },
      });
    }
  } else if (pitchType === "foul") {
    // Foul with fewer than 2 strikes adds a strike; foul with 2 strikes
    // does NOT (standard rule; foul tip caught for the K isn't tracked
    // here yet).
    if ((game.strikes ?? 0) < 2) {
      game.strikes = (game.strikes ?? 0) + 1;
    }
  }

  return follow;
}

/**
 * Apply a plate-appearance result.
 *
 * - Mutates game (reset count, advance batter, record outs, score runs)
 * - Increments batter + pitcher stat docs in `playerUpdates` map (caller
 *   saves them in batch)
 * - Returns follow-up events (inning_change when 3rd out lands)
 *
 * `playerUpdates`: a Map of playerId(string) → player document, so
 * multiple events in one cascade can accumulate changes on the same
 * player before the route saves them.
 */
function applyPaResult(game, event, playerUpdates) {
  const { outcome, batter, pitcher, rbi = 0, runsScored = 0 } =
    event.payload || {};

  if (!outcome) throw new Error("pa_result missing outcome");

  // For HR with no baserunning yet, default runsScored to 1 (the batter
  // himself) when caller didn't specify.
  let runsThisPa = runsScored;
  if (outcome === "HR" && !runsScored) runsThisPa = 1;

  // 1) Player stat updates (inline)
  if (batter && playerUpdates.has(String(batter))) {
    incrementBatterStats(
      playerUpdates.get(String(batter)),
      outcome,
      rbi,
      outcome === "HR" ? 1 : 0
    );
  }
  if (pitcher && playerUpdates.has(String(pitcher))) {
    incrementPitcherStats(
      playerUpdates.get(String(pitcher)),
      outcome,
      runsThisPa
    );
  }

  // 2) Score
  const side = battingSide(game);
  if (runsThisPa > 0) {
    if (side === "home") game.homeScore += runsThisPa;
    else game.awayScore += runsThisPa;
  }

  // 3) Out count
  const follow = [];
  if (isOutOutcome(outcome) || STRIKEOUT_OUTCOMES.has(outcome)) {
    game.outs = (game.outs ?? 0) + 1;
    if (game.outs >= 3) {
      follow.push({
        type: "inning_change",
        payload: { halfTo: game.inningHalf === "top" ? "bottom" : "top" },
      });
    }
  }

  // 4) Reset count + advance batter
  game.balls = 0;
  game.strikes = 0;
  advanceBatter(game);

  // 5) Bases — for v1 we don't track runner advancement. HR scores 1 and
  //    clears the bases. Walks/HBP don't push runners around (yet).
  if (outcome === "HR") {
    game.bases = { first: false, second: false, third: false };
  }

  return follow;
}

/**
 * Half-inning flipped. Push the runs scored this half into the innings
 * array, reset outs/count/bases.
 */
function applyInningChange(game, event) {
  const side = battingSide(game);
  // Runs THIS half = total scored minus already-recorded inning runs.
  const arr = side === "home" ? game.homeInnings : game.awayInnings;
  const score = side === "home" ? game.homeScore : game.awayScore;
  const recorded = (arr || []).reduce((sum, v) => sum + (v || 0), 0);
  const runsThisHalf = score - recorded;
  recordInningRuns(game, side, runsThisHalf);

  // Flip half
  if (game.inningHalf === "top") {
    game.inningHalf = "bottom";
  } else {
    game.inningHalf = "top";
    game.inning = (game.inning ?? 1) + 1;
  }
  game.outs = 0;
  game.balls = 0;
  game.strikes = 0;
  game.bases = { first: false, second: false, third: false };

  // Stash runsThisHalf into the event payload so undo can reverse it.
  event.payload = { ...(event.payload || {}), runsThisHalf };

  return [];
}

// ────────── Dispatcher ──────────

/**
 * Apply a single event to the in-memory game state.
 * Returns an array of follow-up event payloads (no `seq` set yet — the
 * caller assigns + persists).
 *
 * `playerUpdates`: Map<playerIdString, mongooseDoc> — the route layer
 * pre-loads the batter + pitcher referenced by the event so reducers
 * can mutate stat subdocs without re-fetching.
 */
function applyEvent(game, event, playerUpdates) {
  switch (event.type) {
    case "game_start":     applyGameStart(game);            return [];
    case "game_end":       applyGameEnd(game);              return [];
    case "pitch":          return applyPitch(game, event);
    case "pa_result":      return applyPaResult(game, event, playerUpdates);
    case "inning_change":  return applyInningChange(game, event);
    default:
      // Unknown / future event types (substitution, baserunning) are
      // recorded but don't mutate state yet.
      return [];
  }
}

/**
 * Reverse the side effects of a single pa_result event on Player stats.
 * Game state is recomputed by a full replay in the route layer, so we
 * only need to undo stat increments here.
 */
function reversePaResultStats(event, playerUpdates) {
  const { outcome, batter, pitcher, rbi = 0, runsScored = 0 } =
    event.payload || {};
  const runs = outcome === "HR" && !runsScored ? 1 : runsScored;

  if (batter && playerUpdates.has(String(batter))) {
    decrementBatterStats(
      playerUpdates.get(String(batter)),
      outcome,
      rbi,
      outcome === "HR" ? 1 : 0
    );
  }
  if (pitcher && playerUpdates.has(String(pitcher))) {
    decrementPitcherStats(
      playerUpdates.get(String(pitcher)),
      outcome,
      runs
    );
  }
}

module.exports = {
  nextSeq,
  applyEvent,
  reversePaResultStats,
  startersOf,
  currentBatterId,
  currentPitcherId,
};
