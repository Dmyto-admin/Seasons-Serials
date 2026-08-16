const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

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

module.exports = async function handler(req, res){

    if(req.method !== "POST"){

        return res.status(405).json({
            error: "Method not allowed."
        });

    }

    try{

        const authorization =
            req.headers.authorization || "";

        if(!authorization.startsWith("Bearer ")){

            return res.status(401).json({
                error: "Missing authorization token."
            });

        }

        const idToken =
            authorization.substring(7);

        const auth =
            getFirebaseAdmin();

        const decodedToken =
            await auth.verifyIdToken(idToken);

        const email =
            decodedToken.email;

        if(!email){

            return res.status(400).json({
                error: "Firebase user has no email address."
            });

        }

        const verificationLink =
            await auth.generateEmailVerificationLink(
                email
            );

        return res.status(200).json({
            verificationLink:
                verificationLink
        });

    }catch(error){

        console.error(
            "Verification link generation error:",
            error
        );

        return res.status(500).json({
            error:
                "Unable to generate verification link."
        });

    }

};
