
// ------------------------------------------------------
// Sicheres Artikel-Speichern: neue Artikel anhängen statt bestehende ersetzen
// ------------------------------------------------------
async function wtGetLatestArticlesFromFirebaseForSave() {
    try {
        if (typeof firebaseDb !== "undefined" && firebaseDb) {
            const doc = await firebaseDb.collection("data").doc("articles").get();
            const data = doc.exists ? doc.data() : {};
            if (Array.isArray(data.articles)) return data.articles;
        }
    } catch (err) {
        console.warn("Konnte aktuelle Firebase-Artikel nicht laden, verwende lokale Liste:", err);
    }

    try {
        if (typeof articles !== "undefined" && Array.isArray(articles)) return articles.slice();
    } catch (_) {}

    if (Array.isArray(window.articles)) return window.articles.slice();
    return [];
}

function wtMergeArticleListsForSave(existingList, localList, newArticle) {
    const byId = new Map();

    function add(article) {
        if (!article || typeof article !== "object") return;
        const key = String(article.id || article.title || Math.random());
        if (!byId.has(key)) byId.set(key, article);
    }

    (Array.isArray(existingList) ? existingList : []).forEach(add);
    (Array.isArray(localList) ? localList : []).forEach(add);

    if (newArticle && typeof newArticle === "object") {
        byId.set(String(newArticle.id || newArticle.title || Date.now()), newArticle);
    }

    return Array.from(byId.values()).sort((a, b) => {
        const at = new Date(a.timestamp || 0).getTime() || 0;
        const bt = new Date(b.timestamp || 0).getTime() || 0;
        return bt - at;
    });
}

async function wtSaveArticleAppendOnly(newArticle) {
    const latestFromFirebase = await wtGetLatestArticlesFromFirebaseForSave();

    let localArticles = [];
    try {
        if (typeof articles !== "undefined" && Array.isArray(articles)) localArticles = articles;
    } catch (_) {}
    if (!localArticles.length && Array.isArray(window.articles)) localArticles = window.articles;

    const mergedArticles = wtMergeArticleListsForSave(latestFromFirebase, localArticles, newArticle);

    try {
        if (typeof articles !== "undefined" && Array.isArray(articles)) {
            articles.splice(0, articles.length, ...mergedArticles);
        }
    } catch (_) {}
    window.articles = mergedArticles;

    if (typeof window.wtPersistArticlesSafely === "function") {
        return await window.wtPersistArticlesSafely(mergedArticles);
    }

    if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
        await firebaseDb.collection("data").doc("articles").set({
            articles: mergedArticles,
            authors: typeof authors !== "undefined" && Array.isArray(authors) ? authors : (Array.isArray(window.authors) ? window.authors : []),
            categories: typeof categories !== "undefined" && Array.isArray(categories) ? categories : (Array.isArray(window.categories) ? window.categories : []),
            communityImages: typeof communityImages !== "undefined" && Array.isArray(communityImages) ? communityImages : [],
            siteFeedbacks: typeof siteFeedbacks !== "undefined" && Array.isArray(siteFeedbacks) ? siteFeedbacks : [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return mergedArticles;
    }

    throw new Error("Firebase ist noch nicht bereit. Bitte kurz warten und nochmals speichern.");
}


/**
 * Winterthur Times - Admin Zentrale
 * Diese Datei enthält ausschließlich Logik und Ansichten für Redakteure und Administratoren.
 */

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/`/g, "&#096;");
}

function formatErrorDetails(baseMessage, error) {
    let details = error instanceof Error ? error.message : String(error);
    let stack = (error instanceof Error && error.stack) ? error.stack : 'Kein Stacktrace verfügbar';
    return `${baseMessage}<div class="mt-3 bg-red-50 text-red-900 border border-red-200 p-3 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-48 text-left leading-tight"><strong>System-Details:</strong>\n${escapeHtml(details)}\n\n<strong>Stack:</strong>\n${escapeHtml(stack)}</div>`;
}

window.renderAdminLogin = function() {
    return `
    <div class="max-w-md mx-auto bg-white p-8 border border-gray-200 shadow-md rounded-sm mt-12">
        <div class="text-center mb-6">
            <i data-lucide="lock" class="mx-auto h-12 w-12 text-blue-900 mb-2"></i>
            <h2 class="text-2xl font-black uppercase font-sans">main-Admin Login</h2>
        </div>
        <form onsubmit="handleLogin(event)" class="flex flex-col gap-4 font-sans">
            <div>
                <label class="block text-sm font-bold mb-2">Master-Passwort</label>
                <input type="password" id="adminPassword" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600" placeholder="Passwort eingeben..." />
            </div>
            <p id="loginError" class="text-red-500 text-sm font-bold hidden">Falsches Passwort!</p>
            <button type="submit" class="bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition-colors cursor-pointer">Anmelden</button>
            <p class="text-xs text-gray-500 text-center mt-2">Hinweis: Als normaler Autor oder Admin reicht der normale Login-Button oben rechts.</p>
        </form>
    </div>`;
}

window.renderAdminDashboard = function() {
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
                Support <span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">${supportChats.length}</span>
            </button>` : ''}
            ${hasAdminAccess() ? `<button onclick="adminTab='backup'; renderApp()" class="px-6 py-3 font-bold uppercase text-sm rounded-t flex items-center gap-2 ${adminTab === 'backup' ? 'bg-white text-blue-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-blue-600'}">
                <i data-lucide="database" class="w-4 h-4"></i> Backup
            </button>` : ''}
        </div>

        <div class="p-6 md:p-8">
            ${adminTab === 'articles' ? `
                <div id="wt-advanced-article-editor-host" class="mb-8"></div>

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

            ` : adminTab === 'categories' && hasAdminAccess() ? renderAdminCategoriesTab() : adminTab === 'authors' && hasAdminAccess() ? renderAdminAuthorsTab() : adminTab === 'users' && hasAdminAccess() ? `
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
                                    <select id="wt-role-select-${u.username}" data-wt-role-username="${u.username}" onchange="changeUserRole('${u.username}', this.value, { silent: true })" class="border border-gray-300 rounded px-2 py-1 text-sm bg-white cursor-pointer font-bold focus:outline-none focus:border-blue-500">
                                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>Benutzer</option>
                                        <option value="author" ${u.role === 'author' ? 'selected' : ''}>Autor</option>
                                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    </select>
                                    <button type="button" onclick="saveUserRoleFromButton('${u.username}')" class="wt-user-role-save-btn">Rolle speichern</button>
                                    <span id="wt-role-status-${u.username}" class="wt-user-role-save-status"></span>
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

            ` : adminTab === 'support' && hasAdminAccess() ? (() => {
                window.adminSupportFilter = window.adminSupportFilter || 'active';
                
                const nowTime = Date.now();
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                supportChats.forEach(c => {
                    if (c.messages.length > 0) {
                        const lastMsg = c.messages[c.messages.length - 1];
                        if (c.adminDeleted && lastMsg.sender === 'user') {
                            c.adminDeleted = false; 
                        }
                        const lastMsgTime = new Date(lastMsg.timestamp).getTime();
                        if (!c.adminDeleted && (nowTime - lastMsgTime) > sevenDaysMs) {
                            c.adminDeleted = true; 
                        }
                    }
                });

                const filteredChats = supportChats.filter(c => window.adminSupportFilter === 'archived' ? c.adminDeleted : !c.adminDeleted);
                
                filteredChats.sort((a, b) => {
                    const timeA = a.messages.length > 0 ? new Date(a.messages[a.messages.length-1].timestamp).getTime() : 0;
                    const timeB = b.messages.length > 0 ? new Date(b.messages[b.messages.length-1].timestamp).getTime() : 0;
                    return timeB - timeA;
                });

                // Baue die linke Spalte (Chat-Liste)
                let leftColHtml = filteredChats.length === 0 
                    ? '<p class="p-4 text-gray-500 italic text-sm">Keine Anfragen in dieser Ansicht.</p>' 
                    : filteredChats.map(c => {
                        const lastMsg = c.messages[c.messages.length - 1];
                        const isSelected = String(adminSelectedChatId) === String(c.id);
                        const isUnread = lastMsg && lastMsg.sender === 'user';
                        
                        const user = registeredUsers.find(u => u.username === c.userId);
                        const isBanned = user ? user.isBanned : false;
                        
                        return `
                            <div onclick="adminSelectedChatId = '${c.id}'; renderApp()" class="p-4 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'} relative">
                                <div class="flex justify-between items-start mb-1">
                                    <span class="font-bold text-sm ${isUnread ? 'text-blue-900' : 'text-gray-700'} truncate flex items-center gap-1" title="${c.userId}">
                                        ${c.userId.length > 15 ? c.userId.substring(0, 15) + '...' : c.userId}
                                        ${isBanned ? '<span class="bg-red-600 text-white text-[8px] px-1 rounded uppercase" title="Account gesperrt">Gesperrt</span>' : ''}
                                    </span>
                                    <span class="text-[10px] text-gray-400 mr-3">${lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                                </div>
                                <p class="text-xs text-gray-500 truncate pr-3 ${isUnread ? 'font-bold text-gray-800' : ''}">${lastMsg ? escapeHtml(lastMsg.text || lastMsg.content || '') : 'Neuer Chat'}</p>
                            </div>
                        `;
                    }).join('');

                // Baue die rechte Spalte (Chat-Details)
                let rightColHtml = '';
                if (!adminSelectedChatId) {
                    rightColHtml = `
                        <div class="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
                            <i data-lucide="message-square" class="w-12 h-12 opacity-50"></i>
                            <p>Wähle einen Chat aus der Liste aus.</p>
                        </div>
                    `;
                } else {
                    const chat = supportChats.find(c => String(c.id) === String(adminSelectedChatId));
                    if (!chat) {
                        rightColHtml = '<p class="p-4">Chat nicht gefunden.</p>';
                    } else {
                        const user = registeredUsers.find(u => u.username === chat.userId);
                        const isBanned = user ? user.isBanned : false;
                        
                        const messagesHtml = chat.messages.map((m, index) => `
                            <div class="flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}">
                                <div class="max-w-[85%] rounded-lg p-3 ${m.sender === 'admin' ? 'bg-blue-900 text-white rounded-br-none' : 'bg-white border border-gray-300 text-gray-800 rounded-bl-none'} shadow-sm">
                                    <p class="text-sm">${escapeHtml(m.text || m.content || '')}</p>
                                    <div class="flex justify-between items-center mt-1 gap-4">
                                        <span class="text-[10px] opacity-75 block ${m.sender === 'user' ? 'text-left text-gray-400' : 'text-blue-200 text-right w-full'}">${new Date(m.timestamp).toLocaleString('de-DE')}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('');

                        rightColHtml = `
                            <div class="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                                <h4 ${user ? `onclick="viewUserDetails('${chat.userId}')"` : ''} class="font-bold text-blue-900 flex items-center gap-2 ${user ? 'cursor-pointer hover:text-blue-700 hover:underline' : ''}" title="${user ? 'Zum Profil von ' + chat.userId : 'Gast-Nutzer'}">
                                    ${user ? getUserAvatar(chat.userId, 'w-6 h-6', 'w-3 h-3', false) : '<i data-lucide="user" class="w-5 h-5"></i>'}
                                    <span class="hidden sm:inline">Chat mit</span> ${chat.userId.length > 10 ? chat.userId.substring(0, 10)+'...' : chat.userId}
                                    ${isBanned ? '<span class="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase ml-2 no-underline">Gesperrt</span>' : ''}
                                    ${!user ? '<span class="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase ml-2 no-underline">Gast</span>' : ''}
                                </h4>
                                <div class="flex items-center gap-2">
                                    <button onclick="toggleChatAi('${chat.id}')"
                                        title="${chat.aiEnabled !== false ? 'KI deaktivieren' : 'KI aktivieren'}"
                                        class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer
                                        ${chat.aiEnabled !== false
                                            ? 'bg-green-50 border-green-300 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                                            : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-700'}">
                                        <i data-lucide="${chat.aiEnabled !== false ? 'bot' : 'bot-off'}" class="w-3.5 h-3.5"></i>
                                        <span class="hidden sm:inline">KI ${chat.aiEnabled !== false ? 'AN' : 'AUS'}</span>
                                    </button>
                                    ${!chat.adminDeleted ? `
                                        <button onclick="adminArchiveChat('${chat.id}')" class="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="In den Papierkorb verschieben">
                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> <span class="hidden sm:inline">Löschen</span>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            
                            ${chat.adminDeleted ? `
                                <div class="bg-gray-800 text-white p-3 flex flex-col sm:flex-row justify-between items-center gap-3 z-10 shadow-inner">
                                    <span class="text-xs font-bold flex items-center gap-1"><i data-lucide="archive" class="w-4 h-4 text-gray-400"></i> Dieser Chat ist im Papierkorb.</span>
                                    <div class="flex gap-2">
                                        <button onclick="adminRestoreChat('${chat.id}')" class="text-xs bg-white text-gray-900 px-3 py-1.5 rounded font-bold hover:bg-gray-200 transition-colors cursor-pointer">Wiederherstellen</button>
                                        <button onclick="adminDeleteChat('${chat.id}')" class="text-xs bg-red-600 text-white px-3 py-1.5 rounded font-bold hover:bg-red-700 transition-colors cursor-pointer">Endgültig löschen</button>
                                    </div>
                                </div>
                            ` : ''}

                            <div class="flex-1 p-4 overflow-y-auto flex flex-col gap-3 ${chat.adminDeleted ? 'opacity-70 bg-gray-100' : ''}" id="adminChatContainer">
                                ${messagesHtml}
                            </div>
                            
                            <div class="p-3 bg-white border-t border-gray-200 flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                                <input type="text" id="adminSupportInput" placeholder="${chat.adminDeleted ? 'Chat ist archiviert. Bitte zuerst wiederherstellen.' : 'Deine manuelle Antwort schreiben...'}" class="flex-1 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-blue-500 font-sans text-sm ${chat.adminDeleted ? 'bg-gray-100 cursor-not-allowed' : ''}" onkeypress="if(event.key === 'Enter' && !${chat.adminDeleted}) adminReplySupportMessage('${chat.id}')" ${chat.adminDeleted ? 'disabled' : ''} />
                                <button onclick="adminReplySupportMessage('${chat.id}')" class="${chat.adminDeleted ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-900 hover:bg-blue-800 cursor-pointer'} text-white px-6 py-2 rounded font-bold transition-colors text-sm flex items-center gap-2" ${chat.adminDeleted ? 'disabled' : ''}>
                                    Senden <i data-lucide="send" class="w-4 h-4"></i>
                                </button>
                            </div>
                        `;
                    }
                }

                return `
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 border-b pb-4 gap-4">
                    <h3 class="text-xl font-bold uppercase flex items-center gap-2"><i data-lucide="help-circle" class="text-blue-600"></i> Support-Anfragen</h3>
                    <div class="flex gap-2">
                        <button onclick="window.adminSupportFilter = 'active'; renderApp()" class="px-4 py-1.5 rounded-full text-sm font-bold transition-colors shadow-sm cursor-pointer ${window.adminSupportFilter !== 'archived' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}">Aktiv</button>
                        <button onclick="window.adminSupportFilter = 'archived'; renderApp()" class="px-4 py-1.5 rounded-full text-sm font-bold transition-colors shadow-sm cursor-pointer ${window.adminSupportFilter === 'archived' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}">Papierkorb (${supportChats.filter(c => c.adminDeleted).length})</button>
                    </div>
                </div>
                
                <div class="flex flex-col md:flex-row gap-6 h-auto md:h-[600px] min-h-[500px]">
                    <div class="w-full md:w-1/3 border border-gray-200 rounded bg-white overflow-y-auto max-h-[300px] md:max-h-full">
                        ${leftColHtml}
                    </div>
                    
                    <div class="w-full md:w-2/3 border border-gray-200 rounded bg-gray-50 flex flex-col relative min-h-[400px] md:min-h-0">
                        ${rightColHtml}
                    </div>
                </div>
                `;
            })() : adminTab === 'backup' && hasAdminAccess() ? `
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

// -----------------------------------------
// Logik für Kategorien, Autoren & Support
// -----------------------------------------

window.addCategory = function() {
    if(!hasAdminAccess()) return;
    const input = document.getElementById('newCategoryInput');
    if(!input) return;
    const newCat = input.value.trim();
    if(newCat === '') return;
    if(categories.includes(newCat)) {
        showModal('Fehler', 'Dieses Ressort existiert bereits.');
        return;
    }
    categories.push(newCat);
    window.saveState();
    renderApp();
    showModal('Erfolgreich', `Das Ressort "${newCat}" wurde hinzugefügt.`);
}

window.deleteCategory = function(cat) {
    if(!hasAdminAccess()) return;
    const isInUse = articles.some(a => a.category === cat);
    if(isInUse) {
        showModal('Fehler', 'Dieses Ressort wird noch in Artikeln verwendet und kann daher nicht gelöscht werden.');
        return;
    }
    categories = categories.filter(c => c !== cat);
    window.saveState();
    renderApp();
}

window.handleSaveAuthor = async function(event) {
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
            showModal('Erfolgreich', 'Der Autor wurde aktualisiert.');
        } else {
            authors.push({ id: Date.now(), name, bio, imageUrl: imgSrc });
            showModal('Erfolgreich', 'Neuer Autor hinzugefügt.');
        }
        window.saveState();
        renderApp();
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
            // Profilbild auf max 512px skalieren (wie andere Profilbilder)
            const resized = await resizeImageFile(fileInput.files[0], { maxSize: 512, quality: 0.82, preferWebp: false });
            if (resized.dataUrl) {
                saveObj(resized.dataUrl);
            } else {
                // Fallback, falls das Skalieren fehlschlägt
                const reader = new FileReader();
                reader.onload = function(e) { saveObj(e.target.result); };
                reader.readAsDataURL(fileInput.files[0]);
            }
        } catch (error) {
            console.error('Fehler beim Skalieren des Profilbildes:', error);
            showModal('Fehler', formatErrorDetails('Das Bild konnte nicht verarbeitet werden.', error));
        }
    } else {
        saveObj(urlInput);
    }
};

window.editAuthor = function(id) {
    if(!hasAdminAccess()) return;
    editingAuthorId = id;
    renderApp();
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
        showModal('Fehler', 'Dieser Autor hat noch veröffentlichte Artikel. Du kannst ihn nicht löschen, bevor die Artikel einem anderen Autor zugewiesen wurden.');
        return;
    }
    authors = authors.filter(a => a.id !== id);
    window.saveState();
    renderApp();
};

window.cancelAuthorEdit = function() {
    editingAuthorId = null;
    renderApp();
};


window.changeUserRole = async function(username, newRole, options = {}) {
    if (!hasAdminAccess()) return false;

    const users = (typeof registeredUsers !== "undefined" && Array.isArray(registeredUsers))
        ? registeredUsers
        : (Array.isArray(window.registeredUsers) ? window.registeredUsers : []);

    const user = users.find(u =>
        String(u.username) === String(username) ||
        String(u.email) === String(username) ||
        String(u.uid) === String(username) ||
        String(u.id) === String(username)
    );

    const statusEl = document.getElementById(`wt-role-status-${username}`);

    if (!user) {
        if (statusEl) {
            statusEl.textContent = "Benutzer nicht gefunden.";
            statusEl.classList.add("error");
        }
        if (!options.silent && typeof showModal === "function") showModal("Fehler", "Benutzer nicht gefunden.");
        return false;
    }

    const previousRole = user.role || "user";
    const previousIsAdmin = !!user.isAdmin;
    const previousIsSuperAdmin = !!user.isSuperAdmin;

    user.role = newRole;
    user.isAdmin = newRole === "admin" || newRole === "superadmin";
    user.isSuperAdmin = newRole === "superadmin";

    if (statusEl) {
        statusEl.textContent = "Speichere...";
        statusEl.classList.remove("error");
    }

    try {
        await saveRegisteredUsersRolesNow();

        if (statusEl) {
            statusEl.textContent = "Rolle gespeichert.";
            statusEl.classList.remove("error");
        }

        if (!options.noRender) {
            renderApp();
        }

        return true;
    } catch (err) {
        user.role = previousRole;
        user.isAdmin = previousIsAdmin;
        user.isSuperAdmin = previousIsSuperAdmin;

        console.error("Rolle konnte nicht gespeichert werden:", err);

        if (statusEl) {
            statusEl.textContent = "Speichern fehlgeschlagen.";
            statusEl.classList.add("error");
        }

        if (!options.silent && typeof showModal === "function") {
            showModal("Fehler", "Die Rolle konnte nicht gespeichert werden. Bitte versuche es erneut.");
        }

        return false;
    }
}


window.toggleChatAi = async function(chatId) {
    if (!hasAdminAccess()) return;

    const chat = supportChats.find(c => String(c.id) === String(chatId));
    if (!chat) return;

    const nextAiEnabled = chat.aiEnabled === false;
    chat.aiEnabled = nextAiEnabled;
    window.saveState();
    renderApp();

    try {
        const res = await fetch("https://askai.mikestaub705.workers.dev/api/admin/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                password: ADMIN_MASTER_PASSWORD,
                chatId: chatId,
                aiEnabled: nextAiEnabled
            })
        });

        if (!res.ok) {
            throw new Error(`Server antwortete mit Status ${res.status}: ${res.statusText}`);
        }

        await refreshAdminSupportChatsFromWorker(ADMIN_MASTER_PASSWORD, true);
    } catch (err) {
        console.error("Fehler beim Umschalten der KI:", err);
        chat.aiEnabled = !nextAiEnabled;
        window.saveState();
        renderApp();
        if (typeof showModal === "function") {
            showModal("Fehler", "Der KI-Status konnte nicht gespeichert werden. Bitte versuche es erneut.");
        }
    }
};

window.adminReplySupportMessage = async function(chatId) {
    const input = document.getElementById('adminSupportInput');
    if (!input || input.value.trim() === '') return;

    const text = input.value.trim();

    // 1) Lokal speichern (damit Admin es sofort sieht)
    const chat = supportChats.find(c => String(c.id) === String(chatId));
    if (chat) {
        chat.messages.push({
            sender: 'admin',
            text: text,
            timestamp: new Date().toISOString()
        });
        window.saveState();
    }

    renderApp();

    // 2) AN DEN WORKER SENDEN (damit der Kunde es bekommt)
    try {
        await fetch("https://askai.mikestaub705.workers.dev/api/admin/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                password: ADMIN_MASTER_PASSWORD,
                chatId: chatId,
                message: text
            })
        });
        await refreshAdminSupportChatsFromWorker(ADMIN_MASTER_PASSWORD, true);
    } catch (err) {
        console.error("Fehler beim Senden an Worker:", err);
    }

    // 3) Scrollen + Fokus
    setTimeout(() => {
        const container = document.getElementById('adminChatContainer');
        if (container) container.scrollTop = container.scrollHeight;
        const nextInput = document.getElementById('adminSupportInput');
        if (nextInput) nextInput.focus();
    }, 50);
};

// -----------------------------------------
// Logik für Artikel bearbeiten / erstellen
// -----------------------------------------

window.editArticle = function(id) {
    if(!hasAuthorAccess()) return;
    adminTab = 'articles';
    editingArticleId = null;
    renderApp();

    const openAdvanced = () => {
        if (window.loadArticleIntoAdvancedEditorById) {
            window.loadArticleIntoAdvancedEditorById(id);
        } else {
            setTimeout(openAdvanced, 150);
        }
    };
    setTimeout(openAdvanced, 100);
}

window.cancelEdit = function() {
    editingArticleId = null;
    if (window.cancelAdvancedArticleEdit) {
        window.cancelAdvancedArticleEdit();
    }
    renderApp();
}

window.handleCreateArticle = async function(event) {
    event.preventDefault();
    if(!hasAuthorAccess()) return;
    const isEilmeldung = document.getElementById('new-eilmeldung') ? document.getElementById('new-eilmeldung').checked : false;
    const fileInput = document.getElementById('new-image-file');
    const urlInput = document.getElementById('new-image-url').value;
    const title = document.getElementById('new-title').value;
    const category = document.getElementById('new-category').value;
    const author = document.getElementById('new-author').value || 'Redaktion';
    const summary = document.getElementById('new-summary').value;
    const content = document.getElementById('new-content').value;
    

    const sourcesVal = document.getElementById('new-sources') ? document.getElementById('new-sources').value : '';
    const sources = sourcesVal.split(',').map(s => s.trim()).filter(s => s !== '');
    

    const autoDeleteVal = document.getElementById('new-autodelete') ? document.getElementById('new-autodelete').value : '';
    const autoDeleteDate = autoDeleteVal ? new Date(autoDeleteVal).toISOString() : null;

    const saveArticle = async (imgSrc) => {
        if (editingArticleId) {
            const idx = articles.findIndex(a => a.id === editingArticleId);
            if (idx > -1) {
                articles[idx].title = title;
                articles[idx].category = category;
                articles[idx].author = author;
                articles[idx].summary = summary;
                articles[idx].content = content;
                articles[idx].sources = sources;
                articles[idx].isEilmeldung = isEilmeldung;
                articles[idx].autoDeleteDate = autoDeleteDate;
                if (imgSrc) articles[idx].imageUrl = imgSrc;
            }
            editingArticleId = null;
            showModal('Erfolgreich', 'Der Artikel wurde erfolgreich aktualisiert.');
            window.saveState();
        } else {
            const newArticle = {
                id: Date.now(),
                title: title,
                category: category,
                summary: summary,
                imageUrl: imgSrc,
                content: content,
                author: author,
                timestamp: new Date().toISOString(),
                views: [],
                likes: [],
                comments: [],
                sources: sources,
                isEilmeldung: isEilmeldung,
                autoDeleteDate: autoDeleteDate
            };
            await wtSaveArticleAppendOnly(newArticle);
            notifySubscribersOfArticle(newArticle).catch(err => console.error('Subscriber-Mail fehlgeschlagen:', err));
            showModal('Erfolgreich', 'Der neue Artikel wurde veröffentlicht.');
        }
        adminTab = 'articles';
        renderApp();
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
            // Artikelbilder auf max 1200px skalieren, um Speicher zu sparen
            const resized = await resizeImageFile(fileInput.files[0], { maxSize: 1200, quality: 0.85, preferWebp: false });
            if (resized.dataUrl) {
                await saveArticle(resized.dataUrl);
            } else {
                // Fallback
                const reader = new FileReader();
                reader.onload = function(e) {
                    saveArticle(e.target.result).catch(err => {
                        console.error('Artikel speichern fehlgeschlagen:', err);
                        showModal('Fehler', formatErrorDetails('Der Artikel konnte nicht gespeichert werden.', err));
                    });
                };
                reader.readAsDataURL(fileInput.files[0]);
            }
        } catch (error) {
            console.error('Fehler beim Skalieren des Artikelbildes:', error);
            showModal('Fehler', formatErrorDetails('Das Artikelbild konnte nicht verarbeitet werden.', error));
        }
    } else {
        try {
            await saveArticle(urlInput);
        } catch (error) {
            console.error('Artikel speichern fehlgeschlagen:', error);
            showModal('Fehler', formatErrorDetails('Der Artikel konnte nicht gespeichert werden.', error));
        }
    }
}

window.deleteArticle = function(id) {
    if(!hasAuthorAccess()) return;
    currentModal = {
        title: 'Artikel löschen?',
        message: 'Möchtest du diesen Artikel wirklich unwiderruflich löschen?',
        onConfirm: async function() {
            const articleToDelete = articles.find(a => String(a.id) === String(id));
            if (articleToDelete && typeof window.wtRememberArticleDeleted === "function") {
                window.wtRememberArticleDeleted(articleToDelete);
            }
            articles = articles.filter(a => String(a.id) !== String(id));
            window.articles = articles;
            currentModal = {
                title: 'Gelöscht',
                message: 'Der Artikel wurde erfolgreich aus dem System entfernt.'
            };
            try {
                if (typeof window.wtPersistArticlesSafely === "function") {
                    await window.wtPersistArticlesSafely(articles);
                } else {
                    window.saveState();
                }
            } catch (err) {
                console.error("Artikel-Loeschung konnte nicht gespeichert werden:", err);
                showModal("Fehler", "Der Artikel konnte nicht dauerhaft geloescht werden.");
            }
            renderApp(); 
        }
    };
    renderApp();
}

// -----------------------------------------
// Logik für User Management & Sicherheit
// -----------------------------------------

window.viewUserDetails = function(username) {
    if(!hasAdminAccess()) return;
    adminSelectedUser = username;
    adminTab = 'userDetails';
    renderApp();
}

window.toggleUserBan = function(username) {
    if(!hasAdminAccess()) return;
    const user = registeredUsers.find(u => u.username === username);
    if (user) {
        user.isBanned = !user.isBanned;
        window.saveState();
        renderApp();
    }
}

window.toggleUserDeleted = function(username) {
    if(!hasAdminAccess()) return;
    const user = registeredUsers.find(u => u.username === username);
    if (user) {
        user.isDeleted = !user.isDeleted;
        window.saveState();
        renderApp();
    }
}

window.permanentlyDeleteUser = function(username) {
    if(!hasAdminAccess()) return;
    currentModal = {
        title: 'Account endgültig löschen?',
        message: `Möchtest du den Account "${username}" wirklich unwiderruflich aus der Datenbank entfernen? Dies kann nicht rückgängig gemacht werden.`,
        onConfirm: function() {
            registeredUsers = registeredUsers.filter(u => u.username !== username);
            

            articles.forEach(a => {
                a.views = a.views.filter(v => v !== username);
                a.likes = a.likes.filter(l => l !== username);
                a.comments.forEach(c => {
                    if (c.username === username) {
                        c.username = '[Gelöschter Nutzer]';
                        c.isDeleted = true;
                    }
                    c.likes = c.likes.filter(l => l !== username);
                    if (c.reportedBy) {
                        c.reportedBy = c.reportedBy.filter(r => r !== username);
                    }
                });
            });

            communityImages = communityImages.filter(img => img.uploader !== username);
            communityImages.forEach(img => {
                if (img.likes) {
                    img.likes = img.likes.filter(l => l !== username);
                }
            });

            siteFeedbacks = siteFeedbacks.filter(fb => fb.username !== username);
            siteFeedbacks.forEach(fb => {
                if (fb.likes) {
                    fb.likes = fb.likes.filter(l => l !== username);
                }
            });

            supportChats = supportChats.filter(chat => chat.userId !== username);
            

            currentModal = null;
            adminTab = 'users';
            adminSelectedUser = null;
            window.saveState();
            renderApp();
            showModal('Gelöscht', 'Der Account wurde endgültig aus der Datenbank gelöscht.');
        }
    };
    renderApp();
}

// -----------------------------------------
// Logik für Export & Import
// -----------------------------------------

window.exportArticles = function() {
    const dataStr = JSON.stringify(articles, null, 2);
    const blob = new Blob([dataStr], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "winterthur_times_artikel.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showModal('Export erfolgreich', 'Die Artikel wurden als Textdatei (winterthur_times_artikel.txt) heruntergeladen.');
}

window.exportUsers = function() {
    if (registeredUsers.length === 0) {
        showModal('Keine Benutzer', 'Bisher haben sich noch keine Benutzer angemeldet.');
        return;
    }
    const dataStr = JSON.stringify(registeredUsers, null, 2);
    const blob = new Blob([dataStr], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "winterthur_times_benutzerliste.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showModal('Export erfolgreich', 'Die Benutzerliste wurde als Textdatei heruntergeladen.');
}

window.exportBackup = function() {
    const backupData = {
        articles: articles,
        authors: authors,
        categories: categories,
        registeredUsers: registeredUsers,
        supportChats: supportChats,
        communityImages: communityImages,
        siteFeedbacks: siteFeedbacks
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `winterthur_times_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showModal('Backup erfolgreich', 'Alle Systemdaten (inkl. Ollama-Konfiguration) wurden sicher als Backup-Datei heruntergeladen.');
}

window.importBackup = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.articles && importedData.registeredUsers) {
                articles = importedData.articles;
                authors = importedData.authors || [];
                categories = importedData.categories || ["Politik", "Wirtschaft", "Gesellschaft", "Kultur", "Sport", "Technologie"];
                registeredUsers = importedData.registeredUsers;
                supportChats = importedData.supportChats || [];
                communityImages = importedData.communityImages || [];
                siteFeedbacks = importedData.siteFeedbacks || [];
                

                window.saveState();
                renderApp();
                showModal('Wiederherstellung erfolgreich', 'Das Backup wurde erfolgreich geladen. Alle Daten wurden auf den gesicherten Stand zurückgesetzt.');
            } else {
                throw new Error("Fehlerhaftes Format: 'articles' oder 'registeredUsers' Felder fehlen im Backup.");
            }
        } catch (error) {
            showModal('Import fehlgeschlagen', formatErrorDetails('Die Datei ist beschädigt oder kein gültiges System-Backup.', error));
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

window.importArticles = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                articles = importedData;
                window.saveState();
                renderApp(); 
                showModal('Import erfolgreich', 'Die Artikel aus deiner Textdatei wurden erfolgreich geladen und ersetzen nun die alten Daten.');
            } else {
                throw new Error("Fehlerhaftes Format: Die Textdatei muss eine Liste (Array) von Artikeln enthalten.");
            }
        } catch (error) {
            showModal('Import fehlgeschlagen', formatErrorDetails('Die Datei konnte nicht gelesen werden. Stelle sicher, dass es die originale exportierte .txt Datei ist.', error));
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

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

// --- SUPPORT CHAT MANAGEMENT ---

window.adminRestoreChat = function(chatId) {
    const chat = supportChats.find(c => String(c.id) === String(chatId));
    if(chat) {
        chat.adminDeleted = false;
        window.saveState();
        renderApp();
    }
}

window.adminArchiveChat = function(chatId) {
    const chat = supportChats.find(c => String(c.id) === String(chatId));
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
        message: 'Möchtest du diesen Chat wirklich komplett aus Cloudflare KV löschen? Der Chat bleibt dann auch nach dem Neuladen weg.',
        onConfirm: async function() {
            try {
                const res = await fetch(ADMIN_DELETE_CHAT_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        password: ADMIN_MASTER_PASSWORD,
                        chatId
                    })
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.ok !== true) {
                    throw new Error(data.error || `Status ${res.status}`);
                }

                supportChats = supportChats.filter(c => String(c.id) !== String(chatId));
                if (String(adminSelectedChatId) === String(chatId)) {
                    adminSelectedChatId = null;
                }
                adminSupportLastSnapshot = JSON.stringify(supportChats);
                currentModal = null;
                window.saveState();
                renderApp();
            } catch (err) {
                currentModal = null;
                showModal('Fehler', formatErrorDetails('Der Chat konnte nicht aus Cloudflare KV gelöscht werden.', err));
            }
        }
    };
    renderApp();
}

// -----------------------------------------
// ADMIN LOGIN + SUPPORT-CHAT LADEN VOM WORKER
// -----------------------------------------

const ADMIN_API_URL = "https://askai.mikestaub705.workers.dev/api/admin/chats";
const ADMIN_DELETE_CHAT_API_URL = "https://askai.mikestaub705.workers.dev/api/admin/delete-chat";
const ADMIN_MASTER_PASSWORD = "LOL"; // <-- HIER DEIN PASSWORT EINTRAGEN
let adminSupportAutoRefreshTimer = null;
let adminSupportLastSnapshot = "";
let adminSupportTypingUntil = 0;
let adminSupportReadingUntil = 0;
let adminSupportPendingRender = false;

function normalizeAdminSupportChatsFromKv(chats) {
    return Object.entries(chats || {}).map(([id, value]) => {
        const messages = Array.isArray(value) ? value : (Array.isArray(value?.messages) ? value.messages : []);
        return {
            id,
            userId: id,
            messages: messages.map(m => ({
                sender: m.role === "assistant" || m.sender === "assistant" || m.sender === "admin" ? "admin" : "user",
                text: m.content || m.text || "",
                timestamp: m.timestamp || new Date().toISOString()
            })),
            aiEnabled: value?.aiEnabled !== false,
            adminDeleted: value?.adminDeleted === true
        };
    });
}


function captureAdminSupportScrollState() {
    const chatContainer = document.getElementById('adminChatContainer');
    const active = document.activeElement;
    const input = document.getElementById('adminSupportInput');
    return {
        windowY: window.scrollY,
        chatScrollTop: chatContainer ? chatContainer.scrollTop : null,
        chatScrollHeight: chatContainer ? chatContainer.scrollHeight : null,
        chatClientHeight: chatContainer ? chatContainer.clientHeight : null,
        chatWasNearBottom: chatContainer ? (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 80) : true,
        inputValue: input ? input.value : null,
        inputWasFocused: active && active.id === 'adminSupportInput',
        inputSelectionStart: input ? input.selectionStart : null,
        inputSelectionEnd: input ? input.selectionEnd : null
    };
}

function restoreAdminSupportScrollState(state) {
    if (!state) return;
    requestAnimationFrame(() => {
        const chatContainer = document.getElementById('adminChatContainer');
        const input = document.getElementById('adminSupportInput');

        if (input && state.inputValue !== null && input.value !== state.inputValue) {
            input.value = state.inputValue;
        }

        if (chatContainer && state.chatScrollTop !== null) {
            if (state.chatWasNearBottom) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } else {
                const oldHeight = state.chatScrollHeight || chatContainer.scrollHeight;
                chatContainer.scrollTop = Math.max(0, state.chatScrollTop + (chatContainer.scrollHeight - oldHeight));
            }
        }

        window.scrollTo(0, state.windowY || 0);

        if (input && state.inputWasFocused) {
            input.focus();
            const start = Number.isInteger(state.inputSelectionStart) ? state.inputSelectionStart : input.value.length;
            const end = Number.isInteger(state.inputSelectionEnd) ? state.inputSelectionEnd : start;
            input.selectionStart = Math.min(start, input.value.length);
            input.selectionEnd = Math.min(end, input.value.length);
        }
    });
}

function adminSupportIsUserBusy() {
    const now = Date.now();
    if (now < adminSupportTypingUntil || now < adminSupportReadingUntil) return true;

    const input = document.getElementById('adminSupportInput');
    if (input && document.activeElement === input) return true;
    if (input && input.value && input.value.trim() !== '') return true;

    const chatContainer = document.getElementById('adminChatContainer');
    if (chatContainer) {
        const distanceFromBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
        if (distanceFromBottom > 80) return true;
    }

    return false;
}

window.wtIsAdminSupportBusy = adminSupportIsUserBusy;

function markAdminSupportTyping() {
    adminSupportTypingUntil = Date.now() + 3500;
}

function markAdminSupportReading() {
    const chatContainer = document.getElementById('adminChatContainer');
    if (!chatContainer) return;
    const distanceFromBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
    if (distanceFromBottom > 80) adminSupportReadingUntil = Date.now() + 3500;
}

document.addEventListener('input', event => {
    if (event.target && event.target.id === 'adminSupportInput') markAdminSupportTyping();
}, true);

document.addEventListener('focusin', event => {
    if (event.target && event.target.id === 'adminSupportInput') markAdminSupportTyping();
}, true);

document.addEventListener('scroll', event => {
    if (event.target && event.target.id === 'adminChatContainer') markAdminSupportReading();
}, true);

function flushAdminSupportPendingRenderIfIdle() {
    if (!adminSupportPendingRender || adminTab !== "support") return;
    if (adminSupportIsUserBusy()) return;
    adminSupportPendingRender = false;
    const scrollState = captureAdminSupportScrollState();
    renderApp();
    restoreAdminSupportScrollState(scrollState);
}

async function refreshAdminSupportChatsFromWorker(password, shouldRender = true) {
    const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
    });

    if (!res.ok) {
        throw new Error(`Server antwortete mit Status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const nextChats = normalizeAdminSupportChatsFromKv(data.chats || {});
    const nextSnapshot = JSON.stringify(nextChats);

    if (nextSnapshot !== adminSupportLastSnapshot) {
        adminSupportLastSnapshot = nextSnapshot;
        supportChats = nextChats;
        if (shouldRender && adminTab === "support") {
            if (adminSupportIsUserBusy()) {
                adminSupportPendingRender = true;
                return;
            }
            const scrollState = captureAdminSupportScrollState();
            renderApp();
            restoreAdminSupportScrollState(scrollState);
        }
    }
}

function startAdminSupportAutoRefresh(password) {
    if (adminSupportAutoRefreshTimer) clearInterval(adminSupportAutoRefreshTimer);
    adminSupportAutoRefreshTimer = setInterval(() => {
        if (isSuperAdmin && adminTab === "support") {
            refreshAdminSupportChatsFromWorker(password, true).catch(err => console.error("Admin Auto-Refresh Fehler:", err));
            flushAdminSupportPendingRenderIfIdle();
        }
    }, 1000);
}

window.handleLogin = async function (event) {
    event.preventDefault();
    const pw = document.getElementById("adminPassword").value.trim();
    const errorEl = document.getElementById("loginError");

    if (pw !== ADMIN_MASTER_PASSWORD) {
        errorEl.classList.remove("hidden");
        return;
    }

    errorEl.classList.add("hidden");

    // Falls der Login von der Startseite kommt, leite zur Admin-Seite weiter
    if (!window.location.pathname.toLowerCase().includes('adminzentrale.html')) {
        window.location.href = 'adminZentrale.html';
        return;
    }

    // Setze die Super-Admin Rechte
    isSuperAdmin = true;

    // --- Worker API aufrufen ---
    try {
        await refreshAdminSupportChatsFromWorker(pw, false);
        startAdminSupportAutoRefresh(pw);

        // Öffne direkt den Support-Tab
        adminTab = "support";
        if (typeof setView === 'function') {
            setView('admin-dashboard');
        } else {
            renderApp();
        }

    } catch (err) {
        console.error("Admin API Fehler:", err);
        if (typeof showModal === 'function') {
            showModal('Fehler', formatErrorDetails('Fehler beim Laden der Support-Chats.', err));
        }
    }
};



/* Admin Support Chat Worker-Fallback:
   Wenn der Cloudflare Worker nicht erreichbar ist, darf der Admin-Login nicht abbrechen. */
(function patchAdminWorkerFetchSafety() {
    const patch = () => {
        if (typeof window.refreshAdminSupportChatsFromWorker === "function" && !window.refreshAdminSupportChatsFromWorker.__wtSafePatched) {
            const original = window.refreshAdminSupportChatsFromWorker;
            const safe = async function(...args) {
                try {
                    return await original.apply(this, args);
                } catch (err) {
                    console.warn("Support-Chat Worker nicht erreichbar, Admin-Panel bleibt trotzdem nutzbar:", err);
                    const notice = document.querySelector("#adminSupportStatus, #supportChatStatus, .admin-support-status");
                    if (notice) {
                        notice.textContent = "Support-Chats konnten gerade nicht vom Worker geladen werden. Rest des Admin-Panels funktioniert weiterhin.";
                    }
                    return null;
                }
            };
            safe.__wtSafePatched = true;
            window.refreshAdminSupportChatsFromWorker = safe;
        }

        if (typeof window.handleLogin === "function" && !window.handleLogin.__wtSafePatched) {
            const originalLogin = window.handleLogin;
            const safeLogin = async function(...args) {
                try {
                    return await originalLogin.apply(this, args);
                } catch (err) {
                    if (String(err && (err.message || err)).includes("Failed to fetch")) {
                        console.warn("Worker-Fehler beim Login ignoriert:", err);
                        const loginBox = document.querySelector("#loginSection, .login-section, #login-form, form");
                        const adminBox = document.querySelector("#adminPanel, #admin-panel, .admin-panel, main");
                        if (loginBox) loginBox.style.display = "none";
                        if (adminBox) adminBox.style.display = "";
                        return false;
                    }
                    throw err;
                }
            };
            safeLogin.__wtSafePatched = true;
            window.handleLogin = safeLogin;
        }
    };

    patch();
    document.addEventListener("DOMContentLoaded", patch);
    setTimeout(patch, 300);
    setTimeout(patch, 1000);
})();




// ------------------------------------------------------
// ADMIN: RESSORTS & AUTOREN (echte Tabs)
// ------------------------------------------------------
function getAdminCategoriesSafe() {
    if (typeof categories !== "undefined" && Array.isArray(categories)) return categories;

    const defaults = ["Politik", "Wirtschaft", "Gesellschaft", "Kultur", "Sport", "Lokales", "Wissenschaft", "Technologie", "Unterhaltung", "Panorama", "Spiele"];
    const fromArticles = Array.from(new Set((Array.isArray(articles) ? articles : []).map(a => a && a.category).filter(Boolean)));

    window.categories = fromArticles.length ? fromArticles : defaults.slice();
    return window.categories;
}

function getAdminAuthorsSafe() {
    if (typeof authors !== "undefined" && Array.isArray(authors)) return authors;
    window.authors = [];
    return window.authors;
}

function escapeJsSingleQuoted(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function saveAdminStructureData() {
    if (typeof saveData === "function") {
        await saveData();
        return;
    }

    if (typeof updateData === "function") {
        await updateData();
        return;
    }

    if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
        await firebaseDb.collection("data").doc("articles").set({
            articles: Array.isArray(articles) ? articles : [],
            authors: getAdminAuthorsSafe(),
            categories: getAdminCategoriesSafe(),
            communityImages: typeof communityImages !== "undefined" && Array.isArray(communityImages) ? communityImages : [],
            siteFeedbacks: typeof siteFeedbacks !== "undefined" && Array.isArray(siteFeedbacks) ? siteFeedbacks : [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return;
    }

    throw new Error("Firebase-Speicherfunktion nicht gefunden.");
}

function renderAdminCategoriesTab() {
    const cats = getAdminCategoriesSafe();
    const counts = (Array.isArray(articles) ? articles : []).reduce((acc, article) => {
        const cat = article && article.category ? article.category : "Ohne Kategorie";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});

    return `
        <div class="flex justify-between items-center border-b pb-4 mb-6">
            <h3 class="text-xl font-bold uppercase flex items-center gap-2"><i data-lucide="folder" class="text-blue-600"></i> Ressorts verwalten</h3>
        </div>

        <div class="bg-blue-50 border border-blue-100 rounded p-4 mb-6 text-sm text-gray-700">
            Hier verwaltest du die Kategorien/Ressorts, die im Menü und bei Artikeln verwendet werden.
        </div>

        <div class="bg-gray-50 border border-gray-200 rounded p-4 mb-6">
            <label class="block text-sm font-bold mb-2">Neues Ressort hinzufügen</label>
            <div class="flex flex-col md:flex-row gap-3">
                <input id="newCategoryName" type="text" class="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600" placeholder="z. B. Bildung">
                <button onclick="addAdminCategory()" class="bg-blue-900 text-white font-bold px-5 py-2 rounded hover:bg-blue-800 cursor-pointer">Hinzufügen</button>
            </div>
            <p id="categoryStatus" class="text-sm font-bold mt-3"></p>
        </div>

        <div class="flex flex-col gap-3">
            ${cats.map((cat, index) => {
                const categoryKey = escapeJsSingleQuoted(cat);
                return `
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-gray-200 rounded p-4">
                    <div class="flex-1">
                        <h4 class="font-bold text-lg">${escapeHtml(cat)}</h4>
                        <p class="text-sm text-gray-500">${counts[cat] || 0} Artikel in diesem Ressort</p>
                    </div>
                    <div class="flex flex-wrap gap-2 md:justify-end">
                        <button onclick="moveAdminCategory('${categoryKey}', -1)" ${index === 0 ? 'disabled' : ''} class="bg-white text-blue-800 border border-blue-200 px-3 py-2 rounded font-bold hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1" title="Nach oben verschieben"><i data-lucide="arrow-up" class="w-4 h-4"></i><span class="sr-only">Nach oben</span></button>
                        <button onclick="moveAdminCategory('${categoryKey}', 1)" ${index === cats.length - 1 ? 'disabled' : ''} class="bg-white text-blue-800 border border-blue-200 px-3 py-2 rounded font-bold hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1" title="Nach unten verschieben"><i data-lucide="arrow-down" class="w-4 h-4"></i><span class="sr-only">Nach unten</span></button>
                    </div>
                    <button onclick="deleteAdminCategory('${String(cat).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')" class="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded font-bold hover:bg-red-100 cursor-pointer">Löschen</button>
                </div>
            `;
            }).join("")}
        </div>
    `;
}

function renderAdminAuthorsTab() {
    const list = getAdminAuthorsSafe();
    const counts = (Array.isArray(articles) ? articles : []).reduce((acc, article) => {
        const author = article && article.author ? article.author : "Unbekannt";
        acc[author] = (acc[author] || 0) + 1;
        return acc;
    }, {});

    return `
        <div class="flex justify-between items-center border-b pb-4 mb-6">
            <h3 class="text-xl font-bold uppercase flex items-center gap-2"><i data-lucide="user-pen" class="text-blue-600"></i> Autoren verwalten</h3>
        </div>

        <div class="bg-blue-50 border border-blue-100 rounded p-4 mb-6 text-sm text-gray-700">
            Hier kannst du Autoren anlegen und bearbeiten. Artikel verwenden den Autorennamen aus dem Feld „Autor“.
        </div>

        <div class="bg-gray-50 border border-gray-200 rounded p-4 mb-6">
            <h4 class="font-bold uppercase mb-4">Autor hinzufügen / bearbeiten</h4>
            <input id="authorEditId" type="hidden">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-bold mb-2">Name</label>
                    <input id="authorName" type="text" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600" placeholder="Name">
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2">Bild-URL</label>
                    <input id="authorImageUrl" type="url" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600" placeholder="https://...">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-bold mb-2">Bio</label>
                    <textarea id="authorBio" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600" placeholder="Kurzbeschreibung"></textarea>
                </div>
            </div>
            <div class="flex flex-col md:flex-row gap-3 mt-4">
                <button onclick="saveAdminAuthor()" class="bg-blue-900 text-white font-bold px-5 py-2 rounded hover:bg-blue-800 cursor-pointer">Autor speichern</button>
                <button onclick="clearAdminAuthorForm()" class="bg-gray-200 text-gray-800 font-bold px-5 py-2 rounded hover:bg-gray-300 cursor-pointer">Formular leeren</button>
            </div>
            <p id="authorStatus" class="text-sm font-bold mt-3"></p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${list.length === 0 ? '<p class="text-gray-500 italic">Noch keine Autoren angelegt.</p>' : ''}
            ${list.map(author => {
                const authorKey = String(author.id || author.name || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                const avatar = author.imageUrl || author.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || "Autor")}`;
                return `
                <div class="bg-white border border-gray-200 rounded p-4 flex gap-4">
                    <img src="${escapeHtml(avatar)}" alt="" class="w-16 h-16 rounded-full object-cover bg-gray-100">
                    <div class="flex-1">
                        <h4 class="font-bold text-lg">${escapeHtml(author.name || "Unbenannter Autor")}</h4>
                        <p class="text-sm text-gray-600 line-clamp-2">${escapeHtml(author.bio || "Keine Bio hinterlegt.")}</p>
                        <p class="text-xs text-gray-500 mt-1">${counts[author.name] || 0} Artikel</p>
                        <div class="flex gap-2 mt-3">
                            <button onclick="editAdminAuthor('${authorKey}')" class="text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded font-bold hover:bg-blue-100 cursor-pointer">Bearbeiten</button>
                            <button onclick="deleteAdminAuthor('${authorKey}')" class="text-red-700 bg-red-50 border border-red-100 px-3 py-1 rounded font-bold hover:bg-red-100 cursor-pointer">Löschen</button>
                        </div>
                    </div>
                </div>
            `;
            }).join("")}
        </div>
    `;
}

window.moveAdminCategory = async function(name, direction) {
    const status = document.getElementById("categoryStatus");
    const cats = getAdminCategoriesSafe();
    const currentIndex = cats.indexOf(name);
    const nextIndex = currentIndex + Number(direction || 0);

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= cats.length) return;

    const [moved] = cats.splice(currentIndex, 1);
    cats.splice(nextIndex, 0, moved);
    window.categories = cats;

    try {
        localStorage.setItem("wt_categories_backup", JSON.stringify(cats));
    } catch (_) {}

    try {
        await saveAdminStructureData();
        renderApp();
    } catch (err) {
        cats.splice(nextIndex, 1);
        cats.splice(currentIndex, 0, moved);
        if (status) {
            status.textContent = "Reihenfolge konnte nicht gespeichert werden: " + err.message;
            status.className = "text-sm font-bold mt-3 text-red-600";
        }
    }
};

window.addAdminCategory = async function() {
    const input = document.getElementById("newCategoryName");
    const status = document.getElementById("categoryStatus");
    const name = (input && input.value ? input.value : "").trim();

    if (!name) {
        if (status) {
            status.textContent = "Bitte einen Namen eingeben.";
            status.className = "text-sm font-bold mt-3 text-red-600";
        }
        return;
    }

    const cats = getAdminCategoriesSafe();
    if (cats.includes(name)) {
        if (status) {
            status.textContent = "Dieses Ressort existiert bereits.";
            status.className = "text-sm font-bold mt-3 text-orange-600";
        }
        return;
    }

    cats.push(name);

    try {
        await saveAdminStructureData();
        renderApp();
    } catch (err) {
        if (status) {
            status.textContent = "Speichern fehlgeschlagen: " + err.message;
            status.className = "text-sm font-bold mt-3 text-red-600";
        }
    }
};

window.deleteAdminCategory = async function(name) {
    const status = document.getElementById("categoryStatus");
    const count = (Array.isArray(articles) ? articles : []).filter(article => article && article.category === name).length;

    if (count > 0) {
        if (status) {
            status.textContent = "Dieses Ressort enthält noch Artikel und kann deshalb nicht gelöscht werden.";
            status.className = "text-sm font-bold mt-3 text-red-600";
        }
        return;
    }

    const cats = getAdminCategoriesSafe();
    const idx = cats.indexOf(name);
    if (idx >= 0) cats.splice(idx, 1);

    try {
        await saveAdminStructureData();
        renderApp();
    } catch (err) {
        if (status) {
            status.textContent = "Löschen fehlgeschlagen: " + err.message;
            status.className = "text-sm font-bold mt-3 text-red-600";
        }
    }
};

window.clearAdminAuthorForm = function() {
    ["authorEditId", "authorName", "authorImageUrl", "authorBio"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
};

window.saveAdminAuthor = async function() {
    const status = document.getElementById("authorStatus");
    const id = (document.getElementById("authorEditId") || {}).value || "";
    const name = ((document.getElementById("authorName") || {}).value || "").trim();
    const imageUrl = ((document.getElementById("authorImageUrl") || {}).value || "").trim();
    const bio = ((document.getElementById("authorBio") || {}).value || "").trim();

    if (!name) {
        if (status) {
            status.textContent = "Bitte einen Namen eingeben.";
            status.className = "text-sm font-bold mt-3 text-red-600";
        }
        return;
    }

    const list = getAdminAuthorsSafe();
    const author = {
        id: id || ("author_" + Date.now()),
        name,
        bio,
        imageUrl
    };

    const idx = list.findIndex(a => String(a.id || a.name) === String(id));
    if (idx >= 0) list[idx] = author;
    else list.push(author);

    try {
        await saveAdminStructureData();
        renderApp();
    } catch (err) {
        if (status) {
            status.textContent = "Speichern fehlgeschlagen: " + err.message;
            status.className = "text-sm font-bold mt-3 text-red-600";
        }
    }
};

window.editAdminAuthor = function(id) {
    const author = getAdminAuthorsSafe().find(a => String(a.id || a.name) === String(id));
    if (!author) return;

    const editId = document.getElementById("authorEditId");
    const name = document.getElementById("authorName");
    const image = document.getElementById("authorImageUrl");
    const bio = document.getElementById("authorBio");

    if (editId) editId.value = author.id || author.name || "";
    if (name) name.value = author.name || "";
    if (image) image.value = author.imageUrl || author.image || "";
    if (bio) bio.value = author.bio || "";
    if (name) name.focus();
};

window.deleteAdminAuthor = async function(id) {
    const status = document.getElementById("authorStatus");
    const list = getAdminAuthorsSafe();
    const author = list.find(a => String(a.id || a.name) === String(id));

    if (author) {
        const count = (Array.isArray(articles) ? articles : []).filter(article => article && article.author === author.name).length;
        if (count > 0) {
            if (status) {
                status.textContent = "Dieser Autor hat noch Artikel und kann deshalb nicht gelöscht werden.";
                status.className = "text-sm font-bold mt-3 text-red-600";
            }
            return;
        }
    }

    const idx = list.findIndex(a => String(a.id || a.name) === String(id));
    if (idx >= 0) list.splice(idx, 1);

    try {
        await saveAdminStructureData();
        renderApp();
    } catch (err) {
        if (status) {
            status.textContent = "Löschen fehlgeschlagen: " + err.message;
            status.className = "text-sm font-bold mt-3 text-red-600";
        }
    }
};




/* Ressort Spiele + kein automatisches Artikel-Löschen */
(function wtAdminSpieleNoAutoDelete() {
    if (window.__wtAdminSpieleNoAutoDelete) return;
    window.__wtAdminSpieleNoAutoDelete = true;
    function fix() {
        try { if (typeof categories !== "undefined" && Array.isArray(categories) && !categories.includes("Spiele")) categories.push("Spiele"); } catch (_) {}
        if (Array.isArray(window.categories) && !window.categories.includes("Spiele")) window.categories.push("Spiele");
        try { if (typeof articles !== "undefined" && Array.isArray(articles)) articles.forEach(a => { if (a) delete a.autoDeleteDate; }); } catch (_) {}
        if (Array.isArray(window.articles)) window.articles.forEach(a => { if (a) delete a.autoDeleteDate; });
    }
    fix();
    setInterval(fix, 5000);
})();



/* =========================================================
   Ressorts speichern Fix
   ========================================================= */
(function wtRessortSaveFix() {
    if (window.__wtRessortSaveFix) return;
    window.__wtRessortSaveFix = true;

    function getCategoriesSafe() {
        try {
            if (typeof categories !== "undefined" && Array.isArray(categories)) return categories;
        } catch (_) {}
        if (!Array.isArray(window.categories)) window.categories = [];
        return window.categories;
    }

    function getArticlesSafe() {
        try {
            if (typeof articles !== "undefined" && Array.isArray(articles)) return articles;
        } catch (_) {}
        return Array.isArray(window.articles) ? window.articles : [];
    }

    function getAuthorsSafe() {
        try {
            if (typeof authors !== "undefined" && Array.isArray(authors)) return authors;
        } catch (_) {}
        return Array.isArray(window.authors) ? window.authors : [];
    }

    function getCommunityImagesSafe() {
        try {
            if (typeof communityImages !== "undefined" && Array.isArray(communityImages)) return communityImages;
        } catch (_) {}
        return Array.isArray(window.communityImages) ? window.communityImages : [];
    }

    function getFeedbacksSafe() {
        try {
            if (typeof siteFeedbacks !== "undefined" && Array.isArray(siteFeedbacks)) return siteFeedbacks;
        } catch (_) {}
        return Array.isArray(window.siteFeedbacks) ? window.siteFeedbacks : [];
    }

    async function saveRessortsToFirebase() {
        const cats = getCategoriesSafe();

        // remove duplicates and empty entries
        const cleaned = Array.from(new Set(cats.map(c => String(c || "").trim()).filter(Boolean)));
        cats.splice(0, cats.length, ...cleaned);
        window.categories = cats;

        // Prefer existing project save functions if they exist, but also write directly
        // so Ressorts are definitely persisted.
        let directSaved = false;

        try {
            if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
                await firebaseDb.collection("data").doc("articles").set({
                    articles: getArticlesSafe(),
                    authors: getAuthorsSafe(),
                    categories: cats,
                    communityImages: getCommunityImagesSafe(),
                    siteFeedbacks: getFeedbacksSafe(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                directSaved = true;
            }
        } catch (err) {
            console.warn("Direktes Speichern der Ressorts fehlgeschlagen:", err);
        }

        if (!directSaved) {
            try {
                if (typeof saveState === "function") {
                    await saveState();
                    directSaved = true;
                } else if (typeof saveData === "function") {
                    await saveData();
                    directSaved = true;
                } else if (typeof updateData === "function") {
                    await updateData();
                    directSaved = true;
                } else if (typeof scheduleRemoteSave === "function") {
                    scheduleRemoteSave();
                    directSaved = true;
                }
            } catch (err) {
                console.warn("Fallback-Speichern der Ressorts fehlgeschlagen:", err);
            }
        }

        try {
            localStorage.setItem("wt_categories_backup", JSON.stringify(cats));
        } catch (_) {}

        return directSaved;
    }

    function patchAddCategoryFunctions() {
        const originalNames = ["addAdminCategory", "addCategory", "saveCategory", "createCategory"];

        originalNames.forEach(name => {
            const fn = window[name];
            if (typeof fn !== "function" || fn.__wtRessortSavePatched) return;

            const patched = async function(...args) {
                const result = await fn.apply(this, args);
                await saveRessortsToFirebase();
                if (typeof renderApp === "function") renderApp();
                return result;
            };

            patched.__wtRessortSavePatched = true;
            window[name] = patched;
        });
    }

    window.wtSaveRessortsToFirebase = saveRessortsToFirebase;

    // Generic form/button fallback: catches "Ressort hinzufügen" buttons even if the original
    // code only changed the local array and forgot to save it.
    document.addEventListener("click", function(event) {
        const btn = event.target.closest("button");
        if (!btn) return;

        const text = (btn.textContent || "").trim().toLowerCase();
        if (!text.includes("ressort") && !text.includes("kategorie")) return;
        if (!text.includes("hinzufügen") && !text.includes("speichern") && !text.includes("add")) return;

        setTimeout(async () => {
            await saveRessortsToFirebase();
        }, 250);
    }, true);

    // If user presses Enter in a new-category input, save afterwards too.
    document.addEventListener("keydown", function(event) {
        if (event.key !== "Enter") return;
        const input = event.target;
        if (!input || !input.matches || !input.matches("input")) return;

        const ph = String(input.placeholder || "").toLowerCase();
        const id = String(input.id || "").toLowerCase();
        if (!ph.includes("ressort") && !ph.includes("kategorie") && !id.includes("category") && !id.includes("ressort")) return;

        setTimeout(async () => {
            await saveRessortsToFirebase();
        }, 250);
    }, true);

    function restoreCategoriesBackupIfNeeded() {
        const cats = getCategoriesSafe();
        if (cats.length) return;

        try {
            const backup = JSON.parse(localStorage.getItem("wt_categories_backup") || "[]");
            if (Array.isArray(backup) && backup.length) {
                cats.splice(0, cats.length, ...backup);
                window.categories = cats;
            }
        } catch (_) {}
    }

    function tick() {
        restoreCategoriesBackupIfNeeded();
        patchAddCategoryFunctions();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", tick);
    } else {
        tick();
    }

    setInterval(tick, 1500);
})();



/* =========================================================
   Benutzerrolle speichern / Autospeichern Fix
   ========================================================= */
(function wtAdminUserRoleSaveFix() {
    if (window.__wtAdminUserRoleSaveFix) return;
    window.__wtAdminUserRoleSaveFix = true;

    function getUsersArray() {
        try {
            if (typeof registeredUsers !== "undefined" && Array.isArray(registeredUsers)) return registeredUsers;
        } catch (_) {}
        if (Array.isArray(window.registeredUsers)) return window.registeredUsers;
        try {
            if (typeof users !== "undefined" && Array.isArray(users)) return users;
        } catch (_) {}
        if (Array.isArray(window.users)) return window.users;
        return [];
    }

    function userMatchesText(user, text) {
        const vals = [
            user && user.username,
            user && user.displayName,
            user && user.name,
            user && user.email,
            user && user.uid,
            user && user.id
        ].map(v => String(v || "").trim()).filter(Boolean);

        return vals.some(v => text.includes(v));
    }

    async function saveAllUsers() {
        let saved = false;

        try {
            if (typeof window.saveState === "function") {
                await window.saveState();
                saved = true;
            }
        } catch (err) {
            console.warn("saveState Benutzerrolle fehlgeschlagen:", err);
        }

        try {
            if (!saved && typeof saveData === "function") {
                await saveData();
                saved = true;
            }
        } catch (err) {
            console.warn("saveData Benutzerrolle fehlgeschlagen:", err);
        }

        try {
            if (!saved && typeof scheduleRemoteSave === "function") {
                scheduleRemoteSave();
                saved = true;
            }
        } catch (err) {
            console.warn("scheduleRemoteSave Benutzerrolle fehlgeschlagen:", err);
        }

        try {
            localStorage.setItem("wt_registered_users_backup", JSON.stringify(getUsersArray()));
        } catch (_) {}

        return saved;
    }

    function setStatus(row, msg, ok = true) {
        let status = row.querySelector(".wt-user-role-save-status");
        if (!status) {
            status = document.createElement("span");
            status.className = "wt-user-role-save-status";
            row.appendChild(status);
        }
        status.textContent = msg;
        status.classList.toggle("error", !ok);
    }

    async function saveRoleFromSelect(select) {
        const row = select.closest(".bg-white, .border, .rounded, div, tr") || document.body;
        const text = row.innerText || document.body.innerText || "";
        const users = getUsersArray();

        let user =
            users.find(u => userMatchesText(u, text)) ||
            users.find(u => String(u && u.email || "") && document.body.innerText.includes(String(u.email)));

        if (!user) {
            setStatus(row, "Benutzer nicht gefunden.", false);
            return;
        }

        const role = select.value;
        user.role = role;
        user.isAdmin = role === "admin" || role === "superadmin";
        user.isSuperAdmin = role === "superadmin";

        setStatus(row, "Speichere...", true);
        const saved = await saveAllUsers();
        setStatus(row, saved ? "Rolle gespeichert." : "Lokal gespeichert.", true);
    }

    function enhanceRoleSelects() {
        if (!/Benutzer|Rolle ändern|Benutzer verwalten/i.test(document.body.innerText || "")) return;

        document.querySelectorAll("select").forEach(select => {
            const parentText = (select.closest("div, tr, section") || document.body).innerText || "";
            if (!/Rolle ändern|Admin|Benutzer|Autor|Redaktor/i.test(parentText)) return;
            if (select.dataset.wtRoleSaveEnhanced === "true") return;

            select.dataset.wtRoleSaveEnhanced = "true";

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "wt-user-role-save-btn";
            btn.textContent = "Rolle speichern";
            select.insertAdjacentElement("afterend", btn);

            btn.addEventListener("click", () => saveRoleFromSelect(select));

            select.addEventListener("change", () => {
                saveRoleFromSelect(select);
            });
        });
    }

    const obs = new MutationObserver(enhanceRoleSelects);
    obs.observe(document.documentElement, { childList: true, subtree: true });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", enhanceRoleSelects);
    } else {
        enhanceRoleSelects();
    }

    setInterval(enhanceRoleSelects, 1500);
})();




/* =========================================================
   Benutzerrollen wirklich speichern: Core-Fix
   ========================================================= */
async function saveRegisteredUsersRolesNow() {
    const users = (typeof registeredUsers !== "undefined" && Array.isArray(registeredUsers))
        ? registeredUsers
        : (Array.isArray(window.registeredUsers) ? window.registeredUsers : []);

    // Lokales Backup immer zuerst, damit es nicht verloren geht
    try {
        localStorage.setItem("wt_registered_users_backup", JSON.stringify(users));
    } catch (_) {}

    // 1) Bestehende Spezialfunktion
    if (typeof saveUsersNow === "function") {
        await saveUsersNow();
        return true;
    }

    // 2) Normale State-Funktion
    if (typeof window.saveState === "function") {
        await window.saveState();
        return true;
    }

    // 3) Falls vorhanden: saveData / updateData
    if (typeof saveData === "function") {
        await saveData();
        return true;
    }

    if (typeof updateData === "function") {
        await updateData();
        return true;
    }

    // 4) Direkt in Firebase speichern. Wir schreiben mehrere übliche Orte,
    // damit die vorhandene App es wieder laden kann.
    if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
        const batch = firebaseDb.batch ? firebaseDb.batch() : null;

        const payload = {
            users: users,
            registeredUsers: users,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Hauptdokument, falls die Website Benutzer dort speichert
        await firebaseDb.collection("data").doc("users").set(payload, { merge: true });

        // Zusätzlich ins bestehende data/articles-Dokument mergen, falls dein Projekt alles dort hält
        await firebaseDb.collection("data").doc("articles").set({
            users: users,
            registeredUsers: users,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return true;
    }

    // 5) Last resort: scheduled save
    if (typeof scheduleRemoteSave === "function") {
        scheduleRemoteSave();
        return true;
    }

    throw new Error("Keine Speicherfunktion gefunden.");
}

window.saveUserRoleFromButton = async function(username) {
    const select =
        document.getElementById(`wt-role-select-${username}`) ||
        document.querySelector(`select[data-wt-role-username="${CSS.escape(String(username))}"]`);

    if (!select) {
        if (typeof showModal === "function") showModal("Fehler", "Rollen-Auswahlfeld nicht gefunden.");
        return;
    }

    await window.changeUserRole(username, select.value, { silent: false });
};

/* Fallback: auch dynamisch eingefügte Speichern-Knöpfe funktionieren */
(function wtRoleSaveButtonDelegation() {
    if (window.__wtRoleSaveButtonDelegation) return;
    window.__wtRoleSaveButtonDelegation = true;

    document.addEventListener("click", async event => {
        const btn = event.target.closest(".wt-user-role-save-btn");
        if (!btn) return;

        const explicit = btn.getAttribute("onclick");
        if (explicit && explicit.includes("saveUserRoleFromButton")) return;

        const row = btn.closest("p, div, tr, section") || document;
        const select = row.querySelector("select[data-wt-role-username], select");
        if (!select) return;

        const username = select.dataset.wtRoleUsername || select.id.replace("wt-role-select-", "");
        if (!username) return;

        event.preventDefault();
        event.stopPropagation();
        await window.changeUserRole(username, select.value, { silent: false });
    }, true);
})();




/* =========================================================
   Rollen dauerhaft speichern Fix v2
   ========================================================= */
(function wtPersistentRolesFixV2() {
    if (window.__wtPersistentRolesFixV2) return;
    window.__wtPersistentRolesFixV2 = true;

    function getUsersArray() {
        try {
            if (typeof registeredUsers !== "undefined" && Array.isArray(registeredUsers)) return registeredUsers;
        } catch (_) {}
        if (Array.isArray(window.registeredUsers)) return window.registeredUsers;
        return [];
    }

    function setStatus(username, msg, error = false) {
        const el = document.getElementById(`wt-role-status-${username}`);
        if (el) {
            el.textContent = msg;
            el.classList.toggle("error", !!error);
        }
    }

    async function saveUsersHard() {
        const users = getUsersArray();

        // Lokales Backup
        try {
            localStorage.setItem("wt_registered_users_backup", JSON.stringify(users));
        } catch (_) {}

        // Wichtig: saveUsersNow aus app.js, falls verfügbar
        if (typeof window.saveUsersNow === "function") {
            await window.saveUsersNow();
            return true;
        }

        // Fallback auf normale State-Funktion
        if (typeof window.saveState === "function") {
            await window.saveState();
            return true;
        }

        // Falls app.js Firebase nicht an window exponiert, ist direkte Speicherung hier evtl. nicht möglich.
        // Dann ist wenigstens das lokale Backup gesetzt.
        return false;
    }

    window.changeUserRole = async function(username, newRole, options = {}) {
        if (typeof hasAdminAccess === "function" && !hasAdminAccess()) return false;

        const users = getUsersArray();
        const user = users.find(u =>
            String(u.username) === String(username) ||
            String(u.email) === String(username) ||
            String(u.uid) === String(username) ||
            String(u.id) === String(username)
        );

        if (!user) {
            setStatus(username, "Benutzer nicht gefunden.", true);
            return false;
        }

        user.role = newRole;
        user.isAdmin = newRole === "admin" || newRole === "superadmin";
        user.isSuperAdmin = newRole === "superadmin";

        setStatus(username, "Speichere...");

        try {
            await saveUsersHard();
            setStatus(username, "Rolle gespeichert.");
            if (!options.noRender && typeof renderApp === "function") {
                setTimeout(renderApp, 500);
            }
            return true;
        } catch (err) {
            console.error("Rolle speichern fehlgeschlagen:", err);
            setStatus(username, "Speichern fehlgeschlagen.", true);
            return false;
        }
    };

    window.saveUserRoleFromButton = async function(username) {
        const select =
            document.getElementById(`wt-role-select-${username}`) ||
            document.querySelector(`select[data-wt-role-username="${CSS.escape(String(username))}"]`) ||
            Array.from(document.querySelectorAll("select")).find(s => (s.getAttribute("onchange") || "").includes(username));

        if (!select) {
            setStatus(username, "Dropdown nicht gefunden.", true);
            return;
        }

        await window.changeUserRole(username, select.value, { noRender: false });
    };

    function enhanceRoleControls() {
        document.querySelectorAll("select").forEach(select => {
            const onchange = select.getAttribute("onchange") || "";
            const match = onchange.match(/changeUserRole\('([^']+)'/);
            if (!match) return;
            const username = match[1];

            select.id = select.id || `wt-role-select-${username}`;
            select.dataset.wtRoleUsername = username;

            if (!select.nextElementSibling || !select.nextElementSibling.classList || !select.nextElementSibling.classList.contains("wt-user-role-save-btn")) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "wt-user-role-save-btn";
                btn.textContent = "Rolle speichern";
                btn.addEventListener("click", () => window.saveUserRoleFromButton(username));
                select.insertAdjacentElement("afterend", btn);

                const status = document.createElement("span");
                status.id = `wt-role-status-${username}`;
                status.className = "wt-user-role-save-status";
                btn.insertAdjacentElement("afterend", status);
            }
        });
    }

    const obs = new MutationObserver(enhanceRoleControls);
    obs.observe(document.documentElement, { childList: true, subtree: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceRoleControls);
    else enhanceRoleControls();
    setInterval(enhanceRoleControls, 1500);
})();


/* =========================================================
   Rollen speichern Final-Fix
   ========================================================= */
(function wtUserRolePersistFinalFix() {
    if (window.__wtUserRolePersistFinalFix) return;
    window.__wtUserRolePersistFinalFix = true;

    function getUsersArray() {
        try {
            if (typeof registeredUsers !== "undefined" && Array.isArray(registeredUsers)) return registeredUsers;
        } catch (_) {}
        return Array.isArray(window.registeredUsers) ? window.registeredUsers : [];
    }

    function getRoleKeys(user) {
        return [
            user && user.username,
            user && user.email,
            user && user.uid,
            user && user.id,
            user && user.displayName,
            user && user.name
        ].map(v => String(v || "").trim().toLowerCase()).filter(Boolean);
    }

    function findUser(username) {
        const key = String(username || "").trim().toLowerCase();
        return getUsersArray().find(user => getRoleKeys(user).includes(key));
    }

    function normalizeRole(role) {
        const value = String(role || "user").trim().toLowerCase();
        return ["user", "author", "admin", "superadmin"].includes(value) ? value : "user";
    }

    function setStatus(username, message, isError = false) {
        const el = document.getElementById(`wt-role-status-${username}`);
        if (!el) return;
        el.textContent = message;
        el.classList.toggle("error", !!isError);
    }

    function buildRoleMap(users) {
        if (typeof window.wtBuildUserRolesMapFromUsers === "function") {
            return window.wtBuildUserRolesMapFromUsers(users);
        }

        const map = {};
        users.forEach(user => {
            const role = normalizeRole(user && user.role);
            getRoleKeys(user).forEach(key => {
                map[key] = {
                    role,
                    isAdmin: role === "admin" || role === "superadmin",
                    isSuperAdmin: role === "superadmin"
                };
            });
        });
        return map;
    }

    async function persistUsersNow(users) {
        if (typeof window.saveUsersNow === "function") {
            await window.saveUsersNow();
        } else if (typeof saveUsersNow === "function") {
            await saveUsersNow();
        } else if (typeof window.saveState === "function") {
            await window.saveState();
        }

        if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
            const sanitized = typeof sanitizeUsersForRemote === "function" ? sanitizeUsersForRemote(users) : users;
            await firebaseDb.collection("data").doc("users").set({
                registeredUsers: sanitized,
                userRoles: buildRoleMap(sanitized),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        try {
            localStorage.setItem("wt_registered_users_backup", JSON.stringify(users));
        } catch (_) {}
    }

    window.changeUserRole = async function(username, newRole, options = {}) {
        if (typeof hasAdminAccess === "function" && !hasAdminAccess()) return false;

        const users = getUsersArray();
        const user = findUser(username);
        if (!user) {
            setStatus(username, "Benutzer nicht gefunden.", true);
            if (!options.silent && typeof showModal === "function") {
                showModal("Fehler", "Benutzer nicht gefunden.");
            }
            return false;
        }

        const role = normalizeRole(newRole);
        user.role = role;
        user.isAdmin = role === "admin" || role === "superadmin";
        user.isSuperAdmin = role === "superadmin";

        if (typeof window.wtRememberUserRoleLocally === "function") {
            window.wtRememberUserRoleLocally(user, role);
        }
        if (typeof window.wtApplySavedUserRolesToRegisteredUsers === "function") {
            window.wtApplySavedUserRolesToRegisteredUsers();
        }

        setStatus(username, "Speichere...");

        try {
            await persistUsersNow(users);
            setStatus(username, "Rolle gespeichert.");
            if (!options.noRender && typeof renderApp === "function") setTimeout(renderApp, 150);
            return true;
        } catch (err) {
            console.error("Rolle konnte nicht gespeichert werden:", err);
            setStatus(username, "Speichern fehlgeschlagen.", true);
            if (!options.silent && typeof showModal === "function") {
                showModal("Fehler", "Die Rolle konnte nicht gespeichert werden. Bitte versuche es erneut.");
            }
            return false;
        }
    };

    window.saveUserRoleFromButton = async function(username) {
        const select =
            document.getElementById(`wt-role-select-${username}`) ||
            document.querySelector(`select[data-wt-role-username="${CSS.escape(String(username))}"]`) ||
            Array.from(document.querySelectorAll("select")).find(s => (s.getAttribute("onchange") || "").includes(username));

        if (!select) {
            setStatus(username, "Dropdown nicht gefunden.", true);
            return false;
        }

        return window.changeUserRole(username, select.value, { silent: false, noRender: false });
    };
})();
