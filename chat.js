import { db } from "./store-system/firebase-config.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const STORE_KNOWLEDGE = {
  login: "Click the 'Login' button in the top navigation bar.",
  payment: "Payment is done via bank transfer within 24 hours after reservation.",
  delivery: "After payment, delivery details are sent via email.",
  reservation: "Products can be reserved temporarily before payment.",
  products: "We sell pictures and stories created by Seasons Serials artists."
};

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

let memory = JSON.parse(localStorage.getItem("chatMemory")) || {
  lastProduct: null,
  lastIntent: null,
  language: "en"
};

function saveMemory() {
  localStorage.setItem("chatMemory", JSON.stringify(memory));
}

const responseHistory = new Map();

function safeError(msg, err) {
  console.error(msg, err);

  return {
    en: "I couldn't complete that request. Please try again.",
    es: "No pude completar la solicitud. Inténtalo de nuevo.",
    fr: "Impossible de compléter la demande.",
    ua: "Не вдалося виконати запит."
  }[currentLang];
}

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

    response = smartFallback(text);
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

  const forcedLang = detectForcedLanguage(input);

  if (forcedLang) {
    currentLang = forcedLang;
  }
  
  const msg = normalize(input);

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

function extractProduct(msg) {
  const products = getProductData();

  let best = null;
  let bestScore = 0;

  for (let p of products) {
    const words = p.name.toLowerCase().split(" ");
    let score = 0;

    words.forEach(w => {
      if (msg.includes(w)) score++;
    });

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return best;
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

async function handleReportFlow(msg) {

  const interrupt = detectInterrupt(msg);

  if (interrupt === "suggest") {
    chatState = { mode: "normal", step: null, report: {} };
    return generateResponse("suggest", msg);
  }

  if (msg.includes("cheapest")) {
  const products = getProductData();
  const cheapest = products.sort((a,b)=>parseFloat(a.price)-parseFloat(b.price))[0];
  return `💸 Cheapest: ${cheapest.name} — ${cheapest.price}`;
}

if (msg.includes("expensive")) {
  const products = getProductData();
  const expensive = products.sort((a,b)=>parseFloat(b.price)-parseFloat(a.price))[0];
  return `💎 Most expensive: ${expensive.name} — ${expensive.price}`;
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

function smartFallback(msg) {
  const words = msg.split(" ");

  const hints = [];

  if (msg.includes("?")) hints.push("This looks like a question.");
  if (words.length < 3) hints.push("Try adding more details.");
  if (!/\b(buy|price|order|help)\b/.test(msg)) {
    hints.push("Try mentioning what you want to do (buy, ask, report).");
  }

  return {
    en: `I couldn’t match your request to a clear intent.

${hints.join("\n")}

Try: “What can I buy?” or “Help with payment”`,
    es: "No pude entender bien tu mensaje.",
    fr: "Je n'ai pas compris clairement.",
    ua: "Я не зрозумів запит."
  }[currentLang];
}

async function fallbackAI(msg) {
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer YOUR_HF_TOKEN",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: msg })
      }
    );

    const data = await res.json();
    return data?.generated_text || "I couldn't respond.";
  } catch {
    return smartFallback(msg);
  }
}

function analyzeIntent(msg) {
  const m = msg.toLowerCase();

  const patterns = [
    { intent: "report", test: /(report|bug|issue|problem|error)/ },
    { intent: "suggest", test: /(buy|recommend|suggest|what.*buy|get)/ },
    { intent: "payment", test: /(pay|payment|transfer|money)/ },
    { intent: "delivery", test: /(delivery|shipping|arrive)/ },
    { intent: "availability", test: /(available|in stock|sold|reserved)/ },
    { intent: "price", test: /(price|cost|how much)/ },
    { intent: "product_query", test: /(this|product|item)/ },
  ];

  for (let p of patterns) {
    if (p.test.test(m)) return p.intent;
  }

  // 🔥 fallback to semantic
  return "semantic";
}

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

async function generateResponse(intent, msg) {

  // 🚨 REPORT MODE FIRST (LOCKED)
  if (chatState.mode === "reporting") {
    return handleReportFlow(msg);
  }

  // 🛒 SUGGEST
  if (intent === "suggest") {
    const products = getProductData().slice(0,3);

    memory.lastSuggested = products;
    memory.expectingChoice = true;

    return `Here are suggestions:\n\n${products.map(p => `• ${p.name}`).join("\n")}`;
  }

  // 📦 PRODUCT DIRECT
  const product = extractProduct(msg);

  if (product) {
    memory.lastProduct = product.id;

    const status = await getProductStatus(product.id);

    return `📦 ${product.name}
💰 ${product.price}
Status: ${status}`;
  }

  // 🔍 SEMANTIC SEARCH (AUTO)
  if (intent === "semantic") {
    const results = await semanticSearchSmart(msg);

    if (results) {
      return `✨ Found:\n\n${results.map(p => `• ${p.name}`).join("\n")}`;
    }
  }

  // 💳 PAYMENT
  if (intent === "payment") return STORE_KNOWLEDGE.payment;

  // 🚚 DELIVERY
  if (intent === "delivery") return STORE_KNOWLEDGE.delivery;

  // 🚨 REPORT START
  if (intent === "report") {
    chatState.mode = "reporting";
    chatState.step = "ask_type";
    return "What type of issue?\n• payment\n• product\n• website";
  }

  return smartFallback(msg);
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

async function semanticSearchSmart(msg) {
  const products = getProductData();

  let words = msg.split(" ");
  words = await expandWordsAI(words);

  let scored = [];

  for (let p of products) {
    let score = 0;
    const text = (p.name + " " + p.description).toLowerCase();

    words.forEach(w => {
      if (text.includes(w)) score += 2;
    });

    if (score > 2) scored.push({ ...p, score });
  }

  if (!scored.length) return null;

  return scored.sort((a,b)=>b.score-a.score).slice(0,3);
}
