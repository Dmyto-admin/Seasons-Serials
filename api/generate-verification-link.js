import {
    getApps,
    initializeApp,
    cert
} from "firebase-admin/app";

import {
    getAuth
} from "firebase-admin/auth";


function getFirebaseAdmin() {

    if (getApps().length > 0) {
        return getAuth();
    }

    const privateKey =
        process.env.FIREBASE_PRIVATE_KEY
            .replace(/\\n/g, "\n");

    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
        })
    });

    return getAuth();

}


function isAllowedOrigin(origin) {

    if (!origin) {
        return false;
    }

    if (
        /^https?:\/\/localhost(?::\d+)?$/.test(origin)
    ) {
        return true;
    }

    if (
        /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)
    ) {
        return true;
    }

    if (
        origin ===
        "https://seasons-serials.vercel.app"
    ) {
        return true;
    }

    return false;

}


function setCorsHeaders(req, res) {

    const origin = req.headers.origin;

    if (isAllowedOrigin(origin)) {

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
        "Access-Control-Max-Age",
        "86400"
    );

    res.setHeader(
        "Vary",
        "Origin"
    );

}


export default async function handler(req, res) {

    /*
     * CORS headers MUST be added
     * before handling the request.
     */

    setCorsHeaders(req, res);


    /*
     * CORS preflight
     */

    if (req.method === "OPTIONS") {

        return res
            .status(204)
            .end();

    }


    /*
     * Only POST is allowed
     */

    if (req.method !== "POST") {

        return res
            .status(405)
            .json({
                error: "Method not allowed."
            });

    }


    /*
     * Check origin
     */

    const origin = req.headers.origin;

    if (!isAllowedOrigin(origin)) {

        return res
            .status(403)
            .json({
                error: "Origin not allowed."
            });

    }


    try {

        /*
         * Get Authorization header
         */

        const authorization =
            req.headers.authorization;


        if (
            !authorization ||
            !authorization.startsWith("Bearer ")
        ) {

            return res
                .status(401)
                .json({
                    error:
                        "Missing authorization token."
                });

        }


        /*
         * Extract Firebase ID token
         */

        const idToken =
            authorization.substring(7);


        /*
         * Firebase Admin
         */

        const adminAuth =
            getFirebaseAdmin();


        /*
         * Verify Firebase user
         */

        const decodedToken =
            await adminAuth.verifyIdToken(
                idToken
            );


        if (!decodedToken.email) {

            return res
                .status(400)
                .json({
                    error:
                        "Firebase user has no email."
                });

        }


        /*
         * Generate verification link
         */

        const verificationLink =
            await adminAuth
                .generateEmailVerificationLink(
                    decodedToken.email,
                    {
                        url:
                            "https://seasons-serials.vercel.app/"
                    }
                );


        /*
         * Return link
         */

        return res
            .status(200)
            .json({
                verificationLink
            });


    } catch (error) {

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

}
