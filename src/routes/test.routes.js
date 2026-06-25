const express = require('express');
const router = express.Router();
const { runDailyStudyReminders } = require('../cron/notification.cron');

// For development/testing only: Trigger the cron job manually
router.get('/trigger-cron', async (req, res) => {
  try {
    await runDailyStudyReminders();
    res.json({ success: true, message: 'Cron job triggered manually' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
