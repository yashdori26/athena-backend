const express = require('express');
const router = express.Router();
const { getNotes, createNote, updateNote, deleteNote } = require('../controllers/notes.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validateObjectId = require('../middlewares/validateObjectId.middleware');

router.use(authMiddleware);

router.get('/', getNotes);
router.post('/', createNote);
router.put('/:id', validateObjectId, updateNote);
router.delete('/:id', validateObjectId, deleteNote);

module.exports = router;
