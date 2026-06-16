// D1 stats consolidator. Mirrors scripts/consolidate-stats.js but for
// the D1 directory layout / file format:
//
//   ~/Documents/TBA Stats/01_D1/<matchup>/
//     <CODE>_Batting.pdf
//     <CODE>_Pitching.pdf
//
// where <CODE> is the team's DB code (BRA, CRB, SUD, TMX).
//
// Idempotent: every D1 player is reset to zero stats before re-deriving
// from the PDFs. Players seen in stats but not on the registered D1
// roster are auto-created (matches the D2 behavior).
//
// Usage:
//   node scripts/consolidate-stats-d1.js
//   STATS_DIR=/path/to/dir node scripts/consolidate-stats-d1.js

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const os = require("os");
const mongoose = require("mongoose");
const { PDFParse } = require("pdf-parse");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

const YEAR = 2026;
const DIVISION = "1";
const STATS_DIR =
  process.env.STATS_DIR ||
  path.join(os.homedir(), "Documents/TBA Stats/01_D1");
const INNINGS_PER_GAME = 7;
const INF_ERA = 99.99;

// Column orders in the iScore "compact" PDF export. Same shape we saw in
// the D2 PDFs (iScore Statistics 6/8) — pitching has 19 cols, batting has
// 18. Parsing is positional after the player name.
const PITCH_COLS = [
  "G", "W", "L", "SV", "HLD",
  "IP", "BF", "Ball", "Str",
  "R", "ER", "ERA",
  "K", "H", "BB", "IBB", "BK", "WP", "HR",
];
const BAT_COLS = [
  "G", "PA", "AB", "R", "H", "HR", "TB", "RBI", "AVG",
  "BB", "SO", "HBP", "SB", "CS", "SCB", "SF",
  "SLG", "BA_RSP",
];

const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function lev(a, b) {
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > 4) return Math.abs(al - bl);
  const dp = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[al][bl];
}

function bestMatch(needle, candidates) {
  const n = norm(needle);
  let best = null, bestDist = Infinity;
  for (const c of candidates) {
    const d = lev(n, norm(c));
    if (d < bestDist) { bestDist = d; best = c; }
  }
  const budget = Math.max(2, Math.min(4, Math.floor(n.length * 0.1)));
  return bestDist <= budget ? best : null;
}

async function parsePdf(file) {
  const parser = new PDFParse({ data: fs.readFileSync(file) });
  const result = await parser.getText();
  // Lines look like: "Player Name \tN \tN \tN ..."
  // The split-on-whitespace approach works because numbers don't contain
  // whitespace. We split each line into tokens, peel the numeric columns
  // off the *right*, and treat everything left as the player name.
  const lines = result.text.split("\n").filter((l) => l.trim());
  const rows = [];
  // A token counts as "numeric" if it parses as a float OR is the literal
  // "inf" iScore prints when a pitcher allowed runs without recording an
  // out. Also accept "NaN" for safety. Cast both to a sentinel (INF_ERA-
  // sized) so we have a usable number downstream.
  const isNumeric = (t) =>
    /^-?\d+(\.\d+)?$/.test(t) || /^(inf|infinity|nan)$/i.test(t);
  const toNum = (t) => (/^(inf|infinity)$/i.test(t) ? INF_ERA : parseFloat(t));

  for (const line of lines) {
    if (!line.trim() || /^-- \d+ of \d+ --$/.test(line)) continue;
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens[0] === "Name" || tokens[0] === "TOTAL") continue;
    // Peel numeric tokens off the right; the rest is the player name.
    let nameEnd = tokens.length;
    while (nameEnd > 0 && isNumeric(tokens[nameEnd - 1])) nameEnd--;
    // Some names carry an iScore "#" suffix marker — strip it.
    const name = tokens.slice(0, nameEnd).join(" ").replace(/#$/, "").trim();
    const nums = tokens.slice(nameEnd).map(toNum);
    if (!name || nums.length === 0) continue;
    rows.push({ name, nums });
  }
  return rows;
}

// Both conventions appear in the wild — early files used the team code
// ("BRA_Pitching.pdf", "SUD_Batting.pdf") and later ones use the full
// display name ("Caribes_Pitching.pdf", "Tomaxes_batting.pdf"). Map them
// both back to the DB code.
const NAME_TO_CODE = {
  BRABOS: "BRA",
  CARIBES: "CRB",
  SUDOESTE: "SUD",
  "SUDOESTE PAULISTA": "SUD",
  TOMAXES: "TMX",
};

function teamFromFilename(filename) {
  // Tolerate any case ("Pitching" / "pitching") and either underscore or
  // space between the prefix and Batting/Pitching.
  const m = filename.match(/^(.+?)[_ ](Batting|Pitching)\.pdf$/i);
  if (!m) return null;
  const raw = m[1].toUpperCase().replace(/_/g, " ").trim();
  const code = NAME_TO_CODE[raw] || (raw.length <= 4 ? raw : null);
  if (!code) return null;
  return { code, isPitching: m[2].toLowerCase() === "pitching" };
}

function ensureBucket(map, teamCode, name) {
  const key = `${teamCode}::${norm(name)}`;
  if (!map.has(key)) {
    map.set(key, {
      teamCode,
      displayName: name,
      pitching: { G: 0, IP: 0, R: 0, ER: 0, K: 0, H: 0, BB: 0 },
      batting: { G: 0, PA: 0, AB: 0, R: 0, H: 0, HR: 0, RBI: 0, BB: 0, SO: 0, SB: 0 },
    });
  }
  return map.get(key);
}

async function main() {
  if (!fs.existsSync(STATS_DIR)) {
    console.error("STATS_DIR not found:", STATS_DIR);
    process.exit(1);
  }
  console.log("reading:", STATS_DIR);

  // ── 1. Walk and accumulate ───────────────────────────────────────
  const buckets = new Map();
  let files = 0, rowsTotal = 0;

  for (const matchup of fs.readdirSync(STATS_DIR)) {
    const dir = path.join(STATS_DIR, matchup);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const filename of fs.readdirSync(dir)) {
      if (!filename.toLowerCase().endsWith(".pdf")) continue;
      const meta = teamFromFilename(filename);
      if (!meta) {
        console.log(`skip (unrecognized name): ${matchup}/${filename}`);
        continue;
      }
      const rows = await parsePdf(path.join(dir, filename));
      files++;

      const cols = meta.isPitching ? PITCH_COLS : BAT_COLS;
      for (const r of rows) {
        const m = {};
        for (let i = 0; i < cols.length && i < r.nums.length; i++) {
          m[cols[i]] = r.nums[i];
        }
        const b = ensureBucket(buckets, meta.code, r.name);
        if (meta.isPitching) {
          b.pitching.G  += m.G  ?? 0;
          b.pitching.IP += m.IP ?? 0;
          b.pitching.R  += m.R  ?? 0;
          b.pitching.ER += m.ER ?? 0;
          b.pitching.K  += m.K  ?? 0;
          b.pitching.H  += m.H  ?? 0;
          b.pitching.BB += m.BB ?? 0;
        } else {
          b.batting.G   += m.G   ?? 0;
          b.batting.PA  += m.PA  ?? 0;
          b.batting.AB  += m.AB  ?? 0;
          b.batting.R   += m.R   ?? 0;
          b.batting.H   += m.H   ?? 0;
          b.batting.HR  += m.HR  ?? 0;
          b.batting.RBI += m.RBI ?? 0;
          b.batting.BB  += m.BB  ?? 0;
          b.batting.SO  += m.SO  ?? 0;
          b.batting.SB  += m.SB  ?? 0;
        }
        rowsTotal++;
      }
    }
  }
  console.log(`parsed ${files} files, ${rowsTotal} player-rows, ${buckets.size} unique (team, player) pairs`);

  // ── 2. Compute derived ───────────────────────────────────────────
  for (const b of buckets.values()) {
    if (b.pitching.IP > 0) {
      b.pitching.ERA = +(b.pitching.ER * INNINGS_PER_GAME / b.pitching.IP).toFixed(2);
    } else if (b.pitching.ER > 0) {
      b.pitching.ERA = INF_ERA;
    } else {
      b.pitching.ERA = 0;
    }
    b.batting.AVG = b.batting.AB > 0 ? +(b.batting.H / b.batting.AB).toFixed(3) : 0;
  }

  // ── 3. Apply to DB (D1 teams only) ───────────────────────────────
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected to MongoDB");

  const teams = await Team.find({ year: YEAR, division: DIVISION });
  const teamByCode = new Map(teams.map((t) => [t.code, t]));
  console.log(`D1 teams loaded: ${teams.length}`);

  // Reset D1 players to zero before applying.
  const teamIds = teams.map((t) => t._id);
  const zero = {
    "pitching.G": 0, "pitching.IP": 0, "pitching.R": 0, "pitching.ER": 0,
    "pitching.ERA": 0, "pitching.K": 0, "pitching.H": 0, "pitching.BB": 0,
    "batting.G": 0, "batting.PA": 0, "batting.AB": 0, "batting.R": 0,
    "batting.H": 0, "batting.HR": 0, "batting.RBI": 0, "batting.BB": 0,
    "batting.SO": 0, "batting.SB": 0, "batting.AVG": 0,
  };
  await Player.updateMany({ team: { $in: teamIds } }, { $set: zero });
  console.log(`reset every D1 player to zero stats`);

  let updated = 0, created = 0;
  const skipped = [];

  for (const b of buckets.values()) {
    const team = teamByCode.get(b.teamCode);
    if (!team) {
      skipped.push({ team: b.teamCode, name: b.displayName, reason: "team not in D1" });
      continue;
    }
    const roster = await Player.find({ team: team._id });
    const rosterNames = roster.map((p) => p.name);

    let target = roster.find((p) => norm(p.name) === norm(b.displayName));
    if (!target) {
      const match = bestMatch(b.displayName, rosterNames);
      if (match) target = roster.find((p) => p.name === match);
    }

    if (!target) {
      const maxRoster = roster.reduce((m, p) => Math.max(m, p.rosterNumber ?? 0), 0);
      target = await Player.create({
        team: team._id,
        name: b.displayName,
        rosterNumber: maxRoster + 1,
      });
      created++;
      console.log(`+ created ${b.teamCode} #${target.rosterNumber} ${target.name}`);
    }

    target.pitching = b.pitching;
    target.batting = b.batting;
    await target.save();
    updated++;
  }

  console.log(`\nupdated ${updated} players  (${created} newly created)`);
  if (skipped.length) {
    console.log(`\nSKIPPED (${skipped.length}):`);
    for (const m of skipped) console.log(`  ${m.team}  ${m.name}  (${m.reason})`);
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
