const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin with credentials from environment variables
// This prevents hardcoding the service account key in the repository
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Replace escaped \n with actual newlines for private key parsing
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

// Check if variables exist before initializing to prevent crashes during initial setup
if (process.env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin SDK Initialized');
} else {
  console.warn('Firebase Admin SDK missing credentials in .env file');
}

const db = admin.firestore?.();

module.exports = { admin, db };
