const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  playerNumber: { type: String, required: true, unique: true },
   
});

module.exports = mongoose.model("Player", playerSchema);