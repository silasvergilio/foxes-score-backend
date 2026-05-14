const express = require("express");
const router = express.Router();
const Game = require("../models/mGame");

router.post("/", async function (req, res) {
  try {
    const game = new Game(req.body);
    await game.save();
    return res.status(201).json({ message: "Jogo salvo com sucesso!", game });
  } catch (error) {
    console.error("erro ao salvar jogo: ", error);
    return res.status(500).json({ error: "Erro ao salvar jogo" });
  }
});

router.get("/:id", async function (req, res) {
  try {
    const game = await Game.findById(req.params.id);
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
    const games = await Game.find(req.query);
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
    const game = await Game.findByIdAndUpdate(_id, updates, { new: true });
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
