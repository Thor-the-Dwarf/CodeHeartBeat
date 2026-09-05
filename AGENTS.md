# CodeHeartBeat

## Projektziel

CodeHeartBeat ist eine vollständig statische Lern- und Visualisierungsanwendung für Java-Code. Die Website muss sowohl durch direktes Starten von `public/index.html` als auch über GitHub Pages funktionieren.

## Wichtige Verzeichnisse

- `public/`: direkt auslieferbare Website mit `index.html`, `styles.css`, `app.js` und der generierten `folder-data.js`
- `FolderTree/`: Java-Lernbeispiele, die in der Anwendung angezeigt werden
- `scripts/generate-folder-data.js`: erzeugt aus `FolderTree/` die statische Datei `public/folder-data.js`
- `.github/workflows/pages.yml`: baut und veröffentlicht `public/` auf GitHub Pages

## Regeln für Änderungen

- Keine Serverabhängigkeit in den normalen Startweg einführen. `public/index.html` muss direkt startbar bleiben.
- Für sichtbare deutsche Texte echte Umlaute und `ß` verwenden.
- Keine absoluten lokalen Dateipfade in die Website einbauen.
- Nach Änderungen unter `FolderTree/` lokal `npm run build:data` ausführen. Der Pages-Workflow erledigt dies beim Deployment ebenfalls automatisch.
- Nach Änderungen an `app.js`, `styles.css` oder `folder-data.js` die Cache-Version der eingebundenen Dateien in `public/index.html` erhöhen.
- `.idea/`, `node_modules/` und lokale Hilfsdateien nicht committen.

## Prüfung vor Commit oder Pull Request

```bash
npm run build:data
node --check public/app.js
node --check scripts/generate-folder-data.js
node --check server.js
git diff --check
```

Bei Änderungen an der Oberfläche zusätzlich die Seite lokal oder über die Preview öffnen und den betroffenen Ablauf interaktiv prüfen.
