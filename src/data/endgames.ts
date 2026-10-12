export interface EndgameLesson {
  id: string;
  title: string;
  /** side the player controls */
  side: 'w' | 'b';
  fen: string;
  goal: 'win' | 'draw';
  /** player moves available before the goal counts as failed (win) / achieved (draw) */
  maxMoves: number;
  level: number;
  summary: string;
  tips: string[];
}

export const ENDGAMES: EndgameLesson[] = [
  {
    id: 'kqk',
    title: 'Matt mit Dame und König',
    side: 'w',
    fen: '8/8/8/4k3/8/8/2Q5/4K3 w - - 0 1',
    goal: 'win',
    maxMoves: 20,
    level: 500,
    summary: 'Dränge den gegnerischen König mit der Dame zum Rand und setze ihn mit Hilfe deines Königs matt.',
    tips: [
      'Schneide dem König mit der Dame ein Feld-Rechteck ab, ein Springerzug Abstand.',
      'Bringe deinen König heran, bevor du Schach gibst.',
      'Achtung Patt! Lass dem Gegner immer einen legalen Zug.',
    ],
  },
  {
    id: 'krk',
    title: 'Matt mit Turm und König',
    side: 'w',
    fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
    goal: 'win',
    maxMoves: 30,
    level: 700,
    summary: 'Schiebe den König Linie für Linie zum Rand und gib dort Matt.',
    tips: [
      'Der Turm schneidet den König ab, dein König kommt in Opposition.',
      'Bei Opposition gibt der Turm Schach und der König muss weichen.',
      'Halte den Turm außer Reichweite des gegnerischen Königs.',
    ],
  },
  {
    id: 'kpk-key',
    title: 'Bauer auf der 5. Reihe: König voran',
    side: 'w',
    fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
    goal: 'win',
    maxMoves: 15,
    level: 900,
    summary: 'Steht dein König vor dem Bauern auf der 6. Reihe, gewinnst du immer.',
    tips: [
      'Gehe mit dem König neben dem Bauern auf eine Schlüsselfeld-Reihe.',
      'Vorsicht Patt, wenn der Bauer nicht ziehen kann und der gegnerische König blockiert ist.',
    ],
  },
  {
    id: 'two-bishops',
    title: 'Matt mit zwei Läufern',
    side: 'w',
    fen: '8/8/8/3k4/8/8/8/2B1KB2 w - - 0 1',
    goal: 'win',
    maxMoves: 40,
    level: 1000,
    summary: 'Die Läufer bilden zusammen eine Mauer und drängen den König in die Ecke.',
    tips: [
      'Stelle beide Läufer nebeneinander auf benachbarte Diagonalen.',
      'Der König hilft, die Mauer zum Rand zu schieben.',
      'Matt gelingt in jeder Ecke, achte auf die 50-Züge-Regel.',
    ],
  },
  {
    id: 'rook-pawn-draw',
    title: 'Randbauer: Remis halten',
    side: 'b',
    fen: '1k6/8/8/P7/1K6/8/8/8 b - - 0 1',
    goal: 'draw',
    maxMoves: 25,
    level: 900,
    summary: 'Mit dem König vor einem Randbauern kommst du in die Ecke und der Gegner kann nicht gewinnen.',
    tips: [
      'Bleib mit dem König in der Nähe der Ecke a8 (Felder a7, a8, b7, b8) und lass den Bauern nicht vorbei.',
      'Ein Randbauer kann nie mit dem König allein gewinnen, wenn der Verteidiger die Ecke erreicht.',
    ],
  },
  {
    id: 'lucena',
    title: 'Lucena-Stellung',
    side: 'w',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    goal: 'win',
    maxMoves: 20,
    level: 1500,
    summary: 'Die wichtigste Gewinnstellung im Turmendspiel: Baue die „Brücke“ und führe den Bauern zur Umwandlung.',
    tips: [
      'Turm auf die 4. Reihe (Rc4!), danach König zum Turm.',
      'Mit dem Turm als Schild gegen die Schachs kommt der König aus dem Matt-Schach heraus.',
    ],
  },
  {
    id: 'philidor',
    title: 'Philidor-Stellung',
    side: 'b',
    fen: '4k3/8/r7/3PK3/8/8/8/1R6 b - - 0 1',
    goal: 'draw',
    maxMoves: 30,
    level: 1400,
    summary: 'Die Standard-Verteidigung im Turmendspiel: Halte den Turm auf der 6. Reihe, bis der Bauer weiterzieht.',
    tips: [
      'Turm auf der 6. Reihe halten, damit der gegnerische König nicht vorwärts kommt.',
      'Zieht der Bauer auf die 6. Reihe, geht der Turm zurück und gibt Schach von hinten.',
    ],
  },
  {
    id: 'bishop-knight',
    title: 'Matt mit Läufer und Springer',
    side: 'w',
    fen: '8/8/8/4k3/8/8/8/2B1K1N1 w - - 0 1',
    goal: 'win',
    maxMoves: 60,
    level: 1800,
    summary: 'Eines der schwierigsten Grundmatts: Der König muss in die Ecke von der Läuferfarbe getrieben werden.',
    tips: [
      'Treibe den König erst an den Rand, dann zur Ecke mit der Farbe deines Läufers.',
      'Die „W-Manöver“ des Springers sind zentral. Nutze sie, um zu warten und die Zugpflicht zu erzwingen.',
    ],
  },
];
