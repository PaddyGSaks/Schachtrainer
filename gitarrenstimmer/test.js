const { detectPitch } = require('./pitch.js');
function synth(f, sr, n, noise) {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    [1, 0.6, 0.4, 0.25, 0.15].forEach((a, k) => v += a * Math.sin(2 * Math.PI * f * (k + 1) * i / sr));
    b[i] = 0.2 * v + (noise ? (Math.random() - 0.5) * noise : 0);
  }
  return b;
}
let fail = 0;
for (const sr of [44100, 48000])
  for (const f of [82.41, 110, 146.83, 196, 246.94, 329.63, 73.42, 87.3]) {
    const r = detectPitch(synth(f, sr, 4096, 0.05), sr);
    const cents = r ? 1200 * Math.log2(r.freq / f) : NaN;
    const ok = r && Math.abs(cents) < 3;
    if (!ok) fail++;
    console.log(sr, f, r ? r.freq.toFixed(2) : null, cents.toFixed(2) + 'c', ok ? 'OK' : 'FAIL');
  }
// Rauschen / Stille darf nichts erkennen
const noise = new Float32Array(4096).map(() => (Math.random() - 0.5) * 0.3);
const rn = detectPitch(noise, 44100);
console.log('Rauschen:', rn);
if (rn && rn.clarity > 0.9) fail++;
console.log(fail ? 'FEHLER: ' + fail : 'Alle Tests bestanden');
process.exit(fail ? 1 : 0);
