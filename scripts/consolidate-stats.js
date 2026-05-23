// Consolidates per-game iScore stats (xlsx) into Player.pitching and
// Player.batting. Walks ~/Documents/TBA Stats/<matchup>/{TB,TP}_<team>.xlsx
// and sums each player's counting stats across every game they appeared
// in, then recomputes ERA and AVG from the totals.
//
// Idempotent: every run starts from the player's stat sub-doc set to all
// zeros and re-derives from the source files. Safe to run any time the
// xlsx folder is updated.
//
// Two iScore export variants are accepted ("full" and "compact"); the
// script reads columns by header name so the order doesn't matter.
//
// Usage:
//   node scripts/consolidate-stats.js
//   STATS_DIR=/path/to/dir node scripts/consolidate-stats.js
//
// Requires the `xlsx` package (lightweight, pure-JS xlsx reader; npm i xlsx).

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const os = require("os");
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

const STATS_DIR =
  process.env.STATS_DIR || path.join(os.homedir(), "Documents/TBA Stats");
const INNINGS_PER_GAME = 7; // amateur 7-inning league
const INF_ERA = 99.99;      // sentinel for "allowed runs with 0 outs"

const TEAM_CODE = {
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
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Manual aliases for iScore typos / partial names that fuzzy matching
// alone can't reconcile. Keyed by "<teamCode>::<normalized name from xlsx>"
// → normalized name as it appears on the registered roster.
const ALIASES = {
  // Middle-initial dropped: registered as "Yassushi M. A. Okada".
  "TIT::yasushi okada": "yassushi m a okada",
};

function lev(a, b) {
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > 3) return Math.abs(al - bl);
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

// Fuzzy match `needle` against a list of `candidates`. Returns the best
// candidate within an edit-distance budget proportional to the longer
// of the two strings; null if nothing's close enough.
function bestMatch(needle, candidates) {
  const n = norm(needle);
  let best = null, bestDist = Infinity;
  for (const c of candidates) {
    const d = lev(n, norm(c));
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  // Allow ~10% of length, with a floor of 2 and a ceiling of 4.
  const budget = Math.max(2, Math.min(4, Math.floor(n.length * 0.1)));
  return bestDist <= budget ? best : null;
}

const num = (v) => {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function readRows(file) {
  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

function teamFromFilename(filename) {
  // "TB_White Tigers.xlsx" -> "White Tigers"
  const m = filename.match(/^T[BP]_(.+)\.xlsx$/);
  return m ? m[1] : null;
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
  let files = 0, rows = 0;

  for (const matchup of fs.readdirSync(STATS_DIR)) {
    const dir = path.join(STATS_DIR, matchup);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const filename of fs.readdirSync(dir)) {
      if (!filename.endsWith(".xlsx")) continue;
      const teamName = teamFromFilename(filename);
      const code = teamName ? TEAM_CODE[teamName] : null;
      if (!code) {
        console.log(`skip (unknown team): ${matchup}/${filename}`);
        continue;
      }
      const isPitching = filename.startsWith("TP_");
      const data = readRows(path.join(dir, filename));
      files++;

      for (const r of data) {
        const name = r.Name;
        if (!name || String(name).toUpperCase() === "TOTAL") continue;
        const b = ensureBucket(buckets, code, name);
        if (isPitching) {
          b.pitching.G  += num(r.G);
          b.pitching.IP += num(r.IP);
          b.pitching.R  += num(r.R);
          b.pitching.ER += num(r.ER);
          b.pitching.K  += num(r.K);
          b.pitching.H  += num(r.H);
          b.pitching.BB += num(r.BB);
        } else {
          b.batting.G   += num(r.G);
          b.batting.PA  += num(r.PA);
          b.batting.AB  += num(r.AB);
          b.batting.R   += num(r.R);
          b.batting.H   += num(r.H);
          b.batting.HR  += num(r.HR);
          b.batting.RBI += num(r.RBI);
          b.batting.BB  += num(r.BB);
          // iScore's compact format uses SO; the full format breaks it
          // down into Kc + Ks. Prefer SO when present, otherwise sum.
          b.batting.SO  += r.SO != null ? num(r.SO) : num(r.Kc) + num(r.Ks);
          b.batting.SB  += num(r.SB);
        }
        rows++;
      }
    }
  }
  console.log(`parsed ${files} files, ${rows} player-rows, ${buckets.size} unique (team, player) pairs`);

  // ── 2. Compute derived (ERA, AVG) ────────────────────────────────
  for (const b of buckets.values()) {
    if (b.pitching.IP > 0) {
      b.pitching.ERA = +(b.pitching.ER * INNINGS_PER_GAME / b.pitching.IP).toFixed(2);
    } else if (b.pitching.ER > 0) {
      b.pitching.ERA = INF_ERA; // gave up earned runs with 0 outs
    } else {
      b.pitching.ERA = 0;
    }
    b.batting.AVG = b.batting.AB > 0 ? +(b.batting.H / b.batting.AB).toFixed(3) : 0;
  }

  // ── 3. Apply to the DB ───────────────────────────────────────────
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected to MongoDB");

  const teams = await Team.find({});
  const teamByCode = new Map(teams.map((t) => [t.code, t]));

  // Reset every player's pitching+batting before applying — so removed
  // appearances or fixed name typos don't leave stale sub-docs behind.
  const zero = {
    "pitching.G": 0, "pitching.IP": 0, "pitching.R": 0, "pitching.ER": 0,
    "pitching.ERA": 0, "pitching.K": 0, "pitching.H": 0, "pitching.BB": 0,
    "batting.G": 0, "batting.PA": 0, "batting.AB": 0, "batting.R": 0,
    "batting.H": 0, "batting.HR": 0, "batting.RBI": 0, "batting.BB": 0,
    "batting.SO": 0, "batting.SB": 0, "batting.AVG": 0,
  };
  await Player.updateMany({}, { $set: zero });
  console.log("reset every player to zero stats");

  // Pre-merge buckets with near-identical names within the same team
  // (e.g. ANN's "Chay Villalta" / "Chay Billalta" — same player, V/B typo
  // across two game files). Keep the longer name as the canonical one.
  const grouped = new Map();
  for (const b of buckets.values()) {
    if (!grouped.has(b.teamCode)) grouped.set(b.teamCode, []);
    grouped.get(b.teamCode).push(b);
  }
  const consolidated = [];
  for (const [, list] of grouped) {
    const used = new Set();
    for (let i = 0; i < list.length; i++) {
      if (used.has(i)) continue;
      const acc = list[i];
      for (let j = i + 1; j < list.length; j++) {
        if (used.has(j)) continue;
        const a = norm(acc.displayName), c = norm(list[j].displayName);
        if (lev(a, c) <= 2 && Math.min(a.length, c.length) >= 8) {
          if (list[j].displayName.length > acc.displayName.length) {
            acc.displayName = list[j].displayName;
          }
          for (const k of Object.keys(acc.pitching)) acc.pitching[k] += list[j].pitching[k];
          for (const k of Object.keys(acc.batting)) acc.batting[k] += list[j].batting[k];
          used.add(j);
        }
      }
      consolidated.push(acc);
    }
  }
  console.log(`merged into ${consolidated.length} buckets after fuzzy de-dup`);

  // Recompute derived stats post-merge.
  for (const b of consolidated) {
    if (b.pitching.IP > 0) {
      b.pitching.ERA = +(b.pitching.ER * INNINGS_PER_GAME / b.pitching.IP).toFixed(2);
    } else if (b.pitching.ER > 0) {
      b.pitching.ERA = INF_ERA;
    } else {
      b.pitching.ERA = 0;
    }
    b.batting.AVG = b.batting.AB > 0 ? +(b.batting.H / b.batting.AB).toFixed(3) : 0;
  }

  let updated = 0, created = 0;
  const skipped = [];

  for (const b of consolidated) {
    const team = teamByCode.get(b.teamCode);
    if (!team) {
      skipped.push({ team: b.teamCode, name: b.displayName, reason: "team not in DB" });
      continue;
    }
    const roster = await Player.find({ team: team._id });
    const rosterNames = roster.map((p) => p.name);

    const aliasKey = `${b.teamCode}::${norm(b.displayName)}`;
    const aliasTarget = ALIASES[aliasKey];

    let target = roster.find((p) => norm(p.name) === norm(b.displayName));
    if (!target && aliasTarget) {
      target = roster.find((p) => norm(p.name) === aliasTarget);
    }
    if (!target) {
      const match = bestMatch(b.displayName, rosterNames);
      if (match) target = roster.find((p) => p.name === match);
    }

    if (!target) {
      // Auto-create mid-tournament additions. Roster number after the
      // existing highest; jerseyNumber stays unset (we don't have it).
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
