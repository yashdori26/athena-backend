const mongoose = require('mongoose');

const validateObjectId = (req, res, next) => {
  for (const key in req.params) {
    if (key.toLowerCase().endsWith('id')) {
      if (!mongoose.Types.ObjectId.isValid(req.params[key])) {
        return res.status(400).json({ success: false, message: `Invalid ${key} format` });
      }
    }
  }
  next();
};

module.exports = validateObjectId;
