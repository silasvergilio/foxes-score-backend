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

module.exports = router;
