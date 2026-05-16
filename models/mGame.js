const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
  {
    tournament: { type: String, required: true },
    date: { type: Date },
    location: { type: String },
    field: { type: String },
    round: { type: Number },

    homeTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teams",
      required: true,
    },
    awayTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teams",
      required: true,
    },

    homeScore: { type: Number, default: 0 },
    awayScore: { type: Number, default: 0 },

    // Runs per inning, parallel arrays. Index 0 = inning 1, etc.
    // Length grows with the inning count; homeScore/awayScore stay as the
    // running totals for easy display.
    homeInnings: { type: [Number], default: [] },
    awayInnings: { type: [Number], default: [] },

    status: {
      type: String,
      enum: ["scheduled", "live", "finished"],
      default: "scheduled",
      index: true,
    },

    inning: { type: Number, default: 1 },
    inningHalf: { type: String, enum: ["top", "bottom"], default: "top" },
    outs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    strikes: { type: Number, default: 0 },

    bases: {
      first: { type: Boolean, default: false },
      second: { type: Boolean, default: false },
      third: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

gameSchema.index({ tournament: 1, date: 1 });

module.exports = mongoose.model("Game", gameSchema);
