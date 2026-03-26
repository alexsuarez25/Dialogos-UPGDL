import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_DATABASE_URL",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

function readFirebaseConfig(): FirebaseOptions {
  const env = import.meta.env;
  const missing = requiredKeys.filter((k) => !env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `[firebase] Missing env: ${missing.join(", ")}. ` +
        `Use .env.development (dev) or .env.production (build). See .env.example.`
    );
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
  };
}

const firebaseConfig = readFirebaseConfig();

export const app = initializeApp(firebaseConfig);

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim();
if (measurementId) {
  void isSupported().then((yes) => {
    if (yes) getAnalytics(app);
  });
}
