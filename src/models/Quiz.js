const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  topic: { type: String, required: true, trim: true },
  isPublic: { type: Boolean, default: false },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number, // index of correct option
    explanation: String,
  }],
  source: { type: String, enum: ['ai_generated', 'seeded', 'opentdb', 'user_created', 'forked'], default: 'ai_generated' },
  originalQuiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

quizSchema.index({ author: 1 });
quizSchema.index({ isPublic: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
