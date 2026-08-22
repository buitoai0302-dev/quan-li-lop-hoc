import { logger } from '../utils/logger';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseInitialized = false;

try {
  // Try to initialize with environment variables if provided
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized successfully.');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized using default credentials.');
  } else {
    console.warn('WARNING: Firebase credentials not found. Push notifications will be mocked.');
  }
} catch (error) {
  logger.error(error, 'Error initializing Firebase Admin SDK:');
}

export const isFirebaseInitialized = () => firebaseInitialized;
export const messaging = firebaseInitialized ? admin.messaging() : null;
