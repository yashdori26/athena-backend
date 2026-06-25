const cron = require('node-cron');
const MissedTopic = require('../models/MissedTopic');
const aiService = require('../services/ai.service');
const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');

const startCronJobs = () => {
  // Run every night at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running nightly background generator...');
    try {
      const topics = await MissedTopic.find({ status: 'pending', type: 'quiz' }).sort({ requestedCount: -1 }).limit(5);
      
      for (const t of topics) {
        try {
          const prompt = `Generate a medium difficulty quiz on the topic "${t.topic}" with 5 multiple-choice questions. Return the response as a valid JSON array of objects. Each object should have: "question", "options" (an array of 4 strings), "correctAnswer" (the 0-based integer index of the correct option in the options array), and "explanation". Do not include any text before or after the JSON.`;
          const aiResponse = await aiService.generateResponse([{ role: 'user', content: prompt }]);
          
          const quizQuestions = JSON.parse(aiResponse.trim());
          
          // Map to handle string answers just in case
          const mappedQuestions = quizQuestions.map(q => {
            let answerIndex = q.correctAnswer;
            if (typeof q.correctAnswer === 'string') {
              answerIndex = q.options.indexOf(q.correctAnswer);
              if (answerIndex === -1) answerIndex = 0;
            }
            return {
              question: q.question,
              options: q.options,
              correctAnswer: answerIndex,
              explanation: q.explanation || ''
            };
          });

          let subjectDoc = await Subject.findOne({ name: 'Other' });
          if (!subjectDoc) {
            subjectDoc = await Subject.create({ name: 'Other', category: 'Other' });
          }
          
          await Quiz.create({
            subject: subjectDoc._id,
            topic: t.topic,
            difficulty: 'medium',
            questions: mappedQuestions,
            source: 'ai_generated',
          });
          
          t.status = 'processed';
          await t.save();
          console.log(`Processed missed topic: ${t.topic}`);
        } catch (err) {
          console.error(`Failed to process topic ${t.topic}:`, err.message);
          t.status = 'failed';
          await t.save();
        }
      }
    } catch (dbError) {
      console.error('Cron Job DB Error:', dbError);
    }
  });
  console.log('Cron jobs initialized');
};

module.exports = startCronJobs;
