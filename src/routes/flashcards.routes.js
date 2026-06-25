const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { generateFlashcards, generateFlashcardsFromNote, reviewFlashcard, getDueFlashcards, importAnkiDeck } = require('../controllers/flashcards.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

const { validate, schemas } = require('../middleware/validate.middleware');
const validateObjectId = require('../middlewares/validateObjectId.middleware');

router.post('/generate', validate(schemas.flashcards.generate), generateFlashcards);
router.post('/generate-from-note/:noteId', validateObjectId, generateFlashcardsFromNote);
router.post('/review', reviewFlashcard);
router.get('/due', getDueFlashcards);
router.post('/import-anki', upload.single('ankiFile'), importAnkiDeck);

module.exports = router;
