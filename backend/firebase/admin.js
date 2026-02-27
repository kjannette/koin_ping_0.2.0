

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();


if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    // For local development, you can use application default credentials
    // or provide a service account key file
  });
}

export const auth = admin.auth();

export default admin;

