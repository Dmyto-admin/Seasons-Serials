async function activateAccount(){

    alert(
        "ACTIVATION DEBUG 1/9\n\n" +
        "verify-email.js started."
    );


    /*
     * -----------------------------------------------------
     * EMAIL
     * -----------------------------------------------------
     */

    alert(
        "ACTIVATION DEBUG 2/9\n\n" +
        "Email from URL:\n" +
        (
            email ||
            "[MISSING]"
        ) +
        "\n\n" +
        "Current page:\n" +
        window.location.href
    );


    if(!email){

        alert(
            "ACTIVATION ERROR\n\n" +
            "The activation URL does not contain ?email=..."
        );


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
         * API URL
         * -------------------------------------------------
         */

        const apiUrl =
            `${API_BASE_URL}/api/activate-account`;


        alert(
            "ACTIVATION DEBUG 3/9\n\n" +
            "Calling:\n" +
            apiUrl +
            "\n\n" +
            "Method: POST\n\n" +
            "Email:\n" +
            email
        );



        /*
         * -------------------------------------------------
         * REQUEST
         * -------------------------------------------------
         */

        let response;


        try{

            response =
                await fetch(

                    apiUrl,

                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "X-App-Origin":
                                window.location.origin

                        },

                        body:
                            JSON.stringify({

                                email:
                                    email

                            })

                    }

                );

        }
        catch(fetchError){

            alert(
                "ACTIVATION ERROR — FETCH\n\n" +
                "The browser could not complete the request.\n\n" +
                fetchError.message
            );

            throw fetchError;

        }



        /*
         * -------------------------------------------------
         * RESPONSE
         * -------------------------------------------------
         */

        alert(
            "ACTIVATION DEBUG 4/9\n\n" +
            "Vercel responded.\n\n" +
            "HTTP status:\n" +
            response.status +
            "\n\n" +
            "OK:\n" +
            response.ok
        );



        /*
         * -------------------------------------------------
         * RAW RESPONSE
         * -------------------------------------------------
         */

        const responseText =
            await response.text();


        alert(
            "ACTIVATION DEBUG 5/9\n\n" +
            "Raw response:\n\n" +
            (
                responseText ||
                "[EMPTY RESPONSE]"
            )
        );


        let data = {};


        if(responseText){

            try{

                data =
                    JSON.parse(
                        responseText
                    );

            }
            catch{

                alert(
                    "ACTIVATION ERROR\n\n" +
                    "Vercel returned something that is not JSON."
                );

                data = {};

            }

        }



        /*
         * -------------------------------------------------
         * SERVER ERROR
         * -------------------------------------------------
         */

        if(!response.ok){

            alert(
                "ACTIVATION ERROR — SERVER\n\n" +
                "HTTP " +
                response.status +
                "\n\n" +
                (
                    data.error ||
                    "Unknown activation error."
                )
            );


            throw new Error(

                data.error ||
                `Unable to activate account. HTTP ${response.status}.`

            );

        }



        /*
         * -------------------------------------------------
         * SERVER SUCCESS
         * -------------------------------------------------
         */

        alert(
            "ACTIVATION DEBUG 6/9\n\n" +
            "activate-account.js succeeded."
        );



        /*
         * -------------------------------------------------
         * ALREADY ACTIVATED
         * -------------------------------------------------
         */

        if(
            data.alreadyActivated === true
        ){

            alert(
                "ACTIVATION DEBUG 7/9\n\n" +
                "Firebase/Firestore says:\n" +
                "Account was already activated."
            );


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

        alert(
            "ACTIVATION DEBUG 8/9\n\n" +
            "ACCOUNT ACTIVATION SUCCESSFUL!\n\n" +
            "The account was activated in Firestore.\n" +
            "The user page was created/confirmed."
        );


        setIcon("success");


        title.textContent =
            "Account Activated!";


        message.textContent =
            "Your email has been verified and your Seasons Serials account is now active.";



        setTimeout(()=>{

            alert(
                "ACTIVATION DEBUG 9/9\n\n" +
                "Activation flow completed.\n\n" +
                "Redirecting to login."
            );


            redirectToLogin();

        },3000);

    }


    catch(error){

        console.error(
            "Account activation error:",
            error
        );


        alert(
            "ACTIVATION FINAL ERROR\n\n" +
            (
                error.message ||
                "Unknown activation error."
            )
        );


        setIcon("error");


        title.textContent =
            "Activation Failed";


        message.textContent =
            error.message ||
            "We could not activate your account. Please try the activation link again.";

    }

}
