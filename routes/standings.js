const express = require("express");
const router = express.Router();
const Game = require("../models/mGame");
const Team = require("../models/mTeam");

const TEAM_FIELDS = "name code slot group imageFile location";

// GET /standings?tournament=...
//
// Returns standings derived from finished games. Output is grouped by `group`
// so the frontend can render two side-by-side tables.
//
// Tiebreaker order:
//   1. wins desc
//   2. losses asc
//   3. TQB desc      (Team Quality Balance — see below)
//   4. runsScored desc
//
// TQB = (runsScored / inningsBatted) − (runsAgainst / inningsFielded)
// I.e. average runs per inning on offense minus average runs allowed per
// inning on defense. Higher is better; negative values are valid. Inning
// counts come from the per-game homeInnings/awayInnings arrays the
// frontend already records, so a "called" game where the home team didn't
// bat in their last half counts that asymmetry correctly.
router.get("/", async function (req, res) {
  try {
    const filter = {};
    if (req.query.tournament) filter.tournament = req.query.tournament;
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.division) filter.division = String(req.query.division);

    const teams = await Team.find(filter, TEAM_FIELDS).lean();

    // Only group-stage games count toward standings — bracket / playoff games
    // are recorded separately and should not skew the group tables.
    const finishedFilter = { ...filter, status: "finished" };
    finishedFilter.$or = [
      { bracket: "group" },
      { bracket: { $exists: false } },
      { bracket: null },
    ];

    const finishedGames = await Game.find(
      finishedFilter,
      "homeTeam awayTeam homeScore awayScore homeInnings awayInnings"
    ).lean();

    // Initialize a stat row per team so teams with zero games still appear.
    const stats = new Map();
    for (const t of teams) {
      stats.set(String(t._id), {
        team: t,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        runsScored: 0,
        runsAgainst: 0,
        runDiff: 0,
        inningsBatted: 0,
        inningsFielded: 0,
        tqb: 0,
      });
    }

    for (const g of finishedGames) {
      const home = stats.get(String(g.homeTeam));
      const away = stats.get(String(g.awayTeam));
      if (!home || !away) continue; // game references a team not in filter

      const homeInningsCount = Array.isArray(g.homeInnings)
        ? g.homeInnings.length
        : 0;
      const awayInningsCount = Array.isArray(g.awayInnings)
        ? g.awayInnings.length
        : 0;

      home.gamesPlayed++;
      away.gamesPlayed++;
      home.runsScored += g.homeScore;
      home.runsAgainst += g.awayScore;
      away.runsScored += g.awayScore;
      away.runsAgainst += g.homeScore;

      // A team bats in its own innings array; it fields while the opponent
      // bats (i.e. the opponent's innings array length).
      home.inningsBatted += homeInningsCount;
      home.inningsFielded += awayInningsCount;
      away.inningsBatted += awayInningsCount;
      away.inningsFielded += homeInningsCount;

      if (g.homeScore > g.awayScore) {
        home.wins++;
        away.losses++;
      } else if (g.homeScore < g.awayScore) {
        away.wins++;
        home.losses++;
      } else {
        home.ties++;
        away.ties++;
      }
    }

    for (const s of stats.values()) {
      s.runDiff = s.runsScored - s.runsAgainst;
      s.winPct =
        s.gamesPlayed === 0
          ? 0
          : Number(((s.wins + s.ties / 2) / s.gamesPlayed).toFixed(3));

      // TQB = offensive rate minus defensive rate. Always a finite number
      // for any team that's played at least one inning on each side.
      // For unplayed teams it stays null so the frontend renders "—".
      if (s.inningsBatted > 0 && s.inningsFielded > 0) {
        const off = s.runsScored / s.inningsBatted;
        const def = s.runsAgainst / s.inningsFielded;
        s.tqb = off - def;
      } else {
        s.tqb = null;
      }
    }

    const sortByRank = (a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      // TQB. Null (no games played) sorts last among tied W/L.
      const at = a.tqb ?? -Infinity;
      const bt = b.tqb ?? -Infinity;
      if (at !== bt) return bt - at;
      return b.runsScored - a.runsScored;
    };

    // Group teams by team.group.
    const byGroup = new Map();
    for (const s of stats.values()) {
      const key = s.team.group || "_";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(s);
    }
    for (const arr of byGroup.values()) arr.sort(sortByRank);

    const groups = [...byGroup.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([group, standings]) => ({ group, standings }));

    res.status(200).json({
      tournament: req.query.tournament || null,
      groups,
    });
  } catch (error) {
    console.error("Erro ao calcular standings: ", error);
    res.status(500).json({ error: "Erro ao calcular standings" });
  }
});

module.exports = router;
