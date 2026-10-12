import { type ReactNode, useEffect, useState } from 'react';
import { capturedFromFen, ROLE_NAME } from '../lib/chessUtil';

export function Piece({ role, color, size = 28 }: { role: string; color: 'white' | 'black'; size?: number }) {
  return (
    <span className="cg-wrap mini" style={{ width: size, height: size }}>
      <piece className={`${ROLE_NAME[role]} ${color}`} />
    </span>
  );
}

export function Avatar({ kind, label }: { kind: 'you' | 'bot'; label?: string }) {
  return <div className={`avatar ${kind}`}>{kind === 'bot' ? '🤖' : (label ?? '🙂').slice(0, 2)}</div>;
}

export function PlayerBar({
  name,
  rating,
  kind,
  color,
  fen,
  active,
  sub,
  captured = false,
}: {
  name: string;
  rating?: number;
  kind: 'you' | 'bot';
  color: 'w' | 'b';
  fen: string;
  active?: boolean;
  sub?: ReactNode;
  /** show captured pieces / material balance (only meaningful in full games) */
  captured?: boolean;
}) {
  const cap = capturedFromFen(fen);
  // captured pieces *by* this player are the opponent's lost ones
  const taken = color === 'w' ? cap.blackLost : cap.whiteLost;
  const adv = color === 'w' ? cap.diff : -cap.diff;
  return (
    <div className={`player-bar ${active ? 'active' : ''}`}>
      <Avatar kind={kind} label={name} />
      <div className="player-meta">
        <div className="player-name">
          {name} {rating !== undefined && <span className="muted">({rating})</span>}
        </div>
        <div className="captured">
          {captured &&
            taken.map((t, i) => (
            <Piece key={i} role={t} color={color === 'w' ? 'black' : 'white'} size={16} />
          ))}
          {captured && adv > 0 && <span className="adv">+{adv}</span>}
          {sub}
        </div>
      </div>
    </div>
  );
}

export function EvalBar({ cp, mate, orientation }: { cp: number | null; mate?: number | null; orientation: 'white' | 'black' }) {
  // cp from White's point of view
  const winPct = mate ? (mate > 0 ? 100 : 0) : cp === null ? 50 : 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
  const label = mate ? `M${Math.abs(mate)}` : cp === null ? '' : (Math.abs(cp) / 100).toFixed(1);
  const whiteLeads = (mate ?? cp ?? 0) >= 0;
  return (
    <div className={`eval-bar ${orientation}`} title="Bewertung durch die Engine">
      <div className="eval-fill" style={{ height: `${winPct}%` }} />
      <span className={`eval-label ${whiteLeads ? 'top' : 'bottom'}`}>{label}</span>
    </div>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function PromotionDialog({ color, onPick, onCancel }: { color: 'w' | 'b'; onPick: (p: 'q' | 'r' | 'b' | 'n') => void; onCancel: () => void }) {
  return (
    <Modal onClose={onCancel}>
      <h3>Umwandlung</h3>
      <div className="promo-row">
        {(['q', 'r', 'b', 'n'] as const).map((p) => (
          <button key={p} className="promo-btn" onClick={() => onPick(p)}>
            <Piece role={p} color={color === 'w' ? 'white' : 'black'} size={56} />
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="header">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="Zurück">
          ←
        </button>
      ) : (
        <span style={{ width: 40 }} />
      )}
      <h1>{title}</h1>
      <div style={{ minWidth: 40, textAlign: 'right' }}>{right}</div>
    </header>
  );
}

export function ProgressRing({ value, size = 56, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="ring">
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="ring-fg"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle">
        {label ?? `${Math.round(value * 100)}%`}
      </text>
    </svg>
  );
}

export function RatingDelta({ delta }: { delta: number }) {
  return <span className={delta >= 0 ? 'delta up' : 'delta down'}>{delta >= 0 ? `+${delta}` : delta}</span>;
}

/** Shows `children` for `ms` and then hides them (used for flash messages). */
export function Toast({ text, tone = 'info' }: { text: string; tone?: 'info' | 'good' | 'bad' }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, [text]);
  return show ? <div className={`toast ${tone}`}>{text}</div> : null;
}
