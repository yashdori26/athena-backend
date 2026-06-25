const Quiz = require('../models/Quiz');
const FlashcardDeck = require('../models/FlashcardDeck');

const getModel = (type) => type === 'quiz' ? Quiz : FlashcardDeck;

exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, isPublic } = req.body;
    const Model = getModel(type);

    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    
    if (doc.author && doc.author.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to publish this item' });
    }

    doc.isPublic = isPublic;
    if (!doc.author && isPublic) {
        doc.author = req.userId;
    }
    await doc.save();
    
    res.json({ success: true, isPublic: doc.isPublic });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.vote = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, voteType } = req.body; 
    const Model = getModel(type);

    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    doc.upvotes = doc.upvotes.filter(uid => uid.toString() !== req.userId);
    doc.downvotes = doc.downvotes.filter(uid => uid.toString() !== req.userId);

    if (voteType === 'up') doc.upvotes.push(req.userId);
    if (voteType === 'down') doc.downvotes.push(req.userId);

    await doc.save();
    res.json({ success: true, upvotes: doc.upvotes.length, downvotes: doc.downvotes.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.fork = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const Model = getModel(type);

    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (type === 'quiz') {
      const newQuiz = await Quiz.create({
        subject: doc.subject,
        topic: doc.topic + ' (Forked)',
        difficulty: doc.difficulty,
        questions: doc.questions,
        source: 'forked',
        originalQuiz: doc._id,
        author: req.userId,
        isPublic: false
      });
      return res.json({ success: true, forkedId: newQuiz._id });
    } else {
      const newDeck = await FlashcardDeck.create({
        subject: doc.subject,
        topic: doc.topic + ' (Forked)',
        cards: doc.cards,
        source: 'forked',
        originalDeck: doc._id,
        author: req.userId,
        isPublic: false
      });
      return res.json({ success: true, forkedId: newDeck._id });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCommunityContent = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isPublic: true }).sort({ 'upvotes.length': -1 }).limit(10).populate('author', 'name');
    const decks = await FlashcardDeck.find({ isPublic: true }).sort({ 'upvotes.length': -1 }).limit(10).populate('author', 'name');
    
    res.json({ success: true, quizzes, decks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
