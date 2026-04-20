import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { deleteDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";


// 🚫 Prevent spam: same product + same error
const adminFailureTracker = {};

const filters = document.querySelectorAll(".filter-type-all-products");

const holders = {
    pictures: document.getElementById("picturesProductHolder"),
    stories: document.getElementById("storiesProductHolder"),
    handcrafts: null,
    decorations: null,
    tickets: null
};

const filterBtn = document.getElementById("filterBtn");

// Hide all
function hideAllHolders() {
    Object.values(holders).forEach(holder => {
        if (holder) holder.style.display = "none";
    });
}

// Show all
function showAllHolders() {
    Object.values(holders).forEach(holder => {
        if (holder) holder.style.display = "block";
    });
}

// Remove active class
function removeActive() {
    filters.forEach(f => f.classList.remove("active-filter"));
}

// Click logic
filters.forEach(filter => {
    filter.addEventListener("click", () => {
        const category = filter.dataset.category;

        // Highlight active
        removeActive();
        filter.classList.add("active-filter");

        // Update dropdown label
        filterBtn.textContent = filter.textContent + " ▾";

        if (category === "all") {
            showAllHolders();
            return;
        }

        hideAllHolders();

        if (holders[category]) {
            holders[category].style.display = "block";
        }
    });
});

const searchInput = document.getElementById("searchInput");
const allProducts = document.querySelectorAll(".sale-product-box");

searchInput.addEventListener("input", () => {
    let query = searchInput.value.trim().toLowerCase();

    // 🔥 replace ’ with '
    query = query.replace(/’/g, "'");

    // 👉 EMPTY → FULL RESET (REAL RESET)
    if (query === "") {
        allProducts.forEach(p => p.style.display = "block");

        Object.values(holders).forEach(holder => {
            if (holder) holder.style.display = "block";
        });

        document.querySelectorAll(".products-type").forEach(t => {
            t.style.display = "block";
        });

        removeNoResultsMessages();

        return;
    }

    // 👉 SEARCH MODE
    Object.values(holders).forEach(holder => {
        if (holder) holder.style.display = "block";
    });

    let anyGlobalMatch = false;

    Object.values(holders).forEach(holder => {
        if (!holder) return;

        const products = holder.querySelectorAll(".sale-product-box");
        const title = holder.querySelector(".products-type");

        let categoryMatch = false;

        products.forEach(product => {
            const nameEl = product.querySelector(".product-name");
            if (!nameEl) return;

            let productName = nameEl.textContent
                .replace(/"/g, "")
                .replace(/’/g, "'")
                .toLowerCase();

            if (productName.includes(query)) {
                product.style.display = "block";
                categoryMatch = true;
                anyGlobalMatch = true;
            } else {
                product.style.display = "none";
            }
        });

        // 🔥 SHOW / HIDE CATEGORY TITLE
        if (title) {
            title.style.display = categoryMatch ? "block" : "none";
        }

        // 🔥 SHOW EMPTY STATE
        handleEmptyCategory(holder, categoryMatch, query);
    });

    if (!anyGlobalMatch) {
        // optional: global "no results"
    }
});

function handleEmptyCategory(holder, hasMatch, query) {
    let emptyBox = holder.querySelector(".empty-category");

    if (!hasMatch) {
        if (!emptyBox) {
            emptyBox = document.createElement("div");
            emptyBox.className = "empty-category";

            emptyBox.innerHTML = `
                <img src="no-payment-yet.png" alt="no-results">
                <span class="no-payment-yet-text">
                    No product matching "${query}"
                </span>
            `;

            holder.appendChild(emptyBox);
        }
    } else {
        if (emptyBox) emptyBox.remove();
    }
}

function removeNoResultsMessages() {
    document.querySelectorAll(".empty-category").forEach(el => el.remove());
}


async function saveInvoiceToUser(email, invoiceData) {
  try {
    console.log("🔥 START SAVING", email, invoiceData);

    const userRef = doc(db, "users", email);
    
    await setDoc(userRef, { email: email }, { merge: true })
      .then(() => {
        console.log("WRITE SUCCESS");
      })
      .catch((err) => {
        alert("WRITE FAILED: " + err.message);
      });

    console.log("DOCUMENT OKAY");
    
    const invoiceRef = doc(
      db,
      "users",
      email,
      "invoices",
      invoiceData.invoiceId
    );

    console.log("CREATING DOC...");

    await setDoc(invoiceRef, {
      ...invoiceData,
      createdAt: Date.now()
    });

    console.log("✅ Invoice saved to Firestore");

  } catch (error) {
    console.error("❌ REAL FIRESTORE ERROR:", error);
    alert(error.message); // 👈 YOU NEED THIS
  }
}

// Default: show all
document.querySelector('[data-category="all"]').click();

async function runAutomationChecks() {
  const productsSnap = await getDocs(collection(db, "products"));

  for (const docSnap of productsSnap.docs) {
    const data = docSnap.data();
    const now = Date.now();

    // 🟡 1. SEND 12h REMINDER
    if (
      data.status === "reserved" &&
      !data.reminderSent &&
      now >= data.reminderAt &&
      !data.isPaid // 🔥 THIS STOPS EMAIL
    ) {
      await emailjs.send("service_newemail1", "template_tan46u4", {
        to_email: data.reservedBy,
        subject: `Reminder: "${data.productName}" expires in 12 hours`,
        content: buildReminderEmail(data)
      });

      await updateDoc(docSnap.ref, { reminderSent: true });
    }

    // 🟠 2. SEND 2h WARNING
    if (
      data.status === "reserved" &&
      !data.warningSent &&
      now >= data.warningAt &&
      !data.isPaid // 🔥 THIS STOPS EMAIL
    ) {
      await emailjs.send("service_newemail1", "template_tan46u4", {
        to_email: data.reservedBy,
        subject: `Reservation for "${data.productName}" expires in 2 hours`,
        content: buildWarningEmail(data)
      });

      await updateDoc(docSnap.ref, { warningSent: true });
    }

    // 🔴 3. AUTO RELEASE
    if (
      data.status === "reserved" &&
      now >= data.reservedUntil
    ) {
      await updateDoc(docSnap.ref, {
        status: "available",
        reservedUntil: 0,
        reservedBy: "",
        reminderSent: false,
        warningSent: false
      });
    }
  }
}


document.addEventListener("DOMContentLoaded", () => {

  runAutomationChecks();

  setInterval(runAutomationChecks, 5 * 60 * 1000); // every 5 min

  let selectedProduct = null;
  let appliedDiscount = null;
  let originalPriceNumber = 0;
  let currentDiscountValue = 0;
  let currentDiscountId = null;
  let originalPrice = 0;
  let previewDiscountValue = 0;
  let reservationInterval = null;
  let activeReservationProduct = null; // 👈 CRITICAL


  emailjs.init("x6kHcpv6XN2lZmOea");

  const products = [
    { id: "saleProductOne", btn: "buyBtnOne" },
    { id: "saleProductTwo", btn: "buyBtnTwo" },
    { id: "saleProductThree", btn: "buyBtnThree" },
    { id: "saleProductFour", btn: "buyBtnFour" },
    { id: "saleProductFive", btn: "buyBtnFive" },
    { id: "saleProductSix", btn: "buyBtnSix" }
  ];


  const promoInput = document.getElementById("promoCodeInput");
  const applyBtn = document.getElementById("applyDiscountBtn");
  const confirmBtn = document.getElementById("confirmCheckoutBtn");
  const discountMessage = document.getElementById("discountMessage");

  function applyDiscountToPrice(value){
    const newPrice = originalPrice - (originalPrice * value);
    document.getElementById("checkoutProductPrice").innerHTML =
        `<span style="text-decoration:line-through; opacity:0.6">
          ${originalPrice.toFixed(2)}€ 
        </span> 
        <span style="color:green; font-weight:600">
           ${newPrice.toFixed(2)}€
        </span>`;
  }

  function resetPrice(){
    document.getElementById("checkoutProductPrice").innerText =
        originalPrice.toFixed(2) + "€";
  }

  function markProductReserved(button){
    button.classList.add("reserved-state");
    button.disabled = true;
  }

  function setDiscountMessage(text,color){
    discountMessage.textContent = text;
    discountMessage.style.color = color;
  
    const promoBox = document.querySelector(".checkout-input-box");
  
    if(color){
      promoBox.style.borderBottom = "2px solid " + color;
    }else{
      promoBox.style.borderBottom = "2px solid #162938";
    }
  }

  function removeUsedDiscountByCode(discountCode){
    const container = document.getElementById("discounts");
    if(!container) return;
  
    const discountBlocks = container.children;
    for(let i=0; i<discountBlocks.length; i++){
      const block = discountBlocks[i];
      const codeEl = block.querySelector(".discount-info"); // assuming first .discount-info is the promo code
      if(codeEl && codeEl.innerText.trim() === discountCode){
        block.remove();
        break;
      }
    }
  
    if(container.children.length === 0){
      container.innerHTML = `<img src="no-payment-yet.png" alt="no-more-discounts">`;
    }
  }

  function sendDiscountEmail(email, code, product){

    emailjs.send("service_newemail1","template_5hyjmbt",{
    
    to_email: email,
    promo_code: code,
    product_name: product
    
    });
    
  }

  applyBtn.disabled = true;
  applyBtn.style.cursor = "not-allowed";
  
  let matchedDiscountDoc = null;
  
  // 🔎 CHECK ALL DISCOUNTS WHILE TYPING
  promoInput.addEventListener("input", async () => {
    const typedCode = promoInput.value.trim(); // remove spaces, but keep exact ID
    matchedDiscountDoc = null;
    
    setDiscountMessage("", "");
  
    if (!typedCode) {
      previewDiscountValue = 0;
      matchedDiscountDoc = null;
      resetPrice();
      applyBtn.disabled = true;
      applyBtn.style.cursor = "not-allowed";
      return;
    }
  
    try {
      const docRef = doc(db, "discounts", typedCode);
      const snap = await getDoc(docRef);
      if (promoInput.value.trim() !== typedCode) {
        return;
      }
      if (!snap.exists()) {
        previewDiscountValue = 0;
        setDiscountMessage("Please enter a valid promocode","red");
        resetPrice();
        matchedDiscountDoc = null;
        return;
      }
      matchedDiscountDoc = snap;  

      if (!matchedDiscountDoc) {
        previewDiscountValue = 0;
        setDiscountMessage("Please enter a valid promocode", "red");
        resetPrice();
        return;
      }
  
      const data = matchedDiscountDoc.data();

      if (data.status === "used") {
        previewDiscountValue = 0;
        setDiscountMessage("This promocode is already used", "red");
        resetPrice();
        applyBtn.disabled = true;
        applyBtn.style.cursor = "not-allowed";
      }
      
      else if (data.status === "available") {
        setDiscountMessage("This promocode is valid", "green");
        previewDiscountValue = parseFloat(data.value);
        applyDiscountToPrice(previewDiscountValue);
        applyBtn.disabled = false;
        applyBtn.style.cursor = "pointer";
      }

      else {
        setDiscountMessage("Invalid promocode status", "red");
        resetPrice();
      }
  
    } catch (error) {
      console.error("Firestore error details:", error);
      alert("Firestore error: " + error.message);
    }
  });
  
  
  
  // ✅ APPLY BUTTON
  applyBtn.addEventListener("click", async () => {
    if (!matchedDiscountDoc) {
      setDiscountMessage("Invalid promocode", "red");
      return;
    }
  
    const data = matchedDiscountDoc.data();
  
    if (data.status !== "available") {
      setDiscountMessage("This promocode cannot be used", "red");
      return;
    }
  
    try {
      const docRef = doc(db, "discounts", matchedDiscountDoc.id);
  
      // ✅ Mark the discount as used in Firestore
      await updateDoc(docRef, { status: "used" });
  
      // ✅ Remove the discount from the personal area
      if (data.responsableId) {
        removeUsedDiscountByCode(matchedDiscountDoc.id);
      }
  
      currentDiscountValue = parseFloat(data.value);
      currentDiscountId = data.responsableId;
  
      // ✅ Send confirmation email
      sendDiscountEmail(
        data.ownerEmail,
        matchedDiscountDoc.id,
        document.getElementById("checkoutProductName").innerText
      );
  
      promoInput.disabled = true;
      applyBtn.disabled = true;
      applyBtn.style.cursor = "not-allowed";
      setDiscountMessage("Promocode successfully applied ✔", "green");
  
    } catch (error) {
      console.error(error);
      setDiscountMessage("Failed to apply promocode", "red");
    }
  });
  
  products.forEach(product => {

    const productRef = doc(db, "products", product.id);
    const productBox = document.getElementById(product.id);
    const btn = document.getElementById(product.btn);

    if (!productBox || !btn) return;

    // REAL-TIME LISTENER
    onSnapshot(productRef, async (snapshot) => {

      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const now = Date.now();

      // Auto restore after 24h
      if (data.status === "reserved" && now > data.reservedUntil) {
        await setDoc(productRef, {
          status: "available",
          reservedUntil: 0,
          reservedBy: ""
        });
      }

      if (data.status === "available") {
        productBox.style.display = "block";
        btn.disabled = false;
        btn.innerText = "Buy!";
        btn.classList.remove("reserved-state");
      }

      if (data.status === "reserved") {
        btn.disabled = false;
        btn.innerText = "Reserved";
        btn.classList.add("reserved-state");
      }

      if (data.status === "sold") {
        productBox.style.display = "none";
      }

    });


    const reservationBox = document.getElementById("reservationBox");
    const timerEl = document.getElementById("reservationTimer");
    const closeReservationBtn = document.getElementById("closeReservationBtn");

    function closeReservation() {
      reservationBox.classList.remove("show");

      if (reservationInterval) {
        clearInterval(reservationInterval);
        reservationInterval = null;
      }

      activeReservationProduct = null; // 👈 IMPORTANT

      timerEl.innerText = "";

      document.body.style.pointerEvents = "auto";
    }

    if (closeReservationBtn) {
      closeReservationBtn.onclick = closeReservation;
    }

    btn.addEventListener("click", async () => {

      const snap = await getDoc(productRef);
      const data = snap.data();

      if(data.status === "reserved"){
        openReservation(productRef);
        return;
      }

      function openReservation(productRef) {

        // 🚨 STOP EVERYTHING BEFORE STARTING NEW
        if (reservationInterval) {
          clearInterval(reservationInterval);
          reservationInterval = null;
        }

        activeReservationProduct = productRef;

        reservationBox.classList.add("show");

        async function updateTimer() {
          // 🚨 PREVENT OLD INTERVALS FROM WRITING
          if (activeReservationProduct !== productRef) return;

          const snap = await getDoc(productRef);
          if (!snap.exists()) return;

          const data = snap.data();
          const remaining = data.reservedUntil - Date.now();

          if (remaining <= 0) {
            timerEl.innerText = "Reservation expired";
            clearInterval(reservationInterval);
            reservationInterval = null;
            return;
          }

          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

          timerEl.innerText = `THIS PRODUCT IS RESERVED FOR: ${hours}h ${minutes}m`;
        }

        updateTimer();
        reservationInterval = setInterval(updateTimer, 1000);
      }

      // Close on Cancel button
      if (closeReservationBtn) {
        closeReservationBtn.addEventListener("click", closeReservation);
      }

      // Close on ESC key
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && reservationBox.classList.contains("show")) {
          closeReservation();
        }
      });

      // Close when clicking outside the checkout box
      reservationBox.addEventListener("click", function (e) {
        if (e.target === reservationBox) {
          closeReservation();
        }
      });

      // NORMAL FLOW 

      const productName = productBox.querySelector(".product-name").innerText;
      const productPrice = productBox.querySelector(".product-price").innerText;
      originalPrice = parseFloat(productPrice.replace("€", "").trim());

      document.getElementById("checkoutProductName").innerText = productName;
      document.getElementById("checkoutProductPrice").innerText = productPrice;

      document.getElementById("checkoutModal").classList.add("show");;

      // ✅ RESET CONFIRM BUTTON STATE
      confirmBtn.disabled = false;
      confirmBtn.style.pointerEvents = "auto";

      selectedProduct = {
        ref: productRef,
        name: productName,
        button: btn
      };

    });

  });
  const checkoutModal = document.getElementById("checkoutModal");
  const cancelBtn = document.getElementById("cancelCheckoutBtn");

  function closeModal() {
    checkoutModal.classList.remove("show");
  
    document.getElementById("checkoutName").value="";
    document.getElementById("checkoutEmail").value="";
  
    promoInput.value="";
    promoInput.disabled=false;
  
    applyBtn.disabled=true;
    applyBtn.style.cursor="not-allowed";
    applyBtn.style.visibility="visible";
  
    setDiscountMessage("", "");

    previewDiscountValue = 0;
    currentDiscountValue = 0;

    document.getElementById("checkoutProductPrice").innerText =
    originalPrice.toFixed(2) + "€";
  
  }

  // Close on Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeModal);
  }

  // Close on ESC key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && checkoutModal.classList.contains("show")) {
      closeModal();
    }
  });

  // Close when clicking outside the checkout box
  checkoutModal.addEventListener("click", function (e) {
    if (e.target === checkoutModal) {
      closeModal();
    }
  });

  
  const loadModal = document.getElementById("loadModal");
  const loadTitle = document.getElementById("loadTitle");
  const loader = document.getElementById("loader");
  const resultIcon = document.getElementById("resultIcon");

  function showLoading(text="Processing...") {
    loadTitle.innerText = text;
    loader.style.display = "block";
    resultIcon.classList.add("hidden");
    loadModal.classList.add("show");
  }

  function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  async function showResultModal(success = true, duration = 3500) {
  loader.style.display = "none";
  resultIcon.classList.remove("hidden");

  if (success) {
    loadTitle.innerText = "Order Successful!";
    resultIcon.innerHTML = `
        <div class="result-icon success">
            <ion-icon name="checkmark"></ion-icon>
        </div>
    `;
  } else {
    loadTitle.innerText = "Order Failed";
    resultIcon.innerHTML = `
        <div class="result-icon failure">
            <ion-icon name="close"></ion-icon>
        </div>
    `;
  }

  loadModal.classList.add("show");

  await sleep(duration);

  loadModal.classList.remove("show");
}

  function launchConfetti() {
  return new Promise((resolve) => {
    const layer = document.getElementById("confettiLayer");
    const colors = ["#00c2ff", "#00ff88", "#ffcc00", "#ff4d6d", "#a855f7"];

    const count = 140;

    for (let i = 0; i < count; i++) {
      const conf = document.createElement("div");
      conf.className = "confetti";

      conf.style.left = Math.random() * 100 + "vw";
      conf.style.top = "-10px";
      conf.style.background = colors[Math.floor(Math.random() * colors.length)];
      conf.style.width = (6 + Math.random() * 8) + "px";
      conf.style.height = (8 + Math.random() * 14) + "px";
      conf.style.animationDuration = (2.5 + Math.random() * 2) + "s";
      conf.style.opacity = (0.6 + Math.random() * 0.4);

      layer.appendChild(conf);

      setTimeout(() => conf.remove(), 4000);
    }

    // 👇 resolve when confetti is done
    setTimeout(resolve, 3500);
  });
}


      function generateInvoicePDF(data) {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();

          // ===== HEADER =====
          doc.setFont("helvetica", "bold");
          doc.setFontSize(20);
          doc.text("Seasons Serials", 20, 20);

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text("Invoice", 160, 20, { align: "right" });

          // Line
          doc.setDrawColor(200);
          doc.line(20, 25, 190, 25);

          // ===== CUSTOMER + INVOICE INFO =====
          doc.setFontSize(10);

          doc.text("BILL TO:", 20, 35);
          doc.text(data.name, 20, 41);
          doc.text(data.email, 20, 47);

          doc.text("INVOICE DETAILS:", 140, 35);
          doc.text("Invoice ID: " + data.invoiceId, 140, 41);
          doc.text("Order ID: " + data.orderId, 140, 47);

          // ===== PRODUCT TABLE HEADER =====
          doc.setFillColor(245, 245, 245);
          doc.rect(20, 60, 170, 10, "F");

          doc.setFont("helvetica", "bold");
          doc.text("Product", 22, 67);
          doc.text("Price", 180, 67, { align: "right" });

          // ===== PRODUCT ROW =====
          doc.setFont("helvetica", "normal");
          doc.text(data.productName, 22, 77);
          doc.text(data.originalPrice, 180, 77, { align: "right" });

          let y = 85;

          // ===== DISCOUNT (IF EXISTS) =====
          if (data.discount) {
          doc.text("Discount (" + data.discount + ")", 22, y);
          doc.text("-" + data.discount, 180, y, { align: "right" });
          y += 8;
          }

          // ===== TOTAL BOX =====
          doc.setDrawColor(0);
          doc.rect(120, y, 70, 15);

          doc.setFont("helvetica", "bold");
          doc.text("Total", 125, y + 6);
          doc.text(data.finalPrice, 185, y + 6, { align: "right" });

          // ===== PAYMENT INFO =====
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);

          doc.text("Payment Method: Bank Transfer", 20, y + 30);
          doc.text("Card Number: 4149 6293 5475 4285", 20, y + 36);

          // ===== FOOTER =====
          doc.setTextColor(120);
          doc.setFontSize(9);
          doc.text(
              "Please complete the payment within 24 hours to secure your order.",
          20,
          y + 50
          );

          // ===== SAVE LATER =====
        
         // ===== RETURN DOC, BASE64 LATER ✅
          return doc;
       }

  class Transaction {
  constructor() {
    this.rollbackStack = [];
    this.cancelled = false;
  }

  addRollback(fn, label = "unknown") {
    console.log("🟡 Adding rollback:", label, fn);
    this.rollbackStack.push({ fn, label });
  }

  markSuccess() {
    console.log("🟢 TRANSACTION MARKED SUCCESS");
    this.cancelled = true;
  }

  async rollback() {
    console.warn("⚠️ ROLLBACK STARTED");
    console.log("Stack size:", this.rollbackStack.length);

    for (let i = this.rollbackStack.length - 1; i >= 0; i--) {
      const step = this.rollbackStack[i];

      console.log(`↩️ Rolling back step ${i}:`, step.label);

      try {
        if (!step.fn) {
          console.error("❌ Rollback function is undefined at step", i);
          continue;
        }

        await step.fn();
        console.log(`✅ Rollback OK: ${step.label}`);

      } catch (err) {
        console.error("❌ Rollback FAILED:", step.label, err);
        alert("ROLLBACK FAILED: " + step.label);
        alert(err?.message || err);
      }
    }

    console.warn("⚠️ ROLLBACK FINISHED");
  }
}

async function sendAdminEmailSafe(type, data, errorMsg = "") {
  try {

    // 🚫 BLOCK duplicate failure spam
    if (type === "failure") {
      const key = data.productId + "_" + errorMsg;

      if (adminFailureTracker[key]) {
        console.warn("⛔ Duplicate admin failure blocked:", key);
        return;
      }

      adminFailureTracker[key] = true;
    }

    const html =
      type === "success"
        ? buildAdminSuccessEmail(data)
        : buildAdminFailureEmail(data, errorMsg);

    await emailjs.send("service_newemail1", "template_psaktfo", {
      to_email: "seasonsserials.info@gmail.com",
      subject:
        type === "success"
          ? `Order SUCCESS — ${data.productName}`
          : `Order FAILED — ${data.productName}`,
      content: html
    });

  } catch (err) {
    // 🔥 ABSOLUTE RULE: NEVER BREAK CUSTOMER FLOW
    console.error("Admin email failed (ignored):", err);
    alert("Admin email failed: " + err.message);
  }
}

    function buildAdminSuccessEmail(data){
      return `
          <div style="background:#0a2540;color:white;padding:20px;">
          <h2>Seasons Serials — Admin Notification</h2>
          <p style="opacity:0.8;">Successful Order</p>
        </div>

        <div style="padding:20px;color:#333;">
          <h3>Order Details</h3>

          <p><strong>Customer:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>

          <p><strong>Product:</strong> ${data.productName}</p>

          <p><strong>Original Price:</strong> ${data.originalPrice}</p>
          <p><strong>Final Price:</strong> ${data.finalPrice}</p>

          <p><strong>Promocode:</strong> ${data.discount || "None"}</p>

          <hr>

          <p><strong>Order ID:</strong> ${data.orderId}</p>
          <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>
        </div>
      `;
    }

    function buildAdminFailureEmail(data, errorMsg){
      return `
        <div style="background:#7f1d1d;color:white;padding:20px;">
          <h2>Seasons Serials — Admin Alert</h2>
          <p style="opacity:0.8;">Order Failed</p>
        </div>

        <div style="padding:20px;color:#333;">
          <h3>Failure Details</h3>

          <p><strong>Customer:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>

          <p><strong>Product:</strong> ${data.productName}</p>

          <p><strong>Final Price:</strong> ${data.finalPrice}</p>

          <p><strong>Promocode:</strong> ${data.discount || "None"}</p>

          <hr>

          <p><strong>Order ID:</strong> ${data.orderId}</p>
          <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>

          <hr>

          <p style="color:red;">
            ❌ Failure reason: ${errorMsg}
          </p>
        </div>
      `;
    }
    
if (confirmBtn) {
confirmBtn.addEventListener("click", async () => {

  const name = document.getElementById("checkoutName").value.trim();
  const email = document.getElementById("checkoutEmail").value.trim();

  if (!name || !email || !selectedProduct) {
    showResultModal(false);
    return;
  }

  showLoading("Processing your order...");

  confirmBtn.disabled = true;

  const productRef = selectedProduct.ref;
  let discountApplied = false;

  let orderSucceeded = false;

  const tx = new Transaction();

  try {

    // 🟢 STEP 1 — RESERVE PRODUCT FIRST
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists() || productSnap.data().status !== "available") {
      throw new Error("Product is no longer available");
    }

    // ⚡ INSTANT SUCCESS UI UPDATE
      // ✅ ADD THIS RIGHT HERE
      showLoading("Processing your order...");

    selectedProduct.button.innerText = "Reserved";
    selectedProduct.button.disabled = false;
    selectedProduct.button.classList.add("reserved-state");

    const now = Date.now();

    await setDoc(productRef, {
      status: "reserved",
      reservedUntil: now + 24 * 60 * 60 * 1000,
      reservedBy: email,

      reminderAt: now + 12 * 60 * 60 * 1000,
      reminderSent: false,

      warningAt: now + 22 * 60 * 60 * 1000,
      warningSent: false
    }, { merge: true });

    // ✅ ADD ROLLBACK
    tx.addRollback(
       async () => {
        await setDoc(productRef, {
          status: "available",
          reservedUntil: 0,
          reservedBy: ""
        }, { merge: true });
      },
      "restore product"
    );

    // 🟡 STEP 2 — APPLY DISCOUNT (AUTO)
    if (matchedDiscountDoc && matchedDiscountDoc.data().status === "available") {
      await updateDoc(doc(db, "discounts", matchedDiscountDoc.id), {
        status: "used"
      });

      // ✅ ROLLBACK
      tx.addRollback(async () => {
        await updateDoc(doc(db, "discounts", matchedDiscountDoc.id), {
        status: "available"
        });
      });

      currentDiscountValue = parseFloat(matchedDiscountDoc.data().value);
      discountApplied = true;
    }

    // 🔵 STEP 3 — PREPARE DATA
    const orderId = "ORD-" + Date.now();
    const invoiceId = "INV-" + Math.floor(100000 + Math.random() * 900000);

    const finalPriceNumber = originalPrice - (originalPrice * currentDiscountValue);

    const formattedOriginalPrice = originalPrice.toFixed(2) + "€";
    const formattedFinalPrice = finalPriceNumber.toFixed(2) + "€";
    const discountText = currentDiscountValue
      ? "-" + (currentDiscountValue * 100) + "%"
      : "";

    const invoiceData = {
      orderId,
      invoiceId,
      productId: selectedProduct.ref.id, // ✅ ADD THIS
      name,
      email,
      productName: selectedProduct.name,
      originalPrice: formattedOriginalPrice,
      finalPrice: formattedFinalPrice,
      discount: discountText,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };

    // 🔵 STEP 4 — GENERATE PDF (NO SAVE)
    const pdfDoc = generateInvoicePDF(invoiceData);

    // optional: get base64 for Firebase
    const pdfBase64 = pdfDoc.output("datauristring");

    // 🔵 STEP 5 — SAVE TO FIREBASE
    await saveInvoiceToUser(email, {
      ...invoiceData,
      pdf: pdfBase64
    });
    
    // ✅ ROLLBACK (delete invoice)
    tx.addRollback(async () => {
      await deleteDoc(doc(db, "users", email, "invoices", invoiceId));
    });

    // 🔵 STEP 6 — SEND EMAIL

    function buildSuccessEmail(data){
      return `
        <div style="background:#0a2540; color:white; padding:20px;">
          <h2>Seasons Serials</h2>
          <p style="font-size:12px; opacity:0.8;">Order Confirmation</p>
        </div>

        <div style="padding:25px; color:#333;">
          <p>Dear <strong>${data.name}</strong>,</p>

          <p>
            Thank you for your purchase. Your product has been <strong>reserved especially for you for a period of 24 hours</strong>.
          </p>

          <div style="background:#f8fafc; padding:15px; border-radius:8px;">
            <h3>Order Summary</h3>
            <p><strong>Product:</strong> ${data.productName}</p>
            <p><strong>Original Price:</strong> ${data.originalPrice}</p>
            <p><strong>Discount:</strong> ${data.discount}</p>
            <p><strong>Total:</strong> ${data.finalPrice}</p>
          </div>

          <p style="font-size:13px;">
            Order ID: ${data.orderId}<br>
            Invoice ID: ${data.invoiceId}
          </p>
          <p style="margin-top:20px;">
            Please complete the payment within 24 hours to secure your order.
          </p>
        </div>

        <!-- FOOTER -->
        <div style="background:#f1f5f9; padding:15px; text-align:center; font-size:12px; color:#666;">
          © Seasons Serials — All rights reserved
        </div>
      `;
    }

    function buildFailedEmail(data){
      return `
        <div style="background:#7f1d1d; color:white; padding:20px;">
          <h2>Seasons Serials</h2>
          <p style="font-size:12px; opacity:0.8;">Order Failed</p>
        </div>

        <div style="padding:25px; color:#333;">
          <p>Dear <strong>${data.name}</strong>,</p>

          <p>
            Unfortunately, your order <strong>could not be completed</strong> due to an error.
          </p>

          <div style="background:#fef2f2; padding:15px; border-radius:8px; border:1px solid #fecaca;">
            <p>
              Product: <strong>${data.productName}</strong><br>
              Attempted Price: <strong>${data.finalPrice}</strong>
            </p>
          </div>

          <p>You can try again anytime.</p>

          <div style="text-align:center;">
            <a href="${data.retryLink}" 
               style="background:#0a2540; color:white; padding:10px 20px; text-decoration:none;">
               Retry Order
            </a>
          </div>
        </div>
        
        <!-- FOOTER -->
        <div style="background:#f1f5f9; padding:15px; text-align:center; font-size:12px; color:#666;">
          © Seasons Serials — All rights reserved
        </div>
        `;
      }

    function buildReminderEmail(data){
      return `
        <div style="background:#0a2540; color:white; padding:20px;">
          <h2>Seasons Serials</h2>
          <p style="font-size:12px; opacity:0.8;">Product Reservation Reminder</p>
        </div>
        
        <p>Your reservation is still active.</p>
        <div style="background:#f8fafc; padding:15px; border-radius:8px;">
            <p><strong>Product:</strong> ${data.productName || "Your item"}</p>
        </div>
        <p style="margin-top:20px;">Please complete payment soon. Only <strong>12 hours</strong> are left.</p>

        <!-- FOOTER -->
        <div style="background:#f1f5f9; padding:15px; text-align:center; font-size:12px; color:#666;">
          © Seasons Serials — All rights reserved
        </div>
      `;
    }

    function buildWarningEmail(data){
      return `
        <div style="background:#b45309; color:white; padding:20px;">
          <h2>Seasons Serials</h2>
          <p style="font-size:12px; opacity:0.8;">Product Reservation Expiring Soon</p>
        </div>

        <div style="background:#f8fafc; padding:15px; border-radius:8px;">
            <p><strong>Product:</strong> ${data.productName || "Your item"}</p>
        </div>
        
        <p style="margin-top:20px;"> ⚠️ Your reservation will expire in <strong>2 hours</strong>.</p>

        <!-- FOOTER -->
        <div style="background:#f1f5f9; padding:15px; text-align:center; font-size:12px; color:#666;">
          © Seasons Serials — All rights reserved
        </div>
      `;
    }
    
    const successHTML = buildSuccessEmail(invoiceData);

    await emailjs.send("service_newemail1", "template_tan46u4", {
      to_email: email,
      subject: `Order confirmation — ${selectedProduct.name}`,
      content: successHTML
    });
    
    // COMPENSATION ACTION - SEND COMPENSATION EMAIL
    
    tx.addRollback(async () => {
      await emailjs.send("service_newemail1", "template_tan46u4", {
        to_email: email,
        subject: "Order failed",
        content: buildFailedEmail({
          name,
          productName: selectedProduct?.name || "Unknown",
          finalPrice: "—",
          retryLink: "https://seasons-serials.vercel.app/seasons-serials-store.html"
        })
      });
    });
    
    // 🔵 STEP 7 — SHOW SUCCESS UI FIRST
    tx.markSuccess();
    
      // 1. show success FIRST
        console.log("🎊 ABOUT TO START CONFETTI");

        await Promise.all([
          launchConfetti(),
          showResultModal(true, 3500)
        ]);

      // 2. close UI immediately after
      closeModal();

      // 3. 📩 Notify admin (SUCCESS) — NON BLOCKING
      await sendAdminEmailSafe("success", invoiceData);

      // 4. wait for UI to settle (iPad fix)
      await sleep(800);

      // 5. ONLY NOW download PDF
      setTimeout(() => {
        pdfDoc.save("Invoice_" + invoiceData.invoiceId + ".pdf");
      }, 800);
    
    } catch (error) {
        console.error("❌ FULL FAILURE:", error);
        console.error("CATCH TRIGGERED: " + (error?.message || error));

        // 📩 Notify admin (FAILURE) — NON BLOCKING
        await sendAdminEmailSafe(
          "failure",
          {
            productId: selectedProduct?.ref?.id || "unknown",
            name,
            email,
            productName: selectedProduct?.name || "unknown",
            finalPrice: "—",
            discount: currentDiscountValue
              ? "-" + (currentDiscountValue * 100) + "%"
              : "",
            orderId: "FAILED-" + Date.now(),
            invoiceId: "FAILED"
          },
          error?.message || "Unknown error"
        );

        console.log("🧨 ABOUT TO ROLLBACK");

        try {
          await tx.rollback();
        } catch (e) {
          console.error("rollback crashed", e);
          alert("ROLLBACK CRASH: " + (e?.message || e));
        }
        await showResultModal(false);
        closeModal();
      }
});
  }

});
