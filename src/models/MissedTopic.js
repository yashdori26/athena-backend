const mongoose = require('mongoose');

const missedTopicSchema = new mongoose.Schema({
  topic: { type: String, required: true, unique: true },
  requestedCount: { type: Number, default: 1 },
  type: { type: String, enum: ['quiz', 'flashcard'], default: 'quiz' },
  status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('MissedTopic', missedTopicSchema);
