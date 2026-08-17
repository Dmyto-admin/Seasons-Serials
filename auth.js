import { auth, db } from "./store-system/firebase-config.js";

import {
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

/* ---------- USER DATA ---------- */

let currentUserData = null;
let authReady = false;
let authReadyResolve;

const authReadyPromise = new Promise(resolve => {
    authReadyResolve = resolve;
});

/* ---------- GET USER DATA ---------- */

async function getUserData(user) {

    if (!user) {
        return null;
    }

    try {

        const email = user.email?.toLowerCase();

        if (!email) {
            return null;
        }

        const userRef = doc(db, "users", email);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.error(
                "User document not found:",
                email
            );

            return null;
        }

        const data = userSnap.data();

        return {
            uid: user.uid,
            email: user.email,
            role: data.role || "user",
            page: data.page || null
        };

    } catch (error) {

        console.error(
            "Error loading user data from Firestore:",
            error
        );

        return null;
    }
}

/* ---------- GET CURRENT USER ---------- */

async function getUser() {

    if (!auth.currentUser) {
        return null;
    }

    return await getUserData(auth.currentUser);
}

/* ---------- REDIRECT ---------- */

function redirectUser(page) {

    if (!page) {
        return;
    }

    window.location.href = page;
}

/* ---------- LOGIN ---------- */

async function login() {

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberInput = document.getElementById("rememberMe");
    const error = document.getElementById("error");

    if (!emailInput || !passwordInput) {
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const remember = rememberInput?.checked;

    try {

        error.textContent = "";
        error.classList.remove("show");

        emailInput
            .closest(".input-box")
            ?.classList.remove("error");

        passwordInput
            .closest(".input-box")
            ?.classList.remove("error");

        document
            .getElementById("passwordLabel")
            ?.classList.remove("error");

        document
            .getElementById("emailLabel")
            ?.classList.remove("error");

        document
            .querySelector(".wrapper")
            ?.classList.remove("error");

        await setPersistence(
            auth,
            remember
                ? browserLocalPersistence
                : browserSessionPersistence
        );

        const credential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const userData = await getUserData(credential.user);

        if (!userData || !userData.page) {

            await signOut(auth);

            throw new Error("USER_ROLE_NOT_FOUND");
        }

        currentUserData = userData;

        redirectUser(userData.page);

    } catch (firebaseError) {

        console.error(
            "Login error:",
            firebaseError
        );

        error.textContent = "Invalid email or password";
        error.classList.add("show");

        emailInput
            .closest(".input-box")
            ?.classList.add("error");

        passwordInput
            .closest(".input-box")
            ?.classList.add("error");

        document
            .getElementById("passwordLabel")
            ?.classList.add("error");

        document
            .getElementById("emailLabel")
            ?.classList.add("error");

        document
            .querySelector(".wrapper")
            ?.classList.add("error");
    }
}

/* ---------- AUTO REDIRECT FROM LOGIN ---------- */

async function autoRedirectFromLogin() {

    await authReadyPromise;

    const user = auth.currentUser;

    if (!user) {
        return;
    }

    const userData = await getUserData(user);

    if (!userData || !userData.page) {
        return;
    }

    redirectUser(userData.page);
}

/* ---------- LOGOUT ---------- */

async function logout() {

    try {

        await signOut(auth);

        window.location.href = "index.html";

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }
}

/* ---------- PAGE PROTECTION ---------- */

async function protectPage(allowedRole) {

    await authReadyPromise;

    const user = auth.currentUser;

    if (!user) {

        window.location.href = "index.html";

        return;
    }

    const userData = await getUserData(user);

    if (!userData || userData.role !== allowedRole) {

        await signOut(auth);

        window.location.href = "index.html";

        return;
    }

    currentUserData = userData;

    console.log(
        "Protected page allowed:",
        userData.email,
        userData.role
    );
}

/* ---------- AUTH STATE ---------- */

onAuthStateChanged(auth, async user => {

    authReady = true;

    if (user) {

        currentUserData = await getUserData(user);

        console.log(
            "Firebase user signed in:",
            user.email
        );

    } else {

        currentUserData = null;

        console.log(
            "No Firebase user signed in."
        );
    }

    authReadyResolve();

});

/* ---------- GLOBAL FUNCTIONS ---------- */

window.login = login;
window.logout = logout;
window.getUser = getUser;
window.autoRedirectFromLogin = autoRedirectFromLogin;
window.redirectUser = redirectUser;
window.protectPage = protectPage;