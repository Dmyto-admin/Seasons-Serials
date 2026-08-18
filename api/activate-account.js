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
 * Allowed browser origins.
 *
 * Local development is allowed because
 * the frontend calls this deployed API.
 *
 * Production remains the Seasons Serials
 * Vercel website.
 */

function isAllowedOrigin(origin){

    if(!origin){

        return false;

    }


    if(
        origin ===
        "https://seasons-serials.vercel.app"
    ){

        return true;

    }


    try{

        const url =
            new URL(origin);


        /*
         * Allow localhost and 127.0.0.1
         * regardless of the Live Server port.
         */

        if(
            url.protocol === "http:" &&
            (
                url.hostname === "127.0.0.1" ||
                url.hostname === "localhost"
            )
        ){

            return true;

        }

    }catch{

        return false;

    }


    return false;

}


module.exports = async function handler(req,res){

    /*
     * Browser origin.
     */

    const origin =
        req.headers.origin || "";


    /*
     * CORS headers.
     */

    if(
        isAllowedOrigin(origin)
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
            "Content-Type"
        );


        res.setHeader(
            "Vary",
            "Origin"
        );

    }


    /*
     * Browser CORS preflight.
     */

    if(
        req.method === "OPTIONS"
    ){

        if(
            !isAllowedOrigin(origin)
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

    if(
        req.method !== "POST"
    ){

        return res.status(405).json({

            error:
                "Method not allowed."

        });

    }


    /*
     * Reject unknown origins.
     */

    if(
        !isAllowedOrigin(origin)
    ){

        return res.status(403).json({

            error:
                `Origin not allowed: ${origin || "unknown"}`

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
         * Find the Firebase Authentication user.
         */

        const firebaseUser =
            await auth.getUserByEmail(
                email
            );


        /*
         * Firebase itself must confirm
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
         * Atomically check and activate
         * the account.
         *
         * This prevents repeatedly writing
         * accountActivated: true.
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
         * The account was already activated.
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


    }catch(error){

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
