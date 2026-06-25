const User = require('../models/User');

exports.syncFirebaseUser = async (req, res) => {
  try {
    const firebaseUser = req.firebaseUser;
    let user = req.user;

    // If user doesn't exist in MongoDB yet, create them!
    if (!user) {
      // The frontend can pass a name during the initial sync if they want
      const { name } = req.body;
      
      user = await User.create({
        name: name || firebaseUser.name || firebaseUser.email.split('@')[0],
        email: firebaseUser.email,
        firebaseUid: firebaseUser.uid,
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        tier: user.tier
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'FCM Token is required' });
    }

    req.user.fcmToken = fcmToken;
    await req.user.save();

    res.status(200).json({ success: true, message: 'FCM Token updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
