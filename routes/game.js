const express = require("express");
const router = express.Router();
const Game = require("../models/mGame");
const mongoose = require("mongoose");
mongoose.connect(
  "mongodb+srv://thidupin:EhHKF01cna6uvx6n@dupin.98uvxt6.mongodb.net/foxes-score?retryWrites=true&w=majority"
);

//Middleware para garantir que podemos ler JSON no corpo da requisição
router.use(express.json());

//criando a rota POST /game
router.post("/", async function (req, res) {
  const gameData = req.body;
  

  //criando um novo jogo
  const game = new Game(gameData);

  try {
    //logando no console
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

module.exports = router;
