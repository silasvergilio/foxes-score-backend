const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teams",
    required: true,
    index: true,
  },
  rosterNumber: { type: Number },
  jerseyNumber: { type: Number },
  name: { type: String, required: true },
  nickname: { type: String },
  email: { type: String },
  birthDate: { type: Date },
  documentId: { type: String },
  throws: { type: String, enum: ["right", "left", "switch"] },
  bats: { type: String, enum: ["right", "left", "switch"] },

  // Pitching stats, tournament-scoped (we'll scale to a separate
  // collection if multi-season history is ever needed). Stored as-is
  // from the official scoring source. Players who haven't pitched
  // stay at zero across the board.
  pitching: {
    G: { type: Number, default: 0 },   // games pitched
    IP: { type: Number, default: 0 },  // innings pitched
    R: { type: Number, default: 0 },   // runs allowed
    ERA: { type: Number, default: 0 }, // earned run average (as scored)
    K: { type: Number, default: 0 },   // strikeouts
    H: { type: Number, default: 0 },   // hits allowed
    BB: { type: Number, default: 0 },  // walks
  },
});

playerSchema.index(
  { team: 1, jerseyNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { jerseyNumber: { $type: "number" } },
  }
);

module.exports = mongoose.model("Player", playerSchema);
