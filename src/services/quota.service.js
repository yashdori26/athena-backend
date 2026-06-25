const User = require('../models/User');

const QUOTA_LIMITS = {
  free: 5,
  pro: -1 // unlimited
};

exports.checkAndConsumeQuota = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // reset if a new day
  if (!user.lastGenerationDate || user.lastGenerationDate < today) {
    user.apiGenerationsToday = 0;
    user.lastGenerationDate = new Date();
  }
  
  const limit = QUOTA_LIMITS[user.tier || 'free'];
  
  if (limit !== -1 && user.apiGenerationsToday >= limit) {
    throw new Error('QUOTA_EXCEEDED');
  }
  
  // Consume
  user.apiGenerationsToday += 1;
  await user.save();
  return true;
};
