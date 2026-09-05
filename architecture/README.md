# Architekturkatalog

Die Dateien unter `components/` geben neuen Mitarbeitenden und Agenten einen schnellen Überblick über die wichtigen Bestandteile von CodeHeartBeat. Jeder Eintrag beantwortet zwei Kernfragen:

- **What:** Was ist der Bestandteil und was leistet er?
- **Why:** Warum wurde er so umgesetzt und welche Projektregeln beeinflussen ihn?

Die verbindlichen Pflegehinweise stehen in [agent_rules.md](agent_rules.md).

## Katalog prüfen

```bash
npm run check:architecture
```

Die Prüfung kontrolliert Pflichtfelder, eindeutige IDs, vorhandene Pfade, bekannte Abhängigkeiten und angegebene Symbole. Es wird keine Datenbank erzeugt.
