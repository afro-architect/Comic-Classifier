// Renders sample panels to an SVG file so the ink can be eyeballed fast.
import fs from 'node:fs';
import { buildPanel, PANEL_W, PANEL_H } from '../src/artist/panel.js';
import { MOTIFS } from '../src/artist/motifs.js';
import { mergePrims } from '../src/artist/ink.js';

const labels = process.argv[2] ? process.argv[2].split(',') : Object.keys(MOTIFS).map((k) => MOTIFS[k].noun);
const cols = 3;
const rows = Math.ceil(labels.length / cols);
const GAP = 24;
let body = '';
labels.forEach((label, i) => {
  const panel = buildPanel({
    label,
    confidence: 0.72 + (i % 4) * 0.08,
    allScores: [{ label, score: 0.9 }, { label: 'other', score: 0.1 }],
    panelIndex: i,
    history: [label],
    threshold: 0.7,
  });
  const x = (i % cols) * (PANEL_W + GAP);
  const y = Math.floor(i / cols) * (PANEL_H + GAP);
  const paths = mergePrims(panel.prims).map((p) => `<path d="${p.d}" fill="${p.fill}" opacity="${(p.opacity ?? 1).toFixed(3)}"/>`).join('');
  const texts = panel.texts
    .map(
      (t) =>
        `<text x="${t.x}" y="${t.y}" font-size="${t.size}" text-anchor="${t.anchor}" font-family="${t.font === 'caveat' ? 'Caveat' : 'Patrick Hand'}, cursive" font-weight="${t.weight}" fill="#191713" opacity="${t.opacity ?? 1}">${t.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`
    )
    .join('');
  body += `<g transform="translate(${x},${y}) rotate(${panel.rotation.toFixed(2)} ${PANEL_W / 2} ${PANEL_H / 2})"><rect width="${PANEL_W}" height="${PANEL_H}" fill="#f4f0e6"/>${paths}${texts}</g>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * (PANEL_W + GAP)}" height="${rows * (PANEL_H + GAP)}" viewBox="0 0 ${cols * (PANEL_W + GAP)} ${rows * (PANEL_H + GAP)}"><rect width="100%" height="100%" fill="#efe9db"/>${body}</svg>`;
fs.writeFileSync(process.argv[3] || '/home/user/workspace/panel-preview.svg', svg);
console.log('wrote preview with', labels.length, 'panels');
