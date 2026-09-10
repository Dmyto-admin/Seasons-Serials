const {
    initializeApp,
    cert,
    getApps
} = require("firebase-admin/app");


const {
    getAuth
} = require("firebase-admin/auth");



/*
 * ---------------------------------------------------------
 * FIREBASE ADMIN
 * ---------------------------------------------------------
 */

function getFirebaseAdmin(){

    if(getApps().length){

        return getAuth();

    }


    const privateKey =
        process.env.FIREBASE_PRIVATE_KEY
            ?.replace(/\\n/g, "\n");


    if(
        !process.env.FIREBASE_PROJECT_ID ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        !privateKey
    ){

        throw new Error(
            "Firebase Admin environment variables are missing."
        );

    }


    initializeApp({

        credential:

            cert({

                projectId:
                    process.env.FIREBASE_PROJECT_ID,

                clientEmail:
                    process.env.FIREBASE_CLIENT_EMAIL,

                privateKey:
                    privateKey

            })

    });


    return getAuth();

}



/*
 * ---------------------------------------------------------
 * ALLOWED ORIGINS
 * ---------------------------------------------------------
 */

function isAllowedOrigin(origin){

    if(!origin){

        return true;

    }


    try{

        const url =
            new URL(origin);


        if(
            url.protocol === "https:" &&
            url.hostname ===
                "seasons-serials.vercel.app"
        ){

            return true;

        }


        if(
            url.protocol === "http:" &&
            (
                url.hostname === "localhost" ||
                url.hostname === "127.0.0.1"
            )
        ){

            return true;

        }

    }
    catch{

        return false;

    }


    return false;

}



/*
 * ---------------------------------------------------------
 * HANDLER
 * ---------------------------------------------------------
 */

module.exports =
async function handler(req,res){

    const origin =
        req.headers.origin || "";


    /*
     * -----------------------------------------------------
     * CORS
     * -----------------------------------------------------
 */

    if(isAllowedOrigin(origin)){

        if(origin){

            res.setHeader(
                "Access-Control-Allow-Origin",
                origin
            );

        }


        res.setHeader(
            "Access-Control-Allow-Methods",
            "POST, OPTIONS"
        );


        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-App-Origin"
        );


        res.setHeader(
            "Access-Control-Max-Age",
            "86400"
        );


        res.setHeader(
            "Vary",
            "Origin"
        );

    }



    /*
     * -----------------------------------------------------
     * PREFLIGHT
     * -----------------------------------------------------
 */

    if(req.method === "OPTIONS"){

        if(!isAllowedOrigin(origin)){

            return res.status(403).json({

                error:
                    "Origin not allowed."

            });

        }


        return res.status(204).end();

    }



    /*
     * -----------------------------------------------------
     * METHOD
     * -----------------------------------------------------
 */

    if(req.method !== "POST"){

        return res.status(405).json({

            error:
                "Method not allowed."

        });

    }



    /*
     * -----------------------------------------------------
     * ORIGIN
     * -----------------------------------------------------
 */

    if(
        origin &&
        !isAllowedOrigin(origin)
    ){

        return res.status(403).json({

            error:
                "Origin not allowed."

        });

    }



    try{

        /*
         * -------------------------------------------------
         * AUTHORIZATION
         * -------------------------------------------------
         */

        const authorization =
            req.headers.authorization || "";


        if(
            !authorization.startsWith(
                "Bearer "
            )
        ){

            return res.status(401).json({

                error:
                    "GENERATE LINK: Missing Firebase authorization token."

            });

        }


        const idToken =
            authorization.substring(7).trim();


        if(!idToken){

            return res.status(401).json({

                error:
                    "GENERATE LINK: Authorization header exists, but Firebase ID token is empty."

            });

        }



        /*
         * -------------------------------------------------
         * FIREBASE ADMIN
         * -------------------------------------------------
         */

        let auth;

        try{

            auth =
                getFirebaseAdmin();

        }
        catch(error){

            return res.status(500).json({

                error:
                    "GENERATE LINK: Firebase Admin initialization failed: " +
                    error.message

            });

        }



        /*
         * -------------------------------------------------
         * VERIFY FIREBASE TOKEN
         * -------------------------------------------------
         */

        let decodedToken;


        try{

            decodedToken =
                await auth.verifyIdToken(
                    idToken
                );

        }
        catch(error){

            console.error(
                "Firebase ID token verification failed:",
                error
            );


            return res.status(401).json({

                error:
                    "GENERATE LINK: Firebase rejected the ID token: " +
                    error.message

            });

        }



        /*
         * -------------------------------------------------
         * EMAIL
         * -------------------------------------------------
         */

        const email =
            String(
                decodedToken.email || ""
            )
                .trim()
                .toLowerCase();


        if(!email){

            return res.status(400).json({

                error:
                    "GENERATE LINK: Firebase token is valid, but it contains no email."

            });

        }



        /*
         * -------------------------------------------------
         * FRONTEND ORIGIN
         * -------------------------------------------------
         */

        const requestedOrigin =
            req.headers["x-app-origin"] ||
            origin;


        let frontendOrigin =
            "https://seasons-serials.vercel.app";


        if(
            isAllowedOrigin(
                requestedOrigin
            )
        ){

            frontendOrigin =
                requestedOrigin;

        }



        /*
         * -------------------------------------------------
         * VERIFICATION URL
         * -------------------------------------------------
         */

        const verificationUrl =
            `${frontendOrigin}/verify-email.html?email=${encodeURIComponent(email)}`;



        /*
         * -------------------------------------------------
         * FIREBASE ACTION SETTINGS
         * -------------------------------------------------
         */

        const actionCodeSettings = {

            url:
                verificationUrl,

            handleCodeInApp:
                false

        };



        /*
         * -------------------------------------------------
         * GENERATE LINK
         * -------------------------------------------------
 */

        let verificationLink;


        try{

            verificationLink =
                await auth.generateEmailVerificationLink(

                    email,

                    actionCodeSettings

                );

        }
        catch(error){

            console.error(
                "Firebase verification-link generation failed:",
                error
            );


            return res.status(500).json({

                error:
                    "GENERATE LINK: Firebase could not generate the verification link: " +
                    error.message

            });

        }



        /*
         * -------------------------------------------------
         * SUCCESS
         * -------------------------------------------------
         */

        return res.status(200).json({

            success:
                true,

            verificationLink:
                verificationLink

        });

    }


    catch(error){

        console.error(
            "Verification link generation error:",
            error
        );


        return res.status(500).json({

            error:
                "GENERATE LINK: Unexpected server error: " +
                (
                    error.message ||
                    "Unable to generate verification link."
                )

        });

    }

};
