import { useState } from 'react';
import { Header, Modal } from '../components/ui';
import { AREA_LABEL, AREAS, levelName, type Area } from '../lib/rating';
import { overallRating, resetAll, update, useAppState } from '../lib/store';

function RatingChart({ points }: { points: number[] }) {
  if (points.length < 2) return <div className="muted small pad">Spiele ein paar Aufgaben, dann erscheint hier dein Verlauf.</div>;
  const W = 300;
  const H = 90;
  const min = Math.min(...points) - 20;
  const max = Math.max(...points) + 20;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * H;
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      <path d={`${d} L${W},${H} L0,${H} Z`} fill="var(--graph-light)" opacity=".25" />
      <path d={d} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" />
      <text x="4" y="12" className="chart-label">{Math.round(max - 20)}</text>
      <text x="4" y={H - 4} className="chart-label">{Math.round(min + 20)}</text>
    </svg>
  );
}

export function Profile({ go }: { go: (r: any) => void }) {
  const s = useAppState();
  const [confirm, setConfirm] = useState(false);
  const wins = s.games.filter((g) => g.result === 'win').length;
  const draws = s.games.filter((g) => g.result === 'draw').length;
  const losses = s.games.filter((g) => g.result === 'loss').length;
  const open = s.mistakes.filter((m) => !m.solved).length;
  const overallHistory = s.history.map((h) => Math.round(h.ratings.opening * 0.2 + h.ratings.middlegame * 0.25 + h.ratings.endgame * 0.2 + h.ratings.play * 0.35));
  const toggle = (k: 'sound' | 'evalBar' | 'hints') =>
    update((st) => {
      st.settings[k] = !st.settings[k];
    });
  return (
    <div className="screen">
      <Header title="Fortschritt" />
      <div className="card">
        <div className="muted small">Gesamtwertung</div>
        <div className="big">
          {overallRating(s)} <span className="muted small">{levelName(overallRating(s))}</span>
        </div>
        <RatingChart points={overallHistory} />
      </div>
      <div className="section-title">Bereiche</div>
      <div className="card">
        {AREAS.map((a: Area) => (
          <div key={a} className="area-row">
            <div className="area-head">
              <span>{AREA_LABEL[a]}</span>
              <b>{s.ratings[a]}</b>
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${((s.ratings[a] - 400) / 1800) * 100}%` }} />
            </div>
            <div className="muted small">
              {s.counts[a]} Einheiten
              {a !== 'play' && s.phaseAccuracy[a] !== undefined ? ` · Genauigkeit in Partien ${Math.round(s.phaseAccuracy[a]!)}%` : ''}
            </div>
          </div>
        ))}
      </div>
      <div className="section-title">Partien</div>
      <div className="card stats-grid">
        <div><div className="big green">{wins}</div><div className="muted small">Siege</div></div>
        <div><div className="big">{draws}</div><div className="muted small">Remis</div></div>
        <div><div className="big red">{losses}</div><div className="muted small">Niederlagen</div></div>
      </div>
      <button className="row big-row" onClick={() => go({ name: 'mistakes' })}>
        <div className="rec-icon">🎯</div>
        <div className="row-main">
          <div className="row-title">Aus Fehlern lernen</div>
          <div className="muted small">{open} offene Stellungen aus deinen Partien</div>
        </div>
        <span className="chev">›</span>
      </button>
      <div className="section-title">Einstellungen</div>
      <div className="card">
        <label className="switch-row">
          <span>Name</span>
          <input
            className="text-input"
            value={s.name}
            maxLength={16}
            onChange={(e) =>
              update((st) => {
                st.name = e.target.value;
              })
            }
          />
        </label>
        {(
          [
            ['sound', 'Töne'],
            ['evalBar', 'Bewertungsbalken in Partien'],
            ['hints', 'Hinweise erlauben'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="switch-row">
            <span>{label}</span>
            <input type="checkbox" checked={s.settings[k]} onChange={() => toggle(k)} />
          </label>
        ))}
      </div>
      <div className="pad">
        <button className="btn danger" onClick={() => setConfirm(true)}>
          Fortschritt zurücksetzen
        </button>
      </div>
      {confirm && (
        <Modal onClose={() => setConfirm(false)}>
          <h3>Alles zurücksetzen?</h3>
          <p className="muted">Wertungen, Lernstände und Partien werden gelöscht.</p>
          <div className="actions">
            <button
              className="btn danger"
              onClick={() => {
                resetAll();
                setConfirm(false);
              }}
            >
              Ja, löschen
            </button>
            <button className="btn" onClick={() => setConfirm(false)}>
              Abbrechen
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
