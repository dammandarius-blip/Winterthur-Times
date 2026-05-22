# Support-Chat mit Cloudflare KV

Diese Version speichert den Supportchat pro Benutzer in Cloudflare KV und lädt alle Chats im Admin-Panel.

## Dateien

- `assets/js/script.js`: Chatfenster auf der Website, lädt/speichert mit `userId`.
- `assets/js/admin.js`: Admin-Panel lädt Chats über `/api/admin/chats` und sendet manuelle Antworten über `/api/admin/send`.
- `cloudflare-worker.js`: fertiges Worker-Script für Cloudflare.

## Cloudflare einrichten

1. In Cloudflare Workers einen KV Namespace erstellen.
2. Beim Worker ein KV Binding mit exakt diesem Namen setzen: `chatkv`
3. Secret/Variable `GROQ_API_KEY` setzen.
4. Den Inhalt von `cloudflare-worker.js` als Worker-Code deployen.
5. Prüfen, dass die Worker-URL weiterhin `https://askai.mikestaub705.workers.dev` ist oder in `assets/js/script.js` und `assets/js/admin.js` anpassen.

## Admin

Admin-Passwort ist aktuell im Worker und in `assets/js/admin.js` auf `LOL` gesetzt. Für echte Nutzung solltest du es ändern.
