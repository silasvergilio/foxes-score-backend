// One-off fixups per user request:
//   1) Unify all team tournaments to "Taça Brasil Amador 2026".
//   2) Swap throws <-> bats on every player (R column = bats, A column = throws).
//   3) Fill Piranema location.
//
// Usage: node scripts/fixups-2026.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  const tournamentRes = await Team.updateMany(
    {},
    { $set: { tournament: "Taça Brasil Amador 2026" } }
  );
  console.log("tournament unified on teams:", tournamentRes.modifiedCount);

  // Atomic field swap via aggregation pipeline (Mongo 4.2+).
  const swapRes = await Player.collection.updateMany({}, [
    { $set: { _throwsTmp: "$throws", _batsTmp: "$bats" } },
    { $set: { throws: "$_batsTmp", bats: "$_throwsTmp" } },
    { $unset: ["_throwsTmp", "_batsTmp"] },
  ]);
  console.log("players with throws/bats swapped:", swapRes.modifiedCount);

  const prn = await Team.findOneAndUpdate(
    { code: "PRN" },
    { $set: { location: "Rio de Janeiro - RJ" } },
    { new: true }
  );
  console.log("Piranema location:", prn ? prn.location : "team not found");

  const all = await Team.find({}, { code: 1, slot: 1, name: 1, tournament: 1, location: 1 }).sort({ code: 1 });
  console.log("\nfinal team state:");
  for (const t of all) {
    console.log(
      `  ${t.code.padEnd(4)} ${(t.slot || "-").padEnd(3)} ${t.name.padEnd(28)} ${(t.location || "").padEnd(22)} ${t.tournament}`
    );
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
