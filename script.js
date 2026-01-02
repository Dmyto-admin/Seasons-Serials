// @ts-nocheck

console.log("script.js loaded");

/* ---------- USERS DATABASE ---------- */

const USERS = [
    { email: "margaryta.pu@gmail.com", password: "naikrashcha-mama", role: "margaryta", page: "margaryta.html" },
    { email: "grygoriymoroz@gmail.com", password: "klasnyiy-tato", role: "grygoriy", page: "grygoriy.html" },
    { email: "maryni@ukr.net", password: "harna-babushka", role: "maryna", page: "maryna.html" },
    { email: "mistanef@gmail.com", password: "harna-babushka", role: "maryna", page: "maryna.html" },
    { email: "wadimy@ukr.net", password: "chudovyiy-did", role: "wadym", page: "wadym.html" },
    { email: "flavuskeen@gmail.com", password: "liubyma-khresna", role: "maria", page: "maria.html" },
    { email: "mari.pashchenko@gmail.com", password: "liubyma-khresna", role: "maria", page: "maria.html" }
];

/* ---------- STORAGE HELPERS ---------- */

function getUser() {
    return (
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"))
    );
}

function saveUser(user, remember) {
    if (remember) {
        localStorage.setItem("user", JSON.stringify(user));
        sessionStorage.removeItem("user");
    } else {
        sessionStorage.setItem("user", JSON.stringify(user));
        localStorage.removeItem("user");
    }
}

function clearUser() {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
}

/* ---------- LOGIN ---------- */

function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const remember = document.getElementById("rememberMe")?.checked;

    const foundUser = USERS.find(
        u => u.email === email && u.password === password
    );

    if (!foundUser) {
        document.getElementById("error").textContent = "Invalid email or password";
        return;
    }

    const userData = {
        email: foundUser.email,
        role: foundUser.role
    };

    saveUser(userData, remember);
    redirectUser(foundUser.role);
}

/* ---------- AUTO REDIRECT FROM LOGIN ---------- */

function autoRedirectFromLogin() {
    const user = getUser();
    if (!user) return;

    redirectUser(user.role);
}

/* ---------- REDIRECT ---------- */

function redirectUser(role) {
    const foundUser = USERS.find(u => u.role === role);
    if (!foundUser) return;

    window.location.href = foundUser.page;
}

/* ---------- LOGOUT ---------- */

function logout() {
    clearUser();
    window.location.href = "index.html"; // login page
}

/* ---------- PAGE PROTECTION ---------- */

function protectPage(allowedRole) {
    const user = getUser();

    if (!user || user.role !== allowedRole) {
        clearUser();
        window.location.href = "index.html";
    }
}


/* ---------- LOGIN POPUP ---------- */

document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector(".wrapper");
    const loginBtn = document.querySelector("#loginBtn");
    const closeIcon = document.querySelector(".icon-close");

    if (loginBtn && wrapper) {
        loginBtn.onclick = () => wrapper.classList.add("active-popup");
    }

    if (closeIcon && wrapper) {
        closeIcon.onclick = () => wrapper.classList.remove("active-popup");
    }
});

/* ---------- DROPDOWN ---------- */

const moreBtn  = document.getElementById("moreBtn");
const moreMenu = document.getElementById("moreMenu");

if (moreBtn && moreMenu) {
    moreBtn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        closeAllWrappers();
        moreMenu.classList.toggle("active");
    });

    document.addEventListener("click", () => {
        moreMenu.classList.remove("active");
    });
}

/* ---------- WRAPPERS ---------- */

const wrappers = {
    profile:   document.querySelector(".wrapper"),
    payments:  document.querySelector(".wrapper-payments"),
    events:    document.querySelector(".wrapper-events"),
    discounts: document.querySelector(".wrapper-discounts"),
    tickets:   document.querySelector(".wrapper-tickets")
};

function closeAllWrappers() {
    Object.values(wrappers).forEach(w => w?.classList.remove("active-popup"));
}

/* ---------- NAV LINKS ---------- */

document.querySelector(".nav-me")?.addEventListener("click", e => {
    e.preventDefault();
    closeAllWrappers();
    wrappers.profile?.classList.add("active-popup");
});

document.querySelector(".nav-myp")?.addEventListener("click", e => {
    e.preventDefault();
    closeAllWrappers();
    wrappers.payments?.classList.add("active-popup");
});

document.getElementById("eventsBtn")?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    closeAllWrappers();
    moreMenu?.classList.remove("active");
    wrappers.events?.classList.add("active-popup");
});

document.querySelector("#moreMenu a:nth-child(2)")?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    closeAllWrappers();
    moreMenu?.classList.remove("active");
    wrappers.tickets?.classList.add("active-popup");
});

document.querySelector("#moreMenu a:last-child")?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    closeAllWrappers();
    moreMenu?.classList.remove("active");
    wrappers.discounts?.classList.add("active-popup");
});

/* ---------- CLOSE BUTTONS ---------- */

document.querySelectorAll(".icon-close").forEach(btn =>
    btn.addEventListener("click", closeAllWrappers)
);