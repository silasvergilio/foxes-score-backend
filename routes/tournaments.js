const express = require("express");
const router = express.Router();
const Team = require("../models/mTeam");
const Game = require("../models/mGame");

// GET /tournaments
// Lists every tournament edition (year, division) present in the DB,
// with quick counts the frontend uses to populate the toolbar selector.
//
// Output is sorted by year desc, then division desc (D2 before D1)
// so the most recent edition is first.
router.get("/", async function (req, res) {
  try {
    const teamAgg = await Team.aggregate([
      { $match: { year: { $exists: true, $ne: null }, division: { $exists: true, $ne: null } } },
      { $group: {
          _id: { year: "$year", division: "$division" },
          tournament: { $first: "$tournament" },
          teamCount: { $sum: 1 },
        },
      },
    ]);

    const gameAgg = await Game.aggregate([
      { $match: { year: { $exists: true, $ne: null }, division: { $exists: true, $ne: null } } },
      { $group: {
          _id: { year: "$year", division: "$division" },
          gameCount: { $sum: 1 },
          finishedCount: {
            $sum: { $cond: [{ $eq: ["$status", "finished"] }, 1, 0] },
          },
          liveCount: {
            $sum: { $cond: [{ $eq: ["$status", "live"] }, 1, 0] },
          },
        },
      },
    ]);

    const gameMap = new Map();
    for (const g of gameAgg) {
      const k = `${g._id.year}|${g._id.division}`;
      gameMap.set(k, g);
    }

    const editions = teamAgg.map((t) => {
      const k = `${t._id.year}|${t._id.division}`;
      const g = gameMap.get(k) || { gameCount: 0, finishedCount: 0, liveCount: 0 };
      const status =
        g.liveCount > 0
          ? "live"
          : g.gameCount === 0
          ? "scheduled"
          : g.finishedCount === g.gameCount
          ? "finished"
          : "in_progress";
      return {
        year: t._id.year,
        division: t._id.division,
        tournament: t.tournament || null,
        teamCount: t.teamCount,
        gameCount: g.gameCount,
        finishedCount: g.finishedCount,
        liveCount: g.liveCount,
        status,
      };
    });

    editions.sort((a, b) =>
      b.year - a.year || b.division.localeCompare(a.division)
    );

    res.status(200).json(editions);
  } catch (error) {
    console.error("Erro ao listar edições: ", error);
    res.status(500).json({ error: "Erro ao listar edições" });
  }
});

module.exports = router;
