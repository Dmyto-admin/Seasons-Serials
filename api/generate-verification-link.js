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

        credential: cert({

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
 * Allowed frontend origins.
 *
 * Local development:
 *     http://127.0.0.1:5500
 *     http://localhost:5500
 *
 * Production:
 *     https://seasons-serials.vercel.app
 */


const ALLOWED_ORIGINS = [

    "http://127.0.0.1:5500",

    "http://localhost:5500",

    "https://seasons-serials.vercel.app"

];


module.exports = async function handler(req, res){

    /*
     * CORS
     */

    const origin =
        req.headers.origin || "";


    if(ALLOWED_ORIGINS.includes(origin)){

        res.setHeader(
            "Access-Control-Allow-Origin",
            origin
        );

        res.setHeader(
            "Access-Control-Allow-Methods",
            "POST, OPTIONS"
        );

        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-App-Origin"
        );

        res.setHeader(
            "Vary",
            "Origin"
        );

    }


    /*
     * Browser preflight request
     */

    if(req.method === "OPTIONS"){

        if(!ALLOWED_ORIGINS.includes(origin)){

            return res.status(403).json({

                error:
                    "Origin not allowed."

            });

        }


        return res.status(204).end();

    }


    /*
     * Only POST is allowed.
     */

    if(req.method !== "POST"){

        return res.status(405).json({

            error:
                "Method not allowed."

        });

    }


    /*
     * Reject unknown origins.
     */

    if(
        origin &&
        !ALLOWED_ORIGINS.includes(origin)
    ){

        return res.status(403).json({

            error:
                "Origin not allowed."

        });

    }


    try{

        /*
         * Authorization header
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


        /*
         * Firebase ID token
         */

        const idToken =
            authorization.substring(7);


        /*
         * Firebase Admin
         */

        const auth =
            getFirebaseAdmin();


        /*
         * Verify the currently signed-in
         * Firebase user.
         */

        const decodedToken =
            await auth.verifyIdToken(idToken);


        const email =
            decodedToken.email;


        if(!email){

            return res.status(400).json({

                error:
                    "Firebase user has no email address."

            });

        }


        /*
         * Determine where the verification
         * flow should return.
         *
         * Local:
         *     http://127.0.0.1:5500/verify-email.html
         *
         * Production:
         *     https://seasons-serials.vercel.app/verify-email.html
         */

        let verificationBaseUrl =
            "https://seasons-serials.vercel.app";


        if(
            origin ===
            "http://127.0.0.1:5500"
        ){

            verificationBaseUrl =
                "http://127.0.0.1:5500";

        }
        else if(
            origin ===
            "http://localhost:5500"
        ){

            verificationBaseUrl =
                "http://localhost:5500";

        }


        const verificationUrl =
            `${verificationBaseUrl}/verify-email.html?email=${encodeURIComponent(email)}`;


        /*
         * Firebase ActionCodeSettings
         */

        const actionCodeSettings = {

            url:
                verificationUrl,

            handleCodeInApp:
                false

        };


        /*
         * Generate Firebase verification link.
         */

        const verificationLink =
            await auth.generateEmailVerificationLink(
                email,
                actionCodeSettings
            );


        /*
         * Return the generated link.
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


        return res.status(500).json({

            error:
                error.message ||
                "Unable to generate verification link."

        });

    }

};
