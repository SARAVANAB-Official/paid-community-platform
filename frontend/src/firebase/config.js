// Firebase configuration — lazy initialization (never blocks rendering)
let app = null;
let db = null;
let initialized = false;
let initError = null;

async function ensureFirebase() {
  if (initialized) return db;
  if (initError) throw initError;

  try {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA-4cTJN8zpfefmmgulE_XavMZ9jsd0b_w",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jtsb-natural-live.firebaseapp.com",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jtsb-natural-live",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "jtsb-natural-live.firebasestorage.app",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "103883989218",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:103883989218:web:5bad1f05fe48e686337ebb"
    };

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    initialized = true;
    console.log('✅ Firebase initialized');
    return db;
  } catch (e) {
    initError = e;
    console.error('❌ Firebase init failed:', e);
    throw e;
  }
}

// For db/index.js — wraps any Firestore call to ensure Firebase is ready first
async function getDb() {
  return await ensureFirebase();
}

export { db, getDb, ensureFirebase };
export default null; // No default export — use getDb() instead
