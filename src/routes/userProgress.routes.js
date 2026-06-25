const express = require('express');
const router = express.Router();
const userProgressController = require('../controllers/userProgress.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/dashboard', authMiddleware, userProgressController.getDashboardStats);
router.post('/quiz-result', authMiddleware, userProgressController.submitQuizResult);

module.exports = router;
