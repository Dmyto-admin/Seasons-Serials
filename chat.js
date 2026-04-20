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
  }, 1000);
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
  const msg = input.toLowerCase();

  // 🛍 PRODUCT SEARCH INTENT
  if (msg.includes("buy") || msg.includes("product") || msg.includes("shop")) {
    const results = searchProducts(msg);

    if (results.length > 0) {
      return "Here are some products you might like:\n\n" + results.join("\n");
    } else {
      return "I couldn't find matching products, but you can explore all categories above 👆";
    }
  }

  // ℹ️ ABOUT STORE
  if (msg.includes("what are you") || msg.includes("what is this")) {
    return "I'm your AI assistant for Seasons Serials. I help you find products, answer questions, and guide your shopping experience.";
  }

  // 💳 PAYMENT
  if (msg.includes("pay") || msg.includes("payment")) {
    return "You can complete your purchase via bank transfer. After ordering, you have 24 hours to complete the payment.";
  }

  // 🚚 DELIVERY / PROCESS
  if (msg.includes("how long") || msg.includes("delivery")) {
    return "After payment, your order is processed quickly. Check your email for full details after checkout.";
  }

  // 🔁 DEFAULT (AI-like fallback)
  return "That's a great question! I'm here to help with products, orders, and anything related to Seasons Serials 😊";
}

function searchProducts(query) {
  const products = document.querySelectorAll(".sale-product-box");
  const matches = [];

  products.forEach(p => {
    const nameEl = p.querySelector(".product-name");
    if (!nameEl) return;

    const name = nameEl.textContent.toLowerCase();

    if (name.includes(query)) {
      matches.push("• " + nameEl.textContent);
    }
  });

  return matches.slice(0, 3); // limit results
}

