// Delete placeholder teams (everything except Pirituba/PTB) and any games
// that reference them. The remaining 7 teams will be seeded from their
// registration files in the same standard as Pirituba.
//
// Usage: node scripts/cleanup-placeholder-teams.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");
const Game = require("../models/mGame");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  const survivors = await Team.find({ code: "PTB" }, { _id: 1, code: 1 });
  const survivorIds = survivors.map((t) => t._id);
  console.log(
    "keeping:",
    survivors.map((t) => t.code).join(", ") || "(none)"
  );

  const doomed = await Team.find(
    { _id: { $nin: survivorIds } },
    { _id: 1, code: 1, name: 1 }
  );
  console.log("deleting teams:", doomed.map((t) => `${t.code} (${t.name})`));

  const doomedIds = doomed.map((t) => t._id);

  const games = await Game.deleteMany({
    $or: [
      { homeTeam: { $in: doomedIds } },
      { awayTeam: { $in: doomedIds } },
    ],
  });
  console.log("deleted games referencing them:", games.deletedCount);

  const players = await Player.deleteMany({ team: { $in: doomedIds } });
  console.log("deleted orphan players (should be 0):", players.deletedCount);

  const teams = await Team.deleteMany({ _id: { $in: doomedIds } });
  console.log("deleted teams:", teams.deletedCount);

  const remaining = await Team.find({}, { code: 1, name: 1, slot: 1 });
  console.log("remaining teams:", remaining.map((t) => `${t.code}/${t.slot || "-"} ${t.name}`));

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
