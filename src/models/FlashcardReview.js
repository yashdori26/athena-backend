const mongoose = require('mongoose');

const flashcardReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flashcardDeck: { type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardDeck', required: true },
  cardIndex: { type: Number, required: true },
  easeFactor: { type: Number, default: 2.5 }, // SM-2 Ease Factor
  interval: { type: Number, default: 0 }, // days until next review
  repetitions: { type: Number, default: 0 }, // consecutive correct repetitions
  nextReviewDate: { type: Date, default: Date.now },
});

flashcardReviewSchema.index({ user: 1, flashcardDeck: 1, cardIndex: 1 }, { unique: true });

module.exports = mongoose.model('FlashcardReview', flashcardReviewSchema);
