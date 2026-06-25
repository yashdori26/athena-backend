const Subject = require('../models/Subject');
const Quiz = require('../models/Quiz');
const FlashcardDeck = require('../models/FlashcardDeck');

// GET /api/subjects
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();
    const result = await Promise.all(subjects.map(async (s) => ({
      ...s.toObject(),
      quizCount: await Quiz.countDocuments({ subject: s._id }),
      deckCount: await FlashcardDeck.countDocuments({ subject: s._id }),
    })));
    res.json({ success: true, subjects: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
