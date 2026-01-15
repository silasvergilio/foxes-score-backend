const express = require("express");
const router = express.Router();
const Team = require("../models/mTeam");
const mongoose = require("mongoose");
const app = require("../app");
const { createServer } = require("node:http");
const server = createServer();
mongoose.connect(
  "mongodb+srv://thidupin:EhHKF01cna6uvx6n@dupin.98uvxt6.mongodb.net/foxes-score?retryWrites=true&w=majority"
);

//Middleware para garantir que podemos ler JSON no corpo da requisição
router.use(express.json());

router.get("/", async function (req, res) {
  var teams = await Team.find(req.query);
  res.status(200).json(teams);
});

router.put("/", async function (req, res) {
  const io = req.app.get("io"); // pega o socket.io do app

  const { _id, ...updates } = req.body;

  if (!_id) {
    return res.status(400).json({ error: "_id do jogo é obrigatório" });
  }

  try {
    // busca o jogo pelo ID
    const game = await Game.findById(_id);

    if (!game) {
      return res.status(404).json({ error: "Jogo não encontrado" });
    }

    // aplica as atualizações recebidas

    Object.assign(game, updates);

    // salva no banco
    await Game.findByIdAndUpdate(_id,updates);

    io.emit("gameUpdate", game);

    res.status(200).json({ message: "Jogo atualizado com sucesso!", game });
  } catch (error) {
    console.error("Erro ao atualizar jogo: ", error);
    res.status(500).json({ error: "Erro ao atualizar jogo" });
  }
});

module.exports = router;
