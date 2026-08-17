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

    const idToken =
        await firebaseUser.getIdToken();

    const response =
        await fetch("/api/generate-verification-link", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
            }
        });

    if(!response.ok){
        throw new Error(
            "Unable to generate verification link."
        );
    }

    const data =
        await response.json();

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

function updateExpandedState(input,errorMessage){

    const box = input.closest(".input-box");

    errorMessage.classList.remove("show");
    box.classList.remove("expanded");

    if(box.classList.contains("error")){

        box.classList.add("expanded");

        if(document.activeElement === input){
            errorMessage.classList.add("show");
        }

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
    emailErrorMessage.classList.add("show");
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

    phoneErrorMessage.classList.add("show");

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

        const termsOfService=`

        <h3 style="margin:0 0 18px; font-size:20px; color:#162938;">Seasons Serials — Terms of Service</h3>

        <p>
            <strong>Effective Date:</strong> August 14, 2026
        </p>

        <p>
            These Terms of Service ("Terms") govern your use of the
            Seasons Serials website, account system, store, digital
            services, and related features (collectively, the "Service").
            By creating an account or using the Service, you acknowledge
            that you have read, understood, and agreed to these Terms.
        </p>

<h4>1. Account Registration</h4>

<p>
    To use certain features of Seasons Serials, you may be
    required to create an account. You agree to provide
    accurate, current, and complete information during
    registration and to keep that information up to date.
</p>

<p>
    You are responsible for maintaining the confidentiality
    of your account credentials and for activities performed
    through your account. You must notify Seasons Serials if
    you believe that your account has been accessed without
    authorization.
</p>

<h4>2. Email Verification</h4>

<p>
    A valid email address is required for registration.
    Seasons Serials may require you to verify your email
    address before certain account features become available.
</p>

<p>
    Verification emails may be delivered by Firebase
    Authentication or other service providers used by
    Seasons Serials.
</p>

<h4>3. User Conduct</h4>

<p>
    You agree not to misuse the Service, interfere with its
    operation, attempt to gain unauthorized access to systems
    or accounts, submit malicious code, impersonate another
    person, or use the Service for unlawful purposes.
</p>

<h4>4. Store and Product Reservations</h4>

<p>
    Product availability, reservation periods, prices, and
    related information may change without notice.
    A reservation does not necessarily constitute a completed
    purchase unless the applicable purchase process has been
    successfully completed.
</p>

<p>
    Seasons Serials may release reservations automatically
    when their applicable reservation period expires.
</p>

<h4>5. Payments and Transactions</h4>

<p>
    Where purchases or payments are supported, you agree to
    provide accurate transaction information and to comply
    with the applicable payment provider's terms.
</p>

<p>
    Seasons Serials reserves the right to correct pricing,
    availability, description, or transaction errors when
    reasonably necessary.
</p>

<h4>6. Intellectual Property</h4>

<p>
    Unless otherwise stated, the Seasons Serials name,
    branding, interface design, original text, graphics,
    software, and other original materials are owned by or
    licensed to Seasons Serials.
</p>

<p>
    You may not reproduce, redistribute, modify, publicly
    display, commercially exploit, or otherwise use protected
    materials without appropriate authorization.
</p>

<h4>7. User Content</h4>

<p>
    If the Service allows you to submit reviews, messages,
    feedback, or other content, you remain responsible for
    that content and agree not to submit unlawful,
    infringing, abusive, misleading, or malicious material.
</p>

<h4>8. Privacy</h4>

<p>
    Information associated with your account may be processed
    for authentication, account management, customer support,
    transaction processing, security, and operation of the
    Service.
</p>

<p>
    Authentication information such as your password is handled
    by the authentication system and is not included in the
    Seasons Serials registration email.
</p>

<h4>9. Third-Party Services</h4>

<p>
    Seasons Serials may rely on third-party services,
    including authentication, database, email, hosting,
    analytics, payment, or other infrastructure providers.
    Availability of third-party services may affect certain
    features of the Service.
</p>

<h4>10. Service Availability</h4>

<p>
    Seasons Serials does not guarantee that the Service will
    always be available, uninterrupted, completely error-free,
    or compatible with every device, browser, or network.
</p>

<h4>11. Account Suspension or Termination</h4>

<p>
    Seasons Serials may restrict, suspend, or terminate an
    account where reasonably necessary to protect the Service,
    its users, its infrastructure, or to address violations
    of these Terms or applicable law.
</p>

<h4>12. Changes to These Terms</h4>

<p>
    These Terms may be updated from time to time as Seasons
    Serials develops its features, policies, and services.
    Updated Terms may be published through the Service.
</p>

<h4>13. Disclaimer</h4>

<p>
    The Service is provided on an "as available" basis to the
    extent permitted by applicable law. Seasons Serials does
    not make guarantees beyond those expressly provided by
    applicable law.
</p>

<h4>14. Limitation of Liability</h4>

<p>
    To the maximum extent permitted by applicable law,
    Seasons Serials shall not be responsible for indirect,
    incidental, special, consequential, or similar losses
    arising from use of the Service.
</p>

<h4>15. Contact</h4>

<p>
    Questions regarding these Terms or the Seasons Serials
    Service should be directed through the official contact
    channels provided by Seasons Serials.
</p>

<p style="
    margin-top:24px;
    padding:16px;
    background:#f4f7fa;
    border-radius:10px;
">
    By registering your Seasons Serials account, you confirmed
    that you agree to these Terms of Service.
</p>

`;

        const emailContent = `

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


        <div style="
    text-align:center;
    margin-bottom:32px;
">

    <h2 style="
        margin:0;
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


            <div style="
    background:#f6f8fa;
    border:1px solid #e8edf0;
    border-radius:14px;
    padding:24px;
    margin:28px 0;
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
        <strong style="color:#162938;">Email</strong><br>
        ${escapeHtml(email)}
    </p>

    <p style="
        margin:17px 0;
        font-size:14px;
        color:#344552;
    ">
        <strong style="color:#162938;">Username</strong><br>
        ${escapeHtml(username)}
    </p>

    <p style="
        margin:11px 0 0;
        font-size:14px;
        color:#344552;
    ">
        <strong style="color:#162938;">Phone</strong><br>
        ${escapeHtml(phone)}
    </p>

</div>


            <div style="
                border-left:4px solid #162938;
                background:#f8fafb;
                padding:17px 19px;
                margin:26px 0;
                border-radius:7px;
            ">

                <div style="
                    font-weight:bold;
                    margin-bottom:7px;
                    font-size:14px;
                ">
                    Terms of Service
                </div>

                <div style="
    margin:32px 0;
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

            </div>


            <div style="
                text-align:center;
                margin:32px 0;
            ">

                <a
    href="${verificationLink}"
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
                margin:0;
                font-size:13px;
                line-height:1.65;
                color:#87939b;
                text-align:center;
            ">
                Click the button above to verify your email
address and activate your Seasons Serials account.
            </p>


            <div style="
                height:1px;
                background:#e8edf0;
                margin:30px 0;
            "></div>


            <p style="
                margin:0;
                font-size:12px;
                line-height:1.6;
                color:#9aa4aa;
                text-align:center;
            ">
                Your password is protected by Firebase
                Authentication and is never included in
                this email.
            </p>

        </div>


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
                subject: "Welcome to Seasons Serials — Verify Your Account",
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
