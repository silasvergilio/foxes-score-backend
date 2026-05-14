const express = require("express");
const router = express.Router();
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

router.get("/", async function (req, res) {
  try {
    const teams = await Team.find(req.query);
    res.status(200).json(teams);
  } catch (error) {
    console.error("Erro ao buscar times: ", error);
    res.status(500).json({ error: "Erro ao buscar times" });
  }
});

router.get("/:id", async function (req, res) {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Time não encontrado" });
    }
    res.status(200).json(team);
  } catch (error) {
    console.error("Erro ao buscar time por ID: ", error);
    res.status(500).json({ error: "Erro ao buscar time" });
  }
});

router.get("/:id/players", async function (req, res) {
  try {
    const players = await Player.find({ team: req.params.id }).sort({
      rosterNumber: 1,
    });
    res.status(200).json(players);
  } catch (error) {
    console.error("Erro ao buscar roster: ", error);
    res.status(500).json({ error: "Erro ao buscar roster" });
  }
});

router.post("/", async function (req, res) {
  try {
    const team = new Team(req.body);
    await team.save();
    return res.status(201).json({ message: "Time salvo com sucesso!", team });
  } catch (error) {
    console.error("erro ao salvar time: ", error);
    return res.status(500).json({ error: "Erro ao salvar time" });
  }
});

router.put("/", async function (req, res) {
  const { _id, ...updates } = req.body;

  if (!_id) {
    return res.status(400).json({ error: "_id do time é obrigatório" });
  }

  try {
    const team = await Team.findByIdAndUpdate(_id, updates, { new: true });
    if (!team) {
      return res.status(404).json({ error: "Time não encontrado" });
    }
    res.status(200).json({ message: "Time atualizado com sucesso!", team });
  } catch (error) {
    console.error("Erro ao atualizar time: ", error);
    res.status(500).json({ error: "Erro ao atualizar time" });
  }
});

module.exports = router;
