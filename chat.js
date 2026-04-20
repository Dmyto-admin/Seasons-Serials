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
function sendMessage(text) {
  if (!text.trim()) return;

  addMessage(text, "user");
  chatInput.value = "";

  const loading = addLoading();

  setTimeout(() => {
    loading.remove();
    addMessage("Hello, how can I help?", "bot");
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
