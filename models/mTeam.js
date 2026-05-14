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
  code: { type: String, required: true, unique: true },
  imageFile: { type: String },
  location: { type: String },
  link: { type: String },
  email: { type: String },
  division: { type: String },
  tournament: { type: String },
  coaches: { type: [coachSchema], default: [] },
});

module.exports = mongoose.model("Teams", teamSchema);
