const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Subject = require('../models/Subject');
const Quiz = require('../models/Quiz');
const FlashcardDeck = require('../models/FlashcardDeck');

const importData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aistudyhelper';
    await mongoose.connect(mongoUri);

    const quizSeed = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/seed-quizzes.json'), 'utf-8'));
    const flashcardSeed = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/seed-flashcards.json'), 'utf-8'));

    for (const item of quizSeed) {
      let subject = await Subject.findOne({ name: item.subjectName });
      if (!subject) {
        subject = await Subject.create({
          name: item.subjectName,
          category: item.subjectCategory,
          icon: item.subjectIcon,
        });
      }
      await Quiz.create({
        subject: subject._id,
        topic: item.topic,
        difficulty: item.difficulty,
        questions: item.questions,
        source: 'seeded',
      });
    }

    for (const item of flashcardSeed) {
      let subject = await Subject.findOne({ name: item.subjectName });
      if (!subject) {
        subject = await Subject.create({
          name: item.subjectName,
          category: item.subjectCategory,
          icon: item.subjectIcon,
        });
      }
      await FlashcardDeck.create({
        subject: subject._id,
        topic: item.topic,
        cards: item.cards,
        source: 'seeded',
      });
    }

    console.log('✅ Data Imported Successfully!');
    process.exit();
  } catch (err) {
    console.error('❌ Seeding Error:', err);
    process.exit(1);
  }
};

const deleteData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aistudyhelper';
    await mongoose.connect(mongoUri);
    await Quiz.deleteMany({ source: 'seeded' });
    await FlashcardDeck.deleteMany({ source: 'seeded' });
    await Subject.deleteMany({});
    console.log('🗑️ Seeded Data Destroyed!');
    process.exit();
  } catch (err) {
    console.error('❌ Deletion Error:', err);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  deleteData();
} else {
  importData();
}
