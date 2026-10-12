import { ENDGAMES } from '../data/endgames';
import { OPENINGS } from '../data/openings';
import { dueCount } from '../lib/openingTrainer';
import { AREA_LABEL, AREAS, levelName, type Area } from '../lib/rating';
import { overallRating, useAppState, type State } from '../lib/store';
import { Header, ProgressRing } from '../components/ui';
import { recommendedEndgame } from './Endgames';
import { botElo } from './Play';

interface Rec {
  title: string;
  text: string;
  route: any;
  icon: string;
}

/** Decides what the trainer suggests next, based on the skill profile. */
export function recommend(s: State): Rec {
  const due = dueCount(s);
  const openMistakes = s.mistakes.filter((m) => !m.solved).length;
  if (due > 0)
    return { icon: '📖', title: `${due} ${due === 1 ? 'Eröffnungslinie' : 'Eröffnungslinien'} wiederholen`, text: 'Dein Wiederholungsplan ist fällig – kurz auffrischen, damit nichts verloren geht.', route: { name: 'opening-session' } };
  if (openMistakes >= 3)
    return { icon: '🎯', title: 'Aus deinen Fehlern lernen', text: `${openMistakes} Stellungen aus deinen Partien, in denen du daneben lagst.`, route: { name: 'mistakes' } };
  const areas = (['opening', 'middlegame', 'endgame'] as Area[]).map((a) => ({
    a,
    // weakest by accuracy if we have it, otherwise by rating
    score: s.phaseAccuracy[a] !== undefined ? s.phaseAccuracy[a]! * 20 : s.ratings[a],
  }));
  areas.sort((x, y) => x.score - y.score);
  const weakest = areas[0].a;
  if (weakest === 'opening') return { icon: '📖', title: 'Neue Eröffnung lernen', text: 'Deine Eröffnungsphase ist aktuell dein schwächster Bereich.', route: { name: 'opening-session' } };
  if (weakest === 'middlegame') return { icon: '🧩', title: 'Taktik im Mittelspiel', text: 'Dein Mittelspiel ist aktuell dein schwächster Bereich – 8 Aufgaben auf deinem Niveau.', route: { name: 'middlegame' } };
  const e = recommendedEndgame(s.ratings.endgame, s.endgamesDone);
  return { icon: '♟️', title: `Endspiel: ${e.title}`, text: 'Dein Endspiel ist aktuell dein schwächster Bereich.', route: { name: 'endgame-session', id: e.id } };
}

export function Home({ go }: { go: (r: any) => void }) {
  const s = useAppState();
  const rec = recommend(s);
  const overall = overallRating(s);
  return (
    <div className="screen">
      <Header title="Schachtrainer" />
      <div className="pad greet">
        <div>
          <div className="muted">Hallo, {s.name}!</div>
          <div className="big">{overall}</div>
          <div className="muted small">Gesamtwertung · {levelName(overall)}</div>
        </div>
        <div className="streak">🔥 {s.streak.days}<span className="muted small"> Tage</span></div>
      </div>
      <div className="card rec" onClick={() => go(rec.route)} role="button">
        <div className="rec-icon">{rec.icon}</div>
        <div className="row-main">
          <div className="muted small">Empfohlen für dich</div>
          <div className="row-title">{rec.title}</div>
          <div className="muted small">{rec.text}</div>
        </div>
        <button className="btn primary">Los</button>
      </div>
      <div className="section-title">Training</div>
      <div className="tiles">
        <button className="tile" onClick={() => go({ name: 'openings' })}>
          <div className="tile-icon">📖</div>
          <div className="tile-title">Eröffnungen</div>
          <div className="muted small">{OPENINGS.length} Repertoires</div>
          <div className="tile-rating">{s.ratings.opening}</div>
        </button>
        <button className="tile" onClick={() => go({ name: 'middlegame' })}>
          <div className="tile-icon">🧩</div>
          <div className="tile-title">Mittelspiel</div>
          <div className="muted small">Taktik-Aufgaben</div>
          <div className="tile-rating">{s.ratings.middlegame}</div>
        </button>
        <button className="tile" onClick={() => go({ name: 'endgames' })}>
          <div className="tile-icon">♟️</div>
          <div className="tile-title">Endspiele</div>
          <div className="muted small">{ENDGAMES.length} Lektionen</div>
          <div className="tile-rating">{s.ratings.endgame}</div>
        </button>
        <button className="tile accent" onClick={() => go({ name: 'play' })}>
          <div className="tile-icon">⚔️</div>
          <div className="tile-title">Gegen Computer</div>
          <div className="muted small">Gegner: {botElo(s.ratings.play, s.settings.playOffset)}</div>
          <div className="tile-rating">{s.ratings.play}</div>
        </button>
      </div>
      <div className="section-title">Dein Profil</div>
      <div className="card ring-row">
        {AREAS.map((a) => (
          <div key={a} className="ring-item">
            <ProgressRing value={(s.ratings[a] - 400) / 1800} label={String(s.ratings[a])} size={64} />
            <div className="muted small">{AREA_LABEL[a]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Train({ go }: { go: (r: any) => void }) {
  const s = useAppState();
  const open = s.mistakes.filter((m) => !m.solved).length;
  const items = [
    { icon: '📖', title: 'Eröffnungen', text: `Standard-Repertoires mit Wiederholungsplan · Wertung ${s.ratings.opening}`, route: { name: 'openings' } },
    { icon: '🧩', title: 'Mittelspiel', text: `Taktik-Aufgaben auf deinem Niveau · Wertung ${s.ratings.middlegame}`, route: { name: 'middlegame' } },
    { icon: '♟️', title: 'Endspiele', text: `Gewinnen und Halten gegen die Engine · Wertung ${s.ratings.endgame}`, route: { name: 'endgames' } },
    { icon: '🎯', title: 'Aus Fehlern lernen', text: open ? `${open} Stellungen aus deinen Partien` : 'Noch keine – analysiere eine Partie', route: { name: 'mistakes' } },
  ];
  return (
    <div className="screen">
      <Header title="Training" />
      <div className="list">
        {items.map((i) => (
          <button key={i.title} className="row big-row" onClick={() => go(i.route)}>
            <div className="rec-icon">{i.icon}</div>
            <div className="row-main">
              <div className="row-title">{i.title}</div>
              <div className="muted small">{i.text}</div>
            </div>
            <span className="chev">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
