// Backfills Player.pitching from data/stats.json (other session's
// pre-processed iScore PDFs).
//
// Caveats:
//   - stats.json only stored leaders per team (1 pitcher each), not full
//     staffs. So this populates 7 players, not the whole rosters.
//   - Only IP, K, H, ERA are present in stats.json. G, R, BB stay at 0.
//     If you need the missing fields, forward the original team PDFs and
//     I'll run a per-team seeder that captures all 7.
//
// Usage: node scripts/backfill-pitching-from-stats-json.js
//   (Run from a checkout that has data/stats.json on disk — that file
//   lives on `claude/vibrant-yalow-2d1a46` / origin/main, not on this
//   branch.)

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

const TOURNAMENT = "Taça Brasil Amador 2026";
const STATS_PATH = path.join(__dirname, "../data/stats.json");

// Display name in stats.json -> team code in the DB.
const TEAM_CODE_BY_NAME = {
  Foxes: "FXS",
  Highlanders: "HIG",
  Mavericks: "MPS",
  Niteroi: "ANN",
  Piranema: "PRN",
  Pirituba: "PTB",
  Titans: "TIT",
  "White Tigers": "WT",
};

const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

async function main() {
  if (!fs.existsSync(STATS_PATH)) {
    console.error(`stats.json not found at ${STATS_PATH}`);
    console.error("Switch to a branch that has data/stats.json on disk first.");
    process.exit(1);
  }
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8"));

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  let updated = 0;
  let missing = 0;

  for (const [teamName, breakdown] of Object.entries(stats.byTeam ?? {})) {
    const code = TEAM_CODE_BY_NAME[teamName];
    if (!code) {
      console.log(`unknown team: ${teamName}`);
      continue;
    }
    const team = await Team.findOne({ tournament: TOURNAMENT, code });
    if (!team) {
      console.log(`team not found in DB: ${teamName} (${code})`);
      continue;
    }
    const roster = await Player.find({ team: team._id });

    for (const row of breakdown.pitching ?? []) {
      const target = roster.find((p) => norm(p.name) === norm(row.Name));
      if (!target) {
        console.log(`NOT FOUND on ${code}: ${row.Name}`);
        missing++;
        continue;
      }
      // Preserve whatever G/R/BB the player already has (might have come
      // from a per-team seed previously). Only overwrite what stats.json
      // actually contains.
      const existing = target.pitching || {};
      target.pitching = {
        G: existing.G ?? 0,
        IP: row.IP ?? 0,
        R: existing.R ?? 0,
        ERA: row.ERA ?? 0,
        K: row.K ?? 0,
        H: row.H ?? 0,
        BB: existing.BB ?? 0,
      };
      await target.save();
      updated++;
      console.log(
        `✓ ${code} ${target.name.padEnd(32)} IP=${row.IP} K=${row.K} H=${row.H} ERA=${row.ERA}` +
          (existing.G ? `  (kept G=${existing.G} R=${existing.R} BB=${existing.BB})` : "")
      );
    }
  }

  console.log(`\ndone. updated=${updated}  missing=${missing}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
