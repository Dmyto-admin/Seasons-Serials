const admin = require("firebase-admin");


/* =========================================================
   CORS
========================================================= */

function setCORS(res, origin) {

    const allowedOrigins = [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://seasons-serials.vercel.app"
    ];


    if (allowedOrigins.includes(origin)) {

        res.setHeader(
            "Access-Control-Allow-Origin",
            origin
        );

    }


    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, OPTIONS"
    );


    res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type"
    );

}


/* =========================================================
   FIREBASE ADMIN
========================================================= */

function initializeFirebaseAdmin() {

    if (admin.apps.length) {

        return admin.app();

    }


    const privateKey =
        process.env.FIREBASE_PRIVATE_KEY
            ?.replace(/\\n/g, "\n");


    return admin.initializeApp({

        credential:
            admin.credential.cert({

                projectId:
                    process.env.FIREBASE_PROJECT_ID,

                clientEmail:
                    process.env.FIREBASE_CLIENT_EMAIL,

                privateKey:
                    privateKey

            })

    });

}


/* =========================================================
   JSON RESPONSE
========================================================= */

function sendJSON(
    res,
    status,
    data
) {

    return res
        .status(status)
        .json(data);

}


/* =========================================================
   API HANDLER
========================================================= */

module.exports = async function handler(
    req,
    res
) {

    /* =========================
       CORS
    ========================= */

    const origin =
        req.headers.origin || "";


    setCORS(
        res,
        origin
    );


    /* =========================
       PREFLIGHT
    ========================= */

    if (req.method === "OPTIONS") {

        return res
            .status(204)
            .end();

    }


    /* =========================
       METHOD
    ========================= */

    if (req.method !== "GET") {

        return sendJSON(
            res,
            405,
            {
                error:
                    "Method not allowed."
            }
        );

    }


    try {

        /* =========================
           FIREBASE ADMIN
        ========================= */

        initializeFirebaseAdmin();


        /* =========================
           AUTHORIZATION
        ========================= */

        const authorization =
            req.headers.authorization || "";


        if (
            !authorization.startsWith(
                "Bearer "
            )
        ) {

            return sendJSON(
                res,
                401,
                {
                    error:
                        "Authentication required."
                }
            );

        }


        const idToken =
            authorization.substring(7);


        /* =========================
           VERIFY ADMIN TOKEN
        ========================= */

        const decodedToken =
            await admin
                .auth()
                .verifyIdToken(
                    idToken
                );


        /* =========================
           FIRESTORE
        ========================= */

        const firestore =
            admin.firestore();


        /* =========================
           LOAD ADMIN ACCOUNT
        ========================= */

        const adminUser =
            await firestore
                .collection("users")
                .doc(decodedToken.email)
                .get();


        if (!adminUser.exists) {

            return sendJSON(
                res,
                403,
                {
                    error:
                        "Admin account not found."
                }
            );

        }


        const adminData =
            adminUser.data();


        if (
            adminData.role !==
            "admin"
        ) {

            return sendJSON(
                res,
                403,
                {
                    error:
                        "Administrator privileges required."
                }
            );

        }


        /* =========================
           LOAD FIREBASE USERS
        ========================= */

        const listResult =
            await admin
                .auth()
                .listUsers(
                    1000
                );


        const accounts = [];


        /* =========================
           BUILD ACCOUNT LIST
        ========================= */

        for (
            const firebaseUser
            of listResult.users
        ) {

            /* Skip current admin */

            if (
                firebaseUser.email ===
                decodedToken.email
            ) {

                continue;

            }


            const email =
                firebaseUser.email;


            if (!email) {

                continue;

            }


            /* =========================
               USER FIRESTORE DOCUMENT
            ========================= */

            const userDoc =
                await firestore
                    .collection("users")
                    .doc(email)
                    .get();


            const profile =
                userDoc.exists
                    ? userDoc.data()
                    : {};


            /* =========================
               ACCOUNT DATA
            ========================= */

            accounts.push({

                uid:
                    firebaseUser.uid,

                email:
                    email,

                username:
                    profile.username ||
                    "",

                phone:
                    profile.phone ||
                    "",

                accountActivated:
                    profile.accountActivated ===
                    true,

                accountSuspended:
                    profile.accountSuspended ===
                    true,

                suspensionUntil:
                    Number(
                        profile.suspensionUntil ||
                        0
                    )

            });

        }


        /* =========================
           SORT ACCOUNTS
        ========================= */

        accounts.sort(
            (a, b) =>
                String(
                    a.username ||
                    a.email
                )
                .localeCompare(
                    String(
                        b.username ||
                        b.email
                    )
                )
        );


        /* =========================
           SUCCESS
        ========================= */

        return sendJSON(
            res,
            200,
            {
                accounts
            }
        );


    } catch (error) {

        console.error(
            "admin-accounts error:",
            error
        );


        return sendJSON(
            res,
            500,
            {
                error:
                    "Unable to load accounts."
            }
        );

    }

};
