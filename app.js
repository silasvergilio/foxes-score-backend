require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const createError = require("http-errors");

const connectDB = require("./config/db");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const gameRouter = require("./routes/game");
const playerRouter = require("./routes/player");
const teamsRouter = require("./routes/teams");
const standingsRouter = require("./routes/standings");
const statsRouter = require("./routes/stats");
const awardsRouter = require("./routes/awards");

const app = express();

connectDB().catch((err) => {
  console.error("Failed to connect to MongoDB:", err);
  process.exit(1);
});

const corsOrigins = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  cors({
    origin: corsOrigins.includes("*") ? "*" : corsOrigins,
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD", "DELETE"],
  })
);

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/game", gameRouter);
app.use("/player", playerRouter);
app.use("/teams", teamsRouter);
app.use("/standings", standingsRouter);
app.use("/stats", statsRouter);
app.use("/awards", awardsRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

module.exports = app;
