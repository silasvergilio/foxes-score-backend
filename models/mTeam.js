const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    imageFile: { type: String, required: true, unique: true },
    location: { type: String, required: true, unique: true },

});

module.exports = mongoose.model("Teams", teamSchema);