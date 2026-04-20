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
  const msg = normalize(input);

  // 🚨 HANDLE ACTIVE FLOWS FIRST
  if (chatState.mode === "reporting") {
    return handleReportFlow(msg);
  }

  // 👋 GREETINGS
  if (isGreeting(msg)) {
    return "Hello! 👋 I'm your Seasons Serials assistant. How can I help you today?";
  }

  // 🙋 HELP
  if (msg.includes("help")) {
    return "I can help you find products, explain how the store works, or report a problem. Try asking something like 'What can I buy?' 😊";
  }

  // 🛍 PRODUCT SEARCH
  if (hasIntent(msg, ["buy", "product", "shop", "recommend"])) {
    const results = searchProductsSmart(msg);

    if (results.length > 0) {
      return "Here are some products you might like:\n\n" + results.join("\n");
    } else {
      return "I couldn't find matching products. Try using simpler words like 'story', 'ticket', or 'decoration'.";
    }
  }

  // ℹ️ ABOUT
  if (hasIntent(msg, ["what are you", "who are you"])) {
    return "I'm your AI assistant for Seasons Serials. I help you find products, answer questions, and guide your shopping.";
  }

  // 💳 PAYMENT
  if (hasIntent(msg, ["pay", "payment", "how to pay"])) {
    return "You can complete your order via bank transfer. You have 24 hours after reservation.";
  }

  // 🚚 DELIVERY
  if (hasIntent(msg, ["delivery", "how long", "when"])) {
    return "Orders are processed after payment. You'll receive full details by email.";
  }

  // 🚨 REPORT SYSTEM TRIGGER
  if (hasIntent(msg, ["error", "bug", "problem", "issue"])) {
    chatState.mode = "reporting";
    chatState.step = "ask_type";
    return "I'm sorry something went wrong 😔\n\nWhat kind of problem is it?\n• Payment\n• Product\n• Website bug";
  }

  // 🔁 DEFAULT
  return "That's interesting! I can help with products, orders, or issues. Try asking 'What can I buy?' or 'I have a problem'.";
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

function hasIntent(msg, keywords) {
  return keywords.some(k => msg.includes(k));
}

function isGreeting(msg) {
  return ["hi", "hello", "hey", "good morning", "good evening"].some(g => msg.includes(g));
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
