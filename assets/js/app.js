
function getTopThreeMostReadArticles(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
        .slice()
        .sort((a, b) => ((Array.isArray(b.views) ? b.views.length : 0) - (Array.isArray(a.views) ? a.views.length : 0)))
        .filter(article => {
            const titleKey = String(article && article.title ? article.title : "").trim().toLowerCase().replace(/\s+/g, " ");
            const key = titleKey || String(article && article.id ? article.id : "");
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 3);
}

// --- GATEKEEPER KONFIGURATION ---
const ENABLE_STUDENT_GATEKEEPER = false;
let hasPassedGatekeeper = !ENABLE_STUDENT_GATEKEEPER;

// =======================================================================
// EXTERNE KONFIGURATION
// =======================================================================
// Keine API-/Secret-Keys mehr direkt im GitHub-Code.
// Firebase-Konfiguration wird vom Cloudflare Worker geladen:
//   GET `${WT_WORKER_BASE}/api/public-config`
//
// Diese Worker-URL ist keine geheime Information. Alle echten Werte liegen
// als Cloudflare Worker Variables/Secrets.
const WT_WORKER_BASE = "https://askai.mikestaub705.workers.dev";
const WT_ABOUT_TEXT_URLS = [
    `${WT_WORKER_BASE}/api/about-us`,
    "https://raw.githubusercontent.com/dammandarius-blip/Winterthur-Times/main/about-us.txt",
    "./about-us.txt"
];
let myFirebaseConfig = null;
let wtPublicConfigPromise = null;

const WT_GALLERY_INLINE_LIMIT_BYTES = 700 * 1024;
let wtSystemNotice = null;

function wtEscapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function wtPlainTextToHtml(value) {
    return `<span style="white-space:pre-line">${wtEscapeHtml(value)}</span>`;
}

function wtSafeExternalUrl(value) {
    try {
        const url = new URL(String(value || ""), window.location.href);
        if (!["http:", "https:", "mailto:"].includes(url.protocol)) return "#";
        return url.href;
    } catch (_) {
        return "#";
    }
}

function setSystemNotice(type, title, message) {
    wtSystemNotice = { type: type || "warning", title: title || "Hinweis", message: message || "" };
    try {
        if (document.getElementById("app") && typeof renderApp === "function") renderApp();
    } catch (_) {}
}

function clearSystemNotice() {
    wtSystemNotice = null;
}

async function loadPublicConfigFromWorker() {
    if (wtPublicConfigPromise) return wtPublicConfigPromise;

    wtPublicConfigPromise = (async () => {
        try {
            const res = await fetch(`${WT_WORKER_BASE}/api/public-config`, {
                method: "GET",
                cache: "no-store"
            });

            if (!res.ok) {
                throw new Error(`Worker Config HTTP ${res.status}`);
            }

            const data = await res.json();
            if (data && data.firebase) {
                myFirebaseConfig = data.firebase;
            }

            if (data && data.workerBase) {
                window.WT_WORKER_BASE_FROM_CONFIG = data.workerBase;
            }

            const missing = Array.isArray(data && data.missing) ? data.missing : [];
            if (missing.length > 0 || !data || data.ok !== true) {
                setSystemNotice(
                    "warning",
                    "Datenverbindung eingeschraenkt",
                    "Der Cloudflare Worker ist erreichbar, aber es fehlen noch Einstellungen. Login, Rollen oder globale Speicherung koennen eingeschraenkt sein."
                );
            } else {
                clearSystemNotice();
            }

            return data || {};
        } catch (err) {
            console.error("Cloudflare Worker Konfiguration konnte nicht geladen werden:", err);
            myFirebaseConfig = null;
            setSystemNotice(
                "error",
                "Datenverbindung nicht bereit",
                "Der Cloudflare Worker ist nicht erreichbar oder noch nicht deployed. Die Seite bleibt sichtbar, aber Login, Rollen und globale Speicherung koennen eingeschraenkt sein."
            );
            return {};
        }
    })();

    return wtPublicConfigPromise;
}

window.saveState = async function() {
    // Dies ist ein Platzhalter. Er wird überschrieben, sobald Firebase bereit ist.
};

// --- DATEN ---
let initialArticles = [
    
];

let authors = [
    { id: 1, name: "Redaktion", bio: "Das gemeinsame Redaktionsteam der Winterthur Times.", imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&fit=crop" }
];

let communityImages = [

];

let siteFeedbacks = [
    { id: 1, username: "Darius Damman", text: "Hallo zusammen! Wir freuen uns über euer Feedback und eure Verbesserungsvorschläge.", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), likes: [], moderationStatus: 'approved' }
];

let view = 'home';
let articles = JSON.parse(JSON.stringify(initialArticles));
window.articles = articles;
let selectedArticleId = null;
let isSuperAdmin = false; 
let adminTab = 'articles'; 
let adminSelectedUser = null; 
let currentModal = null; 
let editingArticleId = null; 
let editingAuthorId = null;

let isMenuOpen = false;
let isSearchOpen = false;
let searchQuery = "";
let searchCategory = null; 
let pendingChatOpen = false; 
let pendingView = null;

let categories = ["Politik", "Wirtschaft", "Gesellschaft", "Kultur", "Sport", "Lokales", "Wissenschaft", "Technologie", "Unterhaltung", "Panorama", "Spiele"];
window.categories = categories;

let currentUser = null;
let sessionId = Math.random().toString(36).substring(2, 10);
let supportUser = 'Gast-' + sessionId; 

let registeredUsers = []; 
window.registeredUsers = registeredUsers;

let isSupportChatOpen = false;
let supportChats = []; 
let adminSelectedChatId = null;

let isFirebaseConnected = false;

// --- GEMEINSAME DATEN (Firebase) ---
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;
let firebaseStorage = null;
let isApplyingRemoteState = false;
let saveDebounceHandle = null;
let pendingRemoteRender = false;
let authModalDraft = null;
let pendingAuthIdentifier = "";

function wtIsEditorProtectingLocalWork() {
    try {
        return typeof window.wtIsAdvancedArticleEditorBusy === "function" && window.wtIsAdvancedArticleEditorBusy();
    } catch (_) {
        return false;
    }
}

function wtShouldDeferRemoteRender() {
    const authModalOpen = currentModal && (currentModal.type === 'login' || currentModal.type === 'register');
    const adminSupportBusy = (() => {
        try {
            return typeof window.wtIsAdminSupportBusy === "function" && window.wtIsAdminSupportBusy();
        } catch (_) {
            return false;
        }
    })();
    return isMenuOpen || authModalOpen || wtIsEditorProtectingLocalWork() || adminSupportBusy;
}

function requestRemoteRender() {
    if (wtShouldDeferRemoteRender()) {
        pendingRemoteRender = true;
        return;
    }
    pendingRemoteRender = false;
    renderApp();
}

window.wtFlushDeferredRemoteRender = function() {
    if (!pendingRemoteRender || wtShouldDeferRemoteRender()) return false;
    pendingRemoteRender = false;
    renderApp();
    return true;
};

function ensureUserSubscriptions(user) {
    if (!user || typeof user !== 'object') return user;
    if (!user.subscriptions || typeof user.subscriptions !== 'object') user.subscriptions = {};
    if (!Array.isArray(user.subscriptions.categories)) user.subscriptions.categories = [];
    if (!Array.isArray(user.subscriptions.authors)) user.subscriptions.authors = [];
    if (typeof user.emailNotifyEnabled !== 'boolean') user.emailNotifyEnabled = true;
    return user;
}

function ensureAllUsersSubscriptions() {
    if (!Array.isArray(registeredUsers)) registeredUsers = [];
    registeredUsers = registeredUsers.map(u => ensureUserSubscriptions(u));
    window.registeredUsers = registeredUsers;
}

function getStableUserKey(user) {
    if (!user || typeof user !== 'object') return '';
    return String(user.uid || user.id || user.email || user.username || '').trim().toLowerCase();
}

function mergeRegisteredUsersWithoutAutoDelete(localUsers, remoteUsers) {
    const local = Array.isArray(localUsers) ? localUsers.filter(Boolean) : [];
    const remote = Array.isArray(remoteUsers) ? remoteUsers.filter(Boolean) : [];

    if (remote.length === 0 && local.length > 0) return local.map(user => ensureUserSubscriptions({ ...user }));

    const byKey = new Map();
    local.forEach(user => {
        const key = getStableUserKey(user);
        if (key) byKey.set(key, ensureUserSubscriptions({ ...user }));
    });

    remote.forEach(user => {
        const key = getStableUserKey(user);
        if (!key) return;
        const existing = byKey.get(key) || {};
        byKey.set(key, ensureUserSubscriptions({
            ...existing,
            ...user,
            subscriptions: {
                categories: Array.from(new Set([
                    ...((existing.subscriptions && existing.subscriptions.categories) || []),
                    ...((user.subscriptions && user.subscriptions.categories) || [])
                ].map(String).filter(Boolean))),
                authors: Array.from(new Set([
                    ...((existing.subscriptions && existing.subscriptions.authors) || []),
                    ...((user.subscriptions && user.subscriptions.authors) || [])
                ].map(String).filter(Boolean)))
            }
        }));
    });

    return Array.from(byKey.values());
}

function mergeCategoryListsWithoutLoss(...lists) {
    const out = [];
    const add = value => {
        const cat = String(value || '').trim();
        if (cat && !out.includes(cat)) out.push(cat);
    };

    lists.forEach(list => {
        if (Array.isArray(list)) list.forEach(add);
    });

    try {
        (Array.isArray(articles) ? articles : []).forEach(article => add(article && article.category));
    } catch (_) {}

    try {
        const backup = JSON.parse(localStorage.getItem("wt_categories_backup") || "[]");
        if (Array.isArray(backup)) backup.forEach(add);
    } catch (_) {}

    return out;
}

const WT_ARTICLE_BACKUP_KEY = "wt_articles_backup_final_v1";
const WT_ARTICLE_DELETED_KEY = "wt_articles_deleted_keys_final_v1";
let hasLoadedRemoteArticles = false;
let articleDeletedKeys = [];

function getStableArticleKey(article) {
    if (!article || typeof article !== "object") return "";
    if (article.id !== undefined && article.id !== null && String(article.id).trim() !== "") {
        return "id:" + String(article.id).trim();
    }
    const title = String(article.title || "").trim().toLowerCase().replace(/\s+/g, " ");
    return title ? "title:" + title : "";
}

function readArticleBackup() {
    try {
        const parsed = JSON.parse(localStorage.getItem(WT_ARTICLE_BACKUP_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function writeArticleBackup(list) {
    try {
        localStorage.setItem(WT_ARTICLE_BACKUP_KEY, JSON.stringify(Array.isArray(list) ? list : []));
        return true;
    } catch (err) {
        console.warn("Artikel-Backup konnte nicht lokal gespeichert werden:", err);
        return false;
    }
}

function readArticleDeletedKeys() {
    try {
        const parsed = JSON.parse(localStorage.getItem(WT_ARTICLE_DELETED_KEY) || "[]");
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch (_) {
        return [];
    }
}

function setArticleDeletedKeys(keys) {
    articleDeletedKeys = Array.from(new Set((Array.isArray(keys) ? keys : []).map(String).filter(Boolean)));
    try { localStorage.setItem(WT_ARTICLE_DELETED_KEY, JSON.stringify(articleDeletedKeys)); } catch (_) {}
    return articleDeletedKeys;
}

function getArticleDeletedKeys() {
    return setArticleDeletedKeys([...(articleDeletedKeys || []), ...readArticleDeletedKeys()]);
}

function mergeArticleListsWithoutLoss(remoteList, backupList, localList) {
    const deleted = new Set(getArticleDeletedKeys());
    const byKey = new Map();

    const add = (article, replace) => {
        if (!article || typeof article !== "object") return;
        const key = getStableArticleKey(article);
        if (!key || deleted.has(key)) return;
        if (replace || !byKey.has(key)) byKey.set(key, article);
    };

    (Array.isArray(remoteList) ? remoteList : []).forEach(article => add(article, false));
    (Array.isArray(backupList) ? backupList : []).forEach(article => add(article, false));
    (Array.isArray(localList) ? localList : []).forEach(article => add(article, true));

    return Array.from(byKey.values());
}

function applyArticleListSafely(nextArticles) {
    const merged = mergeArticleListsWithoutLoss([], readArticleBackup(), nextArticles);
    if (Array.isArray(articles)) articles.splice(0, articles.length, ...merged);
    else articles = merged;
    window.articles = articles;
    writeArticleBackup(articles);
    return articles;
}

window.wtBackupArticlesSafely = function(list) {
    return writeArticleBackup(Array.isArray(list) ? list : articles);
};

window.wtRememberArticleDeleted = function(article) {
    const key = getStableArticleKey(article);
    if (!key) return false;
    setArticleDeletedKeys([...getArticleDeletedKeys(), key]);
    const filteredBackup = readArticleBackup().filter(item => getStableArticleKey(item) !== key);
    writeArticleBackup(filteredBackup);
    return true;
};

window.wtPersistArticlesSafely = async function(candidateArticles) {
    let remoteArticles = [];
    let remoteDeletedKeys = [];

    if (typeof firebaseDb !== "undefined" && firebaseDb) {
        try {
            const snap = await firebaseDb.collection("data").doc("articles").get();
            const data = snap.exists ? (snap.data() || {}) : {};
            if (Array.isArray(data.articles)) remoteArticles = data.articles;
            if (Array.isArray(data.deletedArticleKeys)) remoteDeletedKeys = data.deletedArticleKeys;
        } catch (err) {
            console.warn("Aktuelle Firebase-Artikel konnten vor dem Speichern nicht geladen werden:", err);
        }
    }

    setArticleDeletedKeys([...getArticleDeletedKeys(), ...remoteDeletedKeys]);
    const local = Array.isArray(candidateArticles) ? candidateArticles : articles;
    const merged = mergeArticleListsWithoutLoss(remoteArticles, readArticleBackup(), local);
    applyArticleListSafely(merged);

    if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
        await firebaseDb.collection("data").doc("articles").set({
            articles: merged,
            deletedArticleKeys: getArticleDeletedKeys(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        hasLoadedRemoteArticles = true;
        return merged;
    }

    writeArticleBackup(merged);
    return merged;
};

function getAllAuthorNames() {
    const names = [];
    try {
        (getActiveAuthors() || []).forEach(a => { if (a && a.name) names.push(a.name); });
    } catch (_) {}
    try {
        (articles || []).forEach(a => { if (a && a.author) names.push(a.author); });
    } catch (_) {}
    return Array.from(new Set(names.map(n => (n || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'de'));
}

async function queueEmail(toEmail, subject, html, text) {
    if (!isFirebaseConnected || !firebaseDb) return false;
    if (!toEmail || !toEmail.includes('@')) return false;
    const cleanEmail = String(toEmail || "").trim().toLowerCase();
    const cleanSubject = String(subject || 'Neue Nachricht').slice(0, 180);
    console.log('Abo-Mail: queueEmail -> mail.add', { toEmail: cleanEmail, subject: cleanSubject });
    await firebaseDb.collection('mail').add({
        to: [cleanEmail],
        message: {
            subject: cleanSubject,
            html: html || '',
            text: text || ''
        },
        delivery: {
            state: "PENDING",
            source: "winterthur-times-web"
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
}

async function sendSubscriptionConfirmation(user, label, value) {
    if (!user || !user.email || !String(user.email).includes('@')) return false;
    const safeLabel = wtEscapeHtml(label || "Abo");
    const safeValue = wtEscapeHtml(value || "");
    const subject = `Winterthur Times: ${label || "Abo"} aktiviert`;
    const text = `Dein Winterthur Times Abo ist aktiv.\n\n${label}: ${value}\n\nDu erhaeltst E-Mails, sobald passende neue Artikel erscheinen.`;
    const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
            <h2 style="margin:0 0 10px 0;">Dein Abo ist aktiv</h2>
            <p style="margin:0 0 10px 0;">Du erhaeltst ab jetzt E-Mails fuer neue passende Artikel.</p>
            <p style="margin:0;"><strong>${safeLabel}:</strong> ${safeValue}</p>
        </div>
    `;
    return queueEmail(user.email, subject, html, text);
}

async function notifySubscribersOfArticle(article) {
    if (!article) return;
    if (!isFirebaseConnected || !firebaseDb) return;
    ensureAllUsersSubscriptions();

    const category = (article.category || '').trim();
    const author = (article.author || '').trim();
    const url = (location && location.href) ? location.href.split('#')[0] : '';
    const subject = `Neue News: ${article.title || 'Artikel'}`;

    const recipients = new Set();
    registeredUsers.forEach(u => {
        const user = ensureUserSubscriptions(u);
        if (!user || user.isDeleted || user.isBanned) return;
        if (!user.emailNotifyEnabled) return;
        const email = (user.email || '').trim();
        if (!email.includes('@')) return;
        const subCats = user.subscriptions.categories || [];
        const subAuthors = user.subscriptions.authors || [];
        if ((category && subCats.includes(category)) || (author && subAuthors.includes(author))) {
            recipients.add(email);
        }
    });

    if (recipients.size === 0) return;

    const safeTitle = (article.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeSummary = (article.summary || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const deepLink = url || '';
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5">
            <h2 style="margin:0 0 8px 0;">${safeTitle}</h2>
            <p style="margin:0 0 12px 0; color:#555;">${safeSummary}</p>
            <p style="margin:0 0 12px 0; color:#555;">
                <strong>Kategorie:</strong> ${category || '-'}<br/>
                <strong>Autor:</strong> ${author || '-'}
            </p>
            ${deepLink ? `<p style="margin:0 0 12px 0;"><a href="${deepLink}">Website öffnen</a></p>` : ''}
            <p style="margin:0 0 12px 0; color:#555;">In der App kannst du nach dem Titel suchen, um den Artikel zu finden.</p>
        </div>
    `;
    const text = `${article.title}\n\n${article.summary}\n\nKategorie: ${category}\nAutor: ${author}`;

    const emails = Array.from(recipients);
    for (let i = 0; i < emails.length; i++) {
        try {
            await queueEmail(emails[i], subject, html, text);
        } catch (e) {
            console.error('E-Mail Queue fehlgeschlagen:', emails[i], e);
        }
    }
}

function isFirebaseConfigured() {
    if (!myFirebaseConfig) return false;
    if (!myFirebaseConfig.apiKey || myFirebaseConfig.apiKey === "DEIN_API_KEY_HIER") return false;
    if (!myFirebaseConfig.projectId || myFirebaseConfig.projectId === "DEIN_PROJEKT_ID") return false;
    return true;
}

function sanitizeUsersForRemote(users) {
    return (users || []).map(u => ({
        username: u.username,
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email || "",
        bio: u.bio || "",
        profilePicUrl: u.profilePicUrl || "",
        showRealName: !!u.showRealName,
        isBanned: !!u.isBanned,
        isDeleted: !!u.isDeleted,
        role: u.role || "user",
        emailNotifyEnabled: typeof u.emailNotifyEnabled === 'boolean' ? u.emailNotifyEnabled : true,
        subscriptions: {
            categories: (u.subscriptions && Array.isArray(u.subscriptions.categories)) ? u.subscriptions.categories : [],
            authors: (u.subscriptions && Array.isArray(u.subscriptions.authors)) ? u.subscriptions.authors : []
        }
    }));
}

const WT_USER_ROLES_KEY = "wt_user_roles_by_identity_v3";

function normalizeUserRole(role) {
    const value = String(role || "user").trim().toLowerCase();
    return ["user", "author", "admin", "superadmin"].includes(value) ? value : "user";
}

function getUserRoleKeys(user) {
    if (!user) return [];
    return [
        user.username,
        user.email,
        user.uid,
        user.id,
        user.displayName,
        user.name
    ]
        .map(v => String(v || "").trim().toLowerCase())
        .filter(Boolean);
}

function applyRoleToUser(user, role) {
    if (!user) return false;
    const nextRole = normalizeUserRole(role);
    const changed = user.role !== nextRole ||
        !!user.isAdmin !== (nextRole === "admin" || nextRole === "superadmin") ||
        !!user.isSuperAdmin !== (nextRole === "superadmin");

    user.role = nextRole;
    user.isAdmin = nextRole === "admin" || nextRole === "superadmin";
    user.isSuperAdmin = nextRole === "superadmin";
    return changed;
}

function buildUserRolesMapFromUsers(users) {
    const map = {};
    (users || []).forEach(user => {
        const role = normalizeUserRole(user && user.role);
        getUserRoleKeys(user).forEach(key => {
            map[key] = {
                role,
                isAdmin: role === "admin" || role === "superadmin",
                isSuperAdmin: role === "superadmin"
            };
        });
    });
    return map;
}

function loadLocalUserRolesMap() {
    try {
        const parsed = JSON.parse(localStorage.getItem(WT_USER_ROLES_KEY) || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
        return {};
    }
}

function saveUserRoleLocally(user, role) {
    const map = loadLocalUserRolesMap();
    const normalizedRole = normalizeUserRole(role);
    const entry = {
        role: normalizedRole,
        isAdmin: normalizedRole === "admin" || normalizedRole === "superadmin",
        isSuperAdmin: normalizedRole === "superadmin",
        updatedAt: Date.now()
    };

    getUserRoleKeys(user).forEach(key => {
        map[key] = entry;
    });

    try {
        localStorage.setItem(WT_USER_ROLES_KEY, JSON.stringify(map));
    } catch (_) {}
    return map;
}

function applyUserRolesMapToUsers(users, rolesMap) {
    if (!Array.isArray(users) || !rolesMap || typeof rolesMap !== "object") return false;
    let changed = false;
    users.forEach(user => {
        const entry = getUserRoleKeys(user).map(key => rolesMap[key]).find(Boolean);
        if (!entry) return;
        const role = typeof entry === "string" ? entry : entry.role;
        if (role) changed = applyRoleToUser(user, role) || changed;
    });
    return changed;
}

function applySavedUserRolesToRegisteredUsers(remoteRolesMap) {
    const remoteChanged = applyUserRolesMapToUsers(registeredUsers, remoteRolesMap);
    const localChanged = applyUserRolesMapToUsers(registeredUsers, loadLocalUserRolesMap());
    return remoteChanged || localChanged;
}

window.wtRememberUserRoleLocally = saveUserRoleLocally;
window.wtApplySavedUserRolesToRegisteredUsers = applySavedUserRolesToRegisteredUsers;
window.wtBuildUserRolesMapFromUsers = buildUserRolesMapFromUsers;

function findRegisteredUserForAuth(authUser, preferredUsername = "") {
    const email = (authUser && authUser.email ? authUser.email : "").trim().toLowerCase();
    const displayName = (authUser && authUser.displayName ? authUser.displayName : "").trim();
    const preferred = String(preferredUsername || "").trim();
    const candidates = [displayName, preferred].filter(Boolean);

    return (registeredUsers || []).find(user => {
        if (!user) return false;
        if (email && String(user.email || "").trim().toLowerCase() === email) return true;
        return candidates.some(name => String(user.username || "").trim() === name);
    }) || null;
}

function getUniqueUsername(baseName) {
    let base = String(baseName || "Leser").trim();
    if (!base) base = "Leser";
    base = base.replace(/\s+/g, " ").slice(0, 48);

    const used = new Set((registeredUsers || []).map(user => String(user && user.username || "").trim()).filter(Boolean));
    if (!used.has(base)) return base;

    let index = 2;
    while (used.has(`${base} ${index}`)) index += 1;
    return `${base} ${index}`;
}

function buildProfileFromAuth(authUser, preferredUsername = "") {
    const email = (authUser && authUser.email ? authUser.email : "").trim();
    const displayName = (authUser && authUser.displayName ? authUser.displayName : "").trim();
    const preferred = String(preferredUsername || "").trim();
    const fallbackName = email ? email.split("@")[0] : "Leser";
    const username = getUniqueUsername(displayName || (!preferred.includes("@") ? preferred : "") || fallbackName);

    return {
        username,
        firstName: "",
        lastName: "",
        email,
        bio: "",
        profilePicUrl: "",
        showRealName: false,
        isBanned: false,
        isDeleted: false,
        role: "user",
        emailNotifyEnabled: true,
        subscriptions: { categories: [], authors: [] }
    };
}

async function saveUsersNow() {
    ensureAllUsersSubscriptions();
    if (isFirebaseConnected && firebaseDb && typeof firebase !== "undefined") {
        const sanitizedUsers = sanitizeUsersForRemote(registeredUsers);
        await firebaseDb.collection("data").doc("users").set({
            registeredUsers: sanitizedUsers,
            userRoles: buildUserRolesMapFromUsers(sanitizedUsers),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } else {
        window.saveState();
    }
}

window.saveUsersNow = saveUsersNow;

async function ensureAuthUserProfile(authUser, preferredUsername = "") {
    if (!authUser) return null;
    if (!Array.isArray(registeredUsers)) registeredUsers = [];

    let profile = findRegisteredUserForAuth(authUser, preferredUsername);
    if (!profile) {
        profile = buildProfileFromAuth(authUser, preferredUsername);
        registeredUsers.push(profile);
        try {
            await saveUsersNow();
        } catch (err) {
            console.error("Benutzerprofil konnte nicht sofort gespeichert werden:", err);
            window.saveState();
        }
    } else {
        const email = (authUser.email || "").trim();
        if (email && !profile.email) {
            profile.email = email;
            try { await saveUsersNow(); } catch (_) { window.saveState(); }
        }
    }

    ensureUserSubscriptions(profile);
    applySavedUserRolesToRegisteredUsers();
    return profile;
}

async function seedDocIfMissing(docRef, seedData) {
    const snap = await docRef.get();
    if (!snap.exists) {
        await docRef.set(seedData);
    }
}

async function persistRemoteState() {
    if (!isFirebaseConnected || !firebaseDb) return;
    if (isApplyingRemoteState) return;

    // --- AUTO-UNHIDE CHATS ---
    supportChats.forEach(chat => {
        if (chat.adminDeleted && chat.messages.length > 0) {
            const lastMsg = chat.messages[chat.messages.length - 1];
            if (lastMsg.sender === 'user') {
                chat.adminDeleted = false;
            }
        }
    });

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const dataCol = firebaseDb.collection('data');

    const batch = firebaseDb.batch();
    if (hasLoadedRemoteArticles || (Array.isArray(articles) && articles.length > 0)) {
        const protectedArticles = mergeArticleListsWithoutLoss([], readArticleBackup(), articles);
        applyArticleListSafely(protectedArticles);
        batch.set(dataCol.doc('articles'), {
            articles: protectedArticles,
            deletedArticleKeys: getArticleDeletedKeys(),
            authors: authors,
            categories: categories,
            communityImages: communityImages,
            siteFeedbacks: siteFeedbacks,
            updatedAt: now
        }, { merge: true });
    }
    batch.set(dataCol.doc('chats'), { supportChats: supportChats, updatedAt: now }, { merge: true });
    const sanitizedUsers = sanitizeUsersForRemote(registeredUsers);
    batch.set(dataCol.doc('users'), {
        registeredUsers: sanitizedUsers,
        userRoles: buildUserRolesMapFromUsers(sanitizedUsers),
        updatedAt: now
    }, { merge: true });

    await batch.commit();
}

function scheduleRemoteSave() {
    if (!isFirebaseConnected) return;
    if (isApplyingRemoteState) return;
    if (saveDebounceHandle) clearTimeout(saveDebounceHandle);
    saveDebounceHandle = setTimeout(() => {
        persistRemoteState().catch(err => console.error('Firebase Save fehlgeschlagen:', err));
    }, 700);
}

async function initFirebase() {
    await loadPublicConfigFromWorker();
    if (!isFirebaseConfigured()) {
        setSystemNotice(
            "error",
            "Firebase noch nicht verbunden",
            "Die oeffentliche Worker-Konfiguration liefert keine vollstaendige Firebase-Konfiguration. Bitte Worker-Variablen pruefen und den Worker deployen."
        );
    }
    if (!isFirebaseConfigured()) {
        console.warn("Firebase ist nicht konfiguriert. Prüfe /api/public-config im Cloudflare Worker.");
        return;
    }
    if (!window.firebase) {
        setSystemNotice(
            "error",
            "Firebase-Skript blockiert",
            "Ein externes Firebase-Skript konnte nicht geladen werden. Bitte Internetverbindung, Adblocker oder Browser-Schutz pruefen."
        );
        return;
    }

    try {
        firebaseApp = firebase.initializeApp(myFirebaseConfig);
        firebaseDb = firebase.firestore();
        firebaseAuth = firebase.auth();
        try { firebaseStorage = firebase.storage(); } catch (e) { firebaseStorage = null; }
        isFirebaseConnected = true;
        clearSystemNotice();

        window.saveState = scheduleRemoteSave;

        const dataCol = firebaseDb.collection('data');
        const articlesDoc = dataCol.doc('articles');
        const chatsDoc = dataCol.doc('chats');
        const usersDoc = dataCol.doc('users');

        await seedDocIfMissing(articlesDoc, {
            articles: articles, authors: authors, categories: categories,
            communityImages: communityImages, siteFeedbacks: siteFeedbacks,
            deletedArticleKeys: getArticleDeletedKeys(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await seedDocIfMissing(chatsDoc, { supportChats: supportChats, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        const initialUsersForRemote = sanitizeUsersForRemote(registeredUsers);
        await seedDocIfMissing(usersDoc, {
            registeredUsers: initialUsersForRemote,
            userRoles: buildUserRolesMapFromUsers(initialUsersForRemote),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        articlesDoc.onSnapshot({ includeMetadataChanges: true }, (snap) => {
            if (!snap.exists || (snap.metadata && snap.metadata.hasPendingWrites)) return;
            const data = snap.data() || {};
            let shouldRepairRemoteArticles = false;
            let protectedArticles = null;
            isApplyingRemoteState = true;
            try {
                if (Array.isArray(data.deletedArticleKeys)) {
                    setArticleDeletedKeys([...getArticleDeletedKeys(), ...data.deletedArticleKeys]);
                }
                const remoteArticles = Array.isArray(data.articles) ? data.articles : [];
                protectedArticles = mergeArticleListsWithoutLoss(remoteArticles, readArticleBackup(), articles);
                const visibleRemoteKeys = new Set(remoteArticles.map(getStableArticleKey).filter(Boolean));
                shouldRepairRemoteArticles = protectedArticles.some(article => !visibleRemoteKeys.has(getStableArticleKey(article)));
                applyArticleListSafely(protectedArticles);
                hasLoadedRemoteArticles = true;
                if (Array.isArray(data.authors)) authors = data.authors;
                if (Array.isArray(data.categories)) {
                    categories = mergeCategoryListsWithoutLoss(categories, window.categories, data.categories);
                    window.categories = categories;
                    try { localStorage.setItem("wt_categories_backup", JSON.stringify(categories)); } catch (_) {}
                }
                if (Array.isArray(data.communityImages)) communityImages = data.communityImages;
                if (Array.isArray(data.siteFeedbacks)) siteFeedbacks = data.siteFeedbacks;
            } finally {
                isApplyingRemoteState = false;
            }
            if (shouldRepairRemoteArticles && protectedArticles) {
                firebaseDb.collection("data").doc("articles").set({
                    articles: protectedArticles,
                    deletedArticleKeys: getArticleDeletedKeys(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).catch(err => console.warn("Fehlende Artikel konnten nicht automatisch wiederhergestellt werden:", err));
            }
            const authUser = firebaseAuth && firebaseAuth.currentUser ? firebaseAuth.currentUser : null;
            if (authUser) {
                ensureAuthUserProfile(authUser, pendingAuthIdentifier).finally(() => requestRemoteRender());
            } else {
                requestRemoteRender();
            }
        });

        chatsDoc.onSnapshot({ includeMetadataChanges: true }, (snap) => {
            if (!snap.exists || (snap.metadata && snap.metadata.hasPendingWrites)) return;
            const data = snap.data() || {};
            isApplyingRemoteState = true;
            try {
                if (Array.isArray(data.supportChats)) supportChats = data.supportChats;
            } finally {
                isApplyingRemoteState = false;
            }
            requestRemoteRender();
        });

        usersDoc.onSnapshot({ includeMetadataChanges: true }, (snap) => {
            if (!snap.exists || (snap.metadata && snap.metadata.hasPendingWrites)) return;
            const data = snap.data() || {};
            isApplyingRemoteState = true;
            try {
                if (Array.isArray(data.registeredUsers)) {
                    const beforeCount = Array.isArray(registeredUsers) ? registeredUsers.length : 0;
                    registeredUsers = mergeRegisteredUsersWithoutAutoDelete(registeredUsers, data.registeredUsers);
                    window.registeredUsers = registeredUsers;
                    ensureAllUsersSubscriptions();
                    applySavedUserRolesToRegisteredUsers(data.userRoles || null);
                    if (data.registeredUsers.length < beforeCount) {
                        saveUsersNow().catch(err => console.warn("Benutzerliste wurde gegen automatisches Loeschen geschuetzt, Rueckspeichern fehlgeschlagen:", err));
                    }
                }
            } finally {
                isApplyingRemoteState = false;
            }
            const authUser = firebaseAuth && firebaseAuth.currentUser ? firebaseAuth.currentUser : null;
            if (authUser) {
                ensureAuthUserProfile(authUser, pendingAuthIdentifier).finally(() => requestRemoteRender());
            } else {
                requestRemoteRender();
            }
        });

        firebaseAuth.onAuthStateChanged(async (user) => {
            if (!user) {
                pendingAuthIdentifier = "";
                currentUser = null;
                supportUser = 'Gast-' + sessionId;
                renderApp();
                return;
            }

            const profile = await ensureAuthUserProfile(user, pendingAuthIdentifier);
            const name = profile && profile.username
                ? profile.username
                : ((user.displayName && user.displayName.trim() !== '') ? user.displayName.trim() : (user.email || 'User'));
            currentUser = name;
            supportUser = name;

            if (profile && (profile.isBanned || profile.isDeleted)) {
                const msg = profile.isDeleted
                    ? "Dein Account wurde gelöscht. Bitte wende dich an den Support."
                    : "Dein Account wurde gesperrt. Bitte wende dich an den Support.";
                showModal('Zugriff verweigert', msg);
                firebaseAuth.signOut().catch(() => {});
                return;
            }

            if (pendingChatOpen) { isSupportChatOpen = true; pendingChatOpen = false; }
            if (pendingView) { setView(pendingView); pendingView = null; } 
            else { renderApp(); }
        });
    } catch (err) {
        console.error('Firebase Init fehlgeschlagen:', err);
        isFirebaseConnected = false;
    }
}

async function uploadProfilePicToStorage(file, username) {
    if (!isFirebaseConnected || !firebaseStorage) throw new Error('Firebase Storage nicht verfügbar');
    if (!file) throw new Error('Keine Datei');
    const safeName = (username || 'user').toString().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    const ext = file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `profile_pics/${safeName}_${Date.now()}.${ext}`;
    const ref = firebaseStorage.ref().child(path);
    const snap = await ref.put(file, { contentType: file.type || 'image/jpeg' });
    return await snap.ref.getDownloadURL();
}

async function resizeImageFile(file, opts) {
    const options = opts || {};
    const maxSize = typeof options.maxSize === 'number' ? options.maxSize : 512;
    const quality = typeof options.quality === 'number' ? options.quality : 0.82;
    const preferWebp = options.preferWebp !== false;

    if (!file || !file.type || !file.type.startsWith('image/')) return { blob: file, dataUrl: null, mimeType: file ? file.type : 'application/octet-stream' };

    const img = await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
        image.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        image.src = url;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return { blob: file, dataUrl: null, mimeType: file.type };

    const scale = Math.min(1, maxSize / Math.max(w, h));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, outW, outH);

    const canWebp = preferWebp && canvas.toDataURL('image/webp').startsWith('data:image/webp');
    const mimeType = canWebp ? 'image/webp' : 'image/jpeg';

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
    const finalBlob = blob || file;
    let dataUrl = null;
    try { dataUrl = canvas.toDataURL(mimeType, quality); } catch (_) {}

    return { blob: finalBlob, dataUrl, mimeType };
}

// --- 3D LOGO INTEGRATION (THREE.JS) ---
let logoRenderer, logoScene, logoCamera, logoInteractiveGroup, logoGroup;
let targetRotationX = 0;

function init3DLogo() {
    if (logoRenderer) return;
    if (!window.THREE) return;
    try {
        logoScene = new THREE.Scene();
        logoCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        logoCamera.position.z = 6.5;

        logoRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        logoRenderer.setSize(128, 128);
        logoRenderer.setPixelRatio(window.devicePixelRatio || 1);
        logoRenderer.domElement.style.width = '100%';
        logoRenderer.domElement.style.height = '100%';
        logoRenderer.domElement.style.objectFit = 'contain';

        logoGroup = new THREE.Group();
        logoInteractiveGroup = new THREE.Group();
        logoInteractiveGroup.add(logoGroup);
        logoScene.add(logoInteractiveGroup);

        const radius = 2;
        const polyGeometry = new THREE.IcosahedronGeometry(radius, 2);
        const edges = new THREE.EdgesGeometry(polyGeometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xb0b0b0, linewidth: 1, transparent: true, opacity: 0.4 });
        const polygonSphere = new THREE.LineSegments(edges, lineMaterial);
        logoGroup.add(polygonSphere);

        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 110px "Times New Roman", Times, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('WINTERTHUR TIMES', canvas.width / 2, canvas.height / 2);
        }

        const textTexture = new THREE.CanvasTexture(canvas);
        textTexture.anisotropy = logoRenderer.capabilities.getMaxAnisotropy();
        const textGeometry = new THREE.SphereGeometry(radius * 1.01, 64, 64);
        const textMaterial = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
        const textSphere = new THREE.Mesh(textGeometry, textMaterial);
        logoGroup.add(textSphere);

        logoGroup.rotation.z = 23.5 * Math.PI / 180;

        document.addEventListener('mousemove', (event) => {
            const windowHalfY = window.innerHeight / 2;
            targetRotationX = (event.clientY - windowHalfY) * 0.001;
        });

        animateLogo();
    } catch (e) {
        console.warn('3D Logo konnte nicht initialisiert werden (WebGL/Three.js).', e);
        try {
            if (logoRenderer && typeof logoRenderer.dispose === 'function') logoRenderer.dispose();
        } catch (_) {}
        logoRenderer = null;
        logoScene = null;
        logoCamera = null;
        logoInteractiveGroup = null;
        logoGroup = null;
    }
}

function animateLogo() {
    if (!logoRenderer || !logoScene || !logoCamera || !logoGroup || !logoInteractiveGroup) return;
    requestAnimationFrame(animateLogo);
    logoGroup.rotateY(-0.0025); 
    logoInteractiveGroup.rotation.x += (targetRotationX - logoInteractiveGroup.rotation.x) * 0.05;
    logoRenderer.render(logoScene, logoCamera);
}

// --- HILFSFUNKTIONEN ---
function getFallbackImage(category) {
    const fallbacks = {
        "Politik": "https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "Wirtschaft": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "Gesellschaft": "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "Kultur": "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "Sport": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "Lokales": "https://images.unsplash.com/photo-1513622470522-26c31168cb21?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "Wissenschaft": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "Unterhaltung": "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
    };
    return fallbacks[category] || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"; 
}

function getCurrentUserRole() {
    if (!currentUser) return 'guest';
    const user = registeredUsers.find(u => u.username === currentUser);
    return user ? (user.role || 'user') : 'guest';
}

function hasAdminAccess() {
    return isSuperAdmin || getCurrentUserRole() === 'admin';
}

function hasAuthorAccess() {
    const role = getCurrentUserRole();
    return isSuperAdmin || role === 'admin' || role === 'author';
}

function getUserDetails(username) {
    return registeredUsers.find(u => u.username === username) || null;
}

function getDisplayName(username) {
    const user = getUserDetails(username);
    if (user && user.showRealName && (user.firstName || user.lastName)) {
        return `${user.firstName} ${user.lastName}`.trim();
    }
    return username;
}

function getStandardAvatarSvg(className = '', style = 'width: 60%; height: 60%; margin-top: 20%;') {
    return `<svg class="${className}" style="${style}" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
}

function getStandardAvatarHtml(sizeClasses = 'w-8 h-8', iconSize = '') {
    return `<div class="${sizeClasses} shrink-0 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 overflow-hidden shadow-inner border border-gray-300">${getStandardAvatarSvg(iconSize)}</div>`;
}

function getUserAvatar(username, sizeClasses = 'w-8 h-8', iconSize = 'w-4 h-4', clickable = false) {
    const user = getUserDetails(username);
    let clickAttr = '';
    let cursorClass = '';
    
    if (clickable && user && user.profilePicUrl && user.profilePicUrl.trim() !== '') {
        clickAttr = `onclick="showImageModal('${user.profilePicUrl}')"`;
        cursorClass = 'cursor-pointer hover:opacity-80 transition-opacity';
    }

    const defaultAvatar = getStandardAvatarHtml(sizeClasses, iconSize);

    if (user && user.profilePicUrl && user.profilePicUrl.trim() !== '') {
        const safeAvatarHtml = defaultAvatar.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<img src="${user.profilePicUrl}" alt="Avatar" class="${sizeClasses} ${cursorClass} rounded-full object-cover border border-gray-200 shadow-sm shrink-0" ${clickAttr} onerror="this.outerHTML='${safeAvatarHtml}'" />`;
    }
    return defaultAvatar;
}

function getActiveAuthors() {
    let combined = JSON.parse(JSON.stringify(authors)); 
    registeredUsers.forEach(u => {
        if ((u.role === 'admin' || u.role === 'author') && !u.isDeleted && !u.isBanned) {
            const dName = getDisplayName(u.username);
            const existing = combined.find(a => a.name === dName);
            if (existing) {
                existing.bio = u.bio || existing.bio;
                if (u.profilePicUrl) existing.imageUrl = u.profilePicUrl;
                existing.id = 'usr_' + u.username;
            } else {
                combined.push({
                    id: 'usr_' + u.username,
                    name: dName,
                    bio: u.bio || 'Redaktionsmitglied der Winterthur Times.',
                    imageUrl: u.profilePicUrl || ''
                });
            }
        }
    });
    return combined;
}

let currentWeather = { temp: "Lädt...", icon: "cloud", city: "Winterthur" };

function getTimeAgo(dateString) {
    if (!dateString) return "Vor einiger Zeit";
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (isNaN(seconds)) return "Vor einiger Zeit"; 
    if (seconds < 60) return "Gerade eben";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Gestern";
    return `Vor ${days} Tagen`;
}

async function fetchWeather() {
    try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=47.50&longitude=8.73&current_weather=true");
        const data = await res.json();
        const temp = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;
        
        let icon = "cloud";
        if (code === 0) icon = "sun";
        else if (code === 1 || code === 2) icon = "cloud-sun";
        else if (code === 3) icon = "cloud";
        else if (code >= 45 && code <= 48) icon = "align-center"; 
        else if (code >= 51 && code <= 67) icon = "cloud-rain";
        else if (code >= 71 && code <= 77) icon = "cloud-snow";
        else if (code >= 80 && code <= 82) icon = "cloud-rain";
        else if (code >= 95) icon = "cloud-lightning";

        currentWeather = { temp: `${temp}°C`, icon: icon, city: "Winterthur" };
        renderApp(); 
    } catch (e) {
        console.error("Wetter konnte nicht geladen werden", e);
        currentWeather = { temp: "--°C", icon: "cloud-off", city: "Offline" };
        renderApp();
    }
}

setInterval(() => {
    document.querySelectorAll('.time-ago-display').forEach(el => {
        const ts = el.getAttribute('data-timestamp');
        if (ts) el.textContent = getTimeAgo(ts);
    });
}, 60000);

// --- KI-HELFER ---

window.checkContentWithAi = async function(text, type, id, parentId) {
    finalizeModeration(type, id, parentId, 'approved');
};

window.getPopularArticles = function() {
    const items = document.querySelectorAll(".meistgelesen-item");
    return Array.from(items).map(el => el.textContent.trim());
};

window.toggleChatAi = function(chatId) {
    const activeChatUser = currentUser || supportUser || ('Gast-' + sessionId);
    let chat = supportChats.find(c => c.id == chatId) || supportChats.find(c => c.userId === activeChatUser);
    if (!chat) {
        chat = { id: Date.now(), userId: activeChatUser, messages: [], aiEnabled: true };
        supportChats.push(chat);
    }
    chat.aiEnabled = chat.aiEnabled === false ? true : false;
    window.saveState();
    renderApp();
};

// --- RENDER FUNKTIONEN ---
function renderTopBar() {
    const role = getCurrentUserRole();
    let dashboardIcon = hasAdminAccess() ? 'shield' : 'pen-tool';
    let dashboardLabel = hasAdminAccess() ? 'Admin' : 'Redaktion';

    return `
    <div class="bg-black text-white text-xs py-2 px-3 sm:px-4 font-sans tracking-wide flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="flex items-center gap-3">
            <span onclick="setView('gallery'); window.scrollTo(0,0);" class="cursor-pointer text-green-400 font-bold hover:text-green-300 transition-colors flex items-center gap-1">
                <i data-lucide="camera" class="w-3 h-3"></i> Tagesbilder
            </span>
            ${hasAuthorAccess() ? `
                <span onclick="adminTab='articles'; setView('admin-dashboard')" class="cursor-pointer text-blue-400 font-bold hover:text-blue-300 flex items-center gap-1">
                    <i data-lucide="${dashboardIcon}" class="w-3 h-3"></i> ${dashboardLabel}
                </span>
            ` : ''}
        </div>

        <div class="flex items-center gap-3 ml-auto">
            ${currentUser ? `
                <span class="cursor-pointer font-bold text-gray-300 hover:text-white transition-colors flex items-center gap-1" onclick="setView('profile')" title="Zum Profil">
                    <i data-lucide="user" class="w-3 h-3"></i>
                    <span class="hidden sm:inline">${getDisplayName(currentUser)} ${role !== 'user' ? `(${role})` : ''}</span>
                    <span class="sm:hidden">Profil</span>
                </span>
                <span class="cursor-pointer hover:text-white transition-colors" onclick="handleUserLogout()">Abmelden</span>
            ` : `
                <span class="cursor-pointer hover:text-gray-300 transition-colors flex items-center gap-1" onclick="showUserLogin()">
                    <i data-lucide="user" class="w-3 h-3"></i> Login
                </span>
            `}
        </div>
    </div>`;
}

function renderHeader() {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const currentDate = new Date().toLocaleDateString('de-DE', dateOptions);

    return `
    <header class="border-b border-gray-300 sticky top-0 bg-[#fcfbf9] z-40">
        <div class="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-4 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4">
            <div class="flex items-center gap-2 sm:gap-4 min-w-0">
                <div id="header-3d-logo" class="w-12 h-12 sm:w-16 sm:h-16 shrink-0 cursor-pointer hover:scale-105 transition-transform" onclick="setView('home')" title="Zur Startseite">
                    <img src="./assets/brand/winterthur-times-logo.svg" alt="Winterthur Times Logo" class="wt-brand-logo" loading="eager" />
                </div>
                <button onclick="toggleMenu()" class="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                    <i data-lucide="menu"></i>
                </button>
                <button onclick="toggleSearch()" class="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Suchen">
                    <i data-lucide="search"></i>
                </button>
            </div>
            <div class="min-w-0 text-center">
                <h1 onclick="setView('home')" class="text-2xl sm:text-4xl md:text-6xl font-black tracking-normal uppercase font-serif cursor-pointer hover:text-blue-900 transition-colors leading-none">
                    Winterthur Times
                </h1>
                <p class="wt-header-slogan">UNABH&Auml;NGIG. REGIONAL. AKTUELL.</p>
            </div>
            <div class="flex justify-end items-center gap-4 text-sm font-sans text-gray-600 min-w-0">
                <div class="hidden md:flex flex-col items-end">
                    <span class="font-semibold text-gray-900">${currentDate}</span>
                    <div class="flex items-center gap-1" title="Aktuelles Wetter">
                        <i data-lucide="${currentWeather.icon}" class="w-4 h-4"></i>
                        <span>${currentWeather.city}, ${currentWeather.temp}</span>
                    </div>
                </div>
            </div>
        </div>
        ${isSearchOpen ? `
        <div class="bg-gray-100 border-t border-gray-300 px-4 py-3 flex justify-center animate-fade-in shadow-inner">
            <div class="max-w-2xl w-full flex relative flex-col sm:flex-row">
                <input type="text" id="searchInput" value="${searchQuery}" onkeypress="handleSearch(event)" placeholder="Nach Artikeln, Stichworten suchen..." class="w-full px-4 py-2 border border-gray-300 rounded-t sm:rounded-l sm:rounded-r-none focus:outline-none focus:border-blue-500 font-sans shadow-sm" />
                <button onclick="executeSearch()" class="bg-blue-900 text-white px-6 py-2 rounded-b sm:rounded-r sm:rounded-l-none font-bold hover:bg-blue-800 transition-colors shadow-sm cursor-pointer">Suchen</button>
            </div>
        </div>
        ` : ''}
    </header>`;
}


function wtGalleryImageIsVisible(img) {
    if (!img || img.isDeleted) return false;
    try {
        if (typeof window.wtGalleryIsLocallyDeleted === "function" && window.wtGalleryIsLocallyDeleted(img)) return false;
    } catch (_) {}
    const t = new Date(img.timestamp || 0).getTime();
    if (t && Date.now() - t > 24 * 60 * 60 * 1000) return false;
    return true;
}

function renderGallery() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let validImages = communityImages.filter(img => new Date(img.timestamp) > twentyFourHoursAgo);
    if (!isSuperAdmin) validImages = validImages.filter(img => wtGalleryImageIsVisible(img));
    validImages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const heuteImages = [];
    const gesternImages = [];

    validImages.forEach(img => {
        const imgDate = new Date(img.timestamp);
        if (imgDate.getDate() === now.getDate() && imgDate.getMonth() === now.getMonth() && imgDate.getFullYear() === now.getFullYear()) {
            heuteImages.push(img);
        } else {
            gesternImages.push(img);
        }
    });

    const renderImageGrid = (images) => {
        if (images.length === 0) return '<p class="text-gray-500 italic text-sm mb-8">In diesem Zeitraum wurden noch keine Bilder hochgeladen.</p>';
        return `
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
            ${images.map(img => {
                const isLiked = currentUser && img.likes && img.likes.map(String).includes(String(currentUser));
                return `
                <div class="relative group cursor-pointer aspect-square bg-gray-100 border border-gray-200 rounded overflow-hidden ${img.isDeleted ? 'opacity-60 grayscale' : ''}" onclick="showImageModal('${img.url}')">
                    <img src="${img.url}" alt="Community Bild" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ${img.isDeleted ? '<div class="absolute top-2 left-2 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded z-20 uppercase">Gelöscht</div>' : ''}
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-end justify-between pointer-events-none">
                        <div class="flex items-center gap-2">
                            ${getUserAvatar(img.uploader, 'w-6 h-6', 'w-3 h-3', false)}
                            <div class="flex flex-col">
                                <span class="text-white font-bold text-xs line-clamp-1">${getDisplayName(img.uploader)}</span>
                                <span class="text-gray-300 text-[10px] time-ago-display" data-timestamp="${img.timestamp}">${getTimeAgo(img.timestamp)}</span>
                            </div>
                        </div>
                        <button onclick="event.stopPropagation(); toggleCommunityImageLike('${String(img.id).replace(/'/g, "\\'")}')" class="pointer-events-auto flex items-center gap-1 ${isLiked ? 'text-red-500' : 'text-white'} hover:scale-110 transition-transform cursor-pointer">
                            <i data-lucide="heart" class="w-5 h-5 ${isLiked ? 'fill-current text-red-500' : 'drop-shadow-md'}"></i>
                            <span class="text-xs font-bold drop-shadow-md">${img.likes ? img.likes.length : 0}</span>
                        </button>
                    </div>
                    ${((hasAdminAccess() || img.uploader === currentUser) && !img.isDeleted) ? `
                        <button onclick="event.stopPropagation(); deleteCommunityImage('${String(img.id).replace(/'/g, "\\'")}')" class="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded hover:bg-red-700 shadow z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Bild löschen"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    ` : ''}
                </div>
            `;
            }).join('')}
        </div>`;
    };

    return `
    <div class="max-w-6xl mx-auto mt-4 font-sans mb-16">
        <button onclick="setView('home')" class="flex items-center gap-2 text-blue-600 font-bold text-sm mb-6 hover:underline cursor-pointer px-4 xl:px-0">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
        </button>
        
        <div class="px-4 xl:px-0 mb-8">
            <h2 class="text-4xl md:text-5xl font-black uppercase font-serif mb-2 tracking-tighter">Tagesbilder</h2>
            <p class="text-gray-600">Teile Momente aus Winterthur mit der Community. Bilder verschwinden automatisch nach exakt 24 Stunden.</p>
        </div>

        <div class="bg-white p-6 md:p-8 border border-gray-200 shadow-sm rounded-sm mb-12">
            ${currentUser ? `
                <h4 class="font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2"><i data-lucide="upload-cloud" class="w-5 h-5 text-blue-600"></i> Eigenes Bild teilen</h4>
                <div class="flex flex-col md:flex-row gap-6">
                    <div class="flex-1 bg-gray-50 p-5 border border-gray-200 rounded">
                        <label class="block text-sm font-bold text-gray-700 mb-3"><i data-lucide="monitor-up" class="inline w-4 h-4 mr-1"></i> Vom PC hochladen</label>
                        <input type="file" id="communityImgFile" accept="image/*" class="w-full text-sm bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200" />
                    </div>
                    <div class="flex items-center justify-center">
                        <span class="text-gray-400 font-black uppercase text-xs tracking-wider bg-white px-2">ODER</span>
                    </div>
                    <div class="flex-1 bg-gray-50 p-5 border border-gray-200 rounded">
                        <label class="block text-sm font-bold text-gray-700 mb-3"><i data-lucide="link" class="inline w-4 h-4 mr-1"></i> Bild-URL einfügen</label>
                        <input type="url" id="communityImgUrl" placeholder="https://beispiel.de/bild.jpg" class="w-full text-sm bg-white border border-gray-300 rounded px-4 py-2.5 focus:border-blue-500 focus:outline-none" />
                    </div>
                </div>
                <div class="mt-6 flex justify-end">
                    <button onclick="handleCommunityUpload()" class="w-full md:w-auto bg-blue-900 text-white font-bold px-8 py-3 rounded hover:bg-blue-800 transition-colors shadow-sm cursor-pointer flex justify-center items-center gap-2">
                        Bild veröffentlichen <i data-lucide="send" class="w-4 h-4"></i>
                    </button>
                </div>
            ` : `
                <div class="bg-blue-50 p-4 rounded border border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-3 text-blue-900">
                        <i data-lucide="info" class="w-6 h-6"></i>
                        <span class="text-sm font-bold">Logge dich ein, um eigene Bilder mit der Community zu teilen!</span>
                    </div>
                    <button onclick="showUserLogin()" class="bg-blue-900 text-white px-6 py-2 rounded font-bold hover:bg-blue-800 transition-colors whitespace-nowrap cursor-pointer">Anmelden</button>
                </div>
            `}
        </div>

        <div class="px-4 xl:px-0">
            <h3 class="text-2xl font-black uppercase border-b-2 border-black pb-2 mb-6 inline-block">Heute</h3>
            ${renderImageGrid(heuteImages)}

            <h3 class="text-2xl font-black uppercase border-b-2 border-gray-400 text-gray-600 pb-2 mb-6 inline-block">Gestern</h3>
            ${renderImageGrid(gesternImages)}
        </div>
    </div>`;
}

function renderFeedbackChat() {
    const isAdmin = hasAdminAccess();
    
    return `
    <div class="max-w-4xl mx-auto bg-white p-6 md:p-8 shadow-sm border border-gray-100 min-h-[70vh] font-sans flex flex-col mt-4 mb-16">
        <div class="mb-6 border-b border-gray-200 pb-4">
            <button onclick="setView('home')" class="flex items-center gap-2 text-blue-600 font-bold text-sm mb-4 hover:underline cursor-pointer">
                <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
            </button>
            <h2 class="text-3xl font-black uppercase flex items-center gap-3 text-gray-800">
                <i data-lucide="message-square-plus" class="w-8 h-8 text-blue-600"></i> Website bewerten
            </h2>
            <p class="text-gray-600 mt-2">Wir entwickeln uns ständig weiter. Was gefällt dir an der Zeitung? Welche Funktionen fehlen dir noch?</p>
        </div>
        
        <div class="flex-1 overflow-y-auto flex flex-col gap-4 mb-4 pr-2 bg-gray-50 p-4 rounded border border-gray-200" id="feedbackContainer" style="max-height: 50vh;">
            ${siteFeedbacks.map(f => {
                const isLiked = currentUser && f.likes && f.likes.includes(currentUser);
                const isAuthor = currentUser === f.username;
                const status = f.moderationStatus || 'approved';
                
                if (status !== 'approved' && !isAuthor && !isAdmin) return '';

                let modBadge = '';
                if (status === 'pending') modBadge = '<span class="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold ml-2">Wartet auf Freigabe</span>';

                return `
                <div class="flex gap-3 ${f.username === currentUser ? 'flex-row-reverse' : ''}">
                    ${getUserAvatar(f.username, 'w-8 h-8', 'w-4 h-4', true)}
                    <div class="max-w-[85%] rounded-lg p-3 ${f.username === currentUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-300 text-gray-800 rounded-tl-none'} shadow-sm ${status === 'pending' ? 'border-orange-400 opacity-90' : ''}">
                        <div class="flex items-center gap-2 mb-1 ${f.username === currentUser ? 'justify-end' : ''} flex-wrap">
                            <span class="font-bold text-xs ${f.username === currentUser ? 'text-blue-200' : 'text-blue-900'}">${getDisplayName(f.username)}</span>
                            ${modBadge}
                            <span class="text-[10px] ${f.username === currentUser ? 'text-blue-300' : 'text-gray-400'}">${new Date(f.timestamp).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p class="text-sm leading-relaxed">${f.text}</p>
                        
                        <div class="mt-2 flex flex-col md:flex-row items-center justify-between border-t ${f.username === currentUser ? 'border-blue-500/50' : 'border-gray-100'} pt-1.5 gap-2">
                            <button onclick="toggleFeedbackLike(${f.id})" class="flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer ${isLiked ? (f.username === currentUser ? 'text-white' : 'text-red-500') : (f.username === currentUser ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-red-500')}">
                                <i data-lucide="heart" class="w-3 h-3 ${isLiked ? 'fill-current' : ''}"></i> ${f.likes ? f.likes.length : 0} Likes
                            </button>
                            
                            <div class="flex items-center gap-2">
                                ${isAdmin || f.username === currentUser ? `
                                    <button onclick="deleteFeedback(${f.id})" class="text-[10px] transition-colors cursor-pointer flex items-center gap-1 ${f.username === currentUser ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-red-500'}">
                                        <i data-lucide="trash-2" class="w-3 h-3"></i> Löschen
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
            ${siteFeedbacks.length === 0 ? '<p class="text-center text-gray-500 text-sm py-8 italic">Noch kein Feedback vorhanden. Sei der Erste!</p>' : ''}
        </div>
        
        ${currentUser ? `
        <div class="pt-4 border-t border-gray-200 flex flex-col md:flex-row gap-2">
            <input type="text" id="feedbackInput" placeholder="Dein Feedback oder Verbesserungsvorschlag schreiben..." class="flex-1 border border-gray-300 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" onkeypress="if(event.key === 'Enter') sendFeedback()" />
            <button onclick="sendFeedback()" class="bg-blue-900 text-white px-6 py-2.5 rounded font-bold hover:bg-blue-800 transition-colors text-sm flex justify-center items-center gap-2 cursor-pointer shadow-sm">
                Senden <i data-lucide="send" class="w-4 h-4"></i>
            </button>
        </div>
        ` : `
        <div class="pt-4 border-t border-gray-200 flex flex-col items-center justify-center bg-blue-50 p-6 rounded mt-2 border border-blue-100">
            <p class="text-gray-700 font-bold mb-3 text-center">Möchtest du uns auch bewerten oder einen Vorschlag machen?</p>
            <button onclick="pendingView='feedback'; showUserLogin()" class="bg-blue-900 text-white font-bold py-2 px-6 rounded hover:bg-blue-800 transition-colors cursor-pointer text-sm shadow-sm">Jetzt einloggen</button>
        </div>
        `}
    </div>
    `;
}


// =======================================================================
// TÄGLICHES RÄTSEL
// =======================================================================
const dailyRiddles = [
    {
        question: "Ich habe Städte, aber keine Häuser. Ich habe Berge, aber keine Bäume. Ich habe Wasser, aber keine Fische. Was bin ich?",
        answer: "karte",
        accepted: ["karte", "landkarte", "weltkarte"],
        hint: "Man benutzt sie zur Orientierung."
    },
    {
        question: "Was wird größer, je mehr man davon wegnimmt?",
        answer: "loch",
        accepted: ["loch", "ein loch"],
        hint: "Es kann im Boden sein."
    },
    {
        question: "Was hat viele Zähne, kann aber nicht beißen?",
        answer: "kamm",
        accepted: ["kamm", "ein kamm"],
        hint: "Man benutzt es für Haare."
    },
    {
        question: "Was läuft ständig, hat aber keine Beine?",
        answer: "uhr",
        accepted: ["uhr", "die uhr", "zeit"],
        hint: "Sie zeigt dir, wann Pause ist."
    },
    {
        question: "Je mehr es trocknet, desto nasser wird es. Was ist es?",
        answer: "handtuch",
        accepted: ["handtuch", "tuch", "badetuch"],
        hint: "Du benutzt es nach dem Duschen."
    },
    {
        question: "Was kann man fangen, aber nicht werfen?",
        answer: "erkältung",
        accepted: ["erkältung", "eine erkältung", "schnupfen"],
        hint: "Im Winter passiert es oft."
    },
    {
        question: "Was hat einen Hals, aber keinen Kopf?",
        answer: "flasche",
        accepted: ["flasche", "eine flasche"],
        hint: "Man kann daraus trinken."
    },
    {
        question: "Was ist immer vor dir, aber du kannst es nie sehen?",
        answer: "zukunft",
        accepted: ["zukunft", "die zukunft"],
        hint: "Es kommt erst noch."
    },
    {
        question: "Was hat ein Bett, schläft aber nie?",
        answer: "fluss",
        accepted: ["fluss", "ein fluss", "bach"],
        hint: "Es fließt."
    },
    {
        question: "Was geht durch Städte und Felder, bewegt sich aber nicht?",
        answer: "straße",
        accepted: ["straße", "strasse", "weg", "eine straße", "eine strasse"],
        hint: "Autos benutzen sie."
    },
    {
        question: "Was hat vier Beine am Morgen, zwei am Mittag und drei am Abend?",
        answer: "mensch",
        accepted: ["mensch", "der mensch", "ein mensch"],
        hint: "Ein sehr altes Rätsel über Lebensphasen."
    },
    {
        question: "Was gehört dir, aber andere benutzen es öfter als du?",
        answer: "name",
        accepted: ["name", "mein name", "dein name"],
        hint: "Andere rufen dich damit."
    },
    {
        question: "Was wird nie nass, obwohl es im Wasser liegt?",
        answer: "schatten",
        accepted: ["schatten", "der schatten"],
        hint: "Er entsteht durch Licht."
    },
    {
        question: "Welcher Monat hat 28 Tage?",
        answer: "alle",
        accepted: ["alle", "jeder", "alle monate", "jeder monat"],
        hint: "Die Frage ist ein Trick."
    },
    {
        question: "Was hat Schlüssel, aber öffnet keine Türen?",
        answer: "klavier",
        accepted: ["klavier", "piano", "keyboard"],
        hint: "Es macht Musik."
    },
    {
        question: "Was steigt und fällt, bleibt aber immer am gleichen Ort?",
        answer: "treppe",
        accepted: ["treppe", "eine treppe"],
        hint: "Man benutzt sie statt eines Lifts."
    },
    {
        question: "Was ist schwarz, wenn du es kaufst, rot, wenn du es benutzt, und grau, wenn du es wegwirfst?",
        answer: "kohle",
        accepted: ["kohle", "holzkohle", "grillkohle"],
        hint: "Man braucht sie manchmal beim Grillieren."
    },
    {
        question: "Was kann um die Welt reisen, während es in einer Ecke bleibt?",
        answer: "briefmarke",
        accepted: ["briefmarke", "eine briefmarke"],
        hint: "Sie klebt auf einem Brief."
    },
    {
        question: "Was hat Augen, kann aber nicht sehen?",
        answer: "kartoffel",
        accepted: ["kartoffel", "eine kartoffel"],
        hint: "Man kann daraus Pommes machen."
    },
    {
        question: "Was wird kürzer, je länger man damit schreibt?",
        answer: "bleistift",
        accepted: ["bleistift", "stift", "ein bleistift"],
        hint: "Du brauchst es oft in der Schule."
    },
    {
        question: "Was hat keine Stimme, antwortet aber, wenn man es anspricht?",
        answer: "echo",
        accepted: ["echo", "ein echo"],
        hint: "In Bergen hört man es gut."
    },
    {
        question: "Was ist voller Löcher und hält trotzdem Wasser?",
        answer: "schwamm",
        accepted: ["schwamm", "ein schwamm"],
        hint: "Man benutzt ihn zum Putzen."
    },
    {
        question: "Was ist leicht wie eine Feder, aber niemand kann es lange halten?",
        answer: "atem",
        accepted: ["atem", "luft", "der atem"],
        hint: "Du brauchst es die ganze Zeit."
    },
    {
        question: "Was hat einen Ring, aber keinen Finger?",
        answer: "telefon",
        accepted: ["telefon", "handy", "smartphone"],
        hint: "Es kann klingeln."
    },
    {
        question: "Was kommt einmal in jeder Minute, zweimal in jedem Moment, aber nie in tausend Jahren vor?",
        answer: "m",
        accepted: ["m", "buchstabe m", "der buchstabe m"],
        hint: "Achte auf die Wörter, nicht auf die Zeit."
    },
    {
        question: "Was hat Flügel, aber kann nicht fliegen?",
        answer: "fenster",
        accepted: ["fenster", "ein fenster"],
        hint: "Man kann es öffnen."
    },
    {
        question: "Was ist immer hungrig und stirbt, wenn man ihm Wasser gibt?",
        answer: "feuer",
        accepted: ["feuer", "das feuer"],
        hint: "Es braucht Sauerstoff und Brennstoff."
    },
    {
        question: "Was zerbricht, wenn man seinen Namen sagt?",
        answer: "stille",
        accepted: ["stille", "ruhe", "die stille"],
        hint: "Es ist leise."
    },
    {
        question: "Was hat Hände, kann aber nicht klatschen?",
        answer: "uhr",
        accepted: ["uhr", "eine uhr", "zeigeruhr"],
        hint: "Sie zeigt die Zeit."
    },
    {
        question: "Was beginnt mit E, endet mit E und enthält nur einen Buchstaben?",
        answer: "envelope",
        accepted: ["envelope", "briefumschlag", "umschlag"],
        hint: "Auf Deutsch: Ein Umschlag."
    },
    {
        question: "Was ist in Winterthur, aber nicht in Zürich?",
        answer: "w",
        accepted: ["w", "buchstabe w", "der buchstabe w"],
        hint: "Es geht um Buchstaben."
    }
];

function normalizeRiddleAnswer(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]/g, "");
}

function getDailyRiddle() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    const index = dayOfYear % dailyRiddles.length;
    return { ...dailyRiddles[index], index, dateKey: now.toISOString().slice(0, 10) };
}


function escapePuzzleValue(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function getDailyRiddleAnswerKey() {
    const riddle = getDailyRiddle();
    return `wt_daily_riddle_answer_${riddle.dateKey}`;
}

function saveDailyRiddleAnswer(prefix = "dailyRiddle") {
    const input = document.getElementById(`${prefix}Answer`);
    if (!input) return;
    localStorage.setItem(getDailyRiddleAnswerKey(), input.value || "");
}

function renderDailyRiddle(prefix = "dailyRiddle") {
    const riddle = getDailyRiddle();
    const solvedKey = `wt_daily_riddle_solved_${riddle.dateKey}`;
    const solved = localStorage.getItem(solvedKey) === "true";
    const savedAnswer = localStorage.getItem(getDailyRiddleAnswerKey()) || "";
    const isFullscreen = String(prefix).toLowerCase().includes("full");

    return `
        <section class="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white p-6 border border-blue-800 shadow-sm rounded-sm font-sans relative overflow-hidden">
            <div class="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-blue-500/20 blur-2xl"></div>
            <div class="relative z-10">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <h3 class="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                        <i data-lucide="puzzle" class="w-5 h-5 text-blue-300"></i>
                        Tägliches Rätsel
                    </h3>
                    <div class="flex items-center gap-2">
                        <span class="text-[11px] bg-white/10 text-blue-100 px-2 py-1 rounded-full border border-white/10">Heute</span>
                        ${isFullscreen ? "" : `
                        <button onclick="openPuzzleFullscreen('daily')" class="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors" title="Im Vollbild lösen">
                            <i data-lucide="maximize-2" class="w-4 h-4 text-blue-100"></i>
                        </button>`}
                    </div>
                </div>
                <p class="text-sm leading-relaxed text-blue-50 mb-4">${riddle.question}</p>

                <div class="flex flex-col sm:flex-row gap-2">
                    <input id="${prefix}Answer" type="text" placeholder="Antwort eingeben..." value="${escapePuzzleValue(savedAnswer)}" ${solved ? "disabled" : ""}
                        class="flex-1 px-3 py-2 rounded bg-white/95 text-gray-900 text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-green-50 disabled:text-green-800"
                        oninput="saveDailyRiddleAnswer('${prefix}')" onkeydown="if(event.key === 'Enter') checkDailyRiddleAnswer('${prefix}');" />
                    <button onclick="checkDailyRiddleAnswer('${prefix}')" ${solved ? "disabled" : ""}
                        class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-colors disabled:bg-green-600 disabled:cursor-default">
                        ${solved ? "Gelöst" : "Prüfen"}
                    </button>
                </div>

                <div class="flex items-center justify-between gap-3 mt-3">
                    <button onclick="showDailyRiddleHint('${prefix}')" class="text-xs text-blue-200 hover:text-white hover:underline">Hinweis anzeigen</button>
                    <span class="text-[11px] text-blue-200">Neues Rätsel jeden Tag</span>
                </div>
                <p id="${prefix}Feedback" class="mt-3 text-sm font-bold ${solved ? "text-green-300" : "text-blue-100"}">${solved ? "Richtig gelöst. Morgen gibt es ein neues Rätsel." : ""}</p>
            </div>
        </section>
    `;
}

function checkDailyRiddleAnswer(prefix = "dailyRiddle") {
    const input = document.getElementById(`${prefix}Answer`);
    const feedback = document.getElementById(`${prefix}Feedback`);
    if (!input || !feedback) return;

    saveDailyRiddleAnswer(prefix);
    const riddle = getDailyRiddle();
    const answer = normalizeRiddleAnswer(input.value);
    const accepted = (riddle.accepted || [riddle.answer]).map(normalizeRiddleAnswer);

    if (accepted.includes(answer)) {
        localStorage.setItem(`wt_daily_riddle_solved_${riddle.dateKey}`, "true");
        input.disabled = true;
        feedback.className = "mt-3 text-sm font-bold text-green-300";
        feedback.innerText = "Richtig. Stark gelöst. Morgen gibt es ein neues Rätsel.";
        if (window.lucide) lucide.createIcons();
    } else {
        feedback.className = "mt-3 text-sm font-bold text-red-200";
        feedback.innerText = "Noch nicht ganz. Versuch es nochmal oder nutze den Hinweis.";
    }
}

function showDailyRiddleHint(prefix = "dailyRiddle") {
    const feedback = document.getElementById(`${prefix}Feedback`);
    if (!feedback) return;
    const riddle = getDailyRiddle();
    feedback.className = "mt-3 text-sm font-bold text-blue-200";
    feedback.innerText = "Hinweis: " + riddle.hint;
}

// =======================================================================
// SUDOKU + KREUZWORTRÄTSEL
// =======================================================================
const sudokuPuzzles = [
    {
        puzzle: [
            "5","3","","","7","","","","",
            "6","","","1","9","5","","","",
            "","9","8","","","","","6","",
            "8","","","","6","","","","3",
            "4","","","8","","3","","","1",
            "7","","","","2","","","","6",
            "","6","","","","","2","8","",
            "","","","4","1","9","","","5",
            "","","","","8","","","7","9"
        ],
        solution: [
            "5","3","4","6","7","8","9","1","2",
            "6","7","2","1","9","5","3","4","8",
            "1","9","8","3","4","2","5","6","7",
            "8","5","9","7","6","1","4","2","3",
            "4","2","6","8","5","3","7","9","1",
            "7","1","3","9","2","4","8","5","6",
            "9","6","1","5","3","7","2","8","4",
            "2","8","7","4","1","9","6","3","5",
            "3","4","5","2","8","6","1","7","9"
        ]
    },
    {
        puzzle: [
            "","","3","","2","","6","","",
            "9","","","3","","5","","","1",
            "","","1","8","","6","4","","",
            "","","8","1","","2","9","","",
            "7","","","","","","","","8",
            "","","6","7","","8","2","","",
            "","","2","6","","9","5","","",
            "8","","","2","","3","","","9",
            "","","5","","1","","3","",""
        ],
        solution: [
            "4","8","3","9","2","1","6","5","7",
            "9","6","7","3","4","5","8","2","1",
            "2","5","1","8","7","6","4","9","3",
            "5","4","8","1","3","2","9","7","6",
            "7","2","9","5","6","4","1","3","8",
            "1","3","6","7","9","8","2","4","5",
            "3","7","2","6","8","9","5","1","4",
            "8","1","4","2","5","3","7","6","9",
            "6","9","5","4","1","7","3","8","2"
        ]
    },
    {
        puzzle: [
            "2","","","","8","","3","","",
            "","6","","","7","","","8","4",
            "","3","","5","","","2","","9",
            "","","","1","","5","4","","8",
            "","","","","","","","","",
            "4","","2","7","","6","","","",
            "3","","1","","","7","","4","",
            "7","2","","","4","","","6","",
            "","","4","","1","","","","3"
        ],
        solution: [
            "2","4","5","9","8","1","3","7","6",
            "1","6","9","2","7","3","5","8","4",
            "8","3","7","5","6","4","2","1","9",
            "9","7","6","1","2","5","4","3","8",
            "5","1","3","4","9","8","6","2","7",
            "4","8","2","7","3","6","9","5","1",
            "3","9","1","6","5","7","8","4","2",
            "7","2","8","3","4","9","1","6","5",
            "6","5","4","8","1","2","7","9","3"
        ]
    }
];

const crosswordSets = [
    {
        title: "Zeitung & Alltag",
        rows: 15,
        cols: 15,
        words: [
            { clue: "Person, die einen Artikel liest.", answer: "LESER", row: 9, col: 5, dir: "across" },
            { clue: "Nachrichten aus der eigenen Stadt oder Umgebung.", answer: "LOKAL", row: 5, col: 5, dir: "down" },
            { clue: "Überschrift eines Artikels.", answer: "TITEL", row: 5, col: 1, dir: "across" },
            { clue: "Funktion, mit der man Artikel auf der Website findet.", answer: "SUCHE", row: 1, col: 4, dir: "down" },
            { clue: "Gedruckte oder digitale Sammlung von Nachrichten und Artikeln.", answer: "ZEITUNG", row: 3, col: 2, dir: "down" },
            { clue: "Ressort für Fussball, Tennis und andere Wettkämpfe.", answer: "SPORT", row: 9, col: 7, dir: "down" },
            { clue: "Geschriebener Inhalt eines Artikels.", answer: "TEXT", row: 13, col: 4, dir: "across" },
            { clue: "Bild zu einem Artikel.", answer: "FOTO", row: 11, col: 6, dir: "across" }
        ]
    },
    {
        title: "Schule & Lernen",
        rows: 15,
        cols: 15,
        words: [
            { clue: "Hilfsmittel zum Zeichnen gerader Linien.", answer: "LINEAL", row: 5, col: 6, dir: "across" },
            { clue: "Kurze freie Zeit zwischen zwei Lektionen.", answer: "PAUSE", row: 1, col: 9, dir: "down" },
            { clue: "Darin stehen Geschichten, Wissen oder Aufgaben.", answer: "BUCH", row: 3, col: 8, dir: "across" },
            { clue: "Person, die den Unterricht erklärt.", answer: "LEHRER", row: 5, col: 6, dir: "down" },
            { clue: "Darauf schreibt die Lehrperson vorne im Zimmer.", answer: "TAFEL", row: 9, col: 3, dir: "across" },
            { clue: "Damit schreibt man mit Tinte oder Farbe.", answer: "STIFT", row: 5, col: 3, dir: "down" },
            { clue: "Kurze Prüfung in der Schule.", answer: "TEST", row: 5, col: 1, dir: "across" },
            { clue: "Ort, an dem Schülerinnen und Schüler lernen.", answer: "SCHULE", row: 1, col: 11, dir: "down" }
        ]
    },
    {
        title: "Natur & Wetter",
        rows: 15,
        cols: 15,
        words: [
            { clue: "Kalte Jahreszeit mit Schnee und Eis.", answer: "WINTER", row: 5, col: 1, dir: "across" },
            { clue: "Weisse oder graue Ansammlung am Himmel.", answer: "WOLKE", row: 5, col: 1, dir: "down" },
            { clue: "Wasser, das aus Wolken fällt.", answer: "REGEN", row: 5, col: 6, dir: "down" },
            { clue: "Sie gibt tagsüber Licht und Wärme.", answer: "SONNE", row: 9, col: 3, dir: "across" },
            { clue: "Sehr starkes windiges Wetter.", answer: "STURM", row: 9, col: 3, dir: "down" },
            { clue: "Grüne Fläche mit Gras und Blumen.", answer: "WIESE", row: 1, col: 5, dir: "down" },
            { clue: "Grosse Pflanze mit Stamm, Ästen und Blättern.", answer: "BAUM", row: 11, col: 1, dir: "across" },
            { clue: "Hohe Erhebung in der Landschaft.", answer: "BERG", row: 11, col: 1, dir: "down" }
        ]
    }
];

function getSudokuIndex() {
    return Number(localStorage.getItem("wt_sudoku_index") || "0") % sudokuPuzzles.length;
}

function getCrosswordIndex() {
    return Number(localStorage.getItem("wt_crossword_index") || "0") % crosswordSets.length;
}

function getSudokuProgressKey(index = getSudokuIndex()) {
    return `wt_sudoku_progress_${index}`;
}

function getCrosswordProgressKey(index = getCrosswordIndex()) {
    return `wt_crossword_progress_${index}`;
}

function loadPuzzleProgress(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
        return {};
    }
}

function saveSudokuCell(prefix, cellIndex) {
    const index = getSudokuIndex();
    const puzzle = sudokuPuzzles[index];
    if (puzzle.puzzle[cellIndex]) return;
    const input = document.getElementById(`${prefix}_${cellIndex}`);
    if (!input) return;
    const progress = loadPuzzleProgress(getSudokuProgressKey(index));
    const value = String(input.value || "").replace(/[^1-9]/g, "").slice(0, 1);
    input.value = value;
    if (value) progress[cellIndex] = value;
    else delete progress[cellIndex];
    localStorage.setItem(getSudokuProgressKey(index), JSON.stringify(progress));
    checkSudoku(prefix);
}

function saveCrosswordCell(prefix, cellKey) {
    const input = document.getElementById(`${prefix}_${cellKey}`);
    if (!input) return;
    const progress = loadPuzzleProgress(getCrosswordProgressKey());
    const value = String(input.value || "").toUpperCase().replace(/[^A-ZÄÖÜ]/g, "").slice(0, 1);
    input.value = value;
    if (value) progress[cellKey] = value;
    else delete progress[cellKey];
    localStorage.setItem(getCrosswordProgressKey(), JSON.stringify(progress));
    checkCrossword(prefix);
}

function buildCrosswordCells(set) {
    const cells = {};
    const startMap = {};

    set.words.forEach((word, wordIndex) => {
        const normalizedWord = word.answer.toUpperCase();
        const letters = normalizedWord.split("");
        const startKey = `${word.row}_${word.col}`;

        if (!startMap[startKey]) startMap[startKey] = { row: word.row, col: word.col, dirs: [], wordIndexes: [] };
        startMap[startKey].dirs.push(word.dir);
        startMap[startKey].wordIndexes.push(wordIndex);

        letters.forEach((letter, offset) => {
            const row = word.row + (word.dir === "down" ? offset : 0);
            const col = word.col + (word.dir === "across" ? offset : 0);
            const key = `${row}_${col}`;
            if (!cells[key]) cells[key] = { row, col, letter, words: [] };
            cells[key].letter = letter;
            cells[key].words.push(wordIndex);
        });
    });

    const starts = {};
    const numberedWords = set.words.map(word => ({ ...word }));
    const orderedStarts = Object.values(startMap).sort((a, b) => (a.row - b.row) || (a.col - b.col));

    orderedStarts.forEach((start, index) => {
        const number = index + 1;
        const key = `${start.row}_${start.col}`;
        starts[key] = { number, dirs: start.dirs };
        start.wordIndexes.forEach(wordIndex => {
            numberedWords[wordIndex].number = number;
        });
    });

    return { cells, starts, numberedWords };
}

function getCrosswordArrow(dirs = []) {
    const hasAcross = dirs.includes("across");
    const hasDown = dirs.includes("down");
    if (hasAcross && hasDown) return "→↓";
    if (hasDown) return "↓";
    return "→";
}

function renderPuzzleHub() {
    return `
        <section class="grid grid-cols-1 gap-6">
            ${renderSudoku("sudokuHome")}
            ${renderCrossword("crosswordHome")}
        </section>
    `;
}

function renderSudoku(prefix = "sudokuHome") {
    const index = getSudokuIndex();
    const puzzle = sudokuPuzzles[index];
    const progress = loadPuzzleProgress(getSudokuProgressKey(index));
    const isFullscreen = String(prefix).toLowerCase().includes("full");

    return `
        <section class="bg-white p-6 border border-gray-200 shadow-sm rounded-sm font-sans relative overflow-hidden">
            <div class="flex items-center justify-between gap-3 mb-3">
                <h3 class="text-xl font-black uppercase tracking-wide flex items-center gap-2 text-gray-900">
                    <i data-lucide="grid-3x3" class="w-5 h-5 text-blue-600"></i>
                    Sudoku
                </h3>
                ${isFullscreen ? "" : `
                <button onclick="openPuzzleFullscreen('sudoku')" class="p-2 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors" title="Im Vollbild lösen">
                    <i data-lucide="maximize-2" class="w-4 h-4 text-blue-700"></i>
                </button>`}
            </div>
            <p class="text-xs text-gray-500 mb-4">Fülle die Zahlen 1–9 so ein, dass jede Zeile, Spalte und jedes 3x3-Feld stimmt.</p>
            <div class="wt-sudoku-grid" data-prefix="${prefix}">
                ${puzzle.puzzle.map((fixedValue, i) => {
                    const value = fixedValue || progress[i] || "";
                    return `
                    <input id="${prefix}_${i}" inputmode="numeric" maxlength="1" value="${escapePuzzleValue(value)}" ${fixedValue ? "disabled" : ""}
                        class="wt-sudoku-cell ${fixedValue ? "wt-sudoku-fixed" : ""}"
                        oninput="saveSudokuCell('${prefix}', ${i})" />`;
                }).join("")}
            </div>
            <p id="${prefix}Feedback" class="mt-3 text-sm font-bold text-gray-500">Nach dem Lösen startet automatisch ein neues Sudoku.</p>
        </section>
    `;
}

function checkSudoku(prefix = "sudokuHome") {
    const index = getSudokuIndex();
    const puzzle = sudokuPuzzles[index];
    const feedback = document.getElementById(`${prefix}Feedback`);
    let complete = true;
    let correct = true;

    for (let i = 0; i < 81; i++) {
        const cell = document.getElementById(`${prefix}_${i}`);
        if (!cell) return;
        const value = String(cell.value || "").trim();
        if (!value) complete = false;
        if (value && value !== puzzle.solution[i]) correct = false;
    }

    if (!complete) {
        if (feedback) {
            feedback.className = "mt-3 text-sm font-bold text-gray-500";
            feedback.innerText = "Fülle alle freien Felder aus.";
        }
        return;
    }

    if (correct) {
        if (feedback) {
            feedback.className = "mt-3 text-sm font-bold text-green-600";
            feedback.innerText = "Richtig gelöst. Neues Sudoku wird geladen...";
        }
        setTimeout(() => {
            localStorage.removeItem(getSudokuProgressKey(index));
            localStorage.setItem("wt_sudoku_index", String(index + 1));
            if (document.getElementById("wtPuzzleFullscreen")) {
                refreshPuzzleFullscreen("sudoku");
            } else {
                renderApp();
            }
        }, 1200);
    } else if (feedback) {
        feedback.className = "mt-3 text-sm font-bold text-red-600";
        feedback.innerText = "Noch nicht korrekt. Prüfe die Zahlen nochmal.";
    }
}

function renderCrossword(prefix = "crosswordHome") {
    const index = getCrosswordIndex();
    const set = crosswordSets[index];
    const progress = loadPuzzleProgress(getCrosswordProgressKey(index));
    const { cells, starts, numberedWords } = buildCrosswordCells(set);
    const isFullscreen = String(prefix).toLowerCase().includes("full");
    const across = numberedWords.filter(w => w.dir === "across").sort((a, b) => a.number - b.number);
    const down = numberedWords.filter(w => w.dir === "down").sort((a, b) => a.number - b.number);

    return `
        <section class="bg-slate-950 text-white p-6 border border-slate-800 shadow-sm rounded-sm font-sans relative overflow-hidden">
            <div class="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl"></div>
            <div class="relative z-10">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <h3 class="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                        <i data-lucide="layout-grid" class="w-5 h-5 text-blue-300"></i>
                        Kreuzworträtsel
                    </h3>
                    ${isFullscreen ? "" : `
                    <button onclick="openPuzzleFullscreen('crossword')" class="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors" title="Im Vollbild lösen">
                        <i data-lucide="maximize-2" class="w-4 h-4 text-blue-100"></i>
                    </button>`}
                </div>
                <p class="text-xs text-blue-100 mb-4">Thema: ${set.title}. Die Zahl im Startfeld gehört zur Fragenliste. Der Pfeil zeigt die Richtung: → waagerecht, ↓ senkrecht. Stehen beide Pfeile im gleichen Feld, starten dort zwei Wörter mit derselben Zahl.</p>
                <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.85fr)] gap-6 items-start">
                    <div class="wt-crossword-grid" style="grid-template-columns: repeat(${set.cols}, minmax(0, 1fr));">
                        ${Array.from({ length: set.rows * set.cols }, (_, i) => {
                            const row = Math.floor(i / set.cols);
                            const col = i % set.cols;
                            const key = `${row}_${col}`;
                            const cell = cells[key];
                            if (!cell) return `<div class="wt-crossword-block"></div>`;
                            const value = progress[key] || "";
                            return `
                                <div class="wt-crossword-square">
                                    ${starts[key] ? `<span class="wt-crossword-number">${starts[key].number}<b>${getCrosswordArrow(starts[key].dirs)}</b></span>` : ""}
                                    <input id="${prefix}_${key}" maxlength="1" value="${escapePuzzleValue(value)}" class="wt-crossword-cell" aria-label="Kreuzworträtsel Feld ${row + 1}, ${col + 1}" oninput="saveCrosswordCell('${prefix}', '${key}')" />
                                </div>`;
                        }).join("")}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <h4 class="font-black text-blue-200 uppercase tracking-wide mb-2">Waagerecht →</h4>
                            <ol class="space-y-2">
                                ${across.map(w => `<li class="leading-snug"><span class="inline-flex items-center justify-center min-w-9 font-black text-white bg-blue-600/40 border border-blue-300/20 rounded px-1 mr-1">${w.number} →</span> ${w.clue}</li>`).join("")}
                            </ol>
                        </div>
                        <div>
                            <h4 class="font-black text-blue-200 uppercase tracking-wide mb-2">Senkrecht ↓</h4>
                            <ol class="space-y-2">
                                ${down.map(w => `<li class="leading-snug"><span class="inline-flex items-center justify-center min-w-9 font-black text-white bg-blue-600/40 border border-blue-300/20 rounded px-1 mr-1">${w.number} ↓</span> ${w.clue}</li>`).join("")}
                            </ol>
                        </div>
                    </div>
                </div>
                <p id="${prefix}Feedback" class="mt-3 text-sm font-bold text-blue-100">Fülle alle weißen Felder aus.</p>
            </div>
        </section>
    `;
}

function checkCrossword(prefix = "crosswordHome") {
    const index = getCrosswordIndex();
    const set = crosswordSets[index];
    const { cells } = buildCrosswordCells(set);
    const feedback = document.getElementById(`${prefix}Feedback`);
    let complete = true;
    let correct = true;

    Object.entries(cells).forEach(([key, cell]) => {
        const input = document.getElementById(`${prefix}_${key}`);
        if (!input) return;
        const value = String(input.value || "").toUpperCase();
        if (!value) complete = false;
        if (value && normalizeRiddleAnswer(value) !== normalizeRiddleAnswer(cell.letter)) correct = false;
    });

    if (!complete) {
        if (feedback) {
            feedback.className = "mt-3 text-sm font-bold text-blue-100";
            feedback.innerText = "Fülle alle weißen Felder aus.";
        }
        return;
    }

    if (correct) {
        if (feedback) {
            feedback.className = "mt-3 text-sm font-bold text-green-300";
            feedback.innerText = "Richtig gelöst. Neue Fragen werden geladen...";
        }
        setTimeout(() => {
            localStorage.removeItem(getCrosswordProgressKey(index));
            localStorage.setItem("wt_crossword_index", String(index + 1));
            if (document.getElementById("wtPuzzleFullscreen")) {
                refreshPuzzleFullscreen("crossword");
            } else {
                renderApp();
            }
        }, 1200);
    } else if (feedback) {
        feedback.className = "mt-3 text-sm font-bold text-red-200";
        feedback.innerText = "Noch nicht korrekt. Prüfe die Buchstaben nochmal.";
    }
}

function openPuzzleFullscreen(type) {
    const existing = document.getElementById("wtPuzzleFullscreen");
    if (existing) existing.remove();
    window.wtCurrentFullscreenPuzzle = type;

    const titles = {
        daily: "Tägliches Rätsel",
        sudoku: "Sudoku",
        crossword: "Kreuzworträtsel"
    };

    let content = "";
    if (type === "daily") content = renderDailyRiddle("dailyRiddleFull");
    if (type === "sudoku") content = renderSudoku("sudokuFull");
    if (type === "crossword") content = renderCrossword("crosswordFull");

    const modal = document.createElement("div");
    modal.id = "wtPuzzleFullscreen";
    modal.className = "fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm p-3 md:p-8 flex items-center justify-center";
    modal.innerHTML = `
        <div class="bg-[#fcfbf9] w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-lg shadow-2xl border border-white/20 p-4 md:p-8 relative">
            <button onclick="closePuzzleFullscreen()" class="absolute right-4 top-4 z-10 p-2 rounded-full bg-gray-900 text-white hover:bg-gray-700" title="Vollbild schließen">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
            <div class="mb-4 pr-12">
                <h2 id="wtPuzzleFullscreenTitle" class="text-2xl md:text-4xl font-black uppercase tracking-wide font-sans">${titles[type] || "Rätsel"}</h2>
                <p class="text-sm text-gray-500 font-sans mt-1">Vollbildmodus</p>
            </div>
            <div id="wtPuzzleFullscreenContent">${content}</div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    if (window.lucide) lucide.createIcons();
}

function refreshPuzzleFullscreen(type = window.wtCurrentFullscreenPuzzle) {
    const titles = {
        daily: "Tägliches Rätsel",
        sudoku: "Sudoku",
        crossword: "Kreuzworträtsel"
    };

    let content = "";
    if (type === "daily") content = renderDailyRiddle("dailyRiddleFull");
    if (type === "sudoku") content = renderSudoku("sudokuFull");
    if (type === "crossword") content = renderCrossword("crosswordFull");

    const titleEl = document.getElementById("wtPuzzleFullscreenTitle");
    const contentEl = document.getElementById("wtPuzzleFullscreenContent");
    if (titleEl) titleEl.innerText = titles[type] || "Rätsel";
    if (contentEl) contentEl.innerHTML = content;
    window.wtCurrentFullscreenPuzzle = type;
    if (window.lucide) lucide.createIcons();
}

function closePuzzleFullscreen(restoreScroll = true) {
    const modal = document.getElementById("wtPuzzleFullscreen");
    const scrollY = window.scrollY;
    if (modal) modal.remove();
    document.body.style.overflow = "";
    if (restoreScroll && typeof renderApp === "function") {
        renderApp();
        window.scrollTo(0, scrollY);
    }
}

function getArticleTimestampMs(article) {
    const time = new Date(article && article.timestamp ? article.timestamp : 0).getTime();
    return Number.isFinite(time) ? time : 0;
}

function isBreakingArticle(article) {
    return !!(article && article.isEilmeldung === true);
}

function sortArticlesForHomepage(list) {
    return (Array.isArray(list) ? list : [])
        .map(normalizeArticleData)
        .filter(Boolean)
        .slice()
        .sort((a, b) => {
            const aBreaking = isBreakingArticle(a);
            const bBreaking = isBreakingArticle(b);
            if (aBreaking !== bBreaking) return aBreaking ? -1 : 1;
            return getArticleTimestampMs(b) - getArticleTimestampMs(a);
        });
}

function renderHome() {
    if (articles.length === 0) return `<div class="max-w-3xl mx-auto flex flex-col gap-6">${renderDailyRiddle()}${renderPuzzleHub()}<div class="text-center py-8 text-gray-500 font-sans">Keine Artikel vorhanden.</div></div>`;
    
    const currentArticles = sortArticlesForHomepage(articles);

    if (currentArticles.length === 0) return `<div class="max-w-3xl mx-auto flex flex-col gap-6">${renderDailyRiddle()}${renderPuzzleHub()}<div class="text-center py-8 text-gray-500 font-sans">Derzeit gibt es keine sichtbaren Artikel.</div></div>`;
    
    const topStory = currentArticles[0];
    const mainArticles = currentArticles.slice(1, 4);
    const trendingArticles = [...currentArticles].sort((a, b) => b.views.length - a.views.length).slice(0, 3);

    let html = `<div class="grid grid-cols-1 lg:grid-cols-12 gap-8"><div class="lg:col-span-8 flex flex-col gap-8">`;

    if (topStory) {
        const isLiked = currentUser && topStory.likes.includes(currentUser);
        const isEilmeldung = isBreakingArticle(topStory);
        const displayImage = topStory.imageUrl || getFallbackImage(topStory.category);
        
        html += `
        <article onclick="openArticle(${topStory.id})" class="group cursor-pointer">
            <div class="relative overflow-hidden mb-4 rounded-sm">
                <img src="${displayImage}" alt="${topStory.title}" class="w-full h-64 sm:h-80 md:h-[400px] object-cover group-hover:scale-105 transition-transform duration-500" />
                ${isEilmeldung ? '<div class="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold uppercase px-2 py-1 font-sans shadow-md animate-pulse">Eilmeldung</div>' : ''}
            </div>
            <div class="flex flex-col gap-2">
                <span class="text-blue-700 font-bold text-sm uppercase font-sans tracking-wide flex justify-between">
                    ${topStory.category}
                    <span class="flex items-center gap-3 text-gray-500">
                        <span class="flex items-center gap-1"><i data-lucide="eye" class="w-4 h-4"></i> ${topStory.views.length}</span>
                        <span class="flex items-center gap-1 text-red-500"><i data-lucide="heart" class="w-4 h-4 ${isLiked ? 'fill-current' : ''}"></i> ${topStory.likes.length}</span>
                    </span>
                </span>
                <h2 class="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight group-hover:text-blue-700 transition-colors">${topStory.title}</h2>
                <p class="text-lg text-gray-700 leading-relaxed mt-2">${topStory.summary}</p>
                <div class="text-sm text-gray-500 font-sans mt-2 flex items-center gap-2">
                    <span class="font-semibold text-gray-900">${topStory.author}</span>
                    <span>•</span>
                    <span class="time-ago-display" data-timestamp="${topStory.timestamp}">${getTimeAgo(topStory.timestamp)}</span>
                </div>
            </div>
        </article>
        <hr class="border-gray-300" />
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">`;
    }

    mainArticles.forEach(article => {
        const isLiked = currentUser && article.likes.includes(currentUser);
        const isEilmeldung = isBreakingArticle(article);
        const displayImage = article.imageUrl || getFallbackImage(article.category);
        
        html += `
        <article onclick="openArticle(${article.id})" class="group cursor-pointer flex flex-col gap-3">
            <div class="relative overflow-hidden h-48 rounded-sm">
                <img src="${displayImage}" alt="${article.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ${isEilmeldung ? '<div class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shadow-sm">Eilmeldung</div>' : ''}
            </div>
            <span class="text-blue-700 font-bold text-xs uppercase font-sans flex justify-between">
                ${article.category}
                <span class="flex items-center gap-2 text-gray-400">
                    <span class="flex items-center gap-1"><i data-lucide="eye" class="w-3 h-3"></i> ${article.views.length}</span>
                    <span class="flex items-center gap-1 text-red-400"><i data-lucide="heart" class="w-3 h-3 ${isLiked ? 'fill-current' : ''}"></i> ${article.likes.length}</span>
                </span>
            </span>
            <h3 class="text-xl font-bold leading-snug group-hover:text-blue-700 transition-colors">${article.title}</h3>
            <p class="text-sm text-gray-600 line-clamp-3">${article.summary}</p>
        </article>`;
    });

    html += `</div></div>`;

    html += `
    <aside class="lg:col-span-4 flex flex-col gap-8">
        <div class="bg-white p-6 border border-gray-200 shadow-sm">
            <h3 class="text-xl font-black uppercase mb-4 pb-2 border-b-2 border-black font-sans flex items-center gap-2">
                <span class="w-3 h-3 bg-red-600 rounded-full inline-block animate-pulse"></span>
                Meistgelesen
            </h3>
            <ul class="flex flex-col gap-4">
                ${trendingArticles.map((story, i) => `
                    <li onclick="openArticle(${story.id})" class="flex gap-4 group cursor-pointer">
                        <span class="text-3xl font-black text-gray-200 group-hover:text-blue-600 transition-colors font-sans">${i + 1}</span>
                        <h4 class="meistgelesen-item font-bold text-base group-hover:text-blue-600 transition-colors mt-1 line-clamp-2">${story.title}</h4>
                    </li>
                `).join('')}
            </ul>
        </div>

        ${renderDailyRiddle()}

        <div onclick="setView('gallery'); window.scrollTo(0,0);" class="bg-gradient-to-br from-green-50 to-green-100 p-6 border border-green-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden rounded-sm">
            <i data-lucide="camera" class="w-16 h-16 text-green-200 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform"></i>
            <h3 class="text-xl font-black uppercase mb-2 text-green-900 flex items-center gap-2">Tagesbilder</h3>
            <p class="text-sm text-green-800 mb-4 relative z-10 font-sans">Entdecke die neuesten Bilder aus unserer Community von heute!</p>
            <span class="text-sm font-bold text-green-700 flex items-center gap-1 group-hover:text-green-900 transition-colors relative z-10">Zur Galerie <i data-lucide="arrow-right" class="w-4 h-4"></i></span>
        </div>

        ${renderPuzzleHub()}
    </aside></div>`;

    html += renderHomeSolitaireWidget();
    return html;
}



function normalizeArticleData(article) {
    if (!article || typeof article !== 'object') return article;

    if (!Array.isArray(article.likes)) article.likes = [];
    if (!Array.isArray(article.views)) article.views = [];
    if (!Array.isArray(article.sources)) article.sources = [];
    article.inlineImages = dedupeArticleInlineImages(article);
    if (!Array.isArray(article.comments)) article.comments = [];

    article.comments = article.comments
        .filter(comment => comment && typeof comment === 'object')
        .map(comment => {
            if (!Array.isArray(comment.likes)) comment.likes = [];
            if (!Array.isArray(comment.reportedBy)) comment.reportedBy = [];
            if (!comment.moderationStatus) comment.moderationStatus = 'approved';
            if (!comment.id) comment.id = Date.now() + Math.floor(Math.random() * 100000);
            if (!comment.timestamp) comment.timestamp = article.timestamp || new Date().toISOString();
            if (!comment.username) comment.username = 'Gast';
            if (!comment.text) comment.text = '';
            return comment;
        });

    if (article.poll && typeof article.poll === 'object') {
        if (!Array.isArray(article.poll.options)) article.poll.options = [];
        if (!article.poll.votes || typeof article.poll.votes !== 'object') article.poll.votes = {};
        article.poll.options.forEach(option => {
            if (!Array.isArray(article.poll.votes[option])) article.poll.votes[option] = [];
        });
    }

    return article;
}

function getArticleImageUrlKey(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
        const parsed = new URL(raw, window.location.href);
        parsed.hash = '';
        parsed.search = '';
        return parsed.href.replace(/\/$/, '').toLowerCase();
    } catch (_) {
        return raw.replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
    }
}

function dedupeArticleInlineImages(article) {
    const images = article && Array.isArray(article.inlineImages) ? article.inlineImages : [];
    const mainImageKey = getArticleImageUrlKey(article && article.imageUrl);
    const seenUrls = new Set(mainImageKey ? [mainImageKey] : []);
    const seenPositions = new Set();
    const cleaned = [];

    images.forEach(image => {
        if (!image || typeof image !== 'object') return;
        const url = String(image.url || '').trim();
        const urlKey = getArticleImageUrlKey(url);
        const position = Number(image.positionAfterParagraph);
        const cleanPosition = Math.floor(position);
        if (!urlKey || !Number.isFinite(position) || cleanPosition < 1 || seenUrls.has(urlKey) || seenPositions.has(cleanPosition)) return;

        seenUrls.add(urlKey);
        seenPositions.add(cleanPosition);
        cleaned.push({
            ...image,
            url,
            positionAfterParagraph: cleanPosition
        });
    });

    return cleaned;
}


function escapeArticleHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function normalizeArticleContentText(value) {
    return String(value || '')
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
}

function renderArticleContentWithExtras(article) {
    const rawContent = normalizeArticleContentText(article.content || "Kein weiterer Text verfügbar.");
    const inlineImages = dedupeArticleInlineImages(article);
    const imageMap = {};

    inlineImages.forEach((img) => {
        const pos = Number(img.positionAfterParagraph);
        if (!Number.isFinite(pos)) return;
        if (!imageMap[pos]) imageMap[pos] = [img];
    });

    const blocks = rawContent
        .split(/\n\s*\n/g)
        .map(block => block.trim())
        .filter(block => block.length > 0 && !/^\[BILD:.*\]$/i.test(block));

    let paragraphCounter = 0;
    let html = '';

    blocks.forEach((block) => {
        let renderedBlock = '';

        if (/^#{2,3}\s+/.test(block)) {
            renderedBlock = `<h2 class="text-2xl md:text-3xl font-black mt-10 mb-4 text-gray-950 leading-tight">${escapeArticleHtml(block.replace(/^#{2,3}\s+/, ''))}</h2>`;
        } else {
            paragraphCounter += 1;
            renderedBlock = `<p class="mb-6 text-lg md:text-xl leading-relaxed text-gray-800">${escapeArticleHtml(block).replace(/\n/g, '<br>')}</p>`;
        }

        html += renderedBlock;

        if (imageMap[paragraphCounter]) {
            html += imageMap[paragraphCounter].map((img) => `
                <figure class="my-8 bg-gray-50 border border-gray-200 rounded-sm overflow-hidden shadow-sm">
                    <img src="${escapeArticleHtml(img.url || '')}" alt="${escapeArticleHtml(img.caption || 'Artikelbild')}" class="w-full max-h-[520px] object-cover bg-gray-100" loading="lazy" onerror="this.closest('figure').style.display='none'" />
                    ${img.caption ? `<figcaption class="px-4 py-3 text-sm text-gray-600 font-sans border-t border-gray-200">${escapeArticleHtml(img.caption)}</figcaption>` : ''}
                </figure>
            `).join('');
        }
    });

    return html;
}


function ensurePollId(article) {
    if (!article || !article.poll || typeof article.poll !== 'object') return null;
    if (!article.poll.id) {
        article.poll.id = `poll_${String(article.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    }
    if (!article.poll.votes || typeof article.poll.votes !== 'object') {
        article.poll.votes = {};
    }
    if (Array.isArray(article.poll.options)) {
        article.poll.options.forEach(option => {
            if (!Array.isArray(article.poll.votes[option])) {
                article.poll.votes[option] = [];
            }
        });
    }
    return article.poll.id;
}

function getPollVoteStorageKey(article) {
    const pollId = ensurePollId(article) || 'poll_unknown';
    return `wt_poll_vote_${String(article.id || 'article_unknown')}_${pollId}`;
}

function renderArticlePoll(article) {
    const poll = article.poll;
    if (!poll || !poll.question || !Array.isArray(poll.options) || poll.options.length === 0) return '';

    if (!poll.votes || typeof poll.votes !== 'object') poll.votes = {};
    poll.options.forEach(option => {
        if (!Array.isArray(poll.votes[option])) poll.votes[option] = [];
    });

    const voterId = currentUser || sessionId;
    const selectedOption = poll.options.find(option => (poll.votes[option] || []).includes(voterId));
    const totalVotes = poll.options.reduce((sum, option) => sum + ((poll.votes[option] || []).length), 0);

    return `
        <section class="mt-12 mb-10 p-6 md:p-8 bg-blue-50 border border-blue-200 rounded-sm font-sans shadow-sm">
            <div class="flex items-center gap-2 mb-3 text-blue-900">
                <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
                <h3 class="text-xl font-black uppercase tracking-wide">Umfrage</h3>
            </div>
            <p class="text-lg font-bold text-gray-900 mb-5">${escapeArticleHtml(poll.question)}</p>
            <div class="flex flex-col gap-3">
                ${poll.options.map(option => {
                    const votes = (poll.votes[option] || []).length;
                    const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const isSelected = selectedOption === option;
                    return `
                        <button onclick="voteArticlePoll(${article.id}, '${encodeURIComponent(option)}')" class="relative overflow-hidden text-left border ${isSelected ? 'border-blue-700 bg-white' : 'border-blue-200 bg-white hover:border-blue-500'} rounded-sm p-4 transition-colors cursor-pointer group">
                            <div class="absolute left-0 top-0 h-full bg-blue-100 pointer-events-none" style="width:${percent}%;"></div>
                            <div class="relative z-10 flex justify-between items-center gap-4">
                                <span class="font-bold text-gray-900">${escapeArticleHtml(option)}</span>
                                <span class="text-sm font-black text-blue-900 whitespace-nowrap">${percent}%</span>
                            </div>
                            <div class="relative z-10 text-xs text-gray-500 mt-1">${votes} Stimme${votes === 1 ? '' : 'n'}${isSelected ? ' · Deine Wahl' : ''}</div>
                        </button>
                    `;
                }).join('')}
            </div>
            <p class="text-xs text-gray-500 mt-4">${totalVotes} Stimme${totalVotes === 1 ? '' : 'n'} insgesamt. Du kannst deine Auswahl durch erneutes Klicken auf eine andere Option ändern.</p>
        </section>
    `;
}


function splitArticleBlocks(content) {
    return normalizeArticleContentText(content)
        .split(/\n{2,}/)
        .map(block => block.trim())
        .filter(Boolean)
        .filter(block => !/^\[BILD:.*\]$/i.test(block));
}

function renderInlineArticleImage(image) {
    if (!image || !image.url) return '';
    return `
        <figure class="article-inline-image my-8">
            <img src="${escapeArticleHtml(image.url)}" alt="${escapeArticleHtml(image.caption || 'Artikelbild')}" class="w-full rounded-2xl shadow-lg object-cover max-h-[520px]">
            ${image.caption ? `<figcaption class="text-sm text-slate-500 mt-2">${escapeArticleHtml(image.caption)}</figcaption>` : ''}
        </figure>
    `;
}

function renderArticleBodyWithExtras(article) {
    const blocks = splitArticleBlocks(article.content || '');
    const inlineImages = dedupeArticleInlineImages(article);

    let paragraphNumber = 0;

    return blocks.map(block => {
        let html = '';

        if (block.startsWith('## ')) {
            html += `<h2 class="article-section-title text-2xl font-bold mt-10 mb-4">${escapeArticleHtml(block.replace(/^##\s*/, ''))}</h2>`;
        } else if (block.startsWith('# ')) {
            html += `<h2 class="article-section-title text-2xl font-bold mt-10 mb-4">${escapeArticleHtml(block.replace(/^#\s*/, ''))}</h2>`;
        } else {
            paragraphNumber += 1;
            html += `<p class="article-paragraph text-lg leading-8 mb-5">${escapeArticleHtml(block)}</p>`;

            inlineImages
                .filter(img => Number(img.positionAfterParagraph) === paragraphNumber)
                .forEach(img => {
                    html += renderInlineArticleImage(img);
                });
        }

        return html;
    }).join('');
}

function renderArticlePoll(article) {
    const poll = article && article.poll;
    if (!poll || typeof poll !== 'object' || !Array.isArray(poll.options) || !poll.question) return '';
    ensurePollId(article);
    const userVote = localStorage.getItem(getPollVoteStorageKey(article));

    const votes = poll.votes && typeof poll.votes === 'object' ? poll.votes : {};
    const totalVotes = poll.options.reduce((sum, option) => sum + (Array.isArray(votes[option]) ? votes[option].length : 0), 0);

    const optionsHtml = poll.options.map(option => {
        const count = Array.isArray(votes[option]) ? votes[option].length : 0;
        const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

        return `
            <button class="article-poll-option w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                    data-poll-option="${escapeArticleHtml(option)}">
                <div class="flex justify-between gap-3">
                    <span>${escapeArticleHtml(option)}</span>
                    <strong>${percent}%</strong>
                </div>
                <div class="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div class="h-full bg-blue-600 rounded-full" style="width:${percent}%"></div>
                </div>
                <div class="text-xs text-slate-500 mt-1">${count} Stimme${count === 1 ? '' : 'n'}</div>
            </button>
        `;
    }).join('');

    return `
        <section class="article-poll mt-10 mb-8 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <h3 class="text-xl font-bold mb-2">Umfrage</h3>
            <p class="mb-2 text-slate-700">${escapeArticleHtml(poll.question)}</p>
            ${userVote ? `<p class="mb-4 text-sm text-green-700 font-semibold">Du hast abgestimmt: ${escapeArticleHtml(userVote)}</p>` : `<p class="mb-4 text-sm text-slate-500">Deine Stimme wird nur für diese Umfrage gespeichert.</p>`}
            <div class="space-y-3">${optionsHtml}</div>
        </section>
    `;
}

function renderArticle() {
    const article = normalizeArticleData(articles.find(a => String(a.id) === String(selectedArticleId)));
    if (!article) return '';
    
    if (!hasAuthorAccess() && article.autoDeleteDate && new Date(article.autoDeleteDate) <= new Date()) {
        return `
        <div class="max-w-4xl mx-auto bg-white p-12 mt-8 shadow-sm border border-gray-100 text-center font-sans">
            <button onclick="setView('home')" class="flex items-center justify-center gap-2 text-blue-600 font-bold text-sm mb-6 hover:underline cursor-pointer mx-auto">
                <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
            </button>
            <i data-lucide="clock" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
            <h2 class="text-2xl font-black text-gray-700 mb-2">Artikel nicht mehr verfügbar</h2>
            <p class="text-gray-500">Das Löschungsdatum dieses Artikels ist abgelaufen. Er wurde in das Archiv verschoben.</p>
        </div>`;
    }

    const isLiked = currentUser && article.likes.includes(currentUser);
    const isAdmin = hasAdminAccess();
    const activeComments = isAdmin ? article.comments : article.comments.filter(c => !c.isDeleted || c.username === currentUser);
    const authorData = getActiveAuthors().find(a => a.name === article.author);
    const user = currentUser ? registeredUsers.find(u => u.username === currentUser) : null;
    if (user) ensureUserSubscriptions(user);
    const safeCategoryJs = (article.category || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeAuthorJs = (article.author || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const isCatSubscribed = !!(user && (user.subscriptions.categories || []).includes((article.category || '').trim()));
    const isAuthorSubscribed = !!(user && (user.subscriptions.authors || []).includes((article.author || '').trim()));
    
    const displayImage = article.imageUrl || getFallbackImage(article.category);
    const safeCategory = wtEscapeHtml(article.category || "");
    const safeAuthor = wtEscapeHtml(article.author || "");
    const safeTitle = wtEscapeHtml(article.title || "");
    const safeSummary = wtEscapeHtml(article.summary || "");
    const safeDisplayImage = wtEscapeHtml(displayImage || "");

    return `
    <article class="max-w-4xl mx-auto bg-white p-6 md:p-12 shadow-sm border border-gray-100">
        <button onclick="setView('home')" class="flex items-center gap-2 text-blue-600 font-sans font-bold text-sm mb-8 hover:underline cursor-pointer">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
        </button>
        <div class="flex items-center gap-3">
            <span class="text-blue-700 font-bold text-sm uppercase font-sans tracking-wide cursor-pointer hover:underline" onclick="executeSearchCategory('${safeCategoryJs}')">${safeCategory}</span>
            ${currentUser ? `
                <button onclick="toggleCategorySubscription('${safeCategoryJs}')" class="text-xs font-bold px-3 py-1 rounded-full border ${isCatSubscribed ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50'} transition-colors cursor-pointer flex items-center gap-2" title="Kategorie abonnieren/abbestellen">
                    <i data-lucide="bell" class="w-4 h-4"></i>
                    ${isCatSubscribed ? 'Abo aktiv' : 'Abonnieren'}
                </button>
            ` : ''}
        </div>
        <h1 class="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight mt-4 mb-6">${safeTitle}</h1>
        
        <div class="flex flex-wrap items-center justify-between border-y border-gray-200 py-4 mb-8 font-sans text-sm text-gray-600">
            <div class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onclick="setView('authors'); window.scrollTo(0,0);" title="Mehr über den Autor erfahren">
                ${authorData && authorData.imageUrl ? `
                    <img src="${wtEscapeHtml(authorData.imageUrl)}" class="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" onerror="this.outerHTML='${getStandardAvatarHtml('w-8 h-8', 'w-4 h-4').replace(/'/g, "\\'").replace(/"/g, '&quot;')}'" />
                ` : getStandardAvatarHtml('w-8 h-8', 'w-4 h-4')}
                <div>
                    <span class="font-bold text-gray-900 block">${safeAuthor}</span>
                    <span class="text-xs text-gray-500 time-ago-display" data-timestamp="${article.timestamp}">${getTimeAgo(article.timestamp)}</span>
                </div>
                ${currentUser ? `
                    <button onclick="event.stopPropagation(); toggleAuthorSubscription('${safeAuthorJs}')" class="ml-2 text-xs font-bold px-3 py-1 rounded-full border ${isAuthorSubscribed ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50'} transition-colors cursor-pointer flex items-center gap-2" title="Autor abonnieren/abbestellen">
                        <i data-lucide="bell" class="w-4 h-4"></i>
                        ${isAuthorSubscribed ? 'Abo aktiv' : 'Abonnieren'}
                    </button>
                ` : ''}
            </div>
            <div class="flex items-center gap-6 mt-4 sm:mt-0">
                <span class="flex items-center gap-2" title="Aufrufe">
                    <i data-lucide="eye" class="w-5 h-5 text-gray-400"></i>
                    <span class="font-bold">${article.views.length}</span>
                </span>
                <button onclick="toggleLike(${article.id})" class="flex items-center gap-2 px-3 py-1 rounded-full transition-colors border cursor-pointer ${isLiked ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 hover:bg-gray-50'}">
                    <i data-lucide="heart" class="w-5 h-5 ${isLiked ? 'fill-current text-red-500' : 'text-gray-400'}"></i>
                    <span class="font-bold">${article.likes.length} Likes</span>
                </button>
            </div>
        </div>

        <p class="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed mb-8">${safeSummary}</p>
        <img src="${safeDisplayImage}" alt="Artikelbild" class="w-full h-auto max-h-[400px] md:max-h-[600px] object-cover mb-8 rounded-sm" />
        
        <div class="article-content-with-extras max-w-none">${renderArticleContentWithExtras(article)}</div>
        
        ${renderArticlePoll(article)}
        
        ${article.sources && article.sources.length > 0 ? `
        <div class="mt-12 p-6 bg-gray-50 border border-gray-200 rounded-sm font-sans">
            <h4 class="font-bold text-gray-800 mb-3 flex items-center gap-2"><i data-lucide="link" class="w-5 h-5 text-blue-600"></i> Quellen & Weiterführende Links</h4>
            <ul class="flex flex-col gap-2">
                ${article.sources.map(src => `
                    <li><a href="${wtEscapeHtml(wtSafeExternalUrl(src))}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-sm break-all"><i data-lucide="external-link" class="w-3 h-3"></i> ${wtEscapeHtml(src)}</a></li>
                `).join('')}
            </ul>
        </div>
        ` : ''}

        <div class="mt-16 pt-8 border-t border-gray-200 font-sans">
            <h3 class="text-2xl font-black mb-6">Kommentare (${activeComments.length})</h3>
            
            <div class="flex flex-col gap-6 mb-8">
                ${activeComments.length === 0 ? '<p class="text-gray-500 italic">Noch keine Kommentare vorhanden. Sei der Erste!</p>' : ''}
                
                ${activeComments.map(c => {
                    const isCommentLiked = currentUser && c.likes.includes(currentUser);
                    const hasReported = currentUser && c.reportedBy && c.reportedBy.includes(currentUser);
                    const isAuthor = currentUser === c.username;
                    const status = c.moderationStatus || 'approved';
                    const safeCommentAuthor = wtEscapeHtml(getDisplayName(c.username));
                    const safeCommentText = wtEscapeHtml(c.text || "");
                    
                    if (status !== 'approved' && !isAuthor && !isAdmin) return '';

                    let modBadge = '';
                    if (status === 'pending') modBadge = '<span class="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold ml-2">Wartet auf Freigabe</span>';
                    else if (status === 'rejected') modBadge = '<span class="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold ml-2">Abgelehnt</span>';

                    return `
                    <div class="bg-gray-50 p-4 rounded border border-gray-100 relative ${c.isDeleted || status === 'pending' ? 'opacity-70 bg-orange-50' : ''}">
                        ${c.isDeleted ? `<div class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">${isAdmin ? 'Gelöscht' : 'Gelöscht (Nur für dich sichtbar)'}</div>` : ''}
                        
                        <div class="flex gap-4">
                            ${getUserAvatar(c.username, 'w-10 h-10', 'w-5 h-5', true)}
                            <div class="flex-1">
                                <div class="flex flex-wrap gap-2 items-center mb-1">
                                    <span class="font-bold text-blue-900">${safeCommentAuthor}</span>
                                    ${modBadge}
                                    <span class="text-xs text-gray-400 ml-auto time-ago-display" data-timestamp="${c.timestamp}">${getTimeAgo(c.timestamp)}</span>
                                </div>
                                <p class="text-gray-800 leading-relaxed mb-3">${safeCommentText}</p>
                                
                                <div class="flex flex-wrap gap-4 items-center text-sm">
                                    <button onclick="toggleCommentLike(${article.id}, ${c.id})" class="flex items-center gap-1 ${isCommentLiked ? 'text-red-500 font-bold' : 'text-gray-500 hover:text-gray-800'} transition-colors cursor-pointer">
                                        <i data-lucide="heart" class="w-4 h-4 ${isCommentLiked ? 'fill-current' : ''}"></i> ${(Array.isArray(c.likes) ? c.likes : []).length}
                                    </button>
                                    
                                    ${!c.isDeleted && status === 'approved' && !isAuthor && !isAdmin ? `
                                        <button onclick="reportComment(${article.id}, ${c.id})" class="flex items-center gap-1 ${hasReported ? 'text-orange-500 font-bold' : 'text-gray-400 hover:text-orange-500'} transition-colors cursor-pointer" title="${hasReported ? 'Du hast diesen Kommentar gemeldet' : 'Kommentar an Moderation melden'}">
                                            <i data-lucide="flag" class="w-4 h-4 ${hasReported ? 'fill-current' : ''}"></i> Melden
                                        </button>
                                    ` : ''}

                                    ${(isAuthor || isAdmin) ? (
                                        c.isDeleted ? (
                                            (isAdmin || c.deletedBy !== 'admin') ? `
                                                <button onclick="restoreComment(${article.id}, ${c.id})" class="flex items-center gap-1 text-green-600 hover:text-green-700 font-bold transition-colors cursor-pointer">
                                                    <i data-lucide="refresh-cw" class="w-4 h-4"></i> Wiederherstellen
                                                </button>
                                            ` : `<span class="text-red-500 text-[10px] font-bold flex items-center gap-1" title="Dieser Kommentar wurde von der Moderation gelöscht"><i data-lucide="shield-alert" class="w-3 h-3"></i> Vom Admin entfernt</span>`
                                        ) : `
                                            <button onclick="deleteComment(${article.id}, ${c.id})" class="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                                                <i data-lucide="trash-2" class="w-4 h-4"></i> Löschen
                                            </button>
                                        `
                                    ) : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            
            ${currentUser ? `
                <div class="flex flex-col gap-3 bg-white border border-gray-200 p-4 rounded shadow-sm">
                    <label class="font-bold text-sm text-gray-700 flex items-center gap-2">
                        ${getUserAvatar(currentUser, 'w-6 h-6', 'w-3 h-3', false)}
                        Dein Kommentar als <span class="text-blue-600">${wtEscapeHtml(getDisplayName(currentUser))}</span>
                    </label>
                    <textarea id="newCommentText" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" placeholder="Schreibe einen konstruktiven Kommentar..."></textarea>
                    <button onclick="submitComment(${article.id})" class="bg-blue-900 text-white font-bold py-2 px-6 rounded hover:bg-blue-800 transition-colors self-start cursor-pointer">Kommentieren</button>
                </div>
            ` : `
                <div class="bg-blue-50 p-6 rounded border border-blue-100 text-center">
                    <p class="text-gray-700 font-bold mb-3">Du möchtest mitdiskutieren?</p>
                    <button onclick="showUserLogin()" class="bg-blue-900 text-white font-bold py-2 px-6 rounded hover:bg-blue-800 transition-colors cursor-pointer text-sm">Jetzt einloggen</button>
                </div>
            `}
        </div>
    </article>`;
}

function renderAuthors() {
    const activeAuthorsList = getActiveAuthors();
    return `
    <div class="max-w-5xl mx-auto bg-white p-8 md:p-12 shadow-sm border border-gray-100 min-h-[50vh] font-sans">
        <button onclick="setView('home')" class="flex items-center gap-2 text-blue-600 font-sans font-bold text-sm mb-6 hover:underline cursor-pointer">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
        </button>
        <h2 class="text-4xl font-black mb-8 border-b-2 border-black pb-4 uppercase tracking-tighter">Unsere Redaktion</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            ${activeAuthorsList.map(author => `
                <div class="flex gap-4 border border-gray-200 p-6 rounded-sm bg-gray-50 items-start hover:shadow-md transition-shadow">
                    ${author.imageUrl ? `
                        <img src="${author.imageUrl}" alt="${author.name}" class="w-20 h-20 rounded-full object-cover border-2 border-white shadow-sm shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onclick="showImageModal('${author.imageUrl}')" onerror="this.outerHTML='${getStandardAvatarHtml('w-20 h-20', 'w-10 h-10').replace(/'/g, "\\'").replace(/"/g, '&quot;')}'" />
                    ` : getStandardAvatarHtml('w-20 h-20', 'w-10 h-10')}
                    <div>
                        <h3 class="text-2xl font-bold text-blue-900 mb-2">${author.name}</h3>
                        <p class="text-sm text-gray-700 leading-relaxed">${author.bio || 'Keine Beschreibung verfügbar.'}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;
}

function renderProfile() {
    if (!currentUser) {
        setView('home');
        return '';
    }
    
    const user = registeredUsers.find(u => u.username === currentUser);
    if (!user) return '';
    ensureUserSubscriptions(user);
    const allAuthorNames = getAllAuthorNames();
    const userSubCats = user.subscriptions.categories || [];
    const userSubAuthors = user.subscriptions.authors || [];

    const likedArticles = articles.filter(a => a.likes.includes(currentUser));
    const viewedArticles = articles.filter(a => a.views.includes(currentUser));
    const isBase64 = user.profilePicUrl && user.profilePicUrl.startsWith('data:image');
    const urlValue = isBase64 ? '' : (user.profilePicUrl || '');
    
    return `
    <div class="max-w-4xl mx-auto mt-8 font-sans mb-16">
        <button onclick="setView('home')" class="flex items-center gap-2 text-blue-600 font-sans font-bold text-sm mb-6 hover:underline cursor-pointer px-4 lg:px-0">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
        </button>
        
        <div class="bg-white p-8 border border-gray-200 shadow-sm rounded-sm">
            <div class="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 pb-6 border-b border-gray-200 text-center md:text-left">
                <div class="relative w-32 h-32 shrink-0">
                    ${getUserAvatar(currentUser, 'w-32 h-32', 'w-16 h-16', true)}
                    ${user.profilePicUrl ? '<div class="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow pointer-events-none" title="Klicken für Vollbild"><i data-lucide="zoom-in" class="w-4 h-4"></i></div>' : ''}
                </div>
                <div class="flex-1">
                    <h2 class="text-3xl md:text-4xl font-black uppercase tracking-tight">${getDisplayName(currentUser)}</h2>
                    <p class="text-gray-500 mb-2">Dein persönliches Leser-Profil</p>
                    <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded uppercase font-bold tracking-wider inline-block">Rolle: ${user.role}</span>
                </div>
            </div>
            
            <div class="flex flex-col gap-6">
                <div class="bg-blue-50 p-4 rounded text-sm text-gray-700 flex items-start gap-3">
                    <i data-lucide="info" class="w-5 h-5 text-blue-600 shrink-0"></i>
                    <p>Hier kannst du dein Profilbild anpassen und entscheiden, ob andere deinen echten Namen oder nur deinen Benutzernamen sehen sollen. Klicke auf dein Bild, um es groß anzusehen!</p>
                </div>

                ${isFirebaseConnected ? `
                    <div class="bg-gray-50 p-4 rounded border border-gray-200 text-sm text-gray-700">
                        <p><span class="font-bold">Account:</span> ${user.username}</p>
                        <p class="text-xs text-gray-500 mt-1">Benutzername/Passwort werden im Online-Modus über Firebase verwaltet.</p>
                    </div>
                ` : `
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-2">Benutzername</label>
                        <input type="text" id="profileUsername" value="${user.username}" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                        <p class="text-xs text-gray-500 mt-1">Wenn du deinen Namen änderst, wird dieser auch bei all deinen bisherigen Kommentaren und Likes aktualisiert.</p>
                    </div>

                    <div class="pt-4 border-t border-gray-200 mt-2">
                        <h4 class="font-bold text-gray-700 mb-4">Passwort ändern (optional)</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-2">Neues Passwort</label>
                                <input type="password" id="profileNewPassword" placeholder="Neues Passwort..." class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-2">Neues Passwort bestätigen</label>
                                <input type="password" id="profileConfirmPassword" placeholder="Passwort wiederholen..." class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                            </div>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">Lass diese Felder leer, wenn du dein aktuelles Passwort behalten möchtest.</p>
                    </div>
                `}

                <div class="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                    <input type="checkbox" id="profileShowRealName" ${user.showRealName ? 'checked' : ''} class="w-5 h-5 cursor-pointer text-blue-600 rounded" />
                    <label for="profileShowRealName" class="font-bold text-gray-700 cursor-pointer">Zeige meinen Vor- und Nachnamen anstelle des Benutzernamens</label>
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">Profilbild</label>
                    <div class="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200 rounded">
                        <div>
                            <label class="text-xs text-gray-500 font-bold uppercase mb-1 block">Vom PC hochladen</label>
                            <input type="file" id="profilePicFile" accept="image/*" class="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500" />
                        </div>
                        <div class="flex items-center gap-2">
                            <hr class="flex-1 border-gray-300"><span class="text-xs text-gray-400 font-bold uppercase">oder</span><hr class="flex-1 border-gray-300">
                        </div>
                        <div>
                            <label class="text-xs text-gray-500 font-bold uppercase mb-1 block">Bild-URL eingeben</label>
                            <input type="url" id="profilePicUrl" value="${urlValue}" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white" placeholder="${isBase64 ? 'Eigenes Bild hochgeladen. Neue URL eingeben zum Ersetzen...' : 'https://beispiel.de/mein-bild.jpg'}" />
                        </div>
                        ${user.profilePicUrl ? `
                        <button onclick="clearProfilePic()" class="text-xs bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 font-bold self-start mt-1 transition-colors cursor-pointer">Aktuelles Bild entfernen</button>
                        ` : ''}
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">Über mich (Bio)</label>
                    <textarea id="profileBio" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" placeholder="Schreibe etwas über dich, deine Interessen oder warum du gerne Zeitung liest...">${user.bio || ''}</textarea>
                </div>

                <div class="bg-gray-50 p-5 rounded border border-gray-200">
                    <h4 class="text-lg font-black uppercase mb-3 flex items-center gap-2"><i data-lucide="bell" class="w-5 h-5 text-blue-700"></i> Abos & E-Mail</h4>
                    <label class="flex items-center gap-3 text-sm font-bold text-gray-700 cursor-pointer select-none">
                        <input type="checkbox" id="profileEmailNotifyEnabled" ${user.emailNotifyEnabled ? 'checked' : ''} class="w-5 h-5 cursor-pointer text-blue-600 rounded" />
                        E-Mail Benachrichtigungen aktivieren
                    </label>
                    <p class="text-xs text-gray-600 mt-2">E-Mail: <span class="font-mono">${(user.email || '').trim() || '—'}</span></p>
                    ${!isFirebaseConnected ? `<p class="text-xs text-orange-700 mt-2">Hinweis: E-Mail-Versand funktioniert nur im Online-Modus (Firebase) und benötigt die Firebase Extension "Trigger Email".</p>` : ''}

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div>
                            <p class="text-sm font-black uppercase text-gray-700 mb-2">Kategorien</p>
                            <div class="flex flex-col gap-2 max-h-56 overflow-auto pr-2">
                                ${(categories || []).map(cat => {
                                    const c = (cat || '').trim();
                                    if (!c) return '';
                                    const checked = userSubCats.includes(c) ? 'checked' : '';
                                    const safe = c.replace(/\"/g, '&quot;');
                                    return `<label class="flex items-center gap-3 text-sm text-gray-700 cursor-pointer select-none"><input type="checkbox" class="w-4 h-4 cursor-pointer" data-subcat="${safe}" ${checked} /> ${c}</label>`;
                                }).join('')}
                            </div>
                        </div>
                        <div>
                            <p class="text-sm font-black uppercase text-gray-700 mb-2">Autoren</p>
                            <div class="flex flex-col gap-2 max-h-56 overflow-auto pr-2">
                                ${allAuthorNames.map(aName => {
                                    const a = (aName || '').trim();
                                    if (!a) return '';
                                    const checked = userSubAuthors.includes(a) ? 'checked' : '';
                                    const safe = a.replace(/\"/g, '&quot;');
                                    return `<label class="flex items-center gap-3 text-sm text-gray-700 cursor-pointer select-none"><input type="checkbox" class="w-4 h-4 cursor-pointer" data-subauthor="${safe}" ${checked} /> ${a}</label>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-3">Tipp: Du kannst auch direkt im Artikel bei Autor/Kategorie ein Abo umschalten.</p>
                </div>
                
                <button onclick="saveProfile()" class="bg-blue-900 text-white font-bold py-3 px-4 rounded hover:bg-blue-800 transition-colors mt-2 cursor-pointer flex justify-center items-center gap-2 md:w-1/2">
                    <i data-lucide="save" class="w-5 h-5"></i> Profil speichern
                </button>
                
                <div class="mt-4 pt-6 border-t border-red-200">
                    <h4 class="text-red-600 font-bold mb-2">Gefahrenzone</h4>
                    <button onclick="confirmDeleteOwnAccount()" class="bg-white border border-red-300 text-red-600 font-bold py-2 px-4 rounded hover:bg-red-50 transition-colors text-sm cursor-pointer">Mein Konto dauerhaft löschen</button>
                </div>
            </div>
        </div>

        <div class="mt-8 bg-white p-8 border border-gray-200 shadow-sm rounded-sm">
            <h3 class="text-2xl font-black uppercase mb-6 border-b pb-2">Meine Aktivitäten</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h4 class="font-bold flex items-center gap-2 mb-4 text-gray-700"><i data-lucide="heart" class="w-5 h-5 text-red-500"></i> Gefällt mir (${likedArticles.length})</h4>
                    <ul class="flex flex-col gap-2">
                        ${likedArticles.length === 0 ? '<li class="text-gray-500 text-sm italic">Noch keine Artikel gelikt.</li>' : likedArticles.map(a => `
                            <li><button onclick="openArticle(${a.id})" class="text-left text-sm text-blue-700 hover:underline line-clamp-1">${a.title}</button></li>
                        `).join('')}
                    </ul>
                </div>
                <div>
                    <h4 class="font-bold flex items-center gap-2 mb-4 text-gray-700"><i data-lucide="eye" class="w-5 h-5 text-blue-500"></i> Zuletzt gelesen (${viewedArticles.length})</h4>
                    <ul class="flex flex-col gap-2">
                        ${viewedArticles.length === 0 ? '<li class="text-gray-500 text-sm italic">Noch keine Artikel gelesen.</li>' : viewedArticles.map(a => `
                            <li><button onclick="openArticle(${a.id})" class="text-left text-sm text-blue-700 hover:underline line-clamp-1">${a.title}</button></li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        </div>
    </div>`;
}


function wtNormalizeSearch(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function wtExpandedSearchTerms(query) {
    const base = wtNormalizeSearch(query).split(" ").filter(Boolean);
    const related = {
        wohnen: ["wohnung", "wohnungen", "wohnraum", "miete", "mieten", "mietzins", "bezahlbar", "guenstig", "günstig"],
        wohnung: ["wohnen", "wohnungen", "wohnraum", "miete", "bezahlbar"],
        wohnungen: ["wohnen", "wohnung", "wohnraum", "miete", "bezahlbar"],
        guenstig: ["günstig", "bezahlbar", "preiswert", "miete", "wohnen", "wohnungen"],
        günstig: ["guenstig", "bezahlbar", "preiswert", "miete", "wohnen", "wohnungen"],
        flug: ["flugzeug", "flugzeuge", "airbus", "boeing", "airport", "flughafen"],
        flugzeug: ["flug", "flugzeuge", "airbus", "boeing", "airport", "flughafen"],
        spiel: ["spiele", "sudoku", "kreuzwortraetsel", "kreuzworträtsel", "raetsel", "rätsel", "solitaire"],
        spiele: ["spiel", "sudoku", "kreuzwortraetsel", "kreuzworträtsel", "raetsel", "rätsel", "solitaire"]
    };
    const result = new Set(base);
    base.forEach(term => {
        (related[term] || []).forEach(x => result.add(wtNormalizeSearch(x)));
        if (term.endsWith("en") && term.length > 5) result.add(term.slice(0, -2));
        if (term.endsWith("ungen") && term.length > 8) result.add(term.slice(0, -5));
        if (term.endsWith("ung") && term.length > 6) result.add(term.slice(0, -3));
    });
    return Array.from(result).filter(Boolean);
}

function wtMeaningfulSearchTerms(query) {
    const stopWords = new Set([
        "der", "die", "das", "den", "dem", "des", "ein", "eine", "einer", "eines", "und", "oder",
        "mit", "von", "vom", "im", "in", "am", "an", "auf", "aus", "zu", "zur", "zum", "fuer",
        "fur", "ist", "sind", "war", "waren", "bei", "nach", "vor", "ueber", "uber", "als", "auch"
    ]);

    return wtNormalizeSearch(query)
        .split(" ")
        .map(term => term.trim())
        .filter(term => term && !stopWords.has(term))
        .filter(term => term.length >= 3 || /\d/.test(term));
}

function wtSearchTermGroups(query) {
    return wtMeaningfulSearchTerms(query).map(term => {
        const group = new Set(wtExpandedSearchTerms(term));
        group.add(term);
        return Array.from(group).filter(Boolean);
    });
}

function wtSearchTermMatchesWord(term, word, text) {
    if (!term || !word) return false;
    if (word === term) return true;
    if (term.length >= 4 && (word.startsWith(term) || term.startsWith(word))) return true;
    if (term.length >= 5 && word.length >= 5 && (word.includes(term) || term.includes(word))) return true;
    if (term.length >= 6 && word.length >= 6 && word.slice(0, 5) === term.slice(0, 5)) return true;
    if (term.length >= 5 && word.length >= 5 && Math.abs(term.length - word.length) <= 1) {
        let misses = 0;
        const maxLen = Math.max(term.length, word.length);
        for (let i = 0; i < maxLen; i++) {
            if (term[i] !== word[i]) misses += 1;
            if (misses > 1) break;
        }
        if (misses <= 1) return true;
    }
    return term.length >= 4 && text.includes(term);
}

function wtArticleMatchesSearch(article, query) {
    const termGroups = wtSearchTermGroups(query);
    if (!termGroups.length) return false;

    const text = wtNormalizeSearch([
        article && article.title,
        article && article.summary,
        article && article.content,
        article && article.category,
        article && article.author
    ].join(" "));

    const words = text.split(" ").filter(Boolean);

    const matchedGroups = termGroups.filter(group => {
        return group.some(term => words.some(word => wtSearchTermMatchesWord(term, word, text)));
    });

    const requiredMatches = termGroups.length <= 2 ? termGroups.length : Math.ceil(termGroups.length * 0.6);
    return matchedGroups.length >= requiredMatches;
}

function renderSearchResults() {
    const now = new Date();
    const currentArticles = articles;
    
    let results = [];
    let titleHtml = "";
    let hasSearchTerms = true;

    if (searchCategory) {
        results = currentArticles.filter(a => a.category === searchCategory);
        titleHtml = `Ressort: ${searchCategory}`;
    } else {
        const query = searchQuery;
        hasSearchTerms = wtSearchTermGroups(query).length > 0;
        results = hasSearchTerms ? currentArticles.filter(a => wtArticleMatchesSearch(a, query)) : [];
        titleHtml = `Suchergebnisse für "${searchQuery}"`;
    }

    let html = `
    <div class="max-w-4xl mx-auto bg-white p-6 md:p-12 shadow-sm border border-gray-100 min-h-[50vh]">
        <button onclick="setView('home'); isSearchOpen = false; renderApp();" class="flex items-center gap-2 text-blue-600 font-sans font-bold text-sm mb-6 hover:underline cursor-pointer">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
        </button>
        <h2 class="text-3xl font-black mb-2">${titleHtml}</h2>
        <p class="mb-8 text-gray-600 font-sans font-bold">${results.length} Artikel in dieser Ansicht</p>
        <div class="flex flex-col gap-8">
    `;

    if (results.length === 0) {
        html += `<p class="text-lg text-gray-700">${hasSearchTerms ? 'Leider wurden keine passenden Artikel gefunden.' : 'Bitte gib ein konkreteres Suchwort ein.'}</p>`;
    } else {
        results.forEach(article => {
            const displayImage = article.imageUrl || getFallbackImage(article.category);
            const safeImage = wtEscapeHtml(displayImage || "");
            const safeTitle = wtEscapeHtml(article.title || "");
            const safeCategory = wtEscapeHtml(article.category || "");
            const safeSummary = wtEscapeHtml(article.summary || "");
            html += `
            <article onclick="openArticle(${article.id})" class="group cursor-pointer flex flex-col md:flex-row gap-6 border-b border-gray-200 pb-8 last:border-0">
                <img src="${safeImage}" alt="${safeTitle}" class="w-full md:w-48 h-32 object-cover rounded-sm group-hover:opacity-90 transition-opacity" />
                <div class="flex-1">
                    <span class="text-blue-700 font-bold text-xs uppercase font-sans flex items-center gap-4 mb-2">
                        ${safeCategory}
                        <span class="text-gray-400 font-normal flex items-center gap-1"><i data-lucide="eye" class="w-3 h-3"></i> ${article.views.length}</span>
                    </span>
                    <h3 class="text-xl md:text-2xl font-bold leading-snug group-hover:text-blue-700 transition-colors mb-2">${safeTitle}</h3>
                    <p class="text-sm text-gray-600 line-clamp-2">${safeSummary}</p>
                </div>
            </article>`;
        });
    }

    html += `</div></div>`;
    return html;
}

function escapeNavText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getPublicCategoriesForNav() {
    const out = [];
    const add = value => {
        const cat = String(value || "").trim();
        if (cat && !out.includes(cat)) out.push(cat);
    };
    try { (Array.isArray(categories) ? categories : []).forEach(add); } catch (_) {}
    try { (Array.isArray(window.categories) ? window.categories : []).forEach(add); } catch (_) {}
    try { (Array.isArray(articles) ? articles : []).forEach(article => add(article && article.category)); } catch (_) {}
    try {
        const backup = JSON.parse(localStorage.getItem("wt_categories_backup") || "[]");
        (Array.isArray(backup) ? backup : []).forEach(add);
    } catch (_) {}
    return out;
}

function renderFooter() {
    const footerCategories = getPublicCategoriesForNav();

    return `
    <footer class="bg-black text-white mt-12 py-12 px-4 font-sans">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
                <h2 class="text-2xl font-black uppercase font-serif mb-4">Winterthur Times</h2>
                <p class="text-gray-400 text-sm mb-6">Unabhängiges Schulprojekt. Von der MSW.</p>
                <p class="text-gray-500 text-xs">Kontakt: Nutze den Support-Chat unten rechts.</p>
            </div>
            <div>
                <h4 class="font-bold uppercase tracking-wider mb-4 text-gray-300">Ressorts</h4>
                <ul class="flex flex-col gap-2 text-sm text-gray-400">
                    ${footerCategories.map(cat => {
                        const safeCat = escapeNavText(cat);
                        return `<li><span data-category="${safeCat}" onclick="executeSearchCategory(this.dataset.category); window.scrollTo(0,0);" class="cursor-pointer hover:text-white transition-colors">${safeCat}</span></li>`;
                    }).join('')}
                </ul>
            </div>
            <div>
                <h4 class="font-bold uppercase tracking-wider mb-4 text-gray-300">Service</h4>
                <ul class="flex flex-col gap-2 text-sm text-gray-400">
                    <li><span onclick="setView('gallery'); window.scrollTo(0,0);" class="cursor-pointer hover:text-white transition-colors">Tagesbilder (Community)</span></li>
                    <li><span onclick="openFeedbackChat()" class="cursor-pointer text-blue-400 font-bold hover:text-white transition-colors flex items-center gap-1"><i data-lucide="message-square-plus" class="w-4 h-4"></i> Website bewerten</span></li>
                </ul>
            </div>
            <div>
                <h4 class="font-bold uppercase tracking-wider mb-4 text-gray-300">Verlag</h4>
                <ul class="flex flex-col gap-2 text-sm text-gray-400">
                    <li><span onclick="setView('authors'); window.scrollTo(0,0);" class="cursor-pointer hover:text-white transition-colors">Unsere Autoren</span></li>
                    <li><span onclick="openAboutUs()" class="cursor-pointer hover:text-white transition-colors">&Uuml;ber uns</span></li>
                    <li><span onclick="openFeedbackChat()" class="cursor-pointer hover:text-white transition-colors">Kontakt</span></li>
                    <li class="mt-4">
                        <button onclick="setView('admin-login')" class="text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1 text-xs uppercase tracking-wider font-bold">
                            <i data-lucide="lock" class="w-3 h-3"></i> main-Admin Login
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    </footer>`;
}

window.openAboutUs = async function() {
    showModal("&Uuml;ber uns", "Text wird geladen...");

    for (const url of WT_ABOUT_TEXT_URLS) {
        try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = (await res.text()).trim();
            if (!text) throw new Error("Leere TXT-Datei");
            currentModal = {
                title: "&Uuml;ber uns",
                message: wtPlainTextToHtml(text)
            };
            renderApp();
            return;
        } catch (err) {
            console.warn("Ueber-uns-Text konnte nicht geladen werden:", url, err);
        }
    }

    currentModal = {
        title: "&Uuml;ber uns",
        message: wtPlainTextToHtml("Winterthur Times ist ein unabhaengiges regionales Medienprojekt aus Winterthur.")
    };
    renderApp();
}

function renderSystemNotice() {
    if (!wtSystemNotice) return "";
    const typeClass = wtSystemNotice.type === "error" ? "error" : "warning";
    return `
        <div class="wt-system-notice ${typeClass}" role="status">
            <strong>${wtSystemNotice.title}</strong>
            <span>${wtSystemNotice.message}</span>
        </div>
    `;
}

window.wtGetPublicSupportContext = function() {
    const activeCategories = getPublicCategoriesForNav();
    const currentView = typeof view === "string" ? view : "home";
    const currentCategory = typeof searchCategory === "string" && searchCategory ? searchCategory : "";

    return [
        `Aktuelle Ressorts/Kategorien: ${activeCategories.join(", ") || "keine"}.`,
        "Diese Ressorts sind im Menue und unten im Footer unter Ressorts anklickbar.",
        "Neue Ressorts aus dem Admin Panel gelten sofort als echte Ressorts der Website.",
        `Aktueller Bereich des Nutzers: ${currentView}${currentCategory ? " / Ressort " + currentCategory : ""}.`
    ].join("\n");
};

window.wtGetPublicSupportCategories = function() {
    return getPublicCategoriesForNav();
};


function openMenuCategory(category) {
    isMenuOpen = false;
    isSearchOpen = false;

    if (category === "Spiele") {
        window.wtSelectedGame = window.wtSelectedGame || "solitaire";
        setView("games");
        return;
    }

    searchCategory = category;
    searchQuery = "";
    setView("search");
}

function renderMenuOverlay() {
    if (!isMenuOpen) return '';
    const menuCategories = getPublicCategoriesForNav();
    return `
    <div class="fixed inset-0 bg-black/60 z-50 flex">
        <div class="wt-mobile-menu-panel-safe bg-white w-64 md:w-80 h-full shadow-2xl flex flex-col animate-slide-in">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 class="text-2xl font-black uppercase font-serif tracking-tight">Menü</h2>
                <button onclick="toggleMenu()" class="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-600">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <nav class="wt-mobile-menu-scroll flex-1 overflow-y-auto p-4 bg-white">
                <ul class="flex flex-col gap-1 font-sans font-bold text-lg text-gray-800">
                    <li><button onclick="isMenuOpen=false; setView('home');" class="mobile-menu-item w-full text-left px-3 py-4 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors flex items-center justify-between group">Startseite <i data-lucide="chevron-right" class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"></i></button></li>
                    <li><button onclick="isMenuOpen=false; setView('gallery');" class="mobile-menu-item w-full text-left px-3 py-4 hover:bg-green-50 hover:text-green-700 rounded transition-colors flex items-center justify-between group">Tagesbilder <i data-lucide="chevron-right" class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"></i></button></li>
                    ${menuCategories.map(cat => {
                        const safeCat = escapeNavText(cat);
                        return `<li><button data-category="${safeCat}" onclick="openMenuCategory(this.dataset.category)" class="mobile-menu-item w-full text-left px-3 py-4 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors flex items-center justify-between group">${safeCat} <i data-lucide="chevron-right" class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"></i></button></li>`;
                    }).join('')}
                </ul>
            </nav>
        </div>
        <div class="flex-1 cursor-pointer" onclick="toggleMenu()" title="Menü schließen"></div>
    </div>`;
}

function renderModal() {
    if (!currentModal) return '';

    if (currentModal.type === 'image') {
        return `
        <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] px-4" onclick="closeModal()">
            <div class="relative max-w-4xl w-full flex justify-center" onclick="event.stopPropagation()">
                <button onclick="closeModal()" class="absolute -top-12 right-0 text-white hover:text-gray-300 cursor-pointer"><i data-lucide="x" class="w-8 h-8"></i></button>
                <img src="${currentModal.url}" class="max-w-full max-h-[85vh] rounded object-contain shadow-2xl" alt="Vollbild" />
            </div>
        </div>`;
    }

    return `
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] px-4">
        <div class="bg-white p-8 rounded-sm shadow-xl max-w-sm w-full font-sans">
            <h3 class="text-2xl font-black mb-3">${currentModal.title}</h3>
            ${currentModal.message ? `<p class="text-gray-600 mb-6 leading-relaxed">${currentModal.message}</p>` : ''}
            
            ${currentModal.type === 'login' ? `
                <div class="flex flex-col gap-3 mb-6">
                    <input type="text" id="usernameInput" placeholder="Benutzername oder E-Mail" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans" onkeypress="if(event.key === 'Enter') { event.preventDefault(); document.getElementById('passwordInput').focus(); }" />
                    <input type="password" id="passwordInput" placeholder="Passwort" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans" onkeypress="if(event.key === 'Enter') { event.preventDefault(); loginUser(); }" />
                    <p id="loginWarning" class="text-red-500 text-sm hidden font-bold mt-1"></p>
                </div>
                <div class="flex flex-col gap-3">
                    <button onclick="loginUser()" class="w-full bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition-colors cursor-pointer">Einloggen</button>
                    <button onclick="requestPasswordResetFromLogin()" class="w-full bg-white text-blue-900 border border-blue-200 font-bold py-2 rounded hover:bg-blue-50 transition-colors cursor-pointer">Passwort vergessen?</button>
                    <div class="text-center text-sm text-gray-600 mt-1">
                        Noch keinen Account? <button onclick="showUserRegister()" class="text-blue-700 font-bold hover:underline cursor-pointer">Hier erstellen</button>
                    </div>
                    <button onclick="closeModal()" class="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded hover:bg-gray-300 transition-colors cursor-pointer mt-2">Abbrechen</button>
                </div>
            ` : currentModal.type === 'register' ? `
                <div class="flex flex-col gap-3 mb-6">
                    <input type="text" id="usernameInput" placeholder="Benutzername" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans" onkeypress="if(event.key === 'Enter') { event.preventDefault(); document.getElementById('firstNameInput').focus(); }" />
                    <input type="text" id="firstNameInput" placeholder="Vorname" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans" onkeypress="if(event.key === 'Enter') { event.preventDefault(); document.getElementById('lastNameInput').focus(); }" />
                    <input type="text" id="lastNameInput" placeholder="Nachname" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans" onkeypress="if(event.key === 'Enter') { event.preventDefault(); document.getElementById('emailInput').focus(); }" />
                    <input type="email" id="emailInput" placeholder="E-Mail" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans" onkeypress="if(event.key === 'Enter') { event.preventDefault(); document.getElementById('passwordInput').focus(); }" />
                    <input type="password" id="passwordInput" placeholder="Passwort" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans" onkeypress="if(event.key === 'Enter') { event.preventDefault(); registerUser(); }" />
                    <p id="loginWarning" class="text-red-500 text-sm hidden font-bold mt-1"></p>
                </div>
                <div class="flex flex-col gap-3">
                    <button onclick="registerUser()" class="w-full bg-green-700 text-white font-bold py-3 rounded hover:bg-green-600 transition-colors cursor-pointer">Account erstellen</button>
                    <div class="text-center text-sm text-gray-600 mt-1">
                        Bereits registriert? <button onclick="showUserLogin()" class="text-blue-700 font-bold hover:underline cursor-pointer">Hier einloggen</button>
                    </div>
                    <button onclick="closeModal()" class="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded hover:bg-gray-300 transition-colors cursor-pointer mt-2">Abbrechen</button>
                </div>
            ` : currentModal.onConfirm ? `
                <div class="flex gap-4">
                    <button onclick="closeModal()" class="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded hover:bg-gray-300 transition-colors cursor-pointer">Abbrechen</button>
                    <button onclick="executeConfirm()" class="w-full bg-red-600 text-white font-bold py-3 rounded hover:bg-red-700 transition-colors cursor-pointer">Bestätigen</button>
                </div>
            ` : `
                <button onclick="closeModal()" class="w-full bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition-colors cursor-pointer">Verstanden</button>
            `}
        </div>
    </div>`;
}

function preserveAuthModalDraft() {
    if (!currentModal || (currentModal.type !== 'login' && currentModal.type !== 'register')) return;
    const ids = ['usernameInput', 'passwordInput', 'firstNameInput', 'lastNameInput', 'emailInput'];
    const values = {};
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) values[id] = el.value;
    });
    const warning = document.getElementById('loginWarning');
    authModalDraft = {
        type: currentModal.type,
        values,
        warningText: warning ? warning.textContent : '',
        warningHidden: warning ? warning.classList.contains('hidden') : true
    };
}

function restoreAuthModalDraft() {
    if (!authModalDraft || !currentModal || currentModal.type !== authModalDraft.type) return;
    Object.entries(authModalDraft.values || {}).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    });
    const warning = document.getElementById('loginWarning');
    if (warning) {
        warning.textContent = authModalDraft.warningText || '';
        warning.classList.toggle('hidden', authModalDraft.warningHidden !== false);
    }
}

function renderGatekeeper() {
    return `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 font-sans px-4">
        <div class="bg-white p-8 rounded-sm shadow-xl max-w-md w-full text-center border border-gray-200">
            <h1 class="text-4xl font-black font-serif mb-4 uppercase tracking-tighter">Winterthur Times</h1>
            <div class="bg-blue-50 p-4 rounded mb-6 text-sm text-blue-800 border border-blue-100 text-left">
                <span class="font-bold block mb-1">Geschlossene Testphase</span>
                Diese Webseite ist derzeit nur für eingeladene Teilnehmer zugänglich.
            </div>
            <p class="mb-2 text-gray-700 text-sm font-bold text-left">Gib deine E-Mail Adresse ein:</p>
            <input type="email" id="gatekeeperEmail" class="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 mb-2 font-sans" placeholder="E-Mail Adresse..." onkeypress="if(event.key === 'Enter') checkGatekeeperEmail()" />
            <p id="gatekeeperError" class="text-red-500 text-xs font-bold hidden mb-4 text-left">Diese Website ist noch nicht für dich verfügbar.</p>
            <button onclick="checkGatekeeperEmail()" class="w-full bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition-colors mt-2 shadow-sm cursor-pointer">Eintreten</button>
        </div>
    </div>`;
}

window.checkGatekeeperEmail = function() {
    const input = document.getElementById('gatekeeperEmail');
    const error = document.getElementById('gatekeeperError');
    if (input && input.value.trim().toLowerCase().endsWith('@stud.msw.ch')) {
        hasPassedGatekeeper = true;
        renderApp();
    } else {
        error.classList.remove('hidden');
    }
}

let activeInputId = null;
let activeInputSelectionStart = null;
let activeInputSelectionEnd = null;

function preserveFocus() {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && active.id) {
        activeInputId = active.id;
        try {
            activeInputSelectionStart = active.selectionStart;
            activeInputSelectionEnd = active.selectionEnd;
        } catch(e){}
    } else {
        activeInputId = null;
    }
}

function restoreFocus() {
    if (activeInputId) {
        const el = document.getElementById(activeInputId);
        if (el) {
            el.focus();
            if (activeInputSelectionStart !== null) {
                try { el.setSelectionRange(activeInputSelectionStart, activeInputSelectionEnd); } catch(e){}
            }
        }
    }
}



/* =========================================================
   Startseiten-Solitaire unten links neben Kreuzworträtsel
   ========================================================= */
function renderHomeSolitaireWidget() {
    return `
        <section id="wtHomeSolitaireMount" class="wt-home-solitaire-mount">
            ${renderSimpleSolitaireGame ? renderSimpleSolitaireGame() : ''}
        </section>
    `;
}


/* =========================================================
   Saubere Solitaire-Engine – ein Handler, keine Konflikte
   ========================================================= */
function wtSolitaireCreateDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const colors = { "♠": "black", "♣": "black", "♥": "red", "♦": "red" };
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const deck = [];
    suits.forEach(suit => ranks.forEach((rank, index) => {
        deck.push({
            id: `${rank}${suit}`,
            suit,
            rank,
            value: index + 1,
            color: colors[suit],
            faceUp: false
        });
    }));
    return deck;
}

function wtSolitaireShuffle(deck) {
    const cards = deck.slice();
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
}

function wtSolitaireNewGame() {
    const deck = wtSolitaireShuffle(wtSolitaireCreateDeck());
    const tableau = Array.from({ length: 7 }, () => []);

    for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
            const card = deck.pop();
            card.faceUp = row === col;
            tableau[col].push(card);
        }
    }

    window.wtSolitaire = {
        stock: deck,
        waste: [],
        foundations: { "♠": [], "♥": [], "♦": [], "♣": [] },
        tableau,
        moves: 0,
        selected: null,
        history: []
    };

    wtSolitaireSave();
}

function wtSolitaireSave() {
    try {
        localStorage.setItem("wt_solitaire_clean_v1", JSON.stringify(window.wtSolitaire));
    } catch (_) {}
}

function wtSolitaireLoad() {
    if (window.wtSolitaire && Array.isArray(window.wtSolitaire.tableau)) return;

    try {
        const saved = JSON.parse(localStorage.getItem("wt_solitaire_clean_v1") || "null");
        if (saved && Array.isArray(saved.tableau) && saved.foundations && Array.isArray(saved.stock)) {
            window.wtSolitaire = saved;
        }
    } catch (_) {}

    if (!window.wtSolitaire || !Array.isArray(window.wtSolitaire.tableau)) {
        wtSolitaireNewGame();
    }
}

function wtSolitaireSnapshot() {
    wtSolitaireLoad();
    const g = window.wtSolitaire;
    try {
        g.history = g.history || [];
        g.history.push(JSON.stringify({
            stock: g.stock,
            waste: g.waste,
            foundations: g.foundations,
            tableau: g.tableau,
            moves: g.moves
        }));
        if (g.history.length > 60) g.history.shift();
    } catch (_) {}
}

function wtSolitaireUndo() {
    wtSolitaireLoad();
    const g = window.wtSolitaire;
    const last = g.history && g.history.pop();

    if (!last) {
        g.selected = null;
        wtSolitaireSave();
        renderApp();
        return;
    }

    const old = JSON.parse(last);
    window.wtSolitaire = {
        ...g,
        ...old,
        selected: null,
        history: g.history || []
    };

    wtSolitaireSave();
    renderApp();
}

function wtSolitaireDraw() {
    wtSolitaireLoad();
    const g = window.wtSolitaire;

    wtSolitaireSnapshot();

    if (g.stock.length) {
        const card = g.stock.pop();
        card.faceUp = true;
        g.waste.push(card);
    } else {
        g.stock = g.waste.reverse().map(card => ({ ...card, faceUp: false }));
        g.waste = [];
    }

    g.moves += 1;
    g.selected = null;
    wtSolitaireSave();
    renderApp();
}

function wtSolitaireSelectedCards() {
    wtSolitaireLoad();
    const g = window.wtSolitaire;
    const s = g.selected;

    if (!s) return [];
    if (s.type === "waste") return g.waste.length ? [g.waste[g.waste.length - 1]] : [];
    if (s.type === "tableau") return g.tableau[s.col].slice(s.index);
    return [];
}

function wtSolitaireSameSelection(a, b) {
    return !!a && !!b && a.type === b.type && a.col === b.col && a.index === b.index;
}

function wtSolitaireCanTable(card, target) {
    if (!card) return false;
    if (!target) return card.value === 13;
    return card.value === target.value - 1 && card.color !== target.color;
}

function wtSolitaireCanFoundation(card, pile) {
    if (!card) return false;
    if (!pile.length) return card.value === 1;
    const top = pile[pile.length - 1];
    return card.suit === top.suit && card.value === top.value + 1;
}

function wtSolitaireRemoveSelected() {
    wtSolitaireLoad();
    const g = window.wtSolitaire;
    const s = g.selected;

    if (!s) return;

    if (s.type === "waste") {
        g.waste.pop();
    }

    if (s.type === "tableau") {
        g.tableau[s.col].splice(s.index);
        const col = g.tableau[s.col];
        if (col.length && !col[col.length - 1].faceUp) {
            col[col.length - 1].faceUp = true;
        }
    }
}

function wtSolitaireMoveToColumn(col) {
    wtSolitaireLoad();
    const g = window.wtSolitaire;
    const cards = wtSolitaireSelectedCards();
    if (!g.selected || !cards.length) return false;

    const targetPile = g.tableau[col];
    const targetTop = targetPile[targetPile.length - 1];

    if (!wtSolitaireCanTable(cards[0], targetTop)) return false;

    wtSolitaireSnapshot();
    wtSolitaireRemoveSelected();
    cards.forEach(card => targetPile.push({ ...card, faceUp: true }));
    g.moves += 1;
    g.selected = null;
    wtSolitaireSave();
    renderApp();
    return true;
}

function wtSolitaireMoveToFoundation(suit) {
    wtSolitaireLoad();
    const g = window.wtSolitaire;
    const cards = wtSolitaireSelectedCards();

    if (!g.selected || cards.length !== 1) return false;

    const card = cards[0];
    const pile = g.foundations[suit];

    if (card.suit !== suit || !wtSolitaireCanFoundation(card, pile)) return false;

    wtSolitaireSnapshot();
    wtSolitaireRemoveSelected();
    pile.push({ ...card, faceUp: true });
    g.moves += 1;
    g.selected = null;
    wtSolitaireSave();
    renderApp();
    return true;
}

function wtSolitaireHint() {
    wtSolitaireLoad();
    const g = window.wtSolitaire;
    let msg = "Wähle eine offene Karte und klicke danach auf eine passende Spalte oder oben auf den passenden Stapel.";

    const waste = g.waste[g.waste.length - 1];
    if (waste && wtSolitaireCanFoundation(waste, g.foundations[waste.suit])) {
        msg = `Lege ${waste.rank}${waste.suit} oben auf den ${waste.suit}-Stapel.`;
    } else if (waste) {
        for (let i = 0; i < 7; i++) {
            const top = g.tableau[i][g.tableau[i].length - 1];
            if (wtSolitaireCanTable(waste, top)) {
                msg = `Lege ${waste.rank}${waste.suit} in Spalte ${i + 1}.`;
                break;
            }
        }
    }

    const el = document.getElementById("wtSolitaireHint");
    if (el) el.textContent = "Tipp: " + msg;
}

function wtSolCardHtml(card, attrs = "", selected = false) {
    if (!card) return `<button type="button" class="wt-sol-card empty" ${attrs}></button>`;

    if (!card.faceUp) {
        return `<button type="button" class="wt-sol-card back" ${attrs}>WT</button>`;
    }

    return `
        <button type="button" class="wt-sol-card ${card.color} ${selected ? "selected" : ""}" ${attrs}>
            <span>${card.rank}</span>
            <strong>${card.suit}</strong>
        </button>
    `;
}

function renderSimpleSolitaireGame() {
    wtSolitaireLoad();
    const g = window.wtSolitaire;
    const waste = g.waste[g.waste.length - 1];

    const foundations = ["♠", "♥", "♦", "♣"].map(suit => {
        const pile = g.foundations[suit];
        const top = pile[pile.length - 1];
        return top
            ? wtSolCardHtml(top, `data-wt-foundation="${suit}"`)
            : `<button type="button" class="wt-sol-card empty" data-wt-foundation="${suit}">${suit}</button>`;
    }).join("");

    const columns = g.tableau.map((col, c) => {
        const cards = col.map((card, i) => {
            const isSelected = g.selected && g.selected.type === "tableau" && g.selected.col === c && g.selected.index === i;
            return `<div class="wt-sol-pos" style="top:${i * 26}px">${wtSolCardHtml(card, `data-wt-sol-card="${c}" data-wt-sol-index="${i}"`, isSelected)}</div>`;
        }).join("");

        return `
            <div class="wt-sol-column" data-wt-sol-column="${c}">
                ${cards || `<button type="button" class="wt-sol-card empty" data-wt-sol-column="${c}">K</button>`}
            </div>
        `;
    }).join("");

    return `
        <section class="wt-solitaire-game">
            <div class="wt-sol-head">
                <div>
                    <h2>Solitaire</h2>
                    <p>Klicke eine Karte an und danach den Zielstapel. Wenn ein Zug nicht möglich ist, kannst du direkt eine andere Karte wählen.</p>
                </div>
                <div class="wt-sol-actions">
                    <button type="button" onclick="wtSolitaireHint()">Tipps</button>
                    <button type="button" onclick="wtSolitaireUndo()">Zurück</button>
                    <button type="button" onclick="wtSolitaireNewGame(); renderApp();">Neu starten</button>
                </div>
            </div>
            <div class="wt-sol-status">Züge: ${g.moves} · Nachziehstapel: ${g.stock.length}</div>
            <div class="wt-sol-top">
                <button type="button" class="wt-sol-card ${g.stock.length ? "back" : "empty"}" onclick="wtSolitaireDraw()">${g.stock.length ? "WT" : "↻"}</button>
                ${waste ? wtSolCardHtml(waste, "data-wt-waste", g.selected && g.selected.type === "waste") : `<button type="button" class="wt-sol-card empty"></button>`}
                <div class="wt-sol-foundations">${foundations}</div>
            </div>
            <div class="wt-sol-tableau">${columns}</div>
            <p id="wtSolitaireHint" class="wt-sol-hint">Tipp: Karten auf den unteren Stapeln müssen abwechselnd rot/schwarz liegen. Asse kommen nach oben.</p>
        </section>
    `;
}

/* Einziger Solitaire-Klickhandler */
(function wtSolitaireSingleClickHandler() {
    if (window.__wtSolitaireSingleClickHandler) return;
    window.__wtSolitaireSingleClickHandler = true;

    function isSolitaireArea(target) {
        return !!(target && target.closest && target.closest(".wt-solitaire-game"));
    }

    function handle(event) {
        if (!isSolitaireArea(event.target)) return;

        // Buttons mit onclick normal arbeiten lassen
        if (
            event.target.closest("[onclick*='wtSolitaireHint']") ||
            event.target.closest("[onclick*='wtSolitaireUndo']") ||
            event.target.closest("[onclick*='wtSolitaireNewGame']") ||
            event.target.closest("[onclick*='wtSolitaireDraw']")
        ) return;

        wtSolitaireLoad();
        const g = window.wtSolitaire;

        const foundation = event.target.closest("[data-wt-foundation]");
        const waste = event.target.closest("[data-wt-waste]");
        const cardBtn = event.target.closest("[data-wt-sol-card]");
        const column = event.target.closest("[data-wt-sol-column]");

        if (!foundation && !waste && !cardBtn && !column) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (waste) {
            const next = { type: "waste" };
            g.selected = wtSolitaireSameSelection(g.selected, next) ? null : next;
            wtSolitaireSave();
            renderApp();
            return;
        }

        if (foundation) {
            if (!g.selected) return;
            const moved = wtSolitaireMoveToFoundation(foundation.dataset.wtFoundation);
            if (!moved) {
                g.selected = null;
                wtSolitaireSave();
                renderApp();
            }
            return;
        }

        if (cardBtn) {
            const col = Number(cardBtn.dataset.wtSolCard);
            const index = Number(cardBtn.dataset.wtSolIndex);
            const card = g.tableau[col] && g.tableau[col][index];
            if (!card) return;

            if (!card.faceUp && index === g.tableau[col].length - 1) {
                wtSolitaireSnapshot();
                card.faceUp = true;
                g.moves += 1;
                g.selected = null;
                wtSolitaireSave();
                renderApp();
                return;
            }

            const clicked = { type: "tableau", col, index };

            // Gleiche Karte nochmals anklicken = abwählen
            if (wtSolitaireSameSelection(g.selected, clicked)) {
                g.selected = null;
                wtSolitaireSave();
                renderApp();
                return;
            }

            // Wenn schon etwas ausgewählt ist: Zug versuchen.
            // Wenn der Zug nicht geht: sofort die neu geklickte Karte auswählen.
            if (g.selected) {
                const moved = wtSolitaireMoveToColumn(col);
                if (!moved) {
                    g.selected = clicked;
                    wtSolitaireSave();
                    renderApp();
                }
                return;
            }

            g.selected = clicked;
            wtSolitaireSave();
            renderApp();
            return;
        }

        if (column) {
            if (!g.selected) return;

            const moved = wtSolitaireMoveToColumn(Number(column.dataset.wtSolColumn));
            if (!moved) {
                g.selected = null;
                wtSolitaireSave();
                renderApp();
            }
        }
    }

    document.addEventListener("click", handle, true);

    document.addEventListener("touchend", function(event) {
        if (!isSolitaireArea(event.target)) return;
        handle(event);
    }, { passive: false, capture: true });
})();


function renderGamesPage() {
    return `
    <div class="max-w-6xl mx-auto bg-white p-6 md:p-10 border border-gray-200 shadow-sm">
        <div class="border-b-4 border-gray-900 pb-5 mb-8">
            <p class="text-blue-700 font-black uppercase tracking-widest text-sm mb-2">Ressort</p>
            <h1 class="text-4xl md:text-6xl font-black font-serif leading-none">Spiele</h1>
            <p class="mt-4 text-gray-600 font-sans max-w-2xl">Wähle ein Spiel aus. Sudoku, Kreuzworträtsel und das tägliche Rätsel bleiben zusätzlich wie bisher auf der Startseite sichtbar.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <button onclick="window.wtSelectedGame='solitaire'; renderApp();" class="wt-game-select-card ${window.wtSelectedGame !== 'sudoku' && window.wtSelectedGame !== 'crossword' && window.wtSelectedGame !== 'riddle' ? 'active' : ''}">
                <strong>Solitaire</strong><span>Kartenspiel mit Neu starten, Zurück und Tipps.</span>
            </button>
            <button onclick="window.wtSelectedGame='sudoku'; renderApp();" class="wt-game-select-card ${window.wtSelectedGame === 'sudoku' ? 'active' : ''}">
                <strong>Sudoku</strong><span>9x9 Zahlenrätsel.</span>
            </button>
            <button onclick="window.wtSelectedGame='crossword'; renderApp();" class="wt-game-select-card ${window.wtSelectedGame === 'crossword' ? 'active' : ''}">
                <strong>Kreuzworträtsel</strong><span>Fragen mit waagerecht und senkrecht.</span>
            </button>
            <button onclick="window.wtSelectedGame='riddle'; renderApp();" class="wt-game-select-card ${window.wtSelectedGame === 'riddle' ? 'active' : ''}">
                <strong>Tägliches Rätsel</strong><span>Das Rätsel des Tages.</span>
            </button>
        </div>

        <div class="wt-games-stage">
            ${window.wtSelectedGame === 'sudoku' ? renderSudoku('sudokuGames') : ''}
            ${window.wtSelectedGame === 'crossword' ? renderCrossword('crosswordGames') : ''}
            ${window.wtSelectedGame === 'riddle' ? renderDailyRiddle('dailyRiddleGames') : ''}
            ${(!window.wtSelectedGame || window.wtSelectedGame === 'solitaire') ? renderSimpleSolitaireGame() : ''}
        </div>
    </div>`;
}



function renderApp() {
    if (typeof window.wtSaveAdvancedArticleDraftNow === "function") {
        try { window.wtSaveAdvancedArticleDraftNow({ silent: true }); } catch (_) {}
    }
    preserveAuthModalDraft();
    preserveFocus();
    
    // --- 10 & 15 TAGE CLEANUP BEIM RENDERN ---
    const now = Date.now();
    const tenDays = 10 * 24 * 60 * 60 * 1000;
    const fifteenDays = 15 * 24 * 60 * 60 * 1000;
    let chatsChanged = false;
    
    supportChats = supportChats.filter(chat => {
        const origLen = chat.messages.length;
        
        // Finde die neueste Nachricht im Chat (als Zeitstempel)
        let latestMsgTime = chat.id; // Fallback: Erstellungsdatum (id = timestamp)
        if (chat.messages.length > 0) {
            latestMsgTime = new Date(chat.messages[chat.messages.length - 1].timestamp).getTime();
        }

        // 1. Nachrichten löschen, die älter als 10 Tage sind (Nutzer sieht max. die letzten 10 Tage)
        chat.messages = chat.messages.filter(m => (now - new Date(m.timestamp).getTime()) <= tenDays);
        if (origLen !== chat.messages.length) chatsChanged = true;

        const inactiveTime = now - latestMsgTime;

        // 2. Nach 15 Tagen Inaktivität -> Chat KOMPLETT löschen
        if (inactiveTime > fifteenDays) {
            chatsChanged = true;
            return false; 
        }

        // 3. Nach 10 Tagen Inaktivität -> Automatisch für Admins archivieren
        if (inactiveTime > tenDays && !chat.adminDeleted) {
            chat.adminDeleted = true;
            chatsChanged = true;
        }

        return true;
    });
    
    if (chatsChanged && isFirebaseConnected && typeof scheduleRemoteSave === 'function') {
        scheduleRemoteSave(); 
    }
    // -------------------------------------
    
    if (!hasPassedGatekeeper) {
        document.getElementById('app').innerHTML = renderGatekeeper();
        restoreFocus();
        return;
    }

    let content = '';
    if (view === 'home') content = renderHome();
    else if (view === 'search') content = renderSearchResults(); 
    else if (view === 'article') content = renderArticle();
    else if (view === 'profile') content = renderProfile(); 
    else if (view === 'authors') content = renderAuthors(); 
    else if (view === 'admin-login') content = typeof window.renderAdminLogin === 'function' ? window.renderAdminLogin() : '<div class="p-8 text-center text-red-500">Admin-Script lädt...</div>';
    else if (view === 'admin-dashboard') content = typeof window.renderAdminDashboard === 'function' ? window.renderAdminDashboard() : '<div class="p-8 text-center text-red-500">Admin-Script lädt...</div>';
    else if (view === 'gallery') content = renderGallery();
    else if (view === 'feedback') content = renderFeedbackChat();
    else if (view === 'games') content = renderGamesPage();

    // Prüfen, ob wir in der Admin-Zentrale sind
    const isAdminView = view === 'admin-login' || view === 'admin-dashboard';

    document.getElementById('app').innerHTML = `
        ${isAdminView ? '' : renderTopBar()}
        ${isAdminView ? '' : renderHeader()}
        ${renderSystemNotice()}
        <main class="max-w-7xl mx-auto px-4 py-8">
            ${content}
        </main>
        ${isAdminView ? '' : renderFooter()}
        ${renderMenuOverlay()}
        ${renderModal()}
    `;
    
    if (window.lucide) window.lucide.createIcons();

    const logoContainer = document.getElementById('header-3d-logo');
    if (logoContainer && logoRenderer) {
        logoContainer.innerHTML = ''; 
        logoContainer.appendChild(logoRenderer.domElement);
    }
    
    restoreAuthModalDraft();
    restoreFocus();

    if (view === 'admin-dashboard' && adminTab === 'articles') {
        setTimeout(() => {
            if (typeof window.wtMountAdvancedArticleEditor === "function") {
                window.wtMountAdvancedArticleEditor();
            }
        }, 0);
    }
}

window.setView = function(newView) {
    view = newView;
    if (newView === 'home' || newView === 'article' || newView === 'gallery' || newView === 'feedback' || newView === 'games') {
        isSearchOpen = false;
        searchQuery = "";
        searchCategory = null;
    }
    renderApp();
    window.scrollTo(0, 0);

    if (newView === 'feedback') {
        setTimeout(() => {
            const container = document.getElementById('feedbackContainer');
            if (container) container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

window.openFeedbackChat = function() {
    setView('feedback');
}

window.sendFeedback = function() {
    const input = document.getElementById('feedbackInput');
    if(!input || input.value.trim() === '') return;
    
    const newId = Date.now();
    const text = input.value.trim();

    siteFeedbacks.push({
        id: newId,
        username: currentUser,
        text: text,
        timestamp: new Date().toISOString(),
        likes: [],
        moderationStatus: 'checking'
    });
    
    window.saveState();
    renderApp();
    
    setTimeout(() => {
        const container = document.getElementById('feedbackContainer');
        if(container) container.scrollTop = container.scrollHeight;
        const inputRef = document.getElementById('feedbackInput');
        if(inputRef) inputRef.focus();
    }, 50);

    checkContentWithAi(text, 'feedback', newId, null);
}

window.toggleFeedbackLike = function(id) {
    if (!currentUser) {
        pendingView = 'feedback';
        showUserLogin();
        return;
    }
    let fb = siteFeedbacks.find(f => f.id === id);
    if (!fb) return;
    if (!fb.likes) fb.likes = [];
    const idx = fb.likes.indexOf(currentUser);
    if (idx > -1) fb.likes.splice(idx, 1);
    else fb.likes.push(currentUser);
    window.saveState();
    renderApp();
}

window.deleteFeedback = function(id) {
    currentModal = {
        title: 'Feedback löschen?',
        message: 'Möchtest du diesen Eintrag wirklich entfernen?',
        onConfirm: function() {
            siteFeedbacks = siteFeedbacks.filter(f => f.id !== id);
            currentModal = null;
            window.saveState();
            renderApp();
        }
    };
    renderApp();
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) { resolve(e.target.result); };
        reader.onerror = function() { reject(reader.error || new Error("Datei konnte nicht gelesen werden.")); };
        reader.readAsDataURL(file);
    });
}

async function uploadGalleryImageViaWorker(file) {
    const dataUrl = await readFileAsDataUrl(file);
    const commaIndex = dataUrl.indexOf(",");
    const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;

    const res = await fetch(`${WT_WORKER_BASE}/api/gallery/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            filename: file.name || `tagesbild-${Date.now()}.jpg`,
            contentType: file.type || "image/jpeg",
            base64,
            uploader: currentUser || "gast"
        })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
        throw new Error(data.error || data.details || `Upload fehlgeschlagen (${res.status})`);
    }

    return data.url;
}

window.handleCommunityUpload = async function() {
    if (!currentUser) return;
    
    const fileInput = document.getElementById('communityImgFile');
    const urlInput = document.getElementById('communityImgUrl');
    
    const saveImg = (src) => {
        if (!src) return;
        communityImages.push({
            id: Date.now(),
            url: src,
            uploader: currentUser,
            timestamp: new Date().toISOString(),
            isDeleted: false,
            likes: []
        });
        window.saveState();
        showModal('Erfolgreich', 'Dein Bild wurde hochgeladen und ist nun für 24 Stunden für alle sichtbar.');
        renderApp();
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > WT_GALLERY_INLINE_LIMIT_BYTES) {
            try {
                showModal("Upload laeuft", "Grosses Bild wird hochgeladen. Bitte kurz warten.");
                const imageUrl = await uploadGalleryImageViaWorker(file);
                saveImg(imageUrl);
            } catch (err) {
                console.error("Grosses Tagesbild konnte nicht hochgeladen werden:", err);
                showModal("Fehler", "Grosses Bild konnte nicht hochgeladen werden. Bitte pruefe den Cloudflare Worker und die GitHub-Einstellungen.");
            }
            return;
        }

        try {
            const dataUrl = await readFileAsDataUrl(file);
            saveImg(dataUrl);
        } catch (err) {
            console.error("Tagesbild konnte nicht gelesen werden:", err);
            showModal("Fehler", "Das Bild konnte nicht gelesen werden. Bitte versuche eine andere Datei.");
        }
    } else if (urlInput && urlInput.value.trim() !== '') {
        saveImg(urlInput.value.trim());
    } else {
        showModal('Fehler', 'Bitte wähle ein Bild von deinem PC aus oder gib eine Bild-URL ein.');
    }
}

window.deleteCommunityImage = function(id) {
    currentModal = {
        title: 'Bild löschen?',
        message: 'Möchtest du dieses Bild aus der Galerie entfernen?',
        onConfirm: function() {
            const img = communityImages.find(i => String(i.id) === String(id));
            if (img) img.isDeleted = true;
            currentModal = null;
            window.saveState();
            renderApp();
        }
    };
    renderApp();
}

window.toggleCommunityImageLike = function(id) {
    if (!currentUser) { showUserLogin(); return; }
    let img = communityImages.find(i => String(i.id) === String(id));
    if (!img) return;
    if (!img.likes) img.likes = []; 
    const index = img.likes.indexOf(currentUser);
    if (index > -1) img.likes.splice(index, 1);
    else img.likes.push(currentUser);
    window.saveState();
    renderApp();
}


window.voteArticlePoll = function(articleId, encodedOption) {
    const article = articles.find(a => String(a.id) === String(articleId));
    if (!article || !article.poll || !Array.isArray(article.poll.options)) return;

    const option = decodeURIComponent(encodedOption);
    if (!article.poll.options.includes(option)) return;

    if (!article.poll.votes || typeof article.poll.votes !== 'object') article.poll.votes = {};
    const voterId = currentUser || sessionId;

    article.poll.options.forEach(opt => {
        if (!Array.isArray(article.poll.votes[opt])) article.poll.votes[opt] = [];
        article.poll.votes[opt] = article.poll.votes[opt].filter(id => id !== voterId);
    });

    article.poll.votes[option].push(voterId);
    window.saveState();
    renderApp();
}

window.openArticle = function(id) {
    let article = articles.find(a => a.id === id);
    if (!article) return;
    let viewerId = currentUser ? currentUser : sessionId;
    if (!article.views.includes(viewerId)) {
        article.views.push(viewerId);
        window.saveState();
    }
    selectedArticleId = id;
    setView('article');
}

window.showUserLogin = function() {
    authModalDraft = null;
    currentModal = {
        type: 'login',
        title: 'Als Leser anmelden',
        message: 'Bitte logge dich ein, um alle Funktionen nutzen zu können.'
    };
    renderApp();
    setTimeout(() => {
        const input = document.getElementById('usernameInput');
        if(input) input.focus();
    }, 100);
}

window.showUserRegister = function() {
    authModalDraft = null;
    currentModal = {
        type: 'register',
        title: 'Account erstellen',
        message: 'Werde Teil der Winterthur Times-Community.'
    };
    renderApp();
    setTimeout(() => {
        const input = document.getElementById('usernameInput');
        if(input) input.focus();
    }, 100);
}

window.requestPasswordResetFromLogin = async function() {
    const usernameInput = document.getElementById('usernameInput');
    const identifier = usernameInput ? usernameInput.value.trim() : '';
    const mappedEmail = identifier.includes('@')
        ? identifier
        : ((registeredUsers.find(u => u.username === identifier) || {}).email || '');

    if (!mappedEmail || !mappedEmail.includes('@')) {
        showWarning("Bitte gib zuerst deine E-Mail-Adresse ein.");
        return;
    }

    if (!isFirebaseConnected || !firebaseAuth) {
        showWarning("Passwort-Reset per E-Mail ist erst nach verbundener Firebase-Auth aktiv.");
        return;
    }

    try {
        await firebaseAuth.sendPasswordResetEmail(mappedEmail, {
            url: `${window.location.origin}${window.location.pathname}`
        });
        showModal("E-Mail gesendet", `Wir haben einen Link zum Zuruecksetzen an ${wtEscapeHtml(mappedEmail)} gesendet. Schaut auch im spam ordner nach!`);
    } catch (err) {
        console.error("Passwort-Reset fehlgeschlagen:", err);
        showWarning("Reset-Link konnte nicht gesendet werden. Pruefe die E-Mail-Adresse.");
    }
}

function showWarning(message) {
    const warning = document.getElementById('loginWarning');
    if (warning) {
        warning.textContent = message;
        warning.classList.remove('hidden');
    }
}

window.loginUser = function() {
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');

    const identifier = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (isFirebaseConnected && firebaseAuth) {
        if (!identifier || !password) {
            showWarning("Bitte fülle Benutzername/E-Mail und Passwort aus.");
            return;
        }

        const mappedEmail = identifier.includes('@')
            ? identifier
            : ((registeredUsers.find(u => u.username === identifier) || {}).email || '');

        if (!mappedEmail || !mappedEmail.includes('@')) {
            showWarning("Bitte gib deine E-Mail ein (oder registriere dich zuerst).");
            return;
        }

        pendingAuthIdentifier = identifier;
        firebaseAuth.signInWithEmailAndPassword(mappedEmail, password)
            .then(() => {
                authModalDraft = null;
                currentModal = null;
                renderApp();
            })
            .catch((err) => {
                console.error('Firebase Login fehlgeschlagen:', err);
                showWarning("Login fehlgeschlagen. Prüfe E-Mail/Passwort.");
            });
        return;
    }

    const username = identifier; 

    if (!username || !password) {
        showWarning("Bitte fülle Benutzername und Passwort aus.");
        return;
    }

    const existingUser = registeredUsers.find(u => u.username === username);
    if (!existingUser) {
        showWarning("Benutzer nicht gefunden. Hast du schon einen Account erstellt?");
        return;
    }
    
    if (existingUser.isBanned) {
        showWarning("Dein Account wurde gesperrt. Bitte wende dich an den Support.");
        return;
    }

    if (existingUser.isDeleted) {
        showWarning("Dein Account wurde gelöscht. Bitte wende dich an den Support.");
        return;
    }

    if (existingUser.password !== password) {
        showWarning("Falsches Passwort! Bitte versuche es erneut.");
        return;
    }

    currentUser = username;
    authModalDraft = null;
    currentModal = null; 
    
    if (pendingChatOpen) {
        isSupportChatOpen = true;
        pendingChatOpen = false;
    }
    
    if (pendingView) {
        setView(pendingView);
        pendingView = null;
    } else {
        renderApp();
    }
}

window.registerUser = function() {
    const usernameInput = document.getElementById('usernameInput');
    const firstNameInput = document.getElementById('firstNameInput');
    const lastNameInput = document.getElementById('lastNameInput');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const firstName = firstNameInput ? firstNameInput.value.trim() : '';
    const lastName = lastNameInput ? lastNameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!username || !password) {
        showWarning("Bitte fülle alle erforderlichen Felder aus.");
        return;
    }
    if (email && !email.includes('@')) {
        showWarning("Bitte gib eine gültige E-Mail-Adresse mit einem '@' ein.");
        return;
    }
    const existingUser = registeredUsers.find(u => u.username === username);
    if (existingUser) {
        showWarning("Dieser Benutzername ist bereits vergeben. Bitte wähle einen anderen.");
        return;
    }

    if (isFirebaseConnected && firebaseAuth) {
        if (!email) {
            showWarning("Für den Online-Account ist eine E-Mail-Adresse erforderlich.");
            return;
        }
        if (password.length < 6) {
            showWarning("Das Passwort muss mindestens 6 Zeichen lang sein.");
            return;
        }

        pendingAuthIdentifier = username;
        firebaseAuth.createUserWithEmailAndPassword(email, password)
            .then(({ user }) => {
                return user.updateProfile({ displayName: username });
            })
            .then(async () => {
                const profile = await ensureAuthUserProfile(firebaseAuth.currentUser, username);
                if (profile) {
                    profile.firstName = firstName;
                    profile.lastName = lastName;
                    profile.email = email;
                    await saveUsersNow();
                }

                currentUser = profile && profile.username ? profile.username : username;
                authModalDraft = null;
                currentModal = null;
                
                if (pendingChatOpen) {
                    isSupportChatOpen = true;
                    pendingChatOpen = false;
                }
                
                if (pendingView) {
                    setView(pendingView);
                    pendingView = null;
                } else {
                    renderApp();
                }
            })
            .catch((err) => {
                console.error('Firebase Registrierung fehlgeschlagen:', err);
                showWarning("Registrierung fehlgeschlagen. Evtl. ist die E-Mail schon vergeben?");
            });
        return;
    }

    registeredUsers.push({
        username: username,
        password: password,
        firstName: firstName,
        lastName: lastName,
        email: email,
        bio: "",
        profilePicUrl: "",
        showRealName: false,
        isBanned: false,
        isDeleted: false,
        role: "user",
        emailNotifyEnabled: true,
        subscriptions: { categories: [], authors: [] }
    });

    window.saveState();

    currentUser = username;
    authModalDraft = null;
    currentModal = null; 
    
    if (pendingChatOpen) {
        isSupportChatOpen = true;
        pendingChatOpen = false;
    }
    
    if (pendingView) {
        setView(pendingView);
        pendingView = null;
    } else {
        renderApp();
    }
}

window.handleUserLogout = function() {
    if (isFirebaseConnected && firebaseAuth) {
        firebaseAuth.signOut().catch(err => console.error('Firebase Logout fehlgeschlagen:', err));
    }
    currentUser = null;
    supportUser = 'Gast-' + sessionId; 
    
    if (view === 'admin-dashboard' && !isSuperAdmin) {
        setView('home'); 
    } else if (view === 'profile' || view === 'feedback') {
        setView('home'); 
    } else {
        renderApp();
    }
}

window.toggleLike = function(id) {
    if (!currentUser) { showUserLogin(); return; }
    let article = articles.find(a => a.id === id);
    const index = article.likes.indexOf(currentUser);
    if (index > -1) article.likes.splice(index, 1);
    else article.likes.push(currentUser);
    window.saveState();
    renderApp();
}

window.exitDashboard = function() {
    if(isSuperAdmin) {
        isSuperAdmin = false;
    }
    if (window.location.pathname.toLowerCase().includes('adminzentrale.html')) {
        window.location.href = 'index.html'; 
    } else {
        setView('home');
    }
}

window.saveProfile = function() {
    const usernameEl = document.getElementById('profileUsername');
    const newUsername = usernameEl ? usernameEl.value.trim() : currentUser;
    const newPasswordEl = document.getElementById('profileNewPassword');
    const confirmPasswordEl = document.getElementById('profileConfirmPassword');
    const newPassword = newPasswordEl ? newPasswordEl.value.trim() : '';
    const confirmPassword = confirmPasswordEl ? confirmPasswordEl.value.trim() : '';
    const bioText = document.getElementById('profileBio').value;
    const profilePicUrl = document.getElementById('profilePicUrl').value;
    const profilePicFile = document.getElementById('profilePicFile').files[0];
    const showRealName = document.getElementById('profileShowRealName').checked;
    const emailNotifyEnabledEl = document.getElementById('profileEmailNotifyEnabled');
    const emailNotifyEnabled = emailNotifyEnabledEl ? !!emailNotifyEnabledEl.checked : true;

    const selectedCats = Array.from(document.querySelectorAll('input[data-subcat]:checked'))
        .map(el => (el.getAttribute('data-subcat') || '').trim())
        .filter(Boolean);
    const selectedAuthors = Array.from(document.querySelectorAll('input[data-subauthor]:checked'))
        .map(el => (el.getAttribute('data-subauthor') || '').trim())
        .filter(Boolean);
    
    const user = registeredUsers.find(u => u.username === currentUser);
    if (user) {
        ensureUserSubscriptions(user);
        if (isFirebaseConnected) {
            if (newPassword !== '' || confirmPassword !== '') {
                showModal('Hinweis', 'Das Passwort wird im Online-Modus über Firebase verwaltet.');
                return;
            }
            if (newUsername !== currentUser) {
                showModal('Hinweis', 'Der Benutzername kann im Online-Modus aktuell nicht in der App geändert werden.');
                return;
            }
        }

        if (!isFirebaseConnected) {
            if (newUsername !== currentUser) {
                if (newUsername === '') {
                    showModal('Fehler', 'Der Benutzername darf nicht leer sein.');
                    return;
                }
                if (registeredUsers.some(u => u.username === newUsername)) {
                    showModal('Fehler', 'Dieser Benutzername ist leider schon vergeben.');
                    return;
                }
            }

            if (newPassword !== '') {
                if (newPassword !== confirmPassword) {
                    showModal('Fehler', 'Die neuen Passwörter stimmen nicht überein.');
                    return;
                }
                user.password = newPassword;
            }

            if (newUsername !== currentUser) {
                const oldUsername = currentUser;
                user.username = newUsername;

                articles.forEach(a => {
                    const viewIdx = a.views.indexOf(oldUsername);
                    if (viewIdx > -1) a.views[viewIdx] = newUsername;

                    const likeIdx = a.likes.indexOf(oldUsername);
                    if (likeIdx > -1) a.likes[likeIdx] = newUsername;

                    a.comments.forEach(c => {
                        if (c.username === oldUsername) c.username = newUsername;
                        
                        const cLikeIdx = c.likes.indexOf(oldUsername);
                        if (cLikeIdx > -1) c.likes[cLikeIdx] = newUsername;

                        if (c.reportedBy) {
                            const rIdx = c.reportedBy.indexOf(oldUsername);
                            if (rIdx > -1) c.reportedBy[rIdx] = newUsername;
                        }
                    });
                });

                communityImages.forEach(img => {
                    if (img.uploader === oldUsername) img.uploader = newUsername;
                    if (img.likes) {
                        const imgLikeIdx = img.likes.indexOf(oldUsername);
                        if (imgLikeIdx > -1) img.likes[imgLikeIdx] = newUsername;
                    }
                });

                siteFeedbacks.forEach(fb => {
                    if (fb.username === oldUsername) fb.username = newUsername;
                    if (fb.likes) {
                        const fbLikeIdx = fb.likes.indexOf(oldUsername);
                        if (fbLikeIdx > -1) fb.likes[fbLikeIdx] = newUsername;
                    }
                });

                currentUser = newUsername;
            }
        }

        user.emailNotifyEnabled = emailNotifyEnabled;
        user.subscriptions.categories = selectedCats;
        user.subscriptions.authors = selectedAuthors;
        user.bio = bioText;
        user.showRealName = showRealName;

        const applySave = () => {
            window.saveState();
            showModal('Erfolgreich', 'Dein Profil wurde gespeichert!');
        };

        if (profilePicFile) {
            if (isFirebaseConnected) {
                (async () => {
                    try {
                        showModal('Upload läuft…', 'Dein Profilbild wird hochgeladen.');
                        const resized = await resizeImageFile(profilePicFile, { maxSize: 512, quality: 0.82, preferWebp: true });
                        const uploadFile = new File([resized.blob], 'profile.' + (resized.mimeType === 'image/webp' ? 'webp' : 'jpg'), { type: resized.mimeType });
                        const url = await uploadProfilePicToStorage(uploadFile, currentUser);
                        user.profilePicUrl = url;
                        applySave();
                    } catch (e) {
                        console.error('Profilbild Upload fehlgeschlagen:', e);
                        showModal('Fehler', 'Profilbild konnte nicht hochgeladen werden. Prüfe Firebase Storage / Regeln.');
                    }
                })();
            } else {
                (async () => {
                    try {
                        const resized = await resizeImageFile(profilePicFile, { maxSize: 512, quality: 0.82, preferWebp: false });
                        if (resized.dataUrl) user.profilePicUrl = resized.dataUrl;
                        else {
                            const reader = new FileReader();
                            reader.onload = function(e) {
                                user.profilePicUrl = e.target.result;
                            };
                            reader.readAsDataURL(profilePicFile);
                        }
                        applySave();
                    } catch (e) {
                        console.error('Profilbild Resize fehlgeschlagen:', e);
                        showModal('Fehler', 'Profilbild konnte nicht verarbeitet werden.');
                    }
                })();
            }
        } else {
            if (profilePicUrl.trim() !== '') {
                user.profilePicUrl = profilePicUrl.trim();
            }
            applySave();
        }
    }
}

window.clearProfilePic = function() {
    const user = registeredUsers.find(u => u.username === currentUser);
    if(user) {
        user.profilePicUrl = '';
        window.saveState();
        renderApp();
    }
}

window.toggleCategorySubscription = function(category) {
    if (!currentUser) { showUserLogin(); return; }
    const user = registeredUsers.find(u => u.username === currentUser);
    if (!user) return;
    ensureUserSubscriptions(user);
    const cat = (category || '').trim();
    if (!cat) return;
    const idx = user.subscriptions.categories.indexOf(cat);
    const added = idx <= -1;
    if (idx > -1) user.subscriptions.categories.splice(idx, 1);
    else user.subscriptions.categories.push(cat);
    window.saveState();
    renderApp();
    if (added) {
        sendSubscriptionConfirmation(user, "Kategorie", cat)
            .then(sent => {
                if (sent) showModal("Abo aktiviert", `Du bekommst ab jetzt E-Mails fuer neue Artikel in ${wtEscapeHtml(cat)}.`);
                else showModal("Abo gespeichert", "Das Abo ist aktiv. Eine E-Mail konnte noch nicht gesendet werden, weil Firebase-Mail oder deine E-Mail-Adresse fehlt.");
            })
            .catch(err => console.error("Abo-Bestaetigung konnte nicht gesendet werden:", err));
    }
}

window.toggleAuthorSubscription = function(author) {
    if (!currentUser) { showUserLogin(); return; }
    const user = registeredUsers.find(u => u.username === currentUser);
    if (!user) return;
    ensureUserSubscriptions(user);
    const a = (author || '').trim();
    if (!a) return;
    const idx = user.subscriptions.authors.indexOf(a);
    const added = idx <= -1;
    if (idx > -1) user.subscriptions.authors.splice(idx, 1);
    else user.subscriptions.authors.push(a);
    window.saveState();
    renderApp();
    if (added) {
        sendSubscriptionConfirmation(user, "Autor", a)
            .then(sent => {
                if (sent) showModal("Abo aktiviert", `Du bekommst ab jetzt E-Mails fuer neue Artikel von ${wtEscapeHtml(a)}.`);
                else showModal("Abo gespeichert", "Das Abo ist aktiv. Eine E-Mail konnte noch nicht gesendet werden, weil Firebase-Mail oder deine E-Mail-Adresse fehlt.");
            })
            .catch(err => console.error("Abo-Bestaetigung konnte nicht gesendet werden:", err));
    }
}

window.showImageModal = function(url) {
    currentModal = { type: 'image', url: url };
    renderApp();
}

window.submitComment = function(articleId) {
    const commentInput = document.getElementById('newCommentText');
    if (!commentInput || commentInput.value.trim() === '') return;

    const article = articles.find(a => String(a.id) === String(articleId));
    if (article) {
        const newId = Date.now();
        const text = commentInput.value.trim();

        article.comments.push({
            id: newId,
            username: currentUser,
            text: text,
            timestamp: new Date().toISOString(),
            likes: [],
            isDeleted: false,
            deletedBy: null,
            reportedBy: [],
            moderationStatus: 'checking'
        });
        window.saveState();
        renderApp();

        checkContentWithAi(text, 'comment', newId, articleId);
    }
}

window.toggleCommentLike = function(articleId, commentId) {
    if (!currentUser) { showUserLogin(); return; }
    const article = articles.find(a => String(a.id) === String(articleId));
    if(!article) return;
    const comment = article.comments.find(c => c.id === commentId);
    if(comment) {
        const idx = comment.likes.indexOf(currentUser);
        if (idx > -1) comment.likes.splice(idx, 1);
        else comment.likes.push(currentUser);
        window.saveState();
        renderApp();
    }
}

window.deleteComment = function(articleId, commentId) {
    currentModal = {
        title: 'Kommentar löschen?',
        message: 'Möchtest du diesen Kommentar entfernen? Er wird dann für andere Leser ausgeblendet.',
        onConfirm: function() {
            const article = articles.find(a => String(a.id) === String(articleId));
            if(article) {
                const comment = article.comments.find(c => c.id === commentId);
                if(comment) {
                    comment.isDeleted = true;
                    comment.deletedBy = hasAdminAccess() ? 'admin' : 'user';
                }
            }
            currentModal = null;
            window.saveState();
            renderApp();
        }
    };
    renderApp();
}

window.reportComment = function(articleId, commentId) {
    if (!currentUser) { showUserLogin(); return; }
    const article = articles.find(a => String(a.id) === String(articleId));
    if(article) {
        const comment = article.comments.find(c => c.id === commentId);
        if(comment) {
            if (!comment.reportedBy) comment.reportedBy = [];
            if (!comment.reportedBy.includes(currentUser)) {
                comment.reportedBy.push(currentUser);
                window.saveState();
                showModal('Gemeldet', 'Vielen Dank. Der Kommentar wurde an die Moderation gemeldet.');
            } else {
                showModal('Bereits gemeldet', 'Du hast diesen Kommentar bereits gemeldet.');
            }
        }
    }
}

window.unreportComment = function(articleId, commentId) {
    const article = articles.find(a => String(a.id) === String(articleId));
    if(article) {
        const comment = article.comments.find(c => c.id === commentId);
        if(comment) {
            comment.reportedBy = [];
            window.saveState();
            renderApp();
        }
    }
}

window.restoreComment = function(articleId, commentId) {
    const article = articles.find(a => String(a.id) === String(articleId));
    if(article) {
        const comment = article.comments.find(c => c.id === commentId);
        if(comment) {
            if (!hasAdminAccess() && comment.deletedBy === 'admin') {
                showModal('Aktion nicht erlaubt', 'Dieser Kommentar wurde von einem Administrator gelöscht und kann nicht wiederhergestellt werden.');
                return;
            }
            comment.isDeleted = false;
            comment.deletedBy = null;
            window.saveState();
            renderApp();
        }
    }
}

window.executeConfirm = function() {
    if (currentModal && currentModal.onConfirm) {
        currentModal.onConfirm();
    }
}

window.confirmDeleteOwnAccount = function() {
    currentModal = {
        title: 'Konto löschen?',
        message: 'Möchtest du dein Benutzerkonto wirklich löschen? Du kannst dich danach nicht mehr anmelden. Wenn du Fragen hast, kannst du jedoch weiterhin den Support kontaktieren.',
        onConfirm: function() {
            const user = registeredUsers.find(u => u.username === currentUser);
            if (user) {
                user.isDeleted = true;
            }
            currentModal = null;
            window.saveState();
            handleUserLogout();
            showModal('Konto gelöscht', 'Dein Konto wurde erfolgreich gelöscht. Über den Support-Chat kannst du uns weiterhin erreichen.');
        }
    };
    renderApp();
};

window.showModal = function(title, message) {
    currentModal = { title, message };
    renderApp();
}

window.closeModal = function() {
    authModalDraft = null;
    currentModal = null;
    pendingChatOpen = false; 
    pendingView = null;
    if (typeof window.wtFlushDeferredRemoteRender === "function" && window.wtFlushDeferredRemoteRender()) {
        return;
    }
    renderApp();
}

window.toggleMenu = function() {
    const wasOpen = isMenuOpen;
    isMenuOpen = !isMenuOpen;
    if (wasOpen && !isMenuOpen && typeof window.wtFlushDeferredRemoteRender === "function" && window.wtFlushDeferredRemoteRender()) {
        return;
    }
    renderApp();
}

window.toggleSearch = function() {
    isSearchOpen = !isSearchOpen;
    if (!isSearchOpen && (view === 'search' || view === 'feedback')) {
        searchQuery = ""; 
        searchCategory = null;
        setView('home');
    } else {
        renderApp();
    }
}

window.handleSearch = function(event) {
    if (event.key === 'Enter') executeSearch();
}

window.executeSearch = function() {
    const input = document.getElementById('searchInput');
    if (input && input.value.trim() !== '') {
        searchQuery = input.value.trim();
        searchCategory = null;
        setView('search');
    }
}

window.executeSearchCategory = function(category) {
    if (category === "Spiele") {
        isMenuOpen = false;
        window.wtSelectedGame = window.wtSelectedGame || "solitaire";
        setView("games");
        return;
    }
    searchCategory = category; 
    searchQuery = ""; 
    isSearchOpen = false; 
    setView('search');
}

// --- INITIALISIERUNG ---
if (window.location.pathname.toLowerCase().includes('adminzentrale.html')) {
    view = 'admin-login';
}

init3DLogo();
fetchWeather();
(async function wtBoot() {
    await initFirebase();
    renderApp();
})();


document.addEventListener('click', async (event) => {
    const optionButton = event.target.closest && event.target.closest('.article-poll-option');
    if (!optionButton) return;

    const option = optionButton.dataset.pollOption;
    if (!option || !selectedArticleId) return;

    const article = articles.find(a => String(a.id) === String(selectedArticleId));
    if (!article || !article.poll) return;

    ensurePollId(article);

    let voterId;
    if (typeof getUserId === "function") {
        voterId = getUserId();
    } else {
        voterId = localStorage.getItem("wt_user_id");
        if (!voterId) {
            voterId = "guest_" + Math.random().toString(36).slice(2) + Date.now();
            localStorage.setItem("wt_user_id", voterId);
        }
    }

    // Jede Umfrage wird separat behandelt:
    // - anderer Artikel = andere Abstimmung
    // - andere poll.id = andere Abstimmung
    const voteStorageKey = getPollVoteStorageKey(article);
    const previousOption = localStorage.getItem(voteStorageKey);

    if (!article.poll.votes || typeof article.poll.votes !== 'object') article.poll.votes = {};
    if (!Array.isArray(article.poll.options)) article.poll.options = [];

    article.poll.options.forEach(opt => {
        if (!Array.isArray(article.poll.votes[opt])) article.poll.votes[opt] = [];
        article.poll.votes[opt] = article.poll.votes[opt].filter(id => id !== voterId);
    });

    if (!Array.isArray(article.poll.votes[option])) article.poll.votes[option] = [];
    article.poll.votes[option].push(voterId);
    localStorage.setItem(voteStorageKey, option);

    if (typeof saveData === 'function') {
        await saveData();
    } else if (typeof updateData === 'function') {
        await updateData();
    } else if (typeof firebaseDb !== "undefined" && typeof firebase !== "undefined") {
        await firebaseDb.collection("data").doc("articles").set({
            articles,
            authors: typeof authors !== "undefined" ? authors : [],
            categories: typeof categories !== "undefined" ? categories : [],
            communityImages: typeof communityImages !== "undefined" ? communityImages : [],
            siteFeedbacks: typeof siteFeedbacks !== "undefined" ? siteFeedbacks : [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    renderApp();
});



/* Mobiles Menü: zusätzlicher Touch-Fallback */
(function wtMobileMenuTouchFix() {
    if (window.__wtMobileMenuTouchFix) return;
    window.__wtMobileMenuTouchFix = true;
    document.addEventListener("touchend", function(event) {
        const button = event.target.closest && event.target.closest("button[onclick*='toggleMenu']");
        if (!button) return;
        event.preventDefault();
        if (typeof toggleMenu === "function") toggleMenu();
    }, { passive: false });
})();




/* Handy-Menü: Scrollen ohne versehentliches Ressort-Klicken */
(function wtMobileMenuScrollGuard() {
    if (window.__wtMobileMenuScrollGuard) return;
    window.__wtMobileMenuScrollGuard = true;

    let startX = 0;
    let startY = 0;
    let moved = false;

    function isMenuArea(target) {
        return target && target.closest && target.closest(".wt-mobile-menu-panel-safe, .wt-mobile-menu-scroll, .wt-mobile-menu-panel, .fixed.inset-0 nav");
    }

    document.addEventListener("touchstart", function(event) {
        if (!isMenuArea(event.target)) return;
        const touch = event.touches && event.touches[0];
        if (!touch) return;
        startX = touch.clientX;
        startY = touch.clientY;
        moved = false;
    }, { passive: true });

    document.addEventListener("touchmove", function(event) {
        if (!isMenuArea(event.target)) return;
        const touch = event.touches && event.touches[0];
        if (!touch) return;
        if (Math.abs(touch.clientY - startY) > 8 || Math.abs(touch.clientX - startX) > 8) {
            moved = true;
        }
    }, { passive: true });

    document.addEventListener("click", function(event) {
        const item = event.target.closest && event.target.closest(".mobile-menu-item, .wt-mobile-menu-panel button, .fixed.inset-0 nav button");
        if (!item) return;
        if (moved) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            moved = false;
        }
    }, true);
})();




/* Ressorts Backup Restore */
(function wtRessortBackupRestorePublic() {
    if (window.__wtRessortBackupRestorePublic) return;
    window.__wtRessortBackupRestorePublic = true;

    function restore() {
        try {
            if (typeof categories !== "undefined" && Array.isArray(categories) && categories.length) return;
        } catch (_) {}

        try {
            const backup = JSON.parse(localStorage.getItem("wt_categories_backup") || "[]");
            if (Array.isArray(backup) && backup.length) {
                window.categories = backup;
            }
        } catch (_) {}
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", restore);
    else restore();
})();



/* =========================================================
   Tagesbilder Grossbild-Upload Fix
   - komprimiert grosse Bilder vor dem Upload
   - versucht Worker/GitHub
   - falls Worker nicht geht: komprimierter lokaler Fallback
   ========================================================= */
(function wtGalleryBigImageUploadFix() {
    if (window.__wtGalleryBigImageUploadFix) return;
    window.__wtGalleryBigImageUploadFix = true;

    const WORKER_TARGET_BYTES = 1200 * 1024;   // Upload zum Worker möglichst klein halten
    const INLINE_TARGET_BYTES = 360 * 1024;    // Firestore/Data-URL-Fallback klein halten
    const INLINE_MAX_CHARS = 780000;

    function wtReadFileAsDataUrlFixed(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(String(e.target.result || ""));
            reader.onerror = () => reject(reader.error || new Error("Datei konnte nicht gelesen werden."));
            reader.readAsDataURL(file);
        });
    }

    function wtLoadImageFromDataUrl(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
            img.src = dataUrl;
        });
    }

    function wtCanvasToBlob(canvas, mime, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (!blob) reject(new Error("Bild konnte nicht komprimiert werden."));
                else resolve(blob);
            }, mime, quality);
        });
    }

    function wtBlobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(String(e.target.result || ""));
            reader.onerror = () => reject(reader.error || new Error("Blob konnte nicht gelesen werden."));
            reader.readAsDataURL(blob);
        });
    }

    async function wtCompressImageForGallery(file, targetBytes, startMaxSide) {
        const originalDataUrl = await wtReadFileAsDataUrlFixed(file);
        const img = await wtLoadImageFromDataUrl(originalDataUrl);

        let maxSide = startMaxSide || 1800;
        let best = null;

        // JPEG ist hier absichtlich gewählt, weil Tagesbilder meistens Fotos sind
        // und JPEG viel kleiner als PNG/DataURL wird.
        for (let sizeRound = 0; sizeRound < 8; sizeRound++) {
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const width = Math.max(1, Math.round(img.width * scale));
            const height = Math.max(1, Math.round(img.height * scale));

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d", { alpha: false });
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            for (const q of [0.86, 0.78, 0.70, 0.62, 0.54, 0.46, 0.38]) {
                const blob = await wtCanvasToBlob(canvas, "image/jpeg", q);
                const dataUrl = await wtBlobToDataUrl(blob);
                best = {
                    blob,
                    dataUrl,
                    bytes: blob.size,
                    contentType: "image/jpeg",
                    filename: String(file.name || `tagesbild-${Date.now()}.jpg`).replace(/\.[^.]+$/, "") + ".jpg",
                    width,
                    height,
                    quality: q
                };
                if (blob.size <= targetBytes) return best;
            }

            maxSide = Math.round(maxSide * 0.78);
            if (maxSide < 620) break;
        }

        return best;
    }

    function wtDataUrlToBase64(dataUrl) {
        const comma = String(dataUrl || "").indexOf(",");
        return comma >= 0 ? String(dataUrl).slice(comma + 1) : String(dataUrl || "");
    }

    async function wtUploadPreparedGalleryImageViaWorker(prepared, uploader) {
        const res = await fetch(`${WT_WORKER_BASE}/api/gallery/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filename: prepared.filename || `tagesbild-${Date.now()}.jpg`,
                contentType: prepared.contentType || "image/jpeg",
                base64: wtDataUrlToBase64(prepared.dataUrl),
                uploader: uploader || currentUser || "gast"
            })
        });

        const text = await res.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { details: text }; }

        if (!res.ok || !data.url) {
            const msg = data.error || data.details || `Upload fehlgeschlagen (${res.status})`;
            const err = new Error(msg);
            err.status = res.status;
            err.details = data.details || text;
            throw err;
        }

        return data.url;
    }

    async function wtSaveCommunityImage(src) {
        if (!src) return;
        if (window.wtSaveCommunityImagePersistent) {
            await window.wtSaveCommunityImagePersistent(src, { isLocalFallback: String(src).startsWith("data:") });
            return;
        }
        communityImages.unshift({
            id: Date.now(),
            url: src,
            uploader: currentUser,
            timestamp: new Date().toISOString(),
            isDeleted: false,
            likes: []
        });
        try { await window.saveState(); } catch (err) { console.warn("Tagesbild speichern fehlgeschlagen:", err); }
        renderApp();
    }

    window.handleCommunityUpload = async function() {
        if (!currentUser) return;

        const fileInput = document.getElementById("communityImgFile");
        const urlInput = document.getElementById("communityImgUrl");

        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];

            if (!file.type || !file.type.startsWith("image/")) {
                showModal("Fehler", "Bitte wähle eine Bilddatei aus.");
                return;
            }

            try {
                showModal("Upload läuft", "Bild wird vorbereitet und verkleinert. Bitte kurz warten.");

                // Erst immer komprimieren, damit auch sehr grosse Handyfotos funktionieren.
                const preparedForWorker = await wtCompressImageForGallery(file, WORKER_TARGET_BYTES, 1900);

                // 1) Worker/GitHub versuchen
                try {
                    const url = await wtUploadPreparedGalleryImageViaWorker(preparedForWorker, currentUser);
                    await wtSaveCommunityImage(url);
                    showModal("Erfolgreich", "Dein Bild wurde hochgeladen und ist nun für 24 Stunden für alle sichtbar.");
                    return;
                } catch (workerErr) {
                    console.warn("Worker/GitHub Upload fehlgeschlagen, lokaler Fallback wird versucht:", workerErr);

                    // 2) Fallback: nochmals stärker komprimieren und inline speichern.
                    // So ist die Galerie nicht blockiert, falls Worker/GitHub falsch konfiguriert ist.
                    const inline = await wtCompressImageForGallery(file, INLINE_TARGET_BYTES, 1400);

                    if (inline && inline.dataUrl && inline.dataUrl.length <= INLINE_MAX_CHARS) {
                        await window.wtSaveCommunityImagePersistent(inline.dataUrl, { isLocalFallback: true });
                        showModal(
                            "Bild lokal gespeichert",
                            "Der Cloudflare/GitHub-Upload hat nicht funktioniert, aber das Bild wurde stark verkleinert und lokal in der Website-Datenbank gespeichert. Für bessere Qualität bitte Worker/GitHub prüfen."
                        );
                        return;
                    }

                    throw workerErr;
                }
            } catch (err) {
                console.error("Tagesbild Upload fehlgeschlagen:", err);
                showModal(
                    "Fehler",
                    "Das Bild konnte nicht hochgeladen werden. Details: " + (err.message || err) +
                    "\n\nPrüfe im Cloudflare Worker diese Variablen/Secrets: GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN, optional GITHUB_BRANCH. Der Token braucht Zugriff auf das Repo und die Berechtigung, Dateien zu schreiben."
                );
            }

            return;
        }

        if (urlInput && urlInput.value.trim() !== "") {
            await wtSaveCommunityImage(urlInput.value.trim());
            showModal("Erfolgreich", "Dein Bild wurde veröffentlicht.");
            return;
        }

        showModal("Fehler", "Bitte wähle ein Bild von deinem PC aus oder gib eine Bild-URL ein.");
    };
})();


/* =========================================================
   Tagesbilder Like Persistenz absolut letzter Fix
   ========================================================= */
(function wtGalleryLikePersistAbsoluteFinalFix() {
    if (window.__wtGalleryLikePersistAbsoluteFinalFix) return;
    window.__wtGalleryLikePersistAbsoluteFinalFix = true;

    const LIKES_KEY = "wt_gallery_likes_final2";

    function getImages() {
        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) return communityImages;
        } catch (_) {}
        if (!Array.isArray(window.communityImages)) window.communityImages = [];
        return window.communityImages;
    }

    function cleanLikes(likes) {
        return Array.from(new Set((Array.isArray(likes) ? likes : []).map(String).filter(Boolean)));
    }

    function currentLikeUser() {
        try {
            if (typeof currentUser !== "undefined" && currentUser) return String(currentUser);
        } catch (_) {}
        return "";
    }

    function rememberLikeState(id, likes) {
        try {
            const map = JSON.parse(localStorage.getItem(LIKES_KEY) || "{}");
            map[String(id)] = cleanLikes(likes);
            localStorage.setItem(LIKES_KEY, JSON.stringify(map));
        } catch (_) {}
    }

    async function saveGalleryImages() {
        const images = getImages();

        if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
            await firebaseDb.collection("data").doc("articles").set({
                communityImages: images,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return true;
        }

        if (typeof window.saveState === "function") {
            await window.saveState();
            return true;
        }

        return false;
    }

    window.toggleCommunityImageLike = function(id) {
        const user = currentLikeUser();
        if (!user) {
            if (typeof showUserLogin === "function") showUserLogin();
            return;
        }

        const images = getImages();
        const img = images.find(item => String(item && item.id) === String(id));
        if (!img) return;

        const likes = cleanLikes(img.likes);
        const index = likes.indexOf(user);
        if (index >= 0) likes.splice(index, 1);
        else likes.push(user);

        img.likes = cleanLikes(likes);
        rememberLikeState(img.id, img.likes);

        saveGalleryImages()
            .catch(err => console.warn("Tagesbild-Like konnte nicht global gespeichert werden:", err))
            .finally(() => {
                if (typeof renderApp === "function") renderApp();
            });
    };
})();


/* =========================================================
   Tagesbilder Like Persistenz Final-Fix
   ========================================================= */
(function wtGalleryLikePersistSingleFinalFix() {
    if (window.__wtGalleryLikePersistSingleFinalFix) return;
    window.__wtGalleryLikePersistSingleFinalFix = true;

    const LIKES_KEY = "wt_gallery_likes_final2";

    function getImages() {
        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) return communityImages;
        } catch (_) {}
        if (!Array.isArray(window.communityImages)) window.communityImages = [];
        return window.communityImages;
    }

    function normalizeLikesFinal(likes) {
        return Array.from(new Set((Array.isArray(likes) ? likes : []).map(String).filter(Boolean)));
    }

    function getLikeUserFinal() {
        try {
            if (typeof currentUser !== "undefined" && currentUser) return String(currentUser);
        } catch (_) {}
        return "";
    }

    function rememberLikesLocally(id, likes) {
        try {
            const map = JSON.parse(localStorage.getItem(LIKES_KEY) || "{}");
            map[String(id)] = normalizeLikesFinal(likes);
            localStorage.setItem(LIKES_KEY, JSON.stringify(map));
        } catch (_) {}
    }

    async function persistGalleryLikesFinal() {
        const images = getImages();

        if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
            await firebaseDb.collection("data").doc("articles").set({
                communityImages: images,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return true;
        }

        if (typeof window.saveState === "function") {
            await window.saveState();
            return true;
        }

        return false;
    }

    window.toggleCommunityImageLike = function(id) {
        const user = getLikeUserFinal();
        if (!user) {
            if (typeof showUserLogin === "function") showUserLogin();
            return;
        }

        const images = getImages();
        const img = images.find(item => String(item && item.id) === String(id));
        if (!img) return;

        const likes = normalizeLikesFinal(img.likes);
        const idx = likes.indexOf(user);
        if (idx >= 0) likes.splice(idx, 1);
        else likes.push(user);

        img.likes = normalizeLikesFinal(likes);
        rememberLikesLocally(img.id, img.likes);

        persistGalleryLikesFinal()
            .catch(err => console.warn("Tagesbild-Like konnte nicht global gespeichert werden:", err))
            .finally(() => {
                if (typeof renderApp === "function") renderApp();
            });
    };
})();




/* =========================================================
   Tagesbilder Fallback-Persistenz Fix
   - lokale Fallback-Bilder verschwinden nicht mehr nach Firebase-Refresh
   ========================================================= */
(function wtGalleryFallbackPersistenceFix() {
    if (window.__wtGalleryFallbackPersistenceFix) return;
    window.__wtGalleryFallbackPersistenceFix = true;

    const LOCAL_KEY = "wt_gallery_local_fallback_images_v1";
    const MAX_LOCAL_IMAGES = 25;

    function getLocalImages() {
        try {
            const arr = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
            return Array.isArray(arr) ? arr : [];
        } catch (_) {
            return [];
        }
    }

    function setLocalImages(list) {
        try {
            const cleaned = (Array.isArray(list) ? list : [])
                .filter(img => img && img.id && img.url)
                .slice(0, MAX_LOCAL_IMAGES);
            localStorage.setItem(LOCAL_KEY, JSON.stringify(cleaned));
        } catch (err) {
            console.warn("Lokale Tagesbilder konnten nicht gespeichert werden:", err);
        }
    }

    function saveLocalImage(img) {
        if (!img || !img.url) return;
        const list = getLocalImages().filter(x => String(x.id) !== String(img.id));
        list.unshift(img);
        setLocalImages(list);
    }

    function mergeLocalImagesIntoMemory() {
        const local = getLocalImages();
        if (!local.length) return;

        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) {
                const existing = new Set(communityImages.map(img => String(img.id)));
                local.slice().reverse().forEach(img => {
                    if (!existing.has(String(img.id))) {
                        communityImages.unshift(img);
                    }
                });
            }
        } catch (_) {}

        if (Array.isArray(window.communityImages)) {
            const existing = new Set(window.communityImages.map(img => String(img.id)));
            local.slice().reverse().forEach(img => {
                if (!existing.has(String(img.id))) {
                    window.communityImages.unshift(img);
                }
            });
        }
    }

    async function safeSaveStateNoDisappear() {
        try {
            if (typeof window.saveState === "function") {
                await window.saveState();
            }
        } catch (err) {
            console.warn("Firebase Speichern fehlgeschlagen, lokaler Fallback bleibt erhalten:", err);
        }
    }

    // Überschreibt die Fallback-Speicherfunktion aus dem vorherigen Grossbild-Fix zuverlässiger.
    window.wtSaveCommunityImagePersistent = async function(src, options = {}) {
        if (!src) return null;

        const img = {
            id: options.id || ("local_" + Date.now()),
            url: src,
            uploader: currentUser || "Gast",
            timestamp: new Date().toISOString(),
            isDeleted: false,
            likes: [],
            isLocalFallback: !!options.isLocalFallback
        };

        saveLocalImage(img);

        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) {
                if (!communityImages.some(x => String(x.id) === String(img.id))) {
                    communityImages.unshift(img);
                }
            }
        } catch (_) {}

        if (Array.isArray(window.communityImages)) {
            if (!window.communityImages.some(x => String(x.id) === String(img.id))) {
                window.communityImages.unshift(img);
            }
        }

        if (window.wtSaveCommunityImageGlobal) { await window.wtSaveCommunityImageGlobal(img); return img; }
        await safeSaveStateNoDisappear();

        mergeLocalImagesIntoMemory();
        if (typeof renderApp === "function") renderApp();

        return img;
    };

    // Falls der alte Grossbild-Fix wtSaveCommunityImage intern nutzt, patchen wir handleCommunityUpload nochmal,
    // aber nur für den lokalen Fallback-Fall, damit das Bild nicht durch einen Remote-Snapshot wieder rausfliegt.
    const oldHandle = window.handleCommunityUpload;
    if (typeof oldHandle === "function" && !oldHandle.__wtFallbackPersistWrapped) {
        const wrapped = async function(...args) {
            try {
                return await oldHandle.apply(this, args);
            } finally {
                mergeLocalImagesIntoMemory();
            }
        };
        wrapped.__wtFallbackPersistWrapped = true;
        window.handleCommunityUpload = wrapped;
    }

    // Wichtig: nach jedem externen Render/Firebase-Update wieder lokale Fallbacks hineinmischen.
    const originalRender = window.renderApp;
    if (typeof originalRender === "function" && !originalRender.__wtGalleryFallbackPatched) {
        const patchedRender = function(...args) {
            mergeLocalImagesIntoMemory();
            return originalRender.apply(this, args);
        };
        patchedRender.__wtGalleryFallbackPatched = true;
        window.renderApp = patchedRender;
    }

    // Direkter DOM/State-Watch gegen Firebase-Snapshots, die communityImages ersetzen.
    setInterval(() => {
        mergeLocalImagesIntoMemory();
    }, 1200);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mergeLocalImagesIntoMemory);
    } else {
        mergeLocalImagesIntoMemory();
    }
})();




/* =========================================================
   Tagesbilder Löschen + 24h Ablauf Fix
   ========================================================= */
(function wtGalleryDeleteAndExpireFix() {
    if (window.__wtGalleryDeleteAndExpireFix) return;
    window.__wtGalleryDeleteAndExpireFix = true;

    const LOCAL_KEY = "wt_gallery_local_fallback_images_v1";
    const MAX_AGE_MS = 24 * 60 * 60 * 1000;

    function now() {
        return Date.now();
    }

    function isExpired(img) {
        const t = new Date(img && img.timestamp ? img.timestamp : 0).getTime();
        if (!t) return false;
        return now() - t > MAX_AGE_MS;
    }

    function readLocalImages() {
        try {
            const arr = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
            return Array.isArray(arr) ? arr : [];
        } catch (_) {
            return [];
        }
    }

    function writeLocalImages(list) {
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify((Array.isArray(list) ? list : []).filter(Boolean).slice(0, 25)));
        } catch (err) {
            console.warn("Lokale Tagesbilder konnten nicht gespeichert werden:", err);
        }
    }

    function removeLocalImage(id) {
        const idStr = String(id);
        const list = readLocalImages().filter(img => String(img.id) !== idStr);
        writeLocalImages(list);
    }

    function pruneExpiredLocalImages() {
        const cleaned = readLocalImages().filter(img => !isExpired(img) && !img.isDeleted);
        writeLocalImages(cleaned);
    }

    function pruneExpiredMemoryImages() {
        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) {
                communityImages.forEach(img => {
                    if (img && isExpired(img)) img.isDeleted = true;
                });
            }
        } catch (_) {}

        if (Array.isArray(window.communityImages)) {
            window.communityImages.forEach(img => {
                if (img && isExpired(img)) img.isDeleted = true;
            });
        }
    }

    function patchDeleteFunction() {
        const oldDelete = window.deleteCommunityImage;

        window.deleteCommunityImage = function(id) {
            const idStr = String(id);

            currentModal = {
                title: "Bild löschen?",
                message: "Möchtest du dieses Bild aus der Galerie entfernen?",
                onConfirm: function() {
                    try {
                        if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) {
                            const img = communityImages.find(i => String(i.id) === idStr);
                            if (img) img.isDeleted = true;
                        }
                    } catch (_) {}

                    if (Array.isArray(window.communityImages)) {
                        const img = window.communityImages.find(i => String(i.id) === idStr);
                        if (img) img.isDeleted = true;
                    }

                    removeLocalImage(idStr);

                    currentModal = null;

                    try {
                        if (typeof window.saveState === "function") window.saveState();
                    } catch (err) {
                        console.warn("Bildlöschung konnte nicht remote gespeichert werden:", err);
                    }

                    if (typeof renderApp === "function") renderApp();
                }
            };

            if (typeof renderApp === "function") renderApp();
        };

        window.deleteCommunityImage.__wtStringIdPatched = true;
    }

    function patchLikeFunction() {
        const oldLike = window.toggleCommunityImageLike;
        if (typeof oldLike !== "function" || oldLike.__wtStringIdPatched) return;

        window.toggleCommunityImageLike = function(id) {
            const idStr = String(id);
            const oldFind = Array.prototype.find;
            // Einfacher, sicherer eigener Like-Code, damit String-IDs funktionieren.
            if (!currentUser) {
                pendingView = "gallery";
                if (typeof showUserLogin === "function") showUserLogin();
                return;
            }

            let img = null;
            try {
                if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) {
                    img = communityImages.find(i => String(i.id) === idStr);
                }
            } catch (_) {}

            if (!img && Array.isArray(window.communityImages)) {
                img = window.communityImages.find(i => String(i.id) === idStr);
            }

            if (!img) return;
            if (!Array.isArray(img.likes)) img.likes = [];

            const idx = img.likes.indexOf(currentUser);
            if (idx >= 0) img.likes.splice(idx, 1);
            else img.likes.push(currentUser);

            try {
                if (typeof window.saveState === "function") window.saveState();
            } catch (_) {}

            if (typeof renderApp === "function") renderApp();
        };

        window.toggleCommunityImageLike.__wtStringIdPatched = true;
    }

    // Override merge so expired local images are not reinserted after 24h.
    function mergeNonExpiredLocalImages() {
        pruneExpiredLocalImages();
        const local = readLocalImages().filter(img => !isExpired(img) && !img.isDeleted);
        if (!local.length) return;

        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) {
                const existing = new Set(communityImages.map(img => String(img.id)));
                local.slice().reverse().forEach(img => {
                    if (!existing.has(String(img.id))) communityImages.unshift(img);
                });
            }
        } catch (_) {}

        if (Array.isArray(window.communityImages)) {
            const existing = new Set(window.communityImages.map(img => String(img.id)));
            local.slice().reverse().forEach(img => {
                if (!existing.has(String(img.id))) window.communityImages.unshift(img);
            });
        }
    }

    // Patch persistent saver to avoid saving expired/deleted and to keep id string safe.
    if (typeof window.wtSaveCommunityImagePersistent === "function" && !window.wtSaveCommunityImagePersistent.__wtExpirePatched) {
        const oldSave = window.wtSaveCommunityImagePersistent;
        const patched = async function(src, options = {}) {
            pruneExpiredLocalImages();
            const img = await oldSave(src, options);
            pruneExpiredLocalImages();
            return img;
        };
        patched.__wtExpirePatched = true;
        window.wtSaveCommunityImagePersistent = patched;
    }

    function tick() {
        patchDeleteFunction();
        patchLikeFunction();
        pruneExpiredLocalImages();
        pruneExpiredMemoryImages();
        mergeNonExpiredLocalImages();
    }

    tick();
    setInterval(tick, 60 * 1000);

    const originalRender = window.renderApp;
    if (typeof originalRender === "function" && !originalRender.__wtDeleteExpirePatched) {
        const patchedRender = function(...args) {
            tick();
            return originalRender.apply(this, args);
        };
        patchedRender.__wtDeleteExpirePatched = true;
        window.renderApp = patchedRender;
    }
})();




/* =========================================================
   Tagesbilder Like Fix FINAL 2
   Speichert Likes lokal + in Bildobjekt + patched Anzeige nach jedem Render
   ========================================================= */
(function wtGalleryLikeFixFinal2() {
    if (window.__wtGalleryLikeFixFinal2) return;
    window.__wtGalleryLikeFixFinal2 = true;

    const LIKES_KEY = "wt_gallery_likes_final2";
    const LOCAL_IMAGES_KEY = "wt_gallery_local_fallback_images_v1";

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
            console.warn("Lokale Gallery-Daten konnten nicht gespeichert werden:", err);
        }
    }

    function userKey() {
        try {
            if (typeof currentUser !== "undefined" && currentUser) return String(currentUser);
        } catch (_) {}

        try {
            const rawUser =
                localStorage.getItem("currentUser") ||
                localStorage.getItem("wtCurrentUser") ||
                localStorage.getItem("winterthur_user") ||
                sessionStorage.getItem("currentUser") ||
                "";
            if (rawUser) return String(rawUser);
        } catch (_) {}

        let anon = localStorage.getItem("wt_gallery_like_anon_user_final2");
        if (!anon) {
            anon = "anon_" + Date.now() + "_" + Math.random().toString(36).slice(2);
            localStorage.setItem("wt_gallery_like_anon_user_final2", anon);
        }
        return anon;
    }

    function imgId(id) {
        return String(id || "");
    }

    function normalizeLikes(likes) {
        return Array.from(new Set((Array.isArray(likes) ? likes : []).map(String).filter(Boolean)));
    }

    function likesMap() {
        const map = readJson(LIKES_KEY, {});
        return map && typeof map === "object" ? map : {};
    }

    function saveLikesMap(map) {
        writeJson(LIKES_KEY, map || {});
    }

    function arrays() {
        const out = [];
        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) out.push(communityImages);
        } catch (_) {}
        if (Array.isArray(window.communityImages) && !out.includes(window.communityImages)) out.push(window.communityImages);
        return out;
    }

    function readLocalImages() {
        const arr = readJson(LOCAL_IMAGES_KEY, []);
        return Array.isArray(arr) ? arr : [];
    }

    function writeLocalImages(arr) {
        writeJson(LOCAL_IMAGES_KEY, Array.isArray(arr) ? arr : []);
    }

    function allImages() {
        const list = [];
        arrays().forEach(arr => arr.forEach(img => list.push(img)));
        readLocalImages().forEach(img => list.push(img));
        return list;
    }

    function findImage(id) {
        const idStr = imgId(id);
        return allImages().find(img => imgId(img && img.id) === idStr) || null;
    }

    function setLikesEverywhere(id, likes) {
        const idStr = imgId(id);
        const cleanLikes = normalizeLikes(likes);

        arrays().forEach(arr => {
            arr.forEach(img => {
                if (imgId(img && img.id) === idStr) img.likes = cleanLikes.slice();
            });
        });

        const local = readLocalImages();
        let changed = false;
        local.forEach(img => {
            if (imgId(img && img.id) === idStr) {
                img.likes = cleanLikes.slice();
                changed = true;
            }
        });
        if (changed) writeLocalImages(local);

        const map = likesMap();
        map[idStr] = cleanLikes.slice();
        saveLikesMap(map);
    }

    function mergeLikesIntoImages() {
        const map = likesMap();

        allImages().forEach(img => {
            if (!img || !img.id) return;
            const idStr = imgId(img.id);
            const localLikes = normalizeLikes(map[idStr]);
            const currentLikes = normalizeLikes(img.likes);
            const merged = Array.from(new Set([...currentLikes, ...localLikes]));
            img.likes = merged;
        });

        const local = readLocalImages();
        let changed = false;
        local.forEach(img => {
            if (!img || !img.id) return;
            const idStr = imgId(img.id);
            const merged = Array.from(new Set([...normalizeLikes(img.likes), ...normalizeLikes(map[idStr])]));
            if (JSON.stringify(img.likes || []) !== JSON.stringify(merged)) {
                img.likes = merged;
                changed = true;
            }
        });
        if (changed) writeLocalImages(local);
    }

    function syncLocalFallbackImagesIntoMemory() {
        const local = readLocalImages();
        if (!local.length) return;

        const maxAge = 24 * 60 * 60 * 1000;
        const valid = local.filter(img => {
            if (!img || img.isDeleted) return false;
            const t = new Date(img.timestamp || 0).getTime();
            return !t || Date.now() - t <= maxAge;
        });

        arrays().forEach(arr => {
            const ids = new Set(arr.map(img => imgId(img && img.id)));
            valid.slice().reverse().forEach(img => {
                if (!ids.has(imgId(img.id))) arr.unshift(img);
            });
        });
    }

    function toggleLike(id) {
        const idStr = imgId(id);
        const user = userKey();

        syncLocalFallbackImagesIntoMemory();
        mergeLikesIntoImages();

        const img = findImage(idStr);
        if (!img) return;

        const current = normalizeLikes(img.likes);
        const idx = current.indexOf(user);
        if (idx >= 0) current.splice(idx, 1);
        else current.push(user);

        setLikesEverywhere(idStr, current);

        // Sofort Anzeige reparieren, bevor Firebase zurückschreibt
        patchVisibleHearts();

        // Remote versuchen, aber lokaler Zustand ist führend.
        try {
            if (typeof window.saveState === "function") window.saveState();
        } catch (err) {
            console.warn("Remote-Like konnte nicht gespeichert werden, lokal bleibt er erhalten:", err);
        }

        if (typeof renderApp === "function") {
            setTimeout(() => {
                syncLocalFallbackImagesIntoMemory();
                mergeLikesIntoImages();
                renderApp();
                setTimeout(patchVisibleHearts, 30);
            }, 0);
        }
    }

    function patchVisibleHearts() {
        const user = userKey();
        mergeLikesIntoImages();

        // Patche alle sichtbaren Buttons, die eine ID im onclick enthalten.
        document.querySelectorAll("button[onclick*='toggleCommunityImageLike']").forEach(btn => {
            const onclick = btn.getAttribute("onclick") || "";
            const match = onclick.match(/toggleCommunityImageLike\(['"]?([^'")]+)['"]?\)/);
            if (!match) return;
            const id = match[1];
            const img = findImage(id);
            if (!img) return;

            const likes = normalizeLikes(img.likes);
            const liked = likes.includes(user);

            btn.classList.toggle("text-red-500", liked);
            btn.classList.toggle("text-white", !liked);

            const icon = btn.querySelector("[data-lucide='heart'], svg, i");
            if (icon) {
                icon.classList.toggle("fill-current", liked);
                icon.classList.toggle("text-red-500", liked);
            }

            // Versuche sichtbare Zahl im Button zu setzen
            Array.from(btn.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().match(/^\d+$/)) {
                    node.textContent = String(likes.length);
                }
            });
            const spans = btn.querySelectorAll("span");
            spans.forEach(span => {
                if (span.textContent.trim().match(/^\d+$/)) span.textContent = String(likes.length);
            });
        });
    }

    // Globale Funktionen überschreiben
    window.toggleCommunityImageLike = toggleLike;
    window.likeCommunityImage = toggleLike;
    window.toggleGalleryImageLike = toggleLike;

    // renderApp wrappen
    const oldRender = window.renderApp;
    if (typeof oldRender === "function" && !oldRender.__wtLikeFixFinal2Patched) {
        const patched = function(...args) {
            syncLocalFallbackImagesIntoMemory();
            mergeLikesIntoImages();
            const result = oldRender.apply(this, args);
            setTimeout(patchVisibleHearts, 30);
            return result;
        };
        patched.__wtLikeFixFinal2Patched = true;
        window.renderApp = patched;
    }

    // Falls alter onclick trotz Cache feuert
    document.addEventListener("click", event => {
        const btn = event.target.closest && event.target.closest("button[onclick*='toggleCommunityImageLike']");
        if (!btn) return;

        const onclick = btn.getAttribute("onclick") || "";
        const match = onclick.match(/toggleCommunityImageLike\(['"]?([^'")]+)['"]?\)/);
        if (!match) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (typeof window.toggleCommunityImageLike === "function") {
            window.toggleCommunityImageLike(match[1]);
        } else {
            toggleLike(match[1]);
        }
    }, true);

    syncLocalFallbackImagesIntoMemory();
    mergeLikesIntoImages();
    setInterval(() => {
        syncLocalFallbackImagesIntoMemory();
        mergeLikesIntoImages();
        patchVisibleHearts();
    }, 350);
})();




/* =========================================================
   Rollen + Tagesbilder global speichern Fix
   ========================================================= */
(function wtRolesAndGalleryGlobalFix() {
    if (window.__wtRolesAndGalleryGlobalFix) return;
    window.__wtRolesAndGalleryGlobalFix = true;

    // saveUsersNow war vorher nur lokal im Script erreichbar. Admin.js braucht aber eine window-Funktion.
    try {
        if (typeof saveUsersNow === "function") window.saveUsersNow = saveUsersNow;
    } catch (_) {}

    function getCommunityImagesArray() {
        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) return communityImages;
        } catch (_) {}
        if (!Array.isArray(window.communityImages)) window.communityImages = [];
        return window.communityImages;
    }

    function normalizeImage(img) {
        if (!img) return img;
        if (!Array.isArray(img.likes)) img.likes = [];
        if (!img.timestamp) img.timestamp = new Date().toISOString();
        if (!("isDeleted" in img)) img.isDeleted = false;
        return img;
    }

    async function saveCommunityImagesGlobally() {
        const images = getCommunityImagesArray().map(normalizeImage);

        if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
            await firebaseDb.collection("data").doc("articles").set({
                communityImages: images,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return true;
        }

        if (typeof window.saveState === "function") {
            await window.saveState();
            return true;
        }

        return false;
    }

    // Diese Funktion speichert auch lokale Fallback-Bilder in Firebase,
    // damit ALLE Besucher sie sehen und nicht nur der Browser des Uploaders.
    window.wtSaveCommunityImageGlobal = async function(imgOrUrl, options = {}) {
        const images = getCommunityImagesArray();

        let img;
        if (typeof imgOrUrl === "string") {
            img = {
                id: options.id || ("img_" + Date.now()),
                url: imgOrUrl,
                uploader: currentUser || "Gast",
                timestamp: new Date().toISOString(),
                isDeleted: false,
                likes: []
            };
        } else {
            img = { ...imgOrUrl };
        }

        normalizeImage(img);

        const idx = images.findIndex(x => String(x.id) === String(img.id));
        if (idx >= 0) images[idx] = { ...images[idx], ...img };
        else images.unshift(img);

        // Auch window.communityImages synchron halten
        if (Array.isArray(window.communityImages) && window.communityImages !== images) {
            const widx = window.communityImages.findIndex(x => String(x.id) === String(img.id));
            if (widx >= 0) window.communityImages[widx] = { ...window.communityImages[widx], ...img };
            else window.communityImages.unshift(img);
        }

        try {
            await saveCommunityImagesGlobally();
        } catch (err) {
            console.warn("Tagesbild konnte nicht global gespeichert werden:", err);
            // Fallback lokal bleibt trotzdem
            try {
                const key = "wt_gallery_local_fallback_images_v1";
                const local = JSON.parse(localStorage.getItem(key) || "[]");
                local.unshift(img);
                localStorage.setItem(key, JSON.stringify(local.slice(0, 25)));
            } catch (_) {}
        }

        if (typeof renderApp === "function") renderApp();
        return img;
    };

    // Falls eine ältere Fallback-Funktion benutzt wird, leiten wir sie auf die globale Speicherung um.
    const oldPersistent = window.wtSaveCommunityImagePersistent;
    window.wtSaveCommunityImagePersistent = async function(src, options = {}) {
        return await window.wtSaveCommunityImageGlobal(src, options);
    };
    window.wtSaveCommunityImagePersistent.__wtGlobalPatched = true;

    // Likes ebenfalls global speichern statt nur lokal führen
    const oldToggle = window.toggleCommunityImageLike;
    window.toggleCommunityImageLike = function(id) {
        const images = getCommunityImagesArray();
        const img = images.find(x => String(x.id) === String(id));
        if (!img) {
            if (typeof oldToggle === "function") return oldToggle(id);
            return;
        }

        const user = currentUser || localStorage.getItem("wt_gallery_anon_like_user_final2") || "Gast";
        if (!Array.isArray(img.likes)) img.likes = [];

        const idx = img.likes.map(String).indexOf(String(user));
        if (idx >= 0) img.likes.splice(idx, 1);
        else img.likes.push(user);

        img.likes = Array.from(new Set(img.likes.map(String)));

        saveCommunityImagesGlobally().finally(() => {
            if (typeof renderApp === "function") renderApp();
        });
    };
})();


/* =========================================================
   Tagesbilder Upload Final-Fix
   ========================================================= */
(function wtGalleryUploadFinalFix() {
    if (window.__wtGalleryUploadFinalFix) return;
    window.__wtGalleryUploadFinalFix = true;

    const WORKER_TARGET_BYTES = 1800 * 1024;
    const FALLBACK_TARGET_BYTES = 520 * 1024;
    const FALLBACK_MAX_CHARS = 920000;

    function readFileAsDataUrlFinal(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(String(e.target.result || ""));
            reader.onerror = () => reject(reader.error || new Error("Datei konnte nicht gelesen werden."));
            reader.readAsDataURL(file);
        });
    }

    function loadImageFinal(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
            img.src = dataUrl;
        });
    }

    function canvasToBlobFinal(canvas, mime, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Bild konnte nicht komprimiert werden.")), mime, quality);
        });
    }

    async function blobToDataUrlFinal(blob) {
        return await readFileAsDataUrlFinal(blob);
    }

    async function compressImageFinal(file, targetBytes, startMaxSide) {
        const originalDataUrl = await readFileAsDataUrlFinal(file);
        const img = await loadImageFinal(originalDataUrl);
        let maxSide = startMaxSide || 2200;
        let best = null;

        for (let sizeRound = 0; sizeRound < 8; sizeRound++) {
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const width = Math.max(1, Math.round(img.width * scale));
            const height = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d", { alpha: false });
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            for (const quality of [0.9, 0.84, 0.78, 0.7, 0.62, 0.54, 0.46]) {
                const blob = await canvasToBlobFinal(canvas, "image/jpeg", quality);
                const dataUrl = await blobToDataUrlFinal(blob);
                best = {
                    blob,
                    dataUrl,
                    bytes: blob.size,
                    contentType: "image/jpeg",
                    filename: String(file.name || `tagesbild-${Date.now()}.jpg`).replace(/\.[^.]+$/, "") + ".jpg"
                };
                if (blob.size <= targetBytes) return best;
            }

            maxSide = Math.round(maxSide * 0.78);
            if (maxSide < 700) break;
        }

        return best;
    }

    function dataUrlToBase64Final(dataUrl) {
        const text = String(dataUrl || "");
        const comma = text.indexOf(",");
        return comma >= 0 ? text.slice(comma + 1) : text;
    }

    async function getWorkerBaseFinal() {
        const configured = String(window.WT_WORKER_BASE_FROM_CONFIG || "").trim();
        if (configured) return configured.replace(/\/+$/, "");

        try {
            if (typeof loadPublicConfigFromWorker === "function") {
                const data = await loadPublicConfigFromWorker();
                const fromConfig = String((data && data.workerBase) || window.WT_WORKER_BASE_FROM_CONFIG || "").trim();
                if (fromConfig) return fromConfig.replace(/\/+$/, "");
            }
        } catch (_) {}

        return String(WT_WORKER_BASE || "").replace(/\/+$/, "");
    }

    async function uploadPreparedViaWorkerFinal(prepared) {
        const workerBase = await getWorkerBaseFinal();
        if (!workerBase) throw new Error("Worker-URL fehlt.");

        const payload = {
            filename: prepared.filename || `tagesbild-${Date.now()}.jpg`,
            contentType: prepared.contentType || "image/jpeg",
            base64: dataUrlToBase64Final(prepared.dataUrl),
            uploader: currentUser || "gast"
        };

        const routes = ["/api/gallery/upload", "/api/admin/upload-image", "/api/upload-image"];
        const errors = [];

        for (const route of routes) {
            try {
                const res = await fetch(`${workerBase}${route}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const text = await res.text();
                let data = {};
                try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { details: text }; }

                if (res.ok && (data.image || data.url)) return data.image || data.url;
                errors.push(`${route}: ${res.status} ${data.error || data.details || text || res.statusText}`);
            } catch (err) {
                errors.push(`${route}: ${err.message || err}`);
            }
        }

        throw new Error(errors.join(" | "));
    }

    async function saveCommunityImageFinal(src, options = {}) {
        if (typeof window.wtSaveCommunityImageGlobal === "function") {
            return await window.wtSaveCommunityImageGlobal(src, options);
        }

        const img = typeof src === "string" ? {
            id: options.id || ("img_" + Date.now()),
            url: src,
            uploader: currentUser || "Gast",
            timestamp: new Date().toISOString(),
            isDeleted: false,
            likes: []
        } : { ...src };
        if (!Array.isArray(img.likes)) img.likes = [];
        if (!img.timestamp) img.timestamp = new Date().toISOString();
        if (!("isDeleted" in img)) img.isDeleted = false;
        communityImages.unshift(img);
        try { await window.saveState(); } catch (_) {}
        if (typeof renderApp === "function") renderApp();
        return true;
    }

    window.handleCommunityUpload = async function() {
        if (!currentUser) return;

        const fileInput = document.getElementById("communityImgFile");
        const urlInput = document.getElementById("communityImgUrl");

        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            if (!file.type || !file.type.startsWith("image/")) {
                showModal("Fehler", "Bitte waehle eine Bilddatei aus.");
                return;
            }

            try {
                showModal("Upload laeuft", "Bild wird vorbereitet. Bitte kurz warten.");

                if (file.size <= WT_GALLERY_INLINE_LIMIT_BYTES) {
                    const dataUrl = await readFileAsDataUrlFinal(file);
                    try {
                        const uploadedImage = await uploadPreparedViaWorkerFinal({
                            dataUrl,
                            filename: file.name || `tagesbild-${Date.now()}.jpg`,
                            contentType: file.type || "image/jpeg"
                        });
                        await saveCommunityImageFinal(uploadedImage);
                    } catch (workerErr) {
                        console.warn("Tagesbild Worker/GitHub Upload fuer kleines Bild fehlgeschlagen:", workerErr);
                        await saveCommunityImageFinal(dataUrl);
                    }
                    showModal("Erfolgreich", "Dein Bild wurde hochgeladen und ist nun fuer 24 Stunden sichtbar.");
                    return;
                }

                const preparedForWorker = await compressImageFinal(file, WORKER_TARGET_BYTES, 2400);
                try {
                    const uploadedImage = await uploadPreparedViaWorkerFinal(preparedForWorker);
                    await saveCommunityImageFinal(uploadedImage);
                    showModal("Erfolgreich", "Dein Bild wurde hochgeladen und ist nun fuer 24 Stunden sichtbar.");
                    return;
                } catch (workerErr) {
                    console.warn("Tagesbild Worker/GitHub Upload fehlgeschlagen:", workerErr);
                    const fallback = await compressImageFinal(file, FALLBACK_TARGET_BYTES, 1500);
                    if (fallback && fallback.dataUrl && fallback.dataUrl.length <= FALLBACK_MAX_CHARS) {
                        await saveCommunityImageFinal(fallback.dataUrl, { isLocalFallback: true });
                        showModal("Erfolgreich", "Dein Bild wurde hochgeladen und ist nun fuer 24 Stunden sichtbar.");
                        return;
                    }
                    throw workerErr;
                }
            } catch (err) {
                console.error("Tagesbild Upload fehlgeschlagen:", err);
                showModal("Fehler", "Das Bild konnte nicht hochgeladen werden. Bitte versuche ein anderes Bild oder lade die Seite neu.");
            }
            return;
        }

        if (urlInput && urlInput.value.trim() !== "") {
            await saveCommunityImageFinal(urlInput.value.trim());
            showModal("Erfolgreich", "Dein Bild wurde veroeffentlicht.");
            return;
        }

        showModal("Fehler", "Bitte waehle ein Bild von deinem PC aus oder gib eine Bild-URL ein.");
    };
})();


/* =========================================================
   Tagesbilder Like Persistenz letzter aktiver Override
   ========================================================= */
(function wtGalleryLikePersistLastActiveFix() {
    if (window.__wtGalleryLikePersistLastActiveFix) return;
    window.__wtGalleryLikePersistLastActiveFix = true;

    const LIKES_KEY = "wt_gallery_likes_final2";

    function getImages() {
        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) return communityImages;
        } catch (_) {}
        if (!Array.isArray(window.communityImages)) window.communityImages = [];
        return window.communityImages;
    }

    function cleanLikes(likes) {
        return Array.from(new Set((Array.isArray(likes) ? likes : []).map(String).filter(Boolean)));
    }

    function currentLikeUser() {
        try {
            if (typeof currentUser !== "undefined" && currentUser) return String(currentUser);
        } catch (_) {}
        return "";
    }

    function rememberLikeState(id, likes) {
        try {
            const map = JSON.parse(localStorage.getItem(LIKES_KEY) || "{}");
            map[String(id)] = cleanLikes(likes);
            localStorage.setItem(LIKES_KEY, JSON.stringify(map));
        } catch (_) {}
    }

    async function saveGalleryImages() {
        const images = getImages();

        if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
            await firebaseDb.collection("data").doc("articles").set({
                communityImages: images,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return true;
        }

        if (typeof window.saveState === "function") {
            await window.saveState();
            return true;
        }

        return false;
    }

    window.toggleCommunityImageLike = function(id) {
        const user = currentLikeUser();
        if (!user) {
            if (typeof showUserLogin === "function") showUserLogin();
            return;
        }

        const images = getImages();
        const img = images.find(item => String(item && item.id) === String(id));
        if (!img) return;

        const likes = cleanLikes(img.likes);
        const index = likes.indexOf(user);
        if (index >= 0) likes.splice(index, 1);
        else likes.push(user);

        img.likes = cleanLikes(likes);
        rememberLikeState(img.id, img.likes);

        saveGalleryImages()
            .catch(err => console.warn("Tagesbild-Like konnte nicht global gespeichert werden:", err))
            .finally(() => {
                if (typeof renderApp === "function") renderApp();
            });
    };
})();


/* =========================================================
   Tagesbilder GitHub Public Sync
   ========================================================= */
(function wtGalleryGitHubPublicSyncFix() {
    if (window.__wtGalleryGitHubPublicSyncFix) return;
    window.__wtGalleryGitHubPublicSyncFix = true;

    async function getWorkerBase() {
        const configured = String(window.WT_WORKER_BASE_FROM_CONFIG || "").trim();
        if (configured) return configured.replace(/\/+$/, "");

        try {
            if (typeof loadPublicConfigFromWorker === "function") {
                const data = await loadPublicConfigFromWorker();
                const fromConfig = String((data && data.workerBase) || window.WT_WORKER_BASE_FROM_CONFIG || "").trim();
                if (fromConfig) return fromConfig.replace(/\/+$/, "");
            }
        } catch (_) {}

        return String(WT_WORKER_BASE || "").replace(/\/+$/, "");
    }

    function getImages() {
        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) return communityImages;
        } catch (_) {}
        if (!Array.isArray(window.communityImages)) window.communityImages = [];
        return window.communityImages;
    }

    function normalizePublicImage(img) {
        if (!img || !img.url) return null;
        const out = { ...img };
        out.id = out.id || ("gh_" + String(out.url).split("/").pop() || Date.now());
        out.uploader = out.uploader || "Gast";
        out.timestamp = out.timestamp || new Date().toISOString();
        out.isDeleted = out.isDeleted === true;
        out.likes = Array.isArray(out.likes) ? out.likes : [];
        return out;
    }

    function mergePublicImages(images) {
        const list = getImages();
        let changed = false;

        (Array.isArray(images) ? images : []).map(normalizePublicImage).filter(Boolean).forEach(img => {
            const existingIndex = list.findIndex(item => String(item && item.id) === String(img.id) || String(item && item.url) === String(img.url));
            if (existingIndex >= 0) {
                list[existingIndex] = { ...img, ...list[existingIndex], likes: Array.from(new Set([...(img.likes || []), ...(list[existingIndex].likes || [])].map(String))) };
            } else {
                list.unshift(img);
                changed = true;
            }
        });

        return changed;
    }

    window.wtLoadPublicGalleryImages = async function() {
        const workerBase = await getWorkerBase();
        if (!workerBase) return false;

        const res = await fetch(`${workerBase}/api/gallery/list`, { method: "GET", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.images)) return false;

        const changed = mergePublicImages(data.images);
        if (changed && typeof renderApp === "function") renderApp();
        return true;
    };

    const originalSetView = window.setView;
    if (typeof originalSetView === "function" && !originalSetView.__wtGalleryPublicSyncPatched) {
        const patchedSetView = function(newView) {
            const result = originalSetView.apply(this, arguments);
            if (newView === "gallery") {
                window.wtLoadPublicGalleryImages().catch(err => console.warn("Oeffentliche Tagesbilder konnten nicht geladen werden:", err));
            }
            return result;
        };
        patchedSetView.__wtGalleryPublicSyncPatched = true;
        window.setView = patchedSetView;
    }

    setTimeout(() => {
        window.wtLoadPublicGalleryImages().catch(err => console.warn("Oeffentliche Tagesbilder konnten nicht geladen werden:", err));
    }, 1500);
    setInterval(() => {
        window.wtLoadPublicGalleryImages().catch(() => {});
    }, 60000);
})();


/* =========================================================
   Tagesbilder Online Single Source Final Fix
   - Worker/GitHub/KV ist die gemeinsame Quelle
   - kein privater Erfolgs-Fallback mehr
   - Loeschen und Liken werden online gespeichert
   ========================================================= */
(function wtGalleryOnlineSingleSourceFinalFix() {
    if (window.__wtGalleryOnlineSingleSourceFinalFix) return;
    window.__wtGalleryOnlineSingleSourceFinalFix = true;

    const WORKER_TARGET_BYTES = 1800 * 1024;
    const DELETED_KEY = "wt_gallery_deleted_tombstones_final";

    function readFileAsDataUrlOnline(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(String(event.target && event.target.result || ""));
            reader.onerror = () => reject(reader.error || new Error("Datei konnte nicht gelesen werden."));
            reader.readAsDataURL(file);
        });
    }

    function loadImageOnline(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
            img.src = dataUrl;
        });
    }

    function canvasToBlobOnline(canvas, mime, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Bild konnte nicht komprimiert werden.")), mime, quality);
        });
    }

    async function blobToDataUrlOnline(blob) {
        return await readFileAsDataUrlOnline(blob);
    }

    async function compressForOnlineGallery(file) {
        const originalDataUrl = await readFileAsDataUrlOnline(file);
        const img = await loadImageOnline(originalDataUrl);
        let maxSide = 2400;
        let best = null;

        for (let round = 0; round < 9; round++) {
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const width = Math.max(1, Math.round(img.width * scale));
            const height = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d", { alpha: false });
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            for (const quality of [0.9, 0.84, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38]) {
                const blob = await canvasToBlobOnline(canvas, "image/jpeg", quality);
                const dataUrl = await blobToDataUrlOnline(blob);
                best = {
                    dataUrl,
                    bytes: blob.size,
                    contentType: "image/jpeg",
                    filename: String(file.name || `tagesbild-${Date.now()}.jpg`).replace(/\.[^.]+$/, "") + ".jpg"
                };
                if (blob.size <= WORKER_TARGET_BYTES) return best;
            }

            maxSide = Math.round(maxSide * 0.76);
            if (maxSide < 640) break;
        }

        if (!best) throw new Error("Bild konnte nicht vorbereitet werden.");
        return best;
    }

    function dataUrlToBase64Online(dataUrl) {
        const text = String(dataUrl || "");
        const comma = text.indexOf(",");
        return comma >= 0 ? text.slice(comma + 1) : text;
    }

    async function getGalleryWorkerBaseOnline() {
        const configured = String(window.WT_WORKER_BASE_FROM_CONFIG || "").trim();
        if (configured) return configured.replace(/\/+$/, "");

        try {
            if (typeof loadPublicConfigFromWorker === "function") {
                const data = await loadPublicConfigFromWorker();
                const fromConfig = String((data && data.workerBase) || window.WT_WORKER_BASE_FROM_CONFIG || "").trim();
                if (fromConfig) return fromConfig.replace(/\/+$/, "");
            }
        } catch (_) {}

        return String(WT_WORKER_BASE || "").replace(/\/+$/, "");
    }

    async function galleryRequestOnline(route, payload) {
        const workerBase = await getGalleryWorkerBaseOnline();
        if (!workerBase) throw new Error("Worker-URL fehlt.");

        const res = await fetch(`${workerBase}${route}`, {
            method: payload ? "POST" : "GET",
            headers: payload ? { "Content-Type": "application/json" } : undefined,
            body: payload ? JSON.stringify(payload) : undefined,
            cache: "no-store"
        });
        const text = await res.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { details: text }; }

        if (!res.ok || data.ok === false) {
            throw new Error(data.error || data.details || text || `HTTP ${res.status}`);
        }

        return data;
    }

    function normalizeOnlineGalleryImage(img) {
        if (!img || !img.url) return null;
        return {
            ...img,
            id: String(img.id || img.path || img.url),
            uploader: img.uploader || "Gast",
            timestamp: img.timestamp || new Date().toISOString(),
            isDeleted: img.isDeleted === true,
            likes: Array.isArray(img.likes) ? Array.from(new Set(img.likes.map(String))) : []
        };
    }

    function readDeletedGalleryTombstones() {
        try {
            const parsed = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    function writeDeletedGalleryTombstones(list) {
        try {
            localStorage.setItem(DELETED_KEY, JSON.stringify((Array.isArray(list) ? list : []).slice(-500)));
        } catch (_) {}
    }

    function galleryDeleteKeys(img) {
        if (!img) return [];
        return [img.id, img.url, img.path].map(value => String(value || "").trim()).filter(Boolean);
    }

    function rememberGalleryDeleted(img) {
        const keys = galleryDeleteKeys(img);
        if (!keys.length) return;
        const now = new Date().toISOString();
        const existing = readDeletedGalleryTombstones();
        const next = existing.filter(item => !galleryDeleteKeys(item).some(key => keys.includes(key)));
        next.push({
            id: img.id || "",
            url: img.url || "",
            path: img.path || "",
            deletedAt: now
        });
        writeDeletedGalleryTombstones(next);
    }

    window.wtGalleryIsLocallyDeleted = function(img) {
        const keys = galleryDeleteKeys(img);
        if (!keys.length) return false;
        return readDeletedGalleryTombstones().some(item => galleryDeleteKeys(item).some(key => keys.includes(key)));
    };

    function renderAfterGalleryOnlineSync() {
        try {
            if (typeof wtShouldDeferRemoteRender === "function" && wtShouldDeferRemoteRender()) {
                pendingRemoteRender = true;
                return;
            }
        } catch (_) {}

        if (typeof renderApp === "function") renderApp();
    }

    function replaceGalleryImagesOnline(images) {
        const normalized = (Array.isArray(images) ? images : [])
            .map(normalizeOnlineGalleryImage)
            .filter(img => img && !window.wtGalleryIsLocallyDeleted(img));

        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) {
                communityImages.splice(0, communityImages.length, ...normalized);
                window.communityImages = communityImages;
            } else {
                window.communityImages = normalized;
            }
        } catch (_) {
            window.communityImages = normalized;
        }

        renderAfterGalleryOnlineSync();
        return normalized;
    }

    function getCurrentGalleryImagesOnline() {
        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) return communityImages;
        } catch (_) {}
        if (!Array.isArray(window.communityImages)) window.communityImages = [];
        return window.communityImages;
    }

    function findGalleryImageOnline(id) {
        const idStr = String(id || "");
        return getCurrentGalleryImagesOnline().find(img => String(img && img.id) === idStr);
    }

    function upsertGalleryImageLocallyOnline(image) {
        const img = normalizeOnlineGalleryImage(image);
        if (!img) return;
        const list = getCurrentGalleryImagesOnline();
        const index = list.findIndex(item => String(item && item.id) === String(img.id) || String(item && item.url) === String(img.url));
        if (index >= 0) list[index] = { ...list[index], ...img };
        else list.unshift(img);
        renderAfterGalleryOnlineSync();
    }

    window.wtLoadPublicGalleryImages = async function() {
        const data = await galleryRequestOnline("/api/gallery/list");
        replaceGalleryImagesOnline(data.images || []);
        return true;
    };

    window.handleCommunityUpload = async function() {
        if (!currentUser) {
            if (typeof showUserLogin === "function") showUserLogin();
            return;
        }

        const fileInput = document.getElementById("communityImgFile");
        const urlInput = document.getElementById("communityImgUrl");
        const urlValue = urlInput ? urlInput.value.trim() : "";

        try {
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                if (!file.type || !file.type.startsWith("image/")) {
                    showModal("Fehler", "Bitte waehle eine Bilddatei aus.");
                    return;
                }

                showModal("Upload laeuft", "Bild wird online gespeichert. Bitte kurz warten.");
                const prepared = await compressForOnlineGallery(file);
                const data = await galleryRequestOnline("/api/gallery/upload", {
                    filename: prepared.filename || `tagesbild-${Date.now()}.jpg`,
                    contentType: prepared.contentType || "image/jpeg",
                    base64: dataUrlToBase64Online(prepared.dataUrl),
                    uploader: currentUser || "gast"
                });

                upsertGalleryImageLocallyOnline(data.image || data);
                if (fileInput) fileInput.value = "";
                try { await window.wtLoadPublicGalleryImages(); } catch (_) {}
                showModal("Erfolgreich", "Dein Bild wurde online gespeichert und ist fuer alle Besucher sichtbar.");
                return;
            }

            if (urlValue) {
                showModal("Speichern laeuft", "Bild-URL wird online gespeichert.");
                const data = await galleryRequestOnline("/api/gallery/save-url", {
                    url: urlValue,
                    uploader: currentUser || "gast"
                });
                upsertGalleryImageLocallyOnline(data.image || data);
                if (urlInput) urlInput.value = "";
                try { await window.wtLoadPublicGalleryImages(); } catch (_) {}
                showModal("Erfolgreich", "Dein Bild wurde online gespeichert und ist fuer alle Besucher sichtbar.");
                return;
            }

            showModal("Fehler", "Bitte waehle ein Bild von deinem PC aus oder gib eine Bild-URL ein.");
        } catch (err) {
            console.error("Tagesbild Online-Upload fehlgeschlagen:", err);
            showModal(
                "Fehler",
                "Das Bild konnte nicht online gespeichert werden. Bitte pruefe den Cloudflare Worker und das KV Binding chatkv. Details: " + (err.message || err)
            );
        }
    };

    window.deleteCommunityImage = function(id) {
        const img = findGalleryImageOnline(id);
        currentModal = {
            title: "Bild loeschen?",
            message: "Moechtest du dieses Bild wirklich aus der gemeinsamen Galerie entfernen?",
            onConfirm: async function() {
                currentModal = null;
                const currentImg = img || findGalleryImageOnline(id) || { id };
                rememberGalleryDeleted(currentImg);
                const list = getCurrentGalleryImagesOnline();
                const local = list.find(item => String(item && item.id) === String(id));
                if (local) {
                    local.isDeleted = true;
                    rememberGalleryDeleted(local);
                }
                renderAfterGalleryOnlineSync();

                try {
                    await galleryRequestOnline("/api/gallery/delete", {
                        id: currentImg.id || id,
                        url: currentImg.url || "",
                        path: currentImg.path || "",
                        deletedBy: currentUser || "admin"
                    });
                    await window.wtLoadPublicGalleryImages();
                } catch (err) {
                    console.error("Tagesbild online loeschen fehlgeschlagen:", err);
                    showModal("Fehler", "Das Bild konnte nicht online geloescht werden. Details: " + (err.message || err));
                    try { await window.wtLoadPublicGalleryImages(); } catch (_) {}
                }
            }
        };
        if (typeof renderApp === "function") renderApp();
    };

    window.toggleCommunityImageLike = function(id) {
        if (!currentUser) {
            if (typeof showUserLogin === "function") showUserLogin();
            return;
        }

        const img = findGalleryImageOnline(id);
        if (!img) return;
        if (!Array.isArray(img.likes)) img.likes = [];

        const user = String(currentUser);
        const index = img.likes.map(String).indexOf(user);
        if (index >= 0) img.likes.splice(index, 1);
        else img.likes.push(user);
        renderAfterGalleryOnlineSync();

        galleryRequestOnline("/api/gallery/like", {
            id: img.id || id,
            url: img.url || "",
            path: img.path || "",
            user
        })
            .then(data => {
                if (Array.isArray(data.images)) replaceGalleryImagesOnline(data.images);
                else if (data.image) upsertGalleryImageLocallyOnline(data.image);
            })
            .catch(err => {
                console.error("Tagesbild-Like online fehlgeschlagen:", err);
                window.wtLoadPublicGalleryImages().catch(() => {});
            });
    };

    const previousSetView = window.setView;
    if (typeof previousSetView === "function" && !previousSetView.__wtGalleryOnlineSingleSourcePatched) {
        const patchedSetView = function(newView) {
            const result = previousSetView.apply(this, arguments);
            if (newView === "gallery") {
                window.wtLoadPublicGalleryImages().catch(err => console.warn("Tagesbilder konnten nicht online geladen werden:", err));
            }
            return result;
        };
        patchedSetView.__wtGalleryOnlineSingleSourcePatched = true;
        window.setView = patchedSetView;
    }

    setTimeout(() => {
        window.wtLoadPublicGalleryImages().catch(err => console.warn("Tagesbilder konnten nicht online geladen werden:", err));
    }, 1000);
    setInterval(() => {
        window.wtLoadPublicGalleryImages().catch(() => {});
    }, 15000);
})();


/* =========================================================
   Ressorts ueberall automatisch synchron halten
   ========================================================= */
(function wtCategoryEverywhereAutoSyncFinal() {
    if (window.__wtCategoryEverywhereAutoSyncFinal) return;
    window.__wtCategoryEverywhereAutoSyncFinal = true;

    function syncCategoriesEverywhere() {
        let merged = [];
        try {
            merged = mergeCategoryListsWithoutLoss(categories, window.categories);
        } catch (_) {
            merged = Array.isArray(window.categories) ? window.categories.slice() : [];
        }
        if (!merged.length) return;

        const current = Array.isArray(categories) ? categories : [];
        const changed = JSON.stringify(current) !== JSON.stringify(merged);
        if (!changed) return;

        categories = merged;
        window.categories = categories;
        try { localStorage.setItem("wt_categories_backup", JSON.stringify(categories)); } catch (_) {}

        try {
            if (typeof wtShouldDeferRemoteRender === "function" && wtShouldDeferRemoteRender()) {
                pendingRemoteRender = true;
                return;
            }
        } catch (_) {}

        if (typeof renderApp === "function") renderApp();
    }

    syncCategoriesEverywhere();
    setInterval(syncCategoriesEverywhere, 2000);
})();


/* =========================================================
   Artikel-Persistenz Watchdog
   ========================================================= */
(function wtArticlePersistenceWatchdogFinal() {
    if (window.__wtArticlePersistenceWatchdogFinal) return;
    window.__wtArticlePersistenceWatchdogFinal = true;
    let lastRepairAt = 0;

    function articleKeys(list) {
        return (Array.isArray(list) ? list : []).map(getStableArticleKey).filter(Boolean).sort();
    }

    function protectArticles() {
        const current = Array.isArray(articles) ? articles : [];
        if (current.length > 0) writeArticleBackup(current);
        if (!hasLoadedRemoteArticles) return;

        const protectedList = mergeArticleListsWithoutLoss([], readArticleBackup(), current);
        const currentKeys = JSON.stringify(articleKeys(current));
        const protectedKeys = JSON.stringify(articleKeys(protectedList));
        if (currentKeys === protectedKeys) return;

        applyArticleListSafely(protectedList);
        requestRemoteRender();

        if (Date.now() - lastRepairAt > 5000) {
            lastRepairAt = Date.now();
            window.wtPersistArticlesSafely(protectedList)
                .catch(err => console.warn("Automatisch wiederhergestellte Artikel konnten nicht gespeichert werden:", err));
        }
    }

    setInterval(protectArticles, 2000);
})();
