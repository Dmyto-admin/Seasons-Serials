const {
    initializeApp,
    cert,
    getApps
} = require("firebase-admin/app");

const {
    getAuth
} = require("firebase-admin/auth");

const {
    getFirestore
} = require("firebase-admin/firestore");


function getFirebaseServices(){

    if(!getApps().length){

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

    }


    return {

        auth:
            getAuth(),

        db:
            getFirestore()

    };

}


/*
 * Allowed frontend origins.
 *
 * Local:
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


module.exports = async function handler(req,res){

    /*
     * CORS
     */

    const origin =
        req.headers.origin || "";


    if(
        ALLOWED_ORIGINS.includes(origin)
    ){

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
            "Content-Type, Authorization"
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
     * Browser preflight request.
     */

    if(req.method === "OPTIONS"){

        if(
            !ALLOWED_ORIGINS.includes(origin)
        ){

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
     * Reject unknown browser origins.
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

        const email =
            String(
                req.body?.email || ""
            )
                .trim()
                .toLowerCase();


        if(!email){

            return res.status(400).json({

                error:
                    "Email is required."

            });

        }


        const {
            auth,
            db
        } =
            getFirebaseServices();


        /*
         * Find Firebase Authentication user.
         */

        const firebaseUser =
            await auth.getUserByEmail(
                email
            );


        /*
         * Firebase must confirm
         * that the email was verified.
         */

        if(
            firebaseUser.emailVerified !== true
        ){

            return res.status(403).json({

                error:
                    "Email has not been verified."

            });

        }


        /*
         * Firestore user document.
         */

        const userRef =
            db
                .collection("users")
                .doc(email);


        /*
         * Atomically activate the account.
         *
         * This guarantees that accountActivated
         * is changed only on the first activation.
         */

        const activationResult =
            await db.runTransaction(
                async transaction => {

                    const userSnapshot =
                        await transaction.get(
                            userRef
                        );


                    if(!userSnapshot.exists){

                        throw new Error(
                            "User account does not exist."
                        );

                    }


                    const userData =
                        userSnapshot.data();


                    /*
                     * Already activated.
                     */

                    if(
                        userData.accountActivated === true
                    ){

                        return "alreadyActivated";

                    }


                    /*
                     * First activation.
                     */

                    transaction.update(
                        userRef,
                        {
                            accountActivated: true
                        }
                    );


                    return "activated";

                }
            );


        /*
         * Already activated.
         */

        if(
            activationResult ===
            "alreadyActivated"
        ){

            return res.status(200).json({

                success: true,

                accountActivated: true,

                alreadyActivated: true

            });

        }


        /*
         * First successful activation.
         */

        return res.status(200).json({

            success: true,

            accountActivated: true,

            alreadyActivated: false

        });


    }
    catch(error){

        console.error(
            "Account activation error:",
            error
        );


        return res.status(500).json({

            error:
                error.message ||
                "Unable to activate account."

        });

    }

};
