# Regeln für den Architekturkatalog

Dieser Ordner erklärt wichtigen Projektcode für Menschen und Agenten, die CodeHeartBeat noch nicht kennen. Die YAML-Dateien sind die einzige Wissensquelle dieses Katalogs. Es gibt keine daraus erzeugte Datenbank.

## Vor Änderungen am Projekt

1. Zuerst die allgemeine `AGENTS.md` im Projektstamm lesen.
2. Danach die für den Arbeitsbereich passenden Dateien unter `architecture/components/` lesen.
3. Abhängigkeiten aus `depends_on` ebenfalls prüfen.
4. Vor einer Änderung kontrollieren, ob andere uncommittete Arbeiten im Repository liegen. Fremde Änderungen weder überschreiben noch in den eigenen Commit aufnehmen.

## Was einen Eintrag erhält

Ein Eintrag ist für einen wichtigen, fachlich abgrenzbaren Bestandteil vorgesehen, zum Beispiel ein Subsystem, ein zentraler Algorithmus, ein Datenmodell, ein Generator oder ein Deploymentweg.

Keinen eigenen Eintrag benötigen normalerweise lokale Variablen, triviale Hilfsfunktionen, einzelne CSS-Regeln oder automatisch erzeugte Dateien.

## Bedeutung der Felder

- `id`: dauerhafte, eindeutige Kennung in Kleinbuchstaben mit Punkten und Bindestrichen
- `type`: Art des Bestandteils, etwa `subsystem`, `component`, `generator`, `data-source` oder `deployment`
- `path`: relativer Pfad vom Projektstamm
- `symbol`: optionale zentrale Funktion oder Konstante innerhalb der Datei
- `what`: kurze Beschreibung dessen, was der Bestandteil ist und leistet
- `why`: Begründung für die gewählte Lösung und wichtige Einschränkungen
- `depends_on`: IDs der direkt benötigten Katalogeinträge

## Schreibregeln

- `what` beschreibt die Verantwortung, nicht jede einzelne Implementierungszeile.
- `why` hält die nicht offensichtliche Entscheidung fest und nennt relevante Alternativen oder Projektregeln.
- Aussagen müssen zum aktuellen Code passen. Vermutungen gehören nicht in den Katalog.
- IDs nach Möglichkeit nie ändern oder erneut vergeben. Bei einer Umbenennung bleibt die ID stabil, solange die Verantwortung gleich bleibt.
- Pro YAML-Datei genau einen Bestandteil dokumentieren. So bleiben parallele Änderungen gut zusammenführbar.
- Textwerte mit Leer- oder Sonderzeichen werden einzeilig in einfache Anführungszeichen gesetzt; `depends_on` ist entweder `[]` oder eine eingerückte Liste.
- Sichtbare deutsche Texte verwenden echte Umlaute und `ß`.

## Pflege und Prüfung

Wenn sich Verantwortung, Pfad, zentrale Abhängigkeiten oder die Begründung einer Komponente ändern, muss ihr YAML-Eintrag im selben Commit aktualisiert werden.

Vor einem Commit ausführen:

```bash
npm run check:architecture
```

Eine abgeschlossene Aufgabe erhält einen atomaren Commit mit einem kurzen Titel. Der Commit-Text soll zusätzlich erklären, was geändert wurde und warum. Git bleibt die einzige Commit-Historie; Commitdaten werden nicht im Architekturkatalog dupliziert.
