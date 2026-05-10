/**
 * Winterthur Times - Support Chat Widget
 * Integriert deinen Cloudflare Worker für das Laden/Speichern von Chats
 */

const WORKER_BASE = "https://askai.mikestaub705.workers.dev";
let chatMessages = [];
let isChatOpen = false;

// 1. UI dynamisch in die Seite einfügen
function initFloatingSupportChat() {
    const container = document.createElement('div');
    container.innerHTML = `
        <!-- Runder Chat-Button unten rechts -->
        <button id="chatToggleBtn" onclick="toggleSupportChat()" class="fixed bottom-6 right-6 bg-blue-900 text-white p-4 rounded-full shadow-2xl hover:bg-blue-800 transition-all z-[100] flex items-center justify-center">
            <i data-lucide="message-circle" class="w-6 h-6"></i>
        </button>

        <!-- Das eigentliche Chat-Fenster (standardmäßig versteckt) -->
        <div id="support-chat-widget" class="fixed bottom-24 right-6 w-80 h-[28rem] bg-white border border-gray-200 shadow-2xl rounded-xl z-[100] hidden flex-col overflow-hidden font-sans">
            
            <!-- Header -->
            <div class="bg-blue-900 text-white p-4 flex justify-between items-center shadow-md">
                <div class="flex items-center gap-2">
                    <i data-lucide="bot" class="w-5 h-5"></i>
                    <h3 class="font-bold tracking-wide">Support AI</h3>
                </div>
                <button onclick="toggleSupportChat()" class="text-white hover:text-gray-300 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <!-- Chat-Verlauf -->
            <div id="supportChatMessages" class="flex-1 p-4 overflow-y-auto flex flex-col bg-gray-50 text-sm">
                <!-- Nachrichten werden hier eingefügt -->
            </div>
            
            <!-- Eingabefeld -->
            <div class="p-3 bg-white border-t border-gray-200 flex gap-2 items-center">
                <input id="supportChatInput" type="text" 
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 text-sm" 
                    placeholder="Schreibe eine Nachricht..." 
                    onkeydown="if(event.key === 'Enter') sendSupportChatMessage()" />
                
                <button id="supportChatSendBtn" onclick="sendSupportChatMessage()" class="bg-blue-900 text-white p-2 rounded-md hover:bg-blue-800 transition-colors">
                    <i data-lucide="send" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(container);
    
    // Lucide Icons initialisieren
    if (window.lucide) {
        lucide.createIcons();
    }
}

// 2. Chat öffnen/schließen
function toggleSupportChat() {
    isChatOpen = !isChatOpen;
    const widget = document.getElementById('support-chat-widget');
    const toggleBtnIcon = document.querySelector('#chatToggleBtn i');
    
    if (isChatOpen) {
        widget.style.display = 'flex';
        // Icon ändern auf X
        toggleBtnIcon.setAttribute('data-lucide', 'x');
        loadSupportChat(); // Nachrichten laden, wenn geöffnet
        
        // Fokus auf Eingabefeld setzen
        setTimeout(() => {
            const input = document.getElementById('supportChatInput');
            if(input) input.focus();
        }, 100);
    } else {
        widget.style.display = 'none';
        // Icon zurück auf Chat-Blase
        toggleBtnIcon.setAttribute('data-lucide', 'message-circle');
    }
    
    if (window.lucide) lucide.createIcons();
}

// 3. UI updaten (Nachrichten rendern)
function updateSupportChatUI() {
    const chatEl = document.getElementById('supportChatMessages');
    if (!chatEl) return;
    
    chatEl.innerHTML = "";
    
    if (chatMessages.length === 0) {
        chatEl.innerHTML = `<div class="text-center text-gray-400 mt-10 text-xs">Schreibe eine Nachricht, um den Chat zu starten.</div>`;
        return;
    }

    for (const msg of chatMessages) {
        const div = document.createElement("div");
        
        // Styling abhängig davon, ob es User oder Bot ist
        if (msg.role === "user") {
            div.className = "bg-blue-100 text-blue-900 p-3 rounded-lg rounded-br-none mb-3 self-end max-w-[85%] shadow-sm";
        } else {
            div.className = "bg-white border border-gray-200 text-gray-800 p-3 rounded-lg rounded-bl-none mb-3 self-start max-w-[85%] shadow-sm";
        }
        
        div.textContent = msg.content;
        chatEl.appendChild(div);
    }
    
    // Automatisch nach unten scrollen
    chatEl.scrollTop = chatEl.scrollHeight;
}

// 4. API Calls (Worker)
async function loadSupportChat() {
    try {
        const res = await fetch(`${WORKER_BASE}/api/chat/load`);
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
            body: JSON.stringify({ messages: chatMessages })
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

    // UI sperren
    inputEl.value = "";
    inputEl.disabled = true;
    sendBtn.disabled = true;

    // User-Nachricht anzeigen & speichern
    chatMessages.push({ role: "user", content: text });
    updateSupportChatUI();
    await saveSupportChat();

    // KI-Antwort abfragen
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
        chatMessages.push({ role: "assistant", content: data.reply });
        updateSupportChatUI();
        await saveSupportChat();
    } catch (e) {
        chatMessages.push({
            role: "assistant",
            content: "Leider ist ein Verbindungsfehler aufgetreten."
        });
        updateSupportChatUI();
    }

    // UI entsperren
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
}

// Widget beim Laden der Seite initialisieren
document.addEventListener("DOMContentLoaded", () => {
    initFloatingSupportChat();
});
