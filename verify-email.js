const params = new URLSearchParams(window.location.search);

const email = (params.get("email") || "")
    .trim()
    .toLowerCase();

const isLocal =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

const API_BASE_URL = isLocal
    ? "https://seasons-serials.vercel.app"
    : "";

const title = document.getElementById("verificationTitle");
const message = document.getElementById("verificationMessage");
const iconWrapper = document.getElementById("iconWrapper");
const loadingIcon = document.getElementById("loadingIcon");
const countdown = document.getElementById("countdown");
const countdownNumber = document.getElementById("countdownNumber");
const progress = document.getElementById("progress");
const progressBar = document.getElementById("progressBar");

function setIcon(type) {
    loadingIcon?.remove();

    if (type === "success") {
        iconWrapper.innerHTML =
            `<div class="icon success-icon">✓</div>`;
    } else if (type === "already") {
        iconWrapper.innerHTML =
            `<div class="icon already-icon">✓</div>`;
    } else if (type === "error") {
        iconWrapper.innerHTML =
            `<div class="icon error-icon">!</div>`;
    }
}

function redirectToLogin() {
    sessionStorage.setItem(
        "openLoginAfterVerification",
        "true"
    );

    window.location.href = "/index.html";
}

function startCountdown(seconds = 5) {
    countdown.classList.remove("hidden");
    progress.classList.remove("hidden");

    progressBar.classList.remove("animate");

    void progressBar.offsetWidth;

    progressBar.classList.add("animate");

    let remaining = seconds;

    countdownNumber.textContent = remaining;

    const timer = setInterval(() => {
        remaining--;

        countdownNumber.textContent = remaining;

        if (remaining <= 0) {
            clearInterval(timer);
            redirectToLogin();
        }
    }, 1000);
}

async function activateAccount() {
    if (!email) {
        setIcon("error");

        title.textContent = "Activation Failed";

        message.style.whiteSpace = "";
        message.style.textAlign = "";

        message.textContent =
            "We could not activate your account. The activation link is missing the required information.";

        return;
    }

    title.textContent = "Activating your account...";

    message.textContent =
        "Your email has been verified. We are completing your account activation.";

    try {
        const apiUrl =
            `${API_BASE_URL}/api/activate-account`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email
            })
        });

        const responseText = await response.text();

        let data = {};

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                data = {};
            }
        }

        if (!response.ok) {
            setIcon("error");

            title.textContent = "Activation Failed";

            message.style.whiteSpace = "";
            message.style.textAlign = "";

            message.textContent =
                "We could not activate your account. Please try again later.";

            return;
        }

        if (data.alreadyActivated === true) {
            setIcon("already");

            title.textContent = "Account Already Activated";

            message.style.whiteSpace = "";
            message.style.textAlign = "";

            message.textContent =
                "This account has already been activated. There is nothing else you need to do.";

            startCountdown(5);

            return;
        }

        setIcon("success");

        title.textContent = "Account Activated!";

        message.style.whiteSpace = "";
        message.style.textAlign = "";

        message.textContent =
            "Your email has been verified and your Seasons Serials account is now active.";

        setTimeout(() => {
            redirectToLogin();
        }, 3000);
    } catch {
        setIcon("error");

        title.textContent = "Activation Failed";

        message.style.whiteSpace = "";
        message.style.textAlign = "";

        message.textContent =
            "We could not activate your account. Please check your connection and try again.";
    }
}

activateAccount();
