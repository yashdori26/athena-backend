const aiService = require('../services/ai.service');
const aiCache = require('../utils/cache');
const FlashcardDeck = require('../models/FlashcardDeck');
const Subject = require('../models/Subject');
const FlashcardReview = require('../models/FlashcardReview');
const Note = require('../models/Note');
const quotaService = require('../services/quota.service');
const MissedTopic = require('../models/MissedTopic');
const { z } = require('zod');

exports.generateFlashcards = async (req, res) => {
  try {
    const { subject = 'Other', topic, count = 10 } = req.body;

    if (!topic || topic.trim() === '') {
      return res.status(400).json({ success: false, message: 'Topic cannot be empty' });
    }
    
    if (topic.length > 500) {
      return res.status(400).json({ success: false, message: 'Topic is too long (maximum 500 characters)' });
    }

    // 0. Check TTLCache (Redis) first for extreme speed
    const cachedData = await aiCache.get('flashcard', topic);
    if (cachedData) {
      return res.json({
        success: true,
        source: 'memory_cache',
        topic,
        flashcards: cachedData,
      });
    }

    // 1. Check DB fallback
    let deck = await FlashcardDeck.findOne({ topic: new RegExp(`^${topic.replace(/[^a-zA-Z0-9 ]/g, '')}$`, 'i') });

    if (deck) {
      deck.usageCount += 1;
      await deck.save();
      return res.json({
        success: true,
        source: 'cache',
        topic,
        flashcards: deck.cards,
      });
    }

    try {
      await quotaService.checkAndConsumeQuota(req.userId);
    } catch (quotaError) {
      if (quotaError.message === 'QUOTA_EXCEEDED') {
        await MissedTopic.findOneAndUpdate(
          { topic: topic, type: 'flashcard' }, 
          { $inc: { requestedCount: 1 }, $setOnInsert: { status: 'pending' } }, 
          { upsert: true }
        );
        return res.status(429).json({ success: false, message: 'Daily generation quota exceeded. Topic has been queued for background generation tomorrow.' });
      }
      throw quotaError;
    }

    const prompt = `Generate ${count} educational flashcards for the topic "${topic}".
    Make the content concise and helpful for studying.`;

    const flashcardSchema = z.array(z.object({
      front: z.string().describe("The question, term, or concept to be learned."),
      back: z.string().describe("The answer, definition, or explanation.")
    })).describe("An array of educational flashcards.");

    try {
      const flashcards = await aiService.getStructuredCompletion(flashcardSchema, prompt);

      // Save to Redis cache for 24 hours
      await aiCache.set('flashcard', topic, flashcards);

      // 3. Save to DB
      let subjectDoc = await Subject.findOne({ name: subject });
      if (!subjectDoc) {
        subjectDoc = await Subject.create({ name: subject, category: 'Other' });
      }

      deck = await FlashcardDeck.create({
        subject: subjectDoc._id,
        topic,
        cards: flashcards,
        source: 'ai_generated',
        usageCount: 1,
      });

      res.json({
        success: true,
        source: 'generated',
        topic,
        flashcards: deck.cards,
      });
    } catch (parseError) {
      console.error('Flashcard Generation/Parse Error:', parseError.message);
      
      if (parseError.message === 'AI_RATE_LIMIT') {
        return res.status(503).json({ success: false, message: 'The AI provider is currently overwhelmed. Please try again in a few minutes.' });
      }
      
      if (parseError.message === 'AI_AUTH_ERROR') {
        return res.status(503).json({ success: false, message: 'The AI Engine is currently unavailable due to configuration issues. We are working on it!' });
      }

      res.status(500).json({
        success: false,
        message: 'AI failed to generate a valid format for flashcards after retries. Please try again.',
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.generateFlashcardsFromNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { count = 5 } = req.body;

    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    if (note.user.toString() !== req.userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // 1. Check if we already generated a deck for this note
    let deck = await FlashcardDeck.findOne({ note: noteId });
    if (deck) {
      deck.usageCount += 1;
      await deck.save();
      return res.json({
        success: true,
        source: 'cache',
        topic: deck.topic,
        flashcards: deck.cards,
      });
    }

    // 2. Check Quota
    try {
      await quotaService.checkAndConsumeQuota(req.userId);
    } catch (quotaError) {
      if (quotaError.message === 'QUOTA_EXCEEDED') {
        return res.status(429).json({ success: false, message: 'Daily generation quota exceeded. Please upgrade to Pro.' });
      }
      throw quotaError;
    }

    const prompt = `Generate ${count} educational flashcards based on the following note content:
    ---
    Title: ${note.title}
    Content: ${note.content}
    ---
    Return the response as a valid JSON array of objects.
    Each object must have exactly two fields: "front" (the question or term) and "back" (the answer or definition).
    Make the content concise and helpful for studying.
    Do not include any text before or after the JSON.`;

    const messages = [{ role: 'user', content: prompt }];
    const aiResponse = await aiService.getChatCompletion(messages);

    try {
      const flashcards = JSON.parse(aiResponse.trim());

      // 3. Save to DB
      let subjectDoc = await Subject.findOne({ name: 'Personal Notes' });
      if (!subjectDoc) {
        subjectDoc = await Subject.create({ name: 'Personal Notes', category: 'Other' });
      }

      deck = await FlashcardDeck.create({
        subject: subjectDoc._id,
        note: note._id,
        topic: note.title || 'Untitled Note',
        cards: flashcards,
        source: 'ai_generated',
        usageCount: 1,
      });

      res.json({
        success: true,
        source: 'generated',
        noteId,
        topic: deck.topic,
        flashcards: deck.cards,
      });
    } catch (parseError) {
      console.error('Flashcard JSON Parse Error:', aiResponse);
      res.status(500).json({
        success: false,
        message: 'AI generated an invalid format for flashcards. Please try again.',
        raw: aiResponse
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reviewFlashcard = async (req, res) => {
  try {
    // quality: 0-5 scale. 0 = complete blackout, 5 = perfect response
    const { deckId, cardIndex, quality } = req.body; 
    
    const deckExists = await FlashcardDeck.exists({ _id: deckId });
    if (!deckExists) {
      return res.status(404).json({ success: false, message: 'Flashcard deck not found' });
    }

    let review = await FlashcardReview.findOne({ user: req.userId, flashcardDeck: deckId, cardIndex });
    
    if (!review) {
      review = new FlashcardReview({ user: req.userId, flashcardDeck: deckId, cardIndex });
    }
    
    // SuperMemo-2 (SM-2) algorithm
    let { easeFactor, interval, repetitions } = review;
    
    if (quality >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }
    
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
    
    review.easeFactor = easeFactor;
    review.interval = interval;
    review.repetitions = repetitions;
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    review.nextReviewDate = nextReview;
    
    await review.save();
    
    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDueFlashcards = async (req, res) => {
  try {
    const today = new Date();
    
    // Find reviews due today or earlier
    const dueReviews = await FlashcardReview.find({ 
      user: req.userId,
      nextReviewDate: { $lte: today }
    }).populate('flashcardDeck');
    
    res.json({ success: true, dueReviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const ankiParser = require('../utils/ankiParser');

exports.importAnkiDeck = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const { subject, topic } = req.body;
    if (!topic) {
      return res.status(400).json({ success: false, message: 'Topic is required' });
    }

    const cards = await ankiParser.parseApkg(req.file.path);
    
    const fs = require('fs');
    fs.unlink(req.file.path, () => {});

    if (cards.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid cards found in Anki package' });
    }

    let subjectDoc = await Subject.findOne({ name: subject || 'Imported' });
    if (!subjectDoc) {
      subjectDoc = await Subject.create({ name: subject || 'Imported', category: 'Other' });
    }

    const deck = await FlashcardDeck.create({
      subject: subjectDoc._id,
      topic,
      cards,
      source: 'anki_import',
      author: req.userId,
      isPublic: false,
    });

    res.json({ success: true, deckId: deck._id, cardsImported: cards.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
