// Wipes games + reseeds the 9 tournament teams with slot codes.
// Pirituba (already inserted with code PTB) is updated in place to keep its roster.
// Usage: node scripts/reset-and-seed.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Game = require("../models/mGame");

const TOURNAMENT = "Taça Brasil Amador 2025";

const seedTeams = [
  { code: "A1", slot: "A1", name: "Foxes Academic", imageFile: "fxs", location: "São Paulo - SP",   link: "https://www.instagram.com/go.foxes/" },
  { code: "A2", slot: "A2", name: "Blue Labels",    imageFile: "bl",  location: "São Paulo - SP",   link: "https://www.instagram.com/bluelabelsbaseball/" },
  { code: "A3", slot: "A3", name: "White Tigers",   imageFile: "wt",  location: "Porto Alegre - RS", link: "https://www.instagram.com/whitetigerspoa/" },
  { code: "B1", slot: "B1", name: "Highlanders",    imageFile: "hig", location: "São Paulo - SP",   link: "https://www.instagram.com/highlanders_baseball_beer/" },
  { code: "B2", slot: "B2", name: "Nguelche",       imageFile: "ngu", location: "São Paulo - SP",   link: "https://www.instagram.com/nguelche/" },
  // B3 = Pirituba (already in DB with code PTB and a full roster — we just retag it).
  { code: "C1", slot: "C1", name: "Triângulo Titans", imageFile: "tit", location: "São Paulo - SP", link: "" },
  { code: "C2", slot: "C2", name: "Underdogs",        imageFile: "ud",  location: "São Paulo - SP", link: "https://www.instagram.com/underdogs.beisebol/" },
  { code: "C3", slot: "C3", name: "Falcons",          imageFile: "psm", location: "Pilar do Sul - SP", link: "https://www.instagram.com/falconspilardosul/" },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  const gameWipe = await Game.deleteMany({});
  console.log("wiped games:", gameWipe.deletedCount);

  // Drop any legacy unique indexes on Team (location_1, imageFile_1) left over
  // from the original schema. syncIndexes will rebuild from the current schema.
  const teamIndexes = await Team.collection.indexes();
  for (const idx of teamIndexes) {
    if (idx.name !== "_id_" && idx.name !== "code_1" && idx.name !== "slot_1") {
      await Team.collection.dropIndex(idx.name);
      console.log("dropped stale team index:", idx.name);
    }
  }
  await Team.syncIndexes();

  // Tag Pirituba as slot B3 (keep roster, keep code PTB so player refs don't break).
  const pirituba = await Team.findOneAndUpdate(
    { code: "PTB" },
    { $set: { slot: "B3", tournament: TOURNAMENT } },
    { new: true }
  );
  console.log("retagged Pirituba:", pirituba ? `${pirituba.code} → slot ${pirituba.slot}` : "not found");

  // Upsert the other 8 by code so reruns are safe.
  for (const t of seedTeams) {
    const res = await Team.findOneAndUpdate(
      { code: t.code },
      { $set: { ...t, tournament: TOURNAMENT } },
      { upsert: true, new: true }
    );
    console.log("upserted:", res.code, "→ slot", res.slot, "-", res.name);
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
