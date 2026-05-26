// One-shot migration: tag every existing Team and Game with
// year=2026, division="2". Idempotent — only touches docs missing the
// fields.
//
// After this runs, the unique index on Team.code (set in the schema as
// a compound index over year+division+code) takes effect. We also drop
// the old global unique index on Team.code so adding D1 teams that
// reuse codes won't collide.
//
// Usage: node scripts/migrate-add-year-division.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Game = require("../models/mGame");

const YEAR = 2026;
const DIVISION = "2";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  // ── 1. Drop legacy unique index on Team.code ──────────────────────
  // The current data has WT/HIG/etc as globally unique codes. After
  // adding D1 we want the same codes again, so the index moves to
  // (year, division, code).
  try {
    const idx = await Team.collection.indexes();
    for (const i of idx) {
      if (i.name === "code_1") {
        await Team.collection.dropIndex(i.name);
        console.log("dropped legacy index: code_1");
      }
    }
  } catch (e) {
    console.log("(no legacy index to drop)");
  }

  // ── 2. Tag teams ──────────────────────────────────────────────────
  const tres = await Team.updateMany(
    { $or: [{ year: { $exists: false } }, { year: null }] },
    { $set: { year: YEAR, division: DIVISION } }
  );
  console.log(`teams tagged (year=${YEAR}, division=${DIVISION}): ${tres.modifiedCount}`);

  // ── 3. Tag games ──────────────────────────────────────────────────
  const gres = await Game.updateMany(
    { $or: [{ year: { $exists: false } }, { year: null }] },
    { $set: { year: YEAR, division: DIVISION } }
  );
  console.log(`games tagged (year=${YEAR}, division=${DIVISION}): ${gres.modifiedCount}`);

  // ── 4. Sync the new indexes ───────────────────────────────────────
  await Team.syncIndexes();
  await Game.syncIndexes();
  console.log("indexes synced");

  // ── 5. Quick summary ──────────────────────────────────────────────
  const editions = await Team.aggregate([
    { $group: { _id: { year: "$year", division: "$division" }, n: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.division": 1 } },
  ]);
  console.log("\nteams by edition:");
  for (const e of editions) {
    console.log(`  ${e._id.year ?? "(none)"} / D${e._id.division ?? "?"}  -> ${e.n} teams`);
  }

  const gameEditions = await Game.aggregate([
    { $group: { _id: { year: "$year", division: "$division" }, n: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.division": 1 } },
  ]);
  console.log("\ngames by edition:");
  for (const e of gameEditions) {
    console.log(`  ${e._id.year ?? "(none)"} / D${e._id.division ?? "?"}  -> ${e.n} games`);
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
