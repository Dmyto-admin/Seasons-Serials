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

const container = document.querySelector(".admin-invoices-container");

async function loadAllInvoices() {

  console.log("🔥 FUNCTION STARTED");

  if (!container) {
    alert("❌ CONTAINER NOT FOUND");
    return;
  }

  container.innerHTML = "";

  try {

    console.log("📡 GETTING USERS...");

    const usersSnap = await getDocs(collection(db, "users"));

    console.log("👥 USERS FOUND: " + usersSnap.size);

    for (const userDoc of usersSnap.docs) {

      const userEmail = userDoc.id;
      console.log("➡️ USER: " + userEmail);

      const invoicesSnap = await getDocs(
        collection(db, "users", userEmail, "invoices")
      );

      console.log("📄 INVOICES FOUND: " + invoicesSnap.size);

      invoicesSnap.forEach((invoiceDoc) => {

        const data = invoiceDoc.data();

        // 🔥 HIDE CANCELLED
        if (data.status === "cancelled") {
          alert("⛔ CANCELLED SKIPPED");
          return;
        }

        console.log("✅ CREATING BLOCK");

        const block = document.createElement("div");
        block.classList.add("invoice-block");

        block.innerHTML = `
          <div class="invoice-card">

            <div class="invoice-header">
              <span class="invoice-id">#${data.invoiceId}</span>
              <span class="invoice-date">${data.date}</span>
            </div>
            
            <div class="invoice-body">
              <p><strong>User:</strong> ${userEmail}</p>
              <p><strong>Product:</strong> ${data.productName}</p>
              <p class="invoice-price">${data.finalPrice}</p>
              <p><strong>Order status:</strong> ${data.status || "pending"}</p>
            </div>

            <div class="admin-actions">
              <button class="pay-btn">Payed</button>
              <button class="cancel-btn">Cancel</button>
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

        // 🔥 CROSS-BROWSER FIX
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        if (isSafari) {
          window.open(url, "_blank"); // Safari
        } else {
          const link = document.createElement("a");
          link.href = url;
          link.download = "Invoice_" + data.invoiceId + ".pdf";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

       });

        // 🔥 PAYED
        block.querySelector(".pay-btn").onclick = async () => {
          alert("💰 PAYD CLICKED 💰");

          await updateDoc(
            doc(db, "users", userEmail, "invoices", invoiceDoc.id),
            { status: "payed" }
          );

          loadAllInvoices();
        };

        // 🔥 CANCEL
        block.querySelector(".cancel-btn").onclick = async () => {
          alert("🗑️ DELETE CLICKED");

          try {
            const ref = doc(db, "users", userEmail, "invoices", invoiceDoc.id);

            console.log("Deleting:", userEmail, invoiceDoc.id);

            await deleteDoc(ref);

            alert("✅ DELETED FROM FIREBASE");

            // 🔥 RELOAD EVERYTHING (NOT JUST UI FAKE HIDE)
            loadAllInvoices();

          } catch (err) {
            console.error("❌ DELETE FAILED:", err);
            alert("DELETE ERROR: " + err.message);
          }
        };

        container.appendChild(block);

      });
    }

    alert("🎉 FINISHED LOADING INVOICES");

  } catch (error) {
    console.error("❌ REAL ERROR:", error);
    alert("ERROR: " + error.message);
  }
}

document.addEventListener("DOMContentLoaded", loadAllInvoices);
