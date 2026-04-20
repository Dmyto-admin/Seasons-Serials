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
  msg.innerText = text;

  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
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

  const response = await generateSmartReply(text);

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

  // 🚨 REPORT FLOW
  if (chatState.mode === "reporting") {
    return handleReportFlow(msg);
  }

  // 👋 GREETING
  if (isGreeting(msg)) {
    return t("greeting");
  }

  // 🙋 HELP
  if (msg.includes("help") || msg.includes("ayuda") || msg.includes("aide")) {
    return t("help");
  }

  // 🛍 PRODUCT SEARCH
  if (hasIntent(msg, ["buy", "product", "shop", "comprar", "producto"])) {
    const results = searchProductsSmart(msg);

    if (results.length > 0) {
      return results.join("\n");
    } else {
      return t("noProducts");
    }
  }

  // 💳 PAYMENT
  if (hasIntent(msg, ["pay", "payment", "pago", "paiement"])) {
    return {
      en: "You can pay via bank transfer within 24 hours.",
      es: "Puedes pagar por transferencia bancaria en 24h.",
      fr: "Paiement par virement bancaire sous 24h.",
      ua: "Оплата банківським переказом протягом 24 годин."
    }[currentLang];
  }

  // 🚨 REPORT
  if (hasIntent(msg, ["error", "bug", "problem", "issue", "problema"])) {
    chatState.mode = "reporting";
    chatState.step = "ask_type";
    return t("reportStart");
  }

  // 🧠 SMART FALLBACK
  return {
    en: "Interesting! Ask me about products or report a problem.",
    es: "Interesante. Pregúntame sobre productos o problemas.",
    fr: "Intéressant. Demandez-moi des produits ou problèmes.",
    ua: "Цікаво! Запитайте про товари або проблему."
  }[currentLang];
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

if (msg.includes("thanks") || msg.includes("gracias") || msg.includes("merci")) {
  return {
    en: "You're welcome 😊",
    es: "¡De nada! 😊",
    fr: "Avec plaisir 😊",
    ua: "Будь ласка 😊"
  }[currentLang];
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

function handleReportFlow(msg) {

  // STEP 1 — TYPE
  if (chatState.step === "ask_type") {
    chatState.report.type = msg;
    chatState.step = "ask_desc";

    return "Got it 👍\n\nPlease describe the problem in a few words.";
  }

  // STEP 2 — DESCRIPTION
  if (chatState.step === "ask_desc") {
    chatState.report.description = msg;
    chatState.step = "ask_email";

    return "Thanks! 📩\n\nIf you want a reply, enter your email. Or type 'skip'.";
  }

  // STEP 3 — EMAIL
  if (chatState.step === "ask_email") {
    chatState.report.email = msg === "skip" ? "not provided" : msg;

    // 🔥 HERE you will later send to Firestore or email
    console.log("REPORT:", chatState.report);

    // RESET
    chatState.mode = "normal";
    chatState.step = null;
    chatState.report = {};

    return "✅ Your report has been sent! Thank you for helping improve the store 🙌";
  }

  return "Something went wrong with reporting. Let's start again.";
}
