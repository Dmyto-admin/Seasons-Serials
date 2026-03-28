import { db } from "./firebase-config.js";
import { onSnapshot, collection } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";


function loadUserInvoices(uid) {
  const container = document.querySelector(".wrapper-payments .profile-info");

  const invoicesRef = collection(db, "users", uid, "invoices");

  onSnapshot(invoicesRef, (snapshot) => {

    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `
        <img src="no-payment-yet.png">
        <p class="no-payment-yet-text">No payments yet</p>
      `;
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      
      const block = document.createElement("div");
      block.classList.add("invoice-block");

      block.innerHTML = `
        <div class="invoice-line"></div>

        <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>
        <p><strong>Order ID:</strong> ${data.orderId}</p>
        <p><strong>Product:</strong> ${data.productName}</p>
        <p><strong>Total:</strong> ${data.finalPrice}</p>
        <p><strong>Date:</strong> ${data.date} ${data.time}</p>

        <button class="download-btn">
          ⬇ Download PDF
        </button>

        <div class="invoice-line"></div>
      `;

      const btn = block.querySelector(".download-btn");

      btn.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = data.pdf;
        link.download = "Invoice_" + data.invoiceId + ".pdf";
        link.click();
      });

      container.appendChild(block);
    });

  });
}


document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const uid = user.uid;
  loadUserInvoices(uid);
  });
});
