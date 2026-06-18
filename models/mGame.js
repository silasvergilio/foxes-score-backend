const mongoose = require("mongoose");

/**
 * Single entry on a team's lineup card. Embedded inside a Game's
 * `homeLineup` / `awayLineup` arrays.
 *
 * For the starting lineup, `battingOrder` runs 1..9 (no DH), 1..10
 * (with DH or EH), or 1..11 (DH + EH). `position` is the defensive
 * spot the player is filling — or "DH" / "EH" for batting-only roles.
 *
 * Starters live in the lineup arrays; substitutes who haven't entered
 * yet are tracked at the Player roster level — they get added here
 * (with `isStarter: false`) when they're brought into the game.
 *
 * NO _id on entries: a (game, team, player) tuple is the natural key
 * and Mongoose's array semantics keep that stable across updates.
 */
const lineupEntrySchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    battingOrder: {
      type: Number,
      min: 1,
      max: 12,
    },
    position: {
      type: String,
      enum: [
        "P",  // pitcher
        "C",  // catcher
        "1B", "2B", "3B", "SS",
        "LF", "CF", "RF",
        "DH", // designated hitter (bats only)
        "EH", // extra hitter (some leagues)
      ],
    },
    /** Starters vs. bench/substitutes — starters always have battingOrder set. */
    isStarter: { type: Boolean, default: true },
  },
  { _id: false }
);

const gameSchema = new mongoose.Schema(
  {
    tournament: { type: String, required: true },
    // A tournament edition is uniquely identified by (year, division).
    // year e.g. 2026; division "1" or "2". Same tournament string can span
    // multiple editions across years (Taça Brasil Amador each year).
    year: { type: Number, index: true },
    division: { type: String, index: true },
    date: { type: Date },
    location: { type: String },
    field: { type: String },
    round: { type: Number },
    broadcastUrl: { type: String },

    // Which phase of the tournament. "group" = group stage; "gold" / "silver"
    // / "bronze" = the three elimination brackets after the group stage.
    bracket: {
      type: String,
      enum: ["group", "gold", "silver", "bronze"],
      default: "group",
      index: true,
    },
    // Optional label for slots inside a bracket: "semi", "final", "third".
    // Lets the frontend distinguish a final from a semi without inferring.
    bracketStage: {
      type: String,
      enum: ["semi", "final", "third"],
    },

    // Teams are optional so we can create placeholder Final / 3rd-place games
    // with TBD opponents and fill them in once the semis resolve.
    homeTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teams",
    },
    awayTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teams",
    },

    homeScore: { type: Number, default: 0 },
    awayScore: { type: Number, default: 0 },

    // Runs per inning, parallel arrays. Index 0 = inning 1, etc.
    // Length grows with the inning count; homeScore/awayScore stay as the
    // running totals for easy display.
    homeInnings: { type: [Number], default: [] },
    awayInnings: { type: [Number], default: [] },

    status: {
      type: String,
      enum: ["scheduled", "live", "finished"],
      default: "scheduled",
      index: true,
    },

    inning: { type: Number, default: 1 },
    inningHalf: { type: String, enum: ["top", "bottom"], default: "top" },
    outs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    strikes: { type: Number, default: 0 },

    bases: {
      first: { type: Boolean, default: false },
      second: { type: Boolean, default: false },
      third: { type: Boolean, default: false },
    },

    /**
     * Starting lineup + in-game roster for each side. Set ahead of the
     * first pitch via the frontend's lineup builder; mutated when subs
     * enter the game. Players are Mongoose refs — the /game routes
     * populate them as needed for display.
     */
    homeLineup: { type: [lineupEntrySchema], default: [] },
    awayLineup: { type: [lineupEntrySchema], default: [] },

    /**
     * Cursor into each side's starters array — points at "whose at-bat
     * is this." Advances by 1 (modulo starter count) after every
     * pa_result event for that side; reset to 0 on game_start.
     */
    homeCurrentBatterIdx: { type: Number, default: 0 },
    awayCurrentBatterIdx: { type: Number, default: 0 },

    /**
     * Current pitcher for each side. Initialised from the lineup's
     * `position: 'P'` slot at game_start; mutated by `substitution`
     * events when the pitcher is swapped mid-game. Held as a player
     * ref (not an index) because subs can bring in bench players who
     * weren't in the original batting order.
     */
    homeCurrentPitcherId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    awayCurrentPitcherId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  },
  { timestamps: true }
);

gameSchema.index({ tournament: 1, date: 1 });
gameSchema.index({ year: 1, division: 1, date: 1 });

module.exports = mongoose.model("Game", gameSchema);
