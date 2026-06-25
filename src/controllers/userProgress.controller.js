const UserProgress = require('../models/UserProgress');

exports.getDashboardStats = async (req, res) => {
  try {
    let progress = await UserProgress.findOne({ user: req.userId });
    if (!progress) {
      progress = await UserProgress.create({ user: req.userId });
    }
    
    res.json({
      success: true,
      stats: {
        totalStudyTimeMs: progress.totalStudyTimeMs,
        quizzesTaken: progress.quizzesTaken,
        accuracy: progress.accuracy,
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitQuizResult = async (req, res) => {
  try {
    const { correctAnswers = 0, totalQuestions = 0, timeSpentMs = 0 } = req.body;
    
    let progress = await UserProgress.findOne({ user: req.userId });
    if (!progress) {
      progress = new UserProgress({ user: req.userId });
    }

    // Update stats
    progress.quizzesTaken += 1;
    progress.totalCorrectAnswers += correctAnswers;
    progress.totalQuestionsAnswered += totalQuestions;
    progress.totalStudyTimeMs += timeSpentMs;

    // Streak logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (progress.lastActiveDate) {
      const lastActive = new Date(progress.lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(today - lastActive);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        progress.currentStreak += 1;
      } else if (diffDays > 1) {
        // missed a day
        progress.currentStreak = 1;
      }
      // If diffDays === 0, they already played today, streak remains the same
    } else {
      progress.currentStreak = 1;
    }
    
    if (progress.currentStreak > progress.longestStreak) {
      progress.longestStreak = progress.currentStreak;
    }
    progress.lastActiveDate = new Date();

    await progress.save();

    res.json({ 
      success: true, 
      message: 'Result saved successfully', 
      stats: {
        totalStudyTimeMs: progress.totalStudyTimeMs,
        quizzesTaken: progress.quizzesTaken,
        accuracy: progress.accuracy,
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
