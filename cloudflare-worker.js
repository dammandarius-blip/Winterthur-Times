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
// ADMIN PASSWORT (HIER ANPASSEN!)
// -----------------------------------------
const ADMIN_PASSWORD = "LOL";

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

      return new Response(JSON.stringify({ messages }), {
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
    // SUPPORT-CHAT ROUTE
    // -----------------------------
    if (path === "/api/chat" && request.method === "POST") {
      return handleSupportChat(request, env, corsHeaders);
    }


    // ------------------------------------------------------
    // ⭐ ADMIN: MANUELLE ANTWORT IN CHAT SPEICHERN
    // ------------------------------------------------------
    if (path === "/api/admin/send" && request.method === "POST") {
      const body = await request.json();

      if (body.password !== ADMIN_PASSWORD) {
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
    // ⭐ ADMIN: ALLE CHATS LADEN
    // ------------------------------------------------------
    if (path === "/api/admin/chats" && request.method === "POST") {
      const body = await request.json();

      if (body.password !== ADMIN_PASSWORD) {
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
        chats[userId] = normalizeMessages(data || []);
      }

      return new Response(JSON.stringify({ chats }), {
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

function getChatKey(userId) {
  return `chat_${String(userId || "guest")}`;
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

    if (message.trim()) {
      await appendChatMessage(env, userId, {
        role: "user",
        sender: "user",
        content: message,
        text: message
      });
    }

    const systemPrompt = `
Du bist der freundliche, professionelle AI-Support-Assistent der 'Winterthur Times', einer modernen Online-Zeitungsplattform. Dein Ziel ist es, Nutzern bei technischen oder inhaltlichen Fragen zur Website zu helfen.

DEINE AUFGABEN:
- Unterstützung bei Funktionen: Artikel lesen, Kommentare, Likes, Profilverwaltung, Login, Tagesbilder.
- Problemlösung: Hilfe bei Login-Fehlern, Kommentar-Problemen, Bild-Uploads, Button suche etc.
- Erkläre die Funktionen der Plattform einfach, verständlich und lösungsorientiert.

KERNREGELN (STRIKT EINHALTEN):
1. Fokus: Du bist KEIN allgemeiner Chatbot. Beantworte AUSSCHLIESSLICH Fragen zu den Features dieser Website. Erfinde keine Funktionen, die nicht existieren.
2. Sicherheit: Gib NIEMALS externe Links heraus.
3. Transparenz-Hinweis: Weise den Benutzer bei seiner ersten Nachricht freundlich darauf hin, dass Admins den Chatverlauf lesen können.
4. Lösungsansatz: Gib klare Schritt-für-Schritt-Anleitungen. Lieber ein nützliches Detail zu viel als zu wenig. Stelle gezielte Rückfragen bei Unklarheiten. Wenn etwas nicht möglich ist, erkläre kurz warum.
5. Antworte IMMER so KURZ wie möglich, ohne wichtige Infos wegzulassen.

KOMMUNIKATIONSSTIL & TON:
- Professionell, locker, freundlich und ruhig.
- Kein Fachjargon und keine Emojis verwenden.
- Gäste: maximal 60 Wörter.
- Eingeloggte Nutzer: maximal 100 Wörter.
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
      raw: data
    }), { headers: corsHeaders });

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