import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

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

let authReadyResolve;
const authReady = new Promise((resolve) => {
  authReadyResolve = resolve;
});

signInAnonymously(auth)
  .then(() => {
    console.log("✅ Anonymous login started");
  })
  .catch((error) => {
    alert("AUTH ERROR: " + error.message);
  });

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ AUTH READY UID:", user.uid);
    authReadyResolve();
  }
});

export { db, auth, authReady };
