
// Optimized Firebase Configuration
// Only imports what's actually needed to reduce bundle size

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services with lazy loading
let auth: ReturnType<typeof getAuth> | null = null;
let firestore: ReturnType<typeof getFirestore> | null = null;
let functions: ReturnType<typeof getFunctions> | null = null;

export const getAuthInstance = () => {
  if (!auth) {
    auth = getAuth(app);
    
    // Connect to emulator in development
    if (import.meta.env.DEV && !auth.app) {
      connectAuthEmulator(auth, 'http://localhost:9099');
    }
  }
  return auth;
};

export const getFirestoreInstance = () => {
  if (!firestore) {
    firestore = getFirestore(app);
    
    // Connect to emulator in development
    if (import.meta.env.DEV && !firestore.app) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    }
  }
  return firestore;
};

export const getFunctionsInstance = () => {
  if (!functions) {
    functions = getFunctions(app);
    
    // Connect to emulator in development
    if (import.meta.env.DEV) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
  }
  return functions;
};

export { app };
export default app;
