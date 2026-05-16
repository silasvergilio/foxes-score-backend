// Seed the knockout brackets after the Taça Brasil 2026 group stage:
//
//   Chave Ouro (Campo 1):
//     - Semi 1: A1 vs B2   (HIG vs PRN)
//     - Semi 2: B1 vs A2   (ANN vs WT)
//     - Final : TBD vs TBD (filled in once semis resolve)
//
//   Chave Prata (Campo 2, displayed as Campo 3):
//     - A3 vs B3   (MPS vs PTB)
//
//   Chave Bronze (Campo 2):
//     - A4 vs B4   (TIT vs FXS)
//
//   3rd-place / consolation match (Campo 2):
//     - Loser SF1 vs Loser SF2  (TBD vs TBD)
//
// Convention: the team from the *first* group's seed is treated as home for
// each cross-group pairing (A1 home, B1 home — the user said they'll review
// the home/away assignments later).
//
// Times: user said no times for now; date is left null. Round numbers are
// chosen so the schedule endpoint sorts them after the group stage:
//   round 5 = first knockout matches (semis, silver, bronze)
//   round 6 = final + third-place
//
// Idempotent at the (tournament, bracket, bracketStage, round, field) level.
//
// Usage: node scripts/seed-bracket.js

require("dotenv").config();
const mongoose = require("mongoose");
const Game = require("../models/mGame");
const Team = require("../models/mTeam");

const TOURNAMENT = "Taça Brasil Amador 2026";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  const teams = await Team.find({ tournament: TOURNAMENT }, "code");
  const idByCode = Object.fromEntries(teams.map((t) => [t.code, t._id]));

  const games = [
    // ─── Chave Ouro ─────────────────────────────────────────────
    {
      bracket: "gold",
      bracketStage: "semi",
      field: "Campo 1",
      round: 5,
      label: "Gold Semi 1: HIG (A1) vs PRN (B2)",
      home: "HIG",
      away: "PRN",
    },
    {
      bracket: "gold",
      bracketStage: "semi",
      field: "Campo 1",
      round: 5,
      label: "Gold Semi 2: ANN (B1) vs WT (A2)",
      home: "ANN",
      away: "WT",
    },
    {
      bracket: "gold",
      bracketStage: "final",
      field: "Campo 1",
      round: 6,
      label: "Gold Final: TBD vs TBD",
      home: null,
      away: null,
    },

    // ─── Chave Prata ────────────────────────────────────────────
    {
      bracket: "silver",
      bracketStage: "final",
      field: "Campo 2",
      round: 5,
      label: "Silver: MPS (A3) vs PTB (B3)",
      home: "MPS",
      away: "PTB",
    },

    // ─── Chave Bronze ───────────────────────────────────────────
    {
      bracket: "bronze",
      bracketStage: "final",
      field: "Campo 2",
      round: 5,
      label: "Bronze: TIT (A4) vs FXS (B4)",
      home: "TIT",
      away: "FXS",
    },

    // ─── Third-place match (gold-bracket consolation) ───────────
    {
      bracket: "gold",
      bracketStage: "third",
      field: "Campo 2",
      round: 6,
      label: "3rd-place: Loser SF1 vs Loser SF2",
      home: null,
      away: null,
    },
  ];

  for (const g of games) {
    const filter = {
      tournament: TOURNAMENT,
      bracket: g.bracket,
      bracketStage: g.bracketStage,
      field: g.field,
      round: g.round,
    };
    // For the two semis they share the same (bracket, bracketStage, round,
    // field), so disambiguate by team codes when both are concrete.
    if (g.home && g.away) {
      filter.homeTeam = idByCode[g.home];
      filter.awayTeam = idByCode[g.away];
    }

    const update = {
      tournament: TOURNAMENT,
      bracket: g.bracket,
      bracketStage: g.bracketStage,
      field: g.field,
      round: g.round,
      status: "scheduled",
      homeTeam: g.home ? idByCode[g.home] : null,
      awayTeam: g.away ? idByCode[g.away] : null,
    };

    const existing = await Game.findOne(filter);
    if (existing) {
      await Game.updateOne({ _id: existing._id }, { $set: update });
      console.log("updated:", g.label);
    } else {
      await Game.create(update);
      console.log("created:", g.label);
    }
  }

  // Quick visual summary.
  const bracketGames = await Game.find({
    tournament: TOURNAMENT,
    bracket: { $in: ["gold", "silver", "bronze"] },
  })
    .sort({ round: 1, field: 1 })
    .populate("homeTeam", "code")
    .populate("awayTeam", "code");

  console.log("\nbracket games:");
  for (const g of bracketGames) {
    const h = g.homeTeam ? g.homeTeam.code : "TBD";
    const a = g.awayTeam ? g.awayTeam.code : "TBD";
    console.log(
      `  R${g.round} ${g.field.padEnd(8)} ${g.bracket.padEnd(6)} ${g.bracketStage.padEnd(6)} ${h.padEnd(4)} vs ${a.padEnd(4)}`
    );
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
