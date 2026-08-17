const title =
    document.getElementById(
        "verificationTitle"
    );


const message =
    document.getElementById(
        "verificationMessage"
    );


async function activateAccount(){

    try{

        const params =
            new URLSearchParams(
                window.location.search
            );


        const email =
            params.get("email");


        if(!email){

            throw new Error(
                "Missing email."
            );

        }


        const response =
            await fetch(
                "/api/activate-account",
                {

                    method: "POST",

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


        const data =
            await response.json();


        if(!response.ok){

            throw new Error(
                data.error ||
                "Unable to activate account."
            );

        }


        title.textContent =
            "Account Activated!";


        message.textContent =
            "Your email has been verified and your Seasons Serials account is now active.";


    }catch(error){

        console.error(
            "Account activation error:",
            error
        );


        title.textContent =
            "Activation Failed";


        message.textContent =
            "We couldn't activate your account. Please try the verification email again.";

    }

}


activateAccount();