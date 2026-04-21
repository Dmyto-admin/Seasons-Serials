import { db } from "./firebase-config.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

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
  const msg = document.createElement("div");
  msg.className = `chat-msg ${type}-msg`;

  const content = document.createElement("div");
  content.className = "msg-text";
  content.innerText = text;

  const actions = document.createElement("div");
  actions.className = "msg-actions";
  actions.innerHTML = `
    <ion-icon name="copy-outline" class="copy-btn"></ion-icon>
    <ion-icon name="trash-outline" class="delete-btn"></ion-icon>
    <ion-icon name="ellipsis-horizontal"></ion-icon>
  `;

  msg.appendChild(content);
  msg.appendChild(actions);

  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.addEventListener("click", e => {
  if (e.target.classList.contains("copy-btn")) {
    const text = e.target.closest(".chat-msg").innerText;
    navigator.clipboard.writeText(text);
  }
});

function openDeleteModal() {
  if (confirm("Are you sure you want to delete this message?")) {
    confirmDelete();
  }
}

let messageToDelete = null;

document.addEventListener("click", e => {
  if (e.target.classList.contains("delete-btn")) {
    messageToDelete = e.target.closest(".chat-msg");
    openDeleteModal();
  }
});

function confirmDelete() {
  if (!messageToDelete) return;

  const next = messageToDelete.nextElementSibling;

  messageToDelete.remove();

  if (next && next.classList.contains("bot-msg")) {
    next.remove();
  }
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
  } catch (err) {
    console.error(err);
    response = "Something went wrong. Please try again.";
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

  return generateResponse(intent, msg);
}
function normalize(text) {
  text = correctTypos(text);

  return text
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñіїєґ]/gi, "")
    .trim();
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
      return "An error occurred while submitting the report. Please try again.";
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

  const intents = [
    {
      name: "login",
      patterns: ["login", "log in", "sign in", "account access"]
    },
    {
      name: "payment",
      patterns: ["pay", "payment", "how to pay", "checkout"]
    },
    {
      name: "delivery",
      patterns: ["delivery", "shipping", "when will", "how long"]
    },
    {
      name: "product_search",
      patterns: ["buy", "product", "recommend", "looking for"]
    },
    {
      name: "report",
      patterns: ["error", "bug", "problem", "issue", "not working"]
    }
  ];

  let bestMatch = { name: "unknown", score: 0 };

  intents.forEach(intent => {
    let score = 0;

    intent.patterns.forEach(p => {
      if (msg.includes(p)) score++;
    });

    if (score > bestMatch.score) {
      bestMatch = { name: intent.name, score };
    }
  });

  return bestMatch.name;
}

function generateResponse(intent, msg) {

  switch (intent) {

    case "login":
      return formatResponse(`
To access your account, simply click on the **"Login"** button located in the top navigation bar.

Once opened:
• Enter your email and password  
• Confirm to access your account  

If the button does not respond, it may indicate a temporary interface issue.
      `);

    case "payment":
      return formatResponse(`
Payments are processed via **bank transfer**.

After reserving a product:
• You have **24 hours** to complete the payment  
• Instructions are provided after checkout  

If the payment confirmation does not appear, please report the issue.
      `);

    case "delivery":
      return formatResponse(`
Once your payment is confirmed:

• Your order is processed immediately  
• Details are sent via email  
• No physical shipping delays apply  

Please ensure your email is correct during checkout.
      `);

    case "product_search":
      const results = searchProductsSmart(msg);

      if (results.length) {
        return formatResponse(
          "Based on your request, here are the most relevant products:\n\n" +
          results.join("\n")
        );
      }

      return formatResponse(`
I could not find an exact match.

Try searching using keywords like:
• "picture"
• "story"
• "decoration"
      `);

    case "report":
      chatState.mode = "reporting";
      chatState.step = "ask_type";
      return formatResponse(`
I understand you encountered an issue.

Please specify the type:
• Payment
• Product
• Website
      `);

    default:
      return smartFallback(msg);
  }
}

function formatResponse(text) {
  return text
    .trim()
    .replace(/\n\s+/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1");
}
