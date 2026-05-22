
/* =========================================================
   Winterthur Times – Erweiterter Artikel-Editor
   Nur für adminZentrale.html
   ========================================================= */

(function initAdvancedArticleEditor() {
    const ADVANCED_EDITOR_ID = "wt-advanced-article-editor";

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
            document.querySelector(".tab.active, .active, [aria-selected='true']")?.textContent?.toLowerCase().includes("artikel")
            || bodyText.includes("neuen artikel verfassen")
            || bodyText.includes("artikel verwalten");

        return articleTabActive && (bodyText.includes("admin") || bodyText.includes("artikel") || bodyText.includes("logout") || bodyText.includes("abmelden"));
    }

    function findAdminMount() {
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

        const mount = findAdminMount();
        const wrapper = document.createElement("section");
        wrapper.id = ADVANCED_EDITOR_ID;
        wrapper.className = "wt-advanced-editor wt-advanced-editor-inside-article-tab";
        wrapper.innerHTML = getEditorHtml();

        const existingNewArticleTitle = Array.from(mount.querySelectorAll("h1, h2, h3, h4, div, span"))
            .find(el => (el.textContent || "").trim().toLowerCase().includes("neuen artikel verfassen"));

        const oldSimpleForm = existingNewArticleTitle?.closest(".admin-card, .card, section, form, div");

        if (oldSimpleForm && oldSimpleForm.parentNode) {
            oldSimpleForm.insertAdjacentElement("afterend", wrapper);
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
                        <p class="wt-editor-kicker">Erweiterter Editor</p>
                        <h2>Neuen Artikel verfassen – erweitert</h2>
                        <p>Direkt im Artikel-Menü: mit Zwischenbildern, Quellen und Umfrage korrekt für Firebase speichern.</p>
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
        // Die Haupt-App definiert `articles`, `authors`, `categories`, `communityImages`,
        // `siteFeedbacks`, `firebaseDb` usw. als globale Lexical-Bindings.
        // Deshalb bewusst NICHT nur window.articles verwenden.
        if (typeof articles === "undefined" || !Array.isArray(articles)) {
            throw new Error("Die Artikelliste wurde nicht gefunden. Bitte Adminseite neu laden.");
        }

        articles.unshift(article);

        try {
            if (typeof notifySubscribersOfArticle === "function") {
                notifySubscribersOfArticle(article).catch(err => console.warn("Subscriber-Mail fehlgeschlagen:", err));
            }
        } catch (_) {}

        // Direkt in Firestore speichern, damit man nicht auf Debounce/saveState warten muss.
        if (typeof firebaseDb !== "undefined" && firebaseDb && typeof firebase !== "undefined") {
            await firebaseDb.collection("data").doc("articles").set({
                articles: articles,
                authors: typeof authors !== "undefined" && Array.isArray(authors) ? authors : [],
                categories: typeof categories !== "undefined" && Array.isArray(categories) ? categories : [],
                communityImages: typeof communityImages !== "undefined" && Array.isArray(communityImages) ? communityImages : [],
                siteFeedbacks: typeof siteFeedbacks !== "undefined" && Array.isArray(siteFeedbacks) ? siteFeedbacks : [],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } else if (typeof window.saveState === "function") {
            window.saveState();
            await new Promise(resolve => setTimeout(resolve, 900));
        } else {
            throw new Error("Firebase ist noch nicht bereit. Bitte ein paar Sekunden warten und nochmals speichern.");
        }

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

    function bindAdvancedEditor(wrapper) {
        const status = wrapper.querySelector("#wtArticleStatus");
        const preview = wrapper.querySelector("#wtArticlePreview");

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
                status.textContent = "Speichere Artikel in Firebase...";
                status.className = "wt-editor-status";

                await saveArticleToFirebase(article);

                preview.hidden = false;
                preview.textContent = JSON.stringify(article, null, 2);
                status.textContent = "Artikel wurde erfolgreich in Firebase gespeichert. Er sollte jetzt auf der Website sichtbar sein.";
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

    waitForAdminPage();
})();
