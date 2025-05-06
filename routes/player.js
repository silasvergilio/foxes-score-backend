const express = require("express");
const router = express.Router();
const Player = require("../models/mPlayer");
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
  const playerData = req.body;

  //criando um novo jogo

  try {
    const player = new Player(playerData);

    //Salvando o Game
    player.save().then(() => {
      console.log(player);
      return res.status(201).json({ message: "Jogador salvo com sucesso!", player });
    });
    console.log("jogador salvo no MongoDB: ", player);

    //avisando que deu certo
  } catch (error) {
    // se der ruim
    console.error("erro ao salvar jogador: ", error);
    return res.status(500).json({ message: " Não foi possivel salvar o Jogador!", player });

  }
});

router.get("/:id", async function (req, res) {
  const id = req.params.id;

  try {
    const player = await Player.findById(id);

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
  var players = await Player.find(req.query);
  res.status(200).json(players);
});

module.exports = router;
