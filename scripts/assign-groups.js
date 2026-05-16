// Assigns each of the 8 teams to its tournament group.
// Group 1: WT, MPS, TIT, HIG
// Group 2: FXS, ANN, PTB, PRN
//
// Usage: node scripts/assign-groups.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");

const assignments = {
  "1": ["WT", "MPS", "TIT", "HIG"],
  "2": ["FXS", "ANN", "PTB", "PRN"],
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  for (const [group, codes] of Object.entries(assignments)) {
    const res = await Team.updateMany(
      { code: { $in: codes } },
      { $set: { group } }
    );
    console.log(`group ${group}: matched=${res.matchedCount} modified=${res.modifiedCount} (${codes.join(", ")})`);
  }

  const all = await Team.find({}, { code: 1, group: 1, slot: 1, name: 1 }).sort({ group: 1, code: 1 });
  console.log("\nfinal:");
  for (const t of all) {
    console.log(`  group ${t.group || "-"}  ${t.code.padEnd(4)} ${(t.slot || "-").padEnd(3)} ${t.name}`);
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
