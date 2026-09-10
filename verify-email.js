import {
    auth
} from "./store-system/firebase-config.js";


import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

/*
 * ---------------------------------------------------------
 * URL PARAMETERS
 * ---------------------------------------------------------
 */

const params =
    new URLSearchParams(
        window.location.search
    );


const email =
    (
        params.get("email") ||
        ""
    )
        .trim()
        .toLowerCase();



/*
 * ---------------------------------------------------------
 * API LOCATION
 * ---------------------------------------------------------
 */

const isLocal =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";


const API_BASE_URL =
    isLocal
        ? "https://seasons-serials.vercel.app"
        : "";



/*
 * ---------------------------------------------------------
 * DOM ELEMENTS
 * ---------------------------------------------------------
 */

const title =
    document.getElementById(
        "verificationTitle"
    );


const message =
    document.getElementById(
        "verificationMessage"
    );


const iconWrapper =
    document.getElementById(
        "iconWrapper"
    );


const loadingIcon =
    document.getElementById(
        "loadingIcon"
    );


const countdown =
    document.getElementById(
        "countdown"
    );


const countdownNumber =
    document.getElementById(
        "countdownNumber"
    );


const progress =
    document.getElementById(
        "progress"
    );


const progressBar =
    document.getElementById(
        "progressBar"
    );



/*
 * ---------------------------------------------------------
 * ICON
 * ---------------------------------------------------------
 */

function setIcon(type){

    loadingIcon?.remove();


    if(type === "success"){

        iconWrapper.innerHTML =
            `<div class="icon success-icon">✓</div>`;

    }


    else if(type === "already"){

        iconWrapper.innerHTML =
            `<div class="icon already-icon">✓</div>`;

    }


    else if(type === "error"){

        iconWrapper.innerHTML =
            `<div class="icon error-icon">!</div>`;

    }

}



/*
 * ---------------------------------------------------------
 * REDIRECT
 * ---------------------------------------------------------
 */

function redirectToLogin(){

    sessionStorage.setItem(
        "openLoginAfterVerification",
        "true"
    );


    window.location.href =
        "/index.html";

}



/*
 * ---------------------------------------------------------
 * COUNTDOWN
 * ---------------------------------------------------------
 */

function startCountdown(seconds = 5){

    countdown.classList.remove(
        "hidden"
    );


    progress.classList.remove(
        "hidden"
    );


    progressBar.classList.remove(
        "animate"
    );


    void progressBar.offsetWidth;


    progressBar.classList.add(
        "animate"
    );


    let remaining =
        seconds;


    countdownNumber.textContent =
        remaining;


    const timer =
        setInterval(()=>{

            remaining--;


            countdownNumber.textContent =
                remaining;


            if(remaining <= 0){

                clearInterval(timer);


                redirectToLogin();

            }

        },1000);

}



/*
 * ---------------------------------------------------------
 * WAIT FOR FIREBASE AUTH
 * ---------------------------------------------------------
 */

function waitForCurrentUser(){

    return new Promise(
        (resolve) => {

            let finished =
                false;


            const unsubscribe =
                onAuthStateChanged(
                    auth,
                    (user) => {

                        if(finished){

                            return;

                        }


                        finished =
                            true;


                        unsubscribe();


                        resolve(user);

                    }
                );

        }
    );

}



/*
 * ---------------------------------------------------------
 * CREATE DETAILED DIAGNOSTIC
 * ---------------------------------------------------------
 */

function createDiagnostic({

    status = null,

    statusText = "",

    responseText = "",

    data = {},

    currentUser = null,

    idTokenSent = false,

    error = null,

    stage = "Unknown"

} = {}){


    const lines = [

        "==================================================",

        "SEASONS SERIALS ACCOUNT ACTIVATION DIAGNOSTIC",

        "==================================================",

        "",

        `FAILED STAGE: ${stage}`,

        "",

        "---------------- REQUEST ----------------",

        `PAGE URL: ${window.location.href}`,

        `PAGE ORIGIN: ${window.location.origin}`,

        `HOSTNAME: ${window.location.hostname}`,

        `IS LOCAL: ${isLocal}`,

        `API BASE URL: ${API_BASE_URL || "(same origin)"}`,

        `ACTIVATION API: ${API_BASE_URL}/api/activate-account`,

        "REQUEST METHOD: POST",

        "",

        `EMAIL FROM URL: ${email || "(missing)"}`,

        `CURRENT FIREBASE USER: ${
            currentUser
                ? (
                    currentUser.email ||
                    "(Firebase user has no email)"
                )
                : "(NO CURRENT FIREBASE USER)"
        }`,

        `FIREBASE UID: ${
            currentUser?.uid ||
            "(none)"
        }`,

        `FIREBASE EMAIL VERIFIED: ${
            currentUser
                ? String(
                    currentUser.emailVerified
                )
                : "(unknown)"
        }`,

        "",

        "---------------- AUTHORIZATION ----------------",

        `AUTHORIZATION HEADER SENT: ${
            idTokenSent
                ? "YES"
                : "NO"
        }`,

        idTokenSent
            ? "A Firebase ID token was obtained and sent to the activation API."
            : "NO Firebase ID token was available for the activation request.",

        "",

        "---------------- SERVER RESPONSE ----------------",

        `HTTP STATUS: ${
            status === null
                ? "(no HTTP response)"
                : status
        }`,

        `HTTP STATUS TEXT: ${
            statusText ||
            "(empty)"
        }`,

        `RAW RESPONSE BODY: ${
            responseText ||
            "(empty response body)"
        }`,

        `SERVER ERROR FIELD: ${
            data?.error ||
            "(no data.error field)"
        }`,

        `SERVER ALREADY ACTIVATED FIELD: ${
            data?.alreadyActivated === undefined
                ? "(not provided)"
                : String(
                    data.alreadyActivated
                )
        }`,

        "",

        "---------------- ERROR OBJECT ----------------",

        `JAVASCRIPT ERROR: ${
            error?.message ||
            error ||
            "(none)"
        }`,

        `ERROR NAME: ${
            error?.name ||
            "(none)"
        }`,

        "",

        "---------------- STATUS MEANINGS ----------------",

        "401 = The activation API did not receive acceptable authentication.",

        "403 = The request origin or permission was rejected.",

        "404 = The activation API route was not found.",

        "409 = The server reported a conflict with existing data.",

        "400 = The server rejected the supplied activation information.",

        "500 = The server encountered an internal error.",

        "",

        "---------------- IMPORTANT ----------------",

        "activate-account.js requires:",

        "Authorization: Bearer <Firebase ID token>",

        "",

        "The activation request must therefore contain a valid Firebase ID token.",

        "",

        "---------------- POSSIBLE CAUSE ----------------"

    ];


    if(status === 401){

        lines.push(

            "The server returned HTTP 401.",

            "",

            "activate-account.js explicitly returns 401 when the Authorization header does not start with 'Bearer '.",

            "",

            "Possible causes:",

            "1. Firebase Auth has not restored the current user.",

            "2. There is no signed-in Firebase user in this browser.",

            "3. The Firebase user belongs to a different email address than the activation link.",

            "4. A Firebase ID token could not be obtained.",

            "5. The Authorization header was not sent.",

            "6. The server rejected the token after receiving it."

        );

    }


    else if(status === 403){

        lines.push(

            "The server returned HTTP 403.",

            "",

            "Check the Origin header and the isAllowedOrigin() logic in activate-account.js."

        );

    }


    else if(status === 500){

        lines.push(

            "The server returned HTTP 500.",

            "",

            "The request reached activate-account.js, but something inside its try/catch failed.",

            "",

            "The server response above should contain the actual Firebase Admin error."

        );

    }


    else if(status === null){

        lines.push(

            "No HTTP response was successfully received.",

            "",

            "The failure happened before the server could return an HTTP response.",

            "",

            "This can indicate a network, CORS, JavaScript, or Firebase Auth problem."

        );

    }


    lines.push(

        "",

        "---------------- NEXT ACTION ----------------",

        "Use the information above to identify the exact failing stage.",

        "",

        "Do NOT assume this is a GitHub-file problem unless the server response explicitly mentions GitHub.",

        "",

        "=================================================="

    );


    return lines.join(
        "\n"
    );

}



/*
 * ---------------------------------------------------------
 * DISPLAY ERROR
 * ---------------------------------------------------------
 */

function displayDiagnostic(
    diagnostic
){

    setIcon(
        "error"
    );


    title.textContent =
        "Activation Failed";


    message.style.whiteSpace =
        "pre-wrap";


    message.style.textAlign =
        "left";


    message.textContent =
        diagnostic;

}



/*
 * ---------------------------------------------------------
 * ACTIVATE ACCOUNT
 * ---------------------------------------------------------
 */

async function activateAccount(){


    /*
     * -----------------------------------------------------
     * VALIDATE EMAIL
     * -----------------------------------------------------
 */

    if(!email){

        const diagnostic =
            createDiagnostic({

                stage:
                    "Reading activation email from URL"

            });


        console.error(
            diagnostic
        );


        displayDiagnostic(
            diagnostic
        );


        return;

    }



    /*
     * -----------------------------------------------------
     * INITIAL UI
     * -----------------------------------------------------
 */

    title.textContent =
        "Activating your account...";


    message.textContent =
        "Your email has been verified. We are completing your account activation.";



    try{


        /*
         * -------------------------------------------------
         * WAIT FOR FIREBASE AUTH
         * -------------------------------------------------
 */

        title.textContent =
            "Checking your account...";


        message.textContent =
            "Waiting for Firebase to restore your account session.";


        const currentUser =
            await waitForCurrentUser();



        /*
         * -------------------------------------------------
         * NO USER
         * -------------------------------------------------
 */

        if(!currentUser){

            const diagnostic =
                createDiagnostic({

                    stage:
                        "Restoring Firebase Auth session",

                    currentUser:
                        null,

                    idTokenSent:
                        false

                });


            console.error(
                diagnostic
            );


            displayDiagnostic(
                diagnostic
            );


            return;

        }



        /*
         * -------------------------------------------------
         * EMAIL MATCH
         * -------------------------------------------------
 */

        const currentUserEmail =
            (
                currentUser.email ||
                ""
            )
                .trim()
                .toLowerCase();



        if(!currentUserEmail){

            const diagnostic =
                createDiagnostic({

                    stage:
                        "Checking Firebase user email",

                    currentUser:
                        currentUser,

                    idTokenSent:
                        false,

                    error:
                        new Error(
                            "The current Firebase user has no email address."
                        )

                });


            console.error(
                diagnostic
            );


            displayDiagnostic(
                diagnostic
            );


            return;

        }



        if(
            currentUserEmail !== email
        ){

            const diagnostic =
                createDiagnostic({

                    stage:
                        "Matching activation email to Firebase user",

                    currentUser:
                        currentUser,

                    idTokenSent:
                        false,

                    error:
                        new Error(

                            `Email mismatch. Activation link belongs to "${email}", but Firebase Auth is currently signed in as "${currentUserEmail}".`

                        )

                });


            console.error(
                diagnostic
            );


            displayDiagnostic(
                diagnostic
            );


            return;

        }



        /*
         * -------------------------------------------------
         * GET FRESH FIREBASE ID TOKEN
         * -------------------------------------------------
 */

        title.textContent =
            "Authenticating activation...";


        message.textContent =
            "Obtaining a fresh Firebase authorization token.";


        const idToken =
            await currentUser.getIdToken(
                true
            );



        if(!idToken){

            const diagnostic =
                createDiagnostic({

                    stage:
                        "Obtaining Firebase ID token",

                    currentUser:
                        currentUser,

                    idTokenSent:
                        false,

                    error:
                        new Error(
                            "Firebase returned an empty ID token."
                        )

                });


            console.error(
                diagnostic
            );


            displayDiagnostic(
                diagnostic
            );


            return;

        }



        /*
         * -------------------------------------------------
         * API REQUEST
         * -------------------------------------------------
 */

        title.textContent =
            "Activating your account...";


        message.textContent =
            "Firebase authentication succeeded. Sending the activation request.";


        const apiUrl =
            `${API_BASE_URL}/api/activate-account`;


        const response =
            await fetch(

                apiUrl,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${idToken}`

                    },

                    body:
                        JSON.stringify({

                            email:
                                email

                        })

                }

            );



        /*
         * -------------------------------------------------
         * READ RESPONSE SAFELY
         * -------------------------------------------------
 */

        const responseText =
            await response.text();


        let data =
            {};


        if(responseText){

            try{

                data =
                    JSON.parse(
                        responseText
                    );

            }
            catch{

                data =
                    {};

            }

        }



        /*
         * -------------------------------------------------
         * HTTP ERROR
         * -------------------------------------------------
 */

        if(!response.ok){

            const diagnostic =
                createDiagnostic({

                    status:
                        response.status,

                    statusText:
                        response.statusText,

                    responseText:
                        responseText,

                    data:
                        data,

                    currentUser:
                        currentUser,

                    idTokenSent:
                        true,

                    stage:
                        "Activation API request",

                    error:
                        new Error(

                            data.error ||
                            `Unable to activate account. HTTP ${response.status}.`

                        )

                });


            console.error(
                diagnostic
            );


            displayDiagnostic(
                diagnostic
            );


            return;

        }



        /*
         * -------------------------------------------------
         * ALREADY ACTIVATED
         * -------------------------------------------------
 */

        if(
            data.alreadyActivated === true
        ){

            setIcon(
                "already"
            );


            title.textContent =
                "Account Already Activated";


            message.style.whiteSpace =
                "";


            message.style.textAlign =
                "";


            message.textContent =
                "This account has already been activated. There is nothing else you need to do.";


            startCountdown(
                5
            );


            return;

        }



        /*
         * -------------------------------------------------
         * FIRST ACTIVATION
         * -------------------------------------------------
 */

        setIcon(
            "success"
        );


        title.textContent =
            "Account Activated!";


        message.style.whiteSpace =
            "";


        message.style.textAlign =
            "";


        message.textContent =
            "Your email has been verified and your Seasons Serials account is now active.";



        setTimeout(()=>{

            redirectToLogin();

        },3000);


    }


    catch(error){

        const diagnostic =
            createDiagnostic({

                stage:
                    "Unexpected JavaScript, Firebase, or network error",

                currentUser:
                    auth.currentUser,

                idTokenSent:
                    false,

                error:
                    error

            });


        console.error(
            "========== ACCOUNT ACTIVATION DIAGNOSTIC =========="
        );


        console.error(
            diagnostic
        );


        console.error(
            "Original error object:",
            error
        );


        console.error(
            "==================================================="
        );


        displayDiagnostic(
            diagnostic
        );

    }

}



/*
 * ---------------------------------------------------------
 * START
 * ---------------------------------------------------------
 */

activateAccount();
