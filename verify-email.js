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

    /*
     * Tell the main page that it should
     * automatically open the login form.
     */

    sessionStorage.setItem(
        "openLoginAfterVerification",
        "true"
    );


    /*
     * Redirect to the main page.
     */

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


    /*
     * Force browser reflow so the
     * animation starts again.
     */

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
     * The activation link must contain
     * the user's email.
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


        const response =
            await fetch(
                "/api/activate-account",
                {
                    method:"POST",

                    headers:{
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            email:email
                        })

                }
            );


        const data =
            await response.json();


        if(!response.ok){

            throw new Error(
                data.error ||
                "Unable to activate account."
            );

        }


        /*
         * ACCOUNT WAS ALREADY ACTIVATED
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
         * FIRST SUCCESSFUL ACTIVATION
         */

        setIcon("success");


        title.textContent =
            "Account Activated!";


        message.textContent =
            "Your email has been verified and your Seasons Serials account is now active.";


        /*
         * Small success pause.
         * Then redirect to login.
         */

        setTimeout(()=>{

            redirectToLogin();

        },3000);


    }catch(error){

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
