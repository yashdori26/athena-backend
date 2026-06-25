const mongoose = require('mongoose');

const flashcardDeckSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  note: { type: mongoose.Schema.Types.ObjectId, ref: 'Note' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  topic: { type: String, required: true, trim: true },
  isPublic: { type: Boolean, default: false },
  cards: [{
    front: String,
    back: String,
    imageUrl: String,
    difficulty: { type: Number, default: 0 }, // for spaced repetition later
  }],
  source: { type: String, enum: ['ai_generated', 'seeded', 'anki_import', 'user_created', 'forked'], default: 'ai_generated' },
  originalDeck: { type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardDeck' },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

flashcardDeckSchema.index({ author: 1 });
flashcardDeckSchema.index({ isPublic: 1 });

module.exports = mongoose.model('FlashcardDeck', flashcardDeckSchema);
