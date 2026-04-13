// Firebase configuration — eager init (background, never blocks rendering)
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA-4cTJN8zpfefmmgulE_XavMZ9jsd0b_w",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jtsb-natural-live.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jtsb-natural-live",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "jtsb-natural-live.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "103883989218",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:103883989218:web:5bad1f05fe48e686337ebb"
};

// Initialize Firebase app immediately (does not block rendering)
const app = initializeApp(firebaseConfig);

// Initialize Firestore immediately
let db;
try {
  db = getFirestore(app);
} catch (e) {
  console.error('Firestore init failed:', e);
  db = null;
}

function getDb() {
  if (!db) {
    throw new Error('Firestore not available. Check Firebase Console → Firestore Database → Enable it.');
  }
  return db;
}

export { app, db, getDb };
export default app;
