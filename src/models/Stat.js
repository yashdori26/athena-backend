const mongoose = require('mongoose');

const statSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true },
  totalQuizzesGenerated: { type: Number, default: 0 },
  totalCacheHits: { type: Number, default: 0 },
});

module.exports = mongoose.model('Stat', statSchema);
