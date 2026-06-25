const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  category: { type: String, enum: ['Science', 'Math', 'History', 'Language', 'Other'] },
  icon: { type: String, default: '📚' },
  description: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Subject', subjectSchema);
