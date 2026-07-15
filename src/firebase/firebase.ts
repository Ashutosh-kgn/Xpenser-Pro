import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCkhNp3d2HUDzo9Q5gTipdXWtt8q2bos-k",
  authDomain: "expenseflow-pro.firebaseapp.com",
  projectId: "expenseflow-pro",
  storageBucket: "expenseflow-pro.firebasestorage.app",
  messagingSenderId: "541348229850",
  appId: "1:541348229850:web:19285825792c85c8ddabe3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export default app;
