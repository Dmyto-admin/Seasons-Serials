import { db } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";


const products = [
  { id:"saleProductOne", msg:"prod1Msg", a:"prod1AvailableBtn", s:"prod1SoldBtn" },
  { id:"saleProductTwo", msg:"prod2Msg", a:"prod2AvailableBtn", s:"prod2SoldBtn" },
  { id:"saleProductThree", msg:"prod3Msg", a:"prod3AvailableBtn", s:"prod3SoldBtn" },
  { id:"saleProductFour", msg:"prod4Msg", a:"prod4AvailableBtn", s:"prod4SoldBtn" }
];

products.forEach(p=>{

  const productRef = doc(db,"products",p.id);

  const msg = document.getElementById(p.msg);

  document.getElementById(p.a).addEventListener("click", async ()=>{

    await updateDoc(productRef,{
      status:"available",
      reservedUntil:0,
      reservedBy:""
    });

    msg.style.color="green";
    msg.innerText="Operation was a success";

  });

  document.getElementById(p.s).addEventListener("click", async ()=>{

    await updateDoc(productRef,{
      status:"sold",
      reservedUntil:0,
      reservedBy:""
    });

    msg.style.color="green";
    msg.innerText="Operation was a success";

    });

});

alert(container);

const container = document.querySelector(".admin-invoices-container");

async function loadAllInvoices() {
  container.innerHTML = "";

  const usersSnap = await getDocs(collection(db, "users"));

  for (const userDoc of usersSnap.docs) {
    const userEmail = userDoc.id;

    const invoicesSnap = await getDocs(
      collection(db, "users", userEmail, "invoices")
    );

    invoicesSnap.forEach((invoiceDoc) => {
      const data = invoiceDoc.data();

      // 🔥 HIDE CANCELLED
      if (data.status === "cancelled") return;

      const block = document.createElement("div");
      block.classList.add("invoice-block");

      block.innerHTML = `
        <div class="invoice-card">

          <div class="invoice-header">
            <span>#${data.invoiceId}</span>
            <span>${data.date}</span>
          </div>

          <p><strong>User:</strong> ${userEmail}</p>
          <p>${data.productName}</p>
          <p>${data.finalPrice}</p>
          <p class="status">Status: ${data.status || "pending"}</p>

          <button class="download-btn">Download</button>

          <div class="admin-actions">
            <button class="pay-btn">Payed</button>
            <button class="cancel-btn">Cancel</button>
          </div>

        </div>
      `;

      // 🔥 PAYED BUTTON
      block.querySelector(".pay-btn").onclick = async () => {
        await updateDoc(
          doc(db, "users", userEmail, "invoices", invoiceDoc.id),
          { status: "payed" }
        );
        loadAllInvoices();
      };

      // 🔥 CANCEL BUTTON
      block.querySelector(".cancel-btn").onclick = async () => {
        await deleteDoc(
          doc(db, "users", userEmail, "invoices", invoiceDoc.id)
        );

        // 🔥 REMOVE FROM UI
        block.style.display = "none";
      };

      container.appendChild(block);
    });
  }
}

document.addEventListener("DOMContentLoaded", loadAllInvoices);
