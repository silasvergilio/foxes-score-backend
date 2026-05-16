// Sets the May 16, 2026 start times for the 4 Field 2 games — same
// times as Field 1 in matching round order.
//
// Usage: node scripts/set-times-field2.js

require("dotenv").config();
const mongoose = require("mongoose");
const Game = require("../models/mGame");
const Team = require("../models/mTeam");

const TOURNAMENT = "Taça Brasil Amador 2026";

const schedule = [
  { round: 1, home: "FXS", away: "ANN", isoLocal: "2026-05-16T09:00:00-03:00" },
  { round: 2, home: "TIT", away: "HIG", isoLocal: "2026-05-16T10:45:00-03:00" },
  { round: 3, home: "ANN", away: "PTB", isoLocal: "2026-05-16T13:30:00-03:00" },
  { round: 4, home: "HIG", away: "WT",  isoLocal: "2026-05-16T15:15:00-03:00" },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  const teams = await Team.find({ tournament: TOURNAMENT }, "code");
  const idByCode = Object.fromEntries(teams.map((t) => [t.code, t._id.toString()]));

  for (const g of schedule) {
    const homeId = idByCode[g.home];
    const awayId = idByCode[g.away];
    if (!homeId || !awayId) {
      console.log(`SKIP ${g.home} x ${g.away} (team not found)`);
      continue;
    }
    const date = new Date(g.isoLocal);
    const updated = await Game.findOneAndUpdate(
      {
        tournament: TOURNAMENT,
        field: "Campo 2",
        round: g.round,
        homeTeam: homeId,
        awayTeam: awayId,
      },
      { $set: { date } },
      { new: true }
    );
    if (!updated) {
      console.log(`NOT FOUND  R${g.round} Campo 2  ${g.home} x ${g.away}`);
      continue;
    }
    const wall = date.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    console.log(`✓ R${g.round} Campo 2  ${g.home} x ${g.away}  →  ${wall}`);
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
