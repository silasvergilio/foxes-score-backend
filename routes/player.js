const express = require("express");
const router = express.Router();
const Player = require("../models/mPlayer");
const Team = require("../models/mTeam");

router.post("/", async function (req, res) {
  try {
    const player = new Player(req.body);
    await player.save();
    return res
      .status(201)
      .json({ message: "Jogador salvo com sucesso!", player });
  } catch (error) {
    console.error("erro ao salvar jogador: ", error);
    return res
      .status(500)
      .json({ error: "Não foi possivel salvar o Jogador!" });
  }
});

router.get("/:id", async function (req, res) {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: "Jogador não encontrado" });
    }
    res.status(200).json(player);
  } catch (error) {
    console.error("Erro ao buscar jogador por ID: ", error);
    res.status(500).json({ error: "Erro ao buscar jogador" });
  }
});

// GET /player[?year=...&division=...&tournament=...]
// year/division/tournament filter via the team join; everything else
// (team id, name, jerseyNumber...) is applied directly on Player.
router.get("/", async function (req, res) {
  try {
    const { year, division, tournament, ...rest } = req.query;

    if (year || division || tournament) {
      const teamFilter = {};
      if (year) teamFilter.year = Number(year);
      if (division) teamFilter.division = String(division);
      if (tournament) teamFilter.tournament = tournament;
      const teamIds = await Team.find(teamFilter, "_id").lean();
      rest.team = { $in: teamIds.map((t) => t._id) };
    }

    const players = await Player.find(rest);
    res.status(200).json(players);
  } catch (error) {
    console.error("Erro ao buscar jogadores: ", error);
    res.status(500).json({ error: "Erro ao buscar jogadores" });
  }
});

module.exports = router;
