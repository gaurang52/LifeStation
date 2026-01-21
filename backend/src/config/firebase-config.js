require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

module.exports = admin;
