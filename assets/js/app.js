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
    {
        id: 1, category: "Wirtschaft", title: "KI verändert Arbeitswelt", summary: "Eine Studie zeigt: KI wird bald viele Bürojobs transformieren.", content: "Künstliche Intelligenz wird in den nächsten Jahren viele Büroaufgaben automatisieren. Dadurch entstehen aber auch neue, kreative Berufe. Die Politik ist gefordert, das Bildungssystem entsprechend anzupassen.", author: "Sarah Müller", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), imageUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", views: ['user_x'], likes: [], comments: [], isEilmeldung: true, sources: ["https://example.com/ki-studie", "https://example.com/zukunft-der-arbeit"]
    },
    {
        id: 2, category: "Politik", title: "Einigung beim Klimagipfel", summary: "Industriestaaten beschließen strengere Klimaziele.", content: "In Genf haben sich die Staaten auf neue CO2-Emissionsziele geeinigt. Bis 2030 sollen die Emissionen deutlich sinken. Ein Ausgleichsfonds half beim Durchbruch.", author: "Johannes Weber", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), imageUrl: "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80", views: [], likes: [], comments: [
            { id: 1001, username: "MaxMuster", text: "Endlich ein Schritt in die richtige Richtung!", timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), likes: [], isDeleted: false, deletedBy: null, reportedBy: [], moderationStatus: 'approved' }
        ]
    },
    {
        id: 3, category: "Gesellschaft", title: "Neue Lehrpläne an Schulen", summary: "Digitale Medien und Gesundheit werden neue Hauptfächer.", content: "Ab dem nächsten Schuljahr gibt es neue Fächer: Digitale Kompetenz und Mentale Gesundheit werden unterrichtet, um Schüler besser auf die Zukunft vorzubereiten.", author: "Elena Rost", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), imageUrl: "", views: [], likes: [], comments: []
    },
    {
        id: 4, category: "Sport", title: "Außenseiter gewinnt Finale", summary: "Siegessensation durch Tor in der Nachspielzeit.", content: "Der klare Außenseiter hat das Finale für sich entschieden. Ein Treffer in der letzten Minute sicherte dem Team überraschend den begehrten Meistertitel.", author: "Thomas Klein", timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80", views: [], likes: [], comments: []
    }
];

let authors = [
    { id: 1, name: "Redaktion", bio: "Das gemeinsame Redaktionsteam der Winterthur Times.", imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&fit=crop" }
];

let communityImages = [
    { id: 101, url: 'https://images.unsplash.com/photo-1517260739337-6799d239ce83?w=800&q=80', uploader: 'MaxMuster', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), likes: [] },
    { id: 102, url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80', uploader: 'AnnaAdmin', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), likes: [] }
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

let categories = ["Politik", "Wirtschaft", "Gesellschaft", "Kultur", "Sport", "Lokales", "Wissenschaft", "Unterhaltung", "Panorama"];

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
    
    logoScene = new THREE.Scene();
    logoCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    logoCamera.position.z = 6.5;

    logoRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    logoRenderer.setSize(128, 128);
    logoRenderer.setPixelRatio(window.devicePixelRatio);
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 110px "Times New Roman", Times, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WINTERTHUR TIMES', canvas.width / 2, canvas.height / 2);

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
}

function animateLogo() {
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

// --- MODERATION ---

window.finalizeModeration = function(type, id, parentId, status) {
    if (type === 'comment') {
        const article = articles.find(a => a.id === parentId);
        if (article) {
            const c = article.comments.find(c => c.id === id);
            if (c) c.moderationStatus = status;
        }
    } else if (type === 'feedback') {
        const fb = siteFeedbacks.find(f => f.id === id);
        if (fb) fb.moderationStatus = status;
    }
    window.saveState();
    renderApp();
};

window.adminApproveContent = function(type, id, parentId) {
    if (!hasAdminAccess()) return;
    finalizeModeration(type, id, parentId, 'approved');
};

window.adminRejectContent = function(type, id, parentId) {
    if (!hasAdminAccess()) return;
    if (type === 'comment') {
        const article = articles.find(a => a.id === parentId);
        if (article) {
            const c = article.comments.find(c => c.id === id);
            if (c) {
                c.moderationStatus = 'rejected';
                c.isDeleted = true;
                c.deletedBy = 'admin';
            }
        }
    } else if (type === 'feedback') {
        siteFeedbacks = siteFeedbacks.filter(f => f.id !== id);
    }
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

function renderAdminDashboard() {
    if (!hasAdminAccess() && adminTab !== 'articles') {
        adminTab = 'articles';
    }

    let allComments = [];
    let pendingCommentCount = 0;
    let pendingFeedbackCount = 0;
    articles.forEach(a => {
        a.comments.forEach(c => {
            allComments.push({ ...c, articleId: a.id, articleTitle: a.title, type: 'comment' });
            if (c.moderationStatus === 'pending') pendingCommentCount++;
        });
    });
    siteFeedbacks.forEach(f => {
        if (f.moderationStatus === 'pending') pendingFeedbackCount++;
    });
    allComments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Wir zeigen nur Chats an, die vom Admin nicht manuell "archiviert" wurden
    const visibleChats = supportChats.filter(c => !c.adminDeleted);

    return `
    <div class="max-w-6xl mx-auto bg-white shadow-md rounded-sm font-sans mt-4">
        
        <div class="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
            <h2 class="text-3xl font-black uppercase flex items-center gap-3">
                <i data-lucide="${hasAdminAccess() ? 'shield' : 'pen-tool'}" class="w-8 h-8 text-blue-900"></i> ${hasAdminAccess() ? 'Admin-Zentrale' : 'Redaktions-Dashboard'}
            </h2>
            <button onclick="exitDashboard()" class="text-gray-500 hover:text-red-600 font-bold flex items-center gap-1 cursor-pointer">
                <i data-lucide="log-out" class="w-4 h-4"></i> Dashboard verlassen
            </button>
        </div>

        <div class="flex gap-1 border-b border-gray-200 px-6 pt-4 bg-gray-50 overflow-x-auto">
            <button onclick="adminTab='articles'; renderApp()" class="px-6 py-3 font-bold uppercase text-sm rounded-t ${adminTab === 'articles' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">Artikel</button>
            ${hasAdminAccess() ? `<button onclick="adminTab='categories'; renderApp()" class="px-6 py-3 font-bold uppercase text-sm rounded-t ${adminTab === 'categories' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">Ressorts</button>` : ''}
            ${hasAdminAccess() ? `<button onclick="adminTab='authors'; renderApp()" class="px-6 py-3 font-bold uppercase text-sm rounded-t ${adminTab === 'authors' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">Autoren</button>` : ''}
            ${hasAdminAccess() ? `<button onclick="adminTab='users'; renderApp()" class="px-6 py-3 font-bold uppercase text-sm rounded-t ${(adminTab === 'users' || adminTab === 'userDetails') ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">Benutzer</button>` : ''}
            ${hasAdminAccess() ? `<button onclick="adminTab='comments'; renderApp()" class="px-6 py-3 font-bold uppercase text-sm rounded-t flex items-center gap-2 ${adminTab === 'comments' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">
                Kommentare <span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">${allComments.length}</span>
                ${pendingCommentCount > 0 ? `<span class="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs animate-pulse" title="${pendingCommentCount} warten auf Freigabe">${pendingCommentCount}</span>` : ''}
            </button>` : ''}
            ${hasAdminAccess() ? `<button onclick="adminTab='feedback'; renderApp()" class="px-6 py-3 font-bold uppercase text-sm rounded-t flex items-center gap-2 ${adminTab === 'feedback' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">
                Bewertungen <span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">${siteFeedbacks.length}</span>
                ${pendingFeedbackCount > 0 ? `<span class="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs animate-pulse" title="${pendingFeedbackCount} warten auf Freigabe">${pendingFeedbackCount}</span>` : ''}
            </button>` : ''}
            ${hasAdminAccess() ? `<button onclick="adminTab='support'; renderApp()" class="px-6 py-3 font-bold uppercase text-sm rounded-t flex items-center gap-2 ${adminTab === 'support' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">
                Support <span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">${visibleChats.length}</span>
            </button>` : ''}
            ${hasAdminAccess() ? `<button onclick="adminTab='backup'; renderApp()" class="px-6 py-3 font-bold uppercase text-sm rounded-t flex items-center gap-2 ${adminTab === 'backup' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">
                <i data-lucide="database" class="w-4 h-4"></i> Backup
            </button>` : ''}
        </div>

        <div class="p-6 md:p-8">
            ${adminTab === 'categories' && hasAdminAccess() ? `
                <h3 class="text-xl font-bold uppercase mb-6 flex items-center gap-2 border-b pb-2"><i data-lucide="layers" class="text-blue-600"></i> Ressorts verwalten</h3>
                
                <div class="bg-blue-50 p-4 rounded text-sm text-gray-700 flex items-start gap-3 mb-6 border border-blue-100">
                    <i data-lucide="info" class="w-5 h-5 text-blue-600 shrink-0"></i>
                    <p>Hier kannst du neue Ressorts anlegen. Du kannst ein Ressort nur löschen, wenn kein Artikel mehr damit verknüpft ist.</p>
                </div>

                <div class="flex gap-4 mb-8">
                    <input type="text" id="newCategoryInput" placeholder="Name des neuen Ressorts..." class="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" onkeypress="if(event.key === 'Enter') addCategory()" />
                    <button onclick="addCategory()" class="bg-blue-900 text-white font-bold py-2 px-6 rounded hover:bg-blue-800 transition-colors flex items-center gap-2 cursor-pointer">
                        <i data-lucide="plus" class="w-4 h-4"></i> Hinzufügen
                    </button>
                </div>

                <ul class="flex flex-col gap-3">
                    ${categories.map(cat => {
                        const usedInArticles = articles.filter(a => a.category === cat);
                        const isInUse = usedInArticles.length > 0;
                        return `
                            <li class="flex justify-between items-center bg-gray-50 p-4 rounded border border-gray-200">
                                <span class="font-bold text-lg text-blue-900">${cat}</span>
                                ${isInUse ? `
                                    <span class="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                                        <i data-lucide="lock" class="w-3 h-3"></i> in ${usedInArticles.length} Artikel(n) genutzt
                                    </span>
                                ` : `
                                    <button onclick="deleteCategory('${cat}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors cursor-pointer flex items-center gap-1 text-sm font-bold">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i> Löschen
                                    </button>
                                `}
                            </li>
                        `;
                    }).join('')}
                </ul>

            ` : adminTab === 'authors' && hasAdminAccess() ? `
                <h3 class="text-xl font-bold uppercase mb-6 flex items-center gap-2 border-b pb-2">
                    <i data-lucide="${editingAuthorId ? 'edit' : 'user-plus'}" class="text-blue-600"></i> 
                    ${editingAuthorId ? 'Autor bearbeiten' : 'Neuen Autor hinzufügen'}
                </h3>
                
                <form onsubmit="handleSaveAuthor(event)" class="flex flex-col gap-6 font-sans mb-12">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-bold mb-2 text-gray-700">Name des Autors</label>
                            <input required type="text" id="author-name" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-bold mb-2 text-gray-700">Profilbild (Optional)</label>
                            <div class="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded">
                                <input type="file" id="author-image-file" accept="image/*" class="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white" />
                                <span class="text-xs text-center text-gray-400 uppercase font-bold">oder URL</span>
                                <input type="url" id="author-image-url" placeholder="https://..." class="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2 text-gray-700">Biografie / Über den Autor</label>
                        <textarea required rows="3" id="author-bio" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"></textarea>
                    </div>
                    <div class="flex justify-end gap-4 mt-2">
                        ${editingAuthorId ? `<button type="button" onclick="cancelAuthorEdit()" class="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded hover:bg-gray-100 transition-colors shadow-sm cursor-pointer">Abbrechen</button>` : ''}
                        <button type="submit" class="px-8 py-3 bg-blue-700 text-white font-bold rounded hover:bg-blue-800 transition-colors shadow-sm cursor-pointer">
                            ${editingAuthorId ? 'Änderungen speichern' : 'Autor hinzufügen'}
                        </button>
                    </div>
                </form>

                <h3 class="text-xl font-bold uppercase mb-4 border-b pb-2 flex items-center gap-2"><i data-lucide="users" class="text-gray-600"></i> Vorhandene Autoren</h3>
                <div class="flex flex-col gap-3">
                    ${getActiveAuthors().map(a => {
                        const usedInArticles = articles.filter(art => art.author === a.name);
                        const isUserLinked = String(a.id).startsWith('usr_');
                        return `
                            <div class="flex justify-between items-center bg-gray-50 p-4 rounded border border-gray-200">
                                <div class="flex items-center gap-4">
                                    ${a.imageUrl ? `
                                        <img src="${a.imageUrl}" class="w-12 h-12 rounded-full object-cover border border-gray-300 shrink-0" onerror="this.outerHTML='${getStandardAvatarHtml('w-12 h-12', 'w-6 h-6').replace(/'/g, "\\'").replace(/"/g, '&quot;')}'" />
                                    ` : getStandardAvatarHtml('w-12 h-12', 'w-6 h-6')}
                                    <div>
                                        <span class="font-bold text-lg text-blue-900">${a.name}</span>
                                        <p class="text-xs text-gray-500">${usedInArticles.length} Artikel verfasst</p>
                                    </div>
                                </div>
                                <div class="flex gap-2 items-center">
                                    ${isUserLinked ? `
                                        <span class="text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded font-bold" title="Wird über das Benutzerprofil verwaltet">Benutzer-Account</span>
                                    ` : `
                                        <button onclick="editAuthor(${a.id})" class="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-100 rounded transition-colors cursor-pointer" title="Bearbeiten"><i data-lucide="edit" class="w-5 h-5"></i></button>
                                        <button onclick="deleteAuthor(${a.id})" class="text-red-500 hover:text-red-700 p-2 hover:bg-red-100 rounded transition-colors cursor-pointer" title="Löschen"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

            ` : adminTab === 'articles' ? (() => {
                let defaultAuth = 'Redaktion';
                if (editingArticleId) {
                    const editingArt = articles.find(a => a.id === editingArticleId);
                    if (editingArt) defaultAuth = editingArt.author;
                } else if (currentUser) {
                    defaultAuth = getDisplayName(currentUser);
                }
                return `
                <h3 class="text-xl font-bold uppercase mb-6 flex items-center gap-2 border-b pb-2">
                    <i data-lucide="${editingArticleId ? 'edit' : 'plus-circle'}" class="text-blue-600"></i> 
                    ${editingArticleId ? 'Artikel bearbeiten' : 'Neuen Artikel verfassen'}
                </h3>
                <form onsubmit="handleCreateArticle(event)" class="flex flex-col gap-6 font-sans">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-bold mb-2 text-gray-700">Überschrift (Title)</label>
                            <input required type="text" id="new-title" class="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500" />
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-bold mb-2 text-gray-700">Ressort (Kategorie)</label>
                                <select required id="new-category" class="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500">
                                    <option value="">Wählen...</option>
                                    ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-bold mb-2 text-gray-700">Autor</label>
                                <select required id="new-author" class="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500">
                                    ${getActiveAuthors().map(a => `<option value="${a.name}" ${a.name === defaultAuth ? 'selected' : ''}>${a.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3 bg-red-50 p-4 rounded border border-red-200">
                        <input type="checkbox" id="new-eilmeldung" class="w-5 h-5 cursor-pointer text-red-600 rounded" />
                        <label for="new-eilmeldung" class="font-bold text-red-800 cursor-pointer flex items-center gap-2">
                            <i data-lucide="alert-triangle" class="w-5 h-5"></i> Als Eilmeldung markieren (verschwindet automatisch nach 24h)
                        </label>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-bold mb-2 text-gray-700">Zusammenfassung (Teaser)</label>
                        <textarea required rows="2" id="new-summary" class="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500"></textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-bold mb-2 text-gray-700">Bild (Optional, falls leer wird ein passendes Platzhalterbild ergänzt)</label>
                        <div class="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-300 rounded">
                            <div>
                                <label class="text-xs text-gray-500 font-bold uppercase mb-1 block">Vom PC hochladen</label>
                                <input type="file" id="new-image-file" accept="image/*" class="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500 cursor-pointer" />
                            </div>
                            <div class="flex items-center gap-2">
                                <hr class="flex-1 border-gray-300"><span class="text-xs text-gray-400 font-bold uppercase">oder</span><hr class="flex-1 border-gray-300">
                            </div>
                            <div>
                                <label class="text-xs text-gray-500 font-bold uppercase mb-1 block">Bild-URL eingeben</label>
                                <input type="url" id="new-image-url" class="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500" placeholder="https://..." />
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-bold mb-2 text-gray-700">Automatisches Löschdatum (Optional)</label>
                        <input type="datetime-local" id="new-autodelete" class="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500" />
                        <p class="text-xs text-gray-500 mt-1">Nach diesem Datum wird der Artikel für Leser automatisch ausgeblendet.</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-bold mb-2 text-gray-700">Vollständiger Artikeltext</label>
                        <textarea required rows="6" id="new-content" class="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 font-serif text-lg"></textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-bold mb-2 text-gray-700">Quellen-Links (Optional)</label>
                        <input type="text" id="new-sources" class="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500" placeholder="https://quelle1.ch, https://quelle2.ch (mit Komma trennen)" />
                    </div>

                    <div class="flex justify-end gap-4 mt-2">
                        ${editingArticleId ? `<button type="button" onclick="cancelEdit()" class="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded hover:bg-gray-100 transition-colors shadow-sm cursor-pointer">Abbrechen</button>` : ''}
                        <button type="submit" class="px-8 py-3 bg-blue-700 text-white font-bold rounded hover:bg-blue-800 transition-colors shadow-sm cursor-pointer">
                            ${editingArticleId ? 'Änderungen speichern' : 'Artikel veröffentlichen'}
                        </button>
                    </div>
                </form>

                <div class="mt-12 border-t pt-8">
                    <h3 class="text-xl font-bold uppercase mb-6 flex items-center gap-2"><i data-lucide="file-text" class="text-gray-600"></i> Vorhandene Artikel</h3>
                    <div class="flex flex-wrap gap-4 mb-6">
                        <button onclick="exportArticles()" class="bg-green-700 text-white px-4 py-2 rounded font-bold hover:bg-green-600 flex items-center gap-2 cursor-pointer shadow-sm"><i data-lucide="download" class="w-4 h-4"></i> Exportieren (.txt)</button>
                        <label class="bg-purple-700 text-white px-4 py-2 rounded font-bold hover:bg-purple-600 flex items-center gap-2 cursor-pointer shadow-sm">
                            <i data-lucide="upload" class="w-4 h-4"></i> Importieren (.txt)
                            <input type="file" accept=".txt" class="hidden" onchange="importArticles(event)" />
                        </label>
                    </div>
                    <div class="flex flex-col gap-4">
                        ${articles.length === 0 ? '<p class="text-gray-500 italic">Keine Artikel vorhanden.</p>' : ''}
                        ${articles.map(a => {
                            const isExpired = a.autoDeleteDate && new Date(a.autoDeleteDate) <= new Date();
                            return `
                            <div class="flex justify-between items-center bg-gray-50 p-4 rounded border border-gray-200 ${isExpired ? 'opacity-60' : ''}">
                                <div class="flex-1 pr-4">
                                    <span class="text-xs font-bold text-gray-500 uppercase">${a.category}</span>
                                    ${a.autoDeleteDate ? `<span class="ml-2 text-[10px] px-2 py-0.5 rounded ${isExpired ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} font-bold uppercase" title="Automatisches Löschdatum">Ablauf: ${new Date(a.autoDeleteDate).toLocaleString('de-DE', {dateStyle:'short', timeStyle:'short'})}</span>` : ''}
                                    <h4 class="font-bold text-lg leading-tight mt-1 line-clamp-1">${a.title}</h4>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="editArticle(${a.id})" class="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-100 rounded transition-colors cursor-pointer" title="Artikel bearbeiten"><i data-lucide="edit" class="w-5 h-5"></i></button>
                                    <button onclick="deleteArticle(${a.id})" class="text-red-500 hover:text-red-700 p-2 hover:bg-red-100 rounded transition-colors cursor-pointer" title="Artikel löschen"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                                </div>
                            </div>
                        `;
                        }).join('')}
                    </div>
                </div>

            `; })() : adminTab === 'users' && hasAdminAccess() ? `
                <div class="flex justify-between items-center border-b pb-4 mb-6">
                    <h3 class="text-xl font-bold uppercase flex items-center gap-2"><i data-lucide="users" class="text-blue-600"></i> Registrierte Benutzer (${registeredUsers.length})</h3>
                    <button onclick="exportUsers()" class="bg-blue-700 text-white px-4 py-2 rounded font-bold hover:bg-blue-600 flex items-center gap-2 cursor-pointer shadow-sm text-sm"><i data-lucide="download" class="w-4 h-4"></i> Liste exportieren</button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${registeredUsers.length === 0 ? '<p class="text-gray-500 italic">Noch keine Benutzer registriert.</p>' : ''}
                    ${registeredUsers.map(u => `
                        <div class="border ${u.isBanned || u.isDeleted ? 'border-red-300 bg-red-50' : 'border-gray-200'} rounded p-4 flex flex-col sm:flex-row gap-4 relative">
                            <div class="absolute top-2 right-2 flex gap-1">
                                ${u.isDeleted ? '<span class="bg-gray-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">Gelöscht</span>' : ''}
                                ${u.isBanned ? '<span class="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">Gesperrt</span>' : ''}
                            </div>
                            <div class="relative shrink-0">
                                ${getUserAvatar(u.username, 'w-12 h-12', 'w-6 h-6', false)}
                                <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase bg-blue-100 text-blue-800 px-1 rounded border border-blue-200">${u.role}</span>
                            </div>
                            <div class="flex-1 mt-2 sm:mt-0">
                                <h4 class="font-bold text-lg text-blue-900">${u.username}</h4>
                                <p class="text-sm text-gray-600 mb-2">
                                    ${u.firstName || u.lastName ? `${u.firstName} ${u.lastName}` : '<span class="italic text-gray-400">Kein Name hinterlegt</span>'} 
                                    | ${u.email || '<span class="italic text-gray-400">Keine E-Mail</span>'}
                                </p>
                                <button onclick="viewUserDetails('${u.username}')" class="mt-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-bold px-4 py-2 rounded hover:bg-blue-100 transition-colors w-full sm:w-auto">Verwalten</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
            ` : adminTab === 'userDetails' && adminSelectedUser && hasAdminAccess() ? `
                ${(() => {
                    const u = registeredUsers.find(user => user.username === adminSelectedUser);
                    if(!u) return '<p>Benutzer nicht gefunden.</p>';
                    
                    const userComments = [];
                    articles.forEach(a => {
                        a.comments.forEach(c => {
                            if(c.username === u.username) userComments.push({...c, articleTitle: a.title, articleId: a.id});
                        });
                    });
                    userComments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    const liked = articles.filter(a => a.likes.includes(u.username));
                    const viewed = articles.filter(a => a.views.includes(u.username));
                    
                    return `
                        <div class="mb-6">
                            <button onclick="adminTab='users'; renderApp()" class="text-blue-600 hover:underline flex items-center gap-1 font-bold"><i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Benutzerliste</button>
                        </div>
                        <div class="bg-gray-50 p-6 rounded border border-gray-200 mb-8 flex flex-col md:flex-row gap-6 items-start">
                            ${getUserAvatar(u.username, 'w-24 h-24', 'w-12 h-12', true)}
                            <div class="flex-1">
                                <h3 class="text-2xl font-black text-blue-900 mb-1">${u.username} ${u.isBanned ? '<span class="text-sm bg-red-600 text-white px-2 py-1 rounded ml-2 align-middle">GESPERRT</span>' : ''} ${u.isDeleted ? '<span class="text-sm bg-gray-600 text-white px-2 py-1 rounded ml-2 align-middle">GELÖSCHT</span>' : ''}</h3>
                                <p class="text-gray-700 mt-1"><span class="font-bold">Echter Name:</span> ${u.firstName || '-'} ${u.lastName || '-'}</p>
                                <p class="text-gray-700"><span class="font-bold">E-Mail:</span> ${u.email || '-'}</p>
                                <p class="text-gray-700"><span class="font-bold">Anzeige-Modus:</span> ${u.showRealName ? 'Zeigt echten Namen' : 'Zeigt Benutzernamen'}</p>
                                
                                <p class="text-gray-700 mt-2 flex items-center gap-2">
                                    <span class="font-bold">Rolle ändern:</span>
                                    <select onchange="changeUserRole('${u.username}', this.value)" class="border border-gray-300 rounded px-2 py-1 text-sm bg-white cursor-pointer font-bold focus:outline-none focus:border-blue-500">
                                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>Benutzer</option>
                                        <option value="author" ${u.role === 'author' ? 'selected' : ''}>Autor</option>
                                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    </select>
                                </p>

                                <p class="text-gray-700 mt-2"><span class="font-bold">Passwort:</span> <span class="bg-gray-200 px-2 py-0.5 rounded font-mono text-sm">Firebase Auth</span> <span class="text-[10px] text-gray-500 ml-2 uppercase font-bold">(nicht in der App gespeichert)</span></p>
                                
                                ${u.bio ? `<p class="text-sm bg-white border border-gray-200 p-3 rounded text-gray-700 mt-3 italic">"${u.bio}"</p>` : ''}
                                
                                <div class="mt-4 flex flex-wrap gap-3">
                                    <button onclick="toggleUserBan('${u.username}')" class="${u.isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'} text-white font-bold py-2 px-4 rounded text-sm transition-colors cursor-pointer flex items-center gap-2">
                                        <i data-lucide="${u.isBanned ? 'check-circle' : 'ban'}" class="w-4 h-4"></i>
                                        ${u.isBanned ? 'Account entsperren' : 'Account sperren'}
                                    </button>
                                    <button onclick="toggleUserDeleted('${u.username}')" class="${u.isDeleted ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white font-bold py-2 px-4 rounded text-sm transition-colors cursor-pointer flex items-center gap-2">
                                        <i data-lucide="${u.isDeleted ? 'check-circle' : 'trash-2'}" class="w-4 h-4"></i>
                                        ${u.isDeleted ? 'Account wiederherstellen' : 'Account löschen'}
                                    </button>
                                    ${u.isDeleted ? `
                                    <button onclick="permanentlyDeleteUser('${u.username}')" class="bg-red-900 hover:bg-red-950 text-white font-bold py-2 px-4 rounded text-sm transition-colors cursor-pointer flex items-center gap-2">
                                        <i data-lucide="user-x" class="w-4 h-4"></i>
                                        Endgültig löschen
                                    </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div class="bg-white p-4 rounded border border-gray-200 shadow-sm">
                                <h4 class="font-bold flex items-center gap-2 mb-4 text-gray-700 border-b pb-2"><i data-lucide="heart" class="w-5 h-5 text-red-500"></i> Gelikte Artikel (${liked.length})</h4>
                                <ul class="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                                    ${liked.length === 0 ? '<li class="text-gray-500 text-sm">Keine</li>' : liked.map(a => `<li><button onclick="openArticle(${a.id})" class="text-left text-sm text-blue-700 hover:underline line-clamp-1">${a.title}</button></li>`).join('')}
                                </ul>
                            </div>
                            <div class="bg-white p-4 rounded border border-gray-200 shadow-sm">
                                <h4 class="font-bold flex items-center gap-2 mb-4 text-gray-700 border-b pb-2"><i data-lucide="eye" class="w-5 h-5 text-blue-500"></i> Gelesene Artikel (${viewed.length})</h4>
                                <ul class="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                                    ${viewed.length === 0 ? '<li class="text-gray-500 text-sm">Keine</li>' : viewed.map(a => `<li><button onclick="openArticle(${a.id})" class="text-left text-sm text-blue-700 hover:underline line-clamp-1">${a.title}</button></li>`).join('')}
                                </ul>
                            </div>
                        </div>

                        <div class="bg-white p-4 rounded border border-gray-200 shadow-sm">
                            <h4 class="font-bold flex items-center gap-2 mb-4 text-gray-700 border-b pb-2"><i data-lucide="message-square" class="w-5 h-5 text-blue-600"></i> Kommentare des Nutzers (${userComments.length})</h4>
                            <div class="flex flex-col gap-4">
                                ${userComments.length === 0 ? '<p class="text-gray-500 text-sm">Keine Kommentare</p>' : userComments.map(c => `
                                    <div class="bg-gray-50 p-3 rounded border border-gray-100">
                                        <div class="flex justify-between items-start mb-1">
                                            <span class="text-xs text-gray-500">zu Artikel: <button onclick="openArticle(${c.articleId})" class="font-bold text-blue-600 hover:underline">${c.articleTitle}</button></span>
                                            <span class="text-xs text-gray-400">${new Date(c.timestamp).toLocaleString('de-DE')}</span>
                                        </div>
                                        <p class="text-gray-800 text-sm mt-1">${c.text}</p>
                                        ${c.isDeleted ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold mt-2 inline-block">Gelöscht</span>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                })()}

            ` : adminTab === 'support' && hasAdminAccess() ? `
                
                <h3 class="text-xl font-bold uppercase flex items-center gap-2 border-b pb-4 mb-6"><i data-lucide="help-circle" class="text-blue-600"></i> Support-Anfragen</h3>
                
                <div class="flex flex-col md:flex-row gap-6 h-auto md:h-[600px] min-h-[500px]">
                    <div class="w-full md:w-1/3 border border-gray-200 rounded bg-white overflow-y-auto max-h-[300px] md:max-h-full">
                        ${visibleChats.length === 0 ? '<p class="p-4 text-gray-500 italic text-sm">Keine Support-Anfragen vorhanden.</p>' : visibleChats.map(c => {
                            const lastMsg = c.messages[c.messages.length - 1];
                            const isSelected = adminSelectedChatId === c.id;
                            const isUnread = lastMsg && lastMsg.sender === 'user';
                            
                            const user = registeredUsers.find(u => u.username === c.userId);
                            const isBanned = user ? user.isBanned : false;
                            
                            return `
                                <div onclick="adminSelectedChatId = ${c.id}; renderApp()" class="p-4 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'} relative">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="font-bold text-sm ${isUnread ? 'text-blue-900' : 'text-gray-700'} truncate flex items-center gap-1" title="${c.userId}">
                                            ${c.userId.length > 15 ? c.userId.substring(0, 15) + '...' : c.userId}
                                            ${isBanned ? '<span class="bg-red-600 text-white text-[8px] px-1 rounded uppercase" title="Account gesperrt">Gesperrt</span>' : ''}
                                        </span>
                                        <span class="text-[10px] text-gray-400 mr-3">${lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                                    </div>
                                    <p class="text-xs text-gray-500 truncate pr-3 ${isUnread ? 'font-bold text-gray-800' : ''}">${lastMsg ? lastMsg.text : 'Neuer Chat'}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="w-full md:w-2/3 border border-gray-200 rounded bg-gray-50 flex flex-col relative min-h-[400px] md:min-h-0">
                        ${!adminSelectedChatId ? `
                            <div class="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
                                <i data-lucide="message-square" class="w-12 h-12 opacity-50"></i>
                                <p>Wähle einen Chat aus der Liste aus.</p>
                            </div>
                        ` : (() => {
                            const chat = supportChats.find(c => c.id === adminSelectedChatId);
                            if(!chat) return '<p class="p-4">Chat nicht gefunden.</p>';
                            
                            const user = registeredUsers.find(u => u.username === chat.userId);
                            const isBanned = user ? user.isBanned : false;
                            
                            return `
                                <div class="bg-white p-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3 shadow-sm z-10">
                                    <h4 ${user ? `onclick="viewUserDetails('${chat.userId}')"` : ''} class="font-bold text-blue-900 flex items-center gap-2 ${user ? 'cursor-pointer hover:text-blue-700 hover:underline' : ''}" title="${user ? 'Zum Profil von ' + chat.userId : 'Gast-Nutzer'}">
                                        ${user ? getUserAvatar(chat.userId, 'w-6 h-6', 'w-3 h-3', false) : '<i data-lucide="user" class="w-5 h-5"></i>'}
                                        Chat mit ${chat.userId}
                                        ${isBanned ? '<span class="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase ml-2 no-underline">Gesperrt</span>' : ''}
                                        ${!user ? '<span class="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase ml-2 no-underline">Gast</span>' : ''}
                                    </h4>
                                    <div class="flex flex-wrap items-center gap-2">
                                        <button onclick="toggleChatAi('${chat.id}')"
                                            title="${chat.aiEnabled !== false ? 'KI deaktivieren' : 'KI aktivieren'}"
                                            class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer
                                            ${chat.aiEnabled !== false
                                                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                                                : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-700'}">
                                            <i data-lucide="${chat.aiEnabled !== false ? 'bot' : 'bot-off'}" class="w-3.5 h-3.5"></i>
                                            <span class="hidden sm:inline">KI ${chat.aiEnabled !== false ? 'AN' : 'AUS'}</span>
                                        </button>
                                        <button onclick="adminArchiveChat('${chat.id}')" class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer" title="Chat für Admins ausblenden (Nutzer sieht ihn weiterhin bis 10 Tage)">
                                            <i data-lucide="archive" class="w-3.5 h-3.5"></i>
                                            <span class="hidden xl:inline">Archivieren</span>
                                        </button>
                                        <button onclick="adminDeleteChat('${chat.id}')" class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer" title="Chat restlos aus der Datenbank löschen">
                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                            <span class="hidden xl:inline">Löschen</span>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="flex-1 p-4 overflow-y-auto flex flex-col gap-3" id="adminChatContainer">
                                    ${chat.messages.map((m, index) => `
                                        <div class="flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}">
                                            <div class="max-w-[85%] rounded-lg p-3 ${m.sender === 'admin' ? 'bg-blue-900 text-white rounded-br-none' : 'bg-white border border-gray-300 text-gray-800 rounded-bl-none'} shadow-sm">
                                                <p class="text-sm">${m.text}</p>
                                                <div class="flex justify-between items-center mt-1 gap-4">
                                                    <span class="text-[10px] opacity-75 block ${m.sender === 'user' ? 'text-left text-gray-400' : 'text-blue-200 text-right w-full'}">${new Date(m.timestamp).toLocaleString('de-DE')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                
                                <div class="p-3 bg-white border-t border-gray-200 flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                                    <input type="text" id="adminSupportInput" placeholder="Deine manuelle Antwort schreiben..." class="flex-1 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-blue-500 font-sans text-sm" onkeypress="if(event.key === 'Enter') adminReplySupportMessage(${chat.id})" />
                                    <button onclick="adminReplySupportMessage(${chat.id})" class="bg-blue-900 text-white px-6 py-2 rounded font-bold hover:bg-blue-800 transition-colors cursor-pointer text-sm flex items-center gap-2">
                                        Senden <i data-lucide="send" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            `;
                        })()}
                    </div>
                </div>

            ` : adminTab === 'backup' && hasAdminAccess() ? `
                <!-- BACKUP TAB -->
                <h3 class="text-xl font-bold uppercase mb-6 flex items-center gap-2 border-b pb-4"><i data-lucide="database" class="text-blue-600"></i> System-Backup</h3>
                
                <div class="bg-blue-50 p-4 rounded text-sm text-gray-700 flex items-start gap-3 mb-8 border border-blue-100">
                    <i data-lucide="info" class="w-5 h-5 text-blue-600 shrink-0"></i>
                    <p>Sichere den gesamten Stand der Zeitung in einer einzigen Datei. Diese kannst du später wieder hochladen, um alles exakt wiederherzustellen.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="bg-white p-8 border border-gray-200 shadow-sm rounded flex flex-col items-center text-center gap-4">
                        <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2"><i data-lucide="download-cloud" class="w-8 h-8"></i></div>
                        <h4 class="font-bold text-lg">Backup erstellen</h4>
                        <button onclick="exportBackup()" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                            <i data-lucide="download" class="w-5 h-5"></i> Komplettes Backup exportieren
                        </button>
                    </div>
                    <div class="bg-white p-8 border border-gray-200 shadow-sm rounded flex flex-col items-center text-center gap-4">
                        <div class="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-2"><i data-lucide="upload-cloud" class="w-8 h-8"></i></div>
                        <h4 class="font-bold text-lg">Backup wiederherstellen</h4>
                        <label class="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                            <i data-lucide="upload" class="w-5 h-5"></i> Backup-Datei hochladen
                            <input type="file" accept=".json,.txt" class="hidden" onchange="importBackup(event)" />
                        </label>
                    </div>
                </div>

            ` : adminTab === 'feedback' && hasAdminAccess() ? `
                <!-- FEEDBACK TAB -->
                <h3 class="text-xl font-bold uppercase flex items-center gap-2 border-b pb-4 mb-6"><i data-lucide="message-square-plus" class="text-blue-600"></i> Website-Bewertungen</h3>
                
                <div class="flex flex-col gap-4">
                    ${siteFeedbacks.length === 0 ? '<p class="text-gray-500 italic">Noch keine Bewertungen abgegeben.</p>' : ''}
                    ${[...siteFeedbacks].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(f => {
                        const isPending = f.moderationStatus === 'pending';
                        return `
                        <div class="bg-white p-4 rounded border ${isPending ? 'border-orange-400 bg-orange-50' : 'border-gray-200'} shadow-sm">
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center gap-2">
                                    ${getUserAvatar(f.username, 'w-6 h-6', 'w-3 h-3', false)}
                                    <span class="font-bold text-blue-900">${f.username}</span>
                                </div>
                                <div class="flex flex-col items-end gap-1">
                                    <span class="text-xs text-gray-500 flex items-center gap-2">
                                        ${isPending ? '<span class="bg-orange-500 text-white px-2 py-0.5 rounded font-bold uppercase animate-pulse">Wartet auf Freigabe</span>' : ''}
                                        ${new Date(f.timestamp).toLocaleString('de-DE')}
                                    </span>
                                </div>
                            </div>
                            <p class="text-gray-800 leading-relaxed mb-3">${f.text}</p>
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-gray-500 flex items-center gap-1"><i data-lucide="heart" class="w-4 h-4"></i> ${f.likes ? f.likes.length : 0} Likes</span>
                                
                                <div class="flex flex-wrap gap-2 md:gap-4">
                                    ${isPending ? `
                                        <button onclick="adminApproveContent('feedback', ${f.id}, null)" class="text-green-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="check" class="w-4 h-4"></i> Zulassen</button>
                                    ` : ''}

                                    <button onclick="adminRejectContent('feedback', ${f.id}, null)" class="text-red-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i> ${isPending ? 'Ablehnen & Löschen' : 'Löschen'}</button>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>

            ` : hasAdminAccess() ? `
                <!-- KOMMENTARE TAB -->
                <h3 class="text-xl font-bold uppercase flex items-center gap-2 border-b pb-4 mb-6"><i data-lucide="message-square" class="text-blue-600"></i> Alle Kommentare</h3>
                
                <div class="flex flex-col gap-4">
                    ${allComments.length === 0 ? '<p class="text-gray-500 italic">Noch keine Kommentare geschrieben.</p>' : ''}
                    ${allComments.map(c => {
                        const isPending = c.moderationStatus === 'pending';
                        return `
                        <div class="bg-white p-4 rounded border ${isPending ? 'border-orange-400 bg-orange-50' : c.isDeleted ? 'border-red-300 bg-red-50 opacity-75' : (c.reportedBy && c.reportedBy.length > 0 ? 'border-orange-400 bg-orange-50' : 'border-gray-200')} shadow-sm">
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center gap-2">
                                    ${getUserAvatar(c.username, 'w-6 h-6', 'w-3 h-3', false)}
                                    <span class="font-bold text-blue-900">${c.username}</span>
                                    <span class="text-xs text-gray-500 hidden md:inline">zu Artikel: <span class="font-bold">${c.articleTitle}</span></span>
                                </div>
                                <div class="flex flex-col items-end gap-1">
                                    <span class="text-xs text-gray-500 flex items-center gap-2">
                                        ${isPending ? '<span class="bg-orange-500 text-white px-2 py-0.5 rounded font-bold uppercase animate-pulse">Wartet auf Freigabe</span>' : ''}
                                        ${c.isDeleted ? '<span class="bg-red-600 text-white px-2 py-0.5 rounded font-bold">GELÖSCHT</span>' : ''}
                                        ${c.reportedBy && c.reportedBy.length > 0 && !c.isDeleted ? `<span class="bg-orange-500 text-white px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1"><i data-lucide="flag" class="w-3 h-3"></i> Gemeldet (${c.reportedBy.length}x)</span>` : ''}
                                        ${new Date(c.timestamp).toLocaleString('de-DE')}
                                    </span>
                                </div>
                            </div>
                            <p class="text-gray-800 leading-relaxed mb-3">${c.text}</p>
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-gray-500 flex items-center gap-1"><i data-lucide="heart" class="w-4 h-4"></i> ${c.likes.length} Likes</span>
                                
                                <div class="flex flex-wrap gap-2 md:gap-4">
                                    ${isPending ? `
                                        <button onclick="adminApproveContent('comment', ${c.id}, ${c.articleId})" class="text-green-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="check" class="w-4 h-4"></i> Zulassen</button>
                                    ` : ''}

                                    ${c.reportedBy && c.reportedBy.length > 0 && !c.isDeleted ? `
                                        <button onclick="unreportComment(${c.articleId}, ${c.id})" class="text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="check-circle" class="w-4 h-4"></i> Meldung ignorieren</button>
                                    ` : ''}

                                    ${c.isDeleted ? `
                                        <button onclick="restoreComment(${c.articleId}, ${c.id})" class="text-green-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Wiederherstellen</button>
                                    ` : `
                                        <button onclick="adminRejectContent('comment', ${c.id}, ${c.articleId})" class="text-red-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i> ${isPending ? 'Ablehnen & Löschen' : 'Löschen (Verstecken)'}</button>
                                    `}
                                </div>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            ` : ''}
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
    else if (view === 'admin-dashboard') content = typeof window.renderAdminDashboard === 'function' ? window.renderAdminDashboard() : renderAdminDashboard();
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

window.handleLogin = function(event) {
    event.preventDefault();
    const pwInput = document.getElementById('adminPassword').value;
    if (pwInput === 'LOL') {
        if (!window.location.pathname.toLowerCase().includes('adminzentrale.html')) {
            window.location.href = 'adminZentrale.html';
        } else {
            isSuperAdmin = true;
            adminTab = 'articles';
            setView('admin-dashboard');
        }
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
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

    const article = articles.find(a => a.id === articleId);
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
    const article = articles.find(a => a.id === articleId);
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
            const article = articles.find(a => a.id === articleId);
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
    const article = articles.find(a => a.id === articleId);
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
    const article = articles.find(a => a.id === articleId);
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
    const article = articles.find(a => a.id === articleId);
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
    searchCategory = category; 
    searchQuery = ""; 
    isSearchOpen = false; 
    setView('search');
}

window.adminArchiveChat = function(chatId) {
    const chat = supportChats.find(c => c.id == chatId);
    if(chat) {
        chat.adminDeleted = true;
        adminSelectedChatId = null;
        window.saveState();
        renderApp();
    }
}

window.adminDeleteChat = function(chatId) {
    currentModal = {
        title: 'Support-Chat löschen?',
        message: 'Möchtest du diesen Chat komplett aus der Datenbank löschen? (Auch der Nutzer verliert den Zugriff)',
        onConfirm: function() {
            supportChats = supportChats.filter(c => c.id != chatId);
            if (adminSelectedChatId == chatId) {
                adminSelectedChatId = null;
            }
            currentModal = null;
            window.saveState();
            renderApp();
        }
    };
    renderApp();
}

// --- INITIALISIERUNG ---
if (window.location.pathname.toLowerCase().includes('adminzentrale.html')) {
    view = 'admin-login';
}

init3DLogo();
fetchWeather();
initFirebase();
renderApp();
