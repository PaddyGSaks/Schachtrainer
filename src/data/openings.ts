export interface OpeningLine {
  id: string;
  name: string;
  /** SAN moves, separated by spaces (no move numbers) */
  moves: string;
  /** German explanation of the key ideas */
  idea: string;
}

export interface Opening {
  id: string;
  name: string;
  side: 'w' | 'b';
  /** rough difficulty to learn (Elo-like) */
  level: number;
  summary: string;
  lines: OpeningLine[];
}

export const OPENINGS: Opening[] = [
  {
    id: 'italian',
    name: 'Italienische Partie',
    side: 'w',
    level: 600,
    summary: 'Schnelle Entwicklung, Druck auf f7 und Kampf um das Zentrum.',
    lines: [
      {
        id: 'italian-pianissimo',
        name: 'Giuoco Pianissimo',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6 Nbd2 Re8',
        idea: 'Ruhiger Aufbau mit c3 und d3. Weiß bereitet Nf1-g3 und d4 vor und behält den Läufer auf der Diagonale a2–g8.',
      },
      {
        id: 'italian-evans',
        name: 'Evans-Gambit',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6 Nc3 Na5 Bg5 Ne7',
        idea: 'Ein Bauer für schnelle Entwicklung und ein starkes Bauernzentrum. Weiß spielt auf Angriff.',
      },
    ],
  },
  {
    id: 'london',
    name: 'London-System',
    side: 'w',
    level: 700,
    summary: 'Solides System gegen fast alles: Lf4, e3, Sf3, c3. Wenig Theorie.',
    lines: [
      {
        id: 'london-main',
        name: 'London gegen d5/Sf6',
        moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3 b6',
        idea: 'Der Läufer kommt vor e3 heraus. Weiß entwickelt kompakt und spielt später oft Ne5 und Dh5-Angriffe.',
      },
    ],
  },
  {
    id: 'scandinavian',
    name: 'Skandinavisch',
    side: 'b',
    level: 800,
    summary: 'Schwarz greift sofort das Zentrum an. Einfache Pläne, wenig Theorie.',
    lines: [
      {
        id: 'scandi-main',
        name: 'Hauptvariante mit Dd5-a5',
        moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6',
        idea: 'Die Dame zieht sich nach a5 zurück. Schwarz entwickelt Lf5 vor ...e6 und steht solide.',
      },
    ],
  },
  {
    id: 'spanish',
    name: 'Spanische Partie',
    side: 'w',
    level: 900,
    summary: 'Der Klassiker. Langfristiger Druck auf den Springer c6 und das Zentrum e5.',
    lines: [
      {
        id: 'spanish-closed',
        name: 'Geschlossene Spanische (Breyer)',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7',
        idea: 'Weiß baut mit c3 und d4 ein starkes Zentrum auf, Schwarz regruppiert mit dem Breyer-Manöver Nb8-d7.',
      },
      {
        id: 'spanish-exchange',
        name: 'Abtauschvariante',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1 Bg4',
        idea: 'Weiß verdirbt Schwarz die Bauernstruktur und hofft im Endspiel auf die 4-gegen-3-Mehrheit am Königsflügel.',
      },
    ],
  },
  {
    id: 'queens-gambit',
    name: 'Damengambit',
    side: 'w',
    level: 1000,
    summary: 'Weiß bietet einen Flügelbauern für das Zentrum an. Strategisch und lehrreich.',
    lines: [
      {
        id: 'qgd-orthodox',
        name: 'Abgelehnt – Orthodoxe Verteidigung',
        moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6',
        idea: 'Typische Minoritätsangriff-Struktur: Weiß spielt später b4-b5 gegen den Damenflügel.',
      },
    ],
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann',
    side: 'b',
    level: 1000,
    summary: 'Sehr solide Verteidigung gegen e4. Der Läufer kommt vor ...e6 heraus.',
    lines: [
      {
        id: 'caro-classical',
        name: 'Klassische Variante',
        moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bf4 Ngf6 O-O-O Be7',
        idea: 'Schwarz tauscht den aktiven weißen Läufer und baut eine feste Bauernkette c6/d5/e6 auf.',
      },
    ],
  },
  {
    id: 'french',
    name: 'Französisch',
    side: 'b',
    level: 1200,
    summary: 'Konter im Zentrum mit ...c5 und ...f6. Schwarz akzeptiert weniger Raum.',
    lines: [
      {
        id: 'french-classical',
        name: 'Klassische Variante',
        moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5 Qd2 Nc6 O-O-O a6',
        idea: 'Schwarz hebelt mit ...c5 und ...f6 an der weißen Bauernkette. Der Läufer c8 ist das Sorgenkind.',
      },
    ],
  },
  {
    id: 'slav',
    name: 'Slawische Verteidigung',
    side: 'b',
    level: 1300,
    summary: 'Schwarz stützt d5 mit c6 und behält die Läuferdiagonale c8–f5 offen.',
    lines: [
      {
        id: 'slav-main',
        name: 'Slawisch mit Bf5',
        moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7',
        idea: 'Schwarz gibt den Bauern zurück, um den Läufer aktiv zu entwickeln. Ein sehr zuverlässiges Repertoire.',
      },
    ],
  },
  {
    id: 'english',
    name: 'Englische Eröffnung',
    side: 'w',
    level: 1300,
    summary: 'Flexibel: Weiß kontrolliert d5 und baut Druck über den Damenflügel auf.',
    lines: [
      {
        id: 'english-reversed-sicilian',
        name: 'Umgekehrter Sizilianer',
        moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 a3 O-O b4 f5',
        idea: 'Wie ein Sizilianer mit einem Tempo mehr für Weiß. Der Fianchetto-Läufer drückt auf das Zentrum.',
      },
    ],
  },
  {
    id: 'kings-indian',
    name: 'Königsindisch',
    side: 'b',
    level: 1400,
    summary: 'Schwarz lässt Weiß das Zentrum bauen und greift es später mit ...e5 oder ...c5 an.',
    lines: [
      {
        id: 'kid-classical',
        name: 'Klassische Variante',
        moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5',
        idea: 'Weiß gewinnt am Damenflügel, Schwarz stürmt am Königsflügel mit ...f5 und ...g5.',
      },
    ],
  },
  {
    id: 'najdorf',
    name: 'Sizilianisch – Najdorf',
    side: 'b',
    level: 1500,
    summary: 'Die kämpferischste Antwort auf 1.e4. Scharf, theoretisch und voller Taktik.',
    lines: [
      {
        id: 'najdorf-english-attack',
        name: 'Englischer Angriff (Be3)',
        moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5',
        idea: 'Weiß greift am Königsflügel an, Schwarz kontert mit ...b5 und ...Tc8 am Damenflügel.',
      },
      {
        id: 'najdorf-bg5',
        name: 'Hauptvariante mit Bg5',
        moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 b5',
        idea: 'Scharfe Hauptlinie: beide Seiten rochieren lang bzw. kurz und rennen aufeinander zu.',
      },
    ],
  },
];

export const lineRating = (o: Opening, l: OpeningLine) => o.level + Math.round(l.moves.split(' ').length * 8);
