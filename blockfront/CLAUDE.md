# CLAUDE.md – BLOCKFRONT 1944

Voxel-Shooter im Zweiten Weltkrieg, komplett im Browser. Alles Wesentliche steckt in **einer Datei**: `index.html` (ca. 2000 Zeilen, HTML + CSS + ein großes Skript in einer IIFE). `three.min.js` (r128) liegt lokal daneben. Kein Build-Schritt.

Sprache des Spiels und der Doku: **Deutsch**. Antworten an die Nutzerin bzw. den Nutzer ebenfalls auf Deutsch.

## Orientierung in `index.html`
Das Skript ist durch Kommentarzeilen `/* ---------- … ---------- */` gegliedert (Zeilennummern ungefähr, mit `grep -n "^/\* ------" index.html` aktuell prüfen):

| Abschnitt | Inhalt |
|---|---|
| Blöcke, Einsatz-Konfiguration | Block-IDs (`B`), `COUNTRIES`, `ROLES`, `TANKLIST`, `PLANELIST`, `BATTLES`, `BASEOPTS`, `THEMES`, Waffen (`PRIMARIES` über `addW`), Spezialwaffen (`SPECIALS` über `addS`), Hymnen (`ANTHEMS`), `resolveBattle()` |
| Textur-Atlas | Pixel-Texturen werden per Canvas erzeugt (8×4 Kacheln) |
| Welt, Strukturen | Weltgröße 96×96×44, `generateWorld()`, `setupLayout()`, Gräben, Häuser, Basis (`buildBase`) |
| Chunk-Meshes, Three.js | Chunk-Mesher mit Ambient Occlusion, Szene, Himmel |
| Voxel-Raycast, Physik | `voxelRay`, `collides`, `moveEnt` |
| Gegner, Kameraden | `updateEnemy`, `updateAlly` (KI mit Sichtlinie, Rauch blockiert Sicht) |
| Spieler-Aktionen, Update | Schießen (`fireRifle`), Granaten, Bauen/Abbauen, `updatePlayer` |
| Raketenwerfer, Truhen, Panzer | Raketen, Flak (`placeGun`, `fireGun`), Panzer (`TANK`, `updateTank`), Flugzeuge (`updatePlane`), Bomber |
| Flagge | Flagge hissen, `winMission` |
| Welt bauen | `buildWorld()` und je Einsatzart ein Builder: `buildAssault`, `buildTrench`, `buildUrban`, `buildDefense`, `buildAir`, `buildFlak`; Sonderbauten `buildReichstag`, `buildLandingCraft`, Meer |
| Viewmodel, HUD | Waffe in der Hand, Hotbar, Minikarte |
| Eingabe | Tastatur, Maus, `setupTouch()` (Joystick, Buttons) |
| Hauptschleife, Start | `simulate`, `frame`, `applyConfig`, `boot`, danach der Auswahl-Assistent (5 Schritte) |

## Wichtige Zusammenhänge
- **Konfiguration:** Die Auswahl landet in `CFG` (Schlacht, Land, Rolle, Uniform, Waffen, Stützpunkt, Fahrzeug) und wird in `localStorage['blockfront-cfg']` gespeichert. `resolveBattle()` leitet daraus Einsatzart, Schauplatz, Rolle der Seite (Angreifer/Verteidiger) und Gegner ab. `applyConfig()` setzt Waffen, Rolle, Fahrzeuge, Schwierigkeit.
- **Einsatzarten:** `assault`, `trench`, `urban`, `defense`, `air`, `flak`. Varianten über `VARIANT`: `beach` (D-Day), `hill`, `ruins`.
- **Fahrzeuge:** Der eine Panzer (`TANK`) und das Flugzeug des Spielers nutzen denselben Mechanismus über `inTank`. Das bemannte Flak-Geschütz ebenfalls (`curGun`). Wer neue Fahrzeuge einbaut, prüfe die Stellen, an denen `inTank` abgefragt wird (Schaden, HUD, Viewmodel, Steuerung).
- **Level:** `LEVEL`, `lvlHP`, `lvlDmg`, `lvlAcc` skalieren die Gegner. Fortsetzung über `localStorage['blockfront-next']` und Neuladen der Seite.
- **Seed:** `?seed=123` in der URL macht die Welt reproduzierbar. Ohne Angabe ist sie zufällig.
- **Neue Länder/Waffen:** Eintrag in `COUNTRIES` (Uniformen, `primaries`, `specials`), `VEHICLES`, `TANKLIST`, `PLANELIST`, `ANTHEMS`, Flagge in `flagTexture`, dazu die Schlachten in `BATTLES`.

## Testen
- Rauchtest: `node tests/smoke.js` (benötigt `npm i -D playwright`). Er startet mehrere Schlachten im Handy-Emulator und meldet JavaScript-Fehler. **Nach jeder Änderung ausführen.**
- Die Auswahl-Schaltfläche `#startBtn` ist im ersten Schritt unsichtbar; Tests lösen sie per `document.getElementById('startBtn').click()` aus. Konfiguration setzen Tests vorab in `localStorage['blockfront-cfg']`.
- Für Debug-Zugriffe gibt es `window.__bf` (Spieler, Gegner, Teleport, Zustand). Nicht entfernen, die Tests brauchen es.
- Headless-Chromium mit `--use-gl=swiftshader` genügt für Screenshots.
- Wenn alle Gegner in einem Test tot sind, löst das Spiel „Level geschafft“ aus. Dann mindestens einen Gegner am Leben lassen.

## Veröffentlichung (Seite zum Ausprobieren)
Die Seite ist als Artifact veröffentlicht: `https://claude.ai/artifact/6kPAWfJ3gtXLS9AtXj54Y1`. Zum Aktualisieren mit derselben Adresse veröffentlichen (`url` angeben). Dafür wird aus `index.html` eine Variante gebaut: `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` und die viewport-Meta entfernen, `:root{color-scheme:dark}` an den Anfang des `<style>`, und `<script src="three.min.js">` durch `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` ersetzen.

## Regeln für dieses Projekt
- **Handy zuerst:** Die Steuerung wird zuerst für Touch gedacht (Querformat, Joystick links, Feuer rechts). Neue Funktionen brauchen eine Touch-Lösung und dürfen die bestehende Anordnung nicht überladen (Granate nur gedrückt halten, E nur bei Bedarf, Nachladen automatisch).
- **Keine NS-Symbole** (keine Hakenkreuze, keine NS-Lieder), **kein Giftgas** (statt „Gas“ gibt es Nebelgranaten). Flaggen sind vereinfachte Muster, keine exakten Nationalflaggen.
- **Hymnen** sind grobe Synthesizer-Nachbauten (`ANTHEMS`). In der Doku nicht als Original ausgeben.
- **Kein „Minecraft“** in Titel, Beschreibung oder Texten. Alle Grafiken werden im Code erzeugt.
- **Offline-fähig bleiben:** keine externen Dateien außer `three.min.js` im Spiel selbst.
- **Leistung:** Auf dem Handy läuft das Spiel mit Pixelratio 1 und kürzerer Sichtweite. Neue Effekte sparsam einsetzen (Partikel-Pool, Zahl der Meshes).
- Sachliche, ehrliche Berichte: Was getestet wurde, und was nur im Emulator läuft, nicht auf echten Geräten.

## Offene Ideen
Siehe `docs/IDEEN.md` (mehr Schlachten, Gegner-Panzer, Spielstand speichern, Tutorial, Einstellungen, Leistungsstufen, Veröffentlichung).
