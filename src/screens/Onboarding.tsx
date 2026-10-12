import { useState } from 'react';
import { LEVELS } from '../lib/rating';
import { setInitialLevel } from '../lib/store';

export function Onboarding() {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<number>(LEVELS[1].rating);
  return (
    <div className="screen onboarding">
      <div className="logo">♞</div>
      <h1>Willkommen beim Schachtrainer</h1>
      <p className="muted">
        Ich stelle mich auf dein Niveau ein: Eröffnungen, Taktik, Endspiele und der Computergegner passen sich nach jeder Einheit an.
      </p>
      <input className="text-input wide" placeholder="Dein Name" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} />
      <div className="section-title" style={{ padding: 0 }}>Wie stark spielst du?</div>
      <div className="list">
        {LEVELS.map((l) => (
          <button key={l.id} className={`row ${level === l.rating ? 'selected' : ''}`} onClick={() => setLevel(l.rating)}>
            <div className="row-main">
              <div className="row-title">{l.label}</div>
              <div className="muted small">{l.hint} · ca. {l.rating}</div>
            </div>
            <span className="chev">{level === l.rating ? '✔' : ''}</span>
          </button>
        ))}
      </div>
      <p className="muted small">Keine Sorge, die Schätzung wird mit jeder Aufgabe und Partie automatisch genauer.</p>
      <button className="btn primary big-btn" onClick={() => setInitialLevel(level, name.trim())}>
        Los geht’s
      </button>
    </div>
  );
}
