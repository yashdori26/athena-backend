const express = require('express');
const router = express.Router();
const communityController = require('../controllers/community.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validateObjectId = require('../middlewares/validateObjectId.middleware');

router.get('/explore', communityController.getCommunityContent);

router.use(authMiddleware);

router.post('/publish/:id', validateObjectId, communityController.togglePublish);
router.post('/vote/:id', validateObjectId, communityController.vote);
router.post('/fork/:id', validateObjectId, communityController.fork);

module.exports = router;
