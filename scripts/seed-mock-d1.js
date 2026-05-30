// Seeds a single mock D1 team so the frontend's edition selector
// has something to switch to. Safe to delete later — this is purely
// for testing the multi-edition flow on localhost.
//
// Usage: node scripts/seed-mock-d1.js [--remove]

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

const YEAR = 2026;
const DIVISION = "1";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  if (process.argv.includes("--remove")) {
    // Wipe every D1 doc the script could have created.
    const teamRes = await Team.deleteMany({ year: YEAR, division: DIVISION });
    // Player.team refs whatever team we just removed — clear orphans
    // via the same year/division marker on Team that's already gone.
    console.log("removed D1 teams:", teamRes.deletedCount);
    await mongoose.disconnect();
    return;
  }

  // Idempotent: upsert by code+year+division.
  const team = await Team.findOneAndUpdate(
    { code: "MCK", year: YEAR, division: DIVISION },
    {
      $set: {
        name: "Mock D1 Team",
        code: "MCK",
        imageFile: "mock",
        location: "São Paulo - SP",
        tournament: "Taça Brasil Amador 2026",
        year: YEAR,
        division: DIVISION,
        group: "1",
        slot: "A1",
      },
    },
    { upsert: true, new: true }
  );
  console.log(`✓ team ${team.code} (year=${team.year}, division=${team.division}) _id=${team._id}`);

  // A handful of players so the roster / stats page has something to show.
  const players = [
    { name: "Mock Player Um",     jerseyNumber: 1, rosterNumber: 1 },
    { name: "Mock Player Dois",   jerseyNumber: 2, rosterNumber: 2 },
    { name: "Mock Player Três",   jerseyNumber: 3, rosterNumber: 3 },
  ];

  await Player.deleteMany({ team: team._id });
  for (const p of players) {
    await Player.create({ ...p, team: team._id });
  }
  console.log(`✓ inserted ${players.length} mock players`);

  await mongoose.disconnect();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
