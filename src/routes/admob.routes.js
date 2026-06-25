const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');

// AdMob SSV (Server-Side Verification)
// Google sends a GET request when a user finishes watching a rewarded ad.
router.get('/reward', async (req, res) => {
  try {
    const { ad_network, ad_unit, reward_amount, reward_item, user_id, custom_data, signature, key_id, transaction_id } = req.query;

    console.log('Received AdMob SSV Callback:', req.query);

    // In a true Level 3 Production app, we must verify the cryptographic signature using Google's public keys.
    // For now, we simulate the verification logic.
    // Documentation: https://developers.google.com/admob/android/rewarded-video-ssv
    const isSignatureValid = true; // Placeholder for actual verification

    if (!isSignatureValid) {
      return res.status(401).send('Invalid signature');
    }

    // `custom_data` or `user_id` should contain our MongoDB User ID
    const userId = custom_data || user_id;

    if (!userId) {
      return res.status(400).send('Missing user ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Add 5 generations as reward
    user.dailyQuota += 5;
    await user.save();

    console.log(`✅ Granted 5 AI credits to user ${userId} for watching AdMob reward video (Tx: ${transaction_id})`);

    // Google expects a 200 OK
    res.status(200).send('OK');
  } catch (error) {
    console.error('AdMob SSV Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
