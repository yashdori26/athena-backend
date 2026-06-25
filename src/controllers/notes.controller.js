const Note = require('../models/Note');

exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    const note = await Note.create({
      user: req.userId,
      title,
      content,
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    let note = await Note.findById(req.params.id);

    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.user.toString() !== req.userId) return res.status(401).json({ error: 'Not authorized' });

    note = await Note.findByIdAndUpdate(req.params.id, { title, content }, { new: true, runValidators: true });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.user.toString() !== req.userId) return res.status(401).json({ error: 'Not authorized' });

    await note.deleteOne();
    res.json({ message: 'Note removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
