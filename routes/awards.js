const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

const AWARDS_PATH = path.join(__dirname, "../data/awards.json");

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

// GET /awards?year=YYYY&division=N
// Returns the award entries for the given (year, division). Defaults
// to the latest year × division "2" if not specified so legacy callers
// (which used to GET /awards with no params and get the flat 2026/D2
// array) keep working.
router.get("/", async function (req, res) {
  try {
    const raw = JSON.parse(fs.readFileSync(AWARDS_PATH, "utf8"));

    // Pick the edition: query param wins; else latest year, division "2".
    const years = Object.keys(raw).sort();
    const year = req.query.year || years[years.length - 1] || "2026";
    const division = req.query.division || "2";

    const entries = (raw[year] && raw[year][division]) || [];

    // Look up teams scoped to this edition so codes are unambiguous —
    // WT in D1 is a different document from WT in D2.
    const teams = await Team.find({
      year: Number(year),
      division: String(division),
    });
    const teamByCode = new Map(teams.map((t) => [t.code, t]));

    const out = [];
    for (const a of entries) {
      const team = teamByCode.get(a.team);
      const entry = {
        category: a.category,
        team: team
          ? { _id: team._id, code: team.code, name: team.name, slot: team.slot, imageFile: team.imageFile }
          : { code: a.team, name: a.team },
        player: null,
      };
      if (team) {
        const roster = await Player.find(
          { team: team._id },
          "name jerseyNumber rosterNumber"
        ).lean();
        const target = roster.find((p) => norm(p.name) === norm(a.player));
        let match = target;
        if (!match) {
          // Fuzzy fallback for diacritic / typo variants in the JSON.
          const n = norm(a.player);
          const budget = Math.max(2, Math.min(4, Math.floor(n.length * 0.1)));
          let best = null, bestDist = Infinity;
          for (const p of roster) {
            const d = lev(n, norm(p.name));
            if (d < bestDist) { bestDist = d; best = p; }
          }
          if (bestDist <= budget) match = best;
        }
        if (match) {
          entry.player = {
            _id: match._id,
            name: match.name,
            jerseyNumber: match.jerseyNumber,
            rosterNumber: match.rosterNumber,
          };
        } else {
          // Player named in awards.json isn't on the team's roster.
          // Return the raw name so the frontend can still render the card.
          entry.player = { name: a.player };
        }
      }
      out.push(entry);
    }

    res.status(200).json(out);
  } catch (err) {
    console.error("Erro ao carregar awards:", err);
    res.status(500).json({ error: "Erro ao carregar awards" });
  }
});

module.exports = router;
