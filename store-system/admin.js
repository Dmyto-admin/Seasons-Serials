import { db } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import {
    getAuth,
    EmailAuthProvider,
    reauthenticateWithCredential,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";


const adminAuth = getAuth();

const API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "https://seasons-serials.vercel.app"
        : "";

const createProductModal =
    document.getElementById("createProductModal");

const openCreateProduct =
    document.getElementById("openCreateProduct");

const closeCreateProduct =
    document.getElementById("closeCreateProduct");

openCreateProduct.addEventListener("click", () => {
    createProductModal.classList.add("active");
});

closeCreateProduct.addEventListener("click", () => {
    createProductModal.classList.remove("active");
});

document.addEventListener("keydown", (e) => {

    if(e.key === "Escape") {

        closeCreateProductModal();

    }

});

const createModal =
document.getElementById("createProductModal");

createModal.addEventListener("click", (e) => {

    if(e.target === createModal) {

        closeCreateProductModal();

    }

});

function clearCreateProductFields() {

    document.getElementById("createProductName").value = "";

    document.getElementById("createProductPrice").value = "";

    document.getElementById("createProductImage").value = "";

    document.getElementById("createProductDescription").value = "";

    document.getElementById("createProductCategory").value = "picture";

}

function validatePrice(price) {

    const value = Number(price);

    if(
        !Number.isInteger(value)
        || value <= 0
    ) {
        return false;
    }

    return true;
}

const priceInput = document.getElementById("createProductPrice");
const priceError = document.getElementById("priceError");

priceInput.addEventListener("input", () => {

    if(validatePrice(priceInput.value)) {

        priceError.classList.add("hidden");

    } else {

        priceError.classList.remove("hidden");

    }

});

const products = [
  { id:"saleProductOne", msg:"prod1Msg", a:"prod1AvailableBtn", s:"prod1SoldBtn" },
  { id:"saleProductTwo", msg:"prod2Msg", a:"prod2AvailableBtn", s:"prod2SoldBtn" },
  { id:"saleProductThree", msg:"prod3Msg", a:"prod3AvailableBtn", s:"prod3SoldBtn" },
  { id:"saleProductFour", msg:"prod4Msg", a:"prod4AvailableBtn", s:"prod4SoldBtn" },
  { id:"saleProductFive", msg:"prod5Msg", a:"prod5AvailableBtn", s:"prod5SoldBtn" },
  { id:"saleProductSix", msg:"prod6Msg", a:"prod6AvailableBtn", s:"prod6SoldBtn" },
  { id:"saleProductSeven", msg:"prod7Msg", a:"prod7AvailableBtn", s:"prod7SoldBtn" }

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

    if (!dateStr) {
        return new Date(0);
    }

    const parts = dateStr.split("/");

    if (parts.length < 3) {
        console.warn("Invalid date:", dateStr);
        return new Date(0);
    }

    let [day, month, year] = parts;

    if (year && year.length === 2) {
        year = "20" + year;
    }

    return new Date(`${year}-${month}-${day}`);
}

function formatTime(ms) {

  if (ms <= 0) return "Deleting soon...";

  const totalSec = Math.floor(ms / 1000);

  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return `This invoice auto deletes in ${h}h ${m}m ${s}s`;
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
const intervalMap = new Map();

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
      const deleteAt = data.createdAt + 48 * 60 * 60 * 1000;
      const timeLeft = deleteAt - now;
      const isOlderThan48h = (now - data.createdAt) > 48 * 60 * 60 * 1000;
      const shouldAutoDelete = data.status !== "payed" && data.autoDeleteCancelled !== true;

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
            <button class="cancel-auto-delete-btn">Cancel Auto Delete</button>
          ` : ""}
          </div>
          
          <div class="delete-timer">${formatTime(timeLeft)}</div>


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
          { status: "payed",
            autoDeleteCancelled: true   // 🔥 THIS IS THE KEY
          }
        );

        // 🔥 ADD THIS
        await updateDoc(
          doc(db, "products", data.productId), // ← you MUST store this!
          { status: "sold",        // ✅ THIS is what hides it in UI
            isPaid: true,
            reservedUntil: 0,
            reservedBy: ""
          }
        );

        // cancel auto delete if exists
        if (autoDeleteMap.has(data.id)) {
          clearTimeout(autoDeleteMap.get(data.id));
          autoDeleteMap.delete(data.id);
        }

        if (intervalMap.has(data.id)) {
          clearInterval(intervalMap.get(data.id));
          intervalMap.delete(data.id);
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
      if (shouldAutoDelete && !data.autoDeleteCancelled) {

        if (shouldAutoDelete && timeLeft > 0) {
          const timeout = setTimeout(async () => {
            await deleteDoc(doc(db, "users", data.userEmail, "invoices", data.id));
            loadAllInvoices();
          }, timeLeft);

          autoDeleteMap.set(data.id, timeout);
        }
      }

      const timerEl = block.querySelector(".delete-timer");
      timerEl.style.color = "#0045bc"; // dark blue

      let interval;

      const updateTimer = () => {
        const now = Date.now();
        const timeLeft = (data.createdAt + 48 * 60 * 60 * 1000) - now;

        timerEl.textContent = formatTime(timeLeft);

        // stop condition
        if (timeLeft <= 0 || data.autoDeleteCancelled) {
          clearInterval(interval);
          timerEl.textContent = "Auto-delete stopped";
        }
      };

      interval = setInterval(updateTimer, 1000);
      updateTimer();
      intervalMap.set(data.id, interval);

      // ======================
      // CANCEL AUTO DELETE BTN
      // ======================
      const cancelAutoBtn = block.querySelector(".cancel-auto-delete-btn");

      if (cancelAutoBtn) {

        cancelAutoBtn.onclick = async () => {

          if (autoDeleteMap.has(data.id)) {
            clearTimeout(autoDeleteMap.get(data.id));
            autoDeleteMap.delete(data.id);
          }

          if (intervalMap.has(data.id)) {
            clearInterval(intervalMap.get(data.id));
            intervalMap.delete(data.id);
          }

          await updateDoc(
            doc(db, "users", data.userEmail, "invoices", data.id),
            {
              autoDeleteCancelled: true
            }
          );

          cancelAutoBtn.remove();

          // hide timer text
          timerEl.style.display = "none";

          alert("Auto delete cancelled successfully!");
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

    const now = Date.now();
    const deleteAt = data.createdAt + 48 * 60 * 60 * 1000;
    let timeLeft = deleteAt - now;

    const shouldAutoDelete = data.status !== "payed" && data.autoDeleteCancelled !== true;

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
          ${shouldAutoDelete ? `<button class="cancel-auto-delete-btn">Cancel Auto Delete</button>` : ""}
        </div>

        <div class="delete-timer">${formatTime(timeLeft)}</div>

        <button class="download-btn">Download</button>

      </div>
    `;

    // ===== DOWNLOAD =====
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

    // ===== PAYED =====
    block.querySelector(".pay-btn").onclick = async () => {
      const confirm = await showConfirm("mark as PAYED", data.invoiceId);
      if (!confirm) return;

      await updateDoc(
        doc(db, "users", data.userEmail, "invoices", data.id),
        { status: "payed",
          autoDeleteCancelled: true   // 🔥 THIS IS THE KEY
        }
      );

      // 🔥 ADD THIS
      await updateDoc(
        doc(db, "products", data.productId), // ← you MUST store this!
        { status: "sold",        // ✅ THIS is what hides it in UI
          isPaid: true,
          reservedUntil: 0,
          reservedBy: "" 
        }
      );

        // cancel auto delete if exists
        if (autoDeleteMap.has(data.id)) {
          clearTimeout(autoDeleteMap.get(data.id));
          autoDeleteMap.delete(data.id);
        }

        if (intervalMap.has(data.id)) {
          clearInterval(intervalMap.get(data.id));
          intervalMap.delete(data.id);
        }


      loadAllInvoices();
    };

    // ===== DELETE =====
    block.querySelector(".cancel-btn").onclick = async () => {
      const confirm = await showConfirm("DELETE", data.invoiceId);
      if (!confirm) return;

      await deleteDoc(
        doc(db, "users", data.userEmail, "invoices", data.id)
      );

      loadAllInvoices();
    };

    // ===== AUTO DELETE (FIXED) =====
    if (shouldAutoDelete && !data.autoDeleteCancelled) {

      if (shouldAutoDelete && timeLeft > 0) {
        const timeout = setTimeout(async () => {
          await deleteDoc(doc(db, "users", data.userEmail, "invoices", data.id));
          loadAllInvoices();
        }, timeLeft);

        autoDeleteMap.set(data.id, timeout);
      }
    }

    // ===== TIMER =====
    const timerEl = block.querySelector(".delete-timer");
    timerEl.style.color = "#0045bc"; // dark blue

    let interval;

    const updateTimer = () => {
      const now = Date.now();
      const timeLeft = (data.createdAt + 48 * 60 * 60 * 1000) - now;

      timerEl.textContent = formatTime(timeLeft);

      // stop condition
      if (timeLeft <= 0 || data.autoDeleteCancelled) {
        clearInterval(interval);
        timerEl.textContent = "Auto-delete stopped";
      }
    };

    interval = setInterval(updateTimer, 1000);
    updateTimer();
    
    intervalMap.set(data.id, interval);

    // ===== CANCEL AUTO DELETE =====
    const cancelAutoBtn = block.querySelector(".cancel-auto-delete-btn");

    if (cancelAutoBtn) {
      cancelAutoBtn.onclick = async () => {
        if (autoDeleteMap.has(data.id)) {
          clearTimeout(autoDeleteMap.get(data.id));
          autoDeleteMap.delete(data.id);
        }
        
        if (intervalMap.has(data.id)) {
          clearInterval(intervalMap.get(data.id));
          intervalMap.delete(data.id);
        }

        await updateDoc(
          doc(db, "users", data.userEmail, "invoices", data.id),
          {
            autoDeleteCancelled: true
          }
        );
        
        cancelAutoBtn.remove();
        
        // hide timer text
        timerEl.style.display = "none";

        alert("Auto delete cancelled successfully!");
      };
    }

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
    filtered = filtered
      .map(i => {

        const id = String(i.invoiceId).toLowerCase();
        const email = i.userEmail.toLowerCase();

        let score = 0;

        if (id.includes(search)) score += 5;
        if (email.includes(search)) score += 5;

        if (fuzzyMatch(id, search)) score += 2;
        if (fuzzyMatch(email, search)) score += 2;

        return { ...i, score };
      })
      .filter(i => i.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  if (user) {
    filtered = filtered.filter(i =>
      i.userEmail.toLowerCase().includes(user)
    );
  }

  if (from) {
    filtered = filtered.filter(i =>
      i.parsedDate >= new Date(from)
    );
  }

  if (to) {
    filtered = filtered.filter(i =>
      i.parsedDate <= new Date(to)
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

function fuzzyMatch(text, query) {
  text = text.toLowerCase();
  query = query.toLowerCase();

  let ti = 0;
  let qi = 0;

  while (ti < text.length && qi < query.length) {
    if (text[ti] === query[qi]) qi++;
    ti++;
  }

  return qi === query.length;
}

document.addEventListener("DOMContentLoaded", loadAllInvoices);

/* =========================================================
   ADMIN ACCOUNTS SYSTEM
========================================================= */

const moreNavBtn =
    document.getElementById("moreNavBtn");

const moreDropdown =
    document.getElementById("moreDropdown");

const openAccounts =
    document.getElementById("openAccounts");

const accountsWrapper =
    document.getElementById("accountsWrapper");

const closeAccounts =
    document.getElementById("closeAccounts");

const accountsGrid =
    document.getElementById("adminAccountsGrid");

const accountsEmpty =
    document.getElementById("accountsEmpty");


const passwordResetModal =
    document.getElementById("passwordResetModal");

const closePasswordResetModal =
    document.getElementById("closePasswordResetModal");

const cancelPasswordReset =
    document.getElementById("cancelPasswordReset");

const confirmPasswordReset =
    document.getElementById("confirmPasswordReset");

const passwordResetEmail =
    document.getElementById("passwordResetEmail");

const passwordResetMessage =
    document.getElementById("passwordResetMessage");


const suspendModal =
    document.getElementById("suspendModal");

const closeSuspendModal =
    document.getElementById("closeSuspendModal");

const cancelSuspend =
    document.getElementById("cancelSuspend");

const confirmSuspend =
    document.getElementById("confirmSuspend");

const suspendAccountName =
    document.getElementById("suspendAccountName");

const suspensionPreview =
    document.getElementById("suspensionPreview");


const adminReauthModal =
    document.getElementById("adminReauthModal");

const closeReauthModal =
    document.getElementById("closeReauthModal");

const cancelReauth =
    document.getElementById("cancelReauth");

const confirmReauth =
    document.getElementById("confirmReauth");

const adminReauthPassword =
    document.getElementById("adminReauthPassword");

const toggleReauthPassword =
    document.getElementById("toggleReauthPassword");

const reauthMessage =
    document.getElementById("reauthMessage");


const accountSuccessModal =
    document.getElementById("accountSuccessModal");

const accountSuccessTitle =
    document.getElementById("accountSuccessTitle");

const accountSuccessText =
    document.getElementById("accountSuccessText");

const closeSuccessModal =
    document.getElementById("closeSuccessModal");


/* =========================================================
   STATE
========================================================= */

let ADMIN_ACCOUNTS = [];

let selectedAccount = null;

let pendingSensitiveAction = null;

let countdownIntervals = [];

let wheelValues = {
    minutes: 0,
    hours: 0,
    days: 0,
    months: 0
};


/* =========================================================
   MORE DROPDOWN
========================================================= */

if (moreNavBtn) {

    moreNavBtn.addEventListener("click", (event) => {

        event.stopPropagation();

        moreDropdown.classList.toggle("active");
        moreNavBtn.classList.toggle("active");

    });

}


document.addEventListener("click", (event) => {

    if (
        moreDropdown &&
        !moreDropdown.contains(event.target) &&
        !moreNavBtn.contains(event.target)
    ) {

        moreDropdown.classList.remove("active");
        moreNavBtn.classList.remove("active");

    }

});


/* =========================================================
   OPEN ACCOUNTS
========================================================= */

if (openAccounts) {

    openAccounts.addEventListener("click", async (event) => {

        event.preventDefault();

        moreDropdown.classList.remove("active");
        moreNavBtn.classList.remove("active");

        accountsWrapper.classList.add("active");

        await loadAdminAccounts();

    });

}


/* =========================================================
   CLOSE ACCOUNTS
========================================================= */

function closeAccountsWrapper() {

    accountsWrapper.classList.remove("active");

    clearCountdowns();

}


if (closeAccounts) {

    closeAccounts.addEventListener(
        "click",
        closeAccountsWrapper
    );

}


/* =========================================================
   ESCAPE
========================================================= */

document.addEventListener("keydown", (event) => {

    if (event.key !== "Escape") return;

    if (passwordResetModal.classList.contains("active")) {

        closePasswordReset();

        return;

    }

    if (suspendModal.classList.contains("active")) {

        closeSuspend();

        return;

    }

    if (adminReauthModal.classList.contains("active")) {

        closeReauth();

        return;

    }

    if (accountSuccessModal.classList.contains("active")) {

        accountSuccessModal.classList.remove("active");

        return;

    }

    if (accountsWrapper.classList.contains("active")) {

        closeAccountsWrapper();

    }

});


/* =========================================================
   LOAD ALL ACCOUNTS
========================================================= */

async function loadAdminAccounts() {

    accountsGrid.innerHTML = "";

    clearCountdowns();

    try {

        const user = adminAuth.currentUser;


        if (!user) {
            throw new Error(
                "You are not authenticated."
            );
        }


        const idToken = await user.getIdToken();


        const response =
            await fetch(
                `${API_BASE}/api/admin-accounts`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${idToken}`
                    }
                }
            );


        if (!response.ok) {

            const errorData =
                await response.json().catch(() => ({}));

            throw new Error(
                errorData.error ||
                "Unable to load accounts."
            );

        }


        const data =
            await response.json();


        ADMIN_ACCOUNTS =
            Array.isArray(data.accounts)
                ? data.accounts
                : [];


        if (!ADMIN_ACCOUNTS.length) {

            accountsEmpty.style.display = "block";

            return;

        }


        accountsEmpty.style.display = "none";


        ADMIN_ACCOUNTS.forEach(account => {

            renderAccountCard(account);

        });


    } catch (error) {

        console.error(
            "Failed to load admin accounts:",
            error
        );

        accountsGrid.innerHTML = `
            <div class="accounts-empty">
                <ion-icon name="alert-circle-outline"></ion-icon>

                <h3>Unable to load accounts</h3>

                <p>${escapeHTML(error.message)}</p>
            </div>
        `;

    }

}


/* =========================================================
   RENDER ACCOUNT
========================================================= */

function renderAccountCard(account) {

    const card =
        document.createElement("div");

    card.className =
        "admin-account-card";


    const username =
        account.username ||
        "Unnamed user";


    const email =
        account.email ||
        "No email";


    const phone =
        account.phone ||
        "No phone number";


    const suspended =
        account.accountSuspended === true &&
        Number(account.suspensionUntil) > Date.now();


    card.dataset.uid =
        account.uid;


    card.innerHTML = `

        <div class="account-card-header">

            <div class="account-avatar">

                <ion-icon name="person-outline"></ion-icon>

            </div>

            <div class="account-card-name">

                <h3>
                    ${escapeHTML(username)}
                </h3>

                <span>
                    Seasons Serials account
                </span>

            </div>

        </div>


        <div class="account-data">

            <div class="account-data-row">

                <span class="account-data-label">
                    Username
                </span>

                <span class="account-data-value">
                    ${escapeHTML(username)}
                </span>

            </div>


            <div class="account-data-row">

                <span class="account-data-label">
                    Email
                </span>

                <span class="account-data-value">
                    ${escapeHTML(email)}
                </span>

            </div>


            <div class="account-data-row">

                <span class="account-data-label">
                    Phone
                </span>

                <span class="account-data-value">
                    ${escapeHTML(phone)}
                </span>

            </div>

        </div>


        <div class="account-status ${suspended ? "suspended" : "active"}">

            <span class="account-status-dot"></span>

            <span class="account-status-text">
                ${suspended ? "Suspended" : "Active"}
            </span>

        </div>


        <div
            class="account-suspension-info"
            style="${suspended ? "" : "display:none;"}"
        >

            <strong>
                Account suspended
            </strong>

            <div class="account-suspension-countdown">
                <span class="countdown-value">
                    Calculating...
                </span>
            </div>

        </div>


        <div class="account-card-actions">

            <button
                class="account-card-btn account-reset-btn"
                data-action="reset"
            >
                <ion-icon name="key-outline"></ion-icon>
                Reset Password
            </button>


            <button
                class="
                    account-card-btn
                    account-suspend-btn
                    ${suspended ? "unsuspend" : ""}
                "
                data-action="suspend"
            >
                <ion-icon
                    name="${suspended
                        ? "play-circle-outline"
                        : "pause-circle-outline"}"
                ></ion-icon>

                ${suspended
                    ? "End Suspension"
                    : "Suspend Account"}

            </button>

        </div>

    `;


    const resetButton =
        card.querySelector(
            '[data-action="reset"]'
        );


    const suspendButton =
        card.querySelector(
            '[data-action="suspend"]'
        );


    resetButton.addEventListener(
        "click",
        () => {

            openPasswordReset(account);

        }
    );


    suspendButton.addEventListener(
        "click",
        () => {

            if (suspended) {

                requestEndSuspension(account);

            } else {

                openSuspend(account);

            }

        }
    );


    accountsGrid.appendChild(card);


    if (suspended) {

        startAccountCountdown(
            card,
            Number(account.suspensionUntil)
        );

    }

}


/* =========================================================
   PASSWORD RESET
========================================================= */

function openPasswordReset(account) {

    selectedAccount =
        account;

    passwordResetEmail.textContent =
        account.email;

    passwordResetMessage.textContent =
        "";

    passwordResetModal.classList.add("active");

}


function closePasswordReset() {

    passwordResetModal.classList.remove("active");

    selectedAccount = null;

}


closePasswordResetModal.addEventListener(
    "click",
    closePasswordReset
);


cancelPasswordReset.addEventListener(
    "click",
    closePasswordReset
);


confirmPasswordReset.addEventListener(
    "click",
    async () => {

        if (!selectedAccount) return;


        const account =
            selectedAccount;


        closePasswordReset();


        pendingSensitiveAction = async () => {

            await sendPasswordResetEmail(
                adminAuth,
                account.email
            );


            showSuccess(
                "Password reset email sent",
                `A password reset email has been sent to ${account.email}.`
            );

        };


        openReauth();

    }
);


/* =========================================================
   SUSPENSION WHEELS
========================================================= */

function setupWheel(
    wheelId,
    property
) {

    const wheel =
        document.getElementById(wheelId);


    const items =
        [...wheel.querySelectorAll(".wheel-item")];


    function selectItem(item) {

        items.forEach(
            element =>
                element.classList.remove("selected")
        );


        item.classList.add("selected");


        wheelValues[property] =
            Number(item.textContent);


        updateSuspensionPreview();

    }


    items.forEach(item => {

        item.addEventListener(
            "click",
            () => {

                item.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                selectItem(item);

            }
        );

    });


    const initial =
        items[0];

    selectItem(initial);

}


setupWheel(
    "minutesWheel",
    "minutes"
);

setupWheel(
    "hoursWheel",
    "hours"
);

setupWheel(
    "daysWheel",
    "days"
);

setupWheel(
    "monthsWheel",
    "months"
);


/* =========================================================
   SUSPENSION PREVIEW
========================================================= */

function calculateSuspensionMilliseconds() {

    const minutes =
        wheelValues.minutes;

    const hours =
        wheelValues.hours;

    const days =
        wheelValues.days;

    const months =
        wheelValues.months;


    /*
       Months are intentionally calculated as
       calendar months later, rather than assuming
       every month is exactly 30 days.
    */

    const date =
        new Date();


    date.setMinutes(
        date.getMinutes() + minutes
    );

    date.setHours(
        date.getHours() + hours
    );

    date.setDate(
        date.getDate() + days
    );

    date.setMonth(
        date.getMonth() + months
    );


    return date.getTime();
}


function updateSuspensionPreview() {

    const parts = [];


    if (wheelValues.months) {

        parts.push(
            `${wheelValues.months} month${wheelValues.months === 1 ? "" : "s"}`
        );

    }


    if (wheelValues.days) {

        parts.push(
            `${wheelValues.days} day${wheelValues.days === 1 ? "" : "s"}`
        );

    }


    if (wheelValues.hours) {

        parts.push(
            `${wheelValues.hours} hour${wheelValues.hours === 1 ? "" : "s"}`
        );

    }


    if (wheelValues.minutes) {

        parts.push(
            `${wheelValues.minutes} minute${wheelValues.minutes === 1 ? "" : "s"}`
        );

    }


    suspensionPreview.textContent =
        parts.length
            ? parts.join(" ")
            : "0 minutes";

}


/* =========================================================
   OPEN SUSPEND
========================================================= */

function openSuspend(account) {

    selectedAccount =
        account;


    wheelValues = {
        minutes: 0,
        hours: 0,
        days: 0,
        months: 0
    };


    document
        .querySelectorAll(".wheel-item")
        .forEach(item => {

            item.classList.remove("selected");

        });


    document
        .querySelectorAll(".wheel")
        .forEach(wheel => {

            wheel.scrollTop = 0;

        });


    setupWheelSelectionAfterReset();


    suspendAccountName.textContent =
        `Choose how long ${account.username || account.email} should remain suspended.`;


    updateSuspensionPreview();


    suspendModal.classList.add("active");

}


function setupWheelSelectionAfterReset() {

    const map = [
        ["minutesWheel", "minutes"],
        ["hoursWheel", "hours"],
        ["daysWheel", "days"],
        ["monthsWheel", "months"]
    ];


    map.forEach(([id, property]) => {

        const wheel =
            document.getElementById(id);


        const first =
            wheel.querySelector(".wheel-item");


        if (first) {

            first.classList.add("selected");

        }

    });

}


function closeSuspend() {

    suspendModal.classList.remove("active");

    selectedAccount = null;

}


closeSuspendModal.addEventListener(
    "click",
    closeSuspend
);


cancelSuspend.addEventListener(
    "click",
    closeSuspend
);


/* =========================================================
   CONFIRM SUSPENSION
========================================================= */

confirmSuspend.addEventListener(
    "click",
    () => {

        if (!selectedAccount) return;


        const duration =
            calculateSuspensionMilliseconds();


        if (duration <= Date.now()) {

            alert(
                "Please choose a suspension duration."
            );

            return;

        }


        const account =
            selectedAccount;


        closeSuspend();


        pendingSensitiveAction = async () => {

            await suspendAccountOnServer(
                account,
                duration
            );

        };


        openReauth();

    }
);


/* =========================================================
   SERVER SUSPENSION
========================================================= */

async function suspendAccountOnServer(
    account,
    suspensionUntil
) {

    const user =
        adminAuth.currentUser;


    if (!user) {

        throw new Error(
            "You are no longer authenticated."
        );

    }


    const idToken =
        await user.getIdToken(
            true
        );


    const response =
        await fetch(
            `${API_BASE}/api/admin-suspend-account`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${idToken}`
                },

                body: JSON.stringify({

                    uid:
                        account.uid,

                    suspensionUntil:
                        suspensionUntil

                })
            }
        );


    const data =
        await response
            .json()
            .catch(() => ({}));


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Unable to suspend account."
        );

    }


    showSuccess(
        "Account successfully suspended",
        `${account.username || account.email} has been suspended until ${new Date(suspensionUntil).toLocaleString()}.`
    );


    await loadAdminAccounts();

}


/* =========================================================
   END SUSPENSION
========================================================= */

function requestEndSuspension(account) {

    pendingSensitiveAction = async () => {

        const user =
            adminAuth.currentUser;


        const idToken =
            await user.getIdToken(true);


        const response =
            await fetch(
                `${API_BASE}/api/admin-suspend-account`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${idToken}`
                    },

                    body: JSON.stringify({

                        uid:
                            account.uid,

                        suspensionUntil:
                            0

                    })
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to end suspension."
            );

        }


        showSuccess(
            "Suspension ended",
            `${account.username || account.email} is active again.`
        );


        await loadAdminAccounts();

    };


    openReauth();

}


/* =========================================================
   REAUTHENTICATION
========================================================= */

function openReauth() {

    adminReauthPassword.value =
        "";

    reauthMessage.textContent =
        "";

    reauthMessage.style.color =
        "";


    adminReauthModal.classList.add(
        "active"
    );


    setTimeout(
        () => adminReauthPassword.focus(),
        100
    );

}


function closeReauth() {

    adminReauthModal.classList.remove(
        "active"
    );

    adminReauthPassword.value =
        "";

    reauthMessage.textContent =
        "";

    pendingSensitiveAction =
        null;

}


closeReauthModal.addEventListener(
    "click",
    closeReauth
);


cancelReauth.addEventListener(
    "click",
    closeReauth
);


toggleReauthPassword.addEventListener(
    "click",
    () => {

        const showing =
            adminReauthPassword.type === "text";


        adminReauthPassword.type =
            showing
                ? "password"
                : "text";


        toggleReauthPassword.innerHTML =
            showing
                ? `<ion-icon name="eye-outline"></ion-icon>`
                : `<ion-icon name="eye-off-outline"></ion-icon>`;

    }
);


/* =========================================================
   AUTHENTICATE
========================================================= */

confirmReauth.addEventListener(
    "click",
    async () => {

        const password =
            adminReauthPassword.value;


        if (!password) {

            reauthMessage.textContent =
                "Please enter your password.";

            reauthMessage.style.color =
                "#ffb4b4";

            return;

        }


        const user =
            adminAuth.currentUser;


        if (!user || !user.email) {

            reauthMessage.textContent =
                "Your admin session has expired.";

            reauthMessage.style.color =
                "#ffb4b4";

            return;

        }


        confirmReauth.disabled =
            true;


        try {

            const credential =
                EmailAuthProvider.credential(
                    user.email,
                    password
                );


            await reauthenticateWithCredential(
                user,
                credential
            );


            const action =
                pendingSensitiveAction;


            pendingSensitiveAction =
                null;


            adminReauthModal.classList.remove(
                "active"
            );


            if (action) {

                await action();

            }


        } catch (error) {

            console.error(
                "Admin reauthentication failed:",
                error
            );


            reauthMessage.textContent =
                "Incorrect password or authentication failed.";

            reauthMessage.style.color =
                "#ffb4b4";


        } finally {

            confirmReauth.disabled =
                false;

        }

    }
);


/* =========================================================
   SUCCESS
========================================================= */

function showSuccess(
    title,
    message
) {

    accountSuccessTitle.textContent =
        title;

    accountSuccessText.textContent =
        message;

    accountSuccessModal.classList.add(
        "active"
    );

}


closeSuccessModal.addEventListener(
    "click",
    () => {

        accountSuccessModal.classList.remove(
            "active"
        );

    }
);


/* =========================================================
   COUNTDOWN
========================================================= */

function startAccountCountdown(
    card,
    suspensionUntil
) {

    const countdown =
        card.querySelector(
            ".countdown-value"
        );


    const interval =
        setInterval(
            () => {

                const remaining =
                    suspensionUntil - Date.now();


                if (remaining <= 0) {

                    clearInterval(interval);


                    countdown.textContent =
                        "Suspension expired";


                    loadAdminAccounts();

                    return;

                }


                countdown.textContent =
                    formatSuspensionTime(
                        remaining
                    );

            },
            1000
        );


    countdownIntervals.push(
        interval
    );


    countdown.textContent =
        formatSuspensionTime(
            suspensionUntil - Date.now()
        );

}


function formatSuspensionTime(ms) {

    let seconds =
        Math.floor(ms / 1000);


    const months =
        Math.floor(
            seconds / (30 * 24 * 60 * 60)
        );


    seconds %=
        30 * 24 * 60 * 60;


    const days =
        Math.floor(
            seconds / (24 * 60 * 60)
        );


    seconds %=
        24 * 60 * 60;


    const hours =
        Math.floor(
            seconds / 3600
        );


    seconds %=
        3600;


    const minutes =
        Math.floor(
            seconds / 60
        );


    seconds %=
        60;


    const parts = [];


    if (months)
        parts.push(`${months}mo`);

    if (days)
        parts.push(`${days}d`);

    if (hours)
        parts.push(`${hours}h`);

    if (minutes)
        parts.push(`${minutes}m`);

    parts.push(`${seconds}s`);


    return parts.join(" ");
}


function clearCountdowns() {

    countdownIntervals.forEach(
        interval =>
            clearInterval(interval)
    );

    countdownIntervals = [];

}


/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
