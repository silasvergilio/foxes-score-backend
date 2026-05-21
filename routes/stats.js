const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

const STATS_PATH = path.join(__dirname, "../data/stats.json");

// GET /stats
// Returns all competition stats (pitching, batting avg, RBI, runs, stolen bases)
// grouped both as overall leaders and by team.
router.get("/", function (req, res) {
  try {
    const data = JSON.parse(fs.readFileSync(STATS_PATH, "utf8"));
    res.status(200).json(data);
  } catch (err) {
    console.error("Erro ao ler stats:", err);
    res.status(500).json({ error: "Erro ao carregar stats" });
  }
});

// GET /stats/team/:team
// Returns stats for a specific team (case-insensitive).
router.get("/team/:team", function (req, res) {
  try {
    const data = JSON.parse(fs.readFileSync(STATS_PATH, "utf8"));
    const key = Object.keys(data.byTeam).find(
      (t) => t.toLowerCase() === req.params.team.toLowerCase()
    );
    if (!key) {
      return res.status(404).json({ error: "Time não encontrado" });
    }
    res.status(200).json({ team: key, stats: data.byTeam[key] });
  } catch (err) {
    console.error("Erro ao ler stats:", err);
    res.status(500).json({ error: "Erro ao carregar stats" });
  }
});

module.exports = router;
