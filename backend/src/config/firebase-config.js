require('dotenv').config();
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

let isInitialized = false;

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    let credential = null;

    // Option B: Load from JSON file (preferred)
    if (serviceAccountPath) {
      const resolvedPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath);
      if (fs.existsSync(resolvedPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        credential = admin.credential.cert(serviceAccount);
      } else {
        console.warn(
          `⚠️  Firebase service account file not found: ${resolvedPath}. Push notifications will not work.`,
        );
      }
    }

    // Fallback: Use env vars (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
    if (!credential) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (projectId && privateKey && clientEmail) {
        credential = admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        });
      }
    }

    if (credential) {
      admin.initializeApp({ credential });
      isInitialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      console.warn(
        '⚠️  Firebase Admin SDK credentials are missing. Push notifications will not work.',
      );
      console.warn(
        'Set either FIREBASE_SERVICE_ACCOUNT_PATH (path to service account JSON) or',
        '\n  FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL',
        '\n\nGet these from Firebase Console > Project Settings > Service Accounts',
      );
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
    console.error(
      'Please check FIREBASE_SERVICE_ACCOUNT_PATH or Firebase credentials in the .env file',
    );
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
