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
 * CREATE USER PAGE ON GITHUB
 * ---------------------------------------------------------
 */

async function createUserPage(username){

    const normalizedUsername =
        username
            .trim()
            .toLowerCase();


    if(
        !/^[a-z0-9]+$/.test(
            normalizedUsername
        )
    ){

        throw new Error(
            "Invalid username for page creation."
        );

    }


    const pageName =
        `${normalizedUsername}.html`;


    const pageContent = `<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>${username}</title>

</head>

<body>

    Welcome, ${username}

</body>

</html>
`;


    const contentBase64 =
        Buffer
            .from(pageContent, "utf8")
            .toString("base64");


    const owner =
        process.env.GITHUB_OWNER;

    const repo =
        process.env.GITHUB_REPO;

    const branch =
        process.env.GITHUB_BRANCH ||
        "main";

    const token =
        process.env.GITHUB_TOKEN;


    if(
        !owner ||
        !repo ||
        !token
    ){

        throw new Error(
            "GitHub environment variables are missing."
        );

    }


    const filePath =
        pageName;


    const apiUrl =
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;


    /*
     * Check if page already exists
     */

    const existingResponse =
        await fetch(
            `${apiUrl}?ref=${encodeURIComponent(branch)}`,
            {

                method: "GET",

                headers: {

                    "Authorization":
                        `Bearer ${token}`,

                    "Accept":
                        "application/vnd.github+json",

                    "X-GitHub-Api-Version":
                        "2022-11-28"

                }

            }
        );


    if(existingResponse.ok){

        return {

            created: false,

            page:
                pageName

        };

    }


    if(existingResponse.status !== 404){

        const errorText =
            await existingResponse.text();

        throw new Error(
            `Unable to check GitHub page: ${errorText}`
        );

    }


    /*
     * Create page
     */

    const createResponse =
        await fetch(
            apiUrl,
            {

                method: "PUT",

                headers: {

                    "Authorization":
                        `Bearer ${token}`,

                    "Accept":
                        "application/vnd.github+json",

                    "Content-Type":
                        "application/json",

                    "X-GitHub-Api-Version":
                        "2022-11-28"

                },

                body:
                    JSON.stringify({

                        message:
                            `Create user page ${pageName}`,

                        content:
                            contentBase64,

                        branch:
                            branch

                    })

            }
        );


    const createText =
        await createResponse.text();


    let createData = {};

    try{

        createData =
            JSON.parse(
                createText
            );

    }
    catch{

        createData = {};

    }


    if(!createResponse.ok){

        throw new Error(

            createData.message ||
            `Unable to create user page. HTTP ${createResponse.status}.`

        );

    }


    return {

        created: true,

        page:
            pageName

    };

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
     * CORS
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
     * OPTIONS
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
     * METHOD
     */

    if(req.method !== "POST"){

        return res.status(405).json({

            error:
                "Method not allowed."

        });

    }


    /*
     * ORIGIN
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
         * EMAIL
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
         * FIREBASE
         */

        const {
            auth,
            db
        } =
            getFirebaseServices();


        /*
         * AUTH USER
         */

        const firebaseUser =
            await auth.getUserByEmail(
                email
            );


        /*
         * VERIFY EMAIL
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
         * FIRESTORE USER
         */

        const userRef =
            db
                .collection("users")
                .doc(email);


        const userSnapshot =
            await userRef.get();


        if(!userSnapshot.exists){

            return res.status(404).json({

                error:
                    "User account does not exist."

            });

        }


        const userData =
            userSnapshot.data();


        const username =
            String(
                userData.username || ""
            ).trim();


        if(!username){

            return res.status(500).json({

                error:
                    "Username is missing from the user account."

            });

        }


        const normalizedUsername =
            username.toLowerCase();


        const page =
            `${normalizedUsername}.html`;


        const role =
            normalizedUsername;


        /*
         * -------------------------------------------------
         * ALREADY ACTIVATED
         * -------------------------------------------------
         */

        if(
            userData.accountActivated === true
        ){

            /*
             * Repair missing fields if necessary.
             */

            const updates = {};


            if(!userData.page){

                updates.page =
                    page;

            }


            if(!userData.role){

                updates.role =
                    role;

            }


            if(
                Object.keys(updates).length > 0
            ){

                await userRef.update(
                    updates
                );

            }


            /*
             * Make sure the page exists.
             */

            await createUserPage(
                username
            );


            return res.status(200).json({

                success:
                    true,

                accountActivated:
                    true,

                alreadyActivated:
                    true,

                page:
                    page,

                role:
                    role

            });

        }


        /*
         * -------------------------------------------------
         * FIRST ACTIVATION
         * -------------------------------------------------
         */

        /*
         * Create the page FIRST.
         */

        await createUserPage(
            username
        );


        /*
         * Only after successful page creation,
         * create the fields and activate the account.
         */

        await userRef.update({

            accountActivated:
                true,

            page:
                page,

            role:
                role

        });


        /*
         * SUCCESS
         */

        return res.status(200).json({

            success:
                true,

            accountActivated:
                true,

            alreadyActivated:
                false,

            page:
                page,

            role:
                role

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
