import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCougX7K9kgc_NzNUIigsucgz0UcBWra5U",
  authDomain: "mapa-dialogos-upgdl.firebaseapp.com",
  projectId: "mapa-dialogos-upgdl",
  databaseURL: "https://mapa-dialogos-upgdl-default-rtdb.firebaseio.com/",
  storageBucket: "mapa-dialogos-upgdl.firebasestorage.app",
  messagingSenderId: "769178101528",
  appId: "1:769178101528:web:729c10bec6eef69ee0e06d",
  measurementId: "G-GS230ZR9QP"
};

export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);