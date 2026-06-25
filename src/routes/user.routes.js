const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');

router.use(auth);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;
