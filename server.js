const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3000;
const FILE_PATH = './winterthur_data.json';

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Für Bilder (Base64)

// 1. Daten beim Start laden oder Datei erstellen
app.get('/load', (req, res) => {
    if (!fs.existsSync(FILE_PATH)) {
        return res.json({}); // Leeres Objekt, falls Datei neu
    }
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    res.json(JSON.parse(data));
});

// 2. Daten speichern
app.post('/save', (req, res) => {
    fs.writeFileSync(FILE_PATH, JSON.stringify(req.body, null, 2));
    res.send({ status: "Erfolgreich gespeichert" });
});

app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
