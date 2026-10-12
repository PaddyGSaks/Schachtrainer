import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';

export interface BoardProps {
  fen: string;
  orientation: 'white' | 'black';
  /** colour that may move, or undefined for a read-only board */
  movable?: 'white' | 'black' | 'both';
  dests?: Map<Key, Key[]>;
  lastMove?: [Key, Key];
  check?: boolean;
  shapes?: DrawShape[];
  onMove?: (from: Key, to: Key) => void;
  animation?: boolean;
}

/** Re-mounted when the orientation flips: chessground does not reliably refresh its interaction state otherwise. */
export default function Board(props: BoardProps) {
  return <BoardInner key={props.orientation} {...props} />;
}

function BoardInner({ fen, orientation, movable, dests, lastMove, check, shapes, onMove, animation = true }: BoardProps) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    api.current = Chessground(el.current!, {
      coordinates: true,
      highlight: { lastMove: true, check: true },
      animation: { enabled: animation, duration: 180 },
      draggable: { enabled: true, showGhost: true },
      premovable: { enabled: false },
      movable: { free: false, showDests: true, events: { after: (from, to) => onMoveRef.current?.(from, to) } },
    });
    return () => api.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cfg: Config = {
      fen,
      orientation,
      check,
      lastMove,
      viewOnly: !movable,
      turnColor: fen.split(' ')[1] === 'w' ? 'white' : 'black',
      movable: { color: movable, dests: movable ? dests : new Map() },
    };
    api.current?.set(cfg);
    api.current?.setShapes(shapes ?? []);
  }, [fen, orientation, movable, dests, lastMove, check, shapes]);

  return (
    <div className="board-wrap">
      <div ref={el} className="cg-wrap" />
    </div>
  );
}
