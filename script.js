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
    { email: "mari.pashchenko@gmail.com", password: "liubyma-khresna", role: "maria", page: "maria.html" },
    { email: "seasonsserials.info@gmail.com", password: "seasons-serials", role: "admin", page: "admin.html" }
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

/* ---------- FILTERS DROPDOWN ---------- */

const filterBtn = document.getElementById("filterBtn");
const filtersMenu    = document.getElementById("filtersMenu");

if (filterBtn && filtersMenu) {
    filterBtn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();

        // close filters dropdown if open
        moreMenu?.classList.remove("active");

        filtersMenu.classList.toggle("active");
    });

    document.addEventListener("click", () => {
        filtersMenu.classList.remove("active");
    });
}

/* ---------- SALE PRODUCT INFO WRAPPER ---------- */



/* ---------- WRAPPERS ---------- */

const wrappers = {
    profile:   document.querySelector(".wrapper"),
    payments:  document.querySelector(".wrapper-payments"),
    events:    document.querySelector(".wrapper-events"),
    discounts: document.querySelector(".wrapper-discounts"),
    tickets:   document.querySelector(".wrapper-tickets"),
    products:  document.querySelector(".wrapper-admin-products")
};


function closeAllWrappers() {
    Object.values(wrappers).forEach(w => w?.classList.remove("active-popup"));
}


/* ---------- NAV LINKS ---------- */

document.querySelector(".nav-admin-products")?.addEventListener("click", e => {
    e.preventDefault();
    closeAllWrappers();
    wrappers.products?.classList.add("active-popup");
});

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

const screenOverlay = document.getElementById("screenOverlay");

/* ================================
   UNIVERSAL WRAPPER SYSTEM
================================ */

const saleWrappers = document.querySelectorAll(".sale-info-wrapper");

/* OPEN WRAPPER */

document.querySelectorAll("[data-wrapper]").forEach(btn => {

    btn.addEventListener("click", e => {

        e.preventDefault();

        const wrapperId = btn.dataset.wrapper;
        const wrapper = document.getElementById(wrapperId);

        if(!wrapper) return;

        wrapper.classList.add("active");
        screenOverlay.classList.add("active");

    });

});


/* CLOSE WRAPPER FUNCTION */

function closeWrappers(){

    saleWrappers.forEach(wrapper => wrapper.classList.remove("active"));

    if(!imageViewer.classList.contains("active")){
        screenOverlay.classList.remove("active");
    }

}


/* CLOSE ICON */

document.querySelectorAll(".sale-info-wrapper .icon-close").forEach(icon => {

    icon.addEventListener("click", closeWrappers);

});


/* CLOSE ON OVERLAY */

screenOverlay.addEventListener("click", closeWrappers);


/* CLOSE ON ESC */

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {
        closeImageViewer?.();
        closeWrappers?.();
    }

});


const imageViewer = document.getElementById('imageViewer');
const imageViewerImg = document.getElementById('imageViewerImg');
const imageViewerClose = document.querySelector('.image-viewer-close');

let zoomed = false;

/* OPEN ANY STORE IMAGE */
document.querySelectorAll('.store-img, .store-img-t2').forEach(img => {
    img.addEventListener('click', () => {
        imageViewerImg.src = img.dataset.full;

        imageViewer.classList.add('active');
        screenOverlay.classList.add('active');

        zoomed = false;
        imageViewerImg.style.transform = "scale(1)";
        imageViewerImg.style.transformOrigin = "center center";
        imageViewerImg.style.cursor = "zoom-in";
    });
});

/* CLOSE */
function closeImageViewer() {
    imageViewer.classList.remove('active');
    screenOverlay.classList.remove('active');
}

imageViewerClose.addEventListener('click', closeImageViewer);

imageViewer.addEventListener('click', (e) => {
    if (e.target === imageViewer) closeImageViewer();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeImageViewer();
});

/* ZOOM */
imageViewerImg.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomed = !zoomed;

    if (zoomed) {
        imageViewerImg.style.transform = "scale(2)";
        imageViewerImg.style.cursor = "zoom-out";
    } else {
        imageViewerImg.style.transform = "scale(1)";
        imageViewerImg.style.transformOrigin = "center center";
        imageViewerImg.style.cursor = "zoom-in";
    }
});

imageViewerImg.addEventListener('mousemove', (e) => {
    if (!zoomed) return;

    const rect = imageViewerImg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    imageViewerImg.style.transformOrigin = `${x}% ${y}%`;
});





// ===== SALE COUNTDOWN TIMER (ENDS 03/03/2026) =====

// End date: March 3, 2026, 00:00 (local time)
const SALE_END_DATE = new Date("2026-03-03T00:00:00").getTime();

// Utility for leading zeros (05 instead of 5)
const pad = (n) => String(n).padStart(2, "0");

document.querySelectorAll(".sale-timer").forEach(timer => {
    const saleId = timer.dataset.saleId;
    const storageKey = "saleEnd_" + saleId;

    let endTime = localStorage.getItem(storageKey);

    // Save fixed end date once (persistent)
    if (!endTime) {
        endTime = SALE_END_DATE;
        localStorage.setItem(storageKey, endTime);
    } else {
        endTime = Number(endTime);
    }

    function updateTimer() {
        const remaining = endTime - Date.now();

        if (remaining <= 0) {
            timer.textContent = "Sale ended";
            return;
        }

        const totalSeconds = Math.floor(remaining / 1000);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours   = Math.floor(totalMinutes / 60);

        const days    = Math.floor(totalHours / 24);
        const hours   = totalHours % 24;
        const minutes = totalMinutes % 60;
        const seconds = totalSeconds % 60;

        timer.textContent =
            `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s left`;
    }

    updateTimer();
    setInterval(updateTimer, 1000); // update every second
});