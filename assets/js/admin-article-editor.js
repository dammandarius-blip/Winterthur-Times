
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



/* =========================================================
   Winterthur Times – Erweiterter Artikel-Editor
   Nur für adminZentrale.html
   ========================================================= */

(function initAdvancedArticleEditor() {
    const ADVANCED_EDITOR_ID = "wt-advanced-article-editor";
    let wtEditingArticleId = null;

    function isRealAdminPage() {
        const page = location.pathname.split("/").pop().toLowerCase();
        return page === "adminzentrale.html" || document.body?.classList.contains("admin-page");
    }

    function waitForAdminPage() {
        if (!isRealAdminPage()) return;

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", mountEditorWhenPossible);
        } else {
            mountEditorWhenPossible();
        }

        const observer = new MutationObserver(() => mountEditorWhenPossible());
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    function isLoggedInOrAdminPanelVisible() {
        const bodyText = document.body ? document.body.innerText.toLowerCase() : "";
        const articleTabActive =
            !!document.getElementById("wt-advanced-article-editor-host")
            || document.querySelector(".tab.active, .active, [aria-selected='true']")?.textContent?.toLowerCase().includes("artikel")
            || bodyText.includes("vorhandene artikel")
            || bodyText.includes("artikel verwalten");

        return articleTabActive && (bodyText.includes("admin") || bodyText.includes("artikel") || bodyText.includes("logout") || bodyText.includes("abmelden"));
    }

    function findAdminMount() {
        const explicitHost = document.getElementById("wt-advanced-article-editor-host");
        if (explicitHost) return explicitHost;

        // Bevorzugt direkt in den Artikel-Tab einfügen.
        const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, button, a, div, span"));
        const articleHeading = headings.find(el => {
            const text = (el.textContent || "").trim().toLowerCase();
            return text.includes("neuen artikel verfassen") || text === "artikel";
        });

        if (articleHeading) {
            const section = articleHeading.closest("section, article, .tab-content, .admin-card, .card, div");
            if (section) return section;
        }

        const activeTabPanel =
            document.querySelector('[data-tab="articles"]')
            || document.querySelector('[data-section="articles"]')
            || document.querySelector("#articles-tab")
            || document.querySelector("#artikel")
            || document.querySelector(".articles-admin")
            || document.querySelector(".article-admin");

        if (activeTabPanel) return activeTabPanel;

        return document.querySelector("#admin-panel")
            || document.querySelector(".admin-panel")
            || document.querySelector("[data-admin-panel]")
            || document.querySelector("#adminContent")
            || document.querySelector("#admin-content")
            || document.querySelector("main")
            || document.querySelector("#app")
            || document.body;
    }

    function mountEditorWhenPossible() {
        if (!document.body || document.getElementById(ADVANCED_EDITOR_ID)) return;
        if (!isLoggedInOrAdminPanelVisible()) return;

        const host = document.getElementById("wt-advanced-article-editor-host");
        const mount = host || findAdminMount();
        const wrapper = document.createElement("section");
        wrapper.id = ADVANCED_EDITOR_ID;
        wrapper.className = "wt-advanced-editor wt-advanced-editor-inside-article-tab";
        wrapper.innerHTML = getEditorHtml();

        if (host) {
            host.innerHTML = "";
            host.appendChild(wrapper);
        } else {
            mount.prepend(wrapper);
        }

        bindAdvancedEditor(wrapper);
    }

    function getEditorHtml() {
        return `
            <div class="wt-editor-card">
                <div class="wt-editor-head">
                    <div>
                        <p class="wt-editor-kicker">Artikel-Editor</p>
                        <h2>Neuen Artikel verfassen</h2>
                        <p>Mit Zwischenbildern, Quellen und Umfrage korrekt für Firebase speichern.</p>
                    </div>
                    <button type="button" class="wt-editor-small-btn" id="wtFillDemoArticle">Beispiel füllen</button>
                </div>

                <div class="wt-editor-grid">
                    <label>Titel
                        <input id="wtArticleTitle" type="text" placeholder="Artikelüberschrift">
                    </label>
                    <label>Autor
                        <input id="wtArticleAuthor" type="text" value="Redaktion">
                    </label>
                    <label>Kategorie
                        <select id="wtArticleCategory">
                            <option>Politik</option>
                            <option>Wirtschaft</option>
                            <option>Gesellschaft</option>
                            <option>Kultur</option>
                            <option>Sport</option>
                            <option selected>Lokales</option>
                            <option>Wissenschaft</option>
                            <option>Unterhaltung</option>
                            <option>Panorama</option>
                        </select>
                    </label>
                    <label>Hauptbild-URL
                        <input id="wtArticleImageUrl" type="url" placeholder="https://...">
                    </label>
                </div>

                <label>Zusammenfassung
                    <textarea id="wtArticleSummary" rows="3" placeholder="Kurze Zusammenfassung für Startseite und Artikelkopf"></textarea>
                </label>

                <label>Artikeltext
                    <textarea id="wtArticleContent" rows="16" placeholder="Schreibe den Artikel hier. Überschriften mit ## schreiben. Absätze mit Leerzeile trennen."></textarea>
                </label>

                <div class="wt-editor-row">
                    <label class="wt-check">
                        <input id="wtArticleBreaking" type="checkbox">
                        Eilmeldung
                    </label>
                </div>

                <div class="wt-editor-subcard">
                    <div class="wt-editor-subhead">
                        <div>
                            <h3>Zwischenbilder</h3>
                            <p>Position = nach welchem normalen Absatz das Bild erscheinen soll. Überschriften zählen nicht als Absatz.</p>
                        </div>
                        <button type="button" class="wt-editor-small-btn" id="wtAddInlineImage">+ Bild hinzufügen</button>
                    </div>
                    <div id="wtInlineImagesList" class="wt-repeat-list"></div>
                </div>

                <div class="wt-editor-subcard">
                    <div class="wt-editor-subhead">
                        <div>
                            <h3>Umfrage</h3>
                            <p>Optional. Leer lassen, wenn der Artikel keine Umfrage haben soll.</p>
                        </div>
                        <button type="button" class="wt-editor-small-btn" id="wtAddPollOption">+ Antwortoption</button>
                    </div>
                    <label>Frage
                        <input id="wtPollQuestion" type="text" placeholder="z. B. Findest du diese Massnahme sinnvoll?">
                    </label>
                    <div id="wtPollOptionsList" class="wt-repeat-list"></div>
                </div>

                <label>Quellen, eine pro Zeile
                    <textarea id="wtArticleSources" rows="4" placeholder="https://..."></textarea>
                </label>

                <div class="wt-editor-actions">
                    <button type="button" id="wtPreviewArticle" class="wt-editor-secondary">Vorschau JSON</button>
                    <button type="button" id="wtSaveArticle" class="wt-editor-primary">Artikel in Firebase speichern</button>
                </div>

                <pre id="wtArticlePreview" class="wt-json-preview" hidden></pre>
                <p id="wtArticleStatus" class="wt-editor-status"></p>
            </div>
        `;
    }

    function escapeAttr(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function addInlineImageRow(data = {}) {
        const list = document.getElementById("wtInlineImagesList");
        if (!list) return;

        const row = document.createElement("div");
        row.className = "wt-repeat-row wt-inline-image-row";
        row.innerHTML = `
            <label>Position nach Absatz
                <input class="wtInlineImagePosition" type="number" min="1" value="${data.positionAfterParagraph || 4}">
            </label>
            <label>Bild-URL
                <input class="wtInlineImageUrl" type="url" value="${escapeAttr(data.url || "")}" placeholder="https://...">
            </label>
            <label>Bildunterschrift
                <input class="wtInlineImageCaption" type="text" value="${escapeAttr(data.caption || "")}" placeholder="Kurze Bildbeschreibung">
            </label>
            <button type="button" class="wt-editor-danger wtRemoveRow">Entfernen</button>
        `;
        list.appendChild(row);
    }

    function addPollOptionRow(value = "") {
        const list = document.getElementById("wtPollOptionsList");
        if (!list) return;

        const row = document.createElement("div");
        row.className = "wt-repeat-row wt-poll-option-row";
        row.innerHTML = `
            <label>Antwortoption
                <input class="wtPollOption" type="text" value="${escapeAttr(value)}" placeholder="Antwort">
            </label>
            <button type="button" class="wt-editor-danger wtRemoveRow">Entfernen</button>
        `;
        list.appendChild(row);
    }

    function buildArticleFromForm() {
        const title = document.getElementById("wtArticleTitle")?.value.trim() || "";
        const summary = document.getElementById("wtArticleSummary")?.value.trim() || "";
        const content = document.getElementById("wtArticleContent")?.value.trim() || "";
        const author = document.getElementById("wtArticleAuthor")?.value.trim() || "Redaktion";
        const category = document.getElementById("wtArticleCategory")?.value || "Lokales";
        const imageUrl = document.getElementById("wtArticleImageUrl")?.value.trim() || "";
        const isEilmeldung = document.getElementById("wtArticleBreaking")?.checked === true;

        if (!title || !summary || !content) {
            throw new Error("Bitte mindestens Titel, Zusammenfassung und Artikeltext ausfüllen.");
        }

        const inlineImages = Array.from(document.querySelectorAll(".wt-inline-image-row")).map(row => {
            const positionAfterParagraph = Number(row.querySelector(".wtInlineImagePosition")?.value || 0);
            const url = row.querySelector(".wtInlineImageUrl")?.value.trim() || "";
            const caption = row.querySelector(".wtInlineImageCaption")?.value.trim() || "";
            return { positionAfterParagraph, url, caption };
        }).filter(img => img.positionAfterParagraph > 0 && img.url);

        const sources = (document.getElementById("wtArticleSources")?.value || "")
            .split(/\n+/)
            .map(s => s.trim())
            .filter(Boolean);

        const pollQuestion = document.getElementById("wtPollQuestion")?.value.trim() || "";
        const pollOptions = Array.from(document.querySelectorAll(".wtPollOption"))
            .map(input => input.value.trim())
            .filter(Boolean);

        let poll = null;
        if (pollQuestion && pollOptions.length >= 2) {
            poll = {
                id: `poll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                question: pollQuestion,
                options: pollOptions,
                votes: pollOptions.reduce((acc, option) => {
                    acc[option] = [];
                    return acc;
                }, {})
            };
        }

        const article = {
            id: Date.now(),
            title,
            summary,
            content,
            author,
            category,
            imageUrl,
            timestamp: new Date().toISOString(),
            likes: [],
            views: [],
            comments: [],
            sources,
            isEilmeldung,
            inlineImages
        };

        if (poll) article.poll = poll;

        return article;
    }

    async function saveArticleToFirebase(article) {
        await wtSaveArticleAppendOnly(article);

        if (typeof renderApp === "function") {
            renderApp();
        }

        return article;
    }

    function fillDemoArticle() {
        document.getElementById("wtArticleTitle").value = "Winterthur macht sich klimafit: Warum die Stadt jetzt über Hitze, Starkregen und grünere Quartiere spricht";
        document.getElementById("wtArticleSummary").value = "Die Klimawoche 2026 zeigt, wie Winterthur auf Hitzewellen, Trockenheit und Starkregen reagieren will. Dabei geht es nicht nur um grosse Klimaziele, sondern auch um konkrete Fragen im Alltag.";
        document.getElementById("wtArticleAuthor").value = "Redaktion";
        document.getElementById("wtArticleCategory").value = "Lokales";
        document.getElementById("wtArticleImageUrl").value = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";
        document.getElementById("wtArticleContent").value =
`Winterthur steht vor einer Frage, die in den nächsten Jahren immer wichtiger werden dürfte: Wie lebt es sich in einer Stadt, wenn Sommer heisser, Regenfälle heftiger und trockene Phasen länger werden?

Die Stadt will nicht nur über Klimaschutz sprechen, sondern zeigen, was sich im Alltag konkret verändern kann.

## Eine Stadt zwischen Hitze und Starkregen

Besonders in dicht bebauten Quartieren kann Hitze schnell zum Problem werden. Asphalt, Beton und dunkle Fassaden speichern Wärme.

Genau hier setzt die Diskussion in Winterthur an. Die Stadt beschäftigt sich damit, wie öffentliche Räume auch in Zukunft angenehm nutzbar bleiben.

## Was bedeutet klimafit?

Eine klimafitte Stadt ist besser auf extreme Wetterlagen vorbereitet. Sie kann Hitze besser abfedern, mit Starkregen umgehen und trockene Phasen besser überstehen.

Ein wichtiges Stichwort ist die Schwammstadt. Regenwasser soll nicht sofort verschwinden, sondern vor Ort gespeichert und später wieder abgegeben werden.

## Fazit

Die Klimawoche zeigt, dass Klimaanpassung in Winterthur bereits jetzt ein wichtiges Thema ist.`;
        document.getElementById("wtArticleSources").value = "https://stadt.winterthur.ch/themen/leben-in-winterthur/energie-umwelt-natur/klimawoche-2026";
        document.getElementById("wtInlineImagesList").innerHTML = "";
        addInlineImageRow({
            positionAfterParagraph: 2,
            url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            caption: "Mehr Grünflächen und Schatten können Städte an heisse Sommer anpassen."
        });
        addInlineImageRow({
            positionAfterParagraph: 5,
            url: "https://images.unsplash.com/photo-1494526585095-c41746248156?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            caption: "Bei Klimaanpassung geht es auch um lebenswertere Quartiere."
        });
        document.getElementById("wtPollQuestion").value = "Findest du, Winterthur sollte mehr Strassen und Plätze begrünen?";
        document.getElementById("wtPollOptionsList").innerHTML = "";
        ["Ja, unbedingt", "Ja, aber nur an bestimmten Orten", "Nein, andere Themen sind wichtiger", "Ich bin unsicher"].forEach(addPollOptionRow);
    }


    function persistArticlesToFirebase() {
        if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
            return firebaseDb.collection("data").doc("articles").set({
                articles: articles,
                authors: typeof authors !== "undefined" && Array.isArray(authors) ? authors : [],
                categories: typeof categories !== "undefined" && Array.isArray(categories) ? categories : [],
                communityImages: typeof communityImages !== "undefined" && Array.isArray(communityImages) ? communityImages : [],
                siteFeedbacks: typeof siteFeedbacks !== "undefined" && Array.isArray(siteFeedbacks) ? siteFeedbacks : [],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
        if (typeof saveData === "function") return saveData();
        if (typeof updateData === "function") return updateData();
        throw new Error("Firebase-Speicherfunktion nicht gefunden.");
    }

    function normalizeEditorContent(value) {
        return String(value || "")
            .replace(/\\r\\n/g, "\n")
            .replace(/\\n/g, "\n")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n");
    }

    function setEditorMode(isEditing, title = "") {
        const text = document.getElementById("wtEditorModeText");
        const cancel = document.getElementById("wtCancelEditArticle");
        const save = document.getElementById("wtSaveArticle");
        if (text) text.textContent = isEditing ? `Artikel bearbeiten: ${title}` : "Neuen Artikel erstellen";
        if (cancel) cancel.style.display = isEditing ? "" : "none";
        if (save) save.textContent = isEditing ? "Änderungen speichern" : "Artikel in Firebase speichern";
    }

    function addEditorModeNotice(wrapper) {
        if (document.getElementById("wtEditorModeNotice")) return;
        const card = wrapper.querySelector(".wt-editor-card") || wrapper;
        const box = document.createElement("div");
        box.id = "wtEditorModeNotice";
        box.className = "wt-editor-mode-notice";
        box.innerHTML = `<div><strong>Modus:</strong> <span id="wtEditorModeText">Neuen Artikel erstellen</span></div><button type="button" id="wtCancelEditArticle" class="wt-editor-small-btn" style="display:none;">Bearbeiten abbrechen</button>`;
        card.insertBefore(box, card.firstChild);
        box.querySelector("#wtCancelEditArticle")?.addEventListener("click", () => {
            wtEditingArticleId = null;
            clearAdvancedEditorForm();
            setEditorMode(false);
        });
    }

    function clearAdvancedEditorForm() {
        const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
        set("wtArticleTitle", "");
        set("wtArticleAuthor", "Redaktion");
        set("wtArticleCategory", "Lokales");
        set("wtArticleImageUrl", "");
        set("wtArticleSummary", "");
        set("wtArticleContent", "");
        set("wtArticleSources", "");
        set("wtPollQuestion", "");
        const breaking = document.getElementById("wtArticleBreaking");
        if (breaking) breaking.checked = false;
        const images = document.getElementById("wtInlineImagesList");
        if (images) images.innerHTML = "";
        const options = document.getElementById("wtPollOptionsList");
        if (options) options.innerHTML = "";
        addInlineImageRow();
        addPollOptionRow("Ja");
        addPollOptionRow("Nein");
    }

    function loadArticleIntoAdvancedEditor(article) {
        if (!article) return;
        clearAdvancedEditorForm();
        const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value == null ? "" : String(value); };
        set("wtArticleTitle", article.title || "");
        set("wtArticleAuthor", article.author || "Redaktion");
        set("wtArticleCategory", article.category || "Lokales");
        set("wtArticleImageUrl", article.imageUrl || "");
        set("wtArticleSummary", article.summary || "");
        set("wtArticleContent", normalizeEditorContent(article.content || ""));
        set("wtArticleSources", Array.isArray(article.sources) ? article.sources.join("\n") : "");
        const breaking = document.getElementById("wtArticleBreaking");
        if (breaking) breaking.checked = article.isEilmeldung === true;
        const images = document.getElementById("wtInlineImagesList");
        if (images) {
            images.innerHTML = "";
            (Array.isArray(article.inlineImages) ? article.inlineImages : []).forEach(img => addInlineImageRow(img));
        }
        const pollQ = document.getElementById("wtPollQuestion");
        if (pollQ) pollQ.value = article.poll?.question || "";
        const opts = document.getElementById("wtPollOptionsList");
        if (opts) {
            opts.innerHTML = "";
            (Array.isArray(article.poll?.options) ? article.poll.options : []).forEach(opt => addPollOptionRow(opt));
        }
        wtEditingArticleId = article.id;
        setEditorMode(true, article.title || "");
        document.getElementById(ADVANCED_EDITOR_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function updateExistingArticleFromEditor(articleFromForm) {
        if (typeof articles === "undefined" || !Array.isArray(articles)) {
            throw new Error("Die Artikelliste wurde nicht gefunden.");
        }
        const index = articles.findIndex(a => String(a.id) === String(wtEditingArticleId));
        if (index < 0) throw new Error("Der zu bearbeitende Artikel wurde nicht gefunden.");
        const old = articles[index];
        const updated = {
            ...articleFromForm,
            id: old.id,
            timestamp: old.timestamp || articleFromForm.timestamp,
            likes: Array.isArray(old.likes) ? old.likes : [],
            views: Array.isArray(old.views) ? old.views : [],
            comments: Array.isArray(old.comments) ? old.comments : []
        };
        if (updated.poll && old.poll) {
            updated.poll.id = old.poll.id || updated.poll.id || `poll_${old.id}`;
            const oldVotes = old.poll.votes || {};
            updated.poll.votes = updated.poll.options.reduce((acc, option) => {
                acc[option] = Array.isArray(oldVotes[option]) ? oldVotes[option] : [];
                return acc;
            }, {});
        }
        articles[index] = updated;
        await persistArticlesToFirebase();
        wtEditingArticleId = null;
        setEditorMode(false);
        if (typeof renderApp === "function") renderApp();
        setTimeout(patchExistingArticleEditButtons, 500);
        return updated;
    }

    function patchExistingArticleEditButtons() {
        if (typeof articles === "undefined" || !Array.isArray(articles)) return;
        const elements = Array.from(document.querySelectorAll("button, a, [onclick], [role='button']"));
        elements.forEach(el => {
            if (el.dataset.wtAdvancedEditPatched === "true") return;
            const text = (el.textContent || "").trim().toLowerCase();
            if (!text.includes("bearbeiten") && text !== "edit" && !text.includes("ändern")) return;
            const container = el.closest("tr, li, article, section, .card, .admin-card, div");
            const containerText = (container?.textContent || "").toLowerCase();
            const article = articles.find(a => a.title && containerText.includes(String(a.title).toLowerCase().slice(0, 24)));
            if (!article) return;
            el.dataset.wtAdvancedEditPatched = "true";
            el.addEventListener("click", event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                loadArticleIntoAdvancedEditor(article);
            }, true);
        });
    }

    function startArticleEditButtonObserver() {
        patchExistingArticleEditButtons();
        if (window.__wtAdvancedArticleEditObserver) return;
        window.__wtAdvancedArticleEditObserver = true;
        const obs = new MutationObserver(() => patchExistingArticleEditButtons());
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setInterval(patchExistingArticleEditButtons, 1200);
    }

    function bindAdvancedEditor(wrapper) {
        const status = wrapper.querySelector("#wtArticleStatus");
        const preview = wrapper.querySelector("#wtArticlePreview");
        addEditorModeNotice(wrapper);
        startArticleEditButtonObserver();

        wrapper.querySelector("#wtAddInlineImage")?.addEventListener("click", () => addInlineImageRow());
        wrapper.querySelector("#wtAddPollOption")?.addEventListener("click", () => addPollOptionRow());
        wrapper.querySelector("#wtFillDemoArticle")?.addEventListener("click", fillDemoArticle);

        wrapper.addEventListener("click", event => {
            const remove = event.target.closest(".wtRemoveRow");
            if (remove) remove.closest(".wt-repeat-row")?.remove();
        });

        wrapper.querySelector("#wtPreviewArticle")?.addEventListener("click", () => {
            try {
                const article = buildArticleFromForm();
                preview.hidden = false;
                preview.textContent = JSON.stringify(article, null, 2);
                status.textContent = "Vorschau erstellt. Wenn alles passt, speichern.";
                status.className = "wt-editor-status ok";
            } catch (err) {
                status.textContent = err.message;
                status.className = "wt-editor-status error";
            }
        });

        wrapper.querySelector("#wtSaveArticle")?.addEventListener("click", async () => {
            try {
                const article = buildArticleFromForm();
                status.textContent = wtEditingArticleId ? "Aktualisiere Artikel in Firebase..." : "Speichere Artikel in Firebase...";
                status.className = "wt-editor-status";

                const wasEditing = !!wtEditingArticleId;
                const savedArticle = wasEditing
                    ? await updateExistingArticleFromEditor(article)
                    : await saveArticleToFirebase(article);

                preview.hidden = false;
                preview.textContent = JSON.stringify(savedArticle || article, null, 2);
                status.textContent = wasEditing ? "Artikel wurde erfolgreich aktualisiert." : "Artikel wurde erfolgreich in Firebase gespeichert. Er sollte jetzt auf der Website sichtbar sein.";
                status.className = "wt-editor-status ok";
            } catch (err) {
                status.textContent = "Fehler beim Speichern: " + err.message;
                status.className = "wt-editor-status error";
            }
        });

        addInlineImageRow();
        addPollOptionRow("Ja");
        addPollOptionRow("Nein");
    }


    window.loadArticleIntoAdvancedEditorById = function(id) {
        const doLoad = () => {
            mountEditorWhenPossible();
            const article = (typeof articles !== "undefined" && Array.isArray(articles))
                ? articles.find(a => String(a.id) === String(id))
                : null;
            if (article && document.getElementById(ADVANCED_EDITOR_ID)) {
                loadArticleIntoAdvancedEditor(article);
                return true;
            }
            return false;
        };

        if (!doLoad()) {
            setTimeout(doLoad, 200);
            setTimeout(doLoad, 600);
        }
    };

    window.cancelAdvancedArticleEdit = function() {
        wtEditingArticleId = null;
        clearAdvancedEditorForm();
        setEditorMode(false);
    };

    waitForAdminPage();
})();



/* =========================================================
   Fix: "Bearbeiten abbrechen" im erweiterten Artikel-Editor
   ========================================================= */
(function fixAdvancedEditorCancelButton() {
    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    function addDefaultInlineImageRow() {
        const list = document.getElementById("wtInlineImagesList");
        if (!list) return;
        const row = document.createElement("div");
        row.className = "wt-repeat-row wt-inline-image-row";
        row.innerHTML = '<label>Position nach Absatz<input class="wtInlineImagePosition" type="number" min="1" value="4"></label><label>Bild-URL<input class="wtInlineImageUrl" type="url" placeholder="https://..."></label><label>Bildunterschrift<input class="wtInlineImageCaption" type="text" placeholder="Kurze Bildbeschreibung"></label><button type="button" class="wt-editor-danger wtRemoveRow">Entfernen</button>';
        list.appendChild(row);
    }

    function addDefaultPollOption(value) {
        const list = document.getElementById("wtPollOptionsList");
        if (!list) return;
        const row = document.createElement("div");
        row.className = "wt-repeat-row wt-poll-option-row";
        row.innerHTML = '<label>Antwortoption<input class="wtPollOption" type="text" placeholder="Antwort"></label><button type="button" class="wt-editor-danger wtRemoveRow">Entfernen</button>';
        row.querySelector(".wtPollOption").value = value;
        list.appendChild(row);
    }

    function resetAdvancedArticleEditorToCreateMode() {
        window.editingArticleId = null;
        window.currentEditingArticleId = null;
        window.wtEditingArticleId = null;

        const editor = document.getElementById("wt-advanced-article-editor");
        if (editor) {
            editor.classList.remove("is-editing-article");
            editor.removeAttribute("data-editing-article-id");
        }

        setValue("wtArticleTitle", "");
        setValue("wtArticleAuthor", "Redaktion");
        setValue("wtArticleCategory", "Lokales");
        setValue("wtArticleImageUrl", "");
        setValue("wtArticleSummary", "");
        setValue("wtArticleContent", "");
        setValue("wtArticleSources", "");
        setValue("wtPollQuestion", "");

        const breaking = document.getElementById("wtArticleBreaking");
        if (breaking) breaking.checked = false;

        const images = document.getElementById("wtInlineImagesList");
        if (images) {
            images.innerHTML = "";
            addDefaultInlineImageRow();
        }

        const options = document.getElementById("wtPollOptionsList");
        if (options) {
            options.innerHTML = "";
            addDefaultPollOption("Ja");
            addDefaultPollOption("Nein");
        }

        const preview = document.getElementById("wtArticlePreview");
        if (preview) {
            preview.hidden = true;
            preview.textContent = "";
        }

        const status = document.getElementById("wtArticleStatus");
        if (status) {
            status.textContent = "Bearbeiten abgebrochen. Du kannst jetzt einen neuen Artikel erstellen.";
            status.className = "wt-editor-status ok";
        }

        const modeText = document.getElementById("wtEditorModeText");
        if (modeText) modeText.textContent = "Neuen Artikel erstellen";

        const cancel = document.getElementById("wtCancelEditArticle");
        if (cancel) cancel.style.display = "none";

        const save = document.getElementById("wtSaveArticle");
        if (save) {
            save.textContent = "Artikel in Firebase speichern";
            save.dataset.editingArticleId = "";
            save.removeAttribute("data-editing-article-id");
        }
    }

    document.addEventListener("click", function(event) {
        const cancel = event.target.closest && event.target.closest("#wtCancelEditArticle");
        if (!cancel) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        resetAdvancedArticleEditorToCreateMode();
    }, true);

    window.resetAdvancedArticleEditorToCreateMode = resetAdvancedArticleEditorToCreateMode;
})();




/* =========================================================
   GitHub-Bilder-Upload für Artikelbilder
   ========================================================= */
(function initGithubImageUploaderForAdmin() {
    const WORKER_URL_KEY = "wt_askai_worker_url";
    const ADMIN_PASSWORD_KEY = "wt_admin_password";

    function getWorkerBaseUrl() {
        if (window.WT_SUPPORT_WORKER_URL) return String(window.WT_SUPPORT_WORKER_URL).replace(/\/+$/, "");
        if (window.ASKAI_WORKER_URL) return String(window.ASKAI_WORKER_URL).replace(/\/+$/, "");
        const saved = localStorage.getItem(WORKER_URL_KEY);
        if (saved) return saved.replace(/\/+$/, "");
        return "";
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(reader.error || new Error("Bild konnte nicht gelesen werden."));
            reader.readAsDataURL(file);
        });
    }

    function ensureUploaderPanel() {
        const editor = document.getElementById("wt-advanced-article-editor");
        if (!editor || document.getElementById("wtGithubImageUploader")) return;

        const mainImageInput = document.getElementById("wtArticleImageUrl");
        const target = mainImageInput?.closest("label") || editor.querySelector(".wt-editor-grid") || editor.querySelector(".wt-editor-card") || editor;

        const panel = document.createElement("div");
        panel.id = "wtGithubImageUploader";
        panel.className = "wt-github-image-uploader";
        panel.innerHTML = `
            <div class="wt-github-image-head">
                <div>
                    <h3>Lokale Bilder nach GitHub hochladen</h3>
                    <p>Wähle ein Bild vom PC. Es wird ins GitHub-Repo unter <code>assets/uploads/</code> gespeichert. Danach kannst du die Bildadresse direkt für Artikel verwenden.</p>
                </div>
            </div>

            <div class="wt-github-worker-row">
                <label>Worker-URL
                    <input id="wtGithubWorkerUrl" type="url" placeholder="https://dein-worker.dein-name.workers.dev">
                </label>
                <button type="button" id="wtSaveWorkerUrl" class="wt-editor-secondary">Worker-URL speichern</button>
            </div>

            <div class="wt-github-upload-row">
                <input id="wtGithubImageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml">
                <button type="button" id="wtUploadGithubImage" class="wt-editor-primary">Bild hochladen</button>
                <button type="button" id="wtLoadGithubImages" class="wt-editor-secondary">Bilder laden</button>
            </div>

            <p id="wtGithubImageStatus" class="wt-editor-status"></p>

            <div id="wtGithubUploadedResult" class="wt-github-upload-result" hidden>
                <label>Bildadresse
                    <input id="wtGithubUploadedUrl" type="text" readonly>
                </label>
                <div class="wt-github-upload-actions">
                    <button type="button" id="wtCopyGithubImageUrl" class="wt-editor-secondary">URL kopieren</button>
                    <button type="button" id="wtUseGithubImageAsMain" class="wt-editor-primary">Als Hauptbild verwenden</button>
                    <button type="button" id="wtAddGithubImageAsInline" class="wt-editor-secondary">Als Zwischenbild hinzufügen</button>
                </div>
            </div>

            <div id="wtGithubImagesList" class="wt-github-images-list"></div>
        `;

        target.insertAdjacentElement("afterend", panel);
        bindUploaderPanel(panel);

        const workerInput = panel.querySelector("#wtGithubWorkerUrl");
        if (workerInput) workerInput.value = getWorkerBaseUrl();
    }

    function setStatus(message, type = "") {
        const status = document.getElementById("wtGithubImageStatus");
        if (!status) return;
        status.textContent = message;
        status.className = "wt-editor-status " + type;
    }

    function bindUploaderPanel(panel) {
        panel.querySelector("#wtSaveWorkerUrl")?.addEventListener("click", () => {
            const value = panel.querySelector("#wtGithubWorkerUrl")?.value.trim() || "";
            if (!value) {
                setStatus("Bitte zuerst die Worker-URL eintragen.", "error");
                return;
            }
            localStorage.setItem(WORKER_URL_KEY, value.replace(/\/+$/, ""));
            setStatus("Worker-URL gespeichert.", "ok");
        });

        panel.querySelector("#wtUploadGithubImage")?.addEventListener("click", uploadSelectedImage);
        panel.querySelector("#wtLoadGithubImages")?.addEventListener("click", loadUploadedImages);

        panel.querySelector("#wtCopyGithubImageUrl")?.addEventListener("click", async () => {
            const url = panel.querySelector("#wtGithubUploadedUrl")?.value || "";
            if (!url) return;
            await navigator.clipboard.writeText(url);
            setStatus("Bildadresse kopiert.", "ok");
        });

        panel.querySelector("#wtUseGithubImageAsMain")?.addEventListener("click", () => {
            const url = panel.querySelector("#wtGithubUploadedUrl")?.value || "";
            const mainInput = document.getElementById("wtArticleImageUrl");
            if (url && mainInput) {
                mainInput.value = url;
                setStatus("Bild wurde als Hauptbild eingetragen.", "ok");
            }
        });

        panel.querySelector("#wtAddGithubImageAsInline")?.addEventListener("click", () => {
            const url = panel.querySelector("#wtGithubUploadedUrl")?.value || "";
            addInlineImageWithUrl(url);
        });
    }

    function getRequestPassword() {
        const saved = sessionStorage.getItem(ADMIN_PASSWORD_KEY) || localStorage.getItem(ADMIN_PASSWORD_KEY) || "";
        if (saved) return saved;

        const entered = prompt("Admin-Passwort für den Upload eingeben:");
        if (entered) {
            sessionStorage.setItem(ADMIN_PASSWORD_KEY, entered);
            return entered;
        }
        return "";
    }

    async function uploadSelectedImage() {
        try {
            const workerUrl = (document.getElementById("wtGithubWorkerUrl")?.value || getWorkerBaseUrl()).replace(/\/+$/, "");
            const file = document.getElementById("wtGithubImageFile")?.files?.[0];

            if (!workerUrl) {
                setStatus("Bitte zuerst die Worker-URL eintragen und speichern.", "error");
                return;
            }
            localStorage.setItem(WORKER_URL_KEY, workerUrl);

            if (!file) {
                setStatus("Bitte zuerst ein Bild auswählen.", "error");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setStatus("Bild ist zu gross. Bitte unter 5 MB verwenden.", "error");
                return;
            }

            setStatus("Bild wird hochgeladen...");

            const base64 = await fileToBase64(file);
            const password = getRequestPassword();
            if (!password) {
                setStatus("Upload abgebrochen: Kein Admin-Passwort.", "error");
                return;
            }

            const res = await fetch(`${workerUrl}/api/admin/upload-image`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, filename: file.name, base64 })
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                throw new Error(data.details || data.error || "Upload fehlgeschlagen.");
            }

            showUploadedUrl(data.url);
            setStatus("Bild erfolgreich hochgeladen. Die URL kann jetzt verwendet werden.", "ok");
            await loadUploadedImages(false);
        } catch (err) {
            setStatus("Upload fehlgeschlagen: " + err.message, "error");
        }
    }

    function showUploadedUrl(url) {
        const box = document.getElementById("wtGithubUploadedResult");
        const input = document.getElementById("wtGithubUploadedUrl");
        if (box) box.hidden = false;
        if (input) input.value = url || "";
    }

    function addInlineImageWithUrl(url) {
        if (!url) return;

        const list = document.getElementById("wtInlineImagesList");
        if (!list) {
            setStatus("Zwischenbilder-Liste wurde nicht gefunden.", "error");
            return;
        }

        const safeUrl = String(url).replace(/"/g, "&quot;");
        const row = document.createElement("div");
        row.className = "wt-repeat-row wt-inline-image-row";
        row.innerHTML = `
            <label>Position nach Absatz
                <input class="wtInlineImagePosition" type="number" min="1" value="3">
            </label>
            <label>Bild-URL
                <input class="wtInlineImageUrl" type="url" value="${safeUrl}" placeholder="https://...">
            </label>
            <label>Bildunterschrift
                <input class="wtInlineImageCaption" type="text" placeholder="Kurze Bildbeschreibung">
            </label>
            <button type="button" class="wt-editor-danger wtRemoveRow">Entfernen</button>
        `;
        list.appendChild(row);
        setStatus("Bild wurde als Zwischenbild hinzugefügt. Position und Bildunterschrift kannst du noch anpassen.", "ok");
    }

    async function loadUploadedImages(showStatus = true) {
        try {
            const workerUrl = (document.getElementById("wtGithubWorkerUrl")?.value || getWorkerBaseUrl()).replace(/\/+$/, "");
            if (!workerUrl) {
                setStatus("Bitte zuerst die Worker-URL eintragen.", "error");
                return;
            }

            const password = getRequestPassword();
            if (!password) return;

            if (showStatus) setStatus("Bilder werden geladen...");

            const res = await fetch(`${workerUrl}/api/admin/uploaded-images`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password })
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                throw new Error(data.details || data.error || "Bilder konnten nicht geladen werden.");
            }

            renderImagesList(data.images || []);
            if (showStatus) setStatus("Bilder geladen.", "ok");
        } catch (err) {
            setStatus("Bilderliste fehlgeschlagen: " + err.message, "error");
        }
    }

    function renderImagesList(images) {
        const list = document.getElementById("wtGithubImagesList");
        if (!list) return;

        if (!images.length) {
            list.innerHTML = `<p class="text-sm text-gray-500">Noch keine hochgeladenen Bilder gefunden.</p>`;
            return;
        }

        list.innerHTML = images.map(img => `
            <div class="wt-github-image-item">
                <img src="${img.url}" alt="" loading="lazy">
                <div>
                    <strong>${img.name}</strong>
                    <input type="text" value="${img.url}" readonly>
                    <div class="wt-github-upload-actions">
                        <button type="button" class="wt-editor-secondary" data-copy-url="${img.url}">URL kopieren</button>
                        <button type="button" class="wt-editor-primary" data-main-url="${img.url}">Als Hauptbild</button>
                        <button type="button" class="wt-editor-secondary" data-inline-url="${img.url}">Als Zwischenbild</button>
                    </div>
                </div>
            </div>
        `).join("");

        list.querySelectorAll("[data-copy-url]").forEach(btn => {
            btn.addEventListener("click", async () => {
                await navigator.clipboard.writeText(btn.dataset.copyUrl);
                setStatus("Bildadresse kopiert.", "ok");
            });
        });

        list.querySelectorAll("[data-main-url]").forEach(btn => {
            btn.addEventListener("click", () => {
                const input = document.getElementById("wtArticleImageUrl");
                if (input) input.value = btn.dataset.mainUrl;
                setStatus("Bild wurde als Hauptbild eingetragen.", "ok");
            });
        });

        list.querySelectorAll("[data-inline-url]").forEach(btn => {
            btn.addEventListener("click", () => addInlineImageWithUrl(btn.dataset.inlineUrl));
        });
    }

    const observer = new MutationObserver(ensureUploaderPanel);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", ensureUploaderPanel);
    } else {
        ensureUploaderPanel();
    }
})();

