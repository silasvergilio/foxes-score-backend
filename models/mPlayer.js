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

  // Per-tournament pitching stats. Recomputed from totals by
  // scripts/consolidate-stats.js each time the per-game iScore xlsx
  // files change (in ~/Documents/TBA Stats), so ERA stays correct as
  // more games are added. Players who haven't pitched stay at zero.
  pitching: {
    G: { type: Number, default: 0 },     // games pitched
    IP: { type: Number, default: 0 },    // innings pitched (decimal)
    R: { type: Number, default: 0 },     // runs allowed
    ER: { type: Number, default: 0 },    // earned runs (basis for ERA)
    ERA: { type: Number, default: 0 },   // (ER × 7) / IP, 7-inning league
    K: { type: Number, default: 0 },     // strikeouts
    H: { type: Number, default: 0 },     // hits allowed
    BB: { type: Number, default: 0 },    // walks
  },

  // Per-tournament batting stats. AVG is recomputed from totals on
  // every consolidation pass. Non-batters stay at zero.
  batting: {
    G: { type: Number, default: 0 },     // games
    PA: { type: Number, default: 0 },    // plate appearances
    AB: { type: Number, default: 0 },    // at-bats
    R: { type: Number, default: 0 },     // runs scored
    H: { type: Number, default: 0 },     // hits
    HR: { type: Number, default: 0 },    // home runs
    RBI: { type: Number, default: 0 },   // runs batted in
    BB: { type: Number, default: 0 },    // walks
    SO: { type: Number, default: 0 },    // strikeouts
    SB: { type: Number, default: 0 },    // stolen bases
    AVG: { type: Number, default: 0 },   // H / AB
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
