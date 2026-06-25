require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const aiService = require('../services/ai.service');
const Subject = require('../models/Subject');
const Quiz = require('../models/Quiz');
const FlashcardDeck = require('../models/FlashcardDeck');

const dictionaryPath = path.join(__dirname, '../../data/level2-dictionary.json');
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));

// Helper to delay execution (Rate Limiting)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// AI Hallucination & Integrity Catcher with Retry Logic
async function generateWithRetries(prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const messages = [{ role: 'user', content: prompt }];
      const response = await aiService.getChatCompletion(messages);
      
      // Clean up markdown blocks if AI accidentally included them
      let rawJson = response.trim();
      if (rawJson.startsWith('```json')) rawJson = rawJson.replace(/^```json\n/, '').replace(/\n```$/, '');
      else if (rawJson.startsWith('```')) rawJson = rawJson.replace(/^```\n/, '').replace(/\n```$/, '');
      
      const data = JSON.parse(rawJson);
      return data;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed. Retrying... (${error.message || 'Parse Error'})`);
      await sleep(3000); // Wait 3s before retry
      if (i === retries - 1) throw new Error('AI Hallucination or Rate Limit Exceeded');
    }
  }
}

async function runBulkGenerator() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_study_helper');
    console.log('Connected to MongoDB. Starting Bulk Generation...');

    for (const [subjectName, details] of Object.entries(dictionary)) {
      console.log(`\n--- Processing Subject: ${subjectName} ---`);
      
      let subjectDoc = await Subject.findOne({ name: subjectName });
      if (!subjectDoc) {
        subjectDoc = await Subject.create({ 
          name: subjectName, 
          category: details.category, 
          icon: details.icon 
        });
        console.log(`Created new subject: ${subjectName}`);
      }

      for (const topic of details.topics) {
        console.log(`\n  -> Topic: ${topic}`);
        
        // 1. Resume Capability: Check if Quiz exists
        const quizExists = await Quiz.findOne({ subject: subjectDoc._id, topic });
        if (!quizExists) {
          console.log(`     Generating Quiz...`);
          try {
            const prompt = `Generate a medium difficulty quiz on the topic "${topic}" with 5 multiple-choice questions. Return ONLY a valid JSON array of objects. Each object should have: "question" (string), "options" (array of 4 strings), "correctAnswer" (0-based integer index of correct option), and "explanation" (string). No markdown, no markdown blocks.`;
            const quizQuestions = await generateWithRetries(prompt);
            
            // Map strings to integers just in case AI hallucinated
            const mappedQuestions = quizQuestions.map(q => {
              let answerIndex = q.correctAnswer;
              if (typeof q.correctAnswer === 'string') {
                answerIndex = q.options.indexOf(q.correctAnswer);
                if (answerIndex === -1) answerIndex = 0;
              }
              return { ...q, correctAnswer: parseInt(answerIndex) || 0 };
            });

            await Quiz.create({
              subject: subjectDoc._id,
              topic,
              difficulty: 'medium',
              questions: mappedQuestions,
              source: 'ai_generated',
            });
            console.log(`     ✅ Saved Quiz`);
            await sleep(5000); // Smart Rate limiting delay
          } catch (e) {
            console.error(`     ❌ Failed to generate Quiz:`, e.message);
          }
        } else {
          console.log(`     ✅ Quiz already exists. Skipping.`);
        }

        // 2. Resume Capability: Check if Flashcards exist
        const flashcardsExist = await FlashcardDeck.findOne({ subject: subjectDoc._id, topic });
        if (!flashcardsExist) {
          console.log(`     Generating Flashcards...`);
          try {
            const prompt = `Generate 5 educational flashcards for the topic "${topic}". Return ONLY a valid JSON array of objects. Each object must have exactly two fields: "front" (string term) and "back" (string definition). No markdown, no markdown blocks.`;
            const flashcards = await generateWithRetries(prompt);
            
            await FlashcardDeck.create({
              subject: subjectDoc._id,
              topic,
              cards: flashcards,
              source: 'ai_generated',
            });
            console.log(`     ✅ Saved Flashcards`);
            await sleep(5000); // Smart Rate limiting delay
          } catch (e) {
            console.error(`     ❌ Failed to generate Flashcards:`, e.message);
          }
        } else {
          console.log(`     ✅ Flashcards already exist. Skipping.`);
        }
      }
    }

    console.log('\nDataset Level 2 Bulk Generation Complete!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal Error:', error);
    process.exit(1);
  }
}

runBulkGenerator();
