var createError = require("http-errors");
var express = require("express");
const { createServer } = require("node:http");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
const { Server } = require("socket.io");
var cors = require("cors");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var gameRouter = require("./routes/game");

const app = express();
const server = createServer(app);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/game",gameRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(
  cors({
    origin: ["http://localhost:4200", "http://localhost:8080"],
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD", "DELETE"],
    credentials: true,
  })
);

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

const io = require("socket.io")(server, {
  cors: {
    origin: "https:/localhost:4200",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("new connection");

  io.emit("gameUpdate",{
    id: '1',
    tournament: "CBA A",
    location: "Ibiúna",
    date: "24/04/25",
    time: "10:00",
    status: "In Progress",
    awayTeam: "UnderDogs",
    homeTeam: "Foxes academy",
    awayScore: 10,
    homeScore: 6,
    firstBaseRunner: false,
    secondBaseRunner: true,
    thirdBaseRunner: false,
    balls: 0,
    strikes: 0,
    outs: 0,
    inning: 1,
    inningHalf: 'Top',
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});

module.exports = app;
