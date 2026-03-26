import { db } from "./firebase-config.js";
import { onSnapshot, collection } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

function loadUserInvoices(userEmail) {
  const container = document.querySelector(".wrapper-payments .profile-info");

  const invoicesRef = collection(db, "users", userEmail, "invoices");

  onSnapshot(invoicesRef, (snapshot) => {

    container.innerHTML = ""; // clear old

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
        <div class="invoice-card">

          <div class="invoice-header">
            <span class="invoice-id">#${data.invoiceId}</span>
            <span class="invoice-date">${data.date}</span>
          </div>

          <div class="invoice-body">
            <p><strong>Product:</strong> ${data.productName}</p>
            <p><strong>Order:</strong> ${data.orderId}</p>
            <p class="invoice-price">${data.finalPrice}</p>
          </div>

          <button class="download-btn">
            Download Invoice
          </button>

        </div>
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
  const email = "dmytromoroz2023@gmail.com"; // 👈 THIS PAGE USER
  loadUserInvoices(email);
});
