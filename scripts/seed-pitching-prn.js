// Seed pitching stats for Piranema (PRN) from iScore PDF dated late R4.
// Only Samuel Silva da Rocha Reis has non-zero stats; the rest stay at
// the schema defaults (all zeros).
//
// Usage: node scripts/seed-pitching-prn.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

const TOURNAMENT = "Taça Brasil Amador 2026";

// One row per pitcher to update. Match by case-insensitive trimmed name
// against the Piranema roster, since spelling has minor variants
// (Helio/Hélio, Ian/Yan, Ueso/Uesu, etc.) between sources.
const stats = [
  { name: "Samuel Silva da Rocha Reis", G: 2, IP: 7.0, R: 11, ERA: 5.0, K: 9, H: 14, BB: 3 },
];

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  const team = await Team.findOne({ tournament: TOURNAMENT, code: "PRN" });
  if (!team) throw new Error("Piranema team not found");

  const players = await Player.find({ team: team._id });
  console.log(`roster: ${players.length} players`);

  for (const row of stats) {
    const target = players.find((p) => norm(p.name) === norm(row.name));
    if (!target) {
      console.log(`NOT FOUND: ${row.name}`);
      continue;
    }
    target.pitching = {
      G: row.G,
      IP: row.IP,
      R: row.R,
      ERA: row.ERA,
      K: row.K,
      H: row.H,
      BB: row.BB,
    };
    await target.save();
    console.log(
      `✓ ${target.name.padEnd(36)} G=${row.G} IP=${row.IP} R=${row.R} ERA=${row.ERA} K=${row.K} H=${row.H} BB=${row.BB}`
    );
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
