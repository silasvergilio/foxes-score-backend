const express = require("express");
const router = express.Router();

router.get("/", function (req, res) {
  res.json({ name: "foxes-score-backend", status: "ok" });
});

module.exports = router;
