import { db, auth } from "./store-system/firebase-config.js";

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

async function generateVerificationLink(firebaseUser){

    const idToken = await firebaseUser.getIdToken(true);

    const currentOrigin = window.location.origin;

    const isLocal =
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "localhost";


    const apiBase =
        isLocal
            ? "https://seasons-serials.vercel.app"
            : "";


    const response =
        await fetch(
            `${apiBase}/api/generate-verification-link`,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${idToken}`,

                    /*
                     * Explicitly tell the API the
                     * frontend origin.
                     */

                    "X-App-Origin":
                        currentOrigin

                }

            }
        );


    /*
     * Do not assume that every error response
     * contains valid JSON.
     */

    let data = {};

    try{

        data =
            await response.json();

    }
    catch{

        data = {};

    }


    if(!response.ok){

        throw new Error(

            data.error ||
            `Unable to generate verification link. HTTP ${response.status}.`

        );

    }


    if(!data.verificationLink){

        throw new Error(
            "Firebase did not return a verification link."
        );

    }


    return data.verificationLink;

}

emailjs.init({
    publicKey: "x6kHcpv6XN2lZmOea"
});

const EMAILJS_SERVICE_ID = "service_newemail1";
const EMAILJS_TEMPLATE_ID = "template_tan46u4";

function hideAllErrorMessages(){

    document.querySelectorAll(".input-error-message").forEach(message=>{
        message.classList.remove("show");
    });

    document.querySelectorAll(".input-box").forEach(box=>{
        box.classList.remove("expanded");
    });

}

function updateExpandedState(input, errorMessage){

    const box = input.closest(".input-box");

    errorMessage.classList.remove("show");
    box.classList.remove("expanded");

    if(
        box.classList.contains("error") &&
        document.activeElement === input
    ){

        box.classList.add("expanded");
        errorMessage.classList.add("show");

    }

}

function updateFloatingLabel(input){
    const box = input.closest(".input-box");
    if(input.value.trim() !== ""){
        box.classList.add("active");
    }else{
        box.classList.remove("active");
    }
}

function clearRegistrationStates(){

    document
        .querySelectorAll("#registerForm .input-box")
        .forEach(box => {

            box.classList.remove(
                "error",
                "success",
                "expanded"
            );

        });

    document
        .querySelectorAll("#registerForm label")
        .forEach(label => {

            label.classList.remove(
                "error",
                "success"
            );

        });

    document
        .querySelectorAll(
            "#registerForm .input-error-message"
        )
        .forEach(message => {

            message.textContent = "";
            message.classList.remove("show");

        });

}

const emailInput = document.getElementById("registerEmail");
const passwordInput = document.getElementById("registerPassword");
const repeatInput = document.getElementById("registerRepeatPassword");
const phoneInput = document.getElementById("registerPhone");

const usernameInput = document.getElementById("registerUsername");
const usernameBox = document.getElementById("registerUsernameBox");
const usernameErrorMessage = document.getElementById("usernameErrorMessage");

const registerButton = document.querySelector(
    ".form-box.register button[type='submit']"
);

const emailBox = document.getElementById("registerEmailBox");
const passwordBox = document.getElementById("registerPasswordBox");
const repeatBox = document.getElementById("registerRepeatPasswordBox");
const phoneBox = document.getElementById("registerPhoneBox");

const emailLabel = document.getElementById("registerEmailLabel");
const emailErrorMessage = document.getElementById("emailErrorMessage");

const repeatLabel = document.getElementById("registerRepeatPasswordLabel");
const repeatErrorMessage = document.getElementById("repeatPasswordErrorMessage");

const loadModal = document.getElementById("loadModal");
const loadTitle = document.getElementById("loadTitle");
const loader = document.getElementById("loader");
const resultIcon = document.getElementById("resultIcon");

let emailValidationId = 0;

async function checkEmail(){

    updateFloatingLabel(emailInput);

    const validationId =
        ++emailValidationId;

    const email =
        emailInput.value.trim().toLowerCase();

    clearEmailState();

    if(email === ""){

        checkRegisterButton();

        return;

    }


    const emailPattern =
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;


    if(!emailPattern.test(email)){

        showEmailError(
            "Please enter a valid email address."
        );

        updateExpandedState(
            emailInput,
            emailErrorMessage
        );

        checkRegisterButton();

        return;

    }


    try{

        const q = query(
            collection(db, "users"),
            where("email", "==", email)
        );

        const snapshot =
            await getDocs(q);


        if(validationId !== emailValidationId){
            return;
        }


        if(!snapshot.empty){

            showEmailError(
                "This email is already registered."
            );

        }else{

            showEmailSuccess();

        }


        updateExpandedState(
            emailInput,
            emailErrorMessage
        );

        checkRegisterButton();

    }catch(error){

        if(validationId !== emailValidationId){
            return;
        }

        showEmailError(
            "Unable to check this email right now."
        );

        updateExpandedState(
            emailInput,
            emailErrorMessage
        );

        checkRegisterButton();

    }

}

function showEmailError(message){
    emailBox.classList.add("error");
    emailLabel.classList.add("error");
    emailBox.classList.remove("success");
    emailLabel.classList.remove("success");
    emailErrorMessage.textContent = message;
    emailInput.closest(".input-box").classList.add("error");
    emailInput.closest(".input-box").classList.remove("success");
}

function showEmailSuccess(){
    emailBox.classList.add("success");
    emailLabel.classList.add("success");
    emailBox.classList.remove("error");
    emailLabel.classList.remove("error");
    emailErrorMessage.textContent = "";
    emailErrorMessage.classList.remove("show");
    emailInput.closest(".input-box").classList.remove("error");
    emailInput.closest(".input-box").classList.add("success");
    emailBox.classList.remove("expanded");
}

function clearEmailState(){
    emailBox.classList.remove("error","success");
    emailLabel.classList.remove("error","success");
    emailErrorMessage.textContent = "";
    emailErrorMessage.classList.remove("show");
    emailInput.closest(".input-box").classList.remove("error");
    emailInput.closest(".input-box").classList.remove("success");
    emailBox.classList.remove("expanded");
}

usernameInput.addEventListener("focus",()=>{

    hideAllErrorMessages();

    updateExpandedState(
        usernameInput,
        usernameErrorMessage
    );

});

usernameInput.addEventListener("blur",()=>{

    updateExpandedState(
        usernameInput,
        usernameErrorMessage
    );

});

emailInput.addEventListener("input", checkEmail);

function validateUsername(){

    updateFloatingLabel(usernameInput);

    const username = usernameInput.value;

    let error = "";

    usernameBox.classList.remove("error","success");
    usernameInput.closest(".input-box").classList.remove("error","success");

    if(username === ""){

        usernameErrorMessage.textContent = "";

        updateExpandedState(usernameInput,usernameErrorMessage);

        checkRegisterButton();

        return;

    }

    if(username.length > 15){

        error = "Maximum allowed characters are 15.";

    }
    else if(!/^[a-zA-Z0-9]*$/.test(username)){

        error = "Only letters and numbers are allowed.";

    }

    if(error){

        usernameBox.classList.add("error");

        usernameInput
            .closest(".input-box")
            .classList.add("error");

        usernameErrorMessage.textContent = error;

    }else{

        usernameBox.classList.add("success");

        usernameInput
            .closest(".input-box")
            .classList.add("success");

        usernameErrorMessage.textContent = "";

    }

    updateExpandedState(
        usernameInput,
        usernameErrorMessage
    );

    checkRegisterButton();

}

usernameInput.addEventListener(
    "input",
    validateUsername
);

emailInput.addEventListener("focus",()=>{

    hideAllErrorMessages();

    updateExpandedState(
        emailInput,
        emailErrorMessage
    );

});

emailInput.addEventListener("blur",async()=>{

    await checkEmail();

    updateExpandedState(
        emailInput,
        emailErrorMessage
    );

});

const passwordLabel = document.getElementById("registerPasswordLabel");
const passwordErrorMessage = document.getElementById("passwordErrorMessage");

function validatePassword() {

    const password = passwordInput.value;

    let error = "";

    if (password === "") {
        passwordBox.classList.remove("error", "success");
        passwordErrorMessage.textContent = "";
        passwordErrorMessage.classList.remove("show");

        updateExpandedState(
            passwordInput,
            passwordErrorMessage
        );

        checkRegisterButton();

        return;
    }

    if (password.length < 10) {
        error = "Minimum allowed characters are 10.";
    } else if (password.length > 20) {

        error = "Maximum allowed characters are 20.";

    }
    else if (!/[A-Za-z]/.test(password)) {

        error = "The password must contain at least one letter.";

    }
    else if (!/\d/.test(password)) {

        error = "The password must contain at least one number.";

    }
    else if (!/[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/.test(password)) {

        error = "The password must contain at least one special character.";

    }


    if (error) {

        passwordBox.classList.add("error");
        passwordLabel.classList.add("error");
        passwordBox.classList.remove("success");
        passwordLabel.classList.remove("success");


        passwordErrorMessage.textContent = error;
        passwordErrorMessage.classList.add("show");

        passwordInput
            .closest(".input-box")
            .classList.add("error");

        registerButton.disabled = true;

        updateExpandedState(
            passwordInput,
            passwordErrorMessage
        );
    }
    else {

        passwordBox.classList.remove("error");
        passwordLabel.classList.remove("error");
        passwordBox.classList.add("success");
        passwordLabel.classList.add("success");

        passwordErrorMessage.textContent = "";
        passwordErrorMessage.classList.remove("show");

        passwordInput
            .closest(".input-box")
            .classList.remove("error");

        checkRegisterButton();

        updateExpandedState(
            passwordInput,
            passwordErrorMessage
        );
    }
}

passwordInput.addEventListener(
    "input",
    validatePassword
);

passwordInput.addEventListener("focus",()=>{

    hideAllErrorMessages();

    updateExpandedState(
        passwordInput,
        passwordErrorMessage
    );

});

passwordInput.addEventListener("blur",()=>{

    updateExpandedState(
        passwordInput,
        passwordErrorMessage
    );

});

function validateRepeat(){

    const password = passwordInput.value;
    const repeat = repeatInput.value;

    repeatBox.classList.remove("error","success");
    repeatLabel.classList.remove("error","success");

    repeatErrorMessage.textContent = "";
    repeatErrorMessage.classList.remove("show");

    repeatInput.closest(".input-box").classList.remove("error","success");

    if(repeat === ""){

        updateExpandedState(
            repeatInput,
            repeatErrorMessage
        );

        checkRegisterButton();
        return;

    }

    const passwordValid =
        !passwordBox.classList.contains("error") &&
        password !== "";

    if(!passwordValid){

        updateExpandedState(
            repeatInput,
            repeatErrorMessage
        );

        checkRegisterButton();
        return;

    }

    if(password !== repeat){

        repeatBox.classList.add("error");
        repeatLabel.classList.add("error");

        repeatErrorMessage.textContent =
            "Passwords do not match.";

        repeatInput.closest(".input-box").classList.add("error");

    }else{

        repeatBox.classList.add("success");
        repeatLabel.classList.add("success");

        repeatInput.closest(".input-box").classList.add("success");

    }

    updateExpandedState(
        repeatInput,
        repeatErrorMessage
    );

    checkRegisterButton();

}

repeatInput.addEventListener("input", validateRepeat);

passwordInput.addEventListener("input", validateRepeat);

repeatInput.addEventListener("focus",()=>{

    hideAllErrorMessages();

    updateExpandedState(
        repeatInput,
        repeatErrorMessage
    );

});

repeatInput.addEventListener("blur",()=>{

    updateExpandedState(
        repeatInput,
        repeatErrorMessage
    );

});

const phoneLabel = document.getElementById(
    "registerPhoneLabel"
);

const phoneErrorMessage = document.getElementById(
    "phoneErrorMessage"
);

phoneInput.addEventListener("focus",()=>{
    hideAllErrorMessages();

    if(phoneInput.value===""){
        phoneInput.value="+ ";
    }

    updateFloatingLabel(phoneInput);
    validatePhone();
    checkRegisterButton();
});

function formatPhone(){
    const digits=phoneInput.value.replace(/\D/g,"");

    if(digits===""){
        phoneInput.value="+ ";
        clearPhoneError();
        updateFloatingLabel(phoneInput);
        checkRegisterButton();
        return;
    }

    const formatter=new libphonenumber.AsYouType();
    let formatted=formatter.input("+"+digits);

    formatted=formatted.replace(/^\+/,"+ ");

    phoneInput.value=formatted;

    updateFloatingLabel(phoneInput);
    validatePhone();
    checkRegisterButton();
}

function validatePhone(){
    const value=phoneInput.value
        .replace(/^\+\s*/,"+")
        .trim();

    if(value==="+"){
        clearPhoneError();
        checkRegisterButton();
        return;
    }

    try{
        const phone=libphonenumber.parsePhoneNumber(value);

        if(phone.isValid()){
            clearPhoneError(true);
        }else{
            showPhoneError();
        }

    }catch{
        showPhoneError();
    }

    updateFloatingLabel(phoneInput);
    checkRegisterButton();
}

function showPhoneError(){
    phoneBox.classList.add("error");
    phoneLabel.classList.add("error");

    phoneBox.classList.remove("success");

    phoneErrorMessage.textContent=
        "The phone number is not valid.";

    updateExpandedState(
        phoneInput,
        phoneErrorMessage
    );
}

function clearPhoneError(success=false){
    phoneBox.classList.remove("error");
    phoneLabel.classList.remove("error");

    phoneErrorMessage.textContent="";
    phoneErrorMessage.classList.remove("show");

    if(success){
        phoneBox.classList.add("success");
    }else{
        phoneBox.classList.remove("success");
    }

    updateExpandedState(
        phoneInput,
        phoneErrorMessage
    );
}

phoneInput.addEventListener(
    "input",
    formatPhone
);

phoneInput.addEventListener("change",()=>{
    updateFloatingLabel(phoneInput);
    validatePhone();
    checkRegisterButton();
});

phoneInput.addEventListener("blur",()=>{
    setTimeout(()=>{
        const digits=phoneInput.value.replace(/\D/g,"");

        if(digits===""){
            phoneInput.value="";
            clearPhoneError();
        }else{
            validatePhone();
        }

        updateFloatingLabel(phoneInput);
        checkRegisterButton();

    },150);
});

let lastPhoneValue="";

setInterval(()=>{
    const currentValue=phoneInput.value;

    if(currentValue!==lastPhoneValue){
        lastPhoneValue=currentValue;

        updateFloatingLabel(phoneInput);
        validatePhone();
        checkRegisterButton();
    }

},100);

phoneInput.addEventListener("keydown",(event)=>{
    if(
        (
            event.key==="Backspace" ||
            event.key==="Delete"
        ) &&
        phoneInput.selectionStart<=2
    ){
        event.preventDefault();
    }
});

function checkRegisterButton(){

    const termsCheckbox=
        document.querySelector(
            ".terms-agree input[type='checkbox']"
        );

    const hasErrors=
        document.querySelector(
            ".form-box.register .input-box.error"
        )!==null;

    const phoneValid=
        phoneInput.value
            .replace(/\D/g,"")
            .length>0 &&
        phoneBox.classList.contains("success");

    const completed=
        emailInput.value.trim()!=="" &&
        usernameInput.value.trim()!=="" &&
        passwordInput.value.trim()!=="" &&
        repeatInput.value.trim()!=="" &&
        phoneValid &&
        termsCheckbox?.checked===true;

    registerButton.disabled=
        hasErrors || !completed;
}

function hideErrorMessage(errorElement){
    errorElement.classList.remove("show");
}

function showErrorMessage(errorElement){
    if(errorElement.textContent !== ""){
        errorElement.classList.add("show");
    }
}

usernameInput.addEventListener("input", () =>
    updateFloatingLabel(usernameInput)
);

emailInput.addEventListener("input", () =>
    updateFloatingLabel(emailInput)
);

passwordInput.addEventListener("input", () =>
    updateFloatingLabel(passwordInput)
);

repeatInput.addEventListener("input", () =>
    updateFloatingLabel(repeatInput)
);

phoneInput.addEventListener("input", () =>
    updateFloatingLabel(phoneInput)
);

function showRegistrationLoading(text){

    if(!loadModal){
        console.error("Registration modal #loadModal was not found.");
        return;
    }

    if(loadTitle){
        loadTitle.innerText = text;
    }

    if(loader){
        loader.style.display = "block";
    }

    if(resultIcon){
        resultIcon.classList.add("hidden");
        resultIcon.innerHTML = "";
    }

    loadModal.classList.add("show");
}

async function showRegistrationResult(success,text){

    if(!loadModal){
        return;
    }

    if(loader){
        loader.style.display = "none";
    }

    if(loadTitle){
        loadTitle.innerText = text;
    }

    if(resultIcon){

        resultIcon.classList.remove("hidden");

        resultIcon.innerHTML = success
            ? `
                <div class="result-icon success">
                    <ion-icon name="checkmark"></ion-icon>
                </div>
            `
            : `
                <div class="result-icon failure">
                    <ion-icon name="close"></ion-icon>
                </div>
            `;
    }

    loadModal.classList.add("show");

    await new Promise(resolve=>{
        setTimeout(resolve,2200);
    });

    hideRegistrationModal();
}

function hideRegistrationModal(){

    if(!loadModal){
        return;
    }

    loadModal.classList.remove("show");

    if(loader){
        loader.style.display = "block";
    }

    if(resultIcon){
        resultIcon.classList.add("hidden");
        resultIcon.innerHTML = "";
    }
}

function clearRegistrationForm(){

    emailValidationId++;

    emailInput.value = "";
    usernameInput.value = "";
    passwordInput.value = "";
    repeatInput.value = "";
    phoneInput.value = "";

    lastPhoneValue = "";

    const termsCheckbox =
        document.querySelector(
            ".terms-agree input[type='checkbox']"
        );

    if(termsCheckbox){
        termsCheckbox.checked = false;
    }

    document
        .querySelectorAll(
            "#registerForm .input-box"
        )
        .forEach(box => {

            box.classList.remove(
                "active",
                "error",
                "success",
                "expanded"
            );

        });

    document
        .querySelectorAll(
            "#registerForm label"
        )
        .forEach(label => {

            label.classList.remove(
                "error",
                "success"
            );

        });

    document
        .querySelectorAll(
            "#registerForm .input-error-message"
        )
        .forEach(message => {

            message.textContent = "";
            message.classList.remove("show");

        });

    checkRegisterButton();

}

function getAuthWrapper(){

    return (
        document.querySelector(".wrapper") ||
        document.querySelector(".auth-wrapper") ||
        document.querySelector("#wrapper")
    );

}

function getLoginForm(){

    return (
        document.querySelector(".form-box.login") ||
        document.querySelector("#loginForm")
    );

}

function getRegisterForm(){

    return (
        document.querySelector(".form-box.register") ||
        document.querySelector("#registerForm")
    );

}

function switchToLogin(){

    const loginForm = getLoginForm();
    const registerForm = getRegisterForm();

    registerForm?.classList.remove("active");
    loginForm?.classList.add("active");

}

function closeAuthWrapper(){

    const wrapper = getAuthWrapper();

    if(!wrapper){
        return;
    }

    wrapper.classList.remove("active");

}

function openAuthWrapper(){

    const wrapper = getAuthWrapper();

    if(!wrapper){
        return;
    }

    clearRegistrationForm();

    wrapper.classList.add("active");

    switchToLogin();

}

async function registerUser(){

    const email =
        emailInput.value.trim().toLowerCase();

    const username =
        usernameInput.value.trim();

    const phone =
        phoneInput.value.trim();

    const password =
        passwordInput.value;

    const termsCheckbox =
        document.querySelector(
            ".terms-agree input[type='checkbox']"
        );


    if(
        !email ||
        !username ||
        !password ||
        !phone ||
        !termsCheckbox ||
        !termsCheckbox.checked
    ){

        checkRegisterButton();

        return;

    }


    if(
        document.querySelector(
            ".form-box.register .input-box.error"
        )
    ){

        return;

    }


    registerButton.disabled = true;


    /*
     * LOADING MODAL
     */

    showRegistrationLoading(
        "Creating your account..."
    );


    let firebaseUser = null;


    try{

        /*
         * FIREBASE AUTH
         *
         * Password is stored by Firebase Authentication.
         * It is NOT stored in Firestore.
         */

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        firebaseUser =
            userCredential.user;


        /*
         * FIREBASE VERIFICATION EMAIL
         */

        const verificationLink =await generateVerificationLink(firebaseUser);


        /*
         * FIRESTORE USER DOCUMENT
         *
         * Document ID = user's email
         *
         * ALL FIELD NAMES START LOWERCASE.
         */

        await setDoc(
            doc(db, "users", email),
            {
                email: email,
                username: username,
                phone: phone,
                termsOfService:
                    termsCheckbox.checked,
                accountActivated: false
            }
        );


        /*
         * EMAILJS CONTENT
         */

        const termsOfService = `

<h3 style="
    margin:0 0 18px;
    font-size:20px;
    color:#162938;
">
    Seasons Serials — Terms of Service
</h3>

<p>
    <strong>Effective Date:</strong> August 14, 2026
</p>

<p>
    These Terms of Service ("Terms") govern your use of the
    Seasons Serials website, account system, store, stories,
    pictures, artwork, performances, recordings, subscriptions,
    discounts, digital services, and related features
    (collectively, the "Service").
</p>

<p>
    By creating an account, accessing the Service, purchasing
    a product, using a subscription, accessing Seasons Serials
    content, or otherwise using the Service, you acknowledge
    that you have read, understood, and agreed to these Terms.
</p>


<h4>1. Account Registration</h4>

<p>
    To use certain features of Seasons Serials, you may be
    required to create an account. You agree to provide
    accurate, current, and complete information during
    registration and to keep that information reasonably
    up to date.
</p>

<p>
    You are responsible for maintaining the confidentiality
    of your account credentials and for activities performed
    through your account. You must notify Seasons Serials if
    you believe that your account has been accessed without
    authorization.
</p>

<p>
    You must not create an account using false, misleading,
    fraudulent, or impersonated information, or create an
    account for the purpose of avoiding a previous suspension,
    restriction, or ban.
</p>


<h4>2. Email Verification and Account Activation</h4>

<p>
    A valid email address is required for registration.
    Seasons Serials may require you to verify your email
    address before certain account features become available.
</p>

<p>
    An account that has not completed the required verification
    process may have limited functionality or may be prevented
    from accessing certain parts of the Service.
</p>

<p>
    Verification emails and related authentication features
    may be provided through Firebase Authentication or other
    third-party services used by Seasons Serials.
</p>


<h4>3. User Conduct</h4>

<p>
    You agree to use the Service only for lawful purposes and
    in a manner that does not interfere with its operation,
    security, availability, or integrity.
</p>

<p>
    You must not attempt to gain unauthorized access to another
    user's account, administrative systems, databases, private
    information, or restricted areas of the Service.
</p>

<p>
    You must not intentionally introduce malicious code,
    interfere with authentication systems, manipulate databases,
    bypass security mechanisms, abuse technical vulnerabilities,
    or otherwise attempt to compromise Seasons Serials or its
    users.
</p>

<p>
    You must not impersonate Seasons Serials, a Seasons Serials
    administrator, employee, representative, creator, performer,
    or another user.
</p>


<h4>4. Intellectual Property</h4>

<p>
    Unless expressly stated otherwise, original content created,
    commissioned, published, or distributed by Seasons Serials
    is protected by applicable intellectual-property and
    copyright laws and remains the property of Seasons Serials
    or the applicable rights holder.
</p>

<p>
    Seasons Serials intellectual property may include, without
    limitation, pictures, illustrations, photographs, artwork,
    graphics, designs, logos, visual materials, stories,
    chapters, characters, written works, scripts, performance
    materials, recordings, videos, audio, website designs,
    interface elements, text, promotional materials, digital
    files, and other original creative works.
</p>

<p>
    The fact that content is publicly accessible through the
    Seasons Serials website does not mean that the content is
    free to copy, publish, sell, redistribute, modify, or
    commercially exploit.
</p>


<h4>5. Seasons Serials Pictures and Artwork</h4>

<p>
    Pictures, illustrations, photographs, artwork, graphics,
    designs, and other visual materials created by or for
    Seasons Serials may not be copied, reproduced, republished,
    uploaded, redistributed, sold, licensed, or otherwise
    commercially exploited without prior permission from the
    Seasons Serials administration or the applicable rights
    holder.
</p>

<p>
    You may not take a Seasons Serials picture or artwork and
    publish it on another website, social-media platform,
    marketplace, application, publication, file-sharing
    service, or other platform without permission.
</p>

<p>
    You may not sell Seasons Serials pictures or artwork,
    include them in products for sale, use them in advertising,
    use them as commercial assets, or otherwise attempt to
    obtain financial benefit from them without appropriate
    authorization.
</p>

<p>
    You may not present Seasons Serials artwork as your own
    work, remove ownership or copyright notices, or modify
    Seasons Serials artwork for the purpose of presenting it
    as an independently created work.
</p>

<p>
    Viewing, downloading, purchasing, or otherwise obtaining
    a picture or other visual material does not automatically
    transfer copyright ownership or other intellectual-property
    rights to you.
</p>


<h4>6. Stories and Written Works</h4>

<p>
    Stories, chapters, books, scripts, fictional works,
    characters, descriptions, articles, story concepts, and
    other original written materials published by Seasons
    Serials are protected intellectual property unless
    expressly stated otherwise.
</p>

<p>
    Seasons Serials stories may be read or accessed for
    personal enjoyment where the applicable service permits
    such use.
</p>

<p>
    You may not copy, reproduce, republish, upload, distribute,
    sell, publicly post, commercially exploit, or otherwise
    make Seasons Serials stories or substantial portions of
    them available to other persons without prior authorization.
</p>

<p>
    You may not create or distribute unauthorized copies,
    archives, databases, collections, compilations, or
    substantially reproduced versions of Seasons Serials
    stories or chapters.
</p>

<p>
    You may not claim authorship of Seasons Serials stories
    or substantially reproduce Seasons Serials written works
    and present them as your own.
</p>


<h4>7. Performance Recordings, Videos, and Audio</h4>

<p>
    Performance recordings, videos, photographs of performances,
    audio recordings, rehearsals, backstage recordings, and
    other recorded performance materials associated with
    Seasons Serials may be protected by copyright, performance
    rights, privacy rights, or other applicable rights.
</p>

<p>
    You may not publish, upload, livestream, repost, distribute,
    sell, license, commercially exploit, or otherwise make a
    Seasons Serials performance recording publicly available
    without prior permission from the Seasons Serials
    administration and, where applicable, the relevant rights
    holders or performers.
</p>

<p>
    This restriction applies regardless of whether the recording
    was obtained directly from Seasons Serials, purchased,
    downloaded, recorded by you, received from another person,
    or obtained from another authorized source.
</p>

<p>
    Permission to attend, watch, purchase, or otherwise access
    a performance does not automatically grant permission to
    publish or distribute recordings of that performance.
</p>


<h4>8. Copying, Publishing, and Redistribution</h4>

<p>
    Unless expressly authorized by Seasons Serials, you may
    not reproduce, copy, mirror, scrape, archive for
    redistribution, republish, upload, broadcast, transmit,
    distribute, sell, license, sublicense, rent, modify,
    publicly display, or commercially exploit protected
    Seasons Serials content.
</p>

<p>
    This restriction applies whether the material is distributed
    for money, free of charge, or in exchange for another
    benefit.
</p>

<p>
    Examples of prohibited activity include copying Seasons
    Serials pictures and selling them, uploading Seasons
    Serials artwork to another website, reposting Seasons
    Serials stories, publishing performance recordings without
    permission, creating unauthorized content archives, or
    distributing protected materials through social-media
    platforms, messaging groups, file-sharing services,
    marketplaces, or other channels.
</p>


<h4>9. Personal Use</h4>

<p>
    Where Seasons Serials content is made available for
    personal viewing, reading, or other personal enjoyment,
    you may access that content for personal and non-commercial
    purposes, provided that your use does not violate these
    Terms or applicable law.
</p>

<p>
    Personal access does not constitute a transfer of copyright,
    ownership, licensing rights, or other intellectual-property
    rights.
</p>


<h4>10. Permission to Use Protected Content</h4>

<p>
    If you wish to reproduce, publish, distribute, modify,
    publicly display, perform, sell, or otherwise use protected
    Seasons Serials content beyond permitted personal use,
    you must obtain permission before doing so.
</p>

<p>
    Permission must be obtained from the Seasons Serials
    administration or another person expressly authorized to
    grant the applicable rights.
</p>

<p>
    Permission to use one specific piece of content does not
    automatically grant permission to use other Seasons Serials
    content unless the written permission expressly states
    otherwise.
</p>


<h4>11. Store and Product Reservations</h4>

<p>
    Product availability, reservation periods, prices,
    descriptions, and related information may change from
    time to time.
</p>

<p>
    A reservation does not necessarily constitute a completed
    purchase unless the applicable purchase process has been
    successfully completed.
</p>

<p>
    Seasons Serials may release or cancel reservations when
    their applicable reservation period expires or when
    reasonably necessary to operate the Service.
</p>


<h4>12. Payments and Transactions</h4>

<p>
    Where purchases, subscriptions, or payments are supported,
    you agree to provide accurate transaction information and
    comply with the applicable payment provider's terms.
</p>

<p>
    Seasons Serials reserves the right to correct accidental
    pricing, availability, description, technical, or
    transaction errors where reasonably necessary.
</p>


<h4>13. Subscriptions and Services</h4>

<p>
    Certain Seasons Serials content or features may be
    provided through subscriptions or other services.
</p>

<p>
    Subscription access is personal to the applicable account
    unless Seasons Serials expressly permits otherwise.
    You must not share, resell, transfer, or commercially
    exploit subscription access without authorization.
</p>

<p>
    A violation of these Terms may result in the suspension,
    restriction, or termination of one or more Seasons Serials
    subscriptions or services associated with the violating
    account.
</p>


<h4>14. Discounts and Promotional Benefits</h4>

<p>
    Discounts, promotional codes, special offers, loyalty
    benefits, and other promotional advantages may be subject
    to additional conditions.
</p>

<p>
    Promotional benefits may not be transferred, resold,
    duplicated, manipulated, abused, or used to circumvent
    restrictions established by Seasons Serials.
</p>

<p>
    If an account is reasonably determined to have abused,
    fraudulently obtained, or improperly used a discount,
    promotional code, or other benefit, Seasons Serials may
    cancel or revoke the applicable benefit.
</p>

<p>
    Where appropriate, Seasons Serials may also restrict the
    account's ability to receive future discounts or
    promotional benefits.
</p>


<h4>15. User Content</h4>

<p>
    If the Service allows users to submit reviews, messages,
    comments, feedback, images, or other content, you remain
    responsible for the content you submit.
</p>

<p>
    You must not submit content that is unlawful, infringing,
    abusive, threatening, fraudulent, misleading, malicious,
    or otherwise inappropriate for the Service.
</p>


<h4>16. Reporting Intellectual-Property Violations</h4>

<p>
    If you believe that Seasons Serials content or another
    user's content is being used in a manner that violates
    applicable intellectual-property rights or these Terms,
    you may contact the Seasons Serials administration through
    the official contact channels.
</p>

<p>
    Seasons Serials may investigate reported violations and
    may remove, restrict, or disable access to content where
    reasonably necessary.
</p>


<h4>17. Violations and Enforcement</h4>

<p>
    Seasons Serials takes violations of these Terms seriously.
    If Seasons Serials reasonably determines that an account
    or user has violated these Terms, Seasons Serials may take
    one or more enforcement actions depending on the nature,
    seriousness, frequency, and circumstances of the violation.
</p>

<p>
    Possible enforcement actions include, without limitation:
</p>

<ul>

    <li>
        removal or restriction of violating content;
    </li>

    <li>
        issuing a warning or formal notice;
    </li>

    <li>
        temporarily suspending the account;
    </li>

    <li>
        permanently terminating or banning the account;
    </li>

    <li>
        suspending or terminating subscriptions;
    </li>

    <li>
        suspending or terminating access to Seasons Serials
        services;
    </li>

    <li>
        cancelling or revoking discounts, promotional codes,
        or other promotional benefits;
    </li>

    <li>
        cancelling or restricting reservations or other
        benefits associated with the account;
    </li>

    <li>
        restricting access to particular features;
    </li>

    <li>
        restricting future account creation where reasonably
        necessary; and
    </li>

    <li>
        taking other reasonable measures necessary to protect
        Seasons Serials, its users, creators, performers,
        content, or services.
    </li>

</ul>

<p>
    Seasons Serials may apply multiple enforcement actions
    at the same time. For example, a serious unauthorized
    publication or commercial sale of Seasons Serials
    intellectual property may result in removal of the
    material, cancellation of promotional benefits,
    suspension of subscriptions, and permanent account
    termination.
</p>

<p>
    The severity of an enforcement action may depend on
    factors including the seriousness of the violation,
    whether the violation was intentional, whether the user
    has previously violated these Terms, whether the violation
    caused harm to Seasons Serials or another person, and
    whether the violation involved commercial exploitation.
</p>

<p>
    Seasons Serials may also pursue other remedies or take
    further action where permitted or required by applicable
    law.
</p>


<h4>18. Circumvention of Suspensions or Bans</h4>

<p>
    You must not attempt to circumvent a suspension,
    termination, restriction, or ban by creating another
    account, using another person's account, falsifying
    registration information, or otherwise attempting to
    regain access without authorization.
</p>

<p>
    Attempts to circumvent an enforcement action may result
    in additional restrictions or termination of related
    accounts or services, to the extent permitted by
    applicable law.
</p>


<h4>19. Privacy</h4>

<p>
    Information associated with your account may be processed
    for authentication, account management, customer support,
    transaction processing, security, and operation of the
    Service.
</p>

<p>
    Authentication information such as your password is
    handled by the authentication system and is not included
    in the Seasons Serials registration email.
</p>


<h4>20. Third-Party Services</h4>

<p>
    Seasons Serials may rely on third-party services,
    including authentication, database, email, hosting,
    analytics, payment, security, or other infrastructure
    providers.
</p>

<p>
    Availability or operation of certain features may depend
    on those third-party services.
</p>


<h4>21. Service Availability</h4>

<p>
    Seasons Serials does not guarantee that the Service will
    always be available, uninterrupted, completely error-free,
    secure against every possible threat, or compatible with
    every device, browser, network, or software environment.
</p>


<h4>22. Changes to the Service</h4>

<p>
    Seasons Serials may modify, add, suspend, or discontinue
    features, services, content, subscriptions, products,
    or other parts of the Service from time to time.
</p>


<h4>23. Changes to These Terms</h4>

<p>
    These Terms may be updated from time to time as Seasons
    Serials develops its features, services, policies, and
    practices.
</p>

<p>
    Updated Terms may be published through the Service.
    Continued use of the Service after an applicable update
    may constitute acceptance of the updated Terms to the
    extent permitted by applicable law.
</p>


<h4>24. Disclaimer</h4>

<p>
    The Service is provided on an "as available" basis to the
    extent permitted by applicable law. Seasons Serials does
    not make guarantees beyond those expressly provided by
    applicable law.
</p>


<h4>25. Limitation of Liability</h4>

<p>
    To the maximum extent permitted by applicable law,
    Seasons Serials shall not be responsible for indirect,
    incidental, special, consequential, or similar losses
    arising from use of or inability to use the Service.
</p>


<h4>26. Applicable Law</h4>

<p>
    These Terms are subject to applicable law. Nothing in
    these Terms is intended to remove or restrict rights or
    protections that cannot lawfully be excluded or limited.
</p>


<h4>27. Contact</h4>

<p>
    Questions regarding these Terms, permissions to use
    Seasons Serials content, intellectual-property matters,
    or the operation of the Service should be directed
    through the official contact channels provided by
    Seasons Serials.
</p>


<h4>28. Acceptance of These Terms</h4>

<p>
    By creating a Seasons Serials account, checking the Terms
    of Service agreement box, purchasing or subscribing to a
    Seasons Serials service, or otherwise using the Service,
    you acknowledge that you have read and understood these
    Terms and agree to comply with them.
</p>

<p style="
    margin-top:24px;
    padding:16px;
    background:#f4f7fa;
    border-radius:10px;
">
    By registering your Seasons Serials account, you confirm
    that you agree to these Terms of Service, including the
    intellectual-property protections, content restrictions,
    subscription rules, and enforcement provisions described
    above.
</p>

`;

        const emailContent = `

<div style="
    margin:0;
    padding:0;
    width:100%;
    background:#eef2f5;
    font-family:Arial,Helvetica,sans-serif;
">

    <div style="
        width:100%;
        max-width:720px;
        margin:0 auto;
        background:#ffffff;
    ">


        <!-- HEADER -->

        <div style="
            background:#162938;
            padding:42px 30px;
            text-align:center;
            color:#ffffff;
        ">

            <div style="
                font-size:28px;
                font-weight:700;
                letter-spacing:-.5px;
            ">
                Seasons Serials
            </div>

            <div style="
                margin-top:9px;
                font-size:13px;
                color:rgba(255,255,255,.70);
                letter-spacing:.5px;
            ">
                Registration Successful
            </div>

        </div>


        <!-- WELCOME -->

        <div style="
            padding:34px 30px 10px;
            text-align:center;
        ">

            <h2 style="
                margin:12px 0 0;
                font-size:27px;
                color:#162938;
            ">
                Welcome, ${escapeHtml(username)}!
            </h2>

            <p style="
                margin:12px 0 0;
                font-size:15px;
                line-height:1.7;
                color:#667580;
            ">
                Your Seasons Serials account is ready.
            </p>

        </div>


        <!-- ACCOUNT INFORMATION -->

        <div style="
            margin:28px 30px;
            background:#f6f8fa;
            border:1px solid #e8edf0;
            border-radius:14px;
            padding:24px;
        ">

            <div style="
                font-size:10px;
                color:#7a8994;
                margin-bottom:18px;
                text-transform:uppercase;
                letter-spacing:1.4px;
                font-weight:700;
            ">
                Account information
            </div>


            <p style="
                margin:11px 0;
                font-size:14px;
                color:#344552;
            ">
                <strong style="color:#162938;">
                    Email
                </strong>
                <br>
                ${escapeHtml(email)}
            </p>


            <p style="
                margin:17px 0;
                font-size:14px;
                color:#344552;
            ">
                <strong style="color:#162938;">
                    Username
                </strong>
                <br>
                ${escapeHtml(username)}
            </p>


            <p style="
                margin:11px 0 0;
                font-size:14px;
                color:#344552;
            ">
                <strong style="color:#162938;">
                    Phone
                </strong>
                <br>
                ${escapeHtml(phone)}
            </p>

        </div>


        <!-- TERMS SUMMARY -->

        <div style="
            margin:26px 30px;
            border-left:4px solid #162938;
            background:#f8fafb;
            padding:17px 19px;
            border-radius:7px;
        ">

            <div style="
                font-weight:bold;
                margin-bottom:7px;
                font-size:14px;
                color:#162938;
            ">
                Terms of Service
            </div>


            <p style="
                margin:0;
                font-size:13px;
                line-height:1.6;
                color:#667580;
            ">
                When creating your Seasons Serials account,
                you agreed to the
                <a
                    href="https://seasons-serials.vercel.app/terms-of-service.html"
                    target="_blank"
                    style="
                        color:#162938;
                        font-weight:600;
                        text-decoration:none;
                    "
                >
                    Terms of Service
                </a>
                and acknowledged the
                <a
                    href="https://seasons-serials.vercel.app/privacy-policy.html"
                    target="_blank"
                    style="
                        color:#162938;
                        font-weight:600;
                        text-decoration:none;
                    "
                >
                    Privacy Policy
                </a>.
            </p>


            <div style="
                margin-top:14px;
            ">

                <a
                    href="https://seasons-serials.vercel.app/terms-of-service.html"
                    target="_blank"
                    style="
                        display:inline-block;
                        color:#162938;
                        font-size:13px;
                        font-weight:700;
                        text-decoration:none;
                        border-bottom:1px solid #162938;
                        padding-bottom:2px;
                    "
                >
                    Read Terms of Service
                </a>


                <span style="
                    display:inline-block;
                    margin:0 8px;
                    color:#a5afb5;
                ">
                    •
                </span>


                <a
                    href="https://seasons-serials.vercel.app/privacy-policy.html"
                    target="_blank"
                    style="
                        display:inline-block;
                        color:#162938;
                        font-size:13px;
                        font-weight:700;
                        text-decoration:none;
                    "
                >
                    Read Privacy Policy
                </a>

            </div>

        </div>


        <!-- FULL TERMS -->

        <div style="
            margin:32px 30px;
            padding:26px;
            background:#f8fafb;
            border:1px solid #e5eaee;
            border-radius:14px;
        ">

            <div style="
                display:inline-block;
                padding:6px 10px;
                background:#162938;
                color:#ffffff;
                border-radius:6px;
                font-size:10px;
                font-weight:700;
                letter-spacing:1px;
                text-transform:uppercase;
                margin-bottom:15px;
            ">
                Legal
            </div>


            ${termsOfService}

        </div>


        <!-- ACTIVATION -->

        <div style="
            padding:4px 30px 0;
            text-align:center;
        ">

            <a
                href="${verificationLink}"
                target="_blank"
                style="
                    display:inline-block;
                    padding:15px 34px;
                    background:#162938;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:9px;
                    font-size:15px;
                    font-weight:600;
                "
            >
                Activate Account
            </a>

        </div>


        <p style="
            margin:18px 30px 0;
            font-size:13px;
            line-height:1.65;
            color:#87939b;
            text-align:center;
        ">
            Click the button above to verify your email
            address and activate your Seasons Serials account.
        </p>


        <!-- SECURITY NOTE -->

        <div style="
            height:1px;
            background:#e8edf0;
            margin:30px 30px;
        "></div>


        <p style="
            margin:0 30px 30px;
            font-size:12px;
            line-height:1.6;
            color:#9aa4aa;
            text-align:center;
        ">
            Your password is protected by Firebase
            Authentication and is never included in
            this email.
        </p>


        <!-- FOOTER -->

        <div style="
            background:#f1f4f6;
            padding:18px 20px;
            text-align:center;
            font-size:12px;
            color:#7d8990;
        ">
            © Seasons Serials — All rights reserved
        </div>


    </div>

</div>

`;


        /*
         * SEND EMAILJS EMAIL
         */

        await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
                to_email: email,
                subject: "Welcome to Seasons Serials — Activate Your Account",
                content: emailContent
            }
        );


        /*
         * SIGN OUT
         */

        await auth.signOut();


        /*
         * CLEAR ALL REGISTER FIELDS
         */

        emailInput.value = "";
        usernameInput.value = "";
        passwordInput.value = "";
        repeatInput.value = "";
        phoneInput.value = "";

        termsCheckbox.checked = false;


        /*
         * CLEAR ALL REGISTER VISUAL STATES
         */

        document
            .querySelectorAll(
                ".form-box.register .input-box"
            )
            .forEach(box => {

                box.classList.remove(
                    "active",
                    "error",
                    "success",
                    "expanded"
                );

            });


        document
            .querySelectorAll(
                ".form-box.register .input-error-message"
            )
            .forEach(message => {

                message.textContent = "";

                message.classList.remove(
                    "show"
                );

            });


        /*
         * SUCCESS MODAL
         */

        await showRegistrationResult(
            true,
            "Account Created!"
        );

        markRegistrationCompleted();
        switchToLogin();
        closeAuthWrapper();
        checkRegisterButton();

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                showVerificationNotice();
            });
        });


    }catch(error){


        /*
         * EXPECTED AUTH ERROR:
         * EMAIL ALREADY EXISTS
         */

        if(
            error.code ===
            "auth/email-already-in-use"
        ){

            hideRegistrationModal();

            showEmailError(
                "This email is already registered."
            );

            updateExpandedState(
                emailInput,
                emailErrorMessage
            );

            registerButton.disabled = true;

            return;

        }


        /*
         * INVALID EMAIL
         */

        if(
            error.code ===
            "auth/invalid-email"
        ){

            hideRegistrationModal();

            showEmailError(
                "Please enter a valid email address."
            );

            updateExpandedState(
                emailInput,
                emailErrorMessage
            );

            registerButton.disabled = true;

            return;

        }


        /*
         * WEAK PASSWORD
         */

        if(
            error.code ===
            "auth/weak-password"
        ){

            hideRegistrationModal();

            showPasswordRegistrationError(
                "The password is too weak."
            );

            registerButton.disabled = true;

            return;

        }


        /*
         * AUTHENTICATION NOT ENABLED
         */

        if(
            error.code ===
            "auth/operation-not-allowed"
        ){

            await showRegistrationResult(
                false,
                "Registration Unavailable"
            );

            registerButton.disabled = false;

            return;

        }


        /*
         * SOMETHING ELSE REALLY FAILED
         */

        console.error(
            "Registration error:",
            error
        );


        await showRegistrationResult(
            false,
            "Registration Failed"
        );


        registerButton.disabled = false;

    }

}

function escapeHtml(value){

    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

function showPasswordRegistrationError(message){

    passwordBox.classList.add("error");
    passwordLabel.classList.add("error");

    passwordBox.classList.remove("success");
    passwordLabel.classList.remove("success");

    passwordErrorMessage.textContent = message;
    passwordErrorMessage.classList.add("show");

    passwordInput
        .closest(".input-box")
        .classList.add("error");

    updateExpandedState(
        passwordInput,
        passwordErrorMessage
    );

}

const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await registerUser();
});

window.clearRegistrationStates = clearRegistrationStates;

function markRegistrationCompleted(){

    sessionStorage.setItem(
        "registrationCompleted",
        "true"
    );

}

document.addEventListener("DOMContentLoaded",()=>{

    if(
        sessionStorage.getItem(
            "registrationCompleted"
        ) === "true"
    ){

        switchToLogin();

    }

});
