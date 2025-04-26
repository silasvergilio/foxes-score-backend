const express = require("express");
const router = express.Router();
const Game = require("../models/mGame");
const mongoose = require("mongoose");
const app = require("../app");
const { createServer } = require("node:http");
const server = createServer();
mongoose.connect(
  "mongodb+srv://thidupin:EhHKF01cna6uvx6n@dupin.98uvxt6.mongodb.net/foxes-score?retryWrites=true&w=majority"
);

//Middleware para garantir que podemos ler JSON no corpo da requisição
router.use(express.json());

//criando a rota POST /game
router.post("/", async function (req, res) {
  const gameData = req.body;

  //criando um novo jogo

  try {
    const game = new Game(gameData);

    //Salvando o Game
    game.save().then(() => {
      console.log(game);
      return res.status(201).json({ message: "Jogo salvo com sucesso!", game });
    });
    console.log("jogo salvo no MongoDB: ", game);

    //avisando que deu certo
  } catch (error) {
    // se der ruim
    console.error("erro ao salvar jogo: ", error);

    // se der ruim avisa o anotador
    return this.report.status(500).json({ error: "Erro ao salvar jogo " });
  }
});

router.get("/:id", async function (req, res) {
  const id = req.params.id;

  try {
    const game = await Game.findById(id);

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
  var games = await Game.find(req.query);
  res.status(200).json(games);
});

router.put("/", async function (req, res) {
  const io = req.app.get('io'); // pega o socket.io do app

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
    await Game.updateOne(req.body);
    io.emit("gameUpdate", game);

    res.status(200).json({ message: "Jogo atualizado com sucesso!", game });
  } catch (error) {
    console.error("Erro ao atualizar jogo: ", error);
    res.status(500).json({ error: "Erro ao atualizar jogo" });
  }
});

module.exports = router;
