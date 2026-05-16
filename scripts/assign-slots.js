// Assigns slots per the order in each group.
//   Group 1 (A): WT=A1, MPS=A2, TIT=A3, HIG=A4
//   Group 2 (B): FXS=B1, ANN=B2, PTB=B3, PRN=B4
//
// Usage: node scripts/assign-slots.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");

const slotByCode = {
  WT: "A1",
  MPS: "A2",
  TIT: "A3",
  HIG: "A4",
  FXS: "B1",
  ANN: "B2",
  PTB: "B3",
  PRN: "B4",
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  for (const [code, slot] of Object.entries(slotByCode)) {
    const t = await Team.findOneAndUpdate(
      { code },
      { $set: { slot } },
      { new: true }
    );
    console.log(`${code.padEnd(4)} → slot ${slot}  ${t ? "(" + t.name + ")" : "(NOT FOUND)"}`);
  }

  const all = await Team.find({}, { code: 1, group: 1, slot: 1, name: 1 })
    .sort({ slot: 1 });
  console.log("\nfinal:");
  for (const t of all) {
    console.log(`  ${(t.slot || "-").padEnd(3)} group ${t.group || "-"}  ${t.code.padEnd(4)} ${t.name}`);
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
