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
// Tiebreaker order: wins desc, losses asc, runDiff desc, runsScored desc.
router.get("/", async function (req, res) {
  try {
    const filter = {};
    if (req.query.tournament) filter.tournament = req.query.tournament;

    const teams = await Team.find(filter, TEAM_FIELDS).lean();
    const teamById = new Map(teams.map((t) => [String(t._id), t]));

    const finishedGames = await Game.find(
      { ...filter, status: "finished" },
      "homeTeam awayTeam homeScore awayScore"
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
      });
    }

    for (const g of finishedGames) {
      const home = stats.get(String(g.homeTeam));
      const away = stats.get(String(g.awayTeam));
      if (!home || !away) continue; // game references a team not in filter

      home.gamesPlayed++;
      away.gamesPlayed++;
      home.runsScored += g.homeScore;
      home.runsAgainst += g.awayScore;
      away.runsScored += g.awayScore;
      away.runsAgainst += g.homeScore;

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
    }

    const sortByRank = (a, b) =>
      b.wins - a.wins ||
      a.losses - b.losses ||
      b.runDiff - a.runDiff ||
      b.runsScored - a.runsScored;

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
