const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalStudyTimeMs: { type: Number, default: 0 },
  quizzesTaken: { type: Number, default: 0 },
  totalCorrectAnswers: { type: Number, default: 0 },
  totalQuestionsAnswered: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: { type: Date },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Helper to compute accuracy
userProgressSchema.virtual('accuracy').get(function() {
  if (this.totalQuestionsAnswered === 0) return 0;
  return (this.totalCorrectAnswers / this.totalQuestionsAnswered) * 100;
});

module.exports = mongoose.model('UserProgress', userProgressSchema);
