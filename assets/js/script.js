/**
 * Winterthur Times - Support Chat Widget
 * Integriert deinen Cloudflare Worker für das Laden/Speichern von Chats
 */

const WORKER_BASE = "https://askai.mikestaub705.workers.dev";
let chatMessages = [];
let isChatOpen = false;
let aiEnabled = true; // Neue Variable für KI-Status
let supportChatPollTimer = null;
let supportChatIsSending = false;
let supportChatIsLoading = false;
let supportChatLastSnapshot = "";
const AI_DISABLED_NOTICE = "🤖 Die KI ist derzeit ausgeschaltet. Deine Nachricht wurde sicher gespeichert. Ein Mitarbeiter wird sich das bald ansehen.";

function getSupportChatUserId() {
    try {
        const existing = localStorage.getItem("winterthur_support_uid");
        if (existing) return existing;

        const uid = `gast_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("winterthur_support_uid", uid);
        return uid;
    } catch (e) {
        return `gast_${Date.now()}`;
    }
}

function normalizeSupportMessages(messages) {
    if (!Array.isArray(messages)) return [];
    return messages
        .filter(m => m && (m.content || m.text))
        .map(m => ({
            role: m.role === "assistant" || m.sender === "assistant" || m.sender === "admin" ? "assistant" : "user",
            content: m.content || m.text || "",
            timestamp: m.timestamp || new Date().toISOString()
        }));
}

function getSupportChatSnapshot(messages) {
    return JSON.stringify(normalizeSupportMessages(messages).map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || ""
    })));
}

function startSupportChatAutoRefresh() {
    if (supportChatPollTimer) return;
    supportChatPollTimer = setInterval(() => {
        const widget = document.getElementById('support-chat-widget');
        const visible = isChatOpen || (widget && widget.style.display === 'flex');
        if (visible && !supportChatIsSending && !supportChatIsLoading) {
            loadSupportChat(true);
        }
    }, 1000);
}

function stopSupportChatAutoRefresh() {
    if (supportChatPollTimer) {
        clearInterval(supportChatPollTimer);
        supportChatPollTimer = null;
    }
}

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
    /* Verhindere doppelte Buttons aus alten Code-Resten der Haupt-App */
    #app > #chatToggleBtn, #app #active-support-widget { display: none !important; }
`;
document.head.appendChild(style);

// 1. UI dynamisch in die Seite einfügen
function initFloatingSupportChat() {
    // Alte Instanzen entfernen, falls das Skript (z.B. durch Neuladen) mehrfach ausgeführt wird
    const existingWrapper = document.getElementById('support-chat-wrapper');
    if (existingWrapper) existingWrapper.remove();
    
    // Alte, verwaiste Buttons sicherheitshalber aus dem Body löschen
    const oldBtn = document.getElementById('chatToggleBtn');
    if (oldBtn && oldBtn.parentElement === document.body) oldBtn.remove();
    const oldWidget = document.getElementById('support-chat-widget');
    if (oldWidget && oldWidget.parentElement === document.body) oldWidget.remove();

    const container = document.createElement('div');
    container.id = 'support-chat-wrapper';
    container.innerHTML = `
        <!-- Runder Chat-Button unten rechts -->
        <button id="chatToggleBtn" onclick="toggleSupportChat()" class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-600 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all duration-300 z-[100] flex items-center justify-center">
            <i data-lucide="message-circle" class="w-7 h-7"></i>
        </button>

        <!-- Das eigentliche Chat-Fenster (Mobile: Vollbild, Desktop: Schwebend) -->
        <!-- HIER ANGEPASST: sm:w-[420px] (breiter) und sm:h-[30rem] (weniger hoch) -->
        <div id="support-chat-widget" class="fixed bottom-0 right-0 w-full h-[100dvh] sm:bottom-24 sm:right-6 sm:w-[420px] sm:h-[30rem] bg-white sm:border sm:border-gray-200 shadow-2xl sm:rounded-2xl z-[100] hidden flex-col overflow-hidden font-sans transition-all duration-300 transform origin-bottom-right">
            
            <!-- Header -->
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
                    <!-- KI An/Aus Schalter -->
                    <button id="aiToggleButton" onclick="toggleSupportAI()" class="bg-green-500 hover:bg-green-600 text-white transition-all px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-[0_0_12px_rgba(74,222,128,0.8)] border border-green-400" title="KI an-/ausschalten">
                        <i data-lucide="bot" id="ai-toggle-icon" class="w-4 h-4"></i> <span id="ai-toggle-text">KI: AN</span>
                    </button>
                    <!-- Schließen -->
                    <button onclick="toggleSupportChat()" class="text-white hover:text-blue-200 transition-colors p-1.5 rounded-lg hover:bg-white/10" title="Chat schließen">
                        <i data-lucide="chevron-down" class="w-6 h-6"></i>
                    </button>
                </div>
            </div>
            
            <!-- Chat-Verlauf -->
            <div id="supportChatMessages" class="flex-1 p-4 overflow-y-auto flex flex-col bg-slate-50 text-sm gap-4 scroll-smooth">
                <!-- Nachrichten werden hier eingefügt -->
            </div>
            
            <!-- Eingabefeld (Wächst automatisch mit Text) -->
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
                <!-- Warntext für die KI -->
                <div class="text-center pb-3 px-4">
                    <p class="text-[10px] text-gray-400">Hinweis: Die KI kann Fehler machen. Bitte überprüfe wichtige Informationen.</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(container);
    
    // Lucide Icons initialisieren
    if (window.lucide) {
        lucide.createIcons();
    }
}

// 2. Chat öffnen/schließen (Für Mobile optimiert)
function toggleSupportChat() {
    isChatOpen = !isChatOpen;
    const widget = document.getElementById('support-chat-widget');
    const toggleBtn = document.getElementById('chatToggleBtn');
    
    if (isChatOpen) {
        widget.style.display = 'flex';
        // Chat-Button auf mobilen Geräten verstecken, um Platz zu sparen
        toggleBtn.classList.add('sm:flex', 'hidden');
        
        loadSupportChat();
        startSupportChatAutoRefresh();
        
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
        stopSupportChatAutoRefresh();
    }
}

// 2.5 KI an-/ausschalten
function applySupportAIState(enabled) {
    aiEnabled = enabled !== false;
    const indicator = document.getElementById('ai-status-indicator');
    const statusText = document.getElementById('ai-status-text');
    const toggleBtn = document.getElementById('aiToggleButton');
    const toggleIcon = document.getElementById('ai-toggle-icon');
    const toggleText = document.getElementById('ai-toggle-text');

    if (!indicator || !statusText || !toggleBtn || !toggleIcon || !toggleText) return;

    if (aiEnabled) {
        indicator.className = "absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 border-2 border-blue-900 rounded-full transition-colors duration-300";
        statusText.innerText = "KI-Assistent aktiv";
        toggleBtn.className = "bg-green-500 hover:bg-green-600 text-white transition-all px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-[0_0_12px_rgba(74,222,128,0.8)] border border-green-400";
        toggleIcon.setAttribute('data-lucide', 'bot');
        toggleText.innerText = "KI: AN";
    } else {
        indicator.className = "absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-gray-400 border-2 border-blue-900 rounded-full transition-colors duration-300";
        statusText.innerText = "Nur menschlicher Support";
        toggleBtn.className = "bg-gray-500 hover:bg-gray-600 text-white transition-all px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-sm border border-gray-400";
        toggleIcon.setAttribute('data-lucide', 'bot-off');
        toggleText.innerText = "KI: AUS";
    }

    if (window.lucide) lucide.createIcons();
}

function hasAiDisabledNoticeAlreadyShown() {
    return chatMessages.some(msg => msg && msg.role === "assistant" && msg.content === AI_DISABLED_NOTICE);
}

function toggleSupportAI() {
    // Lokaler Schalter für Tests. Der Admin-Schalter im Admin-Panel überschreibt diesen Status beim nächsten Laden aus dem Worker.
    applySupportAIState(!aiEnabled);
}

// 3. UI updaten (Nachrichten rendern & Animationen)
function updateSupportChatUI() {
    const chatEl = document.getElementById('supportChatMessages');
    if (!chatEl) return;

    // Position merken, damit der Chat beim Auto-Refresh nicht sichtbar springt.
    const distanceFromBottom = chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight;
    const wasNearBottom = distanceFromBottom < 80;
    const oldScrollTop = chatEl.scrollTop;
    const oldScrollHeight = chatEl.scrollHeight;
    
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
            // Animation für "KI denkt nach"
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

    if (wasNearBottom) {
        chatEl.scrollTop = chatEl.scrollHeight;
    } else {
        chatEl.scrollTop = Math.max(0, oldScrollTop + (chatEl.scrollHeight - oldScrollHeight));
    }
}

// 4. API Calls (Worker)
async function loadSupportChat(silent = false) {
    if (supportChatIsLoading) return;
    supportChatIsLoading = true;
    try {
        const res = await fetch(`${WORKER_BASE}/api/chat/load`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: getSupportChatUserId() })
        });
        const data = await res.json();
        if (typeof data.aiEnabled !== "undefined") {
            applySupportAIState(data.aiEnabled);
        }
        const loadedMessages = normalizeSupportMessages(data.messages || []);
        const newSnapshot = getSupportChatSnapshot(loadedMessages);

        // Nur neu rendern, wenn sich wirklich etwas geändert hat.
        // So flackert der Chat nicht jede Sekunde.
        if (newSnapshot !== supportChatLastSnapshot) {
            supportChatLastSnapshot = newSnapshot;
            chatMessages = loadedMessages;
            updateSupportChatUI();
        } else if (!silent && chatMessages.length === 0) {
            updateSupportChatUI();
        }
    } catch (e) {
        console.error("Fehler beim Laden des Chats:", e);
    } finally {
        supportChatIsLoading = false;
    }
}

async function saveSupportChat() {
    try {
        await fetch(`${WORKER_BASE}/api/chat/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: getSupportChatUserId(),
                messages: normalizeSupportMessages(chatMessages)
            })
        });
        supportChatLastSnapshot = getSupportChatSnapshot(chatMessages);
    } catch (e) {
        console.error("Fehler beim Speichern des Chats:", e);
    }
}

async function sendSupportChatMessage() {
    supportChatIsSending = true;
    const inputEl = document.getElementById("supportChatInput");
    const sendBtn = document.getElementById("supportChatSendBtn");
    
    const text = inputEl.value.trim();
    if (!text) {
        supportChatIsSending = false;
        return;
    }

    // UI sperren & Eingabefeld zurücksetzen
    inputEl.value = "";
    inputEl.style.height = ''; // Auto-Resize zurücksetzen
    inputEl.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i>';
    if (window.lucide) lucide.createIcons();

    // User-Nachricht anzeigen & speichern
    chatMessages.push({ role: "user", content: text });
    updateSupportChatUI();
    await saveSupportChat();

    // Wenn KI deaktiviert ist, zeige den Hinweis nur ein einziges Mal pro Chat an
    if (!aiEnabled) {
        setTimeout(async () => {
            if (!hasAiDisabledNoticeAlreadyShown()) {
                chatMessages.push({
                    role: "assistant",
                    content: AI_DISABLED_NOTICE
                });
                updateSupportChatUI();
                await saveSupportChat();
            }

            inputEl.disabled = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i data-lucide="send" class="w-5 h-5 ml-0.5"></i>';
            if (window.lucide) lucide.createIcons();
            inputEl.focus();
            supportChatIsSending = false;
        }, 300);
        return;
    }

    // --- KI Antwort abfragen ---
    
    // Temporäre "Tippt..." Animation hinzufügen
    const typingId = Date.now();
    chatMessages.push({ role: "assistant", content: "", isTyping: true, id: typingId });
    updateSupportChatUI();

    try {
        const res = await fetch(`${WORKER_BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: getSupportChatUserId(),
                message: text,
                loggedIn: false,
                popular: []
            })
        });

        const data = await res.json();
        if (typeof data.aiEnabled !== "undefined") {
            applySupportAIState(data.aiEnabled);
        }

        // Tippen-Animation entfernen
        chatMessages = chatMessages.filter(msg => msg.id !== typingId);

        // Richtige Antwort hinzufügen. Wenn die KI im Admin deaktiviert ist, sendet der Worker nach dem ersten Hinweis reply=null.
        if (data.reply) {
            chatMessages.push({ role: "assistant", content: data.reply });
        }
        updateSupportChatUI();
        await loadSupportChat(true);
    } catch (e) {
        chatMessages = chatMessages.filter(msg => msg.id !== typingId);
        
        chatMessages.push({
            role: "assistant",
            content: "⚠️ Leider ist ein Verbindungsfehler aufgetreten."
        });
        updateSupportChatUI();
    }

    // UI entsperren
    inputEl.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i data-lucide="send" class="w-5 h-5 ml-0.5"></i>';
    if (window.lucide) lucide.createIcons();
    supportChatIsSending = false;
    inputEl.focus();
}

// 5. Beim Laden der Seite initialisieren
document.addEventListener("DOMContentLoaded", () => {
    // Lade das Support-Widget für normale User, aber NICHT auf den Admin-Seiten
    if (!window.location.pathname.toLowerCase().includes('admin')) {
        initFloatingSupportChat();
    }
});