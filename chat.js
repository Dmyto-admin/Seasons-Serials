import { db } from "./store-system/firebase-config.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

let memory = JSON.parse(localStorage.getItem("chatMemory")) || {
  lastProduct: null,
  lastIntent: null,
  language: "en"
};

function saveMemory() {
  localStorage.setItem("chatMemory", JSON.stringify(memory));
}

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

  if (/[іїєґ]/.test(t)) return LANG.UA;

  if (t.includes("hola") || t.includes("comprar") || t.includes("producto"))
    return LANG.ES;

  if (t.includes("bonjour") || t.includes("produit"))
    return LANG.FR;

  return LANG.EN;
}

let currentLang = LANG.EN;

let chatState = {
  mode: "normal", // normal | reporting
  step: null,
  report: {}
};

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

  const msg = document.createElement("div");
  msg.className = `chat-msg ${type}-msg`;
  msg.innerText = text;

  const actions = document.createElement("div");
  actions.className = "msg-actions";
  actions.innerHTML = `
    <button class="copy-btn"><ion-icon name="copy-outline"></ion-icon></button>
    <button class="delete-btn"><ion-icon name="trash-outline"></ion-icon></button>
    <button class="more-btn"><ion-icon name="ellipsis-horizontal"></ion-icon></button>
  `;

  wrapper.appendChild(msg);
  wrapper.appendChild(actions);

  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.addEventListener("click", e => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;

  const msg = btn.closest(".chat-msg-wrapper").querySelector(".chat-msg");

  navigator.clipboard.writeText(msg.innerText);

  const icon = btn.querySelector("ion-icon");
  icon.name = "checkmark-outline";
  icon.style.color = "lime";

  setTimeout(() => {
    icon.name = "copy-outline";
    icon.style.color = "";
  }, 1500);
});

function openDeleteModal() {
  if (confirm("Are you sure you want to delete this message?")) {
    confirmDelete();
  }
}

let messageToDelete = null;

document.addEventListener("click", e => {
  if (e.target.classList.contains("delete-btn")) {
    messageToDelete = e.target.closest(".chat-msg-wrapper");
    document.getElementById("deleteModal").classList.remove("hidden");
  }
});

document.getElementById("cancelDelete").onclick = () => {
  document.getElementById("deleteModal").classList.add("hidden");
};

document.getElementById("confirmDeleteBtn").onclick = () => {
  if (messageToDelete) messageToDelete.remove();
  document.getElementById("deleteModal").classList.add("hidden");
};

document.addEventListener("click", e => {
  if (e.target.classList.contains("more-btn")) {
    alert("Coming soon: edit, regenerate, explain");
  }
});

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
  } catch (err) {
    console.error(err);

    response = `Critical error ❌

  ${err.message || err}

  Check console for details.`;
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

  // ✅ MEMORY SAVE (CORRECT PLACE)
  memory.lastIntent = intent;
  memory.lastMessage = msg;
  saveMemory();

  // ✅ CONTEXT UNDERSTANDING ("it")
  if (msg.includes("it") && memory.lastProduct) {
    return generateResponse("availability", memory.lastProduct);
  }

  return generateResponse(intent, msg);
}

function normalize(text) {
  text = correctTypos(text);

  return text
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñіїєґ]/gi, "")
    .trim();
}

function extractProductName(msg) {
  const products = document.querySelectorAll(".product-name");

  for (let p of products) {
    const name = p.innerText.toLowerCase().replace(/"/g, "");

    if (msg.includes(name.toLowerCase())) {
      return p.closest(".sale-product-box").id;
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

async function handleReportFlow(msg) {

  // STEP 1 — TYPE
  if (chatState.step === "ask_type") {
    chatState.report.type = msg;
    chatState.step = "ask_desc";

    return "Understood. Please briefly describe the issue.";
  }

  // STEP 2 — DESCRIPTION
  if (chatState.step === "ask_desc") {
    chatState.report.description = msg;
    chatState.step = "ask_email";

    return "Thank you. If you would like a response, please provide your email, or type 'skip'.";
  }

  // STEP 3 — EMAIL + SAVE TO FIREBASE
  if (chatState.step === "ask_email") {

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

  // detect question style
  if (msg.includes("?")) {
    return {
      en: "I understand you're asking a question. I can help with products, orders, or how the store works. Try something like 'How do I log in?' or 'What can I buy?'",
      es: "Entiendo que haces una pregunta. Puedo ayudarte con productos o pedidos.",
      fr: "Je comprends que vous posez une question. Je peux vous aider avec les produits.",
      ua: "Я бачу, що це питання. Я можу допомогти з товарами або замовленнями."
    }[currentLang];
  }

  // detect confusion
  if (msg.length < 4) {
    return t("confused");
  }

  return {
    en: "I'm here to help with shopping, orders, or any issue on the website. Try asking something more specific 😊",
    es: "Estoy aquí para ayudarte con compras o problemas en la web.",
    fr: "Je suis là pour vous aider avec vos achats.",
    ua: "Я тут, щоб допомогти з покупками або проблемами."
  }[currentLang];
}

function analyzeIntent(msg) {
  const m = msg.toLowerCase();

  const productId = extractProductName(m);

  // 🚨 PRIORITY: if product detected → it's about THAT product
  if (productId) {
    memory.lastProduct = productId;
    saveMemory();

    if (/(price|cost|how much)/.test(m)) return "price";
    if (/(describe|what is it|info|details)/.test(m)) return "product_info";

    return "availability"; // default fallback for product mention
  }

  // assistant
  if (/(what.*you|help|purpose|who are you)/.test(m)) return "about_assistant";

  // greeting
  if (/(hi|hello|hey|hola|bonjour)/.test(m)) return "greeting";

  // report
  if (/(error|problem|issue|bug|not working|fail)/.test(m)) return "report";

  // payment
  if (/(pay|payment|paid|paying|pago|transfer|bank|money)/.test(m)) {
    return "payment";
  }

  // delivery
  if (/(delivery|shipping|ship|arrive|arrival|envio|entrega)/.test(m)) {
    return "delivery";
  }

  // suggestion mode trigger
  if (/(what can i buy|recommend|suggest)/.test(m)) {
    return "suggest";
  }

  // description search mode
  if (msg.length > 8) {
    return "semantic_search";
  }

  return "unknown";
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

  const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 🧠 ABOUT
  if (intent === "about_assistant") {
    return random([
      "I'm your assistant. I help you find products, check availability, and solve issues.",
      "I can guide you through products, payments, delivery, and problems on this store.",
      "Think of me as your shopping assistant. Ask me anything about products or orders."
    ]);
  }

  // 💳 PAYMENT (NOW WORKS)
  if (intent === "payment") {
    return random([
      "Payments are done via bank transfer. You have 24 hours after placing an order.",
      "To complete a purchase, you’ll receive payment instructions after ordering.",
      "We currently use bank transfer. Make sure to complete it within 24 hours."
    ]);
  }

  // 🚚 DELIVERY (NOW WORKS)
  if (intent === "delivery") {
    return random([
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

  💡 Describe what you want (example: "something with mountains or nature")`;
  }

  // 📦 AVAILABILITY
  if (intent === "availability") {

    const productId = memory.lastProduct || extractProductName(msg);
  
    if (!productId) {
      return "Tell me the product name and I’ll check it.";
    }

    const status = await getProductStatus(productId);

    const data = getProductData().find(p => p.id === productId);

    const base = {
      available: "Yes ✅ it's available.",
      reserved: "⚠️ It's reserved.",
      sold: "❌ It's sold."
    };

    return `${base[status] || "Unknown status."}

  ${data ? `Product: ${data.name}
  Price: ${data.price}` : ""}`;
  }

  // 🚨 REPORT
  if (intent === "report") {
    chatState.mode = "reporting";
    chatState.step = "ask_type";
    return "I’m sorry about that 😔 What type of issue is it?\n• Payment\n• Product\n• Website";
  }

  if (intent === "price") {
    const data = getProductData().find(p => p.id === memory.lastProduct);
    return data ? `💰 ${data.name} costs ${data.price}` : "I couldn't find the price.";
  }

  if (intent === "product_info") {
    const data = getProductData().find(p => p.id === memory.lastProduct);
    return data ? `📦 ${data.name}

  ${data.description.slice(0, 300)}...` : "No info found.";
  }

  if (intent === "semantic_search" || memory.expectingDescription) {

    const products = getProductData();

    const words = msg.split(" ");

    let best = null;
    let bestScore = 0;

    products.forEach(p => {
      let score = 0;

      words.forEach(w => {
        if (p.description.includes(w)) score++;
      });

      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    });

    memory.expectingDescription = false;
    saveMemory();

    if (best && bestScore > 1) {
      return `🎯 I found something for you:

  ${best.name} — ${best.price}

  ${best.description.slice(0, 200)}...`;
    }

    return "I'm sorry, but I couldn’t find any product that matches your request.";
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
