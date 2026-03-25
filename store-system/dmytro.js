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
        <div class="invoice-line"></div>

        <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>
        <p><strong>Order ID:</strong> ${data.orderId}</p>
        <p><strong>Product:</strong> ${data.productName}</p>
        <p><strong>Total:</strong> ${data.finalPrice}</p>
        <p><strong>Date:</strong> ${data.date} ${data.time}</p>

        <button class="download-btn">
          Download PDF
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
  const email = "dmytromoroz2023@gmail.com"; // 👈 THIS PAGE USER
  loadUserInvoices(email);
});
