/**
 * Winterthur Times - Admin Zentrale
 * Diese Datei enthält ausschließlich Logik und Ansichten für Redakteure und Administratoren.
 */

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
                        ${supportChats.length === 0 ? '<p class="p-4 text-gray-500 italic text-sm">Keine Support-Anfragen vorhanden.</p>' : supportChats.map(c => {
                            const lastMsg = c.messages[c.messages.length - 1];
                            const isSelected = adminSelectedChatId == c.id;
                            const isUnread = lastMsg && lastMsg.sender === 'user';
                            
                            const user = registeredUsers.find(u => u.username === c.userId);
                            const isBanned = user ? user.isBanned : false;
                            
                            return \`
                                <div onclick="adminSelectedChatId = '\${c.id}'; renderApp()" class="p-4 border-b border-gray-100 cursor-pointer transition-colors \${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'} relative">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="font-bold text-sm \${isUnread ? 'text-blue-900' : 'text-gray-700'} truncate flex items-center gap-1" title="\${c.userId}">
                                            \${c.userId.length > 15 ? c.userId.substring(0, 15) + '...' : c.userId}
                                            \${isBanned ? '<span class="bg-red-600 text-white text-[8px] px-1 rounded uppercase" title="Account gesperrt">Gesperrt</span>' : ''}
                                        </span>
                                        <span class="text-[10px] text-gray-400 mr-3">\${lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                                    </div>
                                    <p class="text-xs text-gray-500 truncate pr-3 \${isUnread ? 'font-bold text-gray-800' : ''}">\${lastMsg ? lastMsg.text : 'Neuer Chat'}</p>
                                </div>
                            \`;
                        }).join('')}
                    </div>
                    
                    <div class="w-full md:w-2/3 border border-gray-200 rounded bg-gray-50 flex flex-col relative min-h-[400px] md:min-h-0">
                        ${!adminSelectedChatId ? `
                            <div class="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
                                <i data-lucide="message-square" class="w-12 h-12 opacity-50"></i>
                                <p>Wähle einen Chat aus der Liste aus.</p>
                            </div>
                        ` : (() => {
                            const chat = supportChats.find(c => c.id == adminSelectedChatId);
                            if(!chat) return '<p class="p-4">Chat nicht gefunden.</p>';
                            
                            const user = registeredUsers.find(u => u.username === chat.userId);
                            const isBanned = user ? user.isBanned : false;
                            
                            return \`
                                <div class="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                                    <h4 \${user ? \`onclick="viewUserDetails('\${chat.userId}')"\` : ''} class="font-bold text-blue-900 flex items-center gap-2 \${user ? 'cursor-pointer hover:text-blue-700 hover:underline' : ''}" title="\${user ? 'Zum Profil von ' + chat.userId : 'Gast-Nutzer'}">
                                        \${user ? getUserAvatar(chat.userId, 'w-6 h-6', 'w-3 h-3', false) : '<i data-lucide="user" class="w-5 h-5"></i>'}
                                        Chat mit \${chat.userId}
                                        \${isBanned ? '<span class="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase ml-2 no-underline">Gesperrt</span>' : ''}
                                        \${!user ? '<span class="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase ml-2 no-underline">Gast</span>' : ''}
                                    </h4>
                                    <button onclick="toggleChatAi('\${chat.id}')"
                                        title="\${chat.aiEnabled !== false ? 'KI deaktivieren' : 'KI aktivieren'}"
                                        class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer
                                        \${chat.aiEnabled !== false
                                            ? 'bg-green-50 border-green-300 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                                            : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-700'}">
                                        <i data-lucide="\${chat.aiEnabled !== false ? 'bot' : 'bot-off'}" class="w-3.5 h-3.5"></i>
                                        KI \${chat.aiEnabled !== false ? 'AN' : 'AUS'}
                                    </button>
                                </div>
                                
                                <div class="flex-1 p-4 overflow-y-auto flex flex-col gap-3" id="adminChatContainer">
                                    \${chat.messages.map((m, index) => \`
                                        <div class="flex \${m.sender === 'user' ? 'justify-start' : 'justify-end'}">
                                            <div class="max-w-[85%] rounded-lg p-3 \${m.sender === 'admin' ? 'bg-blue-900 text-white rounded-br-none' : 'bg-white border border-gray-300 text-gray-800 rounded-bl-none'} shadow-sm">
                                                <p class="text-sm">\${m.text}</p>
                                                <div class="flex justify-between items-center mt-1 gap-4">
                                                    <span class="text-[10px] opacity-75 block \${m.sender === 'user' ? 'text-left text-gray-400' : 'text-blue-200 text-right w-full'}">\${new Date(m.timestamp).toLocaleString('de-DE')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    \`).join('')}
                                </div>
                                
                                <div class="p-3 bg-white border-t border-gray-200 flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                                    <input type="text" id="adminSupportInput" placeholder="Deine manuelle Antwort schreiben..." class="flex-1 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-blue-500 font-sans text-sm" onkeypress="if(event.key === 'Enter') adminReplySupportMessage('\${chat.id}')" />
                                    <button onclick="adminReplySupportMessage('\${chat.id}')" class="bg-blue-900 text-white px-6 py-2 rounded font-bold hover:bg-blue-800 transition-colors cursor-pointer text-sm flex items-center gap-2">
                                        Senden <i data-lucide="send" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            \`;
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
            showModal('Fehler', 'Das Bild konnte nicht verarbeitet werden.');
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

window.changeUserRole = function(username, newRole) {
    if (!hasAdminAccess()) return;
    const user = registeredUsers.find(u => u.username === username);
    if (user) {
        user.role = newRole;
        window.saveState();
        renderApp();
    }
}

window.adminReplySupportMessage = function(chatId) {
    const input = document.getElementById('adminSupportInput');
    if(!input || input.value.trim() === '') return;
    
    const chat = supportChats.find(c => String(c.id) === String(chatId));
    if(chat) {
        chat.messages.push({
            sender: 'admin',
            text: input.value.trim(),
            timestamp: new Date().toISOString()
        });
        window.saveState();
    }
    renderApp();
    
    setTimeout(() => {
        const container = document.getElementById('adminChatContainer');
        if(container) container.scrollTop = container.scrollHeight;
        const nextInput = document.getElementById('adminSupportInput');
        if(nextInput) nextInput.focus();
    }, 50);
}

// -----------------------------------------
// Logik für Artikel bearbeiten / erstellen
// -----------------------------------------

window.editArticle = function(id) {
    if(!hasAuthorAccess()) return;
    const article = articles.find(a => a.id === id);
    if (!article) return;
    editingArticleId = id;
    renderApp();
    
    setTimeout(() => {
        document.getElementById('new-title').value = article.title || '';
        document.getElementById('new-category').value = article.category || '';
        document.getElementById('new-author').value = article.author || 'Redaktion';
        document.getElementById('new-summary').value = article.summary || '';
        document.getElementById('new-image-url').value = article.imageUrl || '';
        document.getElementById('new-content').value = article.content || '';
        
        const sourcesInput = document.getElementById('new-sources');
        if (sourcesInput) sourcesInput.value = article.sources ? article.sources.join(', ') : '';

        const cb = document.getElementById('new-eilmeldung');
        if(cb) cb.checked = !!article.isEilmeldung;
        
        const dateInput = document.getElementById('new-autodelete');
        if(dateInput) {
            if(article.autoDeleteDate) {
                const d = new Date(article.autoDeleteDate);
                const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
                dateInput.value = localIso;
            } else {
                dateInput.value = '';
            }
        }
        
        window.scrollTo(0, 0);
    }, 50);
}

window.cancelEdit = function() {
    editingArticleId = null;
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

    const saveArticle = (imgSrc) => {
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
            articles.unshift(newArticle);
            notifySubscribersOfArticle(newArticle).catch(err => console.error('Subscriber-Mail fehlgeschlagen:', err));
            showModal('Erfolgreich', 'Der neue Artikel wurde veröffentlicht.');
        }
        window.saveState();
        adminTab = 'articles';
        renderApp();
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
            // Artikelbilder auf max 1200px skalieren, um Speicher zu sparen
            const resized = await resizeImageFile(fileInput.files[0], { maxSize: 1200, quality: 0.85, preferWebp: false });
            if (resized.dataUrl) {
                saveArticle(resized.dataUrl);
            } else {
                // Fallback
                const reader = new FileReader();
                reader.onload = function(e) {
                    saveArticle(e.target.result);
                };
                reader.readAsDataURL(fileInput.files[0]);
            }
        } catch (error) {
            console.error('Fehler beim Skalieren des Artikelbildes:', error);
            showModal('Fehler', 'Das Artikelbild konnte nicht verarbeitet werden.');
        }
    } else {
        saveArticle(urlInput);
    }
}

window.deleteArticle = function(id) {
    if(!hasAuthorAccess()) return;
    currentModal = {
        title: 'Artikel löschen?',
        message: 'Möchtest du diesen Artikel wirklich unwiderruflich löschen?',
        onConfirm: function() {
            articles = articles.filter(a => a.id !== id);
            currentModal = {
                title: 'Gelöscht',
                message: 'Der Artikel wurde erfolgreich aus dem System entfernt.'
            };
            window.saveState();
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
                categories = importedData.categories || ["Politik", "Wirtschaft", "Gesellschaft", "Kultur", "Sport"];
                registeredUsers = importedData.registeredUsers;
                supportChats = importedData.supportChats || [];
                communityImages = importedData.communityImages || [];
                siteFeedbacks = importedData.siteFeedbacks || [];
                
                window.saveState();
                renderApp();
                showModal('Wiederherstellung erfolgreich', 'Das Backup wurde erfolgreich geladen. Alle Daten wurden auf den gesicherten Stand zurückgesetzt.');
            } else {
                throw new Error("Fehlerhaftes Format");
            }
        } catch (error) {
            showModal('Import fehlgeschlagen', 'Die Datei ist beschädigt oder kein gültiges System-Backup.');
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
                throw new Error("Fehlerhaftes Format");
            }
        } catch (error) {
            showModal('Import fehlgeschlagen', 'Die Datei konnte nicht gelesen werden. Stelle sicher, dass es die originale exportierte .txt Datei ist.');
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
        message: 'Möchtest du diesen Chat komplett aus der Datenbank löschen? (Auch der Nutzer verliert den Zugriff)',
        onConfirm: function() {
            supportChats = supportChats.filter(c => String(c.id) !== String(chatId));
            if (String(adminSelectedChatId) === String(chatId)) {
                adminSelectedChatId = null;
            }
            currentModal = null;
            window.saveState();
            renderApp();
        }
    };
    renderApp();
}

// -----------------------------------------
// ADMIN LOGIN + SUPPORT-CHAT LADEN VOM WORKER
// -----------------------------------------

const ADMIN_API_URL = "https://askai.mikestaub705.workers.dev/api/admin/chats";
const ADMIN_MASTER_PASSWORD = "LOL"; // <-- HIER DEIN PASSWORT EINTRAGEN

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
        const res = await fetch(ADMIN_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: pw })
        });

        const data = await res.json();

        // Chats aus KV übernehmen
        if (data && data.chats) {
            supportChats = Object.entries(data.chats).map(([id, messages]) => ({
                id,
                userId: messages[0]?.role === "user" ? "Gast" : "Unbekannt",
                messages: messages.map(m => ({
                    sender: m.role === "assistant" ? "admin" : "user",
                    text: m.content,
                    timestamp: new Date().toISOString()
                })),
                aiEnabled: false
            }));
        }

        window.saveState();
        
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
            showModal('Fehler', 'Fehler beim Laden der Support-Chats.');
        }
    }
};
