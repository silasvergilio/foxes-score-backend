const express = require("express");
const router = express.Router();
const Player = require("../models/mPlayer");

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

router.get("/", async function (req, res) {
  try {
    const players = await Player.find(req.query);
    res.status(200).json(players);
  } catch (error) {
    console.error("Erro ao buscar jogadores: ", error);
    res.status(500).json({ error: "Erro ao buscar jogadores" });
  }
});

module.exports = router;
