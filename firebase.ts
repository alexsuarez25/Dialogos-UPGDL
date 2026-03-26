import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD1Poz3cAd2Rto2pFJ8T0-eyEwEbKkz55s",
  authDomain: "dialogos-up.firebaseapp.com",
  projectId: "dialogos-up",
  databaseURL: "https://dialogos-up-default-rtdb.firebaseio.com/",
  storageBucket: "dialogos-up.firebasestorage.app",
  messagingSenderId: "923033799018",
  appId: "1:923033799018:web:379b3d246543e72f9e7d13",
  measurementId: "G-4881ZKL4VJ"
};

export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);