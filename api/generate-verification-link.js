const {
    initializeApp,
    cert,
    getApps
} = require("firebase-admin/app");

const {
    getAuth
} = require("firebase-admin/auth");


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
 * Allowed website origins
 */

function isAllowedOrigin(origin){

    if(!origin){
        return false;
    }


    /*
     * Local development
     *
     * Allows:
     * http://localhost
     * http://localhost:5500
     * http://127.0.0.1
     * http://127.0.0.1:5500
     * etc.
     */

    if(
        /^https?:\/\/localhost(?::\d+)?$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)
    ){

        return true;

    }


    /*
     * Production website
     */

    if(
        origin ===
        "https://seasons-serials.vercel.app"
    ){

        return true;

    }


    return false;

}


module.exports = async function handler(req,res){

    const origin =
        req.headers.origin;


    /*
     * CORS
     */

    if(isAllowedOrigin(origin)){

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
        "Content-Type, Authorization"
    );


    res.setHeader(
        "Vary",
        "Origin"
    );


    /*
     * IMPORTANT:
     *
     * Browser sends OPTIONS before the POST
     * because we use Authorization.
     */

    if(req.method === "OPTIONS"){

        return res
            .status(204)
            .end();

    }


    /*
     * Only POST is allowed
     */

    if(req.method !== "POST"){

        return res
            .status(405)
            .json({

                error:
                    "Method not allowed."

            });

    }


    /*
     * Reject unknown origins
     */

    if(!isAllowedOrigin(origin)){

        return res
            .status(403)
            .json({

                error:
                    "Origin not allowed."

            });

    }


    try{

        /*
         * Get Firebase ID token
         */

        const authorization =
            req.headers.authorization || "";


        if(
            !authorization.startsWith(
                "Bearer "
            )
        ){

            return res
                .status(401)
                .json({

                    error:
                        "Missing authorization token."

                });

        }


        const idToken =
            authorization.substring(7);


        /*
         * Firebase Admin
         */

        const auth =
            getFirebaseAdmin();


        /*
         * Verify Firebase user
         */

        const decodedToken =
            await auth.verifyIdToken(
                idToken
            );


        const email =
            decodedToken.email;


        if(!email){

            return res
                .status(400)
                .json({

                    error:
                        "Firebase user has no email address."

                });

        }


        /*
         * Generate verification link
         *
         * IMPORTANT:
         * The verification page stays on Vercel.
         *
         * This is what allows the same link to work
         * whether registration was started locally
         * or on the production website.
         */

        const actionCodeSettings = {

            url:
                `https://seasons-serials.vercel.app/verify-email.html?email=${encodeURIComponent(email)}`,

            handleCodeInApp:
                false

        };


        const verificationLink =
            await auth.generateEmailVerificationLink(
                email,
                actionCodeSettings
            );


        return res
            .status(200)
            .json({

                verificationLink:
                    verificationLink

            });


    }catch(error){

        console.error(
            "Verification link generation error:",
            error
        );


        return res
            .status(500)
            .json({

                error:
                    "Unable to generate verification link."

            });

    }

};
