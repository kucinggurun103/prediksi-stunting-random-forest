import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDTr3TYQ8DmaFipr6cunTv4aaLL6Lzf6cE",
  authDomain: "skripsi-stunting-jabar.firebaseapp.com",
  projectId: "skripsi-stunting-jabar",
  storageBucket: "skripsi-stunting-jabar.firebasestorage.app",
  messagingSenderId: "706571302534",
  appId: "1:706571302534:web:e7fc2719cdb5517cc34307",
  measurementId: "G-H5PJY7XRFZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);