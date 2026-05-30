const mongoose = require("mongoose");

const coachSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, enum: ["head", "assistant"], required: true },
    phone: { type: String },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Code is unique *within* a tournament edition (year, division). A real-life
  // club returning next year or appearing in both divisions gets a separate
  // Team document with the same code — that's fine and intentional.
  code: { type: String, required: true },
  imageFile: { type: String },
  location: { type: String },
  link: { type: String },
  email: { type: String },
  // A team registration belongs to a tournament edition uniquely
  // identified by (year, division). year e.g. 2026; division "1" or "2".
  // A real-life club playing in both editions or returning next season is
  // a new Team document — keeps stats and rosters cleanly scoped.
  year: { type: Number, index: true },
  division: { type: String },
  tournament: { type: String },
  group: { type: String, index: true },
  slot: { type: String, index: true },
  coaches: { type: [coachSchema], default: [] },
});

teamSchema.index({ year: 1, division: 1 });
teamSchema.index({ year: 1, division: 1, code: 1 }, { unique: true, partialFilterExpression: { year: { $exists: true }, division: { $exists: true } } });

module.exports = mongoose.model("Teams", teamSchema);
