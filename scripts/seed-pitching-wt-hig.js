// Adds non-leader pitcher stats for White Tigers (iScore Statistics 6.pdf)
// and Highlanders (iScore Statistics 8.pdf).
//
// Rule: never regress a value that's already populated from the awards
// session's aggregate data (stats.json). If a player already has IP > 0
// recorded, leave them alone — that's the multi-round aggregate, which
// the single-PDF snapshot would understate. Otherwise, copy in what the
// PDF shows.
//
// ERA edge case: a pitcher who allowed runs without recording an out has
// `inf` in the PDF. We store 99.99 as a clear "bad ERA" sentinel; a real
// number any UI can render without special-casing infinities.
//
// Usage: node scripts/seed-pitching-wt-hig.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

const TOURNAMENT = "Taça Brasil Amador 2026";
const INF_ERA = 99.99;

const stats = [
  // ── White Tigers (PDF 6) ───────────────────────────────────────
  {
    code: "WT",
    rows: [
      // Matheus came in, gave up 4 R / 5 ER without recording an out.
      { name: "Matheus Amarante Vasconcellos", G: 1, IP: 0.0,  R: 4, ERA: INF_ERA, K: 0, H: 1,  BB: 3 },
      { name: "Eloy José Marsella González",   G: 1, IP: 2.0,  R: 3, ERA: 4.5,     K: 1, H: 5,  BB: 2 },
      { name: "José Gregório Navarro",         G: 1, IP: 1.0,  R: 0, ERA: 0.0,     K: 2, H: 1,  BB: 1 },
      { name: "Abraham Josué Navarro Bruzual", G: 1, IP: 0.0,  R: 0, ERA: 0.0,     K: 0, H: 0,  BB: 0 },
    ],
  },
  // ── Highlanders (PDF 8) ────────────────────────────────────────
  // Only "Kenji Yamada" had stats in PDF 8 (G=1 IP=4 K=2 H=9 ERA=4.50).
  // That's almost certainly Claudio Kenji Yamada — who already carries
  // IP=6 K=6 H=13 ERA=5.83 from the JSON (2+ games aggregated). The PDF
  // would regress him, so we skip HIG entirely here.
];

const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  let updated = 0, skipped = 0, missing = 0;

  for (const block of stats) {
    const team = await Team.findOne({ tournament: TOURNAMENT, code: block.code });
    if (!team) {
      console.log(`team not found: ${block.code}`);
      continue;
    }
    const roster = await Player.find({ team: team._id });

    for (const row of block.rows) {
      const target = roster.find((p) => norm(p.name) === norm(row.name));
      if (!target) {
        console.log(`NOT FOUND on ${block.code}: ${row.name}`);
        missing++;
        continue;
      }
      const existing = target.pitching || {};
      if ((existing.IP ?? 0) > 0) {
        console.log(
          `SKIP   ${block.code} ${target.name.padEnd(36)} ` +
            `(already has IP=${existing.IP} from aggregate)`
        );
        skipped++;
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
      updated++;
      console.log(
        `✓ ${block.code} ${target.name.padEnd(36)} ` +
          `G=${row.G} IP=${row.IP} R=${row.R} ERA=${row.ERA} K=${row.K} H=${row.H} BB=${row.BB}`
      );
    }
  }

  console.log(`\ndone.  updated=${updated}  skipped=${skipped}  missing=${missing}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
