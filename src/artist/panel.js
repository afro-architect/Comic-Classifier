/**
 * panel.js — the artist agent's composition step.
 *
 * buildPanel(input) -> { w, h, rotation, prims, texts, meta }
 *
 * prims are filled SVG paths; texts are hand-lettered strings positioned in
 * panel space (kept separate so the PNG/PDF exporter can draw them with real
 * fonts on canvas instead of relying on SVG font embedding).
 */

import {
  P, stroke, line, loop, hatch, stipple, flicks, handRect, handBoxPoly,
  ellipsePoly, smooth, pathData, INK, PAPER,
} from './ink.js';
import { makeRng, hashString } from './prng.js';
import { drawMotif, matchMotif, motifNoun } from './motifs.js';
import { drawNarrator, pickPose } from './narrator.js';
import { makeCaption } from './captions.js';

export const PANEL_W = 660;
export const PANEL_H = 520;

const C = (rng, w = 2.4) => ({ width: w, rng, wob: 1, taperIn: 0.25, taperOut: 0.32, step: 4 });

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur.length) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** hand-drawn speech bubble with a tail pointing at (tx, ty) */
function speechBubble(rng, text, x, y, w, h, tx, ty, texts) {
  const out = [];
  const poly = handBoxPoly(x, y, w, h, rng, 3.4);
  const rounded = smooth(poly, 2, true);
  out.push({ d: pathData(rounded, true), fill: PAPER, opacity: 0.94 });
  out.push(...loop(rounded, { ...C(rng, 2.3), wob: 0.7, step: 6 }));
  // tail
  const bx = Math.max(x + 24, Math.min(x + w - 24, tx));
  const by = ty > y ? y + h : y;
  const wide = 20;
  const leftRoot = P(bx - wide, by - 2);
  const rightRoot = P(bx + wide * 0.5, by - 2);
  const tip = P(bx + (tx - bx) * 0.9, by + (ty - by) * 0.86);
  const tail = [leftRoot, P(leftRoot.x + (tip.x - leftRoot.x) * 0.55, leftRoot.y + (tip.y - leftRoot.y) * 0.6), tip, P(rightRoot.x + (tip.x - rightRoot.x) * 0.4, rightRoot.y + (tip.y - rightRoot.y) * 0.45), rightRoot];
  out.push({ d: pathData(smooth(tail, 2, false), false) + 'Z', fill: PAPER, opacity: 0.96 });
  out.push(...stroke([leftRoot, P(leftRoot.x + (tip.x - leftRoot.x) * 0.5, leftRoot.y + (tip.y - leftRoot.y) * 0.55), tip], { ...C(rng, 2.1), wob: 0.6 }));
  out.push(...stroke([tip, P(rightRoot.x + (tip.x - rightRoot.x) * 0.35, rightRoot.y + (tip.y - rightRoot.y) * 0.4), rightRoot], { ...C(rng, 2.1), wob: 0.6 }));
  texts.push({ text, x: x + w / 2, y: y + h / 2 + 6, size: Math.min(23, h * 0.55), font: 'caveat', anchor: 'middle', weight: 700 });
  return out;
}

/**
 * Panels for the two empty states: the narrator asleep at his desk (model not
 * trained yet) and a blank page with an arrow (no classes yet).
 */
export function buildIdlePanel(mode = 'sleeping', note = '') {
  const rng = makeRng(hashString('idle' + mode + note));
  const prims = [];
  const texts = [];
  const pad = 16;
  const inner = { x: pad + 10, y: pad + 10, w: PANEL_W - (pad + 10) * 2, h: PANEL_H - (pad + 10) * 2 };

  prims.push(...stipple([P(inner.x, inner.y), P(inner.x + inner.w, inner.y), P(inner.x + inner.w, inner.y + inner.h), P(inner.x, inner.y + inner.h)], { density: 0.004, rng, rMin: 0.3, rMax: 0.9, opacity: 0.3 }));

  if (mode === 'sleeping') {
    // desk slab
    const deskY = inner.y + inner.h * 0.72;
    prims.push(...stroke([P(inner.x + 20, deskY), P(inner.x + inner.w - 20, deskY - 4)], { ...C(rng, 3) }));
    prims.push(...hatch([P(inner.x + 20, deskY), P(inner.x + inner.w - 20, deskY - 4), P(inner.x + inner.w - 40, deskY + 60), P(inner.x + 44, deskY + 62)], { value: 0.34, rng, angle: -0.1, spacing: 6, width: 0.85, opacity: 0.7 }));
    prims.push(...drawNarrator(rng, { x: inner.x + inner.w * 0.28, y: inner.y + inner.h * 0.1, w: inner.w * 0.42, h: inner.h * 0.72 }, 'asleep', false));
    texts.push({ text: note || 'the artist is asleep. train the model to wake him.', x: PANEL_W / 2, y: PANEL_H - 62, size: 27, font: 'caveat', anchor: 'middle', weight: 600, opacity: 0.85 });
  } else {
    texts.push({ text: note || 'a blank page.', x: PANEL_W / 2, y: PANEL_H * 0.46, size: 40, font: 'caveat', anchor: 'middle', weight: 700, opacity: 0.6 });
    texts.push({ text: 'add a class, record a few samples, and this page fills itself.', x: PANEL_W / 2, y: PANEL_H * 0.46 + 42, size: 24, font: 'caveat', anchor: 'middle', weight: 500, opacity: 0.55 });
    // arrow sweeping to the left column
    prims.push(...stroke([P(PANEL_W * 0.42, PANEL_H * 0.62), P(PANEL_W * 0.26, PANEL_H * 0.72), P(PANEL_W * 0.12, PANEL_H * 0.66)], { width: 3, rng, wob: 1.6, taperIn: 0.3, taperOut: 0.1 }));
    prims.push(...stroke([P(PANEL_W * 0.16, PANEL_H * 0.61), P(PANEL_W * 0.12, PANEL_H * 0.66), P(PANEL_W * 0.19, PANEL_H * 0.7)], { width: 2.6, rng, wob: 0.9 }));
  }

  prims.push(...handRect(pad, pad, PANEL_W - pad * 2, PANEL_H - pad * 2, { rng, width: 3.2, overshoot: 9, wob: 1.5 }));
  prims.push(...handRect(pad + 5, pad + 5, PANEL_W - (pad + 5) * 2, PANEL_H - (pad + 5) * 2, { rng, width: 1, overshoot: 4, wob: 1 }));
  return { w: PANEL_W, h: PANEL_H, rotation: -0.4, prims, texts, meta: { idle: true, mode } };
}

/**
 * @param {object} input
 *   label, confidence, allScores [{label, score}], panelIndex, history [labels],
 *   threshold, confusedOverride, caption (optional override), bubble (optional)
 */
export function buildPanel(input) {
  const {
    label = 'Unknown',
    confidence = 0,
    allScores = [],
    panelIndex = 0,
    history = [],
    threshold = 0.7,
    caption: captionOverride,
    bubble: bubbleOverride,
  } = input;

  const seedKey = `${label}::${panelIndex}::${Math.round(confidence * 50)}`;
  const rng = makeRng(hashString(seedKey));
  const prims = [];
  const texts = [];

  const sorted = [...allScores].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted[1];
  const delta = top && second ? top.score - second.score : 1;
  const confused = (second && delta < 0.15) || confidence < threshold;

  const motifKey = matchMotif(label);
  const first = !history.slice(0, -1).includes(label);
  const returning = history.slice(0, -1).includes(label);
  const rapid = history.length >= 4 && new Set(history.slice(-4)).size >= 3;
  const changed = history.length >= 2 && history[history.length - 2] !== label;

  const rotation = (rng() - 0.5) * 1.1;
  const pad = 16;
  const inner = { x: pad + 10, y: pad + 10, w: PANEL_W - (pad + 10) * 2, h: PANEL_H - (pad + 10) * 2 };

  /* ---------- background: sky stipple, horizon, floor hatch ---------- */
  const skyPoly = [P(inner.x, inner.y), P(inner.x + inner.w, inner.y), P(inner.x + inner.w, inner.y + inner.h * 0.62), P(inner.x, inner.y + inner.h * 0.62)];
  prims.push(...stipple(skyPoly, { density: 0.0055 + rng() * 0.004, rng, rMin: 0.35, rMax: 1.05, opacity: 0.35 }));
  // corner vignette hatching — anchors the composition
  const vign = 0.26 + rng() * 0.1;
  const wedge = (cx, cy, rx, ry, dirX, dirY) => {
    const pts = [P(cx, cy)];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const a = (Math.PI / 2) * t;
      pts.push(P(cx + dirX * rx * Math.cos(a) * (0.9 + rng() * 0.2), cy + dirY * ry * Math.sin(a) * (0.9 + rng() * 0.2)));
    }
    return pts;
  };
  prims.push(...hatch(wedge(inner.x, inner.y, inner.w * 0.38, inner.h * 0.5, 1, 1), { value: vign, rng, angle: -0.62, spacing: 9.5, width: 0.72, opacity: 0.45, skip: 0.16 }));
  prims.push(...hatch(wedge(inner.x + inner.w, inner.y, inner.w * 0.3, inner.h * 0.42, -1, 1), { value: vign * 0.78, rng, angle: 0.62, spacing: 11, width: 0.7, opacity: 0.4, skip: 0.18 }));

  const horizonY = inner.y + inner.h * 0.64;
  prims.push(...stroke([P(inner.x + 4, horizonY + rng() * 6 - 3), P(inner.x + inner.w * 0.5, horizonY - 2), P(inner.x + inner.w - 4, horizonY + rng() * 6 - 3)], { ...C(rng, 1.8), opacity: 0.8 }));
  const floorPoly = [P(inner.x, horizonY), P(inner.x + inner.w, horizonY), P(inner.x + inner.w, inner.y + inner.h), P(inner.x, inner.y + inner.h)];
  prims.push(...hatch(floorPoly, { value: 0.16, rng, angle: -0.06, spacing: 13, width: 0.65, opacity: 0.42, maxPasses: 1, skip: 0.3, jitterEnds: 22 }));

  /* ---------- subject ---------- */
  const subject = { x: inner.x + inner.w * 0.06, y: inner.y + inner.h * 0.1, w: inner.w * 0.54, h: inner.h * 0.72 };

  if (confused && second) {
    // two faint overlapping ghost sketches of the candidates
    const aKey = matchMotif(top?.label ?? label);
    const bKey = matchMotif(second.label);
    prims.push(...drawMotif(aKey, makeRng(hashString(`${top?.label}A${panelIndex}`)), { ...subject, x: subject.x - 14, y: subject.y - 6 }, { ghost: true, ghostOpacity: 0.3 }));
    prims.push(...drawMotif(bKey, makeRng(hashString(`${second.label}B${panelIndex}`)), { ...subject, x: subject.x + 22, y: subject.y + 12 }, { ghost: true, ghostOpacity: 0.24 }));
    // scribbled uncertainty cloud over the pair
    const cx = subject.x + subject.w / 2;
    const cy = subject.y + subject.h / 2;
    const scribble = [];
    for (let i = 0; i < 40; i++) {
      const a = i * 0.62;
      const r = 30 + i * 2.6 + rng() * 12;
      scribble.push(P(cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 0.72));
    }
    prims.push(...stroke(scribble, { width: 1.2, rng, wob: 1.6, taperIn: 0.15, taperOut: 0.2, step: 6, opacity: 0.32 }));
    // big shaky question mark
    const qx = cx + 12;
    const qy = cy - 46;
    prims.push(...stroke([P(qx - 26, qy - 16), P(qx - 8, qy - 42), P(qx + 22, qy - 28), P(qx + 14, qy + 2), P(qx - 2, qy + 16), P(qx - 4, qy + 34)], { width: 5.2, rng, wob: 2.2, taperIn: 0.2, taperOut: 0.3, step: 6, opacity: 0.85 }));
    prims.push(...loop(ellipsePoly(qx - 5, qy + 52, 5, 5.6, 10), { width: 3.4, rng, wob: 1.2 }));
  } else {
    prims.push(...drawMotif(motifKey, rng, subject));
    // grounding shadow under the subject
    const sh = smooth([
      P(subject.x + subject.w * 0.12, subject.y + subject.h * 0.98),
      P(subject.x + subject.w * 0.9, subject.y + subject.h * 0.94),
      P(subject.x + subject.w * 1.0, subject.y + subject.h * 1.08),
      P(subject.x + subject.w * 0.05, subject.y + subject.h * 1.12),
    ], 2, true);
    prims.push(...hatch(sh, { value: 0.38 + confidence * 0.2, rng, angle: -0.12, spacing: 5.2, width: 0.85, opacity: 0.8 }));
    // emphasis rays when very confident
    if (confidence > 0.85) {
      const cx = subject.x + subject.w / 2;
      const cy = subject.y + subject.h * 0.42;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + rng() * 0.12;
        const r0 = subject.w * 0.56;
        prims.push(...line(P(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.86), P(cx + Math.cos(a) * (r0 + 22 + rng() * 16), cy + Math.sin(a) * (r0 + 22 + rng() * 16) * 0.86), { width: 1.5, rng, taperIn: 0.25, taperOut: 0.9, wob: 0.5, opacity: 0.6 }));
      }
    }
  }

  /* ---------- narrator ---------- */
  const pose = pickPose(rng, { confidence, changed, confused, first });
  const narratorBox = { x: inner.x + inner.w * 0.66, y: inner.y + inner.h * 0.2, w: inner.w * 0.3, h: inner.h * 0.68 };
  prims.push(...drawNarrator(rng, narratorBox, pose, true));

  /* ---------- captions ---------- */
  const gen = makeCaption({
    label,
    motif: motifKey,
    confidence,
    threshold,
    first,
    returning,
    rapid,
    confused,
    panelIndex,
    lastCaption: input.lastCaption,
  });
  const caption = captionOverride || gen.caption;
  const bubble = bubbleOverride || gen.bubble;

  // speech bubble above the narrator's head
  const bw = Math.min(190, 54 + bubble.length * 11);
  const bx = Math.min(inner.x + inner.w - bw - 4, narratorBox.x + narratorBox.w * 0.5 - bw * 0.45);
  const by = narratorBox.y - 62;
  prims.push(...speechBubble(rng, bubble, bx, by, bw, 50, narratorBox.x + narratorBox.w * 0.52, narratorBox.y + 8, texts));

  // caption box
  const capLines = wrapText(caption, 42);
  const capH = 30 + capLines.length * 27;
  const capY = PANEL_H - pad - capH - 12;
  const capX = pad + 26;
  const capW = PANEL_W - (pad + 26) * 2;
  const capPoly = smooth(handBoxPoly(capX, capY, capW, capH, rng, 2.6), 1, true);
  prims.push({ d: pathData(capPoly, true), fill: PAPER, opacity: 0.96 });
  prims.push(...loop(capPoly, { ...C(rng, 2.4), wob: 0.8, step: 7 }));
  prims.push(...loop(smooth(handBoxPoly(capX + 5, capY + 5, capW - 10, capH - 10, rng, 2), 1, true), { ...C(rng, 1), wob: 0.6, step: 8, opacity: 0.5 }));
  capLines.forEach((ln, i) => {
    texts.push({ text: ln, x: capX + 18, y: capY + 32 + i * 27, size: 25, font: 'caveat', anchor: 'start', weight: 600 });
  });

  /* ---------- panel furniture: border, index, confidence stamp ---------- */
  prims.push(...handRect(pad, pad, PANEL_W - pad * 2, PANEL_H - pad * 2, { rng, width: 3.4, overshoot: 9, wob: 1.4 }));
  prims.push(...handRect(pad + 5, pad + 5, PANEL_W - (pad + 5) * 2, PANEL_H - (pad + 5) * 2, { rng, width: 1, overshoot: 4, wob: 1, passes: 1 }));

  // little paper knockouts so the corner notes stay legible over hatching
  prims.push({ d: pathData(smooth(handBoxPoly(pad + 14, pad + 14, 26 + label.length * 10, 28, rng, 2), 1, true), true), fill: PAPER, opacity: 0.88 });
  prims.push({ d: pathData(smooth(handBoxPoly(PANEL_W - pad - 56, pad + 14, 44, 28, rng, 2), 1, true), true), fill: PAPER, opacity: 0.88 });

  texts.push({ text: `#${panelIndex + 1}`, x: PANEL_W - pad - 22, y: pad + 34, size: 20, font: 'patrick', anchor: 'end', weight: 400, opacity: 0.7 });
  texts.push({
    text: `${label} · ${Math.round(confidence * 100)}%`,
    x: pad + 22,
    y: pad + 34,
    size: 19,
    font: 'patrick',
    anchor: 'start',
    weight: 400,
    opacity: 0.75,
  });

  return {
    w: PANEL_W,
    h: PANEL_H,
    rotation,
    prims,
    texts,
    meta: { label, confidence, motif: motifKey, noun: motifNoun(label), pose, confused, caption, bubble, band: gen.band, panelIndex },
  };
}
