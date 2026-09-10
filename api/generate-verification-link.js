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


        /*
         * Production
         */

        if(
            url.protocol === "https:" &&
            url.hostname ===
                "seasons-serials.vercel.app"
        ){

            return true;

        }


        /*
         * Local development
         */

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
     * ORIGIN SECURITY
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
            !authorization.startsWith("Bearer ")
        ){

            return res.status(401).json({

                error:
                    "Missing authorization token."

            });

        }


        const idToken =
            authorization.substring(7).trim();


        if(!idToken){

            return res.status(401).json({

                error:
                    "Missing authorization token."

            });

        }



        /*
         * -------------------------------------------------
         * FIREBASE ADMIN
         * -------------------------------------------------
         */

        const auth =
            getFirebaseAdmin();



        /*
         * -------------------------------------------------
         * VERIFY FIREBASE USER
         * -------------------------------------------------
         */

        const decodedToken =
            await auth.verifyIdToken(
                idToken
            );


        const email =
            String(
                decodedToken.email || ""
            )
                .trim()
                .toLowerCase();


        if(!email){

            return res.status(400).json({

                error:
                    "Firebase user has no email address."

            });

        }



        /*
         * -------------------------------------------------
         * DETERMINE FRONTEND ORIGIN
         * -------------------------------------------------
         *
         * The browser sends X-App-Origin so that a local
         * registration can receive a verification link
         * pointing back to the local verification page.
         *
         * Production registrations use the production site.
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
         * VERIFICATION PAGE
         * -------------------------------------------------
         */

        const verificationUrl =
            `${frontendOrigin}/verify-email.html?email=${encodeURIComponent(email)}`;



        /*
         * -------------------------------------------------
         * FIREBASE ACTION CODE SETTINGS
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
         * GENERATE VERIFICATION LINK
         * -------------------------------------------------
 */

        const verificationLink =
            await auth.generateEmailVerificationLink(

                email,

                actionCodeSettings

            );



        /*
         * -------------------------------------------------
         * RESPONSE
         * -------------------------------------------------
 */

        return res.status(200).json({

            verificationLink:
                verificationLink

        });

    }
    catch(error){

        console.error(
            "Verification link generation error:",
            error
        );


        /*
         * Firebase token errors should not be reported
         * as a generic server failure.
         */

        if(
            error?.code ===
                "auth/id-token-expired" ||
            error?.code ===
                "auth/argument-error" ||
            error?.code ===
                "auth/invalid-id-token"
        ){

            return res.status(401).json({

                error:
                    "Invalid or expired authorization token."

            });

        }


        return res.status(500).json({

            error:
                error.message ||
                "Unable to generate verification link."

        });

    }

};
