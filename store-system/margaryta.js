import { db } from "./firebase-config.js";
import { doc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const userEmail = "margaryta.pu@gmail.com";

const container = document.querySelector(".wrapper-payments .profile-info");

const invoicesRef = collection(doc(db, "users", userEmail), "invoices");

onSnapshot(invoicesRef, (snapshot) => {

  container.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    const date = new Date(data.date).toLocaleString();

    const div = document.createElement("div");

    div.innerHTML = `
      <div style="border-top:1px solid #ddd; border-bottom:1px solid #ddd; padding:10px; margin:15px 0;">
        <p><strong>Product:</strong> ${data.productName}</p>
        <p><strong>Total:</strong> ${data.finalPrice}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Invoice:</strong> ${data.invoiceId}</p>

        <button onclick='downloadInvoice(${JSON.stringify(data)})'>
          Download PDF
        </button>
      </div>
    `;

    container.appendChild(div);
  });

});
