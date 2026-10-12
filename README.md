# Schachtrainer ♞

Ein adaptiver Schachtrainer im dunklen, grünen Look der Chess.com-App. Läuft komplett im Browser (auch offline und als installierbare App auf dem Handy), der Computergegner ist **Stockfish 19** (WebAssembly).

## Funktionen

| Bereich | Was passiert |
| --- | --- |
| **Eröffnungen** | 11 Standard-Repertoires (Italienisch, Spanisch, London, Damengambit, Englisch als Weiß – Skandinavisch, Caro-Kann, Französisch, Slawisch, Königsindisch, Najdorf als Schwarz). Neue Linien werden mit Pfeil gezeigt (*Lernen*), danach aus dem Gedächtnis gespielt (*Üben*) und schließlich ohne Hilfe abgefragt (*Test*). Ein Wiederholungsplan (Leitner-System) bringt Linien zurück, bevor du sie vergisst. |
| **Mittelspiel** | Taktik-Sessions mit je 8 Aufgaben (Matt in 1–4, Materialgewinn). Alle Lösungen sind vorab mit der Engine geprüft (siehe `scripts/mine-puzzles.mjs`). Alternative Gewinnzüge werden live von der Engine erkannt und akzeptiert. |
| **Endspiele** | 8 Lektionen von „Matt mit Dame“ bis Lucena/Philidor und Läufer+Springer-Matt. Du spielst gegen die Engine in voller Stärke; Ziel ist *Sieg* oder *Remis halten*. |
| **Gegen Computer** | Klassische Partie. Gegner-Stärke = deine Partie-Wertung (± Schwierigkeit „Leichter/Passend/Fordernd“). Hinweise, Zurücknehmen, Remis anbieten, Aufgeben, optionaler Bewertungsbalken. |
| **Partieanalyse** | Nach jeder Partie: Genauigkeit in %, Bewertungsverlauf, Zugbewertung (Bester Zug … Patzer), Phasen-Genauigkeit und der bessere Zug als Pfeil. |
| **Aus Fehlern lernen** | Die größten Fehler deiner Partien werden automatisch zu persönlichen Trainingsaufgaben. |

## So passt sich der Trainer an dich an

* Beim ersten Start wählst du ein grobes Niveau. Es gibt **vier Wertungen** (Eröffnung, Mittelspiel, Endspiel, Partie), die nach dem Elo-Prinzip nach jeder Einheit angepasst werden (anfangs schneller, später langsamer).
* **Eröffnungen:** Fällige Wiederholungen zuerst, sonst die neue Linie, deren Schwierigkeit zu deiner Eröffnungswertung passt.
* **Mittelspiel:** Die Aufgaben liegen leicht über deiner Wertung. Jede dritte Aufgabe stammt aus deinen eigenen Partiefehlern.
* **Endspiele:** Empfohlen wird die Lektion, die zu deiner Wertung passt und die du noch nicht sicher beherrschst.
* **Partien:** Der Computer spielt auf deinem Niveau. Unter ~1350 Elo wählt er menschlich wirkende, gelegentlich schwache Züge (Softmax über mehrere Kandidaten), darüber nutzt er Stockfishs `UCI_Elo`-Begrenzung.
* **Analyse → Profil:** Die Genauigkeit pro Partiephase verschiebt die jeweilige Wertung leicht und bestimmt auf der Startseite, welcher Bereich als Nächstes empfohlen wird.
* Mit Hinweisen oder Zurücknehmen zählt ein Ergebnis nur halb für die Wertung.

Alle Daten liegen lokal im Browser (`localStorage`), es gibt keinen Server und kein Konto. Unter *Fortschritt* kannst du alles zurücksetzen.

## Entwickeln

```bash
npm install
npm run dev        # Entwicklungsserver (kopiert die Engine nach public/engine)
npm test           # Tests: Eröffnungsdaten, Puzzle-Auswahl
npm run build      # statisches Bundle in dist/
npm run preview    # gebautes Bundle ansehen
```

`dist/` ist reines statisches HTML/JS (relative Pfade) und läuft auf jedem Webserver, z. B. GitHub Pages oder Netlify. Die Engine ist die Single-Thread-Lite-Variante von Stockfish.js, sie braucht keine speziellen Header (COOP/COEP). Zum Installieren auf dem Handy die Seite im Browser öffnen und „Zum Startbildschirm hinzufügen“ wählen.

### Inhalte erweitern

* **Eröffnungen:** `src/data/openings.ts` – eine Linie ist eine SAN-Zugfolge. `npm test` prüft, dass jede Linie legal ist.
* **Endspiele:** `src/data/endgames.ts`. Mit `node scripts/verify-endgames.mjs` lässt sich per Engine prüfen, ob die Stellung das angegebene Ziel (Sieg/Remis) hat.
* **Puzzles:** `npm run mine` spielt zufällige Engine-Partien und speichert Stellungen mit eindeutig gewinnendem Zug nach `.mine/*.jsonl`. `node scripts/build-puzzles.mjs` führt alles zu `src/data/puzzles.json` zusammen.

## Technik

React + TypeScript + Vite, [chess.js](https://github.com/jhlywa/chess.js) (Regeln), [chessground](https://github.com/lichess-org/chessground) (Brett, Figuren „cburnett“), [Stockfish.js](https://github.com/nmrugg/stockfish.js) (Engine).

## Lizenz

Chessground, die Figuren und Stockfish stehen unter der **GPL-3.0**, daher steht auch dieses Projekt unter GPL-3.0-or-later. Das Design ist an die Chess.com-App angelehnt, verwendet aber keine ihrer Grafiken.
