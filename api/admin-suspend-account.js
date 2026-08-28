const admin = require("firebase-admin");


/* =========================================================
   CORS
========================================================= */

function setCORS(req, res) {

    const origin =
        req.headers.origin || "";


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
        "GET, POST, OPTIONS"
    );


    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );


    res.setHeader(
        "Vary",
        "Origin"
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
   HANDLER
========================================================= */

module.exports = async function handler(
    req,
    res
) {

    /* -----------------------------------------------------
       ALWAYS SET CORS FIRST
    ----------------------------------------------------- */

    setCORS(req, res);


    /* -----------------------------------------------------
       HANDLE BROWSER PREFLIGHT
    ----------------------------------------------------- */

    if (req.method === "OPTIONS") {

        return res
            .status(204)
            .end();

    }


    /* -----------------------------------------------------
       ONLY POST AFTER PREFLIGHT
    ----------------------------------------------------- */

    if (req.method !== "POST") {

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

        initializeFirebaseAdmin();


        /* -------------------------------------------------
           AUTHORIZATION
        ------------------------------------------------- */

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


        const decodedToken =
            await admin
                .auth()
                .verifyIdToken(
                    idToken
                );


        /* -------------------------------------------------
           FIRESTORE
        ------------------------------------------------- */

        const firestore =
            admin.firestore();


        const adminEmail =
            decodedToken.email;


        const adminDoc =
            await firestore
                .collection("users")
                .doc(adminEmail)
                .get();


        if (!adminDoc.exists) {

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
            adminDoc.data();


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


        /* -------------------------------------------------
           REQUEST BODY
        ------------------------------------------------- */

        const {
            uid,
            suspensionUntil,
            suspensionForever = false
        } = req.body || {};


        /* -------------------------------------------------
           VALIDATE USER
        ------------------------------------------------- */

        if (
            typeof uid !== "string" ||
            !uid.trim()
        ) {

            return sendJSON(
                res,
                400,
                {
                    error:
                        "Invalid user."
                }
            );

        }


        /* -------------------------------------------------
           VALIDATE FOREVER FLAG
        ------------------------------------------------- */

        if (
            typeof suspensionForever !==
            "boolean"
        ) {

            return sendJSON(
                res,
                400,
                {
                    error:
                        "Invalid permanent suspension value."
                }
            );

        }


        /* -------------------------------------------------
           VALIDATE SUSPENSION TIME
           
           A time is NOT required when the account
           is being suspended forever.

           It IS required for normal suspension and
           for ending suspension.
        ------------------------------------------------- */

        if (
            suspensionForever === false &&
            (
                typeof suspensionUntil !== "number" ||
                !Number.isFinite(
                    suspensionUntil
                )
            )
        ) {

            return sendJSON(
                res,
                400,
                {
                    error:
                        "Invalid suspension time."
                }
            );

        }


        /* -------------------------------------------------
           TARGET USER
        ------------------------------------------------- */

        const targetUser =
            await admin
                .auth()
                .getUser(uid);


        if (
            targetUser.email ===
            adminEmail
        ) {

            return sendJSON(
                res,
                400,
                {
                    error:
                        "You cannot suspend your own administrator account."
                }
            );

        }


        const userEmail =
            targetUser.email;


        if (!userEmail) {

            return sendJSON(
                res,
                400,
                {
                    error:
                        "Target account has no email address."
                }
            );

        }


        const userRef =
            firestore
                .collection("users")
                .doc(userEmail);


        /* =================================================
           END SUSPENSION
           
           suspensionUntil === 0 means:
           restore the account.
        ================================================= */

        if (
            suspensionUntil === 0 &&
            suspensionForever === false
        ) {

            await admin
                .auth()
                .updateUser(
                    uid,
                    {
                        disabled:
                            false
                    }
                );


            await userRef.set(
                {
                    accountSuspended:
                        false,

                    suspensionUntil:
                        0,

                    suspensionForever:
                        false
                },
                {
                    merge:
                        true
                }
            );


            return sendJSON(
                res,
                200,
                {
                    success:
                        true,

                    suspended:
                        false,

                    suspensionForever:
                        false,

                    suspensionUntil:
                        0
                }
            );

        }


        /* =================================================
           SUSPEND FOREVER
        ================================================= */

        if (
            suspensionForever === true
        ) {

            /* ---------------------------------------------
               DISABLE FIREBASE ACCOUNT
            --------------------------------------------- */

            await admin
                .auth()
                .updateUser(
                    uid,
                    {
                        disabled:
                            true
                    }
                );


            /* ---------------------------------------------
               SAVE PERMANENT SUSPENSION
            --------------------------------------------- */

            await userRef.set(
                {
                    accountSuspended:
                        true,

                    suspensionForever:
                        true,

                    suspensionUntil:
                        0
                },
                {
                    merge:
                        true
                }
            );


            /* ---------------------------------------------
               SUCCESS
            --------------------------------------------- */

            return sendJSON(
                res,
                200,
                {
                    success:
                        true,

                    suspended:
                        true,

                    suspensionForever:
                        true,

                    suspensionUntil:
                        0
                }
            );

        }


        /* =================================================
           NORMAL TEMPORARY SUSPENSION
        ================================================= */

        if (
            suspensionUntil <=
            Date.now()
        ) {

            return sendJSON(
                res,
                400,
                {
                    error:
                        "Suspension time must be in the future."
                }
            );

        }


        /* =================================================
           MAXIMUM 12 MONTHS
        ================================================= */

        const maximum =
            new Date();


        maximum.setMonth(
            maximum.getMonth() + 12
        );


        if (
            suspensionUntil >
            maximum.getTime()
        ) {

            return sendJSON(
                res,
                400,
                {
                    error:
                        "Suspension cannot exceed 12 months."
                }
            );

        }


        /* =================================================
           DISABLE FIREBASE ACCOUNT
        ================================================= */

        await admin
            .auth()
            .updateUser(
                uid,
                {
                    disabled:
                        true
                }
            );


        /* =================================================
           SAVE TEMPORARY SUSPENSION
        ================================================= */

        await userRef.set(
            {
                accountSuspended:
                    true,

                suspensionForever:
                    false,

                suspensionUntil:
                    suspensionUntil
            },
            {
                merge:
                    true
            }
        );


        /* =================================================
           SUCCESS
        ================================================= */

        return sendJSON(
            res,
            200,
            {
                success:
                    true,

                suspended:
                    true,

                suspensionForever:
                    false,

                suspensionUntil:
                    suspensionUntil
            }
        );


    } catch (error) {

        console.error(
            "admin-suspend-account error:",
            error
        );


        return sendJSON(
            res,
            500,
            {
                error:
                    "Unable to change account suspension."
            }
        );

    }

};
