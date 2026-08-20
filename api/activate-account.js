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



/*
 * ---------------------------------------------------------
 * FIREBASE ADMIN
 * ---------------------------------------------------------
 */

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
            "Content-Type"
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
         * EMAIL
         * -------------------------------------------------
         */

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



        /*
         * -------------------------------------------------
         * FIREBASE
         * -------------------------------------------------
         */

        const {
            auth,
            db
        } =
            getFirebaseServices();



        /*
         * -------------------------------------------------
         * FIND AUTH USER
         * -------------------------------------------------
         */

        const firebaseUser =
            await auth.getUserByEmail(
                email
            );



        /*
         * -------------------------------------------------
         * VERIFY EMAIL STATUS
         * -------------------------------------------------
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
         * -------------------------------------------------
         * FIRESTORE USER
         * -------------------------------------------------
         */

        const userRef =
            db
                .collection("users")
                .doc(email);



        /*
         * -------------------------------------------------
         * ATOMIC ACTIVATION
         * -------------------------------------------------
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
                     * Already activated
                     */

                    if(
                        userData.accountActivated === true
                    ){

                        return "alreadyActivated";

                    }


                    /*
                     * First activation
                     */

                    transaction.update(

                        userRef,

                        {

                            accountActivated:
                                true

                        }

                    );


                    return "activated";

                }

            );



        /*
         * -------------------------------------------------
         * ALREADY ACTIVATED
         * -------------------------------------------------
 */

        if(
            activationResult ===
            "alreadyActivated"
        ){

            return res.status(200).json({

                success:
                    true,

                accountActivated:
                    true,

                alreadyActivated:
                    true

            });

        }



        /*
         * -------------------------------------------------
         * FIRST ACTIVATION
         * -------------------------------------------------
 */

        return res.status(200).json({

            success:
                true,

            accountActivated:
                true,

            alreadyActivated:
                false

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
