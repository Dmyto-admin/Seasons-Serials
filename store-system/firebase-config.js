import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAs2sXfHY3IRrss_TLiVBLmuKF7daWFFGA",
  authDomain: "seasons-serials-store.firebaseapp.com",
  projectId: "seasons-serials-store",
  storageBucket: "seasons-serials-store.firebasestorage.app",
  messagingSenderId: "736067092437",
  appId: "1:736067092437:web:c40354adb2b8cc070cc75c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const authReady = signInAnonymously(auth);

export { db, auth, authReady };
