import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAdgrmvmgorjv3K6TlpsOt1DjtR06vQUkQ",
  authDomain: "speedsanta1.firebaseapp.com",
  projectId: "speedsanta1",
  storageBucket: "speedsanta1.firebasestorage.app",
  messagingSenderId: "1044399218115",
  appId: "1:1044399218115:web:d27f31e399914b1c147176",
  measurementId: "G-F5JD8JDLQ6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); 