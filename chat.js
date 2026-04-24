import { db } from "./store-system/firebase-config.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";


/* CONTENTS:
1. Store knowlegde, dictionary, memory and multilengual system
*/


//
// STORE KNOWLEDGE
//
const STORE_KNOWLEDGE = {
  login: "Click the 'Login' button in the top navigation bar.",
  payment: "Payment is done via bank transfer within 24 hours after reservation.",
  delivery: "After payment, delivery details are sent via email.",
  reservation: "Products can be reserved temporarily before payment.",
  products: "We sell pictures and stories created by Seasons Serials artists."
};

//
// DICTIONARY
//
const DICTIONARY = {
  mountains: ["mountain", "peaks", "nature", "landscape", "hills"],
  fruit: ["fruit", "summer", "food", "healthy", "watermelon", "apple"],
  future: ["future", "dream", "ambition", "chess", "strategy"],
  bamboo: ["bamboo", "green", "nature", "plant"],
  story: ["story", "book", "kids", "forest", "mushroom"],
  nature: {
    core: ["mountain", "nature", "forest"],
    related: ["peaks", "landscape", "hills", "trees", "wild"]
  },
  food: {
    core: ["fruit", "food"],
    related: ["fresh", "sweet", "healthy", "summer"]
  },
  art: {
    core: ["colorful", "painting"],
    related: ["abstract", "bright", "creative"]
  },
  kids: {
    core: ["kids", "story"],
    related: ["children", "fairy", "fun", "adventure"]
  }
};

//
// EXPAND WORDS AI FOR BETTER CONTENT UNDERSTANDING
//
async function expandWordsAI(words) {
  let expanded = new Set(words);

  for (let w of words) {
    try {
      const res = await fetch(`https://api.datamuse.com/words?ml=${w}&max=5`);
      const data = await res.json();

      data.forEach(d => expanded.add(d.word));

      // 🔥 Add manual dictionary boost
      Object.values(DICTIONARY).forEach(group => {
        const all = Array.isArray(group)
          ? group
          : [...group.core, ...group.related];

        if (all.includes(w)) {
          all.forEach(x => expanded.add(x));
        }
      });

    } catch {}
  }

  return [...expanded];
}

//
// INTERUPTS
//
const INTERRUPTS = {
  suggest: /(what can i buy|recommend|suggest)/,
  cancel: /(cancel|stop|exit|nevermind)/,
  help: /(help|menu|options)/
};

function detectInterrupt(msg) {
  for (let key in INTERRUPTS) {
    if (INTERRUPTS[key].test(msg)) return key;
  }
  return null;
}

//
// MEMORY
//
let memory = JSON.parse(localStorage.getItem("chatMemory")) || {
  lastProduct: null,
  lastIntent: null,
  lastAction: null,
  awaitingField: null,
  language: "en"
};

function saveMemory() {
  localStorage.setItem("chatMemory", JSON.stringify(memory));
}

const responseHistory = new Map();

//
// SAFE ERROR - NO CONFUSION
//
function safeError(msg, err) {
  console.error(msg, err);

  return {
    en: "I couldn't complete that request. Please try again.",
    es: "No pude completar la solicitud. Inténtalo de nuevo.",
    fr: "Impossible de compléter la demande.",
    ua: "Не вдалося виконати запит."
  }[currentLang || "en"];
}

//
// MULTILANGUAGE SYSTEM
//
const LANG = {
  EN: "en",
  ES: "es",
  FR: "fr",
  UA: "ua"
};

function detectLanguage(text) {
  const t = text.toLowerCase();

  const forced = detectForcedLanguage(text);
  if (forced) {
    languageState.current = forced;
    languageState.locked = true;
    return forced;
  }
  
  if (t.includes("switch to english")) return LANG.EN;
  if (t.includes("français") || t.includes("parle français")) return LANG.FR;
  if (t.includes("español") || t.includes("habla español")) return LANG.ES;
  if (t.includes("українською") || t.includes("українська")) return LANG.UA;

  if (!languageState.locked) {
    if (/[іїєґ]/.test(t)) return LANG.UA;
    if (t.includes("bonjour")) return LANG.FR;
    if (t.includes("hola")) return LANG.ES;
  }

  return languageState.current;
}

let languageState = {
  current: LANG.EN,
  locked: false
};

let currentLang = LANG.EN;

//
// CHAT STATE
//
let chatState = {
  mode: "normal", // normal | reporting
  step: null,
  report: {}
};

function detectForcedLanguage(text) {
  const t = text.toLowerCase();

  if (t.includes("switch to english") || t.includes("in english")) return LANG.EN;
  if (t.includes("en español") || t.includes("spanish")) return LANG.ES;
  if (t.includes("français") || t.includes("french")) return LANG.FR;
  if (t.includes("українською") || t.includes("українська")) return LANG.UA;

  return null;
}

const chatBtn = document.getElementById("chatButton");
const chatPanel = document.getElementById("chatPanel");
const closeChat = document.getElementById("closeChat");

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

const suggestions = document.querySelectorAll(".chat-suggestion");

// OPEN / CLOSE
chatBtn.addEventListener("click", () => {
  chatPanel.classList.toggle("show");
});

closeChat.addEventListener("click", () => {
  chatPanel.classList.remove("show");
});

// ADD MESSAGE
function addMessage(text, type) {
  const wrapper = document.createElement("div");
  wrapper.className = `chat-msg-wrapper ${type}`;

  const time = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  wrapper.dataset.time = time;

  const msg = document.createElement("div");
  msg.className = `chat-msg ${type}-msg`;
  msg.innerText = text;

  const actions = document.createElement("div");
  actions.className = "msg-actions";
  
  if (type === "user") {
    actions.innerHTML = `
      <button class="copy-btn"><ion-icon name="copy-outline"></ion-icon></button>
      <button class="delete-btn"><ion-icon name="trash-outline"></ion-icon></button>
      <button class="more-btn"><ion-icon name="ellipsis-horizontal"></ion-icon></button>
    `;
  } else {
    actions.innerHTML = `
      <button class="copy-btn"><ion-icon name="copy-outline"></ion-icon></button>
      <button class="like-btn"><ion-icon name="thumbs-up-outline"></ion-icon></button>
      <button class="dislike-btn"><ion-icon name="thumbs-down-outline"></ion-icon></button>
    `;
  }

  const menu = document.createElement("div");
  menu.className = "menu-dropdown hidden";
  menu.innerHTML = `
    <div class="menu-item edit-btn">Edit</div>
    <div class="menu-item time-btn">Show details</div>
  `;

  wrapper.appendChild(menu);

  wrapper.appendChild(msg);
  wrapper.appendChild(actions);

  chatMessages.appendChild(wrapper);
}

let messageToDelete = null;

function openModal() {
  const modal = document.getElementById("deleteModal");
  modal.classList.add("show");

  // lock background scroll
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = document.getElementById("deleteModal");
  modal.classList.remove("show");

  document.body.style.overflow = "";
  messageToDelete = null;
}

document.getElementById("cancelDelete").onclick = closeModal;

document.getElementById("confirmDeleteBtn").onclick = () => {
  if (messageToDelete) {
    const next = messageToDelete.nextElementSibling;

    messageToDelete.remove();

    if (next && next.classList.contains("bot")) {
      next.remove();
    }

    showToast("Message deleted");
  }
  closeModal();
};

// FIX ESC properly
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

document.addEventListener("click", (e) => {
  const wrapper = e.target.closest(".chat-msg-wrapper");
  if (!wrapper) return;

  // COPY
  if (e.target.closest(".copy-btn")) {
    const msg = wrapper.querySelector(".chat-msg");
    const btn = e.target.closest(".copy-btn");
    navigator.clipboard.writeText(msg.innerText);
    
    btn.innerText = "Copied";
    showToast("Copied");

    setTimeout(() => {
      btn.innerHTML = '<ion-icon name="copy-outline"></ion-icon>';
    }, 1500);
    
    return;
   };

  // DELETE OPEN MODAL
  if (e.target.closest(".delete-btn") || e.target.closest(".menu-item.delete-btn")) {
    messageToDelete = wrapper;
    openModal();
    return;
  }

  // MENU TOGGLE (FIXED)
  if (e.target.closest(".more-btn")) {
    const menu = wrapper.querySelector(".menu-dropdown");

    // close all others first
    document.querySelectorAll(".menu-dropdown").forEach(m => {
      if (m !== menu) m.classList.add("hidden");
    });

    menu.classList.toggle("hidden");
    return;
  }

  // TIME
  if (e.target.closest(".time-btn")) {
    const modal = document.createElement("div");
    modal.className = "time-modal";
    modal.innerHTML = `
      <div class="time-box">
        <h3>Message details</h3>
        <p>${new Date().toLocaleString()}</p>
        <button onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  if (e.target.closest(".edit-btn")) {
  alert("Coming soon...");
}

if (e.target.closest(".like-btn")) {
  const icon = e.target.closest("ion-icon");
  icon.setAttribute("name", "thumbs-up");
}

if (e.target.closest(".dislike-btn")) {
  const icon = e.target.closest("ion-icon");
  icon.setAttribute("name", "thumbs-down");
}

  // click outside closes menus
  document.querySelectorAll(".menu-dropdown").forEach(m => {
    if (!m.contains(e.target)) m.classList.add("hidden");
  });
});

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "chat-toast";
  toast.innerText = text;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// LOADING MESSAGE
function addLoading() {
  const msg = document.createElement("div");
  msg.className = "chat-msg bot-msg";

  msg.innerHTML = `
    <div class="loading">
      <span></span><span></span><span></span>
    </div>
  `;

  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return msg;
}

function getTypingDelay(text) {
  return Math.min(2000, 500 + text.length * 20);
}

// SEND MESSAGE
async function sendMessage(text) {
  if (!text.trim()) return;

  addMessage(text, "user");
  chatInput.value = "";

  const loading = addLoading();

  let response;

  try {
    response = await generateSmartReply(text);

    if (!response) throw new Error("Empty AI response");

  } catch (err) {
    console.error(err);

    response = clarifyResponse(text);
  }

  setTimeout(() => {
    loading.remove();
    addMessage(response, "bot");
  }, getTypingDelay(response));
}
// INPUT SEND
sendBtn.addEventListener("click", () => {
  sendMessage(chatInput.value);
});

// ENTER KEY
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage(chatInput.value);
  }
});

// SUGGESTIONS
suggestions.forEach(btn => {
  btn.addEventListener("click", () => {
    sendMessage(btn.innerText);
  });
});

async function getProductStatus(productId) {
  const ref = doc(db, "products", productId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return "unknown";

  return snap.data().status; // available | reserved | sold
}

async function generateSmartReply(input) {

  currentLang = detectLanguage(input);
  
  const forcedLang = detectForcedLanguage(input);

  if (forcedLang) {
    currentLang = forcedLang;
  }
  
  const msg = normalize(input);

  if (msg.includes("auto language")) {
    languageState.locked = false;
  }

  if (chatState.mode === "reporting") {
    return handleReportFlow(msg);
  }

  if (isGreeting(msg)) {
    return formatResponse(`
Hello, and welcome to Seasons Serials.

How may I assist you today?
    `);
  }

  if (msg.includes("same in spanish")) {
    currentLang = LANG.ES;
    return "Claro. A partir de ahora responderé en español.";
  }

  if (msg.includes("українською")) {
    currentLang = LANG.UA;
    return "Звісно. Від тепер я відповідатиму українською.";
  }

  const intent = analyzeIntent(msg);

  const greet = isGreeting(msg);

  let response = await generateResponse(intent, msg);

  if (greet) {
    response = "👋 Hello!\n\n" + response;
  }

  // ✅ MEMORY SAVE (CORRECT PLACE)
  memory.lastIntent = intent;
  memory.lastMessage = msg;
  saveMemory();

  return response;
}

function normalize(text) {
  text = correctTypos(text);

  return text
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñіїєґ]/gi, "")
    .trim();
}

//
// EXTRACT PRODUCT NAME FOR SEARCH
//
function extractProductName(msg) {
  const products = document.querySelectorAll(".sale-product-box");

  for (let p of products) {
    const name = p.querySelector(".product-name")?.innerText
      .toLowerCase()
      .replace(/"/g, "")
      .trim();

    // ✅ STRICT MATCH FIRST
    if (msg.includes(name)) {
      return p.id;
    }

    // ✅ PARTIAL MATCH ONLY FOR STRONG WORDS (>=5 chars)
    const words = name.split(" ").filter(w => w.length >= 5);

    if (words.some(w => msg.includes(w))) {
      return p.id;
    }
  }

  return null;
}

function hasIntent(msg, keywords) {
  return keywords.some(k => msg.includes(k));
}

function isGreeting(msg) {
  return ["hi", "hello", "hey", "good morning", "good evening"].some(g => msg.includes(g));
}

function correctTypos(text) {
  const corrections = {
    "hllo": "hello",
    "helo": "hello",
    "byu": "buy",
    "prodct": "product",
    "pament": "payment",
    "envio": "envío",
    "holaa": "hola",
    "bonjor": "bonjour"
  };

  let words = text.split(" ");

  words = words.map(w => corrections[w] || w);

  return words.join(" ");
}

function t(key) {
  const dict = {
    greeting: {
      en: "Hello! 👋 I'm your Seasons Serials assistant. How can I help you?",
      es: "¡Hola! 👋 Soy tu asistente de Seasons Serials. ¿En qué puedo ayudarte?",
      fr: "Bonjour ! 👋 Je suis votre assistant Seasons Serials. Comment puis-je vous aider ?",
      ua: "Привіт! 👋 Я асистент Seasons Serials. Чим можу допомогти?"
    },

    noProducts: {
      en: "I couldn't find matching products.",
      es: "No encontré productos coincidentes.",
      fr: "Je n'ai trouvé aucun produit correspondant.",
      ua: "Я не знайшов відповідних товарів."
    },

    help: {
      en: "I can help you find products, explain the store, or report a problem.",
      es: "Puedo ayudarte a encontrar productos o reportar un problema.",
      fr: "Je peux vous aider à trouver des produits ou signaler un problème.",
      ua: "Я можу допомогти знайти товари або повідомити про проблему."
    },

    reportStart: {
      en: "I'm sorry 😔 What type of problem?\n• Payment\n• Product\n• Website",
      es: "Lo siento 😔 ¿Qué tipo de problema?\n• Pago\n• Producto\n• Sitio web",
      fr: "Désolé 😔 Quel type de problème ?\n• Paiement\n• Produit\n• Site web",
      ua: "Вибачте 😔 Яка проблема?\n• Оплата\n• Товар\n• Сайт"
    },

    thanks: {
      en: "You're welcome 😊 Always happy to help.",
      es: "¡De nada! 😊 Siempre encantado de ayudar.",
      fr: "Avec plaisir 😊 Toujours là pour aider.",
      ua: "Будь ласка 😊 Завжди радий допомогти."
    },

    loginHelp: {
      en: "To log in, click on 'Login' in the navigation bar at the top of the page. Enter your credentials and you'll be inside your account.",
      es: "Para iniciar sesión, haz clic en 'Login' en la barra superior.",
      fr: "Pour vous connecter, cliquez sur 'Login' dans la barre de navigation.",
      ua: "Щоб увійти, натисніть 'Login' у верхньому меню."
    },

  payment: {
    en: "Payments are completed via bank transfer. After placing an order, you have 24 hours to complete the payment.",
    es: "El pago se realiza por transferencia bancaria en 24h.",
    fr: "Le paiement se fait par virement bancaire sous 24h.",
    ua: "Оплата здійснюється банківським переказом протягом 24 годин."
  },

  delivery: {
    en: "After payment confirmation, your order is processed and details are sent via email.",
    es: "Después del pago, recibirás los detalles por correo.",
    fr: "Après paiement, vous recevrez les détails par email.",
    ua: "Після оплати ви отримаєте деталі на email."
  },

  productFound: {
    en: "Here are some relevant products:",
    es: "Aquí tienes algunos productos:",
    fr: "Voici quelques produits:",
    ua: "Ось кілька товарів:"
  },

  confused: {
    en: "Could you clarify a bit more? I'm here to help 😊",
    es: "¿Puedes explicar un poco más?",
    fr: "Pouvez-vous préciser ?",
    ua: "Можеш уточнити?"
  }
  };

  return dict[key]?.[currentLang] || dict[key]?.en;
}

function searchProductsSmart(query) {
  const words = query.split(" ");
  const products = document.querySelectorAll(".sale-product-box");
  const matches = [];

  products.forEach(p => {
    const nameEl = p.querySelector(".product-name");
    if (!nameEl) return;

    const name = nameEl.textContent.toLowerCase();

    let score = 0;

    words.forEach(word => {
      if (name.includes(word)) score++;
    });

    if (score > 0) {
      matches.push({
        name: nameEl.textContent,
        score
      });
    }
  });

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(p => "• " + p.name);
}

//
// ERROR HANDLING
//
async function handleReportFlow(msg) {

  const interrupt = detectInterrupt(msg);

  if (interrupt === "suggest") {
    chatState = { mode: "normal", step: null, report: {} };
    return generateResponse("suggest", msg);
  }

  // STEP 1 — TYPE
  if (chatState.step === "ask_type") {

  if (/pay|payment/.test(msg)) chatState.report.type = "payment";
  else if (/product|item/.test(msg)) chatState.report.type = "product";
  else if (/site|website|bug/.test(msg)) chatState.report.type = "website";
  else {
    return "Please choose: payment, product, or website.";
  }

  chatState.step = "ask_desc";
  return "Got it. Describe the issue.";
}

  // STEP 2 — DESCRIPTION
  if (chatState.step === "ask_desc") {
    chatState.report.description = msg;
    chatState.step = "ask_email";

    return "Thank you. If you would like a response, please provide your email, or type 'skip'.";
  }

  // STEP 3 — EMAIL + SAVE TO FIREBASE
  if (chatState.step === "ask_email") {

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    if (msg !== "skip" && !isValidEmail(msg)) {
      return "This isn't a valid email address. Please try again or type 'skip'.";
    }

    chatState.report.email = msg === "skip" ? null : msg;

    try {
      await addDoc(collection(db, "chat"), {
        type: chatState.report.type,
        description: chatState.report.description,
        email: chatState.report.email,
        createdAt: serverTimestamp(),
        status: "new"
      });

    } catch (err) {
    console.error("Firestore error:", err);

    return `Report failed ❌

Reason:
${err.message || err}

Check:
• Internet connection
• Firebase rules
• Firestore initialization`;
}

    // RESET STATE
    chatState = {
      mode: "normal",
      step: null,
      report: {}
    };

    return formatResponse(`
Your report has been successfully submitted.

Our team will review it as soon as possible.
Thank you for helping us improve the platform.
    `);
  }

  return "Unexpected state. Restarting report process.";
}

//
// SMART FALLBACK
//
function clarifyResponse(msg) {
  return {
    en: "Could you clarify a bit so I can help better?",
    es: "¿Puedes aclarar un poco más?",
    fr: "Peux-tu préciser un peu ?",
    ua: "Можеш трохи уточнити?"
  }[currentLang];
}

//
// INTENTS AND ANALYZING FOR CONTEXT UNDERSTANDING
//
const INTENTS = {
  about_assistant: {
    en: ["what are you used for", "what do you do", "your purpose"],
    es: ["para que sirves", "que haces"],
    fr: ["a quoi tu sers", "que fais tu"],
    ua: ["для чого ти", "що ти робиш"]
  },

  seasons_serials: {
    en: ["seasons serials", "company", "who created"],
    es: ["seasons serials", "empresa"],
    fr: ["seasons serials", "entreprise"],
    ua: ["seasons serials", "компанія"]
  },

  suggest: {
    en: ["what can i buy", "recommend", "suggest", "show"],
    es: ["que puedo comprar", "recomienda"],
    fr: ["que puis je acheter", "recommande"],
    ua: ["що купити", "порадь"]
  },

  availability: {
    en: ["available", "in stock", "is it available", "can i buy"],
    es: ["disponible"],
    fr: ["disponible"],
    ua: ["доступний", "в наявності"]
  },
  
  product_search: {
    en: ["product", "item"],
    es: ["producto"],
    fr: ["produit"],
    ua: ["товар"]
  },

  semantic_search: {
    en: ["something like", "with", "looking for"],
    es: ["algo con", "busco"],
    fr: ["quelque chose avec", "je cherche"],
    ua: ["щось з", "я шукаю"]
  },

  help: {
    en: ["help", "problem"],
    es: ["ayuda", "problema"],
    fr: ["aide", "probleme"],
    ua: ["допомога", "проблема"]
  },

  sorry: {
    en: ["no", "wrong", "bad", "terrible", "no"],
    es: ["mal", "no funciona", "no"],
    fr: ["mauvais", "ça marche pas", "no"],
    ua: ["погано", "не працює", "ні"]
  },

  report: {
    en: ["report", "bug", "error", "issue"],
    es: ["reportar", "error"],
    fr: ["signaler"],
    ua: ["повідомити", "помилка"]
  },

  payment: {
  en: ["payment", "pay", "how to pay"],
  es: ["pago"],
  fr: ["paiement"],
  ua: ["оплата"]
},

delivery: {
  en: ["delivery", "shipping"],
  es: ["entrega"],
  fr: ["livraison"],
  ua: ["доставка"]
},

price: {
  en: ["price", "cost", "how much", "how much is", "what is the price"],
  es: ["precio"],
  fr: ["prix"],
  ua: ["ціна"]
},

product_info: {
  en: ["details", "info", "description"],
  es: ["detalles"],
  fr: ["détails"],
  ua: ["опис"]
},

cheapest: {
  en: ["cheapest", "lowest price"],
  es: ["más barato"],
  fr: ["moins cher"],
  ua: ["найдешевший"]
},

expensive: {
  en: ["most expensive", "highest price"],
  es: ["más caro"],
  fr: ["plus cher"],
  ua: ["найдорожчий"]
}
};

function analyzeIntent(msg) {
  const lower = msg.toLowerCase();

  for (let intent in INTENTS) {
    const phrases = Object.values(INTENTS[intent]).flat();

    for (let phrase of phrases) {
      if (lower.includes(phrase)) {
        return intent; // ✅ DIRECT MATCH FIRST
      }
    }
  }

  // fallback to your old scoring
  let words = lower.split(" ");
  let scores = {};

  for (let intent in INTENTS) {
    scores[intent] = 0;

    const allWords = Object.values(INTENTS[intent]).flat();

    allWords.forEach(keyword => {
      keyword.split(" ").forEach(k => {
        if (words.includes(k)) scores[intent]++;
      });
    });
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  if (sorted[0][1] === 0) return "clarify";

  return sorted[0][0];
}

//
// GET PRODUCT DATA
//
function getProductData() {
  const products = document.querySelectorAll(".sale-product-box");

  return Array.from(products).map(p => {
    const id = p.id;
    const name = p.querySelector(".product-name")?.innerText || "";
    const price = p.querySelector(".product-price")?.innerText || "";

    // find description via wrapper
    const link = p.querySelector(".more-info-product");
    let description = "";

    if (link) {
      const wrapperId = link.dataset.wrapper;
      const wrapper = document.getElementById(wrapperId);

      if (wrapper) {
        description = wrapper.innerText.toLowerCase();
      }
    }

    return {
      id,
      name,
      price,
      description
    };
  });
}

//
// GENERATE RESPONSE
async function generateResponse(intent, msg) {

  const productId = extractProductName(msg);
  
  if (productId) {

  // 🚫 DO NOT AUTO-ANSWER unless user explicitly asked
  const explicitIntent =
    /\b(price|cost|how much|available|availability|details|info|description)\b/.test(msg);

  memory.lastProduct = productId;
  saveMemory();

  if (explicitIntent) {
    const realIntent = analyzeIntent(msg);
    return await handleProductContext(productId, realIntent, msg);
  }

  // ✅ ALWAYS ask first
  return handleProductContext(productId, "ask", msg);
}
  
  function random(key, arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      return "I couldn't generate a response.";
    }

    const last = responseHistory.get(key);

    let filtered = arr;
    if (arr.length > 1 && last) {
      filtered = arr.filter(x => x !== last);
    }

    const chosen = filtered[Math.floor(Math.random() * filtered.length)];

    responseHistory.set(key, chosen);
    return chosen;
  }

  // 🔁 CONTEXT FOLLOW-UP (NO PRODUCT MENTIONED)
if (!extractProductName(msg) && memory.lastProduct) {

  if (intent === "price") {
    return handleProductContext(memory.lastProduct, "price", msg);
  }

  if (intent === "availability") {
    return handleProductContext(memory.lastProduct, "availability", msg);
  }

  if (intent === "product_info") {
    return handleProductContext(memory.lastProduct, "product_info", msg);
  }
}

  if (intent === "ask") {
  memory.awaitingField = true;

  return `I found "${data.name}".  

What would you like to know?
• Price
• Availability
• Details`;
}
  
  // 🧠 ABOUT
  if (intent === "about_assistant") {
    return random("about_assistant", [
      "I'm your assistant. I help you find products, check availability, and solve issues.",
      "I can guide you through products, payments, delivery, and problems on this store.",
      "Think of me as your shopping assistant. Ask me anything about products or orders.",
      "I help you browse products, manage orders, and answer store questions.",
      "I'm a shopping assistant for this store — I guide you through products and support.",
      "My role is to help you find items, check availability, and solve issues."
    ]);
  }

  // 💳 PAYMENT (NOW WORKS)
  if (intent === "payment") {
    return random("payment", [
      "Payments are done via bank transfer. You have 24 hours after placing an order.",
      "To complete a purchase, you’ll receive payment instructions after ordering.",
      "We currently use bank transfer. Make sure to complete it within 24 hours."
    ]);
  }

  // 🚚 DELIVERY (NOW WORKS)
  if (intent === "delivery") {
    return random("delivery", [
      "After payment confirmation, you’ll receive all delivery details by email.",
      "We process your order after payment and send instructions directly to your email.",
      "Delivery details are shared once your payment is confirmed."
    ]);
  }

  // 🛒 PRODUCT SEARCH
  if (intent === "suggest") {

    const products = getProductData();

    const shuffled = products.sort(() => 0.5 - Math.random());

    const selected = shuffled.slice(0, 4);

    memory.expectingDescription = true;
    saveMemory();

    return `Here are some products you might like:

    ${selected.map(p => `• ${p.name} — ${p.price}`).join("\n")}

    💡 Try describing what you’re looking for:
For example:
• "something with mountains"
• "a colorful summer picture"
• "a story for kids"`;
  }

// 🔥 FOLLOW-UP HANDLING
if (memory.awaitingProduct) {
  const productId = extractProductName(msg);

  if (!productId) {
    const newIntent = analyzeIntent(msg);

    if (newIntent !== "clarify") {
      memory.awaitingProduct = false;
      return generateResponse(newIntent, msg);
    }

    return "I couldn't find that product.";
  }

  memory.awaitingProduct = false;
  return generateResponse("availability", msg);
}

  // 🚨 REPORT
  if (intent === "report") {
    chatState.mode = "reporting";
    chatState.step = "ask_type";
    return "I’m sorry about that 😔 What type of issue is it?\n• Payment\n• Product\n• Website";
  }

  if (intent === "price" && memory.lastProduct) {
    const data = getProductData().find(p => p.id === memory.lastProduct);
    return data ? `💰 ${data.name} costs ${data.price}` : "I couldn't find the price.";
  }

  if (intent === "product_info") {
    const data = getProductData().find(p => p.id === memory.lastProduct);
    return data ? `📦 ${data.name}

  ${data.description.slice(0, 300)}...` : "No info found.";
  }

  if (memory.expectingChoice) {

  if (/yes|yeah|ok|sure|yep/.test(msg)) {
    const p = memory.lastSuggested?.[0];

    if (!p) return "Something went wrong 😅";

    memory.expectingChoice = false;
    saveMemory();

    return `📦 ${p.name}

${p.description}`;
  }

  if (/something else|another|different/.test(msg)) {
    memory.expectingChoice = false;
    saveMemory();
    return generateResponse("suggest", msg);
  }
}

  if ((intent === "price" || intent === "availability") && !memory.lastProduct) {
  memory.awaitingProduct = true;
  return "Which product are you referring to?";
}

  if (intent === "semantic_search") {
  if (!/with|like|something|busco|cherche|шукаю/.test(msg)) {
    return clarifyResponse(msg);
  }

  const results = await semanticSearch(msg);

  if (!results || !results.length) {
    return "I couldn’t match anything. Let me suggest something.";
  }

  const p = results[0];

  return `✨ I found something based on your description:

${results.map(p => `• ${p.name}`).join("\n")}

👉 Say "yes" to see details or "something else" if this isn't something you are looking for`;
}

  if (intent === "product_search") {
  const productId = extractProductName(msg);
  const product = getProductData().find(p => p.id === productId);

  if (!productId) {
    memory.awaitingProduct = false;
    return "I couldn’t find that product. Did you mean something else?";
  }

  memory.lastProduct = productId;
  memory.awaitingDescription = true;

  return `${product.name}
${product.price}

Would you like the product description?`;
}

if (memory.awaitingDescription) {
  if (/yes|yeah|sí|oui|так|да/.test(msg)) {
    const product = getProductData().find(p => p.id === memory.lastProduct);
    memory.awaitingDescription = false;

    return `${product.name}

${product.description}`;
  }

  memory.awaitingDescription = false;
}

  const interrupt = detectInterrupt(msg);

  if (interrupt) {
    chatState = { mode: "normal", step: null, report: {} };

    if (interrupt === "suggest") return generateResponse("suggest", msg);
    if (interrupt === "cancel") return "Alright, I've stopped that process. What would you like to do now?";
    if (interrupt === "help") return t("help");
  }

  // 🔥 DIRECT SIMPLE QUESTIONS (ALWAYS ANSWER)
  if (msg.includes("what do you sell")) return STORE_KNOWLEDGE.products;
  if (msg.includes("login")) return t("loginHelp");
  if (msg.includes("payment")) return t("payment");
  if (msg.includes("delivery")) return t("delivery");

  // 🔥 HELP ALWAYS WORKS
  if (intent === "help") {
    return t("help");
  }

  // 💸 CHEAPEST
  if (intent === "cheapest") {
    const products = getProductData();
    const cheapest = products.sort((a,b)=>parseFloat(a.price)-parseFloat(b.price))[0];
    return `💸 ${cheapest.name} — ${cheapest.price}`;
  }

  // 💎 EXPENSIVE
  if (intent === "expensive") {
    const products = getProductData();
    const expensive = products.sort((a,b)=>parseFloat(b.price)-parseFloat(a.price))[0];
    return `💎 ${expensive.name} — ${expensive.price}`;
  }

if (intent === "seasons_serials") {
  return `Seasons Serials is a Ukrainian company owned by Dmytro Moroz.

It creates paintings, stories, performances and more artistic projects.

More info:
https://about-seasons-serials.netlify.app`;
}

if (intent === "help") {
  memory.awaitingHelp = true;
  return "How can I help you today?";
}

if (memory.awaitingHelp) {
  memory.awaitingHelp = false;
  return "Coming soon…";
}

if (intent === "sorry") {
  return "I understand something went wrong. I'm very sorry for that. I'm doing my best to help you. Ler's try again.";
}
  
  return clarifyResponse(msg);
}

function formatResponse(text) {
  return text
    .trim()
    .replace(/\n\s+/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1");
}

function randomize(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}


//
// SEMANTIC SEARCH
//
async function semanticSearch(msg) {
  const products = getProductData();

  let words = msg.split(" ");
  words = await expandWordsAI(words);

  let scored = [];

  products.forEach(p => {
    let score = 0;
    const text = (p.name + " " + p.description).toLowerCase();

    words.forEach(w => {
      if (text.includes(w)) score += 1;
    });

    if (score >= 1) { // 🔥 threshold fix
      scored.push({ ...p, score });
    }
  });

  if (!scored.length) return null;

  scored.sort((a,b)=>b.score-a.score);

  return scored.slice(0, 2); // 🔥 MAX 2 RESULTS
}

//
// CHANGE PRODUCTS EVEETY 48 HOURS
//
function getStableSuggestions(products) {
  const key = "suggest_cache";
  const cache = JSON.parse(localStorage.getItem(key));

  const now = Date.now();

  if (cache && now - cache.time < 48 * 60 * 60 * 1000) {
    return cache.data;
  }

  const selected = products
    .filter(p => p.status === "available")
    .slice(0, 4);

  localStorage.setItem(key, JSON.stringify({
    time: now,
    data: selected
  }));

  return selected;
}

async function handleProductContext(productId, intent, msg) {

  const data = getProductData().find(p => p.id === productId);

  if (!data) return "I couldn't find that product.";

  // 🧠 CASE 1: USER CLEARLY ASKED SOMETHING
  if (intent === "price") {
    memory.lastAction = "price";
    return `💰 ${data.name} costs ${data.price}`;
  }

  if (intent === "availability") {
    const status = await getProductStatus(productId);
    memory.lastAction = "availability";

    return formatAvailability(status, data);
  }

  if (intent === "product_info") {
    memory.lastAction = "details";

    return `📦 ${data.name}

${data.description.slice(0, 300)}...`;
  }

  // 🧠 CASE 2: FOLLOW-UP (USER SAID "yes", "ok", etc.)
  if (memory.awaitingField) {
  if (intent === "price" || intent === "availability" || intent === "product_info") {
    memory.awaitingField = null;
    return handleProductContext(productId, intent, msg);
  }

  return clarifyResponse(msg);
}

  // 🧠 CASE 3: USER JUST MENTIONED PRODUCT (NO INTENT)
  memory.awaitingField = null;
  memory.lastProduct = productId;

  return `I found "${data.name}".

What would you like to know?
• Price
• Availability
• Details`;
}

function formatAvailability(status, data) {
  const map = {
    available: "Yes ✅ it's available.",
    reserved: "⚠️ It's reserved.",
    sold: "❌ It's sold."
  };

  return `${map[status] || "Unknown status."}

Product: ${data.name}
Price: ${data.price}`;
}
