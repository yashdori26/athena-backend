const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');

// Initialize Firebase Admin with credentials from environment variables
// This prevents hardcoding the sensitive Service Account JSON in the repo.
const initializeFirebase = () => {
  try {
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.warn('⚠️ FIREBASE_PROJECT_ID not found in .env. Firebase Admin will not initialize correctly.');
      return;
    }

    // Handle multiline private key from .env
    const privateKey = process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    
    console.log('🔥 Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
  }
};

module.exports = { admin, initializeFirebase };
