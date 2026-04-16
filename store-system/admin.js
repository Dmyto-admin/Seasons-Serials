import { db } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";


const products = [
  { id:"saleProductOne", msg:"prod1Msg", a:"prod1AvailableBtn", s:"prod1SoldBtn" },
  { id:"saleProductTwo", msg:"prod2Msg", a:"prod2AvailableBtn", s:"prod2SoldBtn" },
  { id:"saleProductThree", msg:"prod3Msg", a:"prod3AvailableBtn", s:"prod3SoldBtn" },
  { id:"saleProductFour", msg:"prod4Msg", a:"prod4AvailableBtn", s:"prod4SoldBtn" },
  { id:"saleProductFive", msg:"prod5Msg", a:"prod5AvailableBtn", s:"prod5SoldBtn" }

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


function parseDate(dateStr) {
  if (!dateStr) return new Date(0);

  const parts = dateStr.split("/");

  let day = parts[0];
  let month = parts[1];
  let year = parts[2];

  // 🔥 handle 2-digit year like "26"
  if (year.length === 2) {
    year = "20" + year;
  }

  return new Date(`${year}-${month}-${day}`);
}

function showConfirm(actionText, invoiceId) {
  return new Promise((resolve) => {

    const modal = document.getElementById("confirmModal");
    const text = document.getElementById("confirmText");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    text.innerText = `Are you sure you want to ${actionText} invoice #${invoiceId}?`;

    modal.classList.add("show");

    const cleanup = () => {
      modal.classList.remove("show");
      yesBtn.onclick = null;
      noBtn.onclick = null;
    };

    yesBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    noBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

  });
}

const container = document.querySelector(".admin-invoices-container");

// stores pending auto deletes
const autoDeleteMap = new Map();

let ALL_INVOICES = [];

async function loadAllInvoices() {

  container.innerHTML = "";

  try {

    const usersSnap = await getDocs(collection(db, "users"));

    // 🔥 GLOBAL ARRAY (ALL USERS)
    ALL_INVOICES = [];

    for (const userDoc of usersSnap.docs) {

      const userEmail = userDoc.id;

      const invoicesSnap = await getDocs(
        collection(db, "users", userEmail, "invoices")
      );

      invoicesSnap.forEach(docSnap => {
        const data = docSnap.data();

        if (data.status === "cancelled") return;

        ALL_INVOICES.push({
          id: docSnap.id,
          userEmail,
          ...data,
          parsedDate: parseDate(data.date),
          createdAt: data.createdAt || Date.now()
        });
      });
    }

    // 🔥 SORT ALL INVOICES (NEWEST FIRST)
    ALL_INVOICES.sort((a, b) => b.parsedDate - a.parsedDate);

    // ===== RENDER =====
    ALL_INVOICES.forEach((data) => {

      const block = document.createElement("div");
      block.classList.add("invoice-block");

      const now = Date.now();
      const isOlderThan48h = (now - data.createdAt) > 48 * 60 * 60 * 1000;
      const shouldAutoDelete = data.status !== "payed";

      block.innerHTML = `
        <div class="invoice-card">

          <div class="invoice-header">
            <span class="invoice-id">#${data.invoiceId}</span>
            <span class="invoice-date">${data.date}</span>
          </div>

          <div class="invoice-body">
            <p><strong>User:</strong> ${data.userEmail}</p>
            <p><strong>Product:</strong> ${data.productName}</p>
            <p class="invoice-price">${data.finalPrice}</p>
            <p><strong>Status:</strong> ${data.status || "pending"}</p>
          </div>

          <div class="admin-actions">
            <button class="pay-btn">Payed</button>
            <button class="cancel-btn">Cancel</button>
            ${shouldAutoDelete ? `
            <button class="cancel-auto-delete-btn">Cancel auto delete</button>
          ` : ""}
          </div>

          <button class="download-btn">Download</button>

        </div>
      `;

      // ======================
      // DOWNLOAD
      // ======================
      block.querySelector(".download-btn").onclick = () => {

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

        const link = document.createElement("a");
        link.href = url;
        link.download = "Invoice_" + data.invoiceId + ".pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      // ======================
      // PAYED
      // ======================
      block.querySelector(".pay-btn").onclick = async () => {

        const confirm = await showConfirm("mark as PAYED", data.invoiceId);
        if (!confirm) return;

        await updateDoc(
          doc(db, "users", data.userEmail, "invoices", data.id),
          { status: "payed" }
        );

        // cancel auto delete if exists
        if (autoDeleteMap.has(data.id)) {
          clearTimeout(autoDeleteMap.get(data.id));
          autoDeleteMap.delete(data.id);
        }

        loadAllInvoices();
      };

      // ======================
      // CANCEL (manual delete)
      // ======================
      block.querySelector(".cancel-btn").onclick = async () => {

        const confirm = await showConfirm("DELETE", data.invoiceId);
        if (!confirm) return;

        await deleteDoc(
          doc(db, "users", data.userEmail, "invoices", data.id)
        );

        loadAllInvoices();
      };

      // ======================
      // AUTO DELETE SYSTEM
      // ======================
      if (shouldAutoDelete) {

        const timeout = setTimeout(async () => {

          await deleteDoc(
            doc(db, "users", data.userEmail, "invoices", data.id)
          );

          loadAllInvoices();

        }, 48 * 60 * 60 * 1000);

        autoDeleteMap.set(data.id, timeout);
      }

      // ======================
      // CANCEL AUTO DELETE BTN
      // ======================
      const cancelAutoBtn = block.querySelector(".cancel-auto-delete-btn");

      if (cancelAutoBtn) {

        cancelAutoBtn.onclick = () => {

          if (autoDeleteMap.has(data.id)) {
            clearTimeout(autoDeleteMap.get(data.id));
            autoDeleteMap.delete(data.id);
          }

          cancelAutoBtn.remove();
        };
      }

      container.appendChild(block);
    });

    alert("🎉 FINISHED LOADING INVOICES 🎉");
    
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

function renderInvoices(list) {

  container.innerHTML = "";

  list.forEach((data) => {

    const block = document.createElement("div");
    block.classList.add("invoice-block");

    block.innerHTML = `
      <div class="invoice-card">
        <div class="invoice-header">
          <span class="invoice-id">#${data.invoiceId}</span>
          <span class="invoice-date">${data.date}</span>
        </div>

        <div class="invoice-body">
          <p><strong>User:</strong> ${data.userEmail}</p>
          <p><strong>Product:</strong> ${data.productName}</p>
          <p>${data.finalPrice}</p>
          <p>${data.status || "pending"}</p>
        </div>

        <div class="admin-actions">
          <button class="pay-btn">Payed</button>
          <button class="cancel-btn">Cancel</button>
          <button class="cancel-auto-delete-btn">Cancel auto delete</button>
        </div>

        <button class="download-btn">Download</button>
      </div>
    `;

    container.appendChild(block);
  });
}

document.getElementById("applyFilters").onclick = () => {

  let filtered = [...ALL_INVOICES];

  const search = document.getElementById("searchInvoice").value.toLowerCase();
  const user = document.getElementById("filterUser").value.toLowerCase();
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  if (search) {
    filtered = filtered.filter(i =>
      i.invoiceId.toLowerCase().includes(search) ||
      i.userEmail.toLowerCase().includes(search)
    );
  }

  if (user) {
    filtered = filtered.filter(i =>
      i.userEmail.toLowerCase().includes(user)
    );
  }

  if (from) {
    filtered = filtered.filter(i =>
      new Date(i.parsedDate) >= new Date(from)
    );
  }

  if (to) {
    filtered = filtered.filter(i =>
      new Date(i.parsedDate) <= new Date(to)
    );
  }

  renderInvoices(filtered);
};

document.getElementById("resetFilters").onclick = () => {
  document.getElementById("searchInvoice").value = "";
  document.getElementById("filterUser").value = "";
  document.getElementById("fromDate").value = "";
  document.getElementById("toDate").value = "";

  renderInvoices(ALL_INVOICES);
};

document.addEventListener("DOMContentLoaded", loadAllInvoices);
