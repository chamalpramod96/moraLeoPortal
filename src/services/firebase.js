import { initializeApp } from 'firebase/app';
import { getAuth }        from 'firebase/auth';
import { getFirestore }   from 'firebase/firestore';
import { getStorage }     from 'firebase/storage';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SETUP INSTRUCTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Copy .env.example → .env
 * 2. Fill in your Firebase project credentials from:
 *    Firebase Console → Project Settings → Your apps → Web app → SDK snippet
 * 3. Never commit your .env file (it's already in .gitignore)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
