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
 *
 * Local:
 *
 *     http://127.0.0.1:5500
 *     http://localhost:5500
 *
 * API:
 *
 *     https://seasons-serials.vercel.app
 *
 * Production:
 *
 *     https://seasons-serials.vercel.app
 *
 * In production we can use /api directly.
 */

const isLocal =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";


const API_BASE_URL =
    isLocal
        ? "https://seasons-serials.vercel.app"
        : "";



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



function redirectToLogin(){

    sessionStorage.setItem(
        "openLoginAfterVerification",
        "true"
    );


    window.location.href =
        "/index.html";

}



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



async function activateAccount(){

    /*
     * -----------------------------------------------------
     * VALIDATE EMAIL
     * -----------------------------------------------------
     */

    if(!email){

        setIcon("error");


        title.textContent =
            "Activation Link Invalid";


        message.textContent =
            "This account activation link is missing the required information.";


        return;

    }



    try{

        title.textContent =
            "Activating your account...";


        message.textContent =
            "Your email has been verified. We are completing your account activation.";



        /*
         * -------------------------------------------------
         * API REQUEST
         * -------------------------------------------------
         */

        const response =
            await fetch(

                `${API_BASE_URL}/api/activate-account`,

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
         * SAFELY READ RESPONSE
         * -------------------------------------------------
         *
         * This prevents:
         *
         * "Unexpected end of JSON input"
         *
         * when the server returns an empty/non-JSON response.
         */

        const responseText =
            await response.text();


        let data = {};


        if(responseText){

            try{

                data =
                    JSON.parse(
                        responseText
                    );

            }
            catch{

                data = {};

            }

        }



        /*
         * -------------------------------------------------
         * HTTP ERROR
         * -------------------------------------------------
         */

        if(!response.ok){

            throw new Error(

                data.error ||
                `Unable to activate account. HTTP ${response.status}.`

            );

        }



        /*
         * -------------------------------------------------
         * ALREADY ACTIVATED
         * -------------------------------------------------
 */

        if(
            data.alreadyActivated === true
        ){

            setIcon("already");


            title.textContent =
                "Account Already Activated";


            message.textContent =
                "This account has already been activated. There is nothing else you need to do.";


            startCountdown(5);


            return;

        }



        /*
         * -------------------------------------------------
         * FIRST ACTIVATION
         * -------------------------------------------------
 */

        setIcon("success");


        title.textContent =
            "Account Activated!";


        message.textContent =
            "Your email has been verified and your Seasons Serials account is now active.";



        setTimeout(()=>{

            redirectToLogin();

        },3000);


    }
    catch(error){

        console.error(
            "Account activation error:",
            error
        );


        setIcon("error");


        title.textContent =
            "Activation Failed";


        message.textContent =
            error.message ||
            "We could not activate your account. Please try the activation link again.";

    }

}



activateAccount();
