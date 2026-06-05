/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/**
 * Winterthur Times – Support + Artikel + KV Chat Speicher
 */

/**
 * Winterthur Times – Support + Artikel + KV Chat Speicher
 */

// -----------------------------------------
// ADMIN PASSWORT
// -----------------------------------------
// Nicht im GitHub-Code speichern.
// In Cloudflare als Secret/Variable setzen:
// ADMIN_PASSWORD = dein Passwort
function getAdminPassword(env) {
  return env.ADMIN_PASSWORD || "";
}

function getMissingWorkerVariables(env) {
  const required = [
    "FIREBASE_API_KEY",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
    "FIREBASE_MESSAGING_SENDER_ID",
    "FIREBASE_APP_ID",
    "ADMIN_PASSWORD",
    "GITHUB_OWNER",
    "GITHUB_REPO",
    "GITHUB_TOKEN",
    "GROQ_API_KEY"
  ];

  return required.filter(name => !String(env[name] || "").trim());
}

// ------------------------------------------------------
// WEBSITE-KARTE FÜR DEN SUPPORT-CHATBOT
// ------------------------------------------------------
const WEBSITE_SUPPORT_GUIDE = `
AKTUELLE WEBSITE-KARTE DER WINTERTHUR TIMES

GRUNDREGEL FÜR DEN SUPPORTBOT:
- Antworte nur zu dieser Website und ihren Funktionen.
- Wenn der Nutzer fragt, wo ein Button ist, nenne den genauen Bereich, den sichtbaren Button-Text und die Reihenfolge der Klicks.
- Wenn etwas nur für eingeloggte Nutzer geht, sage das klar.
- Wenn du unsicher bist, sage: "Das sollte im Bereich ... sein" und stelle eine kurze Rückfrage.
- Keine erfundenen externen Links nennen.

STARTSEITE:
- Oben links/zentral steht das Logo bzw. der Titel "Winterthur Times". Klick darauf führt zur Startseite.
- Im Header gibt es ein Menü-Symbol. Wenn man es öffnet, erscheinen direkt die Kategorien.
- Im Header gibt es ein Such-Symbol. Danach erscheint die Suche mit Eingabefeld und Button "Suchen".
- Auf der Startseite stehen die Artikelkarten. Klick auf eine Artikelkarte öffnet den Artikel.
- Rechts bzw. auf Handy unter den Artikeln stehen Widgets:
  1. "Meistgelesen" mit den Top-Artikeln.
  2. "Tägliches Rätsel" mit Antwortfeld, Button "Prüfen" und "Hinweis anzeigen".
  3. "Tagesbilder" mit Button "Zur Galerie".
  4. "Sudoku".
  5. "Kreuzworträtsel".

MENÜ / KATEGORIEN:
- Wenn man oben das Menü öffnet, erscheinen direkt die Kategorien: Politik, Wirtschaft, Gesellschaft, Kultur, Sport, Lokales, Wissenschaft, Unterhaltung.
- Klick auf eine Kategorie zeigt die Artikel dieser Kategorie.
- Im Footer stehen die gleichen Kategorien ebenfalls.
- In Artikelansichten gibt es "Zurück zur Startseite".

ARTIKEL:
- Artikel öffnet man durch Klick auf eine Artikelkarte oder einen Titel.
- Im Artikel gibt es Kategorie/Ressort, Titel, Autor, Zeit, Views/Likes, Artikelbild, Text, Zwischenbilder, Quellen, Umfrage und Kommentare.
- Der Like-Button ist beim Herz/Like-Bereich des Artikels.
- Quellen stehen unten bei "Quellen & Weiterführende Links".
- Kommentare stehen unten im Bereich "Kommentare".
- Kommentieren geht nur nach Login. Nicht eingeloggte Nutzer sehen "Jetzt einloggen".
- Umfragen im Artikel: Nutzer klicken direkt auf eine Antwortoption. Stimmen werden pro Umfrage separat gespeichert.

SUCHE:
- Oben im Header auf die Lupe klicken.
- Suchbegriff ins Eingabefeld schreiben.
- Button "Suchen" drücken oder Enter verwenden.
- Die Suche findet Artikel nach Titel, Zusammenfassung und Inhalt.

LOGIN / PROFIL:
- Oben rechts gibt es "Login", wenn man nicht angemeldet ist.
- Login öffnet ein Fenster mit Benutzername/E-Mail und Passwort.
- Nach Login erscheint das Profil bzw. der Nutzerbereich.
- Im Profil können Nutzer Benutzername, Passwort, Anzeigename/Realname-Anzeige, Profilbild, Bio und E-Mail-Benachrichtigungen bearbeiten.
- Speichern im Profil über den Button "Speichern".
- Abmelden geht oben über "Abmelden".

TAGESBILDER / COMMUNITY-GALERIE:
- Auf Startseite im Widget "Tagesbilder" auf "Zur Galerie" klicken.
- Alternativ im Menü oder Footer "Tagesbilder (Community)" klicken.
- In der Galerie können eingeloggte Nutzer Bilder hochladen.
- Upload geht per Datei oder Bild-URL.
- Button zum Hochladen heisst sinngemäss "Bild hochladen".
- Bilder können geliked werden.
- Eigene Bilder oder Bilder als Admin können gelöscht werden.

WEBSITE BEWERTEN / KONTAKT:
- Im Footer gibt es "Website bewerten".
- Der Kontakt im Footer öffnet ebenfalls den Feedback-/Supportbereich.
- Feedback schreiben geht im Feedbackfeld; eingeloggte Nutzer können Feedback absenden.
- Der Support-Chat ist unten rechts.

SUPPORT-CHAT:
- Der Chat ist unten rechts als Support-Chat-Fenster.
- Nutzer schreiben unten ins Eingabefeld.
- KI kann im Chatfenster ein- und ausgeschaltet werden.
- Wenn KI ausgeschaltet ist, werden Nachrichten gespeichert und Admins können antworten.
- Nutzerhinweis: Admins können den Chatverlauf lesen.
- Chatverlauf wird pro Benutzer in Cloudflare KV gespeichert.
- Admin-Antworten erscheinen im Kunden-Chatfenster.
- Der Chat aktualisiert automatisch.

RÄTSEL:
- "Tägliches Rätsel": Antwort eingeben, "Prüfen" klicken, optional "Hinweis anzeigen".
- "Sudoku": 9x9-Feld ausfüllen. Nach richtigem Lösen lädt ein neues Sudoku.
- "Kreuzworträtsel": Weiße Felder ausfüllen. Zahlen und Pfeile zeigen Frage und Richtung:
  → = waagerecht, ↓ = senkrecht, →↓ = beide Richtungen.
- Bei allen Rätseln gibt es ein Vollbild-Symbol. Im Vollbild wird das Vollbild-Symbol selbst nicht nochmals angezeigt, nur Schließen.
- Bereits eingetragene Werte bleiben beim Wechsel in Vollbild erhalten.

MOBILE ANSICHT:
- Auf Handy stehen die Spalten untereinander.
- Meistgelesen, tägliches Rätsel, Tagesbilder, Sudoku und Kreuzworträtsel erscheinen unter den Artikeln.
- Der Support-Chat ist unten und nimmt fast die Breite des Handys ein.
- Navigation läuft über Menü/Buttons und Footer.


BEISPIELE FÜR KATEGORIE-ANTWORTEN:
- Frage: "Wie komme ich auf die Wissenschaftsartikel?"
  Antwort: "Öffne oben das Menü und klicke auf die Kategorie Wissenschaft. Dann werden dir alle Wissenschaftsartikel angezeigt."
- Frage: "Wo finde ich Sport?"
  Antwort: "Öffne oben das Menü und klicke auf Sport. Dann siehst du die Sportartikel."
- Frage: "Wie komme ich zu lokalen Artikeln?"
  Antwort: "Öffne oben das Menü und klicke auf Lokales. Dort findest du die lokalen Artikel."

TYPISCHE ANTWORTEN:
- "Wo finde ich Kategorien?" -> Oben das Menü öffnen. Dort erscheinen direkt die Kategorien Politik, Wirtschaft, Gesellschaft, Kultur, Sport, Lokales, Wissenschaft und Unterhaltung.
- "Wo kann ich Artikel suchen?" -> Oben im Header auf die Lupe klicken, Suchbegriff eingeben, "Suchen" drücken.
- "Wo kann ich Tagesbilder hochladen?" -> Auf Startseite bei Tagesbilder "Zur Galerie" oder im Footer "Tagesbilder (Community)", dann Datei/URL wählen und hochladen. Login nötig.
- "Wo schalte ich die KI aus?" -> Im Kunden-Chatfenster oder im Admin-Support-Panel beim jeweiligen Chat über KI AN/AUS.
`;


export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }


    // ------------------------------------------------------
    // ÖFFENTLICHE WEBSITE-KONFIGURATION
    // ------------------------------------------------------
    // Diese Werte kommen aus Cloudflare Worker Variables/Secrets.
    // Keine Firebase-Konfiguration mehr direkt im GitHub-Repo speichern.
    if (path === "/api/public-config" && request.method === "GET") {
      const firebaseConfig = {
        apiKey: env.FIREBASE_API_KEY || "",
        authDomain: env.FIREBASE_AUTH_DOMAIN || "",
        projectId: env.FIREBASE_PROJECT_ID || "",
        storageBucket: env.FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "",
        appId: env.FIREBASE_APP_ID || ""
      };
      const missing = getMissingWorkerVariables(env);

      return new Response(JSON.stringify({
        ok: missing.length === 0,
        firebase: firebaseConfig,
        workerBase: env.WORKER_BASE_URL || "",
        missing
      }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          ...corsHeaders
        }
      });
    }

    if (path === "/api/health" && request.method === "GET") {
      const missing = getMissingWorkerVariables(env);
      return new Response(JSON.stringify({
        ok: missing.length === 0,
        worker: "winterthur-times",
        missing,
        freeSetup: true
      }), {
        status: missing.length === 0 ? 200 : 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          ...corsHeaders
        }
      });
    }

    // -----------------------------
    // KV CHAT (Einzelnachrichten, Prefix chat:)
    // -----------------------------
    if (path === "/chat/save" && request.method === "POST") {
      const { uid, text, sender } = await request.json();

      if (!uid || !text) {
        return new Response(JSON.stringify({ error: "uid oder text fehlt." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const key = `chat:${uid}`;
      const existing = await env.chatkv.get(key, { type: "json" }) || [];
      existing.push({
        role: sender === "assistant" || sender === "admin" ? "assistant" : "user",
        sender: sender || "user",
        content: text,
        text,
        timestamp: new Date().toISOString()
      });
      await env.chatkv.put(key, JSON.stringify(existing), {
        expirationTtl: 60 * 60 * 24 * 14
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (path === "/chat/load") {
      const uid = url.searchParams.get("uid");
      if (!uid) {
        return new Response(JSON.stringify({ error: "uid fehlt." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      const key = `chat:${uid}`;
      const chat = await env.chatkv.get(key, { type: "json" }) || [];
      return new Response(JSON.stringify(chat), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (path === "/chat/admin/all") {
      const list = await env.chatkv.list({ prefix: "chat:" });
      const result = {};
      for (const item of list.keys) {
        const uid = item.name.replace("chat:", "");
        result[uid] = await env.chatkv.get(item.name, { type: "json" }) || [];
      }
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // -----------------------------
    // CHAT LADEN (pro Benutzer)
    // -----------------------------
    if (path === "/api/chat/load" && request.method === "POST") {
      const body = await request.json();
      const userId = body.userId;

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId fehlt." }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const messages = await loadChatMessages(env, userId);
      const meta = await loadChatMeta(env, userId);

      return new Response(JSON.stringify({ messages, aiEnabled: meta.aiEnabled }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // -----------------------------
    // CHAT SPEICHERN (pro Benutzer)
    // -----------------------------
    if (path === "/api/chat/save" && request.method === "POST") {
      const body = await request.json();
      const userId = body.userId;
      const messages = body.messages || [];

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId fehlt." }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // ⭐ TTL: Chats werden nach 14 Tagen automatisch gelöscht
      await saveChatMessages(env, userId, normalizeMessages(messages));

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // ------------------------------------------------------
    // KUNDE: KI STATUS PRO CHAT SETZEN
    // ------------------------------------------------------
    if (path === "/api/chat/ai" && request.method === "POST") {
      const body = await request.json();
      const userId = String(body.userId || body.uid || "").trim();

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId fehlt." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const meta = await loadChatMeta(env, userId);
      meta.aiEnabled = body.aiEnabled !== false;

      // Wenn jemand die KI erneut ausschaltet, darf der Hinweis wieder genau einmal erscheinen.
      if (meta.aiEnabled === false) {
        meta.disabledNoticeSent = false;
      }

      await saveChatMeta(env, userId, meta);

      return new Response(JSON.stringify({
        ok: true,
        chatId: userId,
        aiEnabled: meta.aiEnabled
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // -----------------------------
    // ADMIN: ARTIKEL GENERIEREN
    // -----------------------------
    if (request.method === "POST" && path === "/generate-article") {
      return handleGenerateArticle(request, env, corsHeaders);
    }

    // -----------------------------
    // ADMIN: ARTIKEL VERÖFFENTLICHEN
    // -----------------------------
    if (request.method === "POST" && path === "/publish-article") {
      return handlePublishArticle(request, env, corsHeaders);
    }

    // -----------------------------
    // TAGESBILDER: GROSSE BILDER NACH GITHUB SPEICHERN
    // -----------------------------
    if ((path === "/api/gallery/upload" || path === "/api/admin/upload-image" || path === "/api/upload-image") && request.method === "POST") {
      return handleGalleryUpload(request, env, corsHeaders);
    }

    if (path === "/api/gallery/save-url" && request.method === "POST") {
      return handleGallerySaveUrl(request, env, corsHeaders);
    }

    if (path === "/api/gallery/list" && request.method === "GET") {
      return handleGalleryList(env, corsHeaders);
    }

    if (path === "/api/gallery/delete" && request.method === "POST") {
      return handleGalleryDelete(request, env, corsHeaders);
    }

    if (path === "/api/gallery/like" && request.method === "POST") {
      return handleGalleryLike(request, env, corsHeaders);
    }

    // -----------------------------
    // SUPPORT-CHAT ROUTE
    // -----------------------------
    if (path === "/api/chat" && request.method === "POST") {
      return handleSupportChat(request, env, corsHeaders);
    }


    // ------------------------------------------------------
    // ⭐ ADMIN: KI STATUS PRO CHAT SETZEN
    // ------------------------------------------------------
    if (path === "/api/admin/ai" && request.method === "POST") {
      const body = await request.json();

      if (body.password !== getAdminPassword(env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const chatId = String(body.chatId || "").replace(/^chat_/, "");
      if (!chatId) {
        return new Response(JSON.stringify({ error: "chatId fehlt." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const meta = await loadChatMeta(env, chatId);
      meta.aiEnabled = body.aiEnabled !== false;
      if (meta.aiEnabled === false) {
        meta.disabledNoticeSent = false;
      }
      await saveChatMeta(env, chatId, meta);

      return new Response(JSON.stringify({ ok: true, chatId, aiEnabled: meta.aiEnabled }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // ------------------------------------------------------
    // ⭐ ADMIN: MANUELLE ANTWORT IN CHAT SPEICHERN
    // ------------------------------------------------------
    if (path === "/api/admin/send" && request.method === "POST") {
      const body = await request.json();

      if (body.password !== getAdminPassword(env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const chatId = String(body.chatId || "").replace(/^chat_/, "");
      const message = String(body.message || "").trim();

      if (!chatId || !message) {
        return new Response(JSON.stringify({ error: "chatId oder message fehlt." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const messages = await appendChatMessage(env, chatId, {
        role: "assistant",
        sender: "admin",
        content: message,
        text: message
      });

      return new Response(JSON.stringify({ ok: true, messages }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }


    // ------------------------------------------------------
    // ⭐ ADMIN: CHAT ENDGÜLTIG AUS KV LÖSCHEN
    // ------------------------------------------------------
    if (path === "/api/admin/delete-chat" && request.method === "POST") {
      const body = await request.json();

      if (body.password !== getAdminPassword(env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const chatId = String(body.chatId || "").replace(/^chat_/, "").replace(/^chat:/, "").trim();
      if (!chatId) {
        return new Response(JSON.stringify({ error: "chatId fehlt." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // Aktuelles Format löschen
      await env.chatkv.delete(getChatKey(chatId));
      await env.chatkv.delete(getChatMetaKey(chatId));

      // Altes/alternatives Format sicherheitshalber auch löschen
      await env.chatkv.delete(`chat:${chatId}`);

      return new Response(JSON.stringify({ ok: true, deleted: chatId }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // ------------------------------------------------------
    // ⭐ ADMIN: ALLE CHATS LADEN
    // ------------------------------------------------------
    if (path === "/api/admin/chats" && request.method === "POST") {
      const body = await request.json();

      if (body.password !== getAdminPassword(env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders
        });
      }

      const list = await env.chatkv.list({ prefix: "chat_" });
      const chats = {};

      for (const item of list.keys) {
        const data = await env.chatkv.get(item.name, "json");
        const userId = item.name.replace(/^chat_/, "");
        const meta = await loadChatMeta(env, userId);
        chats[userId] = {
          messages: normalizeMessages(data || []),
          aiEnabled: meta.aiEnabled,
          adminDeleted: meta.adminDeleted
        };
      }

      return new Response(JSON.stringify({ chats }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // ------------------------------------------------------
    // SUPPORTBOT: WEBSITE-KARTE ANZEIGEN / TESTEN
    // ------------------------------------------------------
    if (path === "/api/support/site-guide" && request.method === "GET") {
      return new Response(JSON.stringify({ guide: WEBSITE_SUPPORT_GUIDE }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // -----------------------------
    // FALLBACK
    // -----------------------------
    return new Response("Not found", {
      status: 404,
      headers: corsHeaders
    });
  }
};


// ------------------------------------------------------
// CHAT KV HELPER
// ------------------------------------------------------
const CHAT_TTL_SECONDS = 60 * 60 * 24 * 14;
const AI_DISABLED_NOTICE = "🤖 Die KI ist derzeit ausgeschaltet. Deine Nachricht wurde sicher gespeichert. Ein Mitarbeiter wird sich das bald ansehen.";

function getChatKey(userId) {
  return `chat_${String(userId || "guest")}`;
}

function getChatMetaKey(userId) {
  return `chatmeta_${String(userId || "guest")}`;
}

async function loadChatMeta(env, userId) {
  const saved = await env.chatkv.get(getChatMetaKey(userId), "json");
  return {
    aiEnabled: saved?.aiEnabled !== false,
    disabledNoticeSent: saved?.disabledNoticeSent === true,
    adminDeleted: saved?.adminDeleted === true
  };
}

async function saveChatMeta(env, userId, meta) {
  await env.chatkv.put(getChatMetaKey(userId), JSON.stringify({
    aiEnabled: meta?.aiEnabled !== false,
    disabledNoticeSent: meta?.disabledNoticeSent === true,
    adminDeleted: meta?.adminDeleted === true
  }), { expirationTtl: CHAT_TTL_SECONDS });
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(m => m && (m.content || m.text))
    .map(m => {
      const content = String(m.content || m.text || "");
      const role = m.role === "assistant" || m.sender === "assistant" || m.sender === "admin" ? "assistant" : "user";
      return {
        role,
        sender: m.sender || role,
        content,
        text: content,
        timestamp: m.timestamp || new Date().toISOString()
      };
    });
}

async function loadChatMessages(env, userId) {
  const saved = await env.chatkv.get(getChatKey(userId), "json");
  return normalizeMessages(saved || []);
}

async function saveChatMessages(env, userId, messages) {
  await env.chatkv.put(getChatKey(userId), JSON.stringify(normalizeMessages(messages)), {
    expirationTtl: CHAT_TTL_SECONDS
  });
}

async function appendChatMessage(env, userId, message) {
  const messages = await loadChatMessages(env, userId);
  const normalized = normalizeMessages([message])[0];

  if (!normalized) return messages;

  const last = messages[messages.length - 1];
  const isDuplicate = last && last.role === normalized.role && last.content === normalized.content;

  if (!isDuplicate) {
    messages.push(normalized);
    await saveChatMessages(env, userId, messages);
  }

  return messages;
}

// ------------------------------------------------------
// SUPPORT-CHAT HANDLER
// ------------------------------------------------------
async function handleSupportChat(request, env, corsHeaders) {
  try {
    const bodyText = await request.text();
    let body = {};

    try { body = JSON.parse(bodyText); }
    catch {
      return new Response(JSON.stringify({ reply: "Ungültiges JSON gesendet." }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const message = body.message || "";
    const userId = body.userId || body.uid || "guest";
    const loggedIn = body.loggedIn === true;
    const popular = Array.isArray(body.popular) ? body.popular : [];
    const dynamicCategories = Array.isArray(body.categories)
      ? Array.from(new Set(body.categories.map(cat => String(cat || "").trim()).filter(Boolean)))
      : [];
    const dynamicCategoryGuide = dynamicCategories.length
      ? `\nAKTUELLE RESSORTS/KATEGORIEN DER WEBSITE:\n${dynamicCategories.map(cat => `- ${cat}`).join("\n")}\n\nNeue Ressorts aus dem Admin Panel sind echte Ressorts. Wenn der Nutzer nach einem Ressort fragt, nenne den gesuchten Namen und sage, dass er oben im Menue oder unten im Footer unter Ressorts angeklickt werden kann.\n`
      : "";
    const meta = await loadChatMeta(env, userId);

    if (message.trim()) {
      await appendChatMessage(env, userId, {
        role: "user",
        sender: "user",
        content: message,
        text: message
      });
    }

    if (meta.aiEnabled === false) {
      let reply = null;

      if (!meta.disabledNoticeSent) {
        reply = AI_DISABLED_NOTICE;
        await appendChatMessage(env, userId, {
          role: "assistant",
          sender: "assistant",
          content: reply,
          text: reply
        });
        meta.disabledNoticeSent = true;
        await saveChatMeta(env, userId, meta);
      }

      return new Response(JSON.stringify({
        status: 200,
        reply,
        aiEnabled: false,
        noticeShown: !!reply
      }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const systemPrompt = `
Du bist der freundliche, professionelle AI-Support-Assistent der "Winterthur Times", einer modernen Online-Zeitungsplattform.

WICHTIG:
Du bekommst unten eine Website-Karte. Nutze diese Website-Karte als feste Wahrheit über die Bedienung der Website. Wenn Nutzer fragen, wo ein Button ist oder wie etwas funktioniert, antworte mit konkreten Klickpfaden und sichtbaren Button-Namen.

DEINE AUFGABEN:
- Unterstützung bei Funktionen: Artikel lesen, Suche, Kommentare, Likes, Profilverwaltung, Login, Tagesbilder, Rätsel, Umfragen, Support-Chat.
- Problemlösung: Login-Fehler, Kommentar-Probleme, Bild-Uploads, Suche, Admin-Panel, Support-Chat.
- Erkläre die Funktionen einfach, genau und schrittweise.

KERNREGELN:
1. Fokus: Beantworte ausschliesslich Fragen zur öffentlichen Winterthur-Times-Website und ihren Nutzerfunktionen.
2. Gib normalen Nutzern keine Admin-Informationen: keine Hinweise zu Admin-Login, Admin-Panel, Admin-Buttons, Admin-Supportbereich, internen Speicherorten oder Artikelverwaltung. Wenn danach gefragt wird, sage kurz: "Dazu kann ich im öffentlichen Support nicht helfen."
3. Keine erfundenen Funktionen. Wenn etwas nicht in der Website-Karte steht, sage, dass du es nicht sicher siehst.
3. Keine externen Links nennen.
4. Bei der ersten Support-Antwort freundlich erwähnen: Admins können den Chatverlauf lesen.
5. Wenn der Nutzer fragt "wo ist...", "wie komme ich zu..." oder "wie mache ich...", nenne:
   - Bereich der Website
   - sichtbaren Button/Text
   - genaue Klickreihenfolge
6. Antworte kurz, aber nicht so kurz, dass wichtige Schritte fehlen.


ANTWORTQUALITÄT:
- Antworte direkt auf die Frage des Nutzers.
- Nenne nur den gesuchten Bereich/Button, nicht unnötig andere falsche oder ähnliche Begriffe.
- Formuliere positiv und klar. Beispiel: Statt "Wirtschaft nicht, sondern Wissenschaft" schreibe: "Öffne oben das Menü und klicke auf Wissenschaft."
- Bei Kategorien immer den genauen Kategorienamen wiederholen, den der Nutzer sucht.
- Keine verwirrenden Korrekturen, ausser der Nutzer hat wirklich einen falschen Begriff verwendet.
- Keine langen Umwege. Beginne direkt mit dem nächsten Schritt.
- Nutze kurze Schritt-für-Schritt-Sätze.

VERBOTENE ADMIN-AUSKUNFT:
- Nenne nicht, wo der Admin-Login ist.
- Erkläre nicht, wie man ins Admin-Panel kommt.
- Erkläre keine Admin-Tabs, Admin-Buttons, Artikelverwaltung, Support-Admin-Funktionen oder Cloudflare/Firebase-Speicherorte.
- Auch wenn die Website-Karte intern alte Admin-Begriffe enthalten sollte: Nicht an Nutzer ausgeben.


SCHLECHTE ANTWORTEN VERMEIDEN:
- Schreibe nicht: "Dort findest du Kategorie X nicht, sondern Y."
- Schreibe nicht über andere Kategorien, wenn der Nutzer klar eine Kategorie genannt hat.
- Wiederhole keine falschen Begriffe aus Versehen.

KOMMUNIKATIONSSTIL:
- Professionell, locker, freundlich.
- Kein Fachjargon.
- Keine Emojis.
- Gäste: maximal 90 Wörter.
- Eingeloggte Nutzer: maximal 130 Wörter.

${WEBSITE_SUPPORT_GUIDE}

${dynamicCategoryGuide}
`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "system", content: loggedIn ? "Der Nutzer ist eingeloggt." : "Der Nutzer ist NICHT eingeloggt." },
          { role: "system", content: popular.length > 0 ? "Aktuell meistgelesene Artikel: " + popular.join(" | ") : "Keine meistgelesenen Artikel übermittelt." },
          { role: "system", content: body.pageContext ? "Aktueller Seitenkontext des Nutzers: " + String(body.pageContext).slice(0, 1200) : "Kein aktueller Seitenkontext übermittelt." },
          { role: "user", content: message }
        ]
      })
    });

    const data = await groqResponse.json();
    const reply = data?.choices?.[0]?.message?.content || "Es konnte keine Antwort generiert werden.";

    await appendChatMessage(env, userId, {
      role: "assistant",
      sender: "assistant",
      content: reply,
      text: reply
    });

    return new Response(JSON.stringify({
      status: groqResponse.status,
      reply,
      aiEnabled: true,
      raw: data
    }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (err) {
    return new Response(JSON.stringify({ reply: "Interner Fehler im Worker.", worker_error: err.toString() }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
}

// ------------------------------------------------------
// ARTIKEL GENERIEREN
// ------------------------------------------------------
async function handleGenerateArticle(request, env, corsHeaders) {
  const body = await request.json();
  const topic = body.topic || "";

  if (!topic) {
    return new Response(JSON.stringify({ error: "Kein Thema angegeben." }), { headers: corsHeaders });
  }

  const prompt = `Schreibe einen kurzen Zeitungsartikel über: ${topic}.
Erste Zeile = Überschrift.
Danach 3-5 Absätze Text.
Keine Emojis.`;

  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      stream: false,
      messages: [
        { role: "system", content: "Schreibe klar und strukturiert." },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await groqResponse.json();
  const content = data?.choices?.[0]?.message?.content || "";

  if (!content.trim()) {
    return new Response(JSON.stringify({
      title: `Artikel zu: ${topic}`,
      text: "Das Modell hat keinen Text geliefert. Bitte erneut versuchen."
    }), { headers: corsHeaders });
  }

  const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const title = lines[0] || `Artikel zu: ${topic}`;
  const text = lines.slice(1).join("\n\n") || "Kein Artikeltext gefunden.";

  return new Response(JSON.stringify({ title, text }), { headers: corsHeaders });
}

// ------------------------------------------------------
// ARTIKEL VERÖFFENTLICHEN
// ------------------------------------------------------
async function handlePublishArticle(request, env, corsHeaders) {
  const body = await request.json();
  const title = body.title || "";
  const text = body.text || "";

  if (!title || !text) {
    return new Response(JSON.stringify({ error: "Titel oder Text fehlt." }), { headers: corsHeaders });
  }

  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const filename = `${date}-${safeTitle || "artikel"}.md`;

  const markdown = `---
title: "${title.replace(/"/g, '\\"')}"
date: "${date}"
---

${text}
`;

  const repoOwner = env.GITHUB_OWNER;
  const repoName = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/articles/${encodeURIComponent(filename)}`;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/vnd.github+json"
    },
    body: JSON.stringify({
      message: `Add article: ${title}`,
      content: btoa(unescape(encodeURIComponent(markdown)))
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    return new Response(JSON.stringify({ error: "GitHub-Fehler", details: errText }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true, filename }), { headers: corsHeaders });
}

// ------------------------------------------------------
// TAGESBILDER HOCHLADEN
// ------------------------------------------------------
async function handleGalleryUpload(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const filenameRaw = String(body.filename || `tagesbild-${Date.now()}.jpg`);
    const contentType = String(body.contentType || "image/jpeg").toLowerCase();
    const base64 = String(body.base64 || body.content || body.dataUrl || "").replace(/^data:image\/[^;]+;base64,/, "").replace(/\s/g, "");
    const uploader = String(body.uploader || "user");

    if (!base64) {
      return jsonResponse({ error: "base64 fehlt." }, 400, corsHeaders);
    }

    if (!contentType.startsWith("image/")) {
      return jsonResponse({ error: "Nur Bilddateien sind erlaubt." }, 400, corsHeaders);
    }

    // Grobe Sicherheitsgrenze: GitHub Contents API und Worker Requests sollen nicht riesig werden.
    // 8 Mio. Base64-Zeichen entsprechen ungefähr 6 MB Datei.
    if (base64.length > 8000000) {
      return jsonResponse({
        error: "Bild ist nach Base64 noch zu gross.",
        details: "Bitte Bild im Browser vor dem Upload stärker komprimieren oder kleiner auswählen."
      }, 413, corsHeaders);
    }

    const repoConfig = getGitHubRepoConfig(env);
    const repoOwner = repoConfig.owner;
    const repoName = repoConfig.repo;
    const token = env.GITHUB_TOKEN;
    const configuredBranch = String(env.GITHUB_BRANCH || "").trim();

    if (!repoOwner || !repoName || !token) {
      const missing = [];
      if (!repoOwner) missing.push("GITHUB_OWNER");
      if (!repoName) missing.push("GITHUB_REPO");
      if (!token) missing.push("GITHUB_TOKEN");
      return jsonResponse({
        error: "GitHub-Konfiguration fehlt.",
        missing,
        details: "Setze die fehlenden Variablen/Secrets im Cloudflare Worker. GITHUB_TOKEN braucht Schreibrechte auf das Repository."
      }, 500, corsHeaders);
    }

    const extension = getGalleryExtension(filenameRaw, contentType);
    const safeBaseName = safePathSegment(filenameRaw.replace(/\.[^.]+$/, "")) || "tagesbild";
    const safeUploader = safePathSegment(uploader) || "user";
    const filename = `${new Date().toISOString().slice(0, 10)}-${Date.now()}-${safeUploader}-${safeBaseName}.${extension}`;
    const filePath = `gallery/${filename}`;
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    const branch = configuredBranch || await getGitHubDefaultBranch(repoOwner, repoName, token);
    const githubBody = {
      message: `Add gallery image: ${filename}`,
      content: base64
    };
    if (branch) githubBody.branch = branch;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github+json",
        "User-Agent": "winterthur-times-worker",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify(githubBody)
    });

    if (!res.ok) {
      const details = await res.text();
      return jsonResponse({ error: "GitHub-Fehler", details }, res.status, corsHeaders);
    }

    const githubData = await res.json().catch(() => ({}));
    const fallbackBranch = branch || "main";
    const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${fallbackBranch}/${filePath}`;
    const downloadUrl = githubData && githubData.content && githubData.content.download_url
      ? githubData.content.download_url
      : rawUrl;
    const image = {
      id: galleryIdFromPath(filePath),
      url: downloadUrl,
      uploader,
      timestamp: new Date().toISOString(),
      isDeleted: false,
      likes: [],
      source: "github",
      path: filePath
    };
    const saved = await upsertGalleryImageOnline(env, repoOwner, repoName, token, fallbackBranch, image);
    if (!saved.ok) {
      return jsonResponse({
        ok: false,
        error: "Bild wurde hochgeladen, aber nicht in der gemeinsamen Galerie gespeichert.",
        details: saved.errors.join(" | "),
        image,
        path: filePath,
        filename,
        branch: fallbackBranch
      }, 500, corsHeaders);
    }

    return jsonResponse({ ok: true, url: downloadUrl, image, storage: saved, path: filePath, filename, branch: fallbackBranch }, 200, corsHeaders);
  } catch (err) {
    return jsonResponse({ error: "Upload fehlgeschlagen.", details: String(err) }, 500, corsHeaders);
  }
}

async function handleGallerySaveUrl(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const url = String(body.url || "").trim();
    const uploader = String(body.uploader || "user").trim() || "user";

    if (!/^https?:\/\/.+/i.test(url)) {
      return jsonResponse({ ok: false, error: "Bitte eine gueltige Bild-URL mit http oder https angeben." }, 400, corsHeaders);
    }

    const ctx = await getGalleryRepoContext(env);
    const image = {
      id: "url_" + hashGalleryText(url),
      url,
      uploader,
      timestamp: new Date().toISOString(),
      isDeleted: false,
      likes: [],
      source: "url"
    };
    const saved = await upsertGalleryImageOnline(env, ctx.owner, ctx.repo, ctx.token, ctx.branch, image);
    if (!saved.ok) {
      return jsonResponse({ ok: false, error: "Bild-URL konnte nicht in der gemeinsamen Galerie gespeichert werden.", details: saved.errors.join(" | ") }, 500, corsHeaders);
    }

    return jsonResponse({ ok: true, image, storage: saved }, 200, corsHeaders);
  } catch (err) {
    return jsonResponse({ ok: false, error: "Bild-URL konnte nicht gespeichert werden.", details: String(err) }, 500, corsHeaders);
  }
}

async function handleGalleryList(env, corsHeaders) {
  try {
    const ctx = await getGalleryRepoContext(env);

    if ((!ctx.owner || !ctx.repo || !ctx.token) && !env.chatkv) {
      return jsonResponse({ ok: false, images: [], error: "GitHub-Konfiguration oder Cloudflare KV fehlt." }, 500, corsHeaders);
    }

    const result = await readGalleryImagesOnline(env, ctx.owner, ctx.repo, ctx.token, ctx.branch);
    const images = result.images.filter(img => galleryImageIsPublic(img)).slice(0, 250);
    return jsonResponse({ ok: true, images, branch: ctx.branch || "main", sources: result.sources, warnings: result.errors }, 200, corsHeaders);
  } catch (err) {
    return jsonResponse({ ok: false, images: [], error: "Galerie konnte nicht geladen werden.", details: String(err) }, 500, corsHeaders);
  }
}

async function handleGalleryDelete(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const id = String(body.id || "").trim();
    const url = String(body.url || "").trim();
    const path = String(body.path || "").trim();
    const deletedBy = String(body.deletedBy || body.user || "").trim();

    if (!id && !url && !path) {
      return jsonResponse({ ok: false, error: "Bild-ID fehlt." }, 400, corsHeaders);
    }

    const ctx = await getGalleryRepoContext(env);
    const result = await readGalleryImagesOnline(env, ctx.owner, ctx.repo, ctx.token, ctx.branch);
    const matcher = item => (
      (id && String(item.id || "") === id) ||
      (url && String(item.url || "") === url) ||
      (path && String(item.path || "") === path)
    );

    let found = false;
    const images = result.images.map(item => {
      if (!matcher(item)) return item;
      found = true;
      return {
        ...item,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy || item.deletedBy || "user"
      };
    });

    if (!found) {
      images.unshift({
        id: id || (path ? galleryIdFromPath(path) : "url_" + hashGalleryText(url)),
        url,
        path,
        uploader: "",
        timestamp: new Date().toISOString(),
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy || "user",
        likes: [],
        source: "tombstone"
      });
    }

    const saved = await writeGalleryImagesOnline(env, ctx.owner, ctx.repo, ctx.token, ctx.branch, images);
    if (!saved.ok) {
      return jsonResponse({ ok: false, error: "Loeschung konnte nicht online gespeichert werden.", details: saved.errors.join(" | ") }, 500, corsHeaders);
    }

    return jsonResponse({ ok: true, images: images.filter(img => galleryImageIsPublic(img)), storage: saved }, 200, corsHeaders);
  } catch (err) {
    return jsonResponse({ ok: false, error: "Bild konnte nicht geloescht werden.", details: String(err) }, 500, corsHeaders);
  }
}

async function handleGalleryLike(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const id = String(body.id || "").trim();
    const url = String(body.url || "").trim();
    const path = String(body.path || "").trim();
    const user = String(body.user || "").trim();

    if (!user) return jsonResponse({ ok: false, error: "Login erforderlich." }, 401, corsHeaders);
    if (!id && !url && !path) return jsonResponse({ ok: false, error: "Bild-ID fehlt." }, 400, corsHeaders);

    const ctx = await getGalleryRepoContext(env);
    const result = await readGalleryImagesOnline(env, ctx.owner, ctx.repo, ctx.token, ctx.branch);
    let updatedImage = null;
    const images = result.images.map(item => {
      const match = (
        (id && String(item.id || "") === id) ||
        (url && String(item.url || "") === url) ||
        (path && String(item.path || "") === path)
      );
      if (!match) return item;
      const likes = Array.from(new Set((Array.isArray(item.likes) ? item.likes : []).map(String).filter(Boolean)));
      const index = likes.indexOf(user);
      if (index >= 0) likes.splice(index, 1);
      else likes.push(user);
      updatedImage = { ...item, likes, updatedAt: new Date().toISOString() };
      return updatedImage;
    });

    if (!updatedImage) {
      return jsonResponse({ ok: false, error: "Bild nicht gefunden." }, 404, corsHeaders);
    }

    const saved = await writeGalleryImagesOnline(env, ctx.owner, ctx.repo, ctx.token, ctx.branch, images);
    if (!saved.ok) {
      return jsonResponse({ ok: false, error: "Like konnte nicht online gespeichert werden.", details: saved.errors.join(" | ") }, 500, corsHeaders);
    }

    return jsonResponse({ ok: true, image: updatedImage, images: images.filter(img => galleryImageIsPublic(img)), storage: saved }, 200, corsHeaders);
  } catch (err) {
    return jsonResponse({ ok: false, error: "Like konnte nicht gespeichert werden.", details: String(err) }, 500, corsHeaders);
  }
}

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

function getGalleryExtension(filename, contentType) {
  const fromName = String(filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = fromName ? fromName[1] : "";
  const allowed = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
  if (allowed.has(ext)) return ext === "jpeg" ? "jpg" : ext;

  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("avif")) return "avif";
  return "jpg";
}

const GALLERY_MANIFEST_PATH = "gallery/gallery.json";
const GALLERY_KV_KEY = "gallery:images:v2";

async function getGalleryRepoContext(env) {
  const repoConfig = getGitHubRepoConfig(env);
  const owner = repoConfig.owner;
  const repo = repoConfig.repo;
  const token = env.GITHUB_TOKEN;
  let branch = String(env.GITHUB_BRANCH || "").trim();
  if (!branch && owner && repo && token) branch = await getGitHubDefaultBranch(owner, repo, token);
  return { owner, repo, token, branch: branch || "main" };
}

async function readGalleryImagesOnline(env, owner, repo, token, branch) {
  const sources = [];
  const errors = [];
  const lists = [];

  try {
    const kvImages = await readGalleryKvImages(env);
    if (kvImages.length) {
      lists.push(kvImages);
      sources.push("cloudflare-kv");
    }
  } catch (err) {
    errors.push("KV lesen: " + String(err));
  }

  if (owner && repo && token) {
    try {
      const manifest = await readGalleryManifest(owner, repo, token, branch || "main");
      if (Array.isArray(manifest.images) && manifest.images.length) {
        lists.push(manifest.images);
        sources.push("github-manifest");
      }
    } catch (err) {
      errors.push("GitHub Manifest lesen: " + String(err));
    }

    try {
      const files = await readGalleryFilesFromGitHub(owner, repo, token, branch || "main");
      if (files.length) {
        lists.push(files);
        sources.push("github-folder-scan");
      }
    } catch (err) {
      errors.push("GitHub Ordner lesen: " + String(err));
    }
  }

  return {
    images: mergeGalleryImageLists(lists),
    sources,
    errors
  };
}

async function upsertGalleryImageOnline(env, owner, repo, token, branch, image) {
  const current = await readGalleryImagesOnline(env, owner, repo, token, branch);
  const next = mergeGalleryImageLists([[image], current.images]);
  return await writeGalleryImagesOnline(env, owner, repo, token, branch, next);
}

async function writeGalleryImagesOnline(env, owner, repo, token, branch, images) {
  const cleanImages = mergeGalleryImageLists([images]).slice(0, 250);
  const stores = [];
  const errors = [];

  try {
    await writeGalleryKvImages(env, cleanImages);
    stores.push("cloudflare-kv");
  } catch (err) {
    errors.push("KV schreiben: " + String(err));
  }

  if (owner && repo && token) {
    try {
      const manifest = await readGalleryManifest(owner, repo, token, branch || "main").catch(() => ({ sha: null }));
      await writeGalleryManifest(owner, repo, token, branch || "main", cleanImages, manifest.sha || null);
      stores.push("github-manifest");
    } catch (err) {
      errors.push("GitHub Manifest schreiben: " + String(err));
    }
  }

  return {
    ok: stores.length > 0,
    stores,
    errors,
    count: cleanImages.length
  };
}

async function readGalleryKvImages(env) {
  if (!env.chatkv) return [];
  const saved = await env.chatkv.get(GALLERY_KV_KEY, { type: "json" });
  if (Array.isArray(saved)) return saved;
  if (saved && Array.isArray(saved.images)) return saved.images;
  return [];
}

async function writeGalleryKvImages(env, images) {
  if (!env.chatkv) throw new Error("chatkv KV Binding fehlt.");
  await env.chatkv.put(GALLERY_KV_KEY, JSON.stringify({
    updatedAt: new Date().toISOString(),
    images: (Array.isArray(images) ? images : []).slice(0, 250)
  }));
}

async function readGalleryFilesFromGitHub(owner, repo, token, branch) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/gallery?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(apiUrl, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "winterthur-times-worker",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub gallery folder read failed: ${res.status} ${await res.text()}`);

  const files = await res.json();
  const allowed = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
  return (Array.isArray(files) ? files : [])
    .filter(file => file && file.type === "file" && file.path && file.name !== "gallery.json")
    .filter(file => allowed.has(String(file.name || "").split(".").pop().toLowerCase()))
    .map(file => {
      const timestamp = timestampFromGalleryPath(file.path);
      return {
        id: galleryIdFromPath(file.path),
        url: file.download_url || `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
        uploader: uploaderFromGalleryPath(file.path),
        timestamp,
        isDeleted: false,
        likes: [],
        source: "github-scan",
        path: file.path
      };
    });
}

function mergeGalleryImageLists(lists) {
  const byKey = new Map();
  const deletionKeys = new Set();

  (Array.isArray(lists) ? lists : []).flat().forEach(item => {
    const img = normalizeGalleryImage(item);
    if (!img) return;
    [img.id, img.url, img.path].map(value => String(value || "").trim()).filter(Boolean).forEach(value => {
      if (img.isDeleted) deletionKeys.add(value);
    });

    const key = galleryImageKey(img);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, img);
      return;
    }

    byKey.set(key, mergeGalleryImage(existing, img));
  });

  const merged = Array.from(byKey.values()).map(img => {
    const keys = [img.id, img.url, img.path].map(value => String(value || "").trim()).filter(Boolean);
    if (keys.some(key => deletionKeys.has(key))) {
      return { ...img, isDeleted: true };
    }
    return img;
  });

  return merged.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
}

function normalizeGalleryImage(item) {
  if (!item || typeof item !== "object") return null;
  const url = String(item.url || "").trim();
  const path = String(item.path || "").trim();
  if (!url && !path && !item.id) return null;

  const out = {
    ...item,
    id: String(item.id || (path ? galleryIdFromPath(path) : "url_" + hashGalleryText(url))).trim(),
    url,
    path,
    uploader: String(item.uploader || "Gast").trim() || "Gast",
    timestamp: item.timestamp && !Number.isNaN(new Date(item.timestamp).getTime()) ? String(item.timestamp) : new Date().toISOString(),
    isDeleted: item.isDeleted === true,
    likes: Array.from(new Set((Array.isArray(item.likes) ? item.likes : []).map(String).filter(Boolean)))
  };

  if (!out.source) out.source = path ? "github" : "url";
  return out;
}

function mergeGalleryImage(existing, incoming) {
  return {
    ...incoming,
    ...existing,
    isDeleted: existing.isDeleted === true || incoming.isDeleted === true,
    likes: Array.from(new Set([...(existing.likes || []), ...(incoming.likes || [])].map(String).filter(Boolean))),
    deletedAt: existing.deletedAt || incoming.deletedAt,
    deletedBy: existing.deletedBy || incoming.deletedBy
  };
}

function galleryImageKey(img) {
  if (img.path) return "path:" + img.path;
  if (img.url) return "url:" + img.url;
  return "id:" + img.id;
}

function galleryImageIsPublic(img) {
  if (!img || img.isDeleted) return false;
  const t = new Date(img.timestamp || 0).getTime();
  if (t && Date.now() - t > 24 * 60 * 60 * 1000) return false;
  return true;
}

function galleryIdFromPath(path) {
  const filename = String(path || "").split("/").pop() || String(path || "");
  const base = filename.replace(/\.[^.]+$/, "");
  return "gh_" + (safePathSegment(base) || hashGalleryText(path));
}

function timestampFromGalleryPath(path) {
  const filename = String(path || "").split("/").pop() || "";
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-(\d{10,})-/);
  if (match) {
    const ms = Number(match[2]);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
    return `${match[1]}T00:00:00.000Z`;
  }
  return new Date().toISOString();
}

function uploaderFromGalleryPath(path) {
  const filename = String(path || "").split("/").pop() || "";
  const match = filename.match(/^\d{4}-\d{2}-\d{2}-\d{10,}-([a-z0-9_-]+)-/i);
  if (!match) return "Gast";
  return match[1].replace(/-/g, " ") || "Gast";
}

function hashGalleryText(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(String(text || ""));
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToUtf8(base64) {
  const binary = atob(String(base64 || "").replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function readGalleryManifest(owner, repo, token, branch) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${GALLERY_MANIFEST_PATH}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(apiUrl, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "winterthur-times-worker",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (res.status === 404) return { images: [], sha: null };
  if (!res.ok) throw new Error(`GitHub manifest read failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const parsed = data && data.content ? JSON.parse(base64ToUtf8(data.content)) : {};
  return {
    images: Array.isArray(parsed.images) ? parsed.images : [],
    sha: data.sha || null
  };
}

async function writeGalleryManifest(owner, repo, token, branch, images, sha) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${GALLERY_MANIFEST_PATH}`;
  const body = {
    message: "Update gallery manifest",
    content: utf8ToBase64(JSON.stringify({
      updatedAt: new Date().toISOString(),
      images: (Array.isArray(images) ? images : []).slice(0, 250)
    }, null, 2)),
    branch
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/vnd.github+json",
      "User-Agent": "winterthur-times-worker",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`GitHub manifest write failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function upsertGalleryManifestImage(owner, repo, token, branch, image) {
  const manifest = await readGalleryManifest(owner, repo, token, branch);
  const images = Array.isArray(manifest.images) ? manifest.images : [];
  const next = [image, ...images.filter(item => String(item && item.id) !== String(image.id) && String(item && item.url) !== String(image.url))];
  await writeGalleryManifest(owner, repo, token, branch, next, manifest.sha);
  return { ok: true, count: next.length };
}

function getGitHubRepoConfig(env) {
  let owner = String(env.GITHUB_OWNER || "").trim().replace(/^@/, "");
  let repo = String(env.GITHUB_REPO || "").trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .replace(/\.git$/i, "");

  if (repo.includes("/")) {
    const parts = repo.split("/").map(p => p.trim()).filter(Boolean);
    if (!owner && parts.length >= 2) owner = parts[0];
    repo = parts[parts.length - 1] || repo;
  }

  return { owner, repo };
}

async function getGitHubDefaultBranch(owner, repo, token) {
  if (!owner || !repo || !token) return "";

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "winterthur-times-worker",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (!res.ok) return "";
    const data = await res.json();
    return String(data.default_branch || "").trim();
  } catch (_) {
    return "";
  }
}

function safePathSegment(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
