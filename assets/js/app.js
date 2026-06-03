
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
// FIREBASE KONFIGURATION
// =======================================================================
let myFirebaseConfig = {
    apiKey: "AIzaSyDiYFdcmwniMpAuFB_N2kAkD9AIgHhgaVU",
    authDomain: "winterthurtimes.firebaseapp.com",
    projectId: "winterthurtimes",
    storageBucket: "winterthurtimes.firebasestorage.app",
    messagingSenderId: "558050711365",
    appId: "1:558050711365:web:6d37ce9f1b6b1128cdd02c"
};

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

let categories = ["Politik", "Wirtschaft", "Gesellschaft", "Kultur", "Sport", "Lokales", "Wissenschaft", "Unterhaltung", "Panorama", "Spiele"];

let currentUser = null;
let sessionId = Math.random().toString(36).substring(2, 10);
let supportUser = 'Gast-' + sessionId; 

let registeredUsers = []; 

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
}

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
    console.log('Abo-Mail: queueEmail -> mail.add', { toEmail, subject });
    await firebaseDb.collection('mail').add({
        to: [toEmail],
        message: {
            subject: subject || 'Neue Nachricht',
            html: html || '',
            text: text || ''
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
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
    batch.set(dataCol.doc('articles'), {
        articles: articles,
        authors: authors,
        categories: categories,
        communityImages: communityImages,
        siteFeedbacks: siteFeedbacks,
        updatedAt: now
    }, { merge: true });
    batch.set(dataCol.doc('chats'), { supportChats: supportChats, updatedAt: now }, { merge: true });
    batch.set(dataCol.doc('users'), { registeredUsers: sanitizeUsersForRemote(registeredUsers), updatedAt: now }, { merge: true });

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
    if (!isFirebaseConfigured()) return;
    if (!window.firebase) return;

    try {
        firebaseApp = firebase.initializeApp(myFirebaseConfig);
        firebaseDb = firebase.firestore();
        firebaseAuth = firebase.auth();
        try { firebaseStorage = firebase.storage(); } catch (e) { firebaseStorage = null; }
        isFirebaseConnected = true;

        window.saveState = scheduleRemoteSave;

        const dataCol = firebaseDb.collection('data');
        const articlesDoc = dataCol.doc('articles');
        const chatsDoc = dataCol.doc('chats');
        const usersDoc = dataCol.doc('users');

        await seedDocIfMissing(articlesDoc, {
            articles: articles, authors: authors, categories: categories,
            communityImages: communityImages, siteFeedbacks: siteFeedbacks,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await seedDocIfMissing(chatsDoc, { supportChats: supportChats, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        await seedDocIfMissing(usersDoc, { registeredUsers: sanitizeUsersForRemote(registeredUsers), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });

        articlesDoc.onSnapshot({ includeMetadataChanges: true }, (snap) => {
            if (!snap.exists || (snap.metadata && snap.metadata.hasPendingWrites)) return;
            const data = snap.data() || {};
            isApplyingRemoteState = true;
            try {
                if (Array.isArray(data.articles)) articles = data.articles;
                if (Array.isArray(data.authors)) authors = data.authors;
                if (Array.isArray(data.categories)) categories = data.categories;
                if (Array.isArray(data.communityImages)) communityImages = data.communityImages;
                if (Array.isArray(data.siteFeedbacks)) siteFeedbacks = data.siteFeedbacks;
            } finally {
                isApplyingRemoteState = false;
            }
            renderApp();
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
            renderApp();
        });

        usersDoc.onSnapshot({ includeMetadataChanges: true }, (snap) => {
            if (!snap.exists || (snap.metadata && snap.metadata.hasPendingWrites)) return;
            const data = snap.data() || {};
            isApplyingRemoteState = true;
            try {
                if (Array.isArray(data.registeredUsers)) {
                    registeredUsers = data.registeredUsers;
                    ensureAllUsersSubscriptions();
                }
            } finally {
                isApplyingRemoteState = false;
            }
            renderApp();
        });

        firebaseAuth.onAuthStateChanged((user) => {
            if (!user) {
                currentUser = null;
                supportUser = 'Gast-' + sessionId;
                renderApp();
                return;
            }

            const name = (user.displayName && user.displayName.trim() !== '') ? user.displayName.trim() : (user.email || 'User');
            currentUser = name;
            supportUser = name;

            const profile = registeredUsers.find(u => u.username === name) || null;
            if (profile && (profile.isBanned || profile.isDeleted)) {
                const msg = profile.isDeleted
                    ? "Dein Account wurde gelöscht. Bitte wende dich an den Support."
                    : "Dein Account wurde gesperrt. Bitte wende dich an den Support.";
                showModal('Zugriff verweigert', msg);
                firebaseAuth.signOut().catch(() => {});
                return;
            }

            if (!profile) {
                registeredUsers.push({
                    username: name, firstName: "", lastName: "", email: user.email || "", bio: "", profilePicUrl: "",
                    showRealName: false, isBanned: false, isDeleted: false, role: "user", emailNotifyEnabled: true,
                    subscriptions: { categories: [], authors: [] }
                });
                window.saveState();
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
                <div id="header-3d-logo" class="w-12 h-12 sm:w-16 sm:h-16 shrink-0 cursor-pointer hover:scale-105 transition-transform" onclick="setView('home')" title="Zur Startseite"></div>
                <button onclick="toggleMenu()" class="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                    <i data-lucide="menu"></i>
                </button>
                <button onclick="toggleSearch()" class="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Suchen">
                    <i data-lucide="search"></i>
                </button>
            </div>
            <div class="min-w-0 text-center">
                <h1 onclick="setView('home')" class="text-2xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase font-serif cursor-pointer hover:text-blue-900 transition-colors leading-none">
                    Winterthur Times
                </h1>
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

function renderGallery() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let validImages = communityImages.filter(img => new Date(img.timestamp) > twentyFourHoursAgo);
    if (!isSuperAdmin) validImages = validImages.filter(img => !img.isDeleted);
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
                const isLiked = currentUser && img.likes && img.likes.includes(currentUser);
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
                        <button onclick="event.stopPropagation(); toggleCommunityImageLike(${img.id})" class="pointer-events-auto flex items-center gap-1 ${isLiked ? 'text-red-500' : 'text-white'} hover:scale-110 transition-transform cursor-pointer">
                            <i data-lucide="heart" class="w-5 h-5 ${isLiked ? 'fill-current text-red-500' : 'drop-shadow-md'}"></i>
                            <span class="text-xs font-bold drop-shadow-md">${img.likes ? img.likes.length : 0}</span>
                        </button>
                    </div>
                    ${((hasAdminAccess() || img.uploader === currentUser) && !img.isDeleted) ? `
                        <button onclick="event.stopPropagation(); deleteCommunityImage(${img.id})" class="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded hover:bg-red-700 shadow z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Bild löschen"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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

function renderHome() {
    if (articles.length === 0) return `<div class="max-w-3xl mx-auto flex flex-col gap-6">${renderDailyRiddle()}${renderPuzzleHub()}<div class="text-center py-8 text-gray-500 font-sans">Keine Artikel vorhanden.</div></div>`;
    
    const now = new Date();
    const currentArticles = articles;

    if (currentArticles.length === 0) return `<div class="max-w-3xl mx-auto flex flex-col gap-6">${renderDailyRiddle()}${renderPuzzleHub()}<div class="text-center py-8 text-gray-500 font-sans">Derzeit gibt es keine sichtbaren Artikel.</div></div>`;
    
    const topStory = currentArticles[0];
    const mainArticles = currentArticles.slice(1, 4);
    const trendingArticles = [...currentArticles].sort((a, b) => b.views.length - a.views.length).slice(0, 3);

    let html = `<div class="grid grid-cols-1 lg:grid-cols-12 gap-8"><div class="lg:col-span-8 flex flex-col gap-8">`;

    if (topStory) {
        const isLiked = currentUser && topStory.likes.includes(currentUser);
        const isEilmeldung = topStory.isEilmeldung && ((new Date() - new Date(topStory.timestamp)) / 3600000 <= 24);
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
        const isEilmeldung = article.isEilmeldung && ((new Date() - new Date(article.timestamp)) / 3600000 <= 24);
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

    return html;
}



function normalizeArticleData(article) {
    if (!article || typeof article !== 'object') return article;

    if (!Array.isArray(article.likes)) article.likes = [];
    if (!Array.isArray(article.views)) article.views = [];
    if (!Array.isArray(article.sources)) article.sources = [];
    if (!Array.isArray(article.inlineImages)) article.inlineImages = [];
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
    const inlineImages = Array.isArray(article.inlineImages) ? article.inlineImages : [];
    const imageMap = {};

    inlineImages.forEach((img) => {
        const pos = Number(img.positionAfterParagraph);
        if (!Number.isFinite(pos)) return;
        if (!imageMap[pos]) imageMap[pos] = [];
        imageMap[pos].push(img);
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
    const inlineImages = Array.isArray(article.inlineImages) ? article.inlineImages : [];

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

    return `
    <article class="max-w-4xl mx-auto bg-white p-6 md:p-12 shadow-sm border border-gray-100">
        <button onclick="setView('home')" class="flex items-center gap-2 text-blue-600 font-sans font-bold text-sm mb-8 hover:underline cursor-pointer">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
        </button>
        <div class="flex items-center gap-3">
            <span class="text-blue-700 font-bold text-sm uppercase font-sans tracking-wide cursor-pointer hover:underline" onclick="executeSearchCategory('${article.category}')">${article.category}</span>
            ${currentUser ? `
                <button onclick="toggleCategorySubscription('${safeCategoryJs}')" class="text-xs font-bold px-3 py-1 rounded-full border ${isCatSubscribed ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50'} transition-colors cursor-pointer flex items-center gap-2" title="Kategorie abonnieren/abbestellen">
                    <i data-lucide="bell" class="w-4 h-4"></i>
                    ${isCatSubscribed ? 'Abo aktiv' : 'Abonnieren'}
                </button>
            ` : ''}
        </div>
        <h1 class="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight mt-4 mb-6">${article.title}</h1>
        
        <div class="flex flex-wrap items-center justify-between border-y border-gray-200 py-4 mb-8 font-sans text-sm text-gray-600">
            <div class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onclick="setView('authors'); window.scrollTo(0,0);" title="Mehr über den Autor erfahren">
                ${authorData && authorData.imageUrl ? `
                    <img src="${authorData.imageUrl}" class="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" onerror="this.outerHTML='${getStandardAvatarHtml('w-8 h-8', 'w-4 h-4').replace(/'/g, "\\'").replace(/"/g, '&quot;')}'" />
                ` : getStandardAvatarHtml('w-8 h-8', 'w-4 h-4')}
                <div>
                    <span class="font-bold text-gray-900 block">${article.author}</span>
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

        <p class="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed mb-8">${article.summary}</p>
        <img src="${displayImage}" alt="Artikelbild" class="w-full h-auto max-h-[400px] md:max-h-[600px] object-cover mb-8 rounded-sm" />
        
        <div class="article-content-with-extras max-w-none">${renderArticleContentWithExtras(article)}</div>
        
        ${renderArticlePoll(article)}
        
        ${article.sources && article.sources.length > 0 ? `
        <div class="mt-12 p-6 bg-gray-50 border border-gray-200 rounded-sm font-sans">
            <h4 class="font-bold text-gray-800 mb-3 flex items-center gap-2"><i data-lucide="link" class="w-5 h-5 text-blue-600"></i> Quellen & Weiterführende Links</h4>
            <ul class="flex flex-col gap-2">
                ${article.sources.map(src => `
                    <li><a href="${src}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-sm break-all"><i data-lucide="external-link" class="w-3 h-3"></i> ${src}</a></li>
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
                                    <span class="font-bold text-blue-900">${getDisplayName(c.username)}</span>
                                    ${modBadge}
                                    <span class="text-xs text-gray-400 ml-auto time-ago-display" data-timestamp="${c.timestamp}">${getTimeAgo(c.timestamp)}</span>
                                </div>
                                <p class="text-gray-800 leading-relaxed mb-3">${c.text}</p>
                                
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
                        Dein Kommentar als <span class="text-blue-600">${getDisplayName(currentUser)}</span>
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


function normalizeSmartSearchText(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}
function getSmartSearchWords(query) {
    const words = normalizeSmartSearchText(query).split(" ").filter(Boolean);
    const extra = { wohnen:["wohnung","wohnungen","wohnraum","miete","mieten","mietzins","bezahlbar","guenstig","günstig"], wohnung:["wohnen","wohnungen","wohnraum","miete","bezahlbar"], wohnungen:["wohnen","wohnung","wohnraum","miete","bezahlbar"], guenstig:["günstig","bezahlbar","preiswert","miete","wohnen","wohnungen"], günstig:["guenstig","bezahlbar","preiswert","miete","wohnen","wohnungen"], flug:["flugzeug","flugzeuge","airbus","boeing","airport","flughafen"], flugzeug:["flug","flugzeuge","airbus","boeing","airport","flughafen"], spiel:["spiele","sudoku","kreuzwortraetsel","kreuzworträtsel","solitaire","raetsel","rätsel"] };
    const result = new Set(words);
    words.forEach(word => { (extra[word] || []).forEach(x => result.add(normalizeSmartSearchText(x))); if(word.endsWith("en") && word.length>5) result.add(word.slice(0,-2)); if(word.endsWith("ungen") && word.length>8) result.add(word.slice(0,-5)); if(word.endsWith("ung") && word.length>6) result.add(word.slice(0,-3)); });
    return Array.from(result).filter(Boolean);
}
function smartArticleMatches(article, query) {
    const words = getSmartSearchWords(query); if(!words.length) return true;
    const text = normalizeSmartSearchText([article && article.title, article && article.summary, article && article.content, article && article.category, article && article.author].join(" "));
    const textWords = text.split(" ").filter(Boolean);
    return words.some(q => text.includes(q) || textWords.some(w => w===q || w.startsWith(q) || q.startsWith(w) || (q.length>=5 && w.length>=5 && w.slice(0,5)===q.slice(0,5))));
}

function renderSearchResults() {
    const now = new Date();
    const currentArticles = articles;
    
    let results = [];
    let titleHtml = "";

    if (searchCategory) {
        results = currentArticles.filter(a => a.category === searchCategory);
        titleHtml = `Ressort: ${searchCategory}`;
    } else {
        const query = searchQuery;
        results = currentArticles.filter(a => smartArticleMatches(a, query));
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
        html += `<p class="text-lg text-gray-700">Leider wurden keine passenden Artikel gefunden.</p>`;
    } else {
        results.forEach(article => {
            const displayImage = article.imageUrl || getFallbackImage(article.category);
            html += `
            <article onclick="openArticle(${article.id})" class="group cursor-pointer flex flex-col md:flex-row gap-6 border-b border-gray-200 pb-8 last:border-0">
                <img src="${displayImage}" alt="${article.title}" class="w-full md:w-48 h-32 object-cover rounded-sm group-hover:opacity-90 transition-opacity" />
                <div class="flex-1">
                    <span class="text-blue-700 font-bold text-xs uppercase font-sans flex items-center gap-4 mb-2">
                        ${article.category}
                        <span class="text-gray-400 font-normal flex items-center gap-1"><i data-lucide="eye" class="w-3 h-3"></i> ${article.views.length}</span>
                    </span>
                    <h3 class="text-xl md:text-2xl font-bold leading-snug group-hover:text-blue-700 transition-colors mb-2">${article.title}</h3>
                    <p class="text-sm text-gray-600 line-clamp-2">${article.summary}</p>
                </div>
            </article>`;
        });
    }

    html += `</div></div>`;
    return html;
}

function renderFooter() {
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
                    ${categories.slice(0, 8).map(cat => `<li><span onclick="executeSearchCategory('${cat}'); window.scrollTo(0,0);" class="cursor-pointer hover:text-white transition-colors">${cat}</span></li>`).join('')}
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
                    <li><span onclick="showModal('Über uns', 'Die Winterthur Times ist eine Demo-Umgebung.')" class="cursor-pointer hover:text-white transition-colors">Über uns</span></li>
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

function renderMenuOverlay() {
    if (!isMenuOpen) return '';
    return `
    <div class="fixed inset-0 bg-black/60 z-50 flex">
        <div class="bg-white w-64 md:w-80 h-full shadow-2xl flex flex-col animate-slide-in">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 class="text-2xl font-black uppercase font-serif tracking-tight">Menü</h2>
                <button onclick="toggleMenu()" class="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-600">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <nav class="flex-1 overflow-y-auto p-4 bg-white">
                <ul class="flex flex-col gap-1 font-sans font-bold text-lg text-gray-800">
                    <li><button onclick="setView('home'); toggleMenu();" class="w-full text-left px-3 py-4 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors flex items-center justify-between group">Startseite <i data-lucide="chevron-right" class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"></i></button></li>
                    <li><button onclick="setView('gallery'); toggleMenu();" class="w-full text-left px-3 py-4 hover:bg-green-50 hover:text-green-700 rounded transition-colors flex items-center justify-between group">Tagesbilder <i data-lucide="chevron-right" class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"></i></button></li>
                    ${categories.map(cat => `<li><button onclick="executeSearchCategory('${cat}'); toggleMenu();" class="w-full text-left px-3 py-4 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors flex items-center justify-between group">${cat} <i data-lucide="chevron-right" class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"></i></button></li>`).join('')}
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

function renderApp() {
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

    // Prüfen, ob wir in der Admin-Zentrale sind
    const isAdminView = view === 'admin-login' || view === 'admin-dashboard';

    document.getElementById('app').innerHTML = `
        ${isAdminView ? '' : renderTopBar()}
        ${isAdminView ? '' : renderHeader()}
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
    
    restoreFocus();
}

window.setView = function(newView) {
    view = newView;
    if (newView === 'home' || newView === 'article' || newView === 'gallery' || newView === 'feedback') {
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

window.handleCommunityUpload = function() {
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
        const reader = new FileReader();
        reader.onload = function(e) { saveImg(e.target.result); };
        reader.readAsDataURL(fileInput.files[0]);
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
            const img = communityImages.find(i => i.id === id);
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
    let img = communityImages.find(i => i.id === id);
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

        firebaseAuth.signInWithEmailAndPassword(mappedEmail, password)
            .then(() => {
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

        firebaseAuth.createUserWithEmailAndPassword(email, password)
            .then(({ user }) => {
                return user.updateProfile({ displayName: username });
            })
            .then(() => {
                registeredUsers.push({
                    username: username,
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
    if (idx > -1) user.subscriptions.categories.splice(idx, 1);
    else user.subscriptions.categories.push(cat);
    window.saveState();
    renderApp();
}

window.toggleAuthorSubscription = function(author) {
    if (!currentUser) { showUserLogin(); return; }
    const user = registeredUsers.find(u => u.username === currentUser);
    if (!user) return;
    ensureUserSubscriptions(user);
    const a = (author || '').trim();
    if (!a) return;
    const idx = user.subscriptions.authors.indexOf(a);
    if (idx > -1) user.subscriptions.authors.splice(idx, 1);
    else user.subscriptions.authors.push(a);
    window.saveState();
    renderApp();
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
    currentModal = null;
    pendingChatOpen = false; 
    pendingView = null;
    renderApp();
}

window.toggleMenu = function() {
    isMenuOpen = !isMenuOpen;
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
        searchCategory = "";
        searchQuery = "";
        isSearchOpen = false;
        isMenuOpen = false;
        location.hash = "spiele";
        if (typeof renderApp === "function") renderApp();
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
initFirebase();
renderApp();


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



/* =========================================================
   Startseite: Komplettes Solitaire-Spiel
   Nur auf index.html / Startseite, nicht im Admin-Panel
   ========================================================= */
(function initHomeOnlySolitaire() {
    if (window.__wtHomeSolitaireInstalled) return;
    window.__wtHomeSolitaireInstalled = true;

    function isHomePage() {
        const path = location.pathname.toLowerCase();
        const hash = (location.hash || "").toLowerCase();
        if (path.includes("admin")) return false;
        if (document.querySelector("#adminPanel, #admin-panel, #adminLogin, .admin-page, .login-panel")) return false;
        const text = (document.body?.innerText || "").slice(0, 1200).toLowerCase();
        if (text.includes("zurück zur startseite") || text.includes("ressort:")) return false;
        const okPath = path.endsWith("/") || path.endsWith("/index.html") || path.endsWith("/winterthur-times/");
        const okHash = !hash || hash === "#" || hash === "#/" || hash === "#home" || hash === "#start" || hash === "#startseite" || hash === "#spiele";
        return okPath && okHash;
    }

    const suits = ["♠", "♥", "♦", "♣"];
    const colors = { "♠": "black", "♣": "black", "♥": "red", "♦": "red" };
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    let game = null;
    let selected = null;
    let history = [];

    function makeDeck() {
        const deck = [];
        suits.forEach(suit => {
            ranks.forEach((rank, index) => {
                deck.push({
                    id: `${rank}${suit}`,
                    suit,
                    rank,
                    value: index + 1,
                    color: colors[suit],
                    faceUp: false
                });
            });
        });
        return deck;
    }

    function shuffle(deck) {
        const copy = deck.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function saveSnapshot() {
        history.push(clone({ game, selected: null }));
        if (history.length > 80) history.shift();
    }

    function saveGame() {
        try {
            localStorage.setItem("wt_home_solitaire_game", JSON.stringify({ game, history }));
        } catch (_) {}
    }

    function loadGame() {
        try {
            const raw = localStorage.getItem("wt_home_solitaire_game");
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.game || !Array.isArray(parsed.game.tableau)) return false;
            game = parsed.game;
            history = Array.isArray(parsed.history) ? parsed.history : [];
            selected = null;
            return true;
        } catch (_) {
            return false;
        }
    }

    function newGame() {
        const deck = shuffle(makeDeck());
        const tableau = Array.from({ length: 7 }, () => []);

        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = deck.shift();
                card.faceUp = row === col;
                tableau[col].push(card);
            }
        }

        game = {
            stock: deck,
            waste: [],
            foundations: { "♠": [], "♥": [], "♦": [], "♣": [] },
            tableau,
            moves: 0,
            startedAt: Date.now()
        };
        selected = null;
        history = [];
        saveGame();
        renderSolitaire();
    }

    function ensureGame() {
        if (!game && !loadGame()) newGame();
    }

    function isRed(card) {
        return card && card.color === "red";
    }

    function canPlaceOnTableau(card, target) {
        if (!card) return false;
        if (!target) return card.value === 13;
        return card.value === target.value - 1 && isRed(card) !== isRed(target);
    }

    function canPlaceOnFoundation(card, pile) {
        if (!card) return false;
        if (!pile.length) return card.value === 1;
        const top = pile[pile.length - 1];
        return card.suit === top.suit && card.value === top.value + 1;
    }

    function flipTop(colIndex) {
        const col = game.tableau[colIndex];
        if (col.length && !col[col.length - 1].faceUp) {
            col[col.length - 1].faceUp = true;
        }
    }

    function getCardsFromSelection(sel) {
        if (!sel) return [];

        if (sel.type === "waste") {
            const card = game.waste[game.waste.length - 1];
            return card ? [card] : [];
        }

        if (sel.type === "tableau") {
            return game.tableau[sel.col].slice(sel.index);
        }

        if (sel.type === "foundation") {
            const pile = game.foundations[sel.suit];
            const card = pile[pile.length - 1];
            return card ? [card] : [];
        }

        return [];
    }

    function removeSelection(sel) {
        if (!sel) return;

        if (sel.type === "waste") {
            game.waste.pop();
        }

        if (sel.type === "tableau") {
            game.tableau[sel.col].splice(sel.index);
            flipTop(sel.col);
        }

        if (sel.type === "foundation") {
            game.foundations[sel.suit].pop();
        }
    }

    function afterMove() {
        game.moves += 1;
        selected = null;
        saveGame();
        renderSolitaire();
        checkWin();
    }

    function drawCard() {
        ensureGame();
        saveSnapshot();

        if (game.stock.length) {
            const card = game.stock.pop();
            card.faceUp = true;
            game.waste.push(card);
        } else {
            game.stock = game.waste.reverse().map(card => ({ ...card, faceUp: false }));
            game.waste = [];
        }

        afterMove();
    }

    function select(sel) {
        ensureGame();

        const cards = getCardsFromSelection(sel);
        if (!cards.length) return;
        if (cards[0].faceUp === false) return;

        if (selected) {
            if (sel.type === "tableau" && moveToTableau(sel.col)) return;
            if (sel.type === "foundation" && moveToFoundation(sel.suit)) return;
        }

        selected = sel;
        renderSolitaire();
    }

    function moveToTableau(colIndex) {
        if (!selected) return false;
        const cards = getCardsFromSelection(selected);
        if (!cards.length) return false;

        const targetPile = game.tableau[colIndex];
        const targetTop = targetPile[targetPile.length - 1];

        if (!canPlaceOnTableau(cards[0], targetTop)) return false;

        saveSnapshot();
        removeSelection(selected);
        cards.forEach(card => {
            card.faceUp = true;
            targetPile.push(card);
        });
        afterMove();
        return true;
    }

    function moveToFoundation(suit) {
        if (!selected) return false;
        const cards = getCardsFromSelection(selected);
        if (cards.length !== 1) return false;

        const card = cards[0];
        const pile = game.foundations[suit];

        if (card.suit !== suit || !canPlaceOnFoundation(card, pile)) return false;

        saveSnapshot();
        removeSelection(selected);
        pile.push({ ...card, faceUp: true });
        afterMove();
        return true;
    }

    function autoMove(sel) {
        selected = sel;
        const cards = getCardsFromSelection(sel);
        if (cards.length !== 1) return false;

        const card = cards[0];
        if (moveToFoundation(card.suit)) return true;

        for (let i = 0; i < 7; i++) {
            selected = sel;
            if (!(sel.type === "tableau" && sel.col === i) && moveToTableau(i)) return true;
        }

        selected = null;
        renderSolitaire();
        return false;
    }

    function undo() {
        const previous = history.pop();
        if (!previous) return;
        game = previous.game;
        selected = null;
        saveGame();
        renderSolitaire();
    }

    function getHint() {
        ensureGame();

        const waste = game.waste[game.waste.length - 1];
        if (waste) {
            if (canPlaceOnFoundation(waste, game.foundations[waste.suit])) {
                return `Tipp: Lege ${waste.rank}${waste.suit} oben auf den ${waste.suit}-Stapel.`;
            }

            for (let i = 0; i < 7; i++) {
                const target = game.tableau[i][game.tableau[i].length - 1];
                if (canPlaceOnTableau(waste, target)) {
                    return `Tipp: Lege ${waste.rank}${waste.suit} in Spalte ${i + 1}.`;
                }
            }
        }

        for (let c = 0; c < 7; c++) {
            const col = game.tableau[c];

            if (col.length && !col[col.length - 1].faceUp) {
                return `Tipp: Drehe die verdeckte Karte in Spalte ${c + 1} auf, sobald sie frei liegt.`;
            }

            for (let i = 0; i < col.length; i++) {
                const card = col[i];
                if (!card.faceUp) continue;

                if (canPlaceOnFoundation(card, game.foundations[card.suit]) && i === col.length - 1) {
                    return `Tipp: Lege ${card.rank}${card.suit} oben auf den ${card.suit}-Stapel.`;
                }

                for (let targetCol = 0; targetCol < 7; targetCol++) {
                    if (targetCol === c) continue;
                    const target = game.tableau[targetCol][game.tableau[targetCol].length - 1];
                    if (canPlaceOnTableau(card, target)) {
                        return `Tipp: Verschiebe ${card.rank}${card.suit} von Spalte ${c + 1} nach Spalte ${targetCol + 1}.`;
                    }
                }
            }
        }

        if (game.stock.length) return "Tipp: Ziehe eine neue Karte vom Stapel.";
        if (game.waste.length) return "Tipp: Drehe den Ablagestapel zurück in den Nachziehstapel.";
        return "Tipp: Aktuell ist kein klarer Zug sichtbar. Starte bei Bedarf ein neues Spiel.";
    }

    function showHint() {
        const el = document.getElementById("wtHomeSolitaireHint");
        if (el) el.textContent = getHint();
    }

    function checkWin() {
        const count = Object.values(game.foundations).reduce((sum, pile) => sum + pile.length, 0);
        if (count === 52) {
            setTimeout(() => {
                alert(`Gewonnen! Du hast Solitaire in ${game.moves} Zügen geschafft.`);
                newGame();
            }, 200);
        }
    }

    function cardHtml(card, attrs = "", extra = "") {
        if (!card) return `<button type="button" class="wt-home-sol-card empty" ${attrs}></button>`;
        if (!card.faceUp) return `<button type="button" class="wt-home-sol-card back ${extra}" ${attrs}>WT</button>`;
        return `
            <button type="button" class="wt-home-sol-card ${card.color} ${extra}" ${attrs}>
                <span>${card.rank}</span>
                <strong>${card.suit}</strong>
            </button>
        `;
    }

    function renderSolitaire() {
        if (!isHomePage()) return;
        ensureGame();

        const root = document.getElementById("wtHomeSolitaire");
        if (!root) return;

        const wasteTop = game.waste[game.waste.length - 1];
        const foundations = suits.map(suit => {
            const pile = game.foundations[suit];
            const top = pile[pile.length - 1];
            return `
                <div class="wt-home-sol-foundation">
                    ${top ? cardHtml(top, `data-sol-foundation="${suit}"`) : `<button type="button" class="wt-home-sol-card empty" data-sol-foundation="${suit}">${suit}</button>`}
                </div>
            `;
        }).join("");

        const tableau = game.tableau.map((col, colIndex) => `
            <div class="wt-home-sol-column" data-sol-column="${colIndex}">
                ${col.map((card, index) => {
                    const isSelected = selected && selected.type === "tableau" && selected.col === colIndex && selected.index === index;
                    return `
                        <div class="wt-home-sol-table-card" style="top:${index * 25}px">
                            ${cardHtml(card, `data-sol-tableau="${colIndex}" data-sol-index="${index}"`, isSelected ? "selected" : "")}
                        </div>
                    `;
                }).join("") || `<button type="button" class="wt-home-sol-card empty" data-sol-column="${colIndex}">K</button>`}
            </div>
        `).join("");

        root.innerHTML = `
            <section class="wt-home-solitaire-card">
                <div class="wt-home-solitaire-head">
                    <div>
                        <p class="wt-home-sol-kicker">Spiel</p>
                        <h2>Solitaire</h2>
                        <p>Lege Karten abwechselnd rot/schwarz ab. Asse kommen oben auf die passenden Stapel.</p>
                    </div>
                    <div class="wt-home-sol-actions">
                        <button type="button" data-sol-hint>Tipps</button>
                        <button type="button" data-sol-undo>Zurück</button>
                        <button type="button" data-sol-new>Neu starten</button>
                    </div>
                </div>

                <div class="wt-home-sol-status">
                    <span>Züge: ${game.moves}</span>
                    <span>Nachziehstapel: ${game.stock.length}</span>
                </div>

                <div class="wt-home-sol-top">
                    <button type="button" class="wt-home-sol-card ${game.stock.length ? "back" : "empty"}" data-sol-draw>${game.stock.length ? "WT" : "↻"}</button>
                    <div>${wasteTop ? cardHtml(wasteTop, "data-sol-waste", selected?.type === "waste" ? "selected" : "") : `<button type="button" class="wt-home-sol-card empty"></button>`}</div>
                    <div class="wt-home-sol-foundations">${foundations}</div>
                </div>

                <div class="wt-home-sol-tableau">${tableau}</div>

                <p id="wtHomeSolitaireHint" class="wt-home-sol-hint">Tipp: Klicke eine Karte an und danach den Zielstapel. Doppelklick versucht automatisch abzulegen.</p>
            </section>
        `;
    }

    function mount() {
        if (!isHomePage()) return;
        if (document.getElementById("wtHomeSolitaire")) {
            renderSolitaire();
            return;
        }

        const footer = document.querySelector("footer, .site-footer");
        const crossword = Array.from(document.querySelectorAll("section, article, div"))
            .find(el => (el.textContent || "").includes("KREUZWORTRÄTSEL") || (el.textContent || "").includes("Kreuzworträtsel"));

        const host = document.createElement("div");
        host.id = "wtHomeSolitaire";
        host.className = "wt-home-solitaire-wrap";

        if (crossword && crossword.parentElement && footer) {
            const row = document.createElement("div");
            row.className = "wt-home-solitaire-row";
            row.appendChild(host);

            const main = footer.parentElement || document.body;
            main.insertBefore(row, footer);
        } else if (footer && footer.parentElement) {
            footer.parentElement.insertBefore(host, footer);
        } else {
            document.body.appendChild(host);
        }

        renderSolitaire();
    }

    document.addEventListener("click", event => {
        if (!document.getElementById("wtHomeSolitaire")) return;

        const draw = event.target.closest("[data-sol-draw]");
        if (draw) return drawCard();

        const newBtn = event.target.closest("[data-sol-new]");
        if (newBtn) return newGame();

        const undoBtn = event.target.closest("[data-sol-undo]");
        if (undoBtn) return undo();

        const hintBtn = event.target.closest("[data-sol-hint]");
        if (hintBtn) return showHint();

        const foundation = event.target.closest("[data-sol-foundation]");
        if (foundation) {
            if (selected) moveToFoundation(foundation.dataset.solFoundation);
            return;
        }

        const waste = event.target.closest("[data-sol-waste]");
        if (waste) {
            select({ type: "waste" });
            return;
        }

        const tableCard = event.target.closest("[data-sol-tableau]");
        if (tableCard) {
            const col = Number(tableCard.dataset.solTableau);
            const index = Number(tableCard.dataset.solIndex);
            const card = game?.tableau?.[col]?.[index];
            if (!card) return;

            if (!card.faceUp && index === game.tableau[col].length - 1) {
                saveSnapshot();
                card.faceUp = true;
                afterMove();
                return;
            }

            select({ type: "tableau", col, index });
            return;
        }

        const column = event.target.closest("[data-sol-column]");
        if (column && selected) {
            moveToTableau(Number(column.dataset.solColumn));
        }
    });

    document.addEventListener("dblclick", event => {
        const waste = event.target.closest("[data-sol-waste]");
        if (waste) {
            autoMove({ type: "waste" });
            return;
        }

        const tableCard = event.target.closest("[data-sol-tableau]");
        if (tableCard) {
            autoMove({
                type: "tableau",
                col: Number(tableCard.dataset.solTableau),
                index: Number(tableCard.dataset.solIndex)
            });
        }
    });

    const observer = new MutationObserver(() => {
        if (isHomePage() && !document.getElementById("wtHomeSolitaire")) {
            mount();
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }
})();




/* =========================================================
   Solitaire streng nur Startseite + Menüpunkt Spiele
   ========================================================= */
(function wtStrictHomeSolitaireAndGamesMenu() {
    if (window.__wtStrictHomeSolitaireAndGamesMenu) return;
    window.__wtStrictHomeSolitaireAndGamesMenu = true;

    function isReallyHome() {
        const path = location.pathname.toLowerCase();
        const hash = (location.hash || "").toLowerCase();
        if (path.includes("admin")) return false;
        if (document.querySelector("#adminPanel, #admin-panel, #adminLogin, .admin-page, .login-panel")) return false;
        const text = (document.body?.innerText || "").slice(0, 1200).toLowerCase();
        if (text.includes("zurück zur startseite") || text.includes("ressort:")) return false;
        const okPath = path.endsWith("/") || path.endsWith("/index.html") || path.endsWith("/winterthur-times/");
        const okHash = !hash || hash === "#" || hash === "#/" || hash === "#home" || hash === "#start" || hash === "#startseite" || hash === "#spiele";
        return okPath && okHash;
    }

    function removeSolitaireOutsideHome() {
        if (isReallyHome()) return;
        const root = document.getElementById("wtHomeSolitaire");
        const row = root?.closest(".wt-home-solitaire-row");
        if (row) row.remove();
        else if (root) root.remove();
    }

    function addGamesMenuLink() {
        if (location.pathname.toLowerCase().includes("admin")) return;
        if (document.querySelector("[data-wt-games-link]")) return;

        const candidates = Array.from(document.querySelectorAll("nav, .nav, .navigation, .menu, .dropdown, .dropdown-menu, header, .site-header"))
            .filter(el => /Politik|Wirtschaft|Gesellschaft|Kultur|Sport|Lokales|Wissenschaft|Unterhaltung/.test(el.textContent || ""));
        const target = candidates[0];
        if (!target) return;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "wt-games-menu-link";
        btn.dataset.wtGamesLink = "true";
        btn.textContent = "Spiele";
        btn.addEventListener("click", () => {
            if (!isReallyHome()) {
                location.href = "index.html#spiele";
                return;
            }
            history.replaceState(null, "", "#spiele");
            setTimeout(scrollToGames, 150);
        });
        target.appendChild(btn);
    }

    function scrollToGames() {
        const target = document.getElementById("wtHomeSolitaire")
            || Array.from(document.querySelectorAll("section, div, article")).find(el => /Sudoku|Kreuzworträtsel|Tägliches Rätsel/.test(el.textContent || ""));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function tick() {
        removeSolitaireOutsideHome();
        addGamesMenuLink();
        if (location.hash === "#spiele" && isReallyHome()) setTimeout(scrollToGames, 300);
    }

    const observer = new MutationObserver(tick);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", tick);
    } else {
        tick();
    }
    window.addEventListener("hashchange", tick);
})();




/* =========================================================
   Eigene Spiele-Seite
   - Solitaire nicht mehr auf normaler Startseite/Admin/Login
   - Menüpunkt Spiele öffnet #spiele
   ========================================================= */
(function initDedicatedGamesPage() {
    if (window.__wtDedicatedGamesPageInstalled) return;
    window.__wtDedicatedGamesPageInstalled = true;

    function isAdminOrLogin() {
        const path = location.pathname.toLowerCase();
        const text = (document.body?.innerText || "").toLowerCase();
        return path.includes("admin")
            || document.querySelector("#adminPanel, #admin-panel, #adminLogin, .admin-page, .login-panel")
            || text.includes("main-admin login");
    }

    function isGamesPage() {
        return (location.hash || "").toLowerCase() === "#spiele" && !isAdminOrLogin();
    }

    function removeOldSolitaire() {
        // Entfernt das alte Startseiten-Solitaire aus allen Ansichten.
        document.querySelectorAll("#wtHomeSolitaire, .wt-home-solitaire-wrap").forEach(root => {
            const row = root.closest(".wt-home-solitaire-row");
            if (row) row.remove();
            else root.remove();
        });
    }

    function ensureGamesMenuLink() {
        if (isAdminOrLogin()) return;
        if (document.querySelector("[data-wt-games-link-fixed]")) return;

        const candidates = Array.from(document.querySelectorAll("nav, .nav, .navigation, .menu, .dropdown, .dropdown-menu, header, .site-header"))
            .filter(el => /Startseite|Politik|Wirtschaft|Gesellschaft|Kultur|Sport|Lokales|Wissenschaft|Unterhaltung/.test(el.textContent || ""));

        const target = candidates[0];
        if (!target) return;

        // Vorhandenen alten Spiele-Button entfernen, damit er nicht doppelt ist.
        document.querySelectorAll("[data-wt-games-link], .wt-games-menu-link").forEach(el => el.remove());

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "wt-games-menu-link";
        btn.dataset.wtGamesLinkFixed = "true";
        btn.textContent = "Spiele";
        btn.addEventListener("click", () => {
            location.hash = "spiele";
            setTimeout(renderGamesPage, 50);
        });

        target.appendChild(btn);
    }

    function hideNormalContentForGames() {
        const games = document.getElementById("wtGamesPage");
        if (!isGamesPage()) {
            document.body.classList.remove("wt-games-active");
            if (games) games.remove();
            return;
        }

        document.body.classList.add("wt-games-active");
    }

    function renderGamesPage() {
        removeOldSolitaire();
        hideNormalContentForGames();

        if (!isGamesPage()) return;

        let page = document.getElementById("wtGamesPage");
        if (!page) {
            page = document.createElement("main");
            page.id = "wtGamesPage";
            page.className = "wt-games-page";

            const footer = document.querySelector("footer, .site-footer");
            if (footer && footer.parentNode) {
                footer.parentNode.insertBefore(page, footer);
            } else {
                document.body.appendChild(page);
            }
        }

        page.innerHTML = `
            <section class="wt-games-hero">
                <p class="wt-games-kicker">Winterthur Times</p>
                <h1>Spiele</h1>
                <p>Wähle ein Spiel aus. Sudoku und Kreuzworträtsel bleiben zusätzlich wie bisher auf der Startseite sichtbar.</p>
            </section>

            <section class="wt-games-picker" id="wtGamesPicker">
                <button type="button" class="wt-game-tile active" data-game-select="solitaire">
                    <strong>Solitaire</strong>
                    <span>Karten sortieren, Stapel aufbauen und mit Tipps spielen.</span>
                </button>
                <button type="button" class="wt-game-tile" data-game-select="sudoku">
                    <strong>Sudoku</strong>
                    <span>Öffnet den Sudoku-Bereich auf der Startseite.</span>
                </button>
                <button type="button" class="wt-game-tile" data-game-select="crossword">
                    <strong>Kreuzworträtsel</strong>
                    <span>Öffnet das Kreuzworträtsel auf der Startseite.</span>
                </button>
                <button type="button" class="wt-game-tile" data-game-select="riddle">
                    <strong>Tägliches Rätsel</strong>
                    <span>Öffnet das tägliche Rätsel auf der Startseite.</span>
                </button>
            </section>

            <section id="wtGamesStage" class="wt-games-stage"></section>
        `;

        renderSolitaireOnGamesPage();

        page.querySelectorAll("[data-game-select]").forEach(btn => {
            btn.addEventListener("click", () => {
                page.querySelectorAll("[data-game-select]").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const game = btn.dataset.gameSelect;

                if (game === "solitaire") {
                    renderSolitaireOnGamesPage();
                } else {
                    openHomeGame(game);
                }
            });
        });

        page.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function openHomeGame(game) {
        const stage = document.getElementById("wtGamesStage");
        if (!stage) return;

        const names = {
            sudoku: "Sudoku",
            crossword: "Kreuzworträtsel",
            riddle: "Tägliches Rätsel"
        };

        stage.innerHTML = `
            <div class="wt-games-info-card">
                <h2>${names[game] || "Spiel"}</h2>
                <p>Dieses Spiel befindet sich bereits auf der Startseite. Klicke unten, um direkt dorthin zu wechseln.</p>
                <button type="button" class="wt-games-primary" id="wtGoHomeGame">Zur Startseite und Spiel anzeigen</button>
            </div>
        `;

        document.getElementById("wtGoHomeGame")?.addEventListener("click", () => {
            const hashMap = {
                sudoku: "#sudoku",
                crossword: "#kreuzwortraetsel",
                riddle: "#raetsel"
            };
            location.href = "index.html" + (hashMap[game] || "");
        });
    }

    // Eigenes Solitaire nur für die Spiele-Seite.
    const suits = ["♠", "♥", "♦", "♣"];
    const colors = { "♠": "black", "♣": "black", "♥": "red", "♦": "red" };
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    let game = null;
    let selected = null;
    let history = [];

    function deck() {
        const cards = [];
        suits.forEach(suit => ranks.forEach((rank, index) => cards.push({
            id: `${rank}${suit}`,
            suit,
            rank,
            value: index + 1,
            color: colors[suit],
            faceUp: false
        })));
        return cards;
    }

    function shuffle(cards) {
        const arr = cards.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function newSolitaire() {
        const cards = shuffle(deck());
        const tableau = Array.from({ length: 7 }, () => []);

        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = cards.shift();
                card.faceUp = row === col;
                tableau[col].push(card);
            }
        }

        game = {
            stock: cards,
            waste: [],
            foundations: { "♠": [], "♥": [], "♦": [], "♣": [] },
            tableau,
            moves: 0
        };
        selected = null;
        history = [];
        saveSolitaire();
    }

    function saveSolitaire() {
        try {
            localStorage.setItem("wt_games_solitaire", JSON.stringify({ game, history }));
        } catch (_) {}
    }

    function loadSolitaire() {
        try {
            const raw = localStorage.getItem("wt_games_solitaire");
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (!parsed?.game?.tableau) return false;
            game = parsed.game;
            history = Array.isArray(parsed.history) ? parsed.history : [];
            selected = null;
            return true;
        } catch (_) {
            return false;
        }
    }

    function ensureSolitaire() {
        if (!game && !loadSolitaire()) newSolitaire();
    }

    function snap() {
        history.push(clone({ game }));
        if (history.length > 80) history.shift();
    }

    function isRed(card) {
        return card?.color === "red";
    }

    function canTable(card, target) {
        if (!card) return false;
        if (!target) return card.value === 13;
        return card.value === target.value - 1 && isRed(card) !== isRed(target);
    }

    function canFoundation(card, pile) {
        if (!card) return false;
        if (!pile.length) return card.value === 1;
        const top = pile[pile.length - 1];
        return top.suit === card.suit && card.value === top.value + 1;
    }

    function flip(col) {
        const pile = game.tableau[col];
        if (pile.length && !pile[pile.length - 1].faceUp) pile[pile.length - 1].faceUp = true;
    }

    function sourceCards(sel) {
        if (!sel) return [];
        if (sel.type === "waste") return game.waste.length ? [game.waste[game.waste.length - 1]] : [];
        if (sel.type === "tableau") return game.tableau[sel.col].slice(sel.index);
        return [];
    }

    function removeSource(sel) {
        if (sel.type === "waste") game.waste.pop();
        if (sel.type === "tableau") {
            game.tableau[sel.col].splice(sel.index);
            flip(sel.col);
        }
    }

    function afterMove() {
        game.moves++;
        selected = null;
        saveSolitaire();
        renderSolitaireOnGamesPage();
        const finished = Object.values(game.foundations).reduce((s, p) => s + p.length, 0) === 52;
        if (finished) setTimeout(() => {
            alert(`Gewonnen! Du hast ${game.moves} Züge gebraucht.`);
            newSolitaire();
            renderSolitaireOnGamesPage();
        }, 200);
    }

    function draw() {
        ensureSolitaire();
        snap();
        if (game.stock.length) {
            const card = game.stock.pop();
            card.faceUp = true;
            game.waste.push(card);
        } else {
            game.stock = game.waste.reverse().map(c => ({ ...c, faceUp: false }));
            game.waste = [];
        }
        afterMove();
    }

    function moveTable(col) {
        const cards = sourceCards(selected);
        if (!cards.length) return false;
        const pile = game.tableau[col];
        const top = pile[pile.length - 1];
        if (!canTable(cards[0], top)) return false;
        snap();
        removeSource(selected);
        cards.forEach(c => pile.push({ ...c, faceUp: true }));
        afterMove();
        return true;
    }

    function moveFoundation(suit) {
        const cards = sourceCards(selected);
        if (cards.length !== 1) return false;
        const card = cards[0];
        const pile = game.foundations[suit];
        if (card.suit !== suit || !canFoundation(card, pile)) return false;
        snap();
        removeSource(selected);
        pile.push({ ...card, faceUp: true });
        afterMove();
        return true;
    }

    function hint() {
        ensureSolitaire();
        const waste = game.waste[game.waste.length - 1];
        if (waste && canFoundation(waste, game.foundations[waste.suit])) return `Tipp: Lege ${waste.rank}${waste.suit} oben auf den ${waste.suit}-Stapel.`;
        if (waste) {
            for (let i = 0; i < 7; i++) {
                const top = game.tableau[i][game.tableau[i].length - 1];
                if (canTable(waste, top)) return `Tipp: Lege ${waste.rank}${waste.suit} in Spalte ${i + 1}.`;
            }
        }
        for (let c = 0; c < 7; c++) {
            const pile = game.tableau[c];
            if (pile.length && !pile[pile.length - 1].faceUp) return `Tipp: Lege zuerst die verdeckte Karte in Spalte ${c + 1} frei.`;
        }
        return game.stock.length ? "Tipp: Ziehe eine neue Karte vom Stapel." : "Tipp: Drehe den Ablagestapel zurück oder starte ein neues Spiel.";
    }

    function undo() {
        const prev = history.pop();
        if (!prev) return;
        game = prev.game;
        selected = null;
        saveSolitaire();
        renderSolitaireOnGamesPage();
    }

    function cardHtml(card, attrs = "", extra = "") {
        if (!card) return `<button type="button" class="wt-games-sol-card empty" ${attrs}></button>`;
        if (!card.faceUp) return `<button type="button" class="wt-games-sol-card back ${extra}" ${attrs}>WT</button>`;
        return `<button type="button" class="wt-games-sol-card ${card.color} ${extra}" ${attrs}><span>${card.rank}</span><strong>${card.suit}</strong></button>`;
    }

    function renderSolitaireOnGamesPage() {
        ensureSolitaire();
        const stage = document.getElementById("wtGamesStage");
        if (!stage) return;

        const waste = game.waste[game.waste.length - 1];
        const foundations = suits.map(suit => {
            const pile = game.foundations[suit];
            const top = pile[pile.length - 1];
            return top ? cardHtml(top, `data-gsol-foundation="${suit}"`) : `<button type="button" class="wt-games-sol-card empty" data-gsol-foundation="${suit}">${suit}</button>`;
        }).join("");

        const tableau = game.tableau.map((pile, col) => `
            <div class="wt-games-sol-column" data-gsol-column="${col}">
                ${pile.map((card, index) => {
                    const sel = selected?.type === "tableau" && selected.col === col && selected.index === index ? "selected" : "";
                    return `<div class="wt-games-sol-position" style="top:${index * 28}px">${cardHtml(card, `data-gsol-tableau="${col}" data-gsol-index="${index}"`, sel)}</div>`;
                }).join("") || `<button type="button" class="wt-games-sol-card empty" data-gsol-column="${col}">K</button>`}
            </div>
        `).join("");

        stage.innerHTML = `
            <div class="wt-games-solitaire">
                <div class="wt-games-sol-head">
                    <div>
                        <h2>Solitaire</h2>
                        <p>Klicke eine Karte an und danach den Zielstapel. Doppelklick versucht automatisch abzulegen.</p>
                    </div>
                    <div class="wt-games-sol-buttons">
                        <button type="button" data-gsol-hint>Tipps</button>
                        <button type="button" data-gsol-undo>Zurück</button>
                        <button type="button" data-gsol-new>Neu starten</button>
                    </div>
                </div>
                <div class="wt-games-sol-status">Züge: ${game.moves} · Nachziehstapel: ${game.stock.length}</div>
                <div class="wt-games-sol-top">
                    <button type="button" class="wt-games-sol-card ${game.stock.length ? "back" : "empty"}" data-gsol-draw>${game.stock.length ? "WT" : "↻"}</button>
                    ${waste ? cardHtml(waste, "data-gsol-waste", selected?.type === "waste" ? "selected" : "") : `<button type="button" class="wt-games-sol-card empty"></button>`}
                    <div class="wt-games-sol-foundations">${foundations}</div>
                </div>
                <div class="wt-games-sol-tableau">${tableau}</div>
                <p id="wtGamesSolHint" class="wt-games-sol-hint">${hint()}</p>
            </div>
        `;
    }

    document.addEventListener("click", event => {
        if (!isGamesPage()) return;

        if (event.target.closest("[data-gsol-draw]")) return draw();
        if (event.target.closest("[data-gsol-new]")) { newSolitaire(); return renderSolitaireOnGamesPage(); }
        if (event.target.closest("[data-gsol-undo]")) return undo();
        if (event.target.closest("[data-gsol-hint]")) {
            const el = document.getElementById("wtGamesSolHint");
            if (el) el.textContent = hint();
            return;
        }

        const foundation = event.target.closest("[data-gsol-foundation]");
        if (foundation && selected) return moveFoundation(foundation.dataset.gsolFoundation);

        const waste = event.target.closest("[data-gsol-waste]");
        if (waste) {
            selected = { type: "waste" };
            return renderSolitaireOnGamesPage();
        }

        const card = event.target.closest("[data-gsol-tableau]");
        if (card) {
            const col = Number(card.dataset.gsolTableau);
            const index = Number(card.dataset.gsolIndex);
            const item = game.tableau[col][index];
            if (!item) return;
            if (!item.faceUp && index === game.tableau[col].length - 1) {
                snap();
                item.faceUp = true;
                return afterMove();
            }

            if (selected && moveTable(col)) return;
            selected = { type: "tableau", col, index };
            return renderSolitaireOnGamesPage();
        }

        const col = event.target.closest("[data-gsol-column]");
        if (col && selected) return moveTable(Number(col.dataset.gsolColumn));
    });

    document.addEventListener("dblclick", event => {
        if (!isGamesPage()) return;

        const waste = event.target.closest("[data-gsol-waste]");
        if (waste) {
            selected = { type: "waste" };
            const card = sourceCards(selected)[0];
            if (card && moveFoundation(card.suit)) return;
        }

        const table = event.target.closest("[data-gsol-tableau]");
        if (table) {
            selected = { type: "tableau", col: Number(table.dataset.gsolTableau), index: Number(table.dataset.gsolIndex) };
            const card = sourceCards(selected)[0];
            if (card && moveFoundation(card.suit)) return;
        }
    });

    function tick() {
        removeOldSolitaire();
        ensureGamesMenuLink();
        renderGamesPage();
    }

    const observer = new MutationObserver(() => {
        removeOldSolitaire();
        ensureGamesMenuLink();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener("hashchange", tick);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
    else tick();
})();



/* Handy-Menü-Fallback */
(function wtSafeMobileMenuFallback() {
    if (window.__wtSafeMobileMenuFallback) return;
    window.__wtSafeMobileMenuFallback = true;
    function openFallbackMenu() {
        if (document.getElementById("wtMobileMenuFallback")) return;
        const cats = ["Politik","Wirtschaft","Gesellschaft","Kultur","Sport","Lokales","Wissenschaft","Unterhaltung","Panorama","Spiele"];
        const overlay = document.createElement("div");
        overlay.id = "wtMobileMenuFallback";
        overlay.className = "wt-mobile-menu-fallback";
        overlay.innerHTML = `<div class="wt-mobile-menu-panel"><div class="wt-mobile-menu-head"><strong>MENÜ</strong><button type="button" data-wt-menu-close>×</button></div><button type="button" data-wt-home>Startseite</button><button type="button" data-wt-gallery>Tagesbilder</button>${cats.map(cat => `<button type="button" data-wt-cat="${cat}">${cat}</button>`).join("")}</div>`;
        document.body.appendChild(overlay);
    }
    document.addEventListener("click", function(event) {
        if (event.target.closest("[data-wt-menu-close]")) { document.getElementById("wtMobileMenuFallback")?.remove(); return; }
        if (event.target.closest("[data-wt-home]")) { document.getElementById("wtMobileMenuFallback")?.remove(); if(typeof setView==="function") setView("home"); else location.href="index.html"; return; }
        if (event.target.closest("[data-wt-gallery]")) { document.getElementById("wtMobileMenuFallback")?.remove(); if(typeof setView==="function") setView("gallery"); else location.href="index.html#tagesbilder"; return; }
        const cat = event.target.closest("[data-wt-cat]");
        if (cat) { document.getElementById("wtMobileMenuFallback")?.remove(); if(cat.dataset.wtCat==="Spiele") { location.hash="spiele"; if(typeof renderApp==="function") renderApp(); return; } if(typeof executeSearchCategory==="function") executeSearchCategory(cat.dataset.wtCat); return; }
        const btn = event.target.closest("button"); if(!btn) return;
        const onclick = String(btn.getAttribute("onclick") || ""); const label = String(btn.getAttribute("aria-label") || "").toLowerCase(); const text=String(btn.textContent||"").trim().toLowerCase();
        if (!(onclick.includes("toggleMenu") || label.includes("menü") || label.includes("menu") || text === "☰")) return;
        setTimeout(function(){ const existing = document.querySelector(".fixed.inset-0.bg-black\\/60, .fixed.inset-0"); if(!existing) openFallbackMenu(); },150);
    }, true);
})();
