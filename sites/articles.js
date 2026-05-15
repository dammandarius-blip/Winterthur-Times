// Lädt alle Artikel aus dem Ordner _posts/ und zeigt sie automatisch an

async function loadArticles() {
    const postsContainer = document.getElementById("articles");

    if (!postsContainer) {
        console.error("Kein #articles Container gefunden.");
        return;
    }

    try {
        // GitHub Pages liefert Verzeichnislisten NICHT aus.
        // Deshalb müssen wir die Liste der Artikel manuell pflegen:
        const posts = await fetch("https://api.github.com/repos/dammandarius-blip/Winterthur-Times/contents/_posts")
            .then(r => r.json());

        // Nur .md Dateien
        const mdFiles = posts.filter(f => f.name.endsWith(".md"));

        // Sortieren nach Datum (Dateiname beginnt mit YYYY-MM-DD)
        mdFiles.sort((a, b) => b.name.localeCompare(a.name));

        for (const file of mdFiles) {
            const raw = await fetch(file.download_url).then(r => r.text());

            // Frontmatter entfernen
            const content = raw.replace(/---[\s\S]*?---/, "").trim();

            // Markdown → HTML (Mini-Konverter)
            const html = markdownToHtml(content);

            // Titel aus Dateiname
            const title = file.name
                .replace(/^\d{4}-\d{2}-\d{2}-/, "")
                .replace(/-/g, " ")
                .replace(/\.md$/, "");

            const articleEl = document.createElement("article");
            articleEl.innerHTML = `
                <h2>${title}</h2>
                <div>${html}</div>
                <hr>
            `;

            postsContainer.appendChild(articleEl);
        }

    } catch (err) {
        console.error("Fehler beim Laden der Artikel:", err);
    }
}

// Minimaler Markdown → HTML Konverter
function markdownToHtml(md) {
    return md
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*)\*\*/gim, "<b>$1</b>")
        .replace(/\*(.*)\*/gim, "<i>$1</i>")
        .replace(/\n$/gim, "<br>");
}

document.addEventListener("DOMContentLoaded", loadArticles);
