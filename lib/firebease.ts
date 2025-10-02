// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: "couries-tracking.firebasestorage.app",
  messagingSenderId: "128041289241",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: "G-95JVMWPJW0"
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

export const db = getFirestore();
