const express = require('express');
const router = express.Router();
const { syncFirebaseUser, updateFcmToken } = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All auth routes now go through the middleware to verify the Firebase token
router.post('/sync', authMiddleware, syncFirebaseUser);
router.post('/fcm-token', authMiddleware, updateFcmToken);

module.exports = router;
