// Seeds the initial schedule:
//
//   Field 1                       Field 2
//   ─────────────────────────     ─────────────────────────
//   R1: White Tigers x MPS        R1: Foxes x Niterói
//   R2: Pirituba x Piranema       R2: Titans x Highlanders
//   R3: MPS x Titans              R3: Niterói x Pirituba
//   R4: Piranema x Foxes          R4: Highlanders x White Tigers
//
// Convention: "X x Y" means X is home, Y is away.
// Round = position in each field's list (so games in the same round happen
// concurrently on both fields). This makes it easy for the frontend to group
// "round 1", "round 2", ... regardless of date.
//
// Usage: node scripts/seed-schedule.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Game = require("../models/mGame");

const TOURNAMENT = "Taça Brasil Amador 2026";

const schedule = [
  // Field 1
  { field: "Campo 1", round: 1, home: "WT",  away: "MPS" },
  { field: "Campo 1", round: 2, home: "PTB", away: "PRN" },
  { field: "Campo 1", round: 3, home: "MPS", away: "TIT" },
  { field: "Campo 1", round: 4, home: "PRN", away: "FXS" },
  // Field 2
  { field: "Campo 2", round: 1, home: "FXS", away: "ANN" },
  { field: "Campo 2", round: 2, home: "TIT", away: "HIG" },
  { field: "Campo 2", round: 3, home: "ANN", away: "PTB" },
  { field: "Campo 2", round: 4, home: "HIG", away: "WT"  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  const teams = await Team.find({ tournament: TOURNAMENT }, { code: 1 });
  const byCode = Object.fromEntries(teams.map((t) => [t.code, t._id]));

  // Wipe only games belonging to this tournament so prior placeholders go away.
  const wipe = await Game.deleteMany({ tournament: TOURNAMENT });
  console.log("wiped games for tournament:", wipe.deletedCount);

  const docs = schedule.map((g) => ({
    tournament: TOURNAMENT,
    field: g.field,
    round: g.round,
    homeTeam: byCode[g.home],
    awayTeam: byCode[g.away],
    status: "scheduled",
  }));

  const inserted = await Game.insertMany(docs);
  console.log(`inserted ${inserted.length} games`);

  const view = await Game.find({ tournament: TOURNAMENT })
    .sort({ round: 1, field: 1 })
    .populate("homeTeam", "code name slot")
    .populate("awayTeam", "code name slot");

  console.log("\nschedule:");
  for (const g of view) {
    console.log(
      `  R${g.round} ${g.field}  ${g.homeTeam.code.padEnd(4)} (${g.homeTeam.slot})  vs  ${g.awayTeam.code.padEnd(4)} (${g.awayTeam.slot})  [${g.status}]`
    );
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
