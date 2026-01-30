require('dotenv').config();
const admin = require('firebase-admin');

let isInitialized = false;

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Validate that all required credentials are present
    if (!projectId || !privateKey || !clientEmail) {
      console.warn(
        '⚠️  Firebase Admin SDK credentials are missing. Push notifications will not work.',
      );
      console.warn(
        'Please set the following environment variables:',
        '\n  - FIREBASE_PROJECT_ID',
        '\n  - FIREBASE_PRIVATE_KEY',
        '\n  - FIREBASE_CLIENT_EMAIL',
        '\n\nGet these from Firebase Console > Project Settings > Service Accounts',
      );
    } else {
      const serviceAccount = {
        projectId: projectId,
        privateKey: privateKey,
        clientEmail: clientEmail,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      isInitialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
    console.error('Please check your Firebase credentials in the .env file');
  }
} else {
  isInitialized = true;
}

// Helper function to check if Firebase is initialized
const isFirebaseInitialized = () => {
  return isInitialized && admin.apps.length > 0;
};

module.exports = admin;
module.exports.isFirebaseInitialized = isFirebaseInitialized;
