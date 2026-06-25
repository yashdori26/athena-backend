const cron = require('node-cron');
const FlashcardReview = require('../models/FlashcardReview');
const User = require('../models/User');
const { sendPushNotification } = require('../services/notification.service');

const runDailyStudyReminders = async () => {
  try {
    console.log('🔔 Running Daily SRS Notification Cron Job...');
    
    // Find all reviews due today or earlier
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dueReviews = await FlashcardReview.aggregate([
      { $match: { nextReviewDate: { $lte: today } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);

    for (const review of dueReviews) {
      const userId = review._id;
      const count = review.count;

      if (count > 0) {
        const user = await User.findById(userId);
        
        if (user && user.fcmToken) {
          await sendPushNotification(
            user.fcmToken,
            'Study Time! 🧠',
            `You have ${count} flashcards due for review today. Keep your streak alive!`,
            { action: 'open_flashcards' }
          );
        }
      }
    }

    console.log('✅ Daily SRS Notification Cron Job Completed.');
  } catch (error) {
    console.error('❌ Error in notification cron job:', error);
  }
};

// Run every day at 9:00 AM
const startNotificationCron = () => {
  cron.schedule('0 9 * * *', runDailyStudyReminders);
  console.log('⏰ Daily Study Reminder cron job scheduled for 9:00 AM');
};

module.exports = { startNotificationCron, runDailyStudyReminders };
