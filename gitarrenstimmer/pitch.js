/* Tonhöhenerkennung nach dem YIN-Verfahren (de Cheveigné & Kawahara, 2002). */
(function (root) {
  'use strict';

  /**
   * @param {Float32Array} buf  Audio-Samples (mono)
   * @param {number} sampleRate
   * @param {{minFreq?:number,maxFreq?:number,threshold?:number}} [opts]
   * @returns {{freq:number, clarity:number}|null}
   */
  function detectPitch(buf, sampleRate, opts) {
    opts = opts || {};
    var minFreq = opts.minFreq || 50;
    var maxFreq = opts.maxFreq || 1000;
    var threshold = opts.threshold || 0.15;

    var W = buf.length >> 1;
    var tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
    var tauMax = Math.min(W - 1, Math.ceil(sampleRate / minFreq));

    // Differenzfunktion + kumulativ normalisiert (CMND)
    var cmnd = new Float32Array(tauMax + 1);
    cmnd[0] = 1;
    var running = 0;
    for (var tau = 1; tau <= tauMax; tau++) {
      var sum = 0;
      for (var j = 0; j < W; j++) {
        var diff = buf[j] - buf[j + tau];
        sum += diff * diff;
      }
      running += sum;
      cmnd[tau] = running > 0 ? (sum * tau) / running : 1;
    }

    // Erstes Tal unter dem Schwellwert suchen
    var best = -1;
    for (var t = tauMin; t <= tauMax; t++) {
      if (cmnd[t] < threshold) {
        while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
        best = t;
        break;
      }
    }
    if (best < 0) return null;

    // Parabolische Interpolation für Genauigkeit unterhalb eines Samples
    var x0 = best > 1 ? best - 1 : best;
    var x2 = best < tauMax ? best + 1 : best;
    var refined = best;
    if (x0 !== best && x2 !== best) {
      var s0 = cmnd[x0], s1 = cmnd[best], s2 = cmnd[x2];
      var denom = 2 * (2 * s1 - s2 - s0);
      if (denom !== 0) refined = best + (s2 - s0) / denom;
    }
    return { freq: sampleRate / refined, clarity: 1 - cmnd[best] };
  }

  var api = { detectPitch: detectPitch };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Pitch = api;
})(typeof self !== 'undefined' ? self : this);
