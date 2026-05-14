const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teams",
    required: true,
    index: true,
  },
  rosterNumber: { type: Number },
  jerseyNumber: { type: Number, required: true },
  name: { type: String, required: true },
  nickname: { type: String },
  email: { type: String },
  birthDate: { type: Date },
  documentId: { type: String },
  throws: { type: String, enum: ["right", "left"] },
  bats: { type: String, enum: ["right", "left"] },
});

playerSchema.index({ team: 1, jerseyNumber: 1 }, { unique: true });

module.exports = mongoose.model("Player", playerSchema);
