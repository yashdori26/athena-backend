const express = require('express');
const router = express.Router();
const { generateQuiz } = require('../controllers/quiz.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const { validate, schemas } = require('../middleware/validate.middleware');

router.get('/popular', authMiddleware, require('../controllers/quiz.controller').getPopularQuizzes);
router.post('/generate', authMiddleware, validate(schemas.quiz.generate), generateQuiz);
module.exports = router;
