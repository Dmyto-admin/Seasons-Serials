import { db } from "./firebase-config.js";
import { onSnapshot, collection } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

function loadUserInvoices(userEmail) {
  const container = document.querySelector(".wrapper-payments .profile-info");

  const invoicesRef = collection(db, "users", userEmail, "invoices");

  onSnapshot(invoicesRef, (snapshot) => {

  container.innerHTML = "";

  if (snapshot.empty) {
    container.innerHTML = `
      <img src="no-payment-yet.png">
      <p class="no-payment-yet-text">No payments yet</p>
    `;
    return;
  }

  const invoicesArray = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    if (data.status === "cancelled") return;

    invoicesArray.push({
      ...data
    });

  });


  // ✅ RENDER
  invoicesArray.forEach(data => {

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
          <p><strong>Status:</strong> ${data.status || "pending"}</p>
          <p class="invoice-price">${data.finalPrice}</p>
        </div>

        <button class="download-btn">Download</button>

      </div>
    `;

    const btn = block.querySelector(".download-btn");

    btn.addEventListener("click", () => {
      const base64 = data.pdf;

      const byteString = atob(base64.split(',')[1]);
      const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];

      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);

      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([ab], { type: mimeString });
      const url = URL.createObjectURL(blob);

      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      if (isSafari) {
        window.open(url, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = "Invoice_" + data.invoiceId + ".pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });

    container.appendChild(block);
  });

});
}


document.addEventListener("DOMContentLoaded", () => {
  const email = "dmytromoroz2023@gmail.com"; // 👈 THIS PAGE USER
  loadUserInvoices(email);
});
