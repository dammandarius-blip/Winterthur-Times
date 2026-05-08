const WORKER_BASE = "https://askai.mikestaub705.workers.dev";

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

let messages = [];

function renderMessages() {
  chatEl.innerHTML = "";
  for (const msg of messages) {
    const div = document.createElement("div");
    div.classList.add("msg");
    div.classList.add(msg.role === "user" ? "msg-user" : "msg-bot");
    div.textContent = msg.content;
    chatEl.appendChild(div);
  }
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function loadChat() {
  try {
    const res = await fetch(`${WORKER_BASE}/api/chat/load`);
    const data = await res.json();
    messages = data.messages || [];
    renderMessages();
  } catch (e) {
    console.error("Fehler beim Laden:", e);
  }
}

async function saveChat() {
  try {
    await fetch(`${WORKER_BASE}/api/chat/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
  } catch (e) {
    console.error("Fehler beim Speichern:", e);
  }
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = "";
  sendBtn.disabled = true;

  messages.push({ role: "user", content: text });
  renderMessages();
  await saveChat();

  try {
    const res = await fetch(`${WORKER_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        loggedIn: false,
        popular: []
      })
    });

    const data = await res.json();
    messages.push({ role: "assistant", content: data.reply });
    renderMessages();
    await saveChat();
  } catch (e) {
    messages.push({
      role: "assistant",
      content: "Es ist ein Fehler aufgetreten."
    });
    renderMessages();
  }

  sendBtn.disabled = false;
}

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

loadChat();
