import { db } from "./firebase-config.js";
import { doc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const userEmail = "margaryta.pu@gmail.com"; // ⚠️ change per page

const paymentsContainer = document.querySelector(".wrapper-payments .profile-info");

const invoicesRef = collection(doc(db, "users", userEmail), "invoices");

onSnapshot(invoicesRef, (snapshot) => {

  if (snapshot.empty) return;

  paymentsContainer.innerHTML = "<h3>My Payments</h3>";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    const date = new Date(data.date).toLocaleString();

    const div = document.createElement("div");
    div.classList.add("invoice-box");

    div.innerHTML = `
      <div class="invoice-line"></div>

      <p><strong>Product:</strong> ${data.productName}</p>
      <p><strong>Total:</strong> ${data.finalPrice}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>

      <button onclick="downloadInvoice('${data.invoiceId}')">
        Download PDF
      </button>

      <div class="invoice-line"></div>
    `;

    paymentsContainer.appendChild(div);
  });

});
