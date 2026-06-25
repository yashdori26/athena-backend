const { getAuth } = require('firebase-admin/auth');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Verify the Firebase ID Token
      const decodedToken = await getAuth().verifyIdToken(token);

      // Find user in MongoDB by their Firebase UID or Email
      let user = await User.findOne({ firebaseUid: decodedToken.uid });
      
      // Fallback for legacy users migrating to Firebase
      if (!user && decodedToken.email) {
         user = await User.findOne({ email: decodedToken.email });
         if (user) {
            user.firebaseUid = decodedToken.uid;
            await user.save();
         }
      }

      // Attach what we found
      req.firebaseUser = decodedToken;
      if (user) {
        req.userId = user._id;
        req.user = user;
      }

      next();
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};
