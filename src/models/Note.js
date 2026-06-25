const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

NoteSchema.index({ user: 1 });

module.exports = mongoose.model('Note', NoteSchema);
