Blackberry
blackberry5155t_11452
Unsichtbar

Mike
 hat einen Anruf gestartet, der 4 Minuten gedauert hat. — 19.04.2026 20:05
Mike — 19.04.2026 20:09
bin am essen
Blackberry
 hat einen Anruf gestartet, der eine Stunde gedauert hat. — 19.04.2026 20:11
Blackberry — 19.04.2026 21:09
{
  "articles": [
    {
      "id": 1775984015637,
      "title": "Leandro Maksutaj: Ein junges Talent mit grossen Zielen",
      "category": "Sport",... (7MB verbleibend)

winterthur_times_backup_2026-04-12 (1).json
7 MB
[
  {
    "title": "Peter Pfändler bringt frischen Humor ins Casinotheater",
    "category": "Kultur",
    "content": "Peter Pfändler macht Halt im Casinotheater und präsentiert dort sein überarbeitetes Programm „Eifach luschtig“. Der bekannte Schweizer Comedian, ausgezeichnet mit dem Prix Walo und oft bei den Humortagen Arosa zu sehen, setzt dabei auf eine Mischung aus bewährten und neuen Elementen.\n\nIm Zentrum steht weiterhin das Thema Schule, das Pfändler mit viel Witz aus dem Alltag aufgreift. Besonders seine humorvollen Einblicke in Elternabende liefern reichlich Stoff für Lacher. Gleichzeitig wurde das Programm deutlich angepasst: Auf Videoeinspieler verzichtet er bewusst, um das Tempo hochzuhalten und direkter mit dem Publikum zu interagieren.\n\nAuch seine beliebten Figuren sind wieder mit dabei – allerdings in leicht veränderter Form. Einige treten nur kurz auf, während andere weiterentwickelt wurden. Neu hinzugekommen ist unter anderem eine zusätzliche Bühnenfigur, die für frischen Wind sorgt.\n\nEine weitere Änderung betrifft die Technik: Pfändler übernimmt diese nun selbst. Dadurch gewinnt er mehr Flexibilität und kann spontaner auf das Publikum reagieren. Im Gegensatz zu früheren Tourneen, bei denen alles exakt geplant war, steht diesmal die Improvisation stärker im Vordergrund.\n\nMit diesem Konzept verspricht der Auftritt im Casinotheater einen abwechslungsreichen und lebendigen Comedy-Abend.",
    "imageUrl": "",

winterthur_times_artikel (1).txt
7 kB
WinterthurTimes
Du hast einen Anruf von 
Mike
 verpasst, der ein paar Sekunden gedauert hat. — 08.05.2026 19:20
Blackberry
 hat einen Anruf gestartet, der 3 Stunden gedauert hat. — 08.05.2026 19:25
Blackberry — 08.05.2026 20:31
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
Mike — 08.05.2026 22:22
const WORKER_BASE = "https://askai.mikestaub705.workers.dev/";

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
    const res = await fetch(${WORKER_BASE}/api/chat/load);
    const data = await res.json();
    messages = data.messages || [];
    renderMessages();
  } catch (e) {
    console.error("Fehler beim Laden:", e);
  }
}
}

async function saveChat() {
  try {
    await fetch(${WORKER_BASE}/api/chat/save, {
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
    const res = await fetch(${WORKER_BASE}/api/chat, {
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
<script src="app.js"></script>
Schritt 2 — In deine index.html kommt nur das hier
👉 Ganz unten vor </body> einfügen:

html
<script src="app.js"></script>
Und du brauchst in deiner HTML folgende IDs:

id="chat"

id="chatInput"

id="sendBtn"
Mike
 hat einen Anruf gestartet. — 19:46
Mike — 19:47
ja
wart schnell
Blackberry — 19:47
ok
Blackberry — 20:42
/**
 * Winterthur Times - Support Chat Widget
 * Integriert deinen Cloudflare Worker für das Laden/Speichern von Chats
 */

const WORKER_BASE = "https://askai.mikestaub705.workers.dev";

message.txt
16 kB
Mike — 20:48
/**
 * Winterthur Times - Support Chat Widget
 * Integriert deinen Cloudflare Worker für das Laden/Speichern von Chats
 */

const WORKER_BASE = "https://askai.mikestaub705.workers.dev";

script.js
14 kB
/**
 * Winterthur Times - Support Chat Widget
 * Integriert deinen Cloudflare Worker für das Laden/Speichern von Chats
 */

const WORKER_BASE = "https://askai.mikestaub705.workers.dev";

script.js
15 kB
﻿
/**
 * Winterthur Times - Support Chat Widget
 * Integriert deinen Cloudflare Worker für das Laden/Speichern von Chats
 */

const WORKER_BASE = "https://askai.mikestaub705.workers.dev";
let chatMessages = [];
let isChatOpen = false;
let aiEnabled = true;

// --- userId wird erst gesetzt, wenn DOM bereit ist ---
let userId;

// --- Zusätzliches CSS für Mobile & Scrollbars einfügen ---
const style = document.createElement('style');
style.innerHTML = `
    .pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
    #supportChatMessages::-webkit-scrollbar { width: 6px; }
    #supportChatMessages::-webkit-scrollbar-track { background: transparent; }
    #supportChatMessages::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
    .typing-dot { animation: typingBounce 1.4s infinite ease-in-out both; }
    @keyframes typingBounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
    }
    #app > #chatToggleBtn, #app #active-support-widget { display: none !important; }
`;
document.head.appendChild(style);

// 1. UI dynamisch in die Seite einfügen
function initFloatingSupportChat() {
    const existingWrapper = document.getElementById('support-chat-wrapper');
    if (existingWrapper) existingWrapper.remove();
    
    const oldBtn = document.getElementById('chatToggleBtn');
    if (oldBtn && oldBtn.parentElement === document.body) oldBtn.remove();
    const oldWidget = document.getElementById('support-chat-widget');
    if (oldWidget && oldWidget.parentElement === document.body) oldWidget.remove();

    const container = document.createElement('div');
    container.id = 'support-chat-wrapper';
    container.innerHTML = `
        <button id="chatToggleBtn" onclick="toggleSupportChat()" class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-600 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all duration-300 z-[100] flex items-center justify-center">
            <i data-lucide="message-circle" class="w-7 h-7"></i>
        </button>

        <div id="support-chat-widget" class="fixed bottom-0 right-0 w-full h-[100dvh] sm:bottom-24 sm:right-6 sm:w-[420px] sm:h-[30rem] bg-white sm:border sm:border-gray-200 shadow-2xl sm:rounded-2xl z-[100] hidden flex-col overflow-hidden font-sans transition-all duration-300 transform origin-bottom-right">
            
            <div class="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-3 sm:p-4 flex justify-between items-center shadow-md z-10">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <div class="bg-white/10 p-2 rounded-xl">
                            <i data-lucide="bot" class="w-6 h-6"></i>
                        </div>
                        <span id="ai-status-indicator" class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 border-2 border-blue-900 rounded-full transition-colors duration-300"></span>
                    </div>
                    <div>
                        <h3 class="font-bold tracking-wide text-base leading-tight">Support</h3>
                        <p class="text-xs text-blue-200 leading-tight mt-0.5" id="ai-status-text">KI-Assistent aktiv</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button id="aiToggleButton" onclick="toggleSupportAI()" class="bg-green-500 hover:bg-green-600 text-white transition-all px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-[0_0_12px_rgba(74,222,128,0.8)] border border-green-400" title="KI an-/ausschalten">
                        <i data-lucide="bot" id="ai-toggle-icon" class="w-4 h-4"></i> <span id="ai-toggle-text">KI: AN</span>
                    </button>
                    <button onclick="toggleSupportChat()" class="text-white hover:text-blue-200 transition-colors p-1.5 rounded-lg hover:bg-white/10" title="Chat schließen">
                        <i data-lucide="chevron-down" class="w-6 h-6"></i>
                    </button>
                </div>
            </div>
            
            <div id="supportChatMessages" class="flex-1 p-4 overflow-y-auto flex flex-col bg-slate-50 text-sm gap-4 scroll-smooth"></div>
            
            <div class="bg-white border-t border-gray-100 flex flex-col shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] pb-safe">
                <div class="p-3 sm:p-4 flex gap-2 items-end pb-2">
                    <textarea id="supportChatInput" rows="1"
                        class="flex-1 px-4 py-3 bg-gray-100 border border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-sm resize-none max-h-32 transition-all leading-relaxed" 
                        placeholder="Wie können wir helfen?..." 
                        oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 120) + 'px'"
                        onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendSupportChatMessage(); }"></textarea>
                    
                    <button id="supportChatSendBtn" onclick="sendSupportChatMessage()" class="bg-blue-600 text-white rounded-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shrink-0 shadow-sm flex items-center justify-center h-[46px] w-[46px]">
                        <i data-lucide="send" class="w-5 h-5 ml-0.5"></i>
                    </button>
                </div>
                <div class="text-center pb-3 px-4">
                    <p class="text-[10px] text-gray-400">Hinweis: Die KI kann Fehler machen. Bitte überprüfe wichtige Informationen.</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(container);
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

// 2. Chat öffnen/schließen
function toggleSupportChat() {
    isChatOpen = !isChatOpen;
    const widget = document.getElementById('support-chat-widget');
    const toggleBtn = document.getElementById('chatToggleBtn');
    
    if (isChatOpen) {
        widget.style.display = 'flex';
        toggleBtn.classList.add('sm:flex', 'hidden');
        
        loadSupportChat(); 
        
        setTimeout(() => {
            const input = document.getElementById('supportChatInput');
            if(input) {
                input.focus();
                input.selectionStart = input.selectionEnd = input.value.length;
            }
        }, 100);
    } else {
        widget.style.display = 'none';
        toggleBtn.classList.remove('hidden');
    }
}

// 2.5 KI an-/ausschalten
function toggleSupportAI() {
    aiEnabled = !aiEnabled;
    const indicator = document.getElementById('ai-status-indicator');
    const statusText = document.getElementById('ai-status-text');
    const toggleBtn = document.getElementById('aiToggleButton');
    const toggleIcon = document.getElementById('ai-toggle-icon');
    const toggleText = document.getElementById('ai-toggle-text');
    
    if (aiEnabled) {
        indicator.className = "absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 border-2 border-blue-900 rounded-full transition-colors duration-300";
        statusText.innerText = "KI-Assistent aktiv";
        toggleBtn.className = "bg-green-500 hover:bg-green-600 text-white transition-all px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-[0_0_12px_rgba(74,222,128,0.8)] border border-green-400";
        toggleIcon.setAttribute('data-lucide', 'bot');
        toggleText.innerText = "KI: AN";
    } else {
        indicator.className = "absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-gray-400 border-2 border-blue-900 rounded-full transition-colors duration-300";
        statusText.innerText = "Nur Menschlicher Support";
        toggleBtn.className = "bg-gray-500 hover:bg-gray-600 text-white transition-all px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-sm border border-gray-400";
        toggleIcon.setAttribute('data-lucide', 'bot-off');
        toggleText.innerText = "KI: AUS";
    }
    if (window.lucide) lucide.createIcons();
}

// 3. UI updaten
function updateSupportChatUI() {
    const chatEl = document.getElementById('supportChatMessages');
    if (!chatEl) return;
    
    chatEl.innerHTML = "";
    
    if (chatMessages.length === 0) {
        chatEl.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3 mt-10">
                <div class="bg-gray-100 p-4 rounded-full"><i data-lucide="message-square" class="w-8 h-8 text-gray-300"></i></div>
                <p class="text-sm">Schreibe uns eine Nachricht.<br>Wir helfen dir gerne weiter!</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    for (const msg of chatMessages) {
        const div = document.createElement("div");
        
        if (msg.isTyping) {
            div.className = "bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-none self-start shadow-sm flex items-center gap-1.5 w-16 h-11";
            div.innerHTML = `
                <span class="w-2 h-2 bg-gray-400 rounded-full typing-dot" style="animation-delay: 0s"></span>
                <span class="w-2 h-2 bg-gray-400 rounded-full typing-dot" style="animation-delay: 0.2s"></span>
                <span class="w-2 h-2 bg-gray-400 rounded-full typing-dot" style="animation-delay: 0.4s"></span>
            `;
        } else if (msg.role === "user") {
            div.className = "bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-br-none self-end max-w-[85%] shadow-sm whitespace-pre-wrap leading-relaxed";
            div.textContent = msg.content;
        } else {
            div.className = "bg-white border border-gray-200 text-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-none self-start max-w-[85%] shadow-sm whitespace-pre-wrap leading-relaxed";
            div.textContent = msg.content;
        }
        
        chatEl.appendChild(div);
    }
    
    chatEl.scrollTop = chatEl.scrollHeight;
}

// 4. API Calls (Worker)
async function loadSupportChat() {
    try {
        const res = await fetch(`${WORKER_BASE}/api/chat/load`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId })
        });

        const data = await res.json();
        chatMessages = data.messages || [];
        updateSupportChatUI();
    } catch (e) {
        console.error("Fehler beim Laden des Chats:", e);
    }
}

async function saveSupportChat() {
    try {
        await fetch(`${WORKER_BASE}/api/chat/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, messages: chatMessages })
        });
    } catch (e) {
        console.error("Fehler beim Speichern des Chats:", e);
    }
}

async function sendSupportChatMessage() {
    const inputEl = document.getElementById("supportChatInput");
    const sendBtn = document.getElementById("supportChatSendBtn");
    
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = "";
    inputEl.style.height = '';
    inputEl.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i>';
    if (window.lucide) lucide.createIcons();

    chatMessages.push({ role: "user", content: text });
    updateSupportChatUI();
    await saveSupportChat();

    if (!aiEnabled) {
        setTimeout(async () => {
            chatMessages.push({ 
                role: "assistant", 
                content: "Die KI ist derzeit ausgeschaltet. Deine Nachricht wurde gespeichert. Ein Mitarbeiter meldet sich bald." 
            });
            updateSupportChatUI();
            await saveSupportChat();
            
            inputEl.disabled = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i data-lucide="send" class="w-5 h-5 ml-0.5"></i>';
            if (window.lucide) lucide.createIcons();
            inputEl.focus();
        }, 800);
        return;
    }

    const typingId = Date.now();
    chatMessages.push({ role: "assistant", content: "", isTyping: true, id: typingId });
    updateSupportChatUI();

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
        
        chatMessages = chatMessages.filter(msg => msg.id !== typingId);
        
        chatMessages.push({ role: "assistant", content: data.reply });
        updateSupportChatUI();
        await saveSupportChat();
    } catch (e) {
        chatMessages = chatMessages.filter(msg => msg.id !== typingId);
        
        chatMessages.push({
            role: "assistant",
            content: "Leider ist ein Verbindungsfehler aufgetreten."
        });
        updateSupportChatUI();
    }

    inputEl.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i data-lucide="send" class="w-5 h-5 ml-0.5"></i>';
    if (window.lucide) lucide.createIcons();
    inputEl.focus();
}

// --- DOMContentLoaded: userId erzeugen & Chat starten ---
document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.userId) {
        localStorage.userId = crypto.randomUUID();
    }
    userId = localStorage.userId;

    initFloatingSupportChat();
});
