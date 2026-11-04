# BLOCKFRONT 1944

Ein Voxel-Shooter im Zweiten Weltkrieg, der komplett im Browser läuft (eine HTML-Datei plus three.js, keine Installation, kein Server).

## Starten
`index.html` im Browser öffnen (Chrome, Edge, Firefox, Safari). `three.min.js` muss im selben Ordner liegen.
Am Handy im Querformat spielen. Am PC: WASD, Maus, Leertaste, Shift.

## Inhalt
- **Auswahl in 5 Schritten:** Schlacht → Land → Rolle (und Panzer/Flugzeug) → Uniform und Waffen → Stützpunkt.
- **11 Schlachten:** D-Day (mit Landungsboot), Stalingrad, Berlin/Reichstag (Spawn in der Parlamentshalle), Kursk, Ardennen, El Alamein, Iwojima, Monte Cassino, Luftschlacht um England, Pearl Harbor, Midway. Dazu ein freier Einsatz.
- **10 Länder:** USA, Großbritannien, Sowjetunion, Frankreich, Deutschland, Japan, Kanada, Polen, Australien, Italien. Jedes mit eigenen Uniformen, Waffen, Spezialwaffen, Panzern, Flugzeugen, Flagge und Hymne.
- **Einsatzarten:** Sturmangriff, Grabenkampf, Häuserkampf, Verteidigung (Wellen), Luftkampf, Flugabwehr (Flak).
- **Rollen:** Schütze, Scharfschütze, MG-Schütze, Flammentrupp, Nebeltrupp, Panzerjäger, Pionier, Panzerfahrer, Jagdpilot, Flak-Schütze.
- **Fahrzeuge:** fahrbare Panzer (Ego-Perspektive), Flugzeuge, bemannbare Flak, Landungsboot.
- **Unendlich viele Level** mit steigender Schwierigkeit, KI-Kameraden, Stacheldraht, Minikarte, Truhen, Rauchgranaten, Wasser am Strand.
- **Handy-Steuerung:** Joystick, Wischen zum Umsehen, Tippen zum Springen, Halten für Granaten, automatisches Nachladen, kontextabhängiger E-Knopf.

## Projektaufbau
| Datei | Zweck |
|---|---|
| `index.html` | Das komplette Spiel (HTML, CSS, JavaScript, Welt-Erzeugung, KI, Menüs) |
| `three.min.js` | three.js r128 (MIT-Lizenz) |
| `tests/smoke.js` | Playwright-Rauchtest: startet jede Schlacht und prüft auf JavaScript-Fehler |
| `docs/CHANGELOG.md` | Entstehungsgeschichte der Funktionen |
| `docs/IDEEN.md` | Offene Ideen und Veröffentlichungsüberlegungen |

## Tests
```
npm i -D playwright
node tests/smoke.js   (im Ordner blockfront/)
```
Das Spiel erzeugt die Welt aus einem Seed; mit `?seed=123` am Ende der URL ist sie reproduzierbar.

## Hinweise
- Die Hymnen sind grobe Synthesizer-Nachbauten aus dem Gedächtnis, keine Notenvorlagen.
- Bewusst nicht enthalten: NS-Symbole, Giftgas. Flaggen sind vereinfachte Muster.
- three.js: Copyright 2010-2021 three.js Authors, MIT-Lizenz.
