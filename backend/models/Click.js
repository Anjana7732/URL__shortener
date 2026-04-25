const mongoose = require("mongoose");

const clickSchema = new mongoose.Schema({
    shortCode: String,
    timestamp: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Click", clickSchema);
