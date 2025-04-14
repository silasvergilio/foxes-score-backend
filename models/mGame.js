const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  id: { type: String, required: true },
  tournament: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: String, required: true },
  startedTime: { type: String, required: true },
  status: { type: String, required: true },
  startOffense: { type: String, required: true },
  startDefense: { type: String, required: true },
  startOffenseScore: { type: Number, required: true, default:0 },
  startDefenseScore: { type: Number, required: true, default:0 },
  firstBaseRunner: { type: Boolean, required: true, default:false },
  secondBaseRunner: { type: Boolean, required: true, default:false },
  thirdBaseRunner: { type: Boolean, required: true,default:false },
  balls: { type: Number, required: true,default:0 },
  strikes: { type: Number, required: true,default:0 },
  outs: { type: Number, required: true,default:0 },
  inning: { type: Number, required: true,default:1 },
  inningHalf: { type: Boolean, required: true,default:false },
});

module.exports = mongoose.model("Game", gameSchema);
