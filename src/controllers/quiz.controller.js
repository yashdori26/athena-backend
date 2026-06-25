const aiService = require('../services/ai.service');
const aiCache = require('../utils/cache');
const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');
const Stat = require('../models/Stat');
const quotaService = require('../services/quota.service');
const MissedTopic = require('../models/MissedTopic');
const { z } = require('zod');

exports.generateQuiz = async (req, res) => {
  try {
    const { subject = 'Other', topic, difficulty = 'medium', numberOfQuestions = 5 } = req.body;

    if (!topic || topic.trim() === '') {
      return res.status(400).json({ success: false, message: 'Topic cannot be empty' });
    }
    
    if (topic.length > 500) {
      return res.status(400).json({ success: false, message: 'Topic is too long (maximum 500 characters)' });
    }

    // 0. Check TTLCache (Redis) first for extreme speed
    const cachedData = await aiCache.get('quiz', topic);
    if (cachedData) {
      return res.json({
        success: true,
        source: 'memory_cache',
        topic,
        questions: cachedData,
      });
    }

    // 1. Check DB first
    let quiz = await Quiz.findOne({ topic: new RegExp(`^${topic.replace(/[^a-zA-Z0-9 ]/g, '')}$`, 'i'), difficulty });

    if (quiz) {
      quiz.usageCount += 1;
      await quiz.save();
      await Stat.findOneAndUpdate({ type: 'global_stats' }, { $inc: { totalCacheHits: 1 } }, { upsert: true });
      
      // Update Redis cache
      await aiCache.set('quiz', topic, quiz.questions);

      return res.json({
        success: true,
        source: 'cache',
        topic,
        questions: quiz.questions,
      });
    }

    // 2. Generate if missing
    try {
      await quotaService.checkAndConsumeQuota(req.userId);
    } catch (quotaError) {
      if (quotaError.message === 'QUOTA_EXCEEDED') {
        await MissedTopic.findOneAndUpdate(
          { topic: topic, type: 'quiz' }, 
          { $inc: { requestedCount: 1 }, $setOnInsert: { status: 'pending' } }, 
          { upsert: true }
        );
        return res.status(429).json({ success: false, message: 'Daily generation quota exceeded. Topic has been queued for background generation tomorrow.' });
      }
      throw quotaError;
    }

    const prompt = `Generate a ${difficulty} difficulty quiz on the topic "${topic}" with ${numberOfQuestions} multiple-choice questions.`;

    const quizSchema = z.array(z.object({
      question: z.string().describe("The quiz question text."),
      options: z.array(z.string()).length(4).describe("An array of exactly 4 possible answer choices."),
      correctAnswer: z.number().int().min(0).max(3).describe("The 0-based integer index of the correct answer in the options array."),
      explanation: z.string().describe("A brief explanation of why the correct answer is right.")
    })).describe("An array of quiz questions.");

    try {
      const quizQuestions = await aiService.getStructuredCompletion(quizSchema, prompt);

      // Save to Redis cache for 24 hours
      await aiCache.set('quiz', topic, quizQuestions);

      // 3. Save to DB
      let subjectDoc = await Subject.findOne({ name: subject });
      if (!subjectDoc) {
        subjectDoc = await Subject.create({ name: subject, category: 'Other' });
      }

      quiz = await Quiz.create({
        subject: subjectDoc._id,
        topic,
        difficulty,
        questions: quizQuestions,
        source: 'ai_generated',
        usageCount: 1,
      });

      await Stat.findOneAndUpdate({ type: 'global_stats' }, { $inc: { totalQuizzesGenerated: 1 } }, { upsert: true });

      res.json({
        success: true,
        source: 'generated',
        topic,
        questions: quiz.questions,
      });
    } catch (parseError) {
      console.error('Quiz Generation/Parse Error:', parseError.message);
      
      if (parseError.message === 'AI_RATE_LIMIT') {
        return res.status(503).json({ success: false, message: 'The AI provider is currently overwhelmed. Please try again in a few minutes.' });
      }
      
      if (parseError.message === 'AI_AUTH_ERROR') {
        return res.status(503).json({ success: false, message: 'The AI Engine is currently unavailable due to configuration issues. We are working on it!' });
      }

      res.status(500).json({
        success: false,
        message: 'AI failed to generate a valid quiz format after retries. Please try again.',
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/quiz/popular
exports.getPopularQuizzes = async (req, res) => {
  try {
    const popularQuizzes = await Quiz.find().sort({ usageCount: -1 }).limit(10).populate('subject');
    res.json({ success: true, quizzes: popularQuizzes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
