import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";


async function saveInvoiceToUser(email, invoiceData) {
  try {
    const userRef = doc(db, "users", email);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log("User does not exist → skipping save");
      return false;
    }

    const invoiceRef = doc(collection(db, "users", email, "invoices"), invoiceData.invoiceId);

    await setDoc(invoiceRef, {
      ...invoiceData,
      createdAt: Date.now()
    });

    console.log("✅ Invoice saved correctly");
    return true;

  } catch (error) {
    console.error("❌ FIRESTORE SAVE FAILED:", error);
    return false;
  }
}


document.addEventListener("DOMContentLoaded", () => {
  let selectedProduct = null;
  let appliedDiscount = null;
  let originalPriceNumber = 0;
  let currentDiscountValue = 0;
  let currentDiscountId = null;
  let originalPrice = 0;
  let previewDiscountValue = 0;


  emailjs.init("x6kHcpv6XN2lZmOea");

  const products = [
    { id: "saleProductOne", btn: "buyBtnOne" },
    { id: "saleProductTwo", btn: "buyBtnTwo" },
    { id: "saleProductThree", btn: "buyBtnThree" },
    { id: "saleProductFour", btn: "buyBtnFour" }
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
        btn.disabled = true;
        btn.innerText = "Reserved";
        btn.classList.add("reserved-state");
      }

      if (data.status === "sold") {
        productBox.style.display = "none";
      }

    });



    btn.addEventListener("click", () => {

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

          // ===== SAVE =====
          doc.save("Invoice_" + data.invoiceId + ".pdf");
        }
  
  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {

      
    if (currentDiscountId) {

      const docRef = doc(db, "discounts", promoInput.value.trim());

      await updateDoc(docRef, {
          status: "used"
      });

      // Remove from discounts wrapper
      const discountDiv = document.getElementById(currentDiscountId);
      if (discountDiv) discountDiv.remove();
    }

      const nameInput = document.getElementById("checkoutName");
      const emailInput = document.getElementById("checkoutEmail");
    
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const productName = document.getElementById("checkoutProductName").innerText;
      const productPrice = document.getElementById("checkoutProductPrice").innerText;
    
      if (!name || !email || !selectedProduct) {
        return;
      }
    
      // ✅ PREVENT DOUBLE CLICKING IMMEDIATELY
      confirmBtn.disabled = true;
      confirmBtn.style.pointerEvents = "none";
    
      // ✅ CLOSE MODAL INSTANTLY
      checkoutModal.classList.remove("show");
    
      // ✅ Update product button instantly
      selectedProduct.button.innerText = "Reserved";
      selectedProduct.button.disabled = true;
      selectedProduct.button.classList.add("reserved-state");
    
      try {
    
        // Generate IDs
        const orderId = "ORD-" + Date.now();
        const invoiceId = "INV-" + Math.floor(100000 + Math.random() * 900000);

        // Prices
        const discountPercent = currentDiscountValue || 0;
        const finalPriceNumber = originalPrice - (originalPrice * discountPercent);

        const formattedOriginalPrice = originalPrice.toFixed(2) + "€";
        const formattedFinalPrice = finalPriceNumber.toFixed(2) + "€";

        let discountText = "";
        if (discountPercent > 0) {
          discountText = "-" + (discountPercent * 100) + "%";
        }

        const DateNow = new Date();

        const invoiceData = {
          orderId: orderId,
          invoiceId: invoiceId,
          name: name,
          email: email,
          productName: productName,
          originalPrice: formattedOriginalPrice,
          discount: discountText,
          finalPrice: formattedFinalPrice,
          date: DateNow.toLocaleDateString(),
          time: DateNow.toLocaleTimeString()
        };

        // ✅ Generate PDF
        generateInvoicePDF(invoiceData);

        // 🔥 SAVE INVOICE (independent)
        saveInvoiceToFirestore({
          invoiceId,
          orderId,
          email,
          productName,
          originalPrice: formattedOriginalPrice,
          finalPrice: formattedFinalPrice,
          discount: discountText
        });
        
        await emailjs.send("service_newemail1", "template_tan46u4", {
          to_email: email,
          customer_name: name,
          product_name: productName,
          original_price: formattedOriginalPrice,
          discount: discountText,
          final_price: formattedFinalPrice,
          order_id: orderId,
          invoice_id: invoiceId
        });
    
        const now = Date.now();
        const reservedUntil = now + (24 * 60 * 60 * 1000);
    
        await setDoc(selectedProduct.ref, {
          status: "reserved",
          reservedUntil: reservedUntil,
          reservedBy: email
        }, { merge: true });
    
        // ✅ RESET INPUT FIELDS AFTER SUCCESS
        nameInput.value = "";
        emailInput.value = "";
    
      } catch (error) {
        console.error("Email or Firestore failed:", error);
        alert("Email failed to send due to an unknown error. Please try agin, and if the error continues to appear, contact our support team.");
    
        // Rollback UI if something fails
        selectedProduct.button.innerText = "Buy!";
        selectedProduct.button.disabled = false;
        selectedProduct.button.classList.remove("reserved-state");
      }
      
    
    });
  }

});
