import React, { useMemo } from 'react';
import { stroke, mergePrims, P } from '../artist/ink.js';
import { makeRng, hashString } from '../artist/prng.js';

/** Loss + accuracy plotted with the same nib as the comics. */
export default function TrainChart({ history, epochs }) {
  const W = 420;
  const H = 140;
  const paths = useMemo(() => {
    const rng = makeRng(hashString('chart' + history.length));
    const prims = [];
    const x0 = 34;
    const y0 = H - 24;
    const x1 = W - 12;
    const y1 = 12;
    prims.push(...stroke([P(x0, y1 - 2), P(x0 - 1, y0)], { width: 1.8, rng, wob: 0.8 }));
    prims.push(...stroke([P(x0 - 2, y0), P(x1, y0 + 1)], { width: 1.8, rng, wob: 0.8 }));
    if (history.length > 1) {
      const maxLoss = Math.max(...history.map((h) => h.loss), 0.001);
      const n = Math.max(epochs, history.length);
      const px = (i) => x0 + ((i) / Math.max(n - 1, 1)) * (x1 - x0);
      const lossPts = history.map((h, i) => P(px(i), y0 - (1 - Math.min(h.loss / maxLoss, 1)) * 0 - (h.loss / maxLoss) * (y0 - y1)));
      const accPts = history.map((h, i) => P(px(i), y0 - h.acc * (y0 - y1)));
      prims.push(...stroke(lossPts, { width: 2.1, rng, wob: 0.55 }));
      prims.push(...stroke(accPts, { width: 1.7, rng, wob: 0.5, opacity: 0.55 }));
    }
    return mergePrims(prims);
  }, [history, epochs]);

  const last = history[history.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Training loss and accuracy per epoch">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="#191713" opacity={p.opacity} />
        ))}
        <text x="4" y="18" fontSize="13" fill="#191713" opacity="0.7" style={{ fontFamily: "'Patrick Hand', cursive" }}>
          1.0
        </text>
        <text x="4" y={H - 20} fontSize="13" fill="#191713" opacity="0.7" style={{ fontFamily: "'Patrick Hand', cursive" }}>
          0
        </text>
        <text x={W - 12} y={H - 6} fontSize="13" textAnchor="end" fill="#191713" opacity="0.7" style={{ fontFamily: "'Patrick Hand', cursive" }}>
          epoch {history.length}/{epochs}
        </text>
      </svg>
      <p className="font-letter text-[14px] text-ink70">
        {last ? `loss ${last.loss.toFixed(3)} · accuracy ${(last.acc * 100).toFixed(0)}%` : 'waiting for the first epoch…'}{' '}
        <span className="text-ink45">(solid = loss, faint = accuracy)</span>
      </p>
    </div>
  );
}
