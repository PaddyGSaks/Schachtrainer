// Copies the single-threaded lite Stockfish build into public/engine (no COOP/COEP headers needed).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'stockfish', 'bin');
const dst = join(root, 'public', 'engine');
mkdirSync(dst, { recursive: true });
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  if (!existsSync(join(src, f))) throw new Error(`Missing ${f} – run npm install first`);
  copyFileSync(join(src, f), join(dst, f));
}
console.log('Stockfish engine copied to public/engine');
