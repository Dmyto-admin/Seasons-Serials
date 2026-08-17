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


module.exports = async function handler(req,res){

    if(req.method !== "POST"){

        return res.status(405).json({

            error:
                "Method not allowed."

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
         * Find the Firebase Authentication
         * user by email.
         */

        const firebaseUser =
            await auth.getUserByEmail(
                email
            );


        /*
         * THIS is the important security check.
         *
         * We do not trust the browser.
         *
         * Firebase itself must say that the
         * email is verified.
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
         * Firebase says the email is verified.
         *
         * Now activate the Firestore account.
         */

        await db
            .collection("users")
            .doc(email)
            .update({

                accountActivated:
                    true

            });


        return res.status(200).json({

            success:
                true,

            accountActivated:
                true

        });


    }catch(error){

        console.error(
            "Account activation error:",
            error
        );


        return res.status(500).json({

            error:
                "Unable to activate account."

        });

    }

};