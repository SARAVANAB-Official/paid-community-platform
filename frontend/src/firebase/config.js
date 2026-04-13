// Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
