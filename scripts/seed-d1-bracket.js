// D1 bracket / schedule setup. Single group "1" (Chave A), 4 teams,
// all games on Campo 1. Round-robin → 3rd-place playoff + final.
//
// Usage: node scripts/seed-d1-bracket.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer"); // unused here, kept for parity
const Game = require("../models/mGame");

const YEAR = 2026;
const DIVISION = "1";
const TOURNAMENT = "Taça Brasil Amador 2026";
const FIELD = "Campo 1";

// Slot assignments per the PDF's TIMES box (in order).
const SLOTS = [
  { code: "BRA", group: "1", slot: "A1" },
  { code: "CRB", group: "1", slot: "A2" },
  { code: "SUD", group: "1", slot: "A3" },
  { code: "TMX", group: "1", slot: "A4" },
];

// Group-stage matchups. round = ordering field (J1, J3, J5, J7 day 1,
// then J9, J11 day 2). All Campo 1, no date set — fill via PUT later.
const GROUP_GAMES = [
  { round: 1, home: "BRA", away: "SUD" },
  { round: 2, home: "CRB", away: "TMX" },
  { round: 3, home: "SUD", away: "CRB" },
  { round: 4, home: "TMX", away: "BRA" },
  { round: 5, home: "BRA", away: "CRB" },
  { round: 6, home: "SUD", away: "TMX" },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  // ── 1. Assign group + slot to the 4 D1 teams ──────────────────────
  for (const s of SLOTS) {
    const t = await Team.findOneAndUpdate(
      { code: s.code, year: YEAR, division: DIVISION },
      { $set: { group: s.group, slot: s.slot } },
      { new: true }
    );
    if (!t) {
      console.log(`! team ${s.code} not found — skipping`);
      continue;
    }
    console.log(`  ${t.code} → group ${t.group}, slot ${t.slot}`);
  }

  // ── 2. Wipe any pre-existing D1 games before re-seeding ───────────
  const wipe = await Game.deleteMany({
    tournament: TOURNAMENT,
    year: YEAR,
    division: DIVISION,
  });
  console.log(`wiped ${wipe.deletedCount} existing D1 games`);

  // ── 3. Build a code → _id map for the inserts ─────────────────────
  const teams = await Team.find({ year: YEAR, division: DIVISION }, "code");
  const idByCode = Object.fromEntries(teams.map((t) => [t.code, t._id]));

  // ── 4. Insert the 6 round-robin games ─────────────────────────────
  const docs = [];
  for (const g of GROUP_GAMES) {
    docs.push({
      tournament: TOURNAMENT,
      year: YEAR,
      division: DIVISION,
      field: FIELD,
      round: g.round,
      homeTeam: idByCode[g.home],
      awayTeam: idByCode[g.away],
      bracket: "group",
      status: "scheduled",
    });
  }

  // ── 5. Insert the 3rd-place + final placeholders ──────────────────
  docs.push({
    tournament: TOURNAMENT,
    year: YEAR,
    division: DIVISION,
    field: FIELD,
    round: 7,
    bracket: "gold",
    bracketStage: "third",
    status: "scheduled",
  });
  docs.push({
    tournament: TOURNAMENT,
    year: YEAR,
    division: DIVISION,
    field: FIELD,
    round: 8,
    bracket: "gold",
    bracketStage: "final",
    status: "scheduled",
  });

  const inserted = await Game.insertMany(docs);
  console.log(`inserted ${inserted.length} games`);

  // ── 6. Summary ────────────────────────────────────────────────────
  const populated = await Game.find({
    tournament: TOURNAMENT,
    year: YEAR,
    division: DIVISION,
  })
    .sort({ round: 1 })
    .populate("homeTeam", "code")
    .populate("awayTeam", "code");

  console.log("\nD1 schedule:");
  for (const g of populated) {
    const h = g.homeTeam ? g.homeTeam.code : "TBD";
    const a = g.awayTeam ? g.awayTeam.code : "TBD";
    const tag = g.bracket === "group" ? "group" : `${g.bracket}/${g.bracketStage}`;
    console.log(`  R${g.round} ${g.field}  ${h.padEnd(4)} vs ${a.padEnd(4)}  [${tag}]`);
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
