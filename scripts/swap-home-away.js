// Swaps home <-> away on every game in the tournament. Used when the
// initial schedule was seeded with the listing convention "X x Y" meaning
// Y is at home, not X. Operation:
//
//   homeTeam   <-> awayTeam
//   homeScore  <-> awayScore
//   homeInnings <-> awayInnings
//   inningHalf top <-> bottom   (so the batting team stays consistent)
//
// Idempotent at the level of "run twice and you're back where you started".
//
// Usage: node scripts/swap-home-away.js [tournament]

require("dotenv").config();
const mongoose = require("mongoose");
const Game = require("../models/mGame");
require("../models/mTeam");

const tournament = process.argv[2] || "Taça Brasil Amador 2026";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected; swapping games in:", tournament);

  // Pipeline update so we can reference both old values atomically.
  const res = await Game.collection.updateMany({ tournament }, [
    {
      $set: {
        _h: "$homeTeam",
        _a: "$awayTeam",
        _hs: "$homeScore",
        _as: "$awayScore",
        _hi: "$homeInnings",
        _ai: "$awayInnings",
        _ih: "$inningHalf",
      },
    },
    {
      $set: {
        homeTeam: "$_a",
        awayTeam: "$_h",
        homeScore: "$_as",
        awayScore: "$_hs",
        homeInnings: "$_ai",
        awayInnings: "$_hi",
        inningHalf: {
          $switch: {
            branches: [
              { case: { $eq: ["$_ih", "top"] }, then: "bottom" },
              { case: { $eq: ["$_ih", "bottom"] }, then: "top" },
            ],
            default: "$_ih",
          },
        },
      },
    },
    { $unset: ["_h", "_a", "_hs", "_as", "_hi", "_ai", "_ih"] },
  ]);

  console.log("modified:", res.modifiedCount);

  // Quick visual confirmation
  const games = await Game.find({ tournament })
    .sort({ round: 1, field: 1 })
    .populate("homeTeam", "code")
    .populate("awayTeam", "code");
  console.log("\nafter swap:");
  for (const g of games) {
    console.log(
      `  R${g.round} ${g.field}  ${g.homeTeam.code.padEnd(4)} (home) vs ${g.awayTeam.code.padEnd(4)} (away)  ` +
        `${g.homeScore}-${g.awayScore}  status=${g.status}  half=${g.inningHalf}`
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
