<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Winterthur Times</title>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    
    <!-- Three.js (für 3D Logo) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f9fafb;
            -webkit-tap-highlight-color: transparent;
        }
        h1, h2, h3, .font-serif {
            font-family: 'Merriweather', serif;
        }
        .animate-slide-in {
            animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
            animation: fadeIn 0.2s ease-out forwards;
        }
        @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        /* Verstecke Scrollbars, behalte aber Scroll-Funktion */
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    </style>
</head>
<body class="text-gray-900 overflow-x-hidden">

    <div id="app"></div>

    <!-- App Logic -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { 
            getAuth, signInAnonymously, onAuthStateChanged, 
            signInWithEmailAndPassword, createUserWithEmailAndPassword, 
            updateProfile, signOut, signInWithCustomToken 
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { 
            getFirestore, doc, setDoc, getDoc, onSnapshot, 
            writeBatch, serverTimestamp 
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // --- GATEKEEPER KONFIGURATION ---
        const ENABLE_STUDENT_GATEKEEPER = false;
        let hasPassedGatekeeper = !ENABLE_STUDENT_GATEKEEPER;

        // Firebase Konfiguration
        let myFirebaseConfig = {
            apiKey: "AIzaSyDiYFdcmwniMpAuFB_N2kAkD9AIgHhgaVU",
            authDomain: "winterthurtimes.firebaseapp.com",
            projectId: "winterthurtimes",
            storageBucket: "winterthurtimes.firebasestorage.app",
            messagingSenderId: "558050711365",
            appId: "1:558050711365:web:6d37ce9f1b6b1128cdd02c"
        };

        window.saveState = async function() {
            // Wird überschrieben, wenn Firebase lädt.
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
            { id: 1, name: "Sarah Müller", bio: "Leitende Redakteurin für Technologie und Wirtschaft.", imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&fit=crop" },
            { id: 2, name: "Johannes Weber", bio: "Ressortleiter Politik mit Fokus auf internationale Beziehungen.", imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&fit=crop" },
            { id: 3, name: "Elena Rost", bio: "Expertin für gesellschaftliche Themen, Bildung und soziale Bewegungen.", imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&fit=crop" },
            { id: 4, name: "Thomas Klein", bio: "Sportjournalist aus Leidenschaft.", imageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&fit=crop" },
            { id: 5, name: "Redaktion", bio: "Das gemeinsame Redaktionsteam der Winterthur Times.", imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&fit=crop" }
        ];

        let communityImages = [
            { id: 101, url: 'https://images.unsplash.com/photo-1517260739337-6799d239ce83?w=800&q=80', uploader: 'MaxMuster', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), likes: [] },
            { id: 102, url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80', uploader: 'AnnaAdmin', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), likes: [] }
        ];

        let siteFeedbacks = [
            { id: 1, username: "Darius Damman", text: "Hallo zusammen! Wir freuen uns über euer Feedback und eure Verbesserungsvorschläge.", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), likes: [], moderationStatus: 'approved' }
        ];

        let currentUserAiPreference = "Think";

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
        
        let registeredUsers = [
            { username: "MaxMuster", password: "123", firstName: "Max", lastName: "Mustermann", email: "max@beispiel.de", bio: "Ich lese gerne Nachrichten.", profilePicUrl: "", showRealName: true, isBanned: false, isDeleted: false, role: "user" },
            { username: "AnnaAdmin", password: "123", firstName: "Anna", lastName: "Admin", email: "anna.admin@beispiel.de", bio: "Systemadministratorin der Zeitung.", profilePicUrl: "", showRealName: true, isBanned: false, isDeleted: false, role: "admin" },
            { username: "AntonAutor", password: "123", firstName: "Anton", lastName: "Autor", email: "anton.autor@beispiel.de", bio: "Redakteur und leidenschaftlicher Schreiber.", profilePicUrl: "", showRealName: true, isBanned: false, isDeleted: false, role: "author" }
        ]; 
        
        let isSupportChatOpen = false;
        let supportChats = []; 
        let adminSelectedChatId = null;
        
        let isFirebaseConnected = false;
        let firebaseApp = null;
        let firebaseDb = null;
        let firebaseAuth = null;
        let isApplyingRemoteState = false;
        let saveDebounceHandle = null;

        // Firebase Refs
        let articlesDocRef, chatsDocRef, usersDocRef;

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
                role: u.role || "user"
            }));
        }

        async function seedDocIfMissing(docRef, seedData) {
            const snap = await getDoc(docRef);
            if (!snap.exists()) {
                await setDoc(docRef, seedData);
            }
        }

        async function persistRemoteState() {
            if (!isFirebaseConnected || !firebaseDb) return;
            if (isApplyingRemoteState) return;

            const batch = writeBatch(firebaseDb);
            const now = serverTimestamp();

            batch.set(articlesDocRef, {
                articles: articles,
                authors: authors,
                categories: categories,
                communityImages: communityImages,
                siteFeedbacks: siteFeedbacks,
                updatedAt: now
            }, { merge: true });
            
            batch.set(chatsDocRef, { supportChats: supportChats, updatedAt: now }, { merge: true });
            batch.set(usersDocRef, { registeredUsers: sanitizeUsersForRemote(registeredUsers), updatedAt: now }, { merge: true });

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
            try {
                // Konfiguration initialisieren (Umgebung oder lokal)
                const config = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : myFirebaseConfig;
                const envAppId = typeof __app_id !== 'undefined' ? __app_id : 'winterthurtimes-app';

                firebaseApp = initializeApp(config);
                firebaseDb = getFirestore(firebaseApp);
                firebaseAuth = getAuth(firebaseApp);
                
                // MANDAT: Zuerst Auth!
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                } else {
                    await signInAnonymously(firebaseAuth);
                }

                // Dokument-Referenzen (Regel 1 konform)
                articlesDocRef = doc(firebaseDb, 'artifacts', envAppId, 'public', 'data', 'shared_data', 'articles');
                chatsDocRef = doc(firebaseDb, 'artifacts', envAppId, 'public', 'data', 'shared_data', 'chats');
                usersDocRef = doc(firebaseDb, 'artifacts', envAppId, 'public', 'data', 'shared_data', 'users');

                isFirebaseConnected = true;
                window.saveState = scheduleRemoteSave;

                // Initiales Seeding
                await seedDocIfMissing(articlesDocRef, {
                    articles: articles, authors: authors, categories: categories,
                    communityImages: communityImages, siteFeedbacks: siteFeedbacks, updatedAt: serverTimestamp()
                });
                await seedDocIfMissing(chatsDocRef, { supportChats: supportChats, updatedAt: serverTimestamp() });
                await seedDocIfMissing(usersDocRef, { registeredUsers: sanitizeUsersForRemote(registeredUsers), updatedAt: serverTimestamp() });

                // Snapshot Listeners
                onSnapshot(articlesDocRef, (snap) => {
                    if (!snap.exists() || (snap.metadata && snap.metadata.hasPendingWrites)) return;
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
                }, err => console.error(err));

                onSnapshot(chatsDocRef, (snap) => {
                    if (!snap.exists() || (snap.metadata && snap.metadata.hasPendingWrites)) return;
                    const data = snap.data() || {};
                    isApplyingRemoteState = true;
                    if (Array.isArray(data.supportChats)) supportChats = data.supportChats;
                    isApplyingRemoteState = false;
                    renderApp();
                }, err => console.error(err));

                onSnapshot(usersDocRef, (snap) => {
                    if (!snap.exists() || (snap.metadata && snap.metadata.hasPendingWrites)) return;
                    const data = snap.data() || {};
                    isApplyingRemoteState = true;
                    if (Array.isArray(data.registeredUsers)) registeredUsers = data.registeredUsers;
                    isApplyingRemoteState = false;
                    renderApp();
                }, err => console.error(err));

                // Auth Listener
                onAuthStateChanged(firebaseAuth, (user) => {
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
                        const msg = profile.isDeleted ? "Dein Account wurde gelöscht." : "Dein Account wurde gesperrt.";
                        showModal('Zugriff verweigert', msg);
                        signOut(firebaseAuth).catch(() => {});
                        return;
                    }

                    if (!profile) {
                        registeredUsers.push({
                            username: name, firstName: "", lastName: "", email: user.email || "", bio: "",
                            profilePicUrl: "", showRealName: false, isBanned: false, isDeleted: false, role: "user"
                        });
                        window.saveState();
                    }

                    if (pendingChatOpen) { isSupportChatOpen = true; pendingChatOpen = false; }
                    if (pendingView) { setView(pendingView); pendingView = null; } 
                    else { renderApp(); }
                });

                console.log('Firebase erfolgreich verbunden.');
            } catch (err) {
                console.error('Firebase Init fehlgeschlagen:', err);
                isFirebaseConnected = false;
            }
        }

        // --- 3D LOGO INTEGRATION (THREE.JS) ---
        let logoRenderer, logoScene, logoCamera, logoInteractiveGroup, logoGroup;
        let targetRotationX = 0;

        function init3DLogo() {
            if (logoRenderer) return;
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
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xb0b0b0, linewidth: 1, transparent: true, opacity: 0.5 });
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
                "Unterhaltung": "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
                "Panorama": "https://images.unsplash.com/photo-1506744626753-eda818466668?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
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
                clickAttr = `onclick="window.showImageModal('${user.profilePicUrl}')"`;
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

        window.setUserAiPreference = function(pref) {
            currentUserAiPreference = pref;
            renderApp();
        }

        window.rateAiMessage = function(chatId, msgIndex, rating) {
            const chat = supportChats.find(c => c.id === chatId);
            if (chat && chat.messages[msgIndex]) {
                const msg = chat.messages[msgIndex];
                if (msg.rating === rating) msg.rating = null; 
                else msg.rating = rating;
                window.saveState();
                renderApp();
            }
        }

        // --- KI MODERATIONS LOGIK ---
        window.checkContentWithAi = async function(text, type, id, parentId) {
            window.finalizeModeration(type, id, parentId, 'approved');
        };

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
            window.finalizeModeration(type, id, parentId, 'approved');
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
            <div class="bg-black text-white text-xs py-2 px-2 sm:px-4 flex justify-between items-center font-sans tracking-wide">
                <div class="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar whitespace-nowrap hidden md:flex">
                    <span onclick="window.showModal('Abonnements', 'Unsere Abo-Angebote werden derzeit überarbeitet.')" class="cursor-pointer hover:text-gray-300 transition-colors">Abo</span>
                    <span onclick="window.showModal('E-Paper', 'Das E-Paper ist in dieser Demo-Version noch nicht verfügbar.')" class="cursor-pointer hover:text-gray-300 transition-colors">E-Paper</span>
                    <span onclick="window.showModal('Newsletter', 'Die Newsletter sind noch nicht verfügbar.')" class="cursor-pointer hover:text-gray-300 transition-colors">Newsletter</span>
                </div>
                <div class="flex gap-2 sm:gap-4 items-center w-full md:w-auto justify-end flex-wrap">
                    <span onclick="window.setView('gallery'); window.scrollTo(0,0);" class="cursor-pointer text-green-400 font-bold hover:text-green-300 transition-colors flex items-center gap-1 border-r border-gray-600 pr-3 sm:pr-4">
                        <i data-lucide="camera" class="w-3 h-3"></i> <span class="hidden sm:inline">Tagesbilder</span>
                    </span>
                    ${hasAuthorAccess() ? `
                        <span onclick="adminTab='articles'; window.setView('admin-dashboard')" class="cursor-pointer text-blue-400 font-bold hover:text-blue-300 flex items-center gap-1 border-r border-gray-600 pr-3 sm:pr-4">
                            <i data-lucide="${dashboardIcon}" class="w-3 h-3"></i> <span class="hidden sm:inline">${dashboardLabel}</span>
                        </span>
                    ` : ''}
                    ${currentUser ? `
                        <span class="cursor-pointer font-bold text-gray-300 hover:text-white transition-colors flex items-center gap-1 truncate max-w-[100px] sm:max-w-none" onclick="window.setView('profile')" title="Zum Profil"><i data-lucide="user" class="w-3 h-3"></i> ${getDisplayName(currentUser)}</span>
                        <span class="cursor-pointer hover:text-red-300 text-red-400 transition-colors ml-1 sm:ml-2 flex items-center gap-1" onclick="window.handleUserLogout()" title="Abmelden">
                            <i data-lucide="log-out" class="w-3 h-3 md:hidden"></i><span class="hidden md:inline">Abmelden</span>
                        </span>
                    ` : `
                        <span class="cursor-pointer hover:text-gray-300 transition-colors flex items-center gap-1" onclick="window.showUserLogin()">
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
            <header class="border-b border-gray-300 sticky top-0 bg-[#fcfbf9] z-40 shadow-sm">
                <div class="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
                    <div class="flex items-center gap-2 sm:gap-4 w-1/4 sm:w-1/3">
                        <div id="header-3d-logo" class="w-10 h-10 sm:w-16 sm:h-16 shrink-0 cursor-pointer hover:scale-105 transition-transform" onclick="window.setView('home')" title="Zur Startseite"></div>
                        <button onclick="window.toggleMenu()" class="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-700">
                            <i data-lucide="menu" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                        </button>
                        <button onclick="window.toggleSearch()" class="p-2 hover:bg-gray-200 rounded-full transition-colors hidden sm:block cursor-pointer text-gray-700">
                            <i data-lucide="search" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                        </button>
                    </div>
                    <div class="w-2/4 sm:w-1/3 text-center">
                        <h1 onclick="window.setView('home')" class="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase font-serif cursor-pointer hover:text-blue-900 transition-colors leading-none">
                            Winterthur<br class="sm:hidden" /> Times
                        </h1>
                    </div>
                    <div class="w-1/4 sm:w-1/3 flex justify-end items-center gap-3 sm:gap-4 text-xs sm:text-sm font-sans text-gray-600">
                        <button onclick="window.toggleSearch()" class="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer sm:hidden text-gray-700">
                            <i data-lucide="search" class="w-5 h-5"></i>
                        </button>
                        <div class="hidden lg:flex flex-col items-end">
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
                    <div class="max-w-2xl w-full flex flex-col sm:flex-row relative gap-2 sm:gap-0">
                        <input type="text" id="searchInput" value="${searchQuery}" onkeypress="window.handleSearch(event)" placeholder="Nach Artikeln, Stichworten suchen..." class="w-full px-4 py-2 border border-gray-300 sm:rounded-l rounded focus:outline-none focus:border-blue-500 font-sans shadow-sm" />
                        <button onclick="window.executeSearch()" class="bg-blue-900 text-white px-6 py-2 sm:rounded-r rounded font-bold hover:bg-blue-800 transition-colors shadow-sm cursor-pointer w-full sm:w-auto">Suchen</button>
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
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-12">
                    ${images.map(img => {
                        const isLiked = currentUser && img.likes && img.likes.includes(currentUser);
                        return `
                        <div class="relative group cursor-pointer aspect-square bg-gray-100 border border-gray-200 rounded overflow-hidden ${img.isDeleted ? 'opacity-60 grayscale' : ''}" onclick="window.showImageModal('${img.url}')">
                            <img src="${img.url}" alt="Community Bild" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ${img.isDeleted ? '<div class="absolute top-2 left-2 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded z-20 uppercase">Gelöscht</div>' : ''}
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-3 flex items-end justify-between pointer-events-none">
                                <div class="flex items-center gap-2">
                                    ${getUserAvatar(img.uploader, 'w-5 h-5 sm:w-6 sm:h-6', 'w-3 h-3', false)}
                                    <div class="flex flex-col">
                                        <span class="text-white font-bold text-[10px] sm:text-xs line-clamp-1">${getDisplayName(img.uploader)}</span>
                                        <span class="text-gray-300 text-[8px] sm:text-[10px] time-ago-display" data-timestamp="${img.timestamp}">${getTimeAgo(img.timestamp)}</span>
                                    </div>
                                </div>
                                <button onclick="event.stopPropagation(); window.toggleCommunityImageLike(${img.id})" class="pointer-events-auto flex items-center gap-1 ${isLiked ? 'text-red-500' : 'text-white'} hover:scale-110 transition-transform cursor-pointer">
                                    <i data-lucide="heart" class="w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-current text-red-500' : 'drop-shadow-md'}"></i>
                                    <span class="text-[10px] sm:text-xs font-bold drop-shadow-md">${img.likes ? img.likes.length : 0}</span>
                                </button>
                            </div>
                            ${img.isDeleted && isSuperAdmin ? `
                                <button onclick="event.stopPropagation(); window.restoreCommunityImage(${img.id})" class="absolute top-2 right-2 bg-green-600 text-white p-1.5 rounded hover:bg-green-700 shadow z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Bild wiederherstellen"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button>
                            ` : ((hasAdminAccess() || img.uploader === currentUser) && !img.isDeleted) ? `
                                <button onclick="event.stopPropagation(); window.deleteCommunityImage(${img.id})" class="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded hover:bg-red-700 shadow z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Bild löschen"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            ` : ''}
                        </div>
                    `;
                    }).join('')}
                </div>`;
            };

            return `
            <div class="max-w-6xl mx-auto mt-4 font-sans mb-16 px-4 xl:px-0">
                <button onclick="window.setView('home')" class="flex items-center gap-2 text-blue-600 font-bold text-sm mb-6 hover:underline cursor-pointer">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
                </button>
                
                <div class="mb-8">
                    <h2 class="text-3xl sm:text-4xl md:text-5xl font-black uppercase font-serif mb-2 tracking-tighter">Tagesbilder</h2>
                    <p class="text-gray-600 text-sm sm:text-base">Teile Momente aus Winterthur mit der Community. Bilder verschwinden automatisch nach exakt 24 Stunden.</p>
                </div>

                <div class="bg-white p-4 sm:p-6 md:p-8 border border-gray-200 shadow-sm rounded-sm mb-12">
                    ${currentUser ? `
                        <h4 class="font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2 border-b pb-2"><i data-lucide="upload-cloud" class="w-5 h-5 text-blue-600"></i> Eigenes Bild teilen</h4>
                        <div class="flex flex-col md:flex-row gap-4 sm:gap-6">
                            <div class="flex-1 bg-gray-50 p-4 sm:p-5 border border-gray-200 rounded">
                                <label class="block text-sm font-bold text-gray-700 mb-2 sm:mb-3"><i data-lucide="monitor-up" class="inline w-4 h-4 mr-1"></i> Vom Gerät hochladen</label>
                                <input type="file" id="communityImgFile" accept="image/*" class="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded px-2 sm:px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer" />
                            </div>
                            <div class="flex items-center justify-center py-2 md:py-0">
                                <span class="text-gray-400 font-black uppercase text-xs tracking-wider bg-white px-2">ODER</span>
                            </div>
                            <div class="flex-1 bg-gray-50 p-4 sm:p-5 border border-gray-200 rounded">
                                <label class="block text-sm font-bold text-gray-700 mb-2 sm:mb-3"><i data-lucide="link" class="inline w-4 h-4 mr-1"></i> Bild-URL einfügen</label>
                                <input type="url" id="communityImgUrl" placeholder="https://beispiel.de/bild.jpg" class="w-full text-sm bg-white border border-gray-300 rounded px-4 py-2 focus:border-blue-500 focus:outline-none" />
                            </div>
                        </div>
                        <div class="mt-6 flex justify-end">
                            <button onclick="window.handleCommunityUpload()" class="w-full md:w-auto bg-blue-900 text-white font-bold px-8 py-3 rounded hover:bg-blue-800 transition-colors shadow-sm cursor-pointer flex justify-center items-center gap-2">
                                Bild veröffentlichen <i data-lucide="send" class="w-4 h-4"></i>
                            </button>
                        </div>
                    ` : `
                        <div class="bg-blue-50 p-4 rounded border border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div class="flex items-center gap-3 text-blue-900">
                                <i data-lucide="info" class="w-6 h-6"></i>
                                <span class="text-sm font-bold">Logge dich ein, um eigene Bilder mit der Community zu teilen!</span>
                            </div>
                            <button onclick="window.showUserLogin()" class="w-full sm:w-auto bg-blue-900 text-white px-6 py-2 rounded font-bold hover:bg-blue-800 transition-colors whitespace-nowrap cursor-pointer">Anmelden</button>
                        </div>
                    `}
                </div>

                <div>
                    <h3 class="text-xl sm:text-2xl font-black uppercase border-b-2 border-black pb-2 mb-6 inline-block">Heute</h3>
                    ${renderImageGrid(heuteImages)}

                    <h3 class="text-xl sm:text-2xl font-black uppercase border-b-2 border-gray-400 text-gray-600 pb-2 mb-6 inline-block">Gestern</h3>
                    ${renderImageGrid(gesternImages)}
                </div>
            </div>`;
        }

        function renderFeedbackChat() {
            const isAdmin = hasAdminAccess();
            
            return `
            <div class="max-w-4xl mx-auto bg-white p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100 min-h-[70vh] font-sans flex flex-col mt-4 mb-16 mx-4 sm:mx-auto">
                <div class="mb-4 sm:mb-6 border-b border-gray-200 pb-4">
                    <button onclick="window.setView('home')" class="flex items-center gap-2 text-blue-600 font-bold text-sm mb-4 hover:underline cursor-pointer">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
                    </button>
                    <h2 class="text-2xl sm:text-3xl font-black uppercase flex items-center gap-3 text-gray-800">
                        <i data-lucide="message-square-plus" class="w-6 h-6 sm:w-8 sm:h-8 text-blue-600"></i> Website bewerten
                    </h2>
                    <p class="text-gray-600 text-sm sm:text-base mt-2">Wir entwickeln uns ständig weiter. Was gefällt dir an der Zeitung? Welche Funktionen fehlen dir noch?</p>
                </div>
                
                <div class="flex-1 overflow-y-auto flex flex-col gap-4 mb-4 pr-1 sm:pr-2 bg-gray-50 p-3 sm:p-4 rounded border border-gray-200" id="feedbackContainer" style="max-height: 50vh;">
                    ${siteFeedbacks.map(f => {
                        const isLiked = currentUser && f.likes && f.likes.includes(currentUser);
                        const isAuthor = currentUser === f.username;
                        const status = f.moderationStatus || 'approved';
                        
                        if (status !== 'approved' && !isAuthor && !isAdmin) return '';

                        let modBadge = '';
                        if (status === 'checking') modBadge = '<span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold animate-pulse ml-2">KI prüft...</span>';
                        else if (status === 'pending') modBadge = '<span class="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold ml-2">Wartet auf Freigabe</span>';

                        return `
                        <div class="flex gap-2 sm:gap-3 ${f.username === currentUser ? 'flex-row-reverse' : ''}">
                            ${getUserAvatar(f.username, 'w-8 h-8 sm:w-10 sm:h-10', 'w-4 h-4', true)}
                            <div class="max-w-[85%] rounded-lg p-3 ${f.username === currentUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-300 text-gray-800 rounded-tl-none'} shadow-sm ${status === 'pending' ? 'border-orange-400 opacity-90' : ''}">
                                <div class="flex items-center gap-2 mb-1 ${f.username === currentUser ? 'justify-end' : ''} flex-wrap">
                                    <span class="font-bold text-xs ${f.username === currentUser ? 'text-blue-200' : 'text-blue-900'}">${getDisplayName(f.username)}</span>
                                    ${modBadge}
                                    <span class="text-[10px] ${f.username === currentUser ? 'text-blue-300' : 'text-gray-400'}">${new Date(f.timestamp).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p class="text-sm leading-relaxed">${f.text}</p>
                                
                                <div class="mt-2 flex flex-col md:flex-row items-start md:items-center justify-between border-t ${f.username === currentUser ? 'border-blue-500/50' : 'border-gray-100'} pt-1.5 gap-2">
                                    <button onclick="window.toggleFeedbackLike(${f.id})" class="flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer ${isLiked ? (f.username === currentUser ? 'text-white' : 'text-red-500') : (f.username === currentUser ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-red-500')}">
                                        <i data-lucide="heart" class="w-3 h-3 ${isLiked ? 'fill-current' : ''}"></i> ${f.likes ? f.likes.length : 0} Likes
                                    </button>
                                    
                                    <div class="flex items-center gap-2">
                                        ${status === 'pending' && isAdmin ? `
                                            <button onclick="window.adminApproveContent('feedback', ${f.id}, null)" class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold hover:bg-green-200 transition-colors">Erlauben</button>
                                            <button onclick="window.adminRejectContent('feedback', ${f.id}, null)" class="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold hover:bg-red-200 transition-colors">Löschen</button>
                                        ` : ''}

                                        ${isAdmin || f.username === currentUser ? `
                                            <button onclick="window.deleteFeedback(${f.id})" class="text-[10px] transition-colors cursor-pointer flex items-center gap-1 ${f.username === currentUser ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-red-500'}">
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
                    <input type="text" id="feedbackInput" placeholder="Dein Feedback oder Verbesserungsvorschlag..." class="flex-1 border border-gray-300 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" onkeypress="if(event.key === 'Enter') window.sendFeedback()" />
                    <button onclick="window.sendFeedback()" class="w-full md:w-auto bg-blue-900 text-white px-6 py-2.5 rounded font-bold hover:bg-blue-800 transition-colors text-sm flex justify-center items-center gap-2 cursor-pointer shadow-sm">
                        Senden <i data-lucide="send" class="w-4 h-4"></i>
                    </button>
                </div>
                ` : `
                <div class="pt-4 border-t border-gray-200 flex flex-col items-center justify-center bg-blue-50 p-6 rounded mt-2 border border-blue-100">
                    <p class="text-gray-700 font-bold mb-3 text-center text-sm sm:text-base">Möchtest du uns auch bewerten oder einen Vorschlag machen?</p>
                    <button onclick="pendingView='feedback'; window.showUserLogin()" class="w-full sm:w-auto bg-blue-900 text-white font-bold py-2 px-6 rounded hover:bg-blue-800 transition-colors cursor-pointer text-sm shadow-sm">Jetzt einloggen</button>
                </div>
                `}
            </div>
            `;
        }

        function renderHome() {
            if (articles.length === 0) return '<div>Keine Artikel vorhanden.</div>';
            
            const now = new Date();
            const currentArticles = hasAuthorAccess() ? articles : articles.filter(a => !a.autoDeleteDate || new Date(a.autoDeleteDate) > now);

            if (currentArticles.length === 0) return '<div class="text-center py-12 text-gray-500 font-sans">Derzeit gibt es keine sichtbaren Artikel.</div>';
            
            const topStory = currentArticles[0];
            const mainArticles = currentArticles.slice(1, 4);
            const trendingArticles = [...currentArticles].sort((a, b) => b.views.length - a.views.length).slice(0, 5);

            let html = `<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"><div class="lg:col-span-8 flex flex-col gap-8">`;

            if (topStory) {
                const isLiked = currentUser && topStory.likes.includes(currentUser);
                const isEilmeldung = topStory.isEilmeldung && ((new Date() - new Date(topStory.timestamp)) / 3600000 <= 24);
                const displayImage = topStory.imageUrl || getFallbackImage(topStory.category);
                
                html += `
                <article onclick="window.openArticle(${topStory.id})" class="group cursor-pointer">
                    <div class="relative overflow-hidden mb-4 rounded-sm">
                        <img src="${displayImage}" alt="${topStory.title}" class="w-full h-48 sm:h-64 md:h-[400px] object-cover group-hover:scale-105 transition-transform duration-500" />
                        ${isEilmeldung ? '<div class="absolute top-2 left-2 sm:top-4 sm:left-4 bg-red-600 text-white text-[10px] sm:text-xs font-bold uppercase px-2 py-1 font-sans shadow-md animate-pulse">Eilmeldung</div>' : ''}
                    </div>
                    <div class="flex flex-col gap-2 px-1 sm:px-0">
                        <span class="text-blue-700 font-bold text-xs sm:text-sm uppercase font-sans tracking-wide flex justify-between">
                            ${topStory.category}
                            <span class="flex items-center gap-3 text-gray-500">
                                <span class="flex items-center gap-1"><i data-lucide="eye" class="w-3 h-3 sm:w-4 sm:h-4"></i> ${topStory.views.length}</span>
                                <span class="flex items-center gap-1 text-red-500"><i data-lucide="heart" class="w-3 h-3 sm:w-4 sm:h-4 ${isLiked ? 'fill-current' : ''}"></i> ${topStory.likes.length}</span>
                            </span>
                        </span>
                        <h2 class="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight group-hover:text-blue-700 transition-colors">${topStory.title}</h2>
                        <p class="text-base sm:text-lg text-gray-700 leading-relaxed mt-2">${topStory.summary}</p>
                        <div class="text-xs sm:text-sm text-gray-500 font-sans mt-2 flex items-center gap-2">
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
                <article onclick="window.openArticle(${article.id})" class="group cursor-pointer flex flex-col gap-3 px-1 sm:px-0">
                    <div class="relative overflow-hidden h-40 sm:h-48 rounded-sm">
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
                    <h3 class="text-lg sm:text-xl font-bold leading-snug group-hover:text-blue-700 transition-colors">${article.title}</h3>
                    <p class="text-sm text-gray-600 line-clamp-3">${article.summary}</p>
                </article>`;
            });

            html += `</div></div>`;

            html += `
            <aside class="lg:col-span-4 flex flex-col gap-6 lg:gap-8 px-1 sm:px-0">
                <div onclick="window.setView('gallery'); window.scrollTo(0,0);" class="bg-gradient-to-br from-green-50 to-green-100 p-6 border border-green-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden rounded-sm">
                    <i data-lucide="camera" class="w-16 h-16 text-green-200 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform"></i>
                    <h3 class="text-xl font-black uppercase mb-2 text-green-900 flex items-center gap-2">Tagesbilder</h3>
                    <p class="text-sm text-green-800 mb-4 relative z-10 font-sans">Entdecke die neuesten Bilder aus unserer Community von heute!</p>
                    <span class="text-sm font-bold text-green-700 flex items-center gap-1 group-hover:text-green-900 transition-colors relative z-10">Zur Galerie <i data-lucide="arrow-right" class="w-4 h-4"></i></span>
                </div>

                <div class="bg-white p-5 sm:p-6 border border-gray-200 shadow-sm">
                    <h3 class="text-lg sm:text-xl font-black uppercase mb-4 pb-2 border-b-2 border-black font-sans flex items-center gap-2">
                        <span class="w-2 h-2 sm:w-3 sm:h-3 bg-red-600 rounded-full inline-block animate-pulse"></span>
                        Meistgelesen
                    </h3>
                    <ul class="flex flex-col gap-4">
                        ${trendingArticles.map((story, i) => `
                            <li onclick="window.openArticle(${story.id})" class="flex gap-3 sm:gap-4 group cursor-pointer">
                                <span class="text-2xl sm:text-3xl font-black text-gray-200 group-hover:text-blue-600 transition-colors font-sans">${i + 1}</span>
                                <h4 class="meistgelesen-item font-bold text-sm sm:text-base group-hover:text-blue-600 transition-colors mt-1 line-clamp-2">${story.title}</h4>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="bg-blue-50 p-5 sm:p-6 border border-blue-100 text-center rounded-sm">
                    <i data-lucide="mail" class="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-3"></i>
                    <h3 class="text-lg sm:text-xl font-bold mb-2">Das Wichtigste am Morgen</h3>
                    <p class="text-xs sm:text-sm text-gray-600 mb-4 font-sans">Melden Sie sich für unseren kostenlosen täglichen Newsletter an.</p>
                    <div class="flex flex-col gap-2 font-sans">
                        <input type="email" placeholder="Ihre E-Mail Adresse" class="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm" />
                        <button onclick="window.showModal('Newsletter abonniert!', 'Vielen Dank für Ihre Anmeldung. Sie erhalten in Kürze eine Bestätigungs-E-Mail.')" class="bg-black text-white px-4 py-2 rounded font-bold hover:bg-gray-800 transition-colors text-sm">Jetzt abonnieren</button>
                    </div>
                </div>
            </aside></div>`;

            return html;
        }

        function renderArticle() {
            const article = articles.find(a => a.id === selectedArticleId);
            if (!article) return '';
            
            if (!hasAuthorAccess() && article.autoDeleteDate && new Date(article.autoDeleteDate) <= new Date()) {
                return `
                <div class="max-w-4xl mx-auto bg-white p-8 sm:p-12 mt-8 shadow-sm border border-gray-100 text-center font-sans">
                    <button onclick="window.setView('home')" class="flex items-center justify-center gap-2 text-blue-600 font-bold text-sm mb-6 hover:underline cursor-pointer mx-auto">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
                    </button>
                    <i data-lucide="clock" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                    <h2 class="text-xl sm:text-2xl font-black text-gray-700 mb-2">Artikel nicht mehr verfügbar</h2>
                    <p class="text-gray-500 text-sm sm:text-base">Das Löschungsdatum dieses Artikels ist abgelaufen. Er wurde in das Archiv verschoben.</p>
                </div>`;
            }

            const isLiked = currentUser && article.likes.includes(currentUser);
            const isAdmin = hasAdminAccess();
            const activeComments = isAdmin ? article.comments : article.comments.filter(c => !c.isDeleted || c.username === currentUser);
            const authorData = getActiveAuthors().find(a => a.name === article.author);
            
            const displayImage = article.imageUrl || getFallbackImage(article.category);

            return `
            <article class="max-w-4xl mx-auto bg-white p-4 sm:p-8 md:p-12 shadow-sm border border-gray-100">
                <button onclick="window.setView('home')" class="flex items-center gap-2 text-blue-600 font-sans font-bold text-sm mb-6 sm:mb-8 hover:underline cursor-pointer">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
                </button>
                <span class="text-blue-700 font-bold text-xs sm:text-sm uppercase font-sans tracking-wide cursor-pointer hover:underline" onclick="window.executeSearchCategory('${article.category}')">${article.category}</span>
                <h1 class="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mt-3 sm:mt-4 mb-4 sm:mb-6 break-words">${article.title}</h1>
                
                <div class="flex flex-col sm:flex-row sm:items-center justify-between border-y border-gray-200 py-3 sm:py-4 mb-6 sm:mb-8 font-sans text-sm text-gray-600 gap-4">
                    <div class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" onclick="window.setView('authors'); window.scrollTo(0,0);" title="Mehr über den Autor erfahren">
                        ${authorData && authorData.imageUrl ? `
                            <img src="${authorData.imageUrl}" class="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" onerror="this.outerHTML='${getStandardAvatarHtml('w-8 h-8', 'w-4 h-4').replace(/'/g, "\\'").replace(/"/g, '&quot;')}'" />
                        ` : getStandardAvatarHtml('w-8 h-8', 'w-4 h-4')}
                        <div>
                            <span class="font-bold text-gray-900 block text-xs sm:text-sm">${article.author}</span>
                            <span class="text-[10px] sm:text-xs text-gray-500 time-ago-display" data-timestamp="${article.timestamp}">${getTimeAgo(article.timestamp)}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end">
                        <span class="flex items-center gap-2" title="Aufrufe">
                            <i data-lucide="eye" class="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"></i>
                            <span class="font-bold">${article.views.length}</span>
                        </span>
                        <button onclick="window.toggleLike(${article.id})" class="flex items-center gap-2 px-3 py-1 rounded-full transition-colors border cursor-pointer ${isLiked ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 hover:bg-gray-50'} w-full sm:w-auto justify-center">
                            <i data-lucide="heart" class="w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-current text-red-500' : 'text-gray-400'}"></i>
                            <span class="font-bold">${article.likes.length} Likes</span>
                        </button>
                    </div>
                </div>

                <p class="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 leading-relaxed mb-6 sm:mb-8">${article.summary}</p>
                
                <img src="${displayImage}" alt="Artikelbild" class="w-[calc(100%+2rem)] -mx-4 sm:w-full sm:mx-0 sm:rounded-sm h-auto max-h-[300px] sm:max-h-[400px] md:max-h-[600px] object-cover mb-6 sm:mb-8 shadow-sm" />
                
                <div class="prose prose-base sm:prose-lg max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">${article.content || "Kein weiterer Text verfügbar."}</div>
                
                ${article.sources && article.sources.length > 0 ? `
                <div class="mt-8 sm:mt-12 p-4 sm:p-6 bg-gray-50 border border-gray-200 rounded-sm font-sans">
                    <h4 class="font-bold text-gray-800 mb-3 flex items-center gap-2"><i data-lucide="link" class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"></i> Quellen & Weiterführende Links</h4>
                    <ul class="flex flex-col gap-2">
                        ${article.sources.map(src => `
                            <li><a href="${src}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-xs sm:text-sm break-all"><i data-lucide="external-link" class="w-3 h-3 shrink-0"></i> ${src}</a></li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}

                <div class="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-gray-200 font-sans">
                    <h3 class="text-xl sm:text-2xl font-black mb-6">Kommentare (${activeComments.length})</h3>
                    
                    <div class="flex flex-col gap-4 sm:gap-6 mb-8">
                        ${activeComments.length === 0 ? '<p class="text-gray-500 italic text-sm sm:text-base">Noch keine Kommentare vorhanden. Sei der Erste!</p>' : ''}
                        
                        ${activeComments.map(c => {
                            const isCommentLiked = currentUser && c.likes.includes(currentUser);
                            const hasReported = currentUser && c.reportedBy && c.reportedBy.includes(currentUser);
                            const isAuthor = currentUser === c.username;
                            const status = c.moderationStatus || 'approved';
                            
                            if (status !== 'approved' && !isAuthor && !isAdmin) return '';

                            let modBadge = '';
                            if (status === 'checking') modBadge = '<span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold animate-pulse ml-2">KI prüft...</span>';
                            else if (status === 'pending') modBadge = '<span class="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold ml-2">Wartet auf Freigabe</span>';
                            else if (status === 'rejected') modBadge = '<span class="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold ml-2">Abgelehnt</span>';

                            return `
                            <div class="bg-gray-50 p-3 sm:p-4 rounded border border-gray-100 relative ${c.isDeleted || status === 'pending' ? 'opacity-70 bg-orange-50' : ''}">
                                ${c.isDeleted ? `<div class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">${isAdmin ? 'Gelöscht' : 'Gelöscht (Nur für dich sichtbar)'}</div>` : ''}
                                
                                <div class="flex gap-3 sm:gap-4">
                                    ${getUserAvatar(c.username, 'w-8 h-8 sm:w-10 sm:h-10', 'w-4 h-4 sm:w-5 sm:h-5', true)}
                                    <div class="flex-1">
                                        <div class="flex flex-wrap gap-2 items-center mb-1">
                                            <span class="font-bold text-sm text-blue-900">${getDisplayName(c.username)}</span>
                                            ${modBadge}
                                            <span class="text-[10px] sm:text-xs text-gray-400 ml-auto time-ago-display" data-timestamp="${c.timestamp}">${getTimeAgo(c.timestamp)}</span>
                                        </div>
                                        <p class="text-sm sm:text-base text-gray-800 leading-relaxed mb-3">${c.text}</p>
                                        
                                        <div class="flex flex-wrap gap-3 sm:gap-4 items-center text-xs sm:text-sm">
                                            <button onclick="window.toggleCommentLike(${article.id}, ${c.id})" class="flex items-center gap-1 ${isCommentLiked ? 'text-red-500 font-bold' : 'text-gray-500 hover:text-gray-800'} transition-colors cursor-pointer">
                                                <i data-lucide="heart" class="w-3 h-3 sm:w-4 sm:h-4 ${isCommentLiked ? 'fill-current' : ''}"></i> ${c.likes.length}
                                            </button>
                                            
                                            ${!c.isDeleted && status === 'approved' && !isAuthor && !isAdmin ? `
                                                <button onclick="window.reportComment(${article.id}, ${c.id})" class="flex items-center gap-1 ${hasReported ? 'text-orange-500 font-bold' : 'text-gray-400 hover:text-orange-500'} transition-colors cursor-pointer" title="${hasReported ? 'Du hast diesen Kommentar gemeldet' : 'Kommentar an Moderation melden'}">
                                                    <i data-lucide="flag" class="w-3 h-3 sm:w-4 sm:h-4 ${hasReported ? 'fill-current' : ''}"></i> Melden
                                                </button>
                                            ` : ''}

                                            ${status === 'pending' && isAdmin ? `
                                                <button onclick="window.adminApproveContent('comment', ${c.id}, ${article.id})" class="text-green-600 hover:text-green-700 font-bold flex items-center gap-1"><i data-lucide="check" class="w-3 h-3 sm:w-4 sm:h-4"></i> Zulassen</button>
                                                <button onclick="window.adminRejectContent('comment', ${c.id}, ${article.id})" class="text-red-500 hover:text-red-700 font-bold flex items-center gap-1"><i data-lucide="x" class="w-3 h-3 sm:w-4 sm:h-4"></i> Ablehnen</button>
                                            ` : ''}

                                            ${(isAuthor || isAdmin) ? (
                                                c.isDeleted ? (
                                                    (isAdmin || c.deletedBy !== 'admin') ? `
                                                        <button onclick="window.restoreComment(${article.id}, ${c.id})" class="flex items-center gap-1 text-green-600 hover:text-green-700 font-bold transition-colors cursor-pointer">
                                                            <i data-lucide="refresh-cw" class="w-3 h-3 sm:w-4 sm:h-4"></i> Wiederherstellen
                                                        </button>
                                                    ` : `<span class="text-red-500 text-[10px] font-bold flex items-center gap-1" title="Dieser Kommentar wurde von der Moderation gelöscht"><i data-lucide="shield-alert" class="w-3 h-3"></i> Vom Admin entfernt</span>`
                                                ) : `
                                                    <button onclick="window.deleteComment(${article.id}, ${c.id})" class="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                                                        <i data-lucide="trash-2" class="w-3 h-3 sm:w-4 sm:h-4"></i> Löschen
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
                        <div class="flex flex-col gap-3 bg-white border border-gray-200 p-3 sm:p-4 rounded shadow-sm">
                            <label class="font-bold text-sm text-gray-700 flex items-center gap-2">
                                ${getUserAvatar(currentUser, 'w-5 h-5 sm:w-6 sm:h-6', 'w-3 h-3', false)}
                                <span class="truncate">Dein Kommentar als <span class="text-blue-600">${getDisplayName(currentUser)}</span></span>
                            </label>
                            <textarea id="newCommentText" rows="3" class="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500" placeholder="Schreibe einen konstruktiven Kommentar..."></textarea>
                            <button onclick="window.submitComment(${article.id})" class="w-full sm:w-auto bg-blue-900 text-white font-bold py-2 px-6 rounded hover:bg-blue-800 transition-colors self-start cursor-pointer">Kommentieren</button>
                        </div>
                    ` : `
                        <div class="bg-blue-50 p-4 sm:p-6 rounded border border-blue-100 text-center">
                            <p class="text-gray-700 font-bold mb-3 text-sm sm:text-base">Du möchtest mitdiskutieren?</p>
                            <button onclick="window.showUserLogin()" class="w-full sm:w-auto bg-blue-900 text-white font-bold py-2 px-6 rounded hover:bg-blue-800 transition-colors cursor-pointer text-sm">Jetzt einloggen</button>
                        </div>
                    `}
                </div>
            </article>`;
        }

        function renderAuthors() {
            const activeAuthorsList = getActiveAuthors();
            return `
            <div class="max-w-5xl mx-auto bg-white p-4 sm:p-8 md:p-12 shadow-sm border border-gray-100 min-h-[50vh] font-sans">
                <button onclick="window.setView('home')" class="flex items-center gap-2 text-blue-600 font-sans font-bold text-sm mb-6 hover:underline cursor-pointer">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
                </button>
                <h2 class="text-3xl sm:text-4xl font-black mb-6 sm:mb-8 border-b-2 border-black pb-4 uppercase tracking-tighter">Unsere Redaktion</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    ${activeAuthorsList.map(author => `
                        <div class="flex flex-col sm:flex-row gap-4 border border-gray-200 p-4 sm:p-6 rounded-sm bg-gray-50 items-start hover:shadow-md transition-shadow">
                            ${author.imageUrl ? `
                                <img src="${author.imageUrl}" alt="${author.name}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white shadow-sm shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onclick="window.showImageModal('${author.imageUrl}')" onerror="this.outerHTML='${getStandardAvatarHtml('w-16 h-16 sm:w-20 sm:h-20', 'w-8 h-8 sm:w-10 sm:h-10').replace(/'/g, "\\'").replace(/"/g, '&quot;')}'" />
                            ` : getStandardAvatarHtml('w-16 h-16 sm:w-20 sm:h-20', 'w-8 h-8 sm:w-10 sm:h-10')}
                            <div>
                                <h3 class="text-xl sm:text-2xl font-bold text-blue-900 mb-2">${author.name}</h3>
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
                window.setView('home');
                return '';
            }
            
            const user = registeredUsers.find(u => u.username === currentUser);
            if (!user) return '';

            const likedArticles = articles.filter(a => a.likes.includes(currentUser));
            const viewedArticles = articles.filter(a => a.views.includes(currentUser));
            const isBase64 = user.profilePicUrl && user.profilePicUrl.startsWith('data:image');
            const urlValue = isBase64 ? '' : (user.profilePicUrl || '');
            
            return `
            <div class="max-w-4xl mx-auto mt-4 sm:mt-8 font-sans mb-16 px-2 sm:px-0">
                <button onclick="window.setView('home')" class="flex items-center gap-2 text-blue-600 font-sans font-bold text-sm mb-4 sm:mb-6 hover:underline cursor-pointer px-2 lg:px-0">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
                </button>
                
                <div class="bg-white p-4 sm:p-8 border border-gray-200 shadow-sm rounded-sm">
                    <div class="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 border-b border-gray-200 text-center md:text-left">
                        <div class="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0">
                            ${getUserAvatar(currentUser, 'w-24 h-24 sm:w-32 sm:h-32', 'w-12 h-12 sm:w-16 sm:h-16', true)}
                            ${user.profilePicUrl ? '<div class="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow pointer-events-none" title="Klicken für Vollbild"><i data-lucide="zoom-in" class="w-3 h-3 sm:w-4 sm:h-4"></i></div>' : ''}
                        </div>
                        <div class="flex-1 w-full">
                            <h2 class="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight truncate">${getDisplayName(currentUser)}</h2>
                            <p class="text-gray-500 mb-2 text-sm sm:text-base">Dein persönliches Leser-Profil</p>
                            <span class="bg-blue-100 text-blue-800 text-[10px] sm:text-xs px-2 py-1 rounded uppercase font-bold tracking-wider inline-block">Rolle: ${user.role}</span>
                        </div>
                    </div>
                    
                    <div class="flex flex-col gap-5 sm:gap-6">
                        <div class="bg-blue-50 p-3 sm:p-4 rounded text-xs sm:text-sm text-gray-700 flex items-start gap-3">
                            <i data-lucide="info" class="w-5 h-5 text-blue-600 shrink-0"></i>
                            <p>Hier kannst du dein Profilbild anpassen und entscheiden, ob andere deinen echten Namen oder nur deinen Benutzernamen sehen sollen. Klicke auf dein Bild, um es groß anzusehen!</p>
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">Benutzername</label>
                            <input type="text" id="profileUsername" value="${user.username}" class="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white text-sm sm:text-base" />
                            <p class="text-xs text-gray-500 mt-1">Wenn du deinen Namen änderst, wird dieser auch bei all deinen bisherigen Kommentaren und Likes aktualisiert.</p>
                        </div>

                        <div class="pt-4 border-t border-gray-200 mt-2">
                            <h4 class="font-bold text-gray-700 mb-3 sm:mb-4">Passwort ändern (optional)</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label class="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2">Neues Passwort</label>
                                    <input type="password" id="profileNewPassword" placeholder="Neues Passwort..." class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white text-sm" />
                                </div>
                                <div>
                                    <label class="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2">Neues Passwort bestätigen</label>
                                    <input type="password" id="profileConfirmPassword" placeholder="Passwort wiederholen..." class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white text-sm" />
                                </div>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">Lass diese Felder leer, wenn du dein aktuelles Passwort behalten möchtest.</p>
                        </div>

                        <div class="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                            <input type="checkbox" id="profileShowRealName" ${user.showRealName ? 'checked' : ''} class="w-5 h-5 cursor-pointer text-blue-600 rounded shrink-0" />
                            <label for="profileShowRealName" class="font-bold text-gray-700 cursor-pointer text-xs sm:text-sm">Zeige meinen Vor- und Nachnamen anstelle des Benutzernamens</label>
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">Profilbild</label>
                            <div class="flex flex-col gap-3 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded">
                                <div>
                                    <label class="text-[10px] sm:text-xs text-gray-500 font-bold uppercase mb-1 block">Vom Gerät hochladen</label>
                                    <input type="file" id="profilePicFile" accept="image/*" class="w-full px-2 py-2 sm:px-3 border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm" />
                                </div>
                                <div class="flex items-center gap-2">
                                    <hr class="flex-1 border-gray-300"><span class="text-[10px] text-gray-400 font-bold uppercase">oder</span><hr class="flex-1 border-gray-300">
                                </div>
                                <div>
                                    <label class="text-[10px] sm:text-xs text-gray-500 font-bold uppercase mb-1 block">Bild-URL eingeben</label>
                                    <input type="url" id="profilePicUrl" value="${urlValue}" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white text-xs sm:text-sm" placeholder="${isBase64 ? 'Eigenes Bild hochgeladen. Neue URL eingeben zum Ersetzen...' : 'https://beispiel.de/mein-bild.jpg'}" />
                                </div>
                                ${user.profilePicUrl ? `
                                <button onclick="window.clearProfilePic()" class="text-xs bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 font-bold self-start mt-1 transition-colors cursor-pointer w-full sm:w-auto">Aktuelles Bild entfernen</button>
                                ` : ''}
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">Über mich (Bio)</label>
                            <textarea id="profileBio" rows="4" class="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm sm:text-base" placeholder="Schreibe etwas über dich...">${user.bio || ''}</textarea>
                        </div>
                        
                        <button onclick="window.saveProfile()" class="bg-blue-900 text-white font-bold py-3 px-4 rounded hover:bg-blue-800 transition-colors mt-2 cursor-pointer flex justify-center items-center gap-2 md:w-1/2 w-full">
                            <i data-lucide="save" class="w-4 h-4 sm:w-5 sm:h-5"></i> Profil speichern
                        </button>
                        
                        <div class="mt-4 pt-4 sm:pt-6 border-t border-red-200">
                            <h4 class="text-red-600 font-bold mb-2 text-sm sm:text-base">Gefahrenzone</h4>
                            <button onclick="window.confirmDeleteOwnAccount()" class="bg-white w-full sm:w-auto border border-red-300 text-red-600 font-bold py-2 px-4 rounded hover:bg-red-50 transition-colors text-sm cursor-pointer">Mein Konto dauerhaft löschen</button>
                        </div>
                    </div>
                </div>

                <div class="mt-6 sm:mt-8 bg-white p-4 sm:p-8 border border-gray-200 shadow-sm rounded-sm">
                    <h3 class="text-xl sm:text-2xl font-black uppercase mb-4 sm:mb-6 border-b pb-2">Meine Aktivitäten</h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            <h4 class="font-bold flex items-center gap-2 mb-3 text-gray-700 text-sm sm:text-base"><i data-lucide="heart" class="w-4 h-4 text-red-500"></i> Gefällt mir (${likedArticles.length})</h4>
                            <ul class="flex flex-col gap-2">
                                ${likedArticles.length === 0 ? '<li class="text-gray-500 text-xs sm:text-sm italic">Noch keine Artikel gelikt.</li>' : likedArticles.map(a => `
                                    <li><button onclick="window.openArticle(${a.id})" class="text-left text-xs sm:text-sm text-blue-700 hover:underline line-clamp-1">${a.title}</button></li>
                                `).join('')}
                            </ul>
                        </div>
                        <div>
                            <h4 class="font-bold flex items-center gap-2 mb-3 text-gray-700 text-sm sm:text-base"><i data-lucide="eye" class="w-4 h-4 text-blue-500"></i> Zuletzt gelesen (${viewedArticles.length})</h4>
                            <ul class="flex flex-col gap-2">
                                ${viewedArticles.length === 0 ? '<li class="text-gray-500 text-xs sm:text-sm italic">Noch keine Artikel gelesen.</li>' : viewedArticles.map(a => `
                                    <li><button onclick="window.openArticle(${a.id})" class="text-left text-xs sm:text-sm text-blue-700 hover:underline line-clamp-1">${a.title}</button></li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        function renderSearchResults() {
            const now = new Date();
            const currentArticles = hasAuthorAccess() ? articles : articles.filter(a => !a.autoDeleteDate || new Date(a.autoDeleteDate) > now);
            
            let results = [];
            let titleHtml = "";

            if (searchCategory) {
                results = currentArticles.filter(a => a.category === searchCategory);
                titleHtml = `Ressort: ${searchCategory}`;
            } else {
                const query = searchQuery.toLowerCase();
                results = currentArticles.filter(a => 
                    a.title.toLowerCase().includes(query) || 
                    a.summary.toLowerCase().includes(query) || 
                    a.category.toLowerCase().includes(query)
                );
                titleHtml = `Suchergebnisse für "${searchQuery}"`;
            }

            let html = `
            <div class="max-w-4xl mx-auto bg-white p-4 sm:p-8 md:p-12 shadow-sm border border-gray-100 min-h-[50vh]">
                <button onclick="window.setView('home'); isSearchOpen = false; renderApp();" class="flex items-center gap-2 text-blue-600 font-sans font-bold text-sm mb-4 sm:mb-6 hover:underline cursor-pointer">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Startseite
                </button>
                <h2 class="text-2xl sm:text-3xl font-black mb-2">${titleHtml}</h2>
                <p class="mb-6 sm:mb-8 text-gray-600 font-sans font-bold text-sm sm:text-base">${results.length} Artikel in dieser Ansicht</p>
                <div class="flex flex-col gap-6 sm:gap-8">
            `;

            if (results.length === 0) {
                html += `<p class="text-base sm:text-lg text-gray-700">Leider wurden keine passenden Artikel gefunden.</p>`;
            } else {
                results.forEach(article => {
                    const displayImage = article.imageUrl || getFallbackImage(article.category);
                    html += `
                    <article onclick="window.openArticle(${article.id})" class="group cursor-pointer flex flex-col md:flex-row gap-4 sm:gap-6 border-b border-gray-200 pb-6 sm:pb-8 last:border-0">
                        <img src="${displayImage}" alt="${article.title}" class="w-full md:w-48 h-40 sm:h-32 object-cover rounded-sm group-hover:opacity-90 transition-opacity" />
                        <div class="flex-1">
                            <span class="text-blue-700 font-bold text-[10px] sm:text-xs uppercase font-sans flex items-center gap-4 mb-2">
                                ${article.category}
                                <span class="text-gray-400 font-normal flex items-center gap-1"><i data-lucide="eye" class="w-3 h-3"></i> ${article.views.length}</span>
                            </span>
                            <h3 class="text-lg sm:text-xl md:text-2xl font-bold leading-snug group-hover:text-blue-700 transition-colors mb-2">${article.title}</h3>
                            <p class="text-xs sm:text-sm text-gray-600 line-clamp-2">${article.summary}</p>
                        </div>
                    </article>`;
                });
            }

            html += `</div></div>`;
            return html;
        }

        function renderAdminLogin() {
            return `
            <div class="max-w-md mx-auto bg-white p-6 sm:p-8 border border-gray-200 shadow-md rounded-sm mt-8 sm:mt-12 mx-4">
                <div class="text-center mb-6">
                    <i data-lucide="lock" class="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-blue-900 mb-2"></i>
                    <h2 class="text-xl sm:text-2xl font-black uppercase font-sans">main-Admin Login</h2>
                </div>
                <form onsubmit="window.handleLogin(event)" class="flex flex-col gap-4 font-sans">
                    <div>
                        <label class="block text-xs sm:text-sm font-bold mb-2">Master-Passwort</label>
                        <input type="password" id="adminPassword" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600" placeholder="Passwort eingeben..." />
                    </div>
                    <p id="loginError" class="text-red-500 text-sm font-bold hidden">Falsches Passwort!</p>
                    <button type="submit" class="bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition-colors cursor-pointer">Anmelden</button>
                    <p class="text-[10px] sm:text-xs text-gray-500 text-center mt-2">Hinweis: Als normaler Autor oder Admin reicht der normale Login-Button oben rechts.</p>
                </form>
            </div>`;
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

            return `
            <div class="max-w-6xl mx-auto bg-white shadow-md rounded-sm font-sans mt-4">
                
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 border-b border-gray-200 bg-gray-50 gap-4">
                    <h2 class="text-2xl sm:text-3xl font-black uppercase flex items-center gap-2 sm:gap-3">
                        <i data-lucide="${hasAdminAccess() ? 'shield' : 'pen-tool'}" class="w-6 h-6 sm:w-8 sm:h-8 text-blue-900"></i> ${hasAdminAccess() ? 'Admin-Zentrale' : 'Redaktions-Dashboard'}
                    </h2>
                    <button onclick="window.exitDashboard()" class="text-gray-500 hover:text-red-600 font-bold flex items-center gap-1 cursor-pointer text-sm sm:text-base w-full sm:w-auto justify-start sm:justify-end">
                        <i data-lucide="log-out" class="w-4 h-4"></i> Dashboard verlassen
                    </button>
                </div>

                <div class="flex gap-1 sm:gap-2 border-b border-gray-200 px-2 sm:px-6 pt-4 bg-gray-50 overflow-x-auto no-scrollbar whitespace-nowrap">
                    <button onclick="adminTab='articles'; window.renderApp()" class="px-4 sm:px-6 py-2 sm:py-3 font-bold uppercase text-xs sm:text-sm rounded-t ${adminTab === 'articles' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">Artikel</button>
                    ${hasAdminAccess() ? `<button onclick="adminTab='categories'; window.renderApp()" class="px-4 sm:px-6 py-2 sm:py-3 font-bold uppercase text-xs sm:text-sm rounded-t ${adminTab === 'categories' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">Ressorts</button>` : ''}
                    ${hasAdminAccess() ? `<button onclick="adminTab='authors'; window.renderApp()" class="px-4 sm:px-6 py-2 sm:py-3 font-bold uppercase text-xs sm:text-sm rounded-t ${adminTab === 'authors' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">Autoren</button>` : ''}
                    ${hasAdminAccess() ? `<button onclick="adminTab='users'; window.renderApp()" class="px-4 sm:px-6 py-2 sm:py-3 font-bold uppercase text-xs sm:text-sm rounded-t ${(adminTab === 'users' || adminTab === 'userDetails') ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">Benutzer</button>` : ''}
                    ${hasAdminAccess() ? `<button onclick="adminTab='comments'; window.renderApp()" class="px-4 sm:px-6 py-2 sm:py-3 font-bold uppercase text-xs sm:text-sm rounded-t flex items-center gap-1 sm:gap-2 ${adminTab === 'comments' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">
                        Kommentare <span class="bg-gray-200 text-gray-600 px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">${allComments.length}</span>
                        ${pendingCommentCount > 0 ? `<span class="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] sm:text-xs animate-pulse" title="${pendingCommentCount} warten auf Freigabe">${pendingCommentCount}</span>` : ''}
                    </button>` : ''}
                    ${hasAdminAccess() ? `<button onclick="adminTab='feedback'; window.renderApp()" class="px-4 sm:px-6 py-2 sm:py-3 font-bold uppercase text-xs sm:text-sm rounded-t flex items-center gap-1 sm:gap-2 ${adminTab === 'feedback' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">
                        Bewertungen <span class="bg-gray-200 text-gray-600 px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">${siteFeedbacks.length}</span>
                        ${pendingFeedbackCount > 0 ? `<span class="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] sm:text-xs animate-pulse" title="${pendingFeedbackCount} warten auf Freigabe">${pendingFeedbackCount}</span>` : ''}
                    </button>` : ''}
                    ${hasAdminAccess() ? `<button onclick="adminTab='support'; window.renderApp()" class="px-4 sm:px-6 py-2 sm:py-3 font-bold uppercase text-xs sm:text-sm rounded-t flex items-center gap-1 sm:gap-2 ${adminTab === 'support' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">
                        Support <span class="bg-gray-200 text-gray-600 px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">${supportChats.length}</span>
                    </button>` : ''}
                    ${hasAdminAccess() ? `<button onclick="adminTab='backup'; window.renderApp()" class="px-4 sm:px-6 py-2 sm:py-3 font-bold uppercase text-xs sm:text-sm rounded-t flex items-center gap-1 sm:gap-2 ${adminTab === 'backup' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">
                        <i data-lucide="database" class="w-3 h-3 sm:w-4 sm:h-4"></i> Backup
                    </button>` : ''}
                </div>

                <div class="p-4 sm:p-6 md:p-8 overflow-x-hidden">
                    ${adminTab === 'categories' && hasAdminAccess() ? `
                        <h3 class="text-lg sm:text-xl font-bold uppercase mb-4 sm:mb-6 flex items-center gap-2 border-b pb-2"><i data-lucide="layers" class="text-blue-600 w-5 h-5"></i> Ressorts verwalten</h3>
                        
                        <div class="bg-blue-50 p-3 sm:p-4 rounded text-xs sm:text-sm text-gray-700 flex items-start gap-3 mb-4 sm:mb-6 border border-blue-100">
                            <i data-lucide="info" class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0"></i>
                            <p>Hier kannst du neue Ressorts anlegen. Du kannst ein Ressort nur löschen, wenn kein Artikel mehr damit verknüpft ist.</p>
                        </div>

                        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <input type="text" id="newCategoryInput" placeholder="Name des neuen Ressorts..." class="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm sm:text-base" onkeypress="if(event.key === 'Enter') window.addCategory()" />
                            <button onclick="window.addCategory()" class="bg-blue-900 text-white font-bold py-2 px-6 rounded hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base">
                                <i data-lucide="plus" class="w-4 h-4"></i> Hinzufügen
                            </button>
                        </div>

                        <ul class="flex flex-col gap-3">
                            ${categories.map(cat => {
                                const usedInArticles = articles.filter(a => a.category === cat);
                                const isInUse = usedInArticles.length > 0;
                                return `
                                    <li class="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 p-3 sm:p-4 rounded border border-gray-200 gap-2">
                                        <span class="font-bold text-base sm:text-lg text-blue-900">${cat}</span>
                                        ${isInUse ? `
                                            <span class="text-[10px] sm:text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full font-bold flex items-center gap-1 w-fit">
                                                <i data-lucide="lock" class="w-3 h-3"></i> in ${usedInArticles.length} Artikel(n) genutzt
                                            </span>
                                        ` : `
                                            <button onclick="window.deleteCategory('${cat}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs sm:text-sm font-bold w-full sm:w-auto">
                                                <i data-lucide="trash-2" class="w-4 h-4"></i> Löschen
                                            </button>
                                        `}
                                    </li>
                                `;
                            }).join('')}
                        </ul>

                    ` : adminTab === 'authors' && hasAdminAccess() ? `
                        <h3 class="text-lg sm:text-xl font-bold uppercase mb-4 sm:mb-6 flex items-center gap-2 border-b pb-2">
                            <i data-lucide="${editingAuthorId ? 'edit' : 'user-plus'}" class="text-blue-600 w-5 h-5"></i> 
                            ${editingAuthorId ? 'Autor bearbeiten' : 'Neuen Autor hinzufügen'}
                        </h3>
                        
                        <form onsubmit="window.handleSaveAuthor(event)" class="flex flex-col gap-4 sm:gap-6 font-sans mb-8 sm:mb-12">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Name des Autors</label>
                                    <input required type="text" id="author-name" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Profilbild (Optional)</label>
                                    <div class="flex flex-col gap-2 p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded">
                                        <input type="file" id="author-image-file" accept="image/*" class="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm bg-white" />
                                        <span class="text-[10px] text-center text-gray-400 uppercase font-bold">oder URL</span>
                                        <input type="url" id="author-image-url" placeholder="https://..." class="w-full px-2 sm:px-3 py-1.5 border border-gray-300 rounded text-xs sm:text-sm focus:outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Biografie / Über den Autor</label>
                                <textarea required rows="3" id="author-bio" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"></textarea>
                            </div>
                            <div class="flex flex-col sm:flex-row justify-end gap-3 mt-2">
                                ${editingAuthorId ? `<button type="button" onclick="window.cancelAuthorEdit()" class="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded hover:bg-gray-100 transition-colors shadow-sm cursor-pointer text-sm">Abbrechen</button>` : ''}
                                <button type="submit" class="w-full sm:w-auto px-6 sm:px-8 py-2.5 bg-blue-700 text-white font-bold rounded hover:bg-blue-800 transition-colors shadow-sm cursor-pointer text-sm">
                                    ${editingAuthorId ? 'Änderungen speichern' : 'Autor hinzufügen'}
                                </button>
                            </div>
                        </form>

                        <h3 class="text-lg sm:text-xl font-bold uppercase mb-4 border-b pb-2 flex items-center gap-2"><i data-lucide="users" class="text-gray-600 w-5 h-5"></i> Vorhandene Autoren</h3>
                        <div class="flex flex-col gap-3">
                            ${getActiveAuthors().map(a => {
                                const usedInArticles = articles.filter(art => art.author === a.name);
                                const isUserLinked = String(a.id).startsWith('usr_');
                                return `
                                    <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-gray-50 p-3 sm:p-4 rounded border border-gray-200 gap-3">
                                        <div class="flex items-center gap-3 w-full">
                                            ${a.imageUrl ? `
                                                <img src="${a.imageUrl}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-300 shrink-0" onerror="this.outerHTML='${getStandardAvatarHtml('w-10 h-10 sm:w-12 sm:h-12', 'w-5 h-5 sm:w-6 sm:h-6').replace(/'/g, "\\'").replace(/"/g, '&quot;')}'" />
                                            ` : getStandardAvatarHtml('w-10 h-10 sm:w-12 sm:h-12', 'w-5 h-5 sm:w-6 sm:h-6')}
                                            <div class="flex-1 overflow-hidden">
                                                <span class="font-bold text-base sm:text-lg text-blue-900 block truncate">${a.name}</span>
                                                <p class="text-[10px] sm:text-xs text-gray-500">${usedInArticles.length} Artikel verfasst</p>
                                            </div>
                                        </div>
                                        <div class="flex gap-2 items-center w-full sm:w-auto justify-end border-t sm:border-0 pt-2 sm:pt-0 border-gray-200 mt-1 sm:mt-0">
                                            ${isUserLinked ? `
                                                <span class="text-[10px] sm:text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded font-bold" title="Wird über das Benutzerprofil verwaltet">Benutzer-Account</span>
                                            ` : `
                                                <button onclick="window.editAuthor(${a.id})" class="flex-1 sm:flex-none text-center sm:text-left text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-100 rounded transition-colors cursor-pointer" title="Bearbeiten"><i data-lucide="edit" class="w-4 h-4 sm:w-5 sm:h-5 inline-block"></i></button>
                                                <button onclick="window.deleteAuthor(${a.id})" class="flex-1 sm:flex-none text-center sm:text-left text-red-500 hover:text-red-700 p-2 hover:bg-red-100 rounded transition-colors cursor-pointer" title="Löschen"><i data-lucide="trash-2" class="w-4 h-4 sm:w-5 sm:h-5 inline-block"></i></button>
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
                        <h3 class="text-lg sm:text-xl font-bold uppercase mb-4 sm:mb-6 flex items-center gap-2 border-b pb-2">
                            <i data-lucide="${editingArticleId ? 'edit' : 'plus-circle'}" class="text-blue-600 w-5 h-5"></i> 
                            ${editingArticleId ? 'Artikel bearbeiten' : 'Neuen Artikel verfassen'}
                        </h3>
                        <form onsubmit="window.handleCreateArticle(event)" class="flex flex-col gap-4 sm:gap-6 font-sans">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Überschrift (Title)</label>
                                    <input required type="text" id="new-title" class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <div class="grid grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Ressort</label>
                                        <select required id="new-category" class="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 text-sm">
                                            <option value="">Wählen...</option>
                                            ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Autor</label>
                                        <select required id="new-author" class="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 text-sm">
                                            ${getActiveAuthors().map(a => `<option value="${a.name}" ${a.name === defaultAuth ? 'selected' : ''}>${a.name}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-2 sm:gap-3 bg-red-50 p-3 sm:p-4 rounded border border-red-200">
                                <input type="checkbox" id="new-eilmeldung" class="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer text-red-600 rounded shrink-0" />
                                <label for="new-eilmeldung" class="font-bold text-red-800 cursor-pointer flex items-center gap-2 text-xs sm:text-sm">
                                    <i data-lucide="alert-triangle" class="w-4 h-4 sm:w-5 sm:h-5"></i> Eilmeldung (verschwindet automatisch nach 24h)
                                </label>
                            </div>
                            
                            <div>
                                <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Zusammenfassung (Teaser)</label>
                                <textarea required rows="2" id="new-summary" class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 text-sm"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Bild (Optional, Platzhalter wenn leer)</label>
                                <div class="flex flex-col gap-2 p-3 sm:p-4 bg-gray-50 border border-gray-300 rounded">
                                    <div>
                                        <label class="text-[10px] sm:text-xs text-gray-500 font-bold uppercase mb-1 block">Vom Gerät hochladen</label>
                                        <input type="file" id="new-image-file" accept="image/*" class="w-full px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500 cursor-pointer text-xs sm:text-sm" />
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <hr class="flex-1 border-gray-300"><span class="text-[10px] text-gray-400 font-bold uppercase">oder</span><hr class="flex-1 border-gray-300">
                                    </div>
                                    <div>
                                        <label class="text-[10px] sm:text-xs text-gray-500 font-bold uppercase mb-1 block">Bild-URL eingeben</label>
                                        <input type="url" id="new-image-url" class="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm" placeholder="https://..." />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Automatisches Löschdatum (Optional)</label>
                                <input type="datetime-local" id="new-autodelete" class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 text-sm" />
                                <p class="text-[10px] sm:text-xs text-gray-500 mt-1">Nach diesem Datum wird der Artikel automatisch ausgeblendet.</p>
                            </div>
                            
                            <div>
                                <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Vollständiger Artikeltext</label>
                                <textarea required rows="6" id="new-content" class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 font-serif text-base sm:text-lg"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-gray-700">Quellen-Links (Optional)</label>
                                <input type="text" id="new-sources" class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 text-sm" placeholder="https://quelle1.ch, https://quelle2.ch (mit Komma trennen)" />
                            </div>

                            <div class="flex flex-col sm:flex-row justify-end gap-3 mt-2">
                                ${editingArticleId ? `<button type="button" onclick="window.cancelEdit()" class="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded hover:bg-gray-100 transition-colors shadow-sm cursor-pointer text-sm">Abbrechen</button>` : ''}
                                <button type="submit" class="w-full sm:w-auto px-6 sm:px-8 py-2.5 bg-blue-700 text-white font-bold rounded hover:bg-blue-800 transition-colors shadow-sm cursor-pointer text-sm">
                                    ${editingArticleId ? 'Änderungen speichern' : 'Artikel veröffentlichen'}
                                </button>
                            </div>
                        </form>

                        <div class="mt-8 sm:mt-12 border-t pt-6 sm:pt-8">
                            <h3 class="text-lg sm:text-xl font-bold uppercase mb-4 sm:mb-6 flex items-center gap-2"><i data-lucide="file-text" class="text-gray-600 w-5 h-5"></i> Vorhandene Artikel</h3>
                            <div class="flex flex-col sm:flex-row gap-3 mb-6">
                                <button onclick="window.exportArticles()" class="bg-green-700 text-white px-4 py-2 rounded font-bold hover:bg-green-600 flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full sm:w-auto text-sm"><i data-lucide="download" class="w-4 h-4"></i> Exportieren (.txt)</button>
                                <label class="bg-purple-700 text-white px-4 py-2 rounded font-bold hover:bg-purple-600 flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full sm:w-auto text-sm">
                                    <i data-lucide="upload" class="w-4 h-4"></i> Importieren (.txt)
                                    <input type="file" accept=".txt" class="hidden" onchange="window.importArticles(event)" />
                                </label>
                            </div>
                            <div class="flex flex-col gap-3">
                                ${articles.length === 0 ? '<p class="text-gray-500 italic text-sm">Keine Artikel vorhanden.</p>' : ''}
                                ${articles.map(a => {
                                    const isExpired = a.autoDeleteDate && new Date(a.autoDeleteDate) <= new Date();
                                    return `
                                    <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-gray-50 p-3 sm:p-4 rounded border border-gray-200 ${isExpired ? 'opacity-60' : ''} gap-2">
                                        <div class="flex-1 pr-0 sm:pr-4 w-full">
                                            <span class="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">${a.category}</span>
                                            ${a.autoDeleteDate ? `<span class="ml-2 text-[8px] sm:text-[10px] px-2 py-0.5 rounded ${isExpired ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} font-bold uppercase" title="Automatisches Löschdatum">Ablauf: ${new Date(a.autoDeleteDate).toLocaleString('de-DE', {dateStyle:'short', timeStyle:'short'})}</span>` : ''}
                                            <h4 class="font-bold text-sm sm:text-lg leading-tight mt-1 line-clamp-2">${a.title}</h4>
                                        </div>
                                        <div class="flex gap-2 w-full sm:w-auto justify-end border-t sm:border-0 pt-2 sm:pt-0 mt-1 sm:mt-0 border-gray-200">
                                            <button onclick="window.editArticle(${a.id})" class="flex-1 sm:flex-none text-center sm:text-left text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-100 rounded transition-colors cursor-pointer" title="Artikel bearbeiten"><i data-lucide="edit" class="w-4 h-4 sm:w-5 sm:h-5 inline-block"></i></button>
                                            <button onclick="window.deleteArticle(${a.id})" class="flex-1 sm:flex-none text-center sm:text-left text-red-500 hover:text-red-700 p-2 hover:bg-red-100 rounded transition-colors cursor-pointer" title="Artikel löschen"><i data-lucide="trash-2" class="w-4 h-4 sm:w-5 sm:h-5 inline-block"></i></button>
                                        </div>
                                    </div>
                                `;
                                }).join('')}
                            </div>
                        </div>

                    `; })() : adminTab === 'users' && hasAdminAccess() ? `
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 mb-4 sm:mb-6 gap-3">
                            <h3 class="text-lg sm:text-xl font-bold uppercase flex items-center gap-2"><i data-lucide="users" class="text-blue-600 w-5 h-5"></i> Registrierte Benutzer (${registeredUsers.length})</h3>
                            <button onclick="window.exportUsers()" class="w-full sm:w-auto bg-blue-700 text-white px-4 py-2 rounded font-bold hover:bg-blue-600 flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"><i data-lucide="download" class="w-4 h-4"></i> Liste exportieren</button>
                        </div>
                        
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            ${registeredUsers.length === 0 ? '<p class="text-gray-500 italic text-sm">Noch keine Benutzer registriert.</p>' : ''}
                            ${registeredUsers.map(u => `
                                <div class="border ${u.isBanned || u.isDeleted ? 'border-red-300 bg-red-50' : 'border-gray-200'} rounded p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 relative overflow-hidden">
                                    <div class="absolute top-2 right-2 flex gap-1 z-10">
                                        ${u.isDeleted ? '<span class="bg-gray-600 text-white text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Gelöscht</span>' : ''}
                                        ${u.isBanned ? '<span class="bg-red-600 text-white text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Gesperrt</span>' : ''}
                                    </div>
                                    <div class="relative shrink-0 flex justify-center sm:block">
                                        ${getUserAvatar(u.username, 'w-10 h-10 sm:w-12 sm:h-12', 'w-5 h-5 sm:w-6 sm:h-6', false)}
                                        <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-bold uppercase bg-blue-100 text-blue-800 px-1 rounded border border-blue-200">${u.role}</span>
                                    </div>
                                    <div class="flex-1 mt-3 sm:mt-0 w-full overflow-hidden">
                                        <h4 class="font-bold text-base sm:text-lg text-blue-900 truncate">${u.username}</h4>
                                        <p class="text-xs sm:text-sm text-gray-600 mb-2 truncate">
                                            ${u.firstName || u.lastName ? `${u.firstName} ${u.lastName}` : '<span class="italic text-gray-400">Kein Name</span>'} 
                                            | ${u.email || '<span class="italic text-gray-400">Keine E-Mail</span>'}
                                        </p>
                                        <button onclick="window.viewUserDetails('${u.username}')" class="mt-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs sm:text-sm font-bold px-4 py-2 rounded hover:bg-blue-100 transition-colors w-full sm:w-auto">Verwalten</button>
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
                                <div class="mb-4 sm:mb-6">
                                    <button onclick="adminTab='users'; window.renderApp()" class="text-blue-600 hover:underline flex items-center gap-1 font-bold text-sm"><i data-lucide="arrow-left" class="w-4 h-4"></i> Zurück zur Benutzerliste</button>
                                </div>
                                <div class="bg-gray-50 p-4 sm:p-6 rounded border border-gray-200 mb-6 sm:mb-8 flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start text-center sm:text-left">
                                    ${getUserAvatar(u.username, 'w-20 h-20 sm:w-24 sm:h-24', 'w-10 h-10 sm:w-12 sm:h-12', true)}
                                    <div class="flex-1 w-full overflow-hidden">
                                        <h3 class="text-xl sm:text-2xl font-black text-blue-900 mb-1 flex flex-col sm:flex-row items-center gap-2 truncate justify-center sm:justify-start">
                                            <span class="truncate">${u.username}</span>
                                            ${u.isBanned ? '<span class="text-[10px] sm:text-xs bg-red-600 text-white px-2 py-1 rounded">GESPERRT</span>' : ''} 
                                            ${u.isDeleted ? '<span class="text-[10px] sm:text-xs bg-gray-600 text-white px-2 py-1 rounded">GELÖSCHT</span>' : ''}
                                        </h3>
                                        <div class="text-xs sm:text-sm text-gray-700 mt-2">
                                            <p class="truncate"><span class="font-bold">Name:</span> ${u.firstName || '-'} ${u.lastName || '-'}</p>
                                            <p class="truncate"><span class="font-bold">E-Mail:</span> ${u.email || '-'}</p>
                                            <p class="truncate"><span class="font-bold">Anzeige:</span> ${u.showRealName ? 'Echter Name' : 'Benutzername'}</p>
                                        </div>
                                        
                                        <div class="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                                            <span class="font-bold text-xs sm:text-sm text-gray-700">Rolle:</span>
                                            <select onchange="window.changeUserRole('${u.username}', this.value)" class="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm bg-white cursor-pointer font-bold focus:outline-none focus:border-blue-500 w-full sm:w-auto">
                                                <option value="user" ${u.role === 'user' ? 'selected' : ''}>Benutzer</option>
                                                <option value="author" ${u.role === 'author' ? 'selected' : ''}>Autor</option>
                                                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                                            </select>
                                        </div>
                                        
                                        ${u.bio ? `<p class="text-xs sm:text-sm bg-white border border-gray-200 p-2 sm:p-3 rounded text-gray-700 mt-3 italic break-words">"${u.bio}"</p>` : ''}
                                        
                                        <div class="mt-4 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                                            <button onclick="window.toggleUserBan('${u.username}')" class="w-full sm:w-auto justify-center ${u.isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'} text-white font-bold py-2 px-4 rounded text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2">
                                                <i data-lucide="${u.isBanned ? 'check-circle' : 'ban'}" class="w-4 h-4"></i>
                                                ${u.isBanned ? 'Entsperren' : 'Sperren'}
                                            </button>
                                            <button onclick="window.toggleUserDeleted('${u.username}')" class="w-full sm:w-auto justify-center ${u.isDeleted ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white font-bold py-2 px-4 rounded text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2">
                                                <i data-lucide="${u.isDeleted ? 'check-circle' : 'trash-2'}" class="w-4 h-4"></i>
                                                ${u.isDeleted ? 'Wiederherstellen' : 'Löschen'}
                                            </button>
                                            ${u.isDeleted ? `
                                            <button onclick="window.permanentlyDeleteUser('${u.username}')" class="w-full sm:w-auto justify-center bg-red-900 hover:bg-red-950 text-white font-bold py-2 px-4 rounded text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2">
                                                <i data-lucide="user-x" class="w-4 h-4"></i>
                                                Endgültig löschen
                                            </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                                    <div class="bg-white p-3 sm:p-4 rounded border border-gray-200 shadow-sm">
                                        <h4 class="font-bold flex items-center gap-2 mb-3 sm:mb-4 text-gray-700 border-b pb-2 text-sm sm:text-base"><i data-lucide="heart" class="w-4 h-4 sm:w-5 sm:h-5 text-red-500"></i> Gelikte Artikel (${liked.length})</h4>
                                        <ul class="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                                            ${liked.length === 0 ? '<li class="text-gray-500 text-xs sm:text-sm">Keine</li>' : liked.map(a => `<li><button onclick="window.openArticle(${a.id})" class="text-left text-xs sm:text-sm text-blue-700 hover:underline line-clamp-1">${a.title}</button></li>`).join('')}
                                        </ul>
                                    </div>
                                    <div class="bg-white p-3 sm:p-4 rounded border border-gray-200 shadow-sm">
                                        <h4 class="font-bold flex items-center gap-2 mb-3 sm:mb-4 text-gray-700 border-b pb-2 text-sm sm:text-base"><i data-lucide="eye" class="w-4 h-4 sm:w-5 sm:h-5 text-blue-500"></i> Gelesene Artikel (${viewed.length})</h4>
                                        <ul class="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                                            ${viewed.length === 0 ? '<li class="text-gray-500 text-xs sm:text-sm">Keine</li>' : viewed.map(a => `<li><button onclick="window.openArticle(${a.id})" class="text-left text-xs sm:text-sm text-blue-700 hover:underline line-clamp-1">${a.title}</button></li>`).join('')}
                                        </ul>
                                    </div>
                                </div>

                                <div class="bg-white p-3 sm:p-4 rounded border border-gray-200 shadow-sm">
                                    <h4 class="font-bold flex items-center gap-2 mb-3 sm:mb-4 text-gray-700 border-b pb-2 text-sm sm:text-base"><i data-lucide="message-square" class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"></i> Kommentare des Nutzers (${userComments.length})</h4>
                                    <div class="flex flex-col gap-3 sm:gap-4">
                                        ${userComments.length === 0 ? '<p class="text-gray-500 text-xs sm:text-sm">Keine Kommentare</p>' : userComments.map(c => `
                                            <div class="bg-gray-50 p-2 sm:p-3 rounded border border-gray-100">
                                                <div class="flex flex-col sm:flex-row justify-between sm:items-start mb-1 gap-1">
                                                    <span class="text-[10px] sm:text-xs text-gray-500">Artikel: <button onclick="window.openArticle(${c.articleId})" class="font-bold text-blue-600 hover:underline text-left leading-tight">${c.articleTitle}</button></span>
                                                    <span class="text-[10px] text-gray-400 shrink-0">${new Date(c.timestamp).toLocaleString('de-DE', {dateStyle:'short', timeStyle:'short'})}</span>
                                                </div>
                                                <p class="text-gray-800 text-xs sm:text-sm mt-1">${c.text}</p>
                                                ${c.isDeleted ? '<span class="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold mt-2 inline-block">Gelöscht</span>' : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        })()}

                    ` : adminTab === 'support' && hasAdminAccess() ? `
                        
                        <h3 class="text-lg sm:text-xl font-bold uppercase flex items-center gap-2 border-b pb-4 mb-4 sm:mb-6"><i data-lucide="help-circle" class="text-blue-600 w-5 h-5"></i> Support-Anfragen</h3>
                        
                        <div class="flex flex-col lg:flex-row gap-4 sm:gap-6 h-auto lg:h-[600px] min-h-[500px]">
                            <div class="w-full lg:w-1/3 border border-gray-200 rounded bg-white overflow-y-auto max-h-[250px] lg:max-h-full">
                                ${supportChats.length === 0 ? '<p class="p-4 text-gray-500 italic text-sm">Keine Support-Anfragen vorhanden.</p>' : supportChats.map(c => {
                                    const lastMsg = c.messages[c.messages.length - 1];
                                    const isSelected = adminSelectedChatId === c.id;
                                    const isUnread = lastMsg && lastMsg.sender === 'user';
                                    
                                    const user = registeredUsers.find(u => u.username === c.userId);
                                    const isBanned = user ? user.isBanned : false;
                                    
                                    return `
                                        <div onclick="adminSelectedChatId = ${c.id}; window.renderApp()" class="p-3 sm:p-4 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'} relative">
                                            <div class="flex justify-between items-start mb-1">
                                                <span class="font-bold text-xs sm:text-sm ${isUnread ? 'text-blue-900' : 'text-gray-700'} truncate flex items-center gap-1" title="${c.userId}">
                                                    ${c.userId.length > 12 ? c.userId.substring(0, 12) + '...' : c.userId}
                                                    ${isBanned ? '<span class="bg-red-600 text-white text-[8px] px-1 rounded uppercase" title="Account gesperrt">Gesperrt</span>' : ''}
                                                </span>
                                                <span class="text-[9px] sm:text-[10px] text-gray-400 shrink-0">${lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                                            </div>
                                            <p class="text-[10px] sm:text-xs text-gray-500 truncate pr-2 ${isUnread ? 'font-bold text-gray-800' : ''}">${lastMsg ? lastMsg.text : 'Neuer Chat'}</p>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            
                            <div class="w-full lg:w-2/3 border border-gray-200 rounded bg-gray-50 flex flex-col relative min-h-[400px] lg:min-h-0">
                                ${!adminSelectedChatId ? `
                                    <div class="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2 p-4 text-center">
                                        <i data-lucide="message-square" class="w-10 h-10 sm:w-12 sm:h-12 opacity-50"></i>
                                        <p class="text-sm">Wähle einen Chat aus der Liste aus.</p>
                                    </div>
                                ` : (() => {
                                    const chat = supportChats.find(c => c.id === adminSelectedChatId);
                                    if(!chat) return '<p class="p-4">Chat nicht gefunden.</p>';
                                    
                                    const user = registeredUsers.find(u => u.username === chat.userId);
                                    const isBanned = user ? user.isBanned : false;
                                    
                                    return `
                                        <div class="bg-white p-3 sm:p-4 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                                            <h4 ${user ? `onclick="window.viewUserDetails('${chat.userId}')"` : ''} class="font-bold text-sm sm:text-base text-blue-900 flex items-center gap-2 ${user ? 'cursor-pointer hover:text-blue-700 hover:underline' : ''}" title="${user ? 'Zum Profil von ' + chat.userId : 'Gast-Nutzer'}">
                                                ${user ? getUserAvatar(chat.userId, 'w-5 h-5 sm:w-6 sm:h-6', 'w-3 h-3', false) : '<i data-lucide="user" class="w-4 h-4 sm:w-5 sm:h-5"></i>'}
                                                <span class="truncate max-w-[150px] sm:max-w-none">Chat mit ${chat.userId}</span>
                                                ${isBanned ? '<span class="bg-red-600 text-white text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-bold uppercase ml-1 sm:ml-2 no-underline">Gesperrt</span>' : ''}
                                                ${!user ? '<span class="bg-gray-200 text-gray-600 text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-bold uppercase ml-1 sm:ml-2 no-underline">Gast</span>' : ''}
                                            </h4>
                                        </div>
                                        
                                        <div class="flex-1 p-3 sm:p-4 overflow-y-auto flex flex-col gap-2 sm:gap-3" id="adminChatContainer">
                                            ${chat.messages.map((m, index) => `
                                                <div class="flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}">
                                                    <div class="max-w-[85%] rounded-lg p-2 sm:p-3 ${m.sender === 'admin' ? 'bg-blue-900 text-white rounded-br-none' : 'bg-white border border-gray-300 text-gray-800 rounded-bl-none'} shadow-sm">
                                                        <p class="text-xs sm:text-sm break-words">${m.text}</p>
                                                        <div class="flex justify-between items-center mt-1 gap-2 sm:gap-4">
                                                            <span class="text-[8px] sm:text-[10px] opacity-75 block ${m.sender === 'user' ? 'text-left text-gray-400' : 'text-blue-200 text-right w-full'}">${new Date(m.timestamp).toLocaleString('de-DE', {dateStyle:'short', timeStyle:'short'})}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                        
                                        <div class="p-2 sm:p-3 bg-white border-t border-gray-200 flex flex-col sm:flex-row gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                                            <input type="text" id="adminSupportInput" placeholder="Deine manuelle Antwort schreiben..." class="flex-1 border border-gray-300 rounded px-3 py-2 sm:px-4 sm:py-2 focus:outline-none focus:border-blue-500 font-sans text-xs sm:text-sm" onkeypress="if(event.key === 'Enter') window.adminReplySupportMessage(${chat.id})" />
                                            <button onclick="window.adminReplySupportMessage(${chat.id})" class="w-full sm:w-auto bg-blue-900 text-white px-4 sm:px-6 py-2 rounded font-bold hover:bg-blue-800 transition-colors cursor-pointer text-xs sm:text-sm flex justify-center items-center gap-2">
                                                Senden <i data-lucide="send" class="w-3 h-3 sm:w-4 sm:h-4"></i>
                                            </button>
                                        </div>
                                    `;
                                })()}
                            </div>
                        </div>

                    ` : adminTab === 'backup' && hasAdminAccess() ? `
                        <h3 class="text-lg sm:text-xl font-bold uppercase mb-4 sm:mb-6 flex items-center gap-2 border-b pb-4"><i data-lucide="database" class="text-blue-600 w-5 h-5"></i> System-Backup</h3>
                        
                        <div class="bg-blue-50 p-3 sm:p-4 rounded text-xs sm:text-sm text-gray-700 flex items-start gap-3 mb-6 sm:mb-8 border border-blue-100">
                            <i data-lucide="info" class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0"></i>
                            <p>Sichere den gesamten Stand der Zeitung in einer einzigen Datei. Diese kannst du später wieder hochladen, um alles exakt wiederherzustellen.</p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                            <div class="bg-white p-6 sm:p-8 border border-gray-200 shadow-sm rounded flex flex-col items-center text-center gap-3 sm:gap-4">
                                <div class="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-1 sm:mb-2"><i data-lucide="download-cloud" class="w-6 h-6 sm:w-8 sm:h-8"></i></div>
                                <h4 class="font-bold text-base sm:text-lg">Backup erstellen</h4>
                                <button onclick="window.exportBackup()" class="w-full bg-green-600 text-white font-bold py-2 sm:py-3 px-4 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base">
                                    <i data-lucide="download" class="w-4 h-4 sm:w-5 sm:h-5"></i> <span class="truncate">Komplettes Backup exportieren</span>
                                </button>
                            </div>
                            <div class="bg-white p-6 sm:p-8 border border-gray-200 shadow-sm rounded flex flex-col items-center text-center gap-3 sm:gap-4">
                                <div class="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-1 sm:mb-2"><i data-lucide="upload-cloud" class="w-6 h-6 sm:w-8 sm:h-8"></i></div>
                                <h4 class="font-bold text-base sm:text-lg">Backup wiederherstellen</h4>
                                <label class="w-full bg-purple-600 text-white font-bold py-2 sm:py-3 px-4 rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base">
                                    <i data-lucide="upload" class="w-4 h-4 sm:w-5 sm:h-5"></i> <span class="truncate">Backup-Datei hochladen</span>
                                    <input type="file" accept=".json,.txt" class="hidden" onchange="window.importBackup(event)" />
                                </label>
                            </div>
                        </div>

                    ` : adminTab === 'feedback' && hasAdminAccess() ? `
                        <h3 class="text-lg sm:text-xl font-bold uppercase flex items-center gap-2 border-b pb-4 mb-4 sm:mb-6"><i data-lucide="message-square-plus" class="text-blue-600 w-5 h-5"></i> Website-Bewertungen</h3>
                        
                        <div class="flex flex-col gap-3 sm:gap-4">
                            ${siteFeedbacks.length === 0 ? '<p class="text-gray-500 italic text-sm">Noch keine Bewertungen abgegeben.</p>' : ''}
                            ${[...siteFeedbacks].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(f => {
                                const isPending = f.moderationStatus === 'pending';
                                return `
                                <div class="bg-white p-3 sm:p-4 rounded border ${isPending ? 'border-orange-400 bg-orange-50' : 'border-gray-200'} shadow-sm">
                                    <div class="flex justify-between items-start mb-2 gap-2">
                                        <div class="flex items-center gap-2 overflow-hidden">
                                            ${getUserAvatar(f.username, 'w-5 h-5 sm:w-6 sm:h-6', 'w-3 h-3', false)}
                                            <span class="font-bold text-sm text-blue-900 truncate">${f.username}</span>
                                        </div>
                                        <div class="flex flex-col items-end gap-1 shrink-0">
                                            <span class="text-[10px] sm:text-xs text-gray-500 flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2">
                                                ${isPending ? '<span class="bg-orange-500 text-white px-2 py-0.5 rounded font-bold uppercase animate-pulse mb-1 sm:mb-0">Wartet auf Freigabe</span>' : ''}
                                                ${new Date(f.timestamp).toLocaleString('de-DE', {dateStyle:'short', timeStyle:'short'})}
                                            </span>
                                        </div>
                                    </div>
                                    <p class="text-xs sm:text-sm text-gray-800 leading-relaxed mb-3 break-words">${f.text}</p>
                                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
                                        <span class="text-gray-500 flex items-center gap-1"><i data-lucide="heart" class="w-3 h-3 sm:w-4 sm:h-4"></i> ${f.likes ? f.likes.length : 0} Likes</span>
                                        
                                        <div class="flex flex-wrap gap-2 w-full sm:w-auto justify-end border-t sm:border-0 border-gray-200 pt-2 sm:pt-0">
                                            ${isPending ? `
                                                <button onclick="window.adminApproveContent('feedback', ${f.id}, null)" class="text-green-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="check" class="w-3 h-3 sm:w-4 sm:h-4"></i> Zulassen</button>
                                            ` : ''}

                                            <button onclick="window.adminRejectContent('feedback', ${f.id}, null)" class="text-red-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="trash-2" class="w-3 h-3 sm:w-4 sm:h-4"></i> ${isPending ? 'Ablehnen & Löschen' : 'Löschen'}</button>
                                        </div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>

                    ` : hasAdminAccess() ? `
                        <h3 class="text-lg sm:text-xl font-bold uppercase flex items-center gap-2 border-b pb-4 mb-4 sm:mb-6"><i data-lucide="message-square" class="text-blue-600 w-5 h-5"></i> Alle Kommentare</h3>
                        
                        <div class="flex flex-col gap-3 sm:gap-4">
                            ${allComments.length === 0 ? '<p class="text-gray-500 italic text-sm">Noch keine Kommentare geschrieben.</p>' : ''}
                            ${allComments.map(c => {
                                const isPending = c.moderationStatus === 'pending';
                                return `
                                <div class="bg-white p-3 sm:p-4 rounded border ${isPending ? 'border-orange-400 bg-orange-50' : c.isDeleted ? 'border-red-300 bg-red-50 opacity-75' : (c.reportedBy && c.reportedBy.length > 0 ? 'border-orange-400 bg-orange-50' : 'border-gray-200')} shadow-sm">
                                    <div class="flex flex-col sm:flex-row justify-between sm:items-start mb-2 gap-2">
                                        <div class="flex flex-wrap items-center gap-2">
                                            ${getUserAvatar(c.username, 'w-5 h-5 sm:w-6 sm:h-6', 'w-3 h-3', false)}
                                            <span class="font-bold text-sm text-blue-900">${c.username}</span>
                                            <span class="text-[10px] sm:text-xs text-gray-500">Artikel: <span class="font-bold text-blue-700">${c.articleTitle}</span></span>
                                        </div>
                                        <div class="flex flex-wrap sm:flex-col items-end gap-1">
                                            <span class="text-[10px] sm:text-xs text-gray-500 flex flex-wrap items-center gap-1 sm:gap-2 justify-end">
                                                ${isPending ? '<span class="bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">Wartet auf Freigabe</span>' : ''}
                                                ${c.isDeleted ? '<span class="bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">GELÖSCHT</span>' : ''}
                                                ${c.reportedBy && c.reportedBy.length > 0 && !c.isDeleted ? `<span class="bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1"><i data-lucide="flag" class="w-3 h-3"></i> Gemeldet (${c.reportedBy.length}x)</span>` : ''}
                                                ${new Date(c.timestamp).toLocaleString('de-DE', {dateStyle:'short', timeStyle:'short'})}
                                            </span>
                                        </div>
                                    </div>
                                    <p class="text-xs sm:text-sm text-gray-800 leading-relaxed mb-3 break-words">${c.text}</p>
                                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm gap-3">
                                        <span class="text-gray-500 flex items-center gap-1"><i data-lucide="heart" class="w-3 h-3 sm:w-4 sm:h-4"></i> ${c.likes.length} Likes</span>
                                        
                                        <div class="flex flex-wrap gap-2 md:gap-4 w-full sm:w-auto justify-end border-t sm:border-0 pt-2 sm:pt-0 border-gray-200">
                                            ${isPending ? `
                                                <button onclick="window.adminApproveContent('comment', ${c.id}, ${c.articleId})" class="text-green-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="check" class="w-3 h-3 sm:w-4 sm:h-4"></i> Zulassen</button>
                                            ` : ''}

                                            ${c.reportedBy && c.reportedBy.length > 0 && !c.isDeleted ? `
                                                <button onclick="window.unreportComment(${c.articleId}, ${c.id})" class="text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="check-circle" class="w-3 h-3 sm:w-4 sm:h-4"></i> Meldung ignorieren</button>
                                            ` : ''}

                                            ${c.isDeleted ? `
                                                <button onclick="window.restoreComment(${c.articleId}, ${c.id})" class="text-green-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="refresh-cw" class="w-3 h-3 sm:w-4 sm:h-4"></i> Wiederherstellen</button>
                                            ` : `
                                                <button onclick="window.adminRejectContent('comment', ${c.id}, ${c.articleId})" class="text-red-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"><i data-lucide="trash-2" class="w-3 h-3 sm:w-4 sm:h-4"></i> ${isPending ? 'Ablehnen & Löschen' : 'Verstecken'}</button>
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

        function renderSupportChatWidget() {
            if (hasAdminAccess() && view === 'admin-dashboard') return ''; 
            if (view === 'feedback') return ''; 
            
            const activeChatUser = currentUser || supportUser || ('Gast-' + sessionId);
            let userChat = supportChats.find(c => c.userId === activeChatUser);
            
            if (!userChat) {
                userChat = { id: 'temp', messages: [], aiEnabled: true };
            }

            let messagesHtml = '<p class="text-[10px] sm:text-xs text-gray-400 text-center my-4 italic">Starte einen Chat mit unserem Support oder der KI.</p>';
            
            if (userChat && userChat.messages && userChat.messages.length > 0) {
                messagesHtml = userChat.messages.map((m, index) => {
                    const isUser = m.sender === 'user';
                    const isAi = m.sender === 'ai';
                    const isAdmin = m.sender === 'admin';
                    
                    let bgClass = isUser ? 'bg-blue-600 text-white' : (isAdmin ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-800');
                    let alignClass = isUser ? 'justify-end' : 'justify-start';
                    let roundedClass = isUser ? 'rounded-br-none' : 'rounded-bl-none';
                    let senderLabel = isAdmin ? 'Admin' : (isAi ? 'KI-Assistent' : '');
                    
                    return `
                    <div class="flex ${alignClass} mb-3 group">
                        <div class="max-w-[85%]">
                            ${!isUser ? `<div class="text-[8px] sm:text-[10px] text-gray-400 ml-1 mb-0.5 font-bold uppercase">${senderLabel}</div>` : ''}
                            <div class="p-2.5 sm:p-3 rounded-lg ${bgClass} shadow-sm ${roundedClass} text-xs sm:text-sm break-words">
                                ${m.text.replace(/\n/g, '<br/>')}
                                ${m.isThinking ? '<span class="inline-flex space-x-1 ml-2"><span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span><span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span><span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></span></span>' : ''}
                            </div>
                            <div class="flex items-center mt-1 gap-2 ${isUser ? 'justify-end' : 'justify-start'}">
                                <span class="text-[8px] sm:text-[9px] text-gray-400">${new Date(m.timestamp).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}</span>
                                ${isAi && !m.isThinking ? `
                                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onclick="window.rateAiMessage(${userChat.id}, ${index}, 'up')" class="text-gray-400 hover:text-green-500 ${m.rating === 'up' ? 'text-green-500' : ''}"><i data-lucide="thumbs-up" class="w-3 h-3"></i></button>
                                        <button onclick="window.rateAiMessage(${userChat.id}, ${index}, 'down')" class="text-gray-400 hover:text-red-500 ${m.rating === 'down' ? 'text-red-500' : ''}"><i data-lucide="thumbs-down" class="w-3 h-3"></i></button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    `;
                }).join('');
            }

            return `
            <!-- Support Button Widget -->
            <button onclick="window.toggleSupportChat()" class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-900 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:bg-blue-800 transition-transform hover:scale-110 z-[60] flex items-center justify-center cursor-pointer group">
                <i data-lucide="message-square" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                ${(!isSupportChatOpen && userChat && userChat.messages.length > 0 && userChat.messages[userChat.messages.length-1].sender !== 'user') ? '<span class="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>' : ''}
            </button>

            <!-- Chat Window -->
            <div id="support-chat" class="${isSupportChatOpen ? 'flex' : 'hidden'} fixed bottom-0 right-0 w-full h-[100dvh] sm:h-[500px] sm:max-h-[70vh] sm:bottom-24 sm:right-6 sm:w-96 bg-white border border-gray-200 sm:rounded-lg shadow-2xl z-[70] flex-col font-sans overflow-hidden animate-slide-in sm:animate-none">
                <!-- Header -->
                <div class="bg-blue-900 text-white p-3 sm:p-4 flex justify-between items-center shadow-md z-10 shrink-0">
                    <div class="flex items-center gap-2 sm:gap-3">
                        <div class="bg-white/20 p-2 rounded-full shrink-0">
                            <i data-lucide="headset" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                        </div>
                        <div>
                            <h3 class="font-bold leading-none mb-1 text-xs sm:text-sm">Winterthur Times</h3>
                            <div class="flex items-center gap-2 text-[10px] sm:text-xs text-blue-200">
                                <span class="flex items-center gap-1">
                                    <span class="w-2 h-2 rounded-full ${userChat.aiEnabled ? 'bg-green-400' : 'bg-gray-400'}"></span>
                                    ${userChat.aiEnabled ? 'KI aktiv' : 'Live Support'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button onclick="window.toggleChatAi(${userChat.id})" class="text-blue-200 hover:text-white p-1" title="${userChat.aiEnabled ? 'KI deaktivieren' : 'KI aktivieren'}">
                            <i data-lucide="${userChat.aiEnabled ? 'bot' : 'user'}" class="w-5 h-5 sm:w-5 sm:h-5"></i>
                        </button>
                        <!-- Mobile Close Button -->
                        <button onclick="window.toggleSupportChat()" class="text-blue-200 hover:text-white p-1 cursor-pointer">
                            <i data-lucide="x" class="w-6 h-6 sm:w-5 sm:h-5"></i>
                        </button>
                    </div>
                </div>

                <!-- Messages -->
                <div id="support-messages" class="flex-1 p-3 sm:p-4 overflow-y-auto bg-gray-50 flex flex-col scroll-smooth">
                    ${messagesHtml}
                </div>

                <!-- Input Area -->
                <div class="bg-white border-t border-gray-200 p-2 sm:p-3 flex flex-col gap-2 z-10 shrink-0">
                    ${userChat.aiEnabled ? `
                        <div class="flex items-center gap-2 px-1 mb-1">
                            <span class="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase">Modus:</span>
                            <select onchange="window.setUserAiPreference(this.value)" class="text-[9px] sm:text-[10px] border border-gray-200 rounded bg-gray-50 px-1 py-0.5 outline-none cursor-pointer">
                                <option value="Think" ${currentUserAiPreference === 'Think' ? 'selected' : ''}>Erklären & Nachdenken</option>
                                <option value="Response" ${currentUserAiPreference === 'Response' ? 'selected' : ''}>Direkte Antwort</option>
                            </select>
                        </div>
                    ` : ''}
                    <div class="flex gap-2 items-end">
                        <textarea id="support-input" rows="1" placeholder="Schreibe eine Nachricht..." class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500 resize-none max-h-24 overflow-y-auto bg-gray-50 focus:bg-white transition-colors" onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); window.sendSupportMessage(); }"></textarea>
                        <button onclick="window.sendSupportMessage()" class="bg-blue-900 text-white p-2.5 rounded-lg hover:bg-blue-800 transition-colors shadow-sm cursor-pointer shrink-0">
                            <i data-lucide="send" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div class="text-[8px] sm:text-[9px] text-center text-gray-400 mt-1">
                        ${userChat.aiEnabled ? 'KI kann Fehler machen. Überprüfe wichtige Informationen.' : 'Wir antworten so schnell wie möglich.'}
                    </div>
                </div>
            </div>
            `;
        }

        function renderFooter() {
            return `
            <footer class="bg-black text-white mt-8 sm:mt-12 py-8 sm:py-12 px-4 font-sans">
                <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div>
                        <h2 class="text-xl sm:text-2xl font-black uppercase font-serif mb-3 sm:mb-4">Winterthur Times</h2>
                        <p class="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">Unabhängiges Schulprojekt. Von der MSW.</p>
                        <div class="flex gap-4">
                            <span onclick="window.showModal('Social Media', 'Unsere Social-Media-Kanäle sind in dieser Demo noch nicht verknüpft.')" class="cursor-pointer text-gray-400 hover:text-white transition-colors"><i data-lucide="facebook" class="w-5 h-5"></i></span>
                            <span onclick="window.showModal('Social Media', 'Unsere Social-Media-Kanäle sind in dieser Demo noch nicht verknüpft.')" class="cursor-pointer text-gray-400 hover:text-white transition-colors"><i data-lucide="twitter" class="w-5 h-5"></i></span>
                            <span onclick="window.showModal('Social Media', 'Unsere Social-Media-Kanäle sind in dieser Demo noch nicht verknüpft.')" class="cursor-pointer text-gray-400 hover:text-white transition-colors"><i data-lucide="instagram" class="w-5 h-5"></i></span>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-bold uppercase tracking-wider mb-3 sm:mb-4 text-gray-300 text-sm">Ressorts</h4>
                        <ul class="flex flex-col gap-2 text-sm text-gray-400">
                            ${categories.slice(0, 8).map(cat => `<li><span onclick="window.executeSearchCategory('${cat}'); window.scrollTo(0,0);" class="cursor-pointer hover:text-white transition-colors py-1 block">${cat}</span></li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold uppercase tracking-wider mb-3 sm:mb-4 text-gray-300 text-sm">Service</h4>
                        <ul class="flex flex-col gap-2 text-sm text-gray-400">
                            <li><span onclick="window.setView('gallery'); window.scrollTo(0,0);" class="cursor-pointer hover:text-white transition-colors py-1 block">Tagesbilder (Community)</span></li>
                            <li><span onclick="window.showModal('Abonnements', 'Unsere Abo-Angebote werden derzeit überarbeitet.')" class="cursor-pointer hover:text-white transition-colors py-1 block">Abonnements</span></li>
                            <li><span onclick="window.showModal('Newsletter', 'Unsere Newsletter sind leider noch nicht verfügbar.')" class="cursor-pointer hover:text-white transition-colors py-1 block">Newsletter</span></li>
                            <li><span onclick="window.openFeedbackChat()" class="cursor-pointer text-blue-400 font-bold hover:text-white transition-colors flex items-center gap-1 py-1"><i data-lucide="message-square-plus" class="w-4 h-4"></i> Website bewerten</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold uppercase tracking-wider mb-3 sm:mb-4 text-gray-300 text-sm">Verlag</h4>
                        <ul class="flex flex-col gap-2 text-sm text-gray-400">
                            <li><span onclick="window.setView('authors'); window.scrollTo(0,0);" class="cursor-pointer hover:text-white transition-colors py-1 block">Unsere Autoren</span></li>
                            <li><span onclick="window.showModal('Über uns', 'Die Winterthur Times ist eine Demo-Umgebung.')" class="cursor-pointer hover:text-white transition-colors py-1 block">Über uns</span></li>
                            <li><span onclick="if(!isSupportChatOpen) window.toggleSupportChat();" class="cursor-pointer hover:text-white transition-colors py-1 block">Kontakt</span></li>
                            <li class="mt-6 border-t border-gray-800 pt-4">
                                <button onclick="window.setView('admin-login')" class="text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1 text-[10px] sm:text-xs uppercase tracking-wider font-bold">
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
                <div class="bg-white w-[80%] max-w-sm h-full shadow-2xl flex flex-col animate-slide-in">
                    <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h2 class="text-xl sm:text-2xl font-black uppercase font-serif tracking-tight">Menü</h2>
                        <button onclick="window.toggleMenu()" class="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-600">
                            <i data-lucide="x" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                        </button>
                    </div>
                    <nav class="flex-1 overflow-y-auto p-2 sm:p-4 bg-white">
                        <ul class="flex flex-col gap-1 font-sans font-bold text-base sm:text-lg text-gray-800">
                            <li><button onclick="window.setView('home'); window.toggleMenu();" class="w-full text-left px-4 py-3 sm:py-4 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors flex items-center justify-between group">Startseite <i data-lucide="chevron-right" class="w-4 h-4 opacity-50 sm:opacity-0 group-hover:opacity-100 transition-opacity"></i></button></li>
                            <li><button onclick="window.setView('gallery'); window.toggleMenu();" class="w-full text-left px-4 py-3 sm:py-4 hover:bg-green-50 hover:text-green-700 rounded transition-colors flex items-center justify-between group">Tagesbilder <i data-lucide="chevron-right" class="w-4 h-4 opacity-50 sm:opacity-0 group-hover:opacity-100 transition-opacity"></i></button></li>
                            ${categories.map(cat => `<li><button onclick="window.executeSearchCategory('${cat}'); window.toggleMenu();" class="w-full text-left px-4 py-3 sm:py-4 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors flex items-center justify-between group">${cat} <i data-lucide="chevron-right" class="w-4 h-4 opacity-50 sm:opacity-0 group-hover:opacity-100 transition-opacity"></i></button></li>`).join('')}
                        </ul>
                    </nav>
                </div>
                <div class="flex-1 cursor-pointer" onclick="window.toggleMenu()" title="Menü schließen"></div>
            </div>`;
        }

        function renderModal() {
            if (!currentModal) return '';

            if (currentModal.type === 'image') {
                return `
                <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4" onclick="window.closeModal()">
                    <div class="relative max-w-4xl w-full flex justify-center" onclick="event.stopPropagation()">
                        <button onclick="window.closeModal()" class="absolute -top-10 sm:-top-12 right-0 text-white hover:text-gray-300 cursor-pointer p-2"><i data-lucide="x" class="w-6 h-6 sm:w-8 sm:h-8"></i></button>
                        <img src="${currentModal.url}" class="max-w-full max-h-[85vh] rounded object-contain shadow-2xl" alt="Vollbild" />
                    </div>
                </div>`;
            }

            return `
            <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
                <div class="bg-white p-6 sm:p-8 rounded-sm shadow-xl max-w-sm w-full font-sans animate-fade-in max-h-[90vh] overflow-y-auto">
                    <h3 class="text-xl sm:text-2xl font-black mb-2 sm:mb-3">${currentModal.title}</h3>
                    ${currentModal.message ? `<p class="text-sm sm:text-base text-gray-600 mb-6 leading-relaxed">${currentModal.message}</p>` : ''}
                    
                    ${currentModal.type === 'login' ? `
                        <div class="flex flex-col gap-3 mb-6">
                            <input type="text" id="usernameInput" placeholder="Benutzername oder E-Mail" class="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans text-sm" onkeypress="if(event.key === 'Enter') { event.preventDefault(); document.getElementById('passwordInput').focus(); }" />
                            <input type="password" id="passwordInput" placeholder="Passwort" class="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans text-sm" onkeypress="if(event.key === 'Enter') { event.preventDefault(); window.loginUser(); }" />
                            <p id="loginWarning" class="text-red-500 text-xs sm:text-sm hidden font-bold mt-1"></p>
                        </div>
                        <div class="flex flex-col gap-3">
                            <button onclick="window.loginUser()" class="w-full bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition-colors cursor-pointer text-sm">Einloggen</button>
                            <div class="text-center text-xs sm:text-sm text-gray-600 mt-1">
                                Noch keinen Account? <button onclick="window.showUserRegister()" class="text-blue-700 font-bold hover:underline cursor-pointer">Hier erstellen</button>
                            </div>
                            <button onclick="window.closeModal()" class="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded hover:bg-gray-300 transition-colors cursor-pointer mt-2 text-sm">Abbrechen</button>
                        </div>
                    ` : currentModal.type === 'register' ? `
                        <div class="flex flex-col gap-3 mb-6">
                            <input type="text" id="usernameInput" placeholder="Benutzername" class="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans text-sm" onkeypress="if(event.key === 'Enter') { event.preventDefault(); document.getElementById('firstNameInput').focus(); }" />
                            <input type="text" id="firstNameInput" placeholder="Vorname" class="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans text-sm" onkeypress="if(event.key === 'Enter') { event.preventDefault(); document.getElementById('lastNameInput').focus(); }" />
                            <input type="text" id="lastNameInput" placeholder="Nachname" class="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans text-sm" onkeypress="if(event.key === 'Enter') { event.preventDefault(); document.getElementById('emailInput').focus(); }" />
                            <input type="email" id="emailInput" placeholder="E-Mail" class="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans text-sm" onkeypress="if(event.key === 'Enter') { event.preventDefault(); document.getElementById('passwordInput').focus(); }" />
                            <input type="password" id="passwordInput" placeholder="Passwort" class="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-sans text-sm" onkeypress="if(event.key === 'Enter') { event.preventDefault(); window.registerUser(); }" />
                            <p id="loginWarning" class="text-red-500 text-xs sm:text-sm hidden font-bold mt-1"></p>
                        </div>
                        <div class="flex flex-col gap-3">
                            <button onclick="window.registerUser()" class="w-full bg-green-700 text-white font-bold py-3 rounded hover:bg-green-600 transition-colors cursor-pointer text-sm">Account erstellen</button>
                            <div class="text-center text-xs sm:text-sm text-gray-600 mt-1">
                                Bereits registriert? <button onclick="window.showUserLogin()" class="text-blue-700 font-bold hover:underline cursor-pointer">Hier einloggen</button>
                            </div>
                            <button onclick="window.closeModal()" class="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded hover:bg-gray-300 transition-colors cursor-pointer mt-2 text-sm">Abbrechen</button>
                        </div>
                    ` : currentModal.onConfirm ? `
                        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <button onclick="window.closeModal()" class="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded hover:bg-gray-300 transition-colors cursor-pointer text-sm">Abbrechen</button>
                            <button onclick="window.executeConfirm()" class="w-full bg-red-600 text-white font-bold py-3 rounded hover:bg-red-700 transition-colors cursor-pointer text-sm">Bestätigen</button>
                        </div>
                    ` : `
                        <button onclick="window.closeModal()" class="w-full bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition-colors cursor-pointer text-sm">Verstanden</button>
                    `}
                </div>
            </div>`;
        }

        function renderGatekeeper() {
            return `
            <div class="min-h-[100dvh] flex items-center justify-center bg-gray-100 font-sans px-4">
                <div class="bg-white p-6 sm:p-8 rounded-sm shadow-xl max-w-md w-full text-center border border-gray-200">
                    <h1 class="text-3xl sm:text-4xl font-black font-serif mb-4 uppercase tracking-tighter">Winterthur Times</h1>
                    <div class="bg-blue-50 p-4 rounded mb-6 text-sm text-blue-800 border border-blue-100 text-left">
                        <span class="font-bold block mb-1">Geschlossene Testphase</span>
                        Diese Webseite ist derzeit nur für eingeladene Teilnehmer zugänglich.
                    </div>
                    <p class="mb-2 text-gray-700 text-sm font-bold text-left">Gib deine E-Mail Adresse ein:</p>
                    <input type="email" id="gatekeeperEmail" class="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 mb-2 font-sans text-sm" placeholder="E-Mail Adresse..." onkeypress="if(event.key === 'Enter') window.checkGatekeeperEmail()" />
                    <p id="gatekeeperError" class="text-red-500 text-xs font-bold hidden mb-4 text-left">Diese Website ist noch nicht für dich verfügbar.</p>
                    <button onclick="window.checkGatekeeperEmail()" class="w-full bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition-colors mt-2 shadow-sm cursor-pointer text-sm">Eintreten</button>
                </div>
            </div>`;
        }

        window.checkGatekeeperEmail = function() {
            const input = document.getElementById('gatekeeperEmail');
            const error = document.getElementById('gatekeeperError');
            if (input && input.value.trim().toLowerCase().endsWith('@stud.msw.ch')) {
                hasPassedGatekeeper = true;
                window.renderApp();
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

        window.renderApp = function() {
            preserveFocus();
            
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
            else if (view === 'admin-login') content = renderAdminLogin();
            else if (view === 'admin-dashboard') content = renderAdminDashboard();
            else if (view === 'gallery') content = renderGallery();
            else if (view === 'feedback') content = renderFeedbackChat();

            document.getElementById('app').innerHTML = `
                ${renderTopBar()}
                ${renderHeader()}
                <main class="max-w-7xl mx-auto w-full pb-8 sm:py-8 overflow-hidden">
                    ${content}
                </main>
                ${renderFooter()}
                ${renderMenuOverlay()}
                ${renderSupportChatWidget()}
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
            window.renderApp();
            window.scrollTo(0, 0);

            if (newView === 'feedback') {
                setTimeout(() => {
                    const container = document.getElementById('feedbackContainer');
                    if (container) container.scrollTop = container.scrollHeight;
                }, 100);
            }
        }

        window.openFeedbackChat = function() {
            window.setView('feedback');
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
            window.renderApp();
            
            setTimeout(() => {
                const container = document.getElementById('feedbackContainer');
                if(container) container.scrollTop = container.scrollHeight;
                const inputRef = document.getElementById('feedbackInput');
                if(inputRef) inputRef.focus();
            }, 50);

            window.checkContentWithAi(text, 'feedback', newId, null);
        }

        window.toggleFeedbackLike = function(id) {
            if (!currentUser) {
                pendingView = 'feedback';
                window.showUserLogin();
                return;
            }
            let fb = siteFeedbacks.find(f => f.id === id);
            if (!fb) return;
            if (!fb.likes) fb.likes = [];
            const idx = fb.likes.indexOf(currentUser);
            if (idx > -1) fb.likes.splice(idx, 1);
            else fb.likes.push(currentUser);
            window.saveState();
            window.renderApp();
        }

        window.deleteFeedback = function(id) {
            currentModal = {
                title: 'Feedback löschen?',
                message: 'Möchtest du diesen Eintrag wirklich entfernen?',
                onConfirm: function() {
                    siteFeedbacks = siteFeedbacks.filter(f => f.id !== id);
                    currentModal = null;
                    window.saveState();
                    window.renderApp();
                }
            };
            window.renderApp();
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
                window.showModal('Erfolgreich', 'Dein Bild wurde hochgeladen und ist nun für 24 Stunden für alle sichtbar.');
                window.renderApp();
            };

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) { saveImg(e.target.result); };
                reader.readAsDataURL(fileInput.files[0]);
            } else if (urlInput && urlInput.value.trim() !== '') {
                saveImg(urlInput.value.trim());
            } else {
                window.showModal('Fehler', 'Bitte wähle ein Bild von deinem Gerät aus oder gib eine Bild-URL ein.');
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
                    window.renderApp();
                }
            };
            window.renderApp();
        }

        window.restoreCommunityImage = function(id) {
            if(!isSuperAdmin) return;
            const img = communityImages.find(i => i.id === id);
            if (img) {
                img.isDeleted = false;
                window.saveState();
                window.renderApp();
            }
        }

        window.toggleCommunityImageLike = function(id) {
            if (!currentUser) { window.showUserLogin(); return; }
            let img = communityImages.find(i => i.id === id);
            if (!img) return;
            if (!img.likes) img.likes = []; 
            const index = img.likes.indexOf(currentUser);
            if (index > -1) img.likes.splice(index, 1);
            else img.likes.push(currentUser);
            window.saveState();
            window.renderApp();
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
            window.setView('article');
        }

        window.addCategory = function() {
            if(!hasAdminAccess()) return;
            const input = document.getElementById('newCategoryInput');
            if(!input) return;
            const newCat = input.value.trim();
            if(newCat === '') return;
            if(categories.includes(newCat)) {
                window.showModal('Fehler', 'Dieses Ressort existiert bereits.');
                return;
            }
            categories.push(newCat);
            window.saveState();
            window.renderApp();
            window.showModal('Erfolgreich', `Das Ressort "${newCat}" wurde hinzugefügt.`);
        }

        window.deleteCategory = function(cat) {
            if(!hasAdminAccess()) return;
            const isInUse = articles.some(a => a.category === cat);
            if(isInUse) {
                window.showModal('Fehler', 'Dieses Ressort wird noch in Artikeln verwendet und kann daher nicht gelöscht werden.');
                return;
            }
            categories = categories.filter(c => c !== cat);
            window.saveState();
            window.renderApp();
        }

        window.handleSaveAuthor = function(event) {
            event.preventDefault();
            if(!hasAdminAccess()) return;
            const name = document.getElementById('author-name').value.trim();
            const bio = document.getElementById('author-bio').value.trim();
            const urlInput = document.getElementById('author-image-url').value;
            const fileInput = document.getElementById('author-image-file');

            const saveObj = (imgSrc) => {
                if (editingAuthorId) {
                    const idx = authors.findIndex(a => a.id === editingAuthorId);
                    if (idx > -1) {
                        const oldName = authors[idx].name;
                        if (oldName !== name) {
                            articles.forEach(a => { if (a.author === oldName) a.author = name; });
                        }
                        authors[idx].name = name;
                        authors[idx].bio = bio;
                        if (imgSrc) authors[idx].imageUrl = imgSrc;
                    }
                    editingAuthorId = null;
                    window.showModal('Erfolgreich', 'Der Autor wurde aktualisiert.');
                } else {
                    authors.push({ id: Date.now(), name, bio, imageUrl: imgSrc });
                    window.showModal('Erfolgreich', 'Neuer Autor hinzugefügt.');
                }
                window.saveState();
                window.renderApp();
            };

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) { saveObj(e.target.result); };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                saveObj(urlInput);
            }
        };

        window.editAuthor = function(id) {
            if(!hasAdminAccess()) return;
            editingAuthorId = id;
            window.renderApp();
            setTimeout(() => {
                const author = authors.find(a => a.id === id);
                if(author) {
                    document.getElementById('author-name').value = author.name || '';
                    document.getElementById('author-bio').value = author.bio || '';
                    document.getElementById('author-image-url').value = author.imageUrl || '';
                }
                window.scrollTo(0, 0);
            }, 50);
        };

        window.deleteAuthor = function(id) {
            if(!hasAdminAccess()) return;
            const author = authors.find(a => a.id === id);
            const isInUse = articles.some(a => a.author === author.name);
            if(isInUse) {
                window.showModal('Fehler', 'Dieser Autor hat noch veröffentlichte Artikel. Du kannst ihn nicht löschen, bevor die Artikel einem anderen Autor zugewiesen wurden.');
                return;
            }
            authors = authors.filter(a => a.id !== id);
            window.saveState();
            window.renderApp();
        };

        window.cancelAuthorEdit = function() {
            editingAuthorId = null;
            window.renderApp();
        };

        window.changeUserRole = function(username, newRole) {
            if (!hasAdminAccess()) return;
            const user = registeredUsers.find(u => u.username === username);
            if (user) {
                user.role = newRole;
                window.saveState();
                window.renderApp();
            }
        }

        window.getPopularArticles = function() {
            const items = document.querySelectorAll(".meistgelesen-item");
            return Array.from(items).map(el => el.textContent.trim());
        }

        window.toggleChatAi = function(chatId) {
            let chat = supportChats.find(c => c.id === chatId);
            if (chat) {
                chat.aiEnabled = chat.aiEnabled === false ? true : false;
                window.saveState();
                window.renderApp();
            }
        }

        window.toggleSupportChat = function() {
            isSupportChatOpen = !isSupportChatOpen;
            window.renderApp();
            
            if(isSupportChatOpen) {
                setTimeout(() => {
                    const container = document.getElementById('support-messages');
                    if(container) container.scrollTop = container.scrollHeight;
                    const input = document.getElementById('support-input');
                    if(input) input.focus();
                }, 50);
            }
        }

        window.sendSupportMessage = async function() {
            const input = document.getElementById('support-input');
            if(!input || input.value.trim() === '') return;
            
            const activeChatUser = currentUser || supportUser || ('Gast-' + sessionId);
            if(!activeChatUser) return;
            
            const text = input.value.trim();
            
            let chat = supportChats.find(c => c.userId === activeChatUser);
            if(!chat) {
                chat = { id: Date.now(), userId: activeChatUser, messages: [], aiEnabled: true };
                supportChats.push(chat);
            }
            
            chat.messages.push({
                sender: 'user',
                text: text,
                timestamp: new Date().toISOString()
            });
            
            input.value = '';
            window.saveState();
            window.renderApp();
            
            const scrollDown = () => {
                setTimeout(() => {
                    const container = document.getElementById('support-messages');
                    if(container) container.scrollTop = container.scrollHeight;
                }, 50);
            };
            scrollDown();

            if (chat.aiEnabled) {
                const msgIndex = chat.messages.length;
                chat.messages.push({
                    sender: 'ai',
                    text: '...',
                    isThinking: true,
                    timestamp: new Date().toISOString()
                });
                window.renderApp();
                scrollDown();

                const WORKER_URL = "https://askai.mikestaub705.workers.dev/";
                
                try {
                    const userStatus = currentUser ? `eingeloggt als '${currentUser}' (Rolle: ${getCurrentUserRole()})` : "ein Gast (nicht eingeloggt)";
                    const popularArticles = window.getPopularArticles();
                    const popularContext = popularArticles.length > 0 ? ` Die aktuell meistgelesenen Artikel sind: ${popularArticles.join(', ')}.` : "";
                    const contextPrefix = `[System-Info: Du bist der KI-Support der Zeitung 'Winterthur Times'. Der User ist ${userStatus}. Der User befindet sich aktuell auf der Seite/Ansicht: '${view}'.${popularContext} Antworte hilfreich auf Basis dieser Informationen.]\nNutzerfrage: `;
                    
                    window.isLoggedIn = !!currentUser;

                    const res = await fetch(WORKER_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            message: contextPrefix + text,
                            loggedIn: window.isLoggedIn === true,
                            popularArticles: popularArticles
                        })
                    });
                    const data = await res.json();
                    
                    if (chat.messages[msgIndex]) {
                        chat.messages[msgIndex].isThinking = false;
                        chat.messages[msgIndex].text = data.reply || "Es ist ein Fehler aufgetreten.";
                        window.saveState();
                        window.renderApp();
                        scrollDown();
                    }
                } catch (e) {
                    if (chat.messages[msgIndex]) {
                        chat.messages[msgIndex].isThinking = false;
                        chat.messages[msgIndex].text = "Verbindungsfehler zum Support-Dienst.";
                        window.saveState();
                        window.renderApp();
                        scrollDown();
                    }
                }
            }
        }

        window.adminReplySupportMessage = function(chatId) {
            const input = document.getElementById('adminSupportInput');
            if(!input || input.value.trim() === '') return;
            
            const chat = supportChats.find(c => c.id === chatId);
            if(chat) {
                chat.messages.push({
                    sender: 'admin',
                    text: input.value.trim(),
                    timestamp: new Date().toISOString()
                });
                window.saveState();
            }
            window.renderApp();
            
            setTimeout(() => {
                const container = document.getElementById('adminChatContainer');
                if(container) container.scrollTop = container.scrollHeight;
                const nextInput = document.getElementById('adminSupportInput');
                if(nextInput) nextInput.focus();
            }, 50);
        }

        window.showUserLogin = function() {
            currentModal = {
                type: 'login',
                title: 'Als Leser anmelden',
                message: 'Bitte logge dich ein, um alle Funktionen nutzen zu können.'
            };
            window.renderApp();
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
            window.renderApp();
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
                signInWithEmailAndPassword(firebaseAuth, mappedEmail, password)
                    .then(() => {
                        currentModal = null;
                        window.renderApp();
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
            if (!existingUser) { showWarning("Benutzer nicht gefunden. Hast du schon einen Account erstellt?"); return; }
            if (existingUser.isBanned) { showWarning("Dein Account wurde gesperrt. Bitte wende dich an den Support."); return; }
            if (existingUser.isDeleted) { showWarning("Dein Account wurde gelöscht. Bitte wende dich an den Support."); return; }
            if (existingUser.password !== password) { showWarning("Falsches Passwort! Bitte versuche es erneut."); return; }

            currentUser = username;
            currentModal = null; 
            
            if (pendingChatOpen) { isSupportChatOpen = true; pendingChatOpen = false; }
            if (pendingView) { window.setView(pendingView); pendingView = null; } 
            else { window.renderApp(); }

            if(isSupportChatOpen) {
                setTimeout(() => {
                    const input = document.getElementById('support
