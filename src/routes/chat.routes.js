const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middleware/validate.middleware');

router.post('/send', authMiddleware, validate(schemas.chat.send), chatController.sendMessage);
router.post('/stream', authMiddleware, validate(schemas.chat.send), chatController.streamMessage);

module.exports = router;
