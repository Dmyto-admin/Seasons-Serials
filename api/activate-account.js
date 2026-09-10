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

async function createUserPage(userData){

    const username =
        String(
            userData.username || ""
        ).trim();

    const email =
        String(
            userData.email || ""
        ).trim().toLowerCase();

    const phone =
        String(
            userData.phone || ""
        ).trim();


    if(!username){

        throw new Error(
            "Username is missing."
        );

    }


    /*
     * -----------------------------------------------------
     * NORMALIZED USERNAME
     * -----------------------------------------------------
     */

    const normalizedUsername =
        username
            .trim()
            .toLowerCase();


    /*
     * -----------------------------------------------------
     * VALIDATE USERNAME
     * -----------------------------------------------------
     */

    if(
        !/^[a-z0-9]+$/.test(
            normalizedUsername
        )
    ){

        throw new Error(
            "Invalid username for page creation."
        );

    }


    /*
     * -----------------------------------------------------
     * PAGE / ROLE
     * -----------------------------------------------------
     */

    const pageName =
        `${normalizedUsername}.html`;


    const role =
        normalizedUsername;


    /*
     * -----------------------------------------------------
     * SAFE HTML VALUES
     * -----------------------------------------------------
     *
     * Prevent user-entered values from becoming HTML.
     */

    function escapeHTML(value){

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    const safeUsername =
        escapeHTML(username);

    const safeEmail =
        escapeHTML(email);

    const safePhone =
        escapeHTML(phone);


    /*
     * -----------------------------------------------------
     * PHONE LINK
     * -----------------------------------------------------
     */

    const phoneHref =
        phone
            ? `tel:${encodeURIComponent(phone)}`
            : "#";


    /*
     * -----------------------------------------------------
     * CREATE HTML PAGE
     * -----------------------------------------------------
     */

    const pageContent = `<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        http-equiv="X-UA-Compatible"
        content="IE=edge"
    >

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>${safeUsername}</title>


    <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
    >

    <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossorigin
    >

    <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
        rel="stylesheet"
    >

    <link
        rel="stylesheet"
        href="styles.css"
    >

</head>


<body
    class="page-${normalizedUsername}"
    data-page="protected"
    onload="protectPage('${role}')"
>


    <!-- BACKGROUND -->

    <div class="alive-background">

        <div class="mist mist1"></div>

        <div class="mist mist2"></div>

        <div class="tree-shadow"></div>

        <div class="deer-breath"></div>

    </div>


    <canvas id="mistCanvas"></canvas>

    <div class="fog-overlay"></div>


    <!-- HEADER -->

    <header>

        <h2 class="logo">
            Seasons Serials
        </h2>


        <nav class="navigation">


            <!--
                TEMPORARY FAKE PICTURES LINK
            -->

            <a
                href="https://test.com"
                target="_blank"
            >
                My pictures
            </a>


            <a
                href="payments-${normalizedUsername}"
                class="nav-myp"
            >
                My payments
            </a>


            <a
                href="more-content"
                id="moreBtn"
            >
                More
            </a>


            <div
                class="nav-menu"
                id="moreMenu"
            >

                <a
                    href="upcoming-events"
                    id="eventsBtn"
                >
                    Events
                </a>


                <a
                    href="tickets-${normalizedUsername}"
                >
                    Tickets
                </a>


                <!-- STORIES INTENTIONALLY REMOVED -->


                <a
                    href="https://drive.google.com"
                    target="_blank"
                >
                    Perfomances
                </a>


                <a
                    href="discounts-${normalizedUsername}"
                >
                    Discounts
                </a>

            </div>


            <a
                href="profile-${normalizedUsername}"
                class="nav-me"
            >
                Me
                <ion-icon
                    name="person-circle"
                ></ion-icon>
            </a>


            <button
                class="btnLogin-popup"
                onclick="logout()"
            >
                Logout
            </button>

        </nav>

    </header>


    <!-- PROFILE -->

    <div class="wrapper">

        <span class="icon-close">

            <ion-icon
                name="close"
            ></ion-icon>

        </span>


        <div class="form-box login">

            <h2>
                My profile
            </h2>


            <div class="form-box-scroll">


                <div class="profile-info">


                    <p>

                        <span
                            class="profile-info-cat"
                        >
                            Name/username:
                        </span>

                        <span
                            class="profile-info-data"
                        >
                            ${safeUsername}
                        </span>

                    </p>


                    <p>

                        <span
                            class="profile-info-cat"
                        >
                            Email:
                        </span>

                        <a
                            class="contacts-link"
                            href="mailto:${safeEmail}"
                        >
                            ${safeEmail}
                        </a>

                    </p>


                    <p>

                        <span
                            class="profile-info-cat"
                        >
                            Phone:
                        </span>

                        ${
                            phone
                                ? `
                                <a
                                    class="contacts-link"
                                    href="${phoneHref}"
                                >
                                    ${safePhone}
                                </a>
                                `
                                :
                                `
                                <span
                                    class="profile-info-data"
                                >
                                    Not available
                                </span>
                                `
                        }

                    </p>


                    <p>

                        <span
                            class="profile-info-cat"
                        >
                            Password:
                        </span>

                        <span
                            class="profile-info-data"
                        >
                            Not available
                        </span>

                    </p>


                </div>

            </div>

        </div>

    </div>


    <!-- PAYMENTS -->

    <div class="wrapper-payments">

        <span class="icon-close">

            <ion-icon
                name="close"
            ></ion-icon>

        </span>


        <div class="form-box login">

            <h2>
                My payments
            </h2>


            <div class="profile-info">

                <p>

                    <span class="payments-notice">
                        All the payments you realised in
                        Seasons Serials in 2026 will be shown here
                    </span>

                </p>


                <img
                    src="no-payment-yet.png"
                    alt="no-payments-yet"
                >


                <p>

                    <span class="no-payment-yet-text">
                        No payments yet
                    </span>

                </p>

            </div>

        </div>

    </div>


    <!-- DISCOUNTS -->

    <div class="wrapper-discounts">

        <span class="icon-close">

            <ion-icon
                name="close"
            ></ion-icon>

        </span>


        <div class="form-box login">

            <h2>
                Discounts
            </h2>


            <div class="form-box-scroll">

                <div class="profile-info">

                    <div id="discounts">

                        <p>

                            <span class="profile-info-cat">
                                No discounts yet.
                            </span>

                        </p>

                    </div>

                </div>

            </div>

        </div>

    </div>


    <!-- EVENTS -->

    <div class="wrapper-events">

        <span class="icon-close">

            <ion-icon
                name="close"
            ></ion-icon>

        </span>


        <div class="form-box login">

            <h2>
                Upcoming events
            </h2>


            <div class="form-box-scroll">

                <div class="profile-info">

                    <p>

                        <span class="profile-info-cat">
                            Event:
                        </span>

                        <span class="discount-info">
                            Spring Art Exposition
                        </span>

                    </p>


                    <p>

                        <span class="profile-info-cat">
                            Start date:
                        </span>

                        <span class="discount-info">
                            01/03/2026
                        </span>

                    </p>


                    <p>

                        <span class="profile-info-cat">
                            End date:
                        </span>

                        <span class="discount-info">
                            01/03/2026
                        </span>

                    </p>


                    <p>

                        <span class="profile-info-cat">
                            Time:
                        </span>

                        <span class="discount-info">
                            11:00-12:00 GTM
                        </span>

                    </p>


                    <p>

                        <span class="profile-info-cat">
                            Place:
                        </span>

                        <span class="discount-info">
                            14 C/ G. Trevilla 3D, Santander
                        </span>

                    </p>


                    <p>

                        <span class="profile-info-cat">
                            Live stream:
                        </span>

                        <span class="discount-info">
                            Available
                        </span>

                    </p>


                    <p>

                        <span class="profile-info-cat">
                            Tickets:
                        </span>

                        <span class="discount-info">
                            Required
                        </span>

                    </p>


                </div>

            </div>

        </div>

    </div>


    <!-- TICKETS -->

    <div class="wrapper-tickets">

        <span class="icon-close">

            <ion-icon
                name="close"
            ></ion-icon>

        </span>


        <div class="form-box login">

            <h2>
                Events tickets
            </h2>


            <div class="profile-info">

                <p>

                    <span class="payments-notice">
                        All your tickets for upcoming events
                        will appear here
                    </span>

                </p>


                <img
                    src="no-payment-yet.png"
                    alt="no-tickets-yet"
                >


                <p>

                    <span class="no-payment-yet-text">
                        You have no tickets
                    </span>

                </p>

            </div>

        </div>

    </div>


    <!-- MIST -->

    <script>

        const canvas =
            document.getElementById(
                "mistCanvas"
            );

        const ctx =
            canvas.getContext("2d");


        let width;
        let height;


        function resize(){

            width =
                canvas.width =
                    window.innerWidth;

            height =
                canvas.height =
                    window.innerHeight;

        }


        window.addEventListener(
            "resize",
            resize
        );


        resize();


        const particles = [];


        for(
            let i = 0;
            i < 120;
            i++
        ){

            particles.push({

                x:
                    Math.random() * width,

                y:
                    Math.random() * height,

                r:
                    Math.random() * 2.5 + 0.5,

                vx:
                    (Math.random() - 0.5) * 0.3,

                vy:
                    (Math.random() - 0.5) * 0.2,

                alpha:
                    Math.random() * 0.5 + 0.2

            });

        }


        function drawMist(
            x,
            y,
            size,
            alpha
        ){

            const gradient =
                ctx.createRadialGradient(
                    x,
                    y,
                    0,
                    x,
                    y,
                    size
                );


            gradient.addColorStop(
                0,
                \`rgba(220, 240, 255, \${p.alpha})\`;
            );


            gradient.addColorStop(
                1,
                "rgba(200, 220, 255, 0)"
            );


            ctx.fillStyle =
                gradient;


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                size,
                0,
                Math.PI * 2
            );


            ctx.fill();

        }


        function animate(){

            ctx.clearRect(
                0,
                0,
                width,
                height
            );


            for(
                let i = 0;
                i < 18;
                i++
            ){

                drawMist(

                    Math.sin(
                        Date.now() * 0.0002 + i
                    ) *
                    width *
                    0.5 +
                    width / 2,

                    Math.cos(
                        Date.now() * 0.00015 + i
                    ) *
                    height *
                    0.5 +
                    height / 2,

                    200 + i * 20,

                    0.029

                );

            }


            for(
                let p of particles
            ){

                p.x += p.vx;
                p.y += p.vy;


                if(p.x < 0)
                    p.x = width;

                if(p.x > width)
                    p.x = 0;

                if(p.y < 0)
                    p.y = height;

                if(p.y > height)
                    p.y = 0;


                ctx.fillStyle =
                    \`rgba(220, 240, 255, \${p.alpha})\`;


                ctx.beginPath();


                ctx.arc(
                    p.x,
                    p.y,
                    p.r,
                    0,
                    Math.PI * 2
                );


                ctx.fill();

            }


            requestAnimationFrame(
                animate
            );

        }


        animate();

    </script>


    <script src="script.js"></script>

    <script
        type="module"
        src="store-system/store-system.js"
    ></script>

    <script
        type="module"
        src="auth.js"
    ></script>


    <script
        src="https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js"
    ></script>


    <script
        type="module"
        src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"
    ></script>


    <script
        nomodule
        src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"
    ></script>


</body>

</html>
`;


    /*
     * -----------------------------------------------------
     * BASE64
     * -----------------------------------------------------
     */

    const contentBase64 =
        Buffer
            .from(
                pageContent,
                "utf8"
            )
            .toString("base64");


    /*
     * -----------------------------------------------------
     * GITHUB
     * -----------------------------------------------------
     */

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
     * -----------------------------------------------------
     * CHECK EXISTING PAGE
     * -----------------------------------------------------
     */

    const existingResponse =
        await fetch(
            `${apiUrl}?ref=${encodeURIComponent(branch)}`,
            {

                method:
                    "GET",

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

            created:
                false,

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
     * -----------------------------------------------------
     * CREATE FILE
     * -----------------------------------------------------
     */

    const createResponse =
        await fetch(
            apiUrl,
            {

                method:
                    "PUT",

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

        created:
            true,

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
                userData
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
            userData
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
