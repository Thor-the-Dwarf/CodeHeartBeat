# CodeHeartBeat

CodeHeartBeat ist die Grundlage für eine Runtime-Visualisierung von Java-Code. Im ersten Schritt zeigt die Web-GUI den FolderTree an und öffnet die enthaltenen Beispieldateien.

## Direkt in WebStorm starten

`public/index.html` öffnen und am HTML-Dokument auf **Play** drücken. Für diesen Startweg wird kein Node-Server benötigt.

Die Dateien `index.html`, `styles.css`, `folder-data.js` und `app.js` bilden zusammen eine statische Website und können daher auch über GitHub Pages ausgeliefert werden.

Nach Änderungen oder neuen Dateien im Ordner `FolderTree` wird die statische Datenquelle mit folgendem Befehl aktualisiert:

```bash
npm run build:data
```

## Optionaler lokaler Vorschau-Server

```bash
npm start
```

Danach ist die Anwendung unter <http://127.0.0.1:4173> erreichbar.

Der Server ist für die normale Dateiauswahl nicht erforderlich.

## Vom Handy aus weiterarbeiten

Repository: <https://github.com/Thor-the-Dwarf/CodeHeartBeat>

GitHub Pages: <https://thor-the-dwarf.github.io/CodeHeartBeat/>

Die ChatGPT-App kann mit dem verbundenen GitHub-Repository arbeiten. Als Ziel sollten dabei dieses Repository und der Branch `main` genannt werden. Änderungen können direkt als Commit oder vorzugsweise als Pull Request erstellt werden.

Nach jedem Push auf `main` führt GitHub Actions automatisch folgende Schritte aus:

1. Der aktuelle Repository-Stand wird geladen.
2. Aus `FolderTree/` wird `public/folder-data.js` neu erzeugt.
3. Der Inhalt von `public/` wird auf GitHub Pages veröffentlicht.

Dadurch genügt es bei neuen oder geänderten Java-Beispielen, die Dateien unter `FolderTree/` zu bearbeiten. Die generierte Datei `public/folder-data.js` muss in mobilen Sitzungen nicht von Hand aktualisiert werden.

Der Workflow kann auf GitHub unter **Actions → CodeHeartBeat auf GitHub Pages veröffentlichen → Run workflow** auch manuell gestartet werden.
