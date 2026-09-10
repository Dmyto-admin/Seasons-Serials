/*
 * =========================================================
 * SEASONS SERIALS
 * ACCOUNT ACTIVATION
 * =========================================================
 *
 * This page:
 *
 * 1. Reads the email from the URL.
 * 2. Sends the activation request to /api/activate-account.
 * 3. Displays the normal activation result.
 * 4. Displays a detailed diagnostic if activation fails.
 *
 * IMPORTANT:
 *
 * This file does NOT create Firebase accounts.
 * Registration is handled by register.js.
 *
 * This file does NOT handle Firebase Auth sessions.
 *
 * This file only completes account activation.
 * =========================================================
 */


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
 * CREATE DETAILED DIAGNOSTIC
 * ---------------------------------------------------------
 */

function createDiagnostic({

    status = null,

    statusText = "",

    responseText = "",

    data = {},

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

        "",

        "---------------- REQUEST HEADERS ----------------",

        "Content-Type: application/json",

        "Authorization header: NOT SENT BY verify-email.js",

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

        "verify-email.js is currently using the original activation request.",

        "It does NOT obtain or send a Firebase ID token.",

        "",

        "If activate-account.js requires:",

        "Authorization: Bearer <Firebase ID token>",

        "",

        "then the server can return HTTP 401 because this request does not contain that header.",

        "",

        "---------------- POSSIBLE CAUSE ----------------"

    ];


    if(status === 401){

        lines.push(

            "The server returned HTTP 401.",

            "",

            "activate-account.js currently requires an Authorization header beginning with 'Bearer '.",

            "",

            "verify-email.js intentionally does NOT send a Firebase Authorization token.",

            "",

            "Therefore the activation API will reject this request with HTTP 401 unless the server-side authentication requirement is changed.",

            "",

            "This is a server/client activation-flow mismatch, not a GitHub filename conflict."

        );

    }


    else if(status === 403){

        lines.push(

            "The server returned HTTP 403.",

            "",

            "Check the Origin header and the isAllowedOrigin() logic in activate-account.js."

        );

    }


    else if(status === 404){

        lines.push(

            "The server returned HTTP 404.",

            "",

            "The /api/activate-account route could not be found.",

            "",

            "Check that activate-account.js exists in the correct Vercel API location and that the deployment contains it."

        );

    }


    else if(status === 409){

        lines.push(

            "The server returned HTTP 409.",

            "",

            "The server reported a conflict.",

            "",

            "If the server is attempting to create a file, document, account, or other resource that already exists, an existing resource may be responsible."

        );

    }


    else if(status === 400){

        lines.push(

            "The server returned HTTP 400.",

            "",

            "The activation API rejected the supplied activation information.",

            "",

            "Check the email parameter and the request body expected by activate-account.js."

        );

    }


    else if(status === 500){

        lines.push(

            "The server returned HTTP 500.",

            "",

            "The request reached activate-account.js, but something inside its try/catch failed.",

            "",

            "The server response above should contain the actual error returned by the API."

        );

    }


    else if(status === null){

        lines.push(

            "No HTTP response was successfully received.",

            "",

            "The failure happened before the server could return an HTTP response.",

            "",

            "This can indicate a network, CORS, JavaScript, or deployment problem."

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
         * API REQUEST
         * -------------------------------------------------
 */

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
                            "application/json"

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
                    "Unexpected JavaScript or network error",

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
