const { getMessaging } = require('firebase-admin/messaging');

exports.sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) {
    console.log('Skipping push notification: User has no FCM token');
    return;
  }

  const message = {
    notification: {
      title,
      body,
    },
    data,
    token: fcmToken,
  };

  try {
    const response = await getMessaging().send(message);
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending message:', error);
    
    // If token is unregistered, we should ideally clear it from DB
    // We leave that cleanup logic for later if needed.
  }
};
