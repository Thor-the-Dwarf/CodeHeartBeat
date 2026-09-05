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
