const mongoose = require("mongoose");

/**
 * Per-game append-only event log. Every scoring action a user takes on
 * the live-scoring screen lands here. The game's current state is a
 * projection over this log — replay all `undone: false` events for a
 * game in `seq` order and you arrive at the same `Game` document.
 *
 * Why an event log instead of just mutating the Game directly:
 *   - UNDO / REDO without losing history (flip `undone`, replay)
 *   - Per-batter PA history line ("1 for 2 · SINGLE, WALK, KS, WALK")
 *   - Audit / dispute resolution
 *   - A nightly recompute script can re-derive Player stats from
 *     events, so any inline-stat bug becomes self-healing
 *
 * Soft delete via `undone:true` (instead of hard delete) so REDO can
 * recover the row and so the audit trail is complete.
 */
const gameEventSchema = new mongoose.Schema(
  {
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },

    /**
     * Monotonic per-game sequence number. The (game, seq) pair is
     * unique. Used for ordering and as the cursor for undo/redo.
     */
    seq: { type: Number, required: true },

    type: {
      type: String,
      enum: [
        "game_start",
        "game_end",
        "pitch",          // ball / strike / foul — payload.pitchType
        "pa_result",      // plate appearance ended — payload.outcome
        "inning_change",  // half-inning flipped
        "baserunning",    // SB / CS / WP / PB (future)
        "substitution",   // sub in / out (future)
      ],
      required: true,
    },

    /**
     * Snapshot of game-clock context when this event was applied.
     * Lets read-only views ("game timeline") render without joining
     * back to the Game state.
     */
    inning: { type: Number },
    half: { type: String, enum: ["top", "bottom"] },
    outs: { type: Number },

    /**
     * Type-specific payload. Mixed for flexibility — each event type
     * has its own shape:
     *
     *   game_start / game_end:    { note? }
     *   pitch:                    { pitchType: 'ball' | 'strike' | 'foul' }
     *   pa_result:                { outcome, batter, pitcher,
     *                               runsScored?: number,
     *                               rbi?: number }
     *   inning_change:            { halfTo: 'top' | 'bottom',
     *                               runsThisHalf: number }
     *   substitution (future):    { playerIn, playerOut, position }
     *   baserunning (future):     { runner, from, to, kind }
     */
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },

    /**
     * Soft-delete for undo. `false` = visible (counts toward state);
     * `true` = hidden (state replays without it). Redo flips it back.
     */
    undone: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

gameEventSchema.index({ game: 1, seq: 1 }, { unique: true });

module.exports = mongoose.model("GameEvent", gameEventSchema);
