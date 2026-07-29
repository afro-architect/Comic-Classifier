/**
 * motifs.js — hand-authored pen-and-ink subject generators.
 *
 * Each generator is written in unit space (0..1 inside the given box) and
 * parameterised by a seeded rng, so the same class + panel index always draws
 * the same creature, but a different panel index re-draws it in a new mood.
 */

import { P, stroke, line, loop, ellipse, ellipsePoly, hatch, stipple, flicks, solid, smooth, densify, preserveCorners, pathData, INK } from './ink.js';

/** A fill region that matches how the contour was inked (corners kept). */
const region = (pts) => densify(preserveCorners(pts, true), true, 5);

const mk = (box) => (ux, uy) => P(box.x + ux * box.w, box.y + uy * box.h);

/** shared options for a confident contour line */
const C = (rng, w = 2.6) => ({ width: w, rng, wob: 1.05, taperIn: 0.22, taperOut: 0.3, step: 4 });
const F = (rng, w = 1.5) => ({ width: w, rng, wob: 0.7, taperIn: 0.3, taperOut: 0.4, step: 3.4 });

/* ------------------------------------------------------------------ */

function cat(rng, box) {
  const p = mk(box);
  const out = [];
  const lean = (rng() - 0.5) * 0.06;
  // body — a sitting teardrop
  const body = [
    p(0.34 + lean, 0.34),
    p(0.24, 0.55),
    p(0.19, 0.78),
    p(0.24, 0.9),
    p(0.5, 0.94),
    p(0.72, 0.9),
    p(0.75, 0.72),
    p(0.66, 0.5),
    p(0.6 + lean, 0.34),
  ];
  out.push(...stroke(body, C(rng, 2.8)));
  const bodyPoly = region(body.concat([p(0.5, 0.36)]));
  out.push(...hatch(bodyPoly, { value: 0.34, rng, angle: -1.05, spacing: 7.4, width: 0.9 }));
  out.push(...hatch(bodyPoly.map((q) => P(q.x, q.y)), { value: 0.3, rng, angle: -1.05, spacing: 12, width: 0.8, opacity: 0.5 }));
  // belly light — flicks of fur on the shaded side only
  out.push(...flicks(region([p(0.2, 0.6), p(0.34, 0.55), p(0.36, 0.9), p(0.23, 0.9)]), { count: 26, rng, len: 7, angle: 1.35, spread: 0.6, width: 0.75 }));
  // head
  const hx = 0.47 + lean;
  const hy = 0.24;
  const head = ellipsePoly(box.x + hx * box.w, box.y + hy * box.h, box.w * 0.15, box.h * 0.135, 30, (rng() - 0.5) * 0.2);
  out.push(...loop(head, C(rng, 2.6)));
  out.push(...hatch(head, { value: 0.22, rng, angle: -0.9, spacing: 9, width: 0.72, opacity: 0.85 }));
  // ears
  for (const s of [-1, 1]) {
    const ear = [p(hx + s * 0.055, hy - 0.09), p(hx + s * 0.125, hy - 0.2), p(hx + s * 0.15, hy - 0.03)];
    out.push(...stroke(ear.concat([ear[0]]), C(rng, 2.2)));
    out.push(...hatch(region(ear), { value: 0.55, rng, angle: 0.6, spacing: 3.6, width: 0.8 }));
  }
  // eyes + nose + whiskers
  for (const s of [-1, 1]) {
    const ex = hx + s * 0.055;
    out.push(...loop(ellipsePoly(box.x + ex * box.w, box.y + (hy - 0.005) * box.h, box.w * 0.019, box.h * 0.026, 14), F(rng, 1.5)));
    out.push({ d: pathData(ellipsePoly(box.x + ex * box.w, box.y + (hy - 0.005) * box.h, box.w * 0.011, box.h * 0.018, 12), true), fill: INK, opacity: 0.95 });
  }
  out.push(...stroke([p(hx - 0.018, hy + 0.045), p(hx, hy + 0.058), p(hx + 0.018, hy + 0.045)], F(rng, 1.8)));
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const yy = hy + 0.045 + i * 0.018 - 0.016;
      out.push(...line(p(hx + s * 0.03, hy + 0.05), p(hx + s * (0.2 + rng() * 0.05), yy), { ...F(rng, 1.1), taperOut: 0.9 }));
    }
  }
  // tail
  const tail = [p(0.72, 0.9), p(0.86, 0.86), p(0.93, 0.7), p(0.86, 0.56), p(0.78, 0.58)];
  out.push(...stroke(tail, C(rng, 3)));
  out.push(...hatch(region(tail.concat([p(0.8, 0.68), p(0.74, 0.88)])), { value: 0.4, rng, angle: 0.4, spacing: 5.5, width: 0.8 }));
  // paws
  out.push(...stroke([p(0.36, 0.93), p(0.42, 0.88), p(0.48, 0.93)], F(rng, 1.6)));
  out.push(...stroke([p(0.52, 0.93), p(0.58, 0.88), p(0.64, 0.93)], F(rng, 1.6)));
  return out;
}

function dog(rng, box) {
  const p = mk(box);
  const out = [];
  const body = [p(0.36, 0.4), p(0.26, 0.6), p(0.24, 0.86), p(0.34, 0.93), p(0.62, 0.93), p(0.72, 0.84), p(0.66, 0.56), p(0.6, 0.4)];
  out.push(...stroke(body, C(rng, 2.8)));
  const bodyPoly = region(body.concat([p(0.48, 0.42)]));
  out.push(...hatch(bodyPoly, { value: 0.42, rng, angle: -1.0, spacing: 6.6, width: 0.95 }));
  const hx = 0.48;
  const hy = 0.27;
  const head = ellipsePoly(box.x + hx * box.w, box.y + hy * box.h, box.w * 0.155, box.h * 0.14, 30);
  out.push(...loop(head, C(rng, 2.6)));
  out.push(...hatch(head, { value: 0.24, rng, angle: -0.7, spacing: 8.4, width: 0.7, opacity: 0.8 }));
  // muzzle
  const muz = ellipsePoly(box.x + hx * box.w, box.y + (hy + 0.075) * box.h, box.w * 0.085, box.h * 0.062, 24);
  out.push(...loop(muz, F(rng, 1.9)));
  out.push({ d: pathData(ellipsePoly(box.x + hx * box.w, box.y + (hy + 0.045) * box.h, box.w * 0.026, box.h * 0.02, 16), true), fill: INK, opacity: 0.95 });
  out.push(...stroke([p(hx, hy + 0.065), p(hx, hy + 0.095)], F(rng, 1.4)));
  out.push(...stroke([p(hx - 0.05, hy + 0.095), p(hx - 0.015, hy + 0.11), p(hx, hy + 0.095), p(hx + 0.02, hy + 0.11), p(hx + 0.05, hy + 0.093)], F(rng, 1.5)));
  // floppy ears
  for (const s of [-1, 1]) {
    const ear = [p(hx + s * 0.1, hy - 0.08), p(hx + s * 0.21, hy - 0.02), p(hx + s * 0.2, hy + 0.11), p(hx + s * 0.11, hy + 0.06)];
    out.push(...loop(ear, C(rng, 2.2)));
    out.push(...hatch(region(ear), { value: 0.62, rng, angle: -0.4, spacing: 4.2, width: 0.85 }));
  }
  for (const s of [-1, 1]) {
    out.push({ d: pathData(ellipsePoly(box.x + (hx + s * 0.06) * box.w, box.y + (hy - 0.015) * box.h, box.w * 0.017, box.h * 0.02, 12), true), fill: INK, opacity: 0.95 });
  }
  // tail wag + speed lines
  out.push(...stroke([p(0.71, 0.8), p(0.83, 0.7), p(0.88, 0.56)], C(rng, 2.6)));
  for (let i = 0; i < 3; i++) out.push(...stroke([p(0.86 + i * 0.02, 0.74 - i * 0.03), p(0.94 + i * 0.015, 0.68 - i * 0.04)], { ...F(rng, 1.2), taperOut: 0.8 }));
  out.push(...stroke([p(0.32, 0.93), p(0.4, 0.87), p(0.47, 0.93)], F(rng, 1.6)));
  return out;
}

function face(rng, box) {
  const p = mk(box);
  const out = [];
  const cx = 0.5 + (rng() - 0.5) * 0.05;
  // shoulders
  const sh = [p(cx - 0.42, 1.02), p(cx - 0.3, 0.78), p(cx - 0.12, 0.68), p(cx + 0.12, 0.68), p(cx + 0.3, 0.78), p(cx + 0.42, 1.02)];
  out.push(...stroke(sh, C(rng, 2.9)));
  out.push(...hatch(region(sh.concat([p(cx + 0.4, 1.04), p(cx - 0.4, 1.04)])), { value: 0.45, rng, angle: -1.1, spacing: 6, width: 0.95 }));
  // collar
  out.push(...stroke([p(cx - 0.14, 0.7), p(cx, 0.79), p(cx + 0.14, 0.7)], F(rng, 2)));
  // head
  const head = ellipsePoly(box.x + cx * box.w, box.y + 0.4 * box.h, box.w * 0.2, box.h * 0.26, 34, (rng() - 0.5) * 0.12);
  out.push(...loop(head, C(rng, 2.8)));
  // shading on one cheek
  const cheek = region([p(cx + 0.08, 0.24), p(cx + 0.2, 0.4), p(cx + 0.14, 0.6), p(cx + 0.04, 0.66)]);
  out.push(...hatch(cheek, { value: 0.3, rng, angle: -1.2, spacing: 7, width: 0.8, opacity: 0.85 }));
  // hair scribble
  const hair = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const a = Math.PI * (1.05 + t * 0.9);
    hair.push(P(box.x + cx * box.w + Math.cos(a) * box.w * 0.225, box.y + 0.4 * box.h + Math.sin(a) * box.h * 0.3 - box.h * 0.02));
  }
  out.push(...stroke(hair, C(rng, 3)));
  out.push(...hatch(region(hair.concat([p(cx + 0.16, 0.3), p(cx, 0.22), p(cx - 0.18, 0.3)])), { value: 0.78, rng, angle: -0.5, spacing: 3.4, width: 1 }));
  // eyes
  for (const s of [-1, 1]) {
    const ex = cx + s * 0.078;
    out.push(...stroke([p(ex - 0.05, 0.4), p(ex, 0.37), p(ex + 0.05, 0.4)], F(rng, 1.8)));
    out.push(...stroke([p(ex - 0.045, 0.405), p(ex, 0.43), p(ex + 0.045, 0.405)], F(rng, 1.4)));
    out.push({ d: pathData(ellipsePoly(box.x + ex * box.w, box.y + 0.405 * box.h, box.w * 0.016, box.h * 0.021, 14), true), fill: INK, opacity: 0.95 });
    out.push(...stroke([p(ex - 0.055, 0.325), p(ex + s * 0.01, 0.305), p(ex + 0.055, 0.33)], F(rng, 2)));
  }
  // nose + mouth
  out.push(...stroke([p(cx - 0.01, 0.44), p(cx + 0.025, 0.53), p(cx - 0.02, 0.55)], F(rng, 1.7)));
  const smile = rng() < 0.6;
  out.push(...stroke(smile ? [p(cx - 0.07, 0.6), p(cx, 0.645), p(cx + 0.07, 0.6)] : [p(cx - 0.07, 0.63), p(cx, 0.61), p(cx + 0.07, 0.63)], F(rng, 2.1)));
  // ears
  for (const s of [-1, 1]) out.push(...stroke([p(cx + s * 0.2, 0.38), p(cx + s * 0.245, 0.45), p(cx + s * 0.2, 0.52)], F(rng, 1.7)));
  return out;
}

function thumbsUp(rng, box) {
  const p = mk(box);
  const out = [];
  // curled fingers: four stacked knuckle arcs give the fist its read
  const fist = [
    p(0.3, 0.46), p(0.27, 0.58), p(0.28, 0.74), p(0.37, 0.86),
    p(0.6, 0.89), p(0.71, 0.8), p(0.72, 0.6), p(0.63, 0.47), p(0.46, 0.44),
  ];
  out.push(...stroke(fist, C(rng, 2.9)));
  const fistPoly = region(fist);
  out.push(...hatch(fistPoly, { value: 0.26, rng, angle: -1.1, spacing: 8.5, width: 0.85 }));
  for (let i = 0; i < 4; i++) {
    const y = 0.52 + i * 0.095;
    // each finger is a shallow arc from the left edge, ending in a knuckle dimple
    out.push(...stroke([p(0.3 + i * 0.006, y), p(0.46, y - 0.028), p(0.64 - i * 0.012, y + 0.012)], F(rng, 1.7)));
    out.push(...stroke([p(0.615 - i * 0.012, y + 0.008), p(0.66 - i * 0.012, y + 0.03)], F(rng, 1.3)));
  }
  out.push(...hatch(region([p(0.6, 0.48), p(0.72, 0.58), p(0.7, 0.82), p(0.58, 0.87)]), { value: 0.48, rng, angle: -0.5, spacing: 5.2, width: 0.85 }));
  // thumb — upright, with a joint crease
  const thumb = [p(0.31, 0.47), p(0.285, 0.3), p(0.31, 0.15), p(0.4, 0.11), p(0.47, 0.19), p(0.46, 0.34), p(0.44, 0.45)];
  out.push(...stroke(thumb, C(rng, 2.7)));
  out.push(...hatch(region(thumb), { value: 0.22, rng, angle: -1.3, spacing: 9, width: 0.8, opacity: 0.8 }));
  out.push(...stroke([p(0.3, 0.34), p(0.38, 0.31), p(0.455, 0.335)], F(rng, 1.5)));
  out.push(...hatch(region([p(0.4, 0.14), p(0.47, 0.2), p(0.46, 0.42), p(0.4, 0.43)]), { value: 0.44, rng, angle: -1.2, spacing: 5, width: 0.8 }));
  // cuff
  out.push(...stroke([p(0.28, 0.82), p(0.24, 0.98)], C(rng, 2.4)));
  out.push(...stroke([p(0.72, 0.8), p(0.78, 0.96)], C(rng, 2.4)));
  out.push(...stroke([p(0.24, 0.98), p(0.5, 1.03), p(0.78, 0.96)], C(rng, 2.4)));
  out.push(...hatch(region([p(0.28, 0.84), p(0.72, 0.82), p(0.78, 0.97), p(0.24, 0.99)]), { value: 0.66, rng, angle: 0.5, spacing: 4, width: 0.95 }));
  // approval sparks
  for (let i = 0; i < 5; i++) {
    const a = -0.6 - i * 0.35;
    const r0 = 0.3 + rng() * 0.03;
    out.push(...line(p(0.5 + Math.cos(a) * r0, 0.4 + Math.sin(a) * r0 * 1.1), p(0.5 + Math.cos(a) * (r0 + 0.09), 0.4 + Math.sin(a) * (r0 + 0.09) * 1.1), { ...F(rng, 1.6), taperOut: 0.9 }));
  }
  return out;
}

function desk(rng, box) {
  const p = mk(box);
  const out = [];
  // back wall hatch + window
  const wall = region([p(0.02, 0.02), p(0.98, 0.02), p(0.98, 0.62), p(0.02, 0.62)]);
  out.push(...hatch(wall, { value: 0.14, rng, angle: -1.15, spacing: 13, width: 0.6, opacity: 0.55 }));
  const win = [p(0.6, 0.08), p(0.9, 0.08), p(0.9, 0.42), p(0.6, 0.42)];
  out.push(...loop(win, C(rng, 2.4)));
  out.push(...stroke([p(0.75, 0.08), p(0.75, 0.42)], F(rng, 1.6)));
  out.push(...stroke([p(0.6, 0.25), p(0.9, 0.25)], F(rng, 1.6)));
  out.push(...stipple(region(win), { density: 0.02, rng, rMin: 0.4, rMax: 1, opacity: 0.6 }));
  // desk slab in perspective
  const top = [p(0.06, 0.62), p(0.94, 0.62), p(0.86, 0.72), p(0.14, 0.72)];
  out.push(...loop(top, C(rng, 3)));
  out.push(...hatch(region(top), { value: 0.2, rng, angle: -0.15, spacing: 6, width: 0.7, opacity: 0.7 }));
  out.push(...stroke([p(0.14, 0.72), p(0.16, 0.98)], C(rng, 2.6)));
  out.push(...stroke([p(0.86, 0.72), p(0.84, 0.98)], C(rng, 2.6)));
  // shadow under desk
  out.push(...hatch(region([p(0.16, 0.74), p(0.84, 0.74), p(0.9, 0.99), p(0.1, 0.99)]), { value: 0.5, rng, angle: -1.2, spacing: 6, width: 0.85, opacity: 0.75 }));
  // a lonely mug + pencil on top
  const mx = 0.26;
  out.push(...loop([p(mx - 0.05, 0.5), p(mx + 0.05, 0.5), p(mx + 0.042, 0.62), p(mx - 0.042, 0.62)], F(rng, 2.1)));
  out.push(...stroke([p(mx + 0.05, 0.53), p(mx + 0.09, 0.55), p(mx + 0.06, 0.59)], F(rng, 1.8)));
  out.push(...hatch(region([p(mx - 0.05, 0.5), p(mx + 0.05, 0.5), p(mx + 0.042, 0.62), p(mx - 0.042, 0.62)]), { value: 0.4, rng, angle: -1.2, spacing: 5, width: 0.8 }));
  out.push(...stroke([p(0.42, 0.66), p(0.56, 0.645)], C(rng, 2.2)));
  out.push(...stroke([p(0.56, 0.645), p(0.6, 0.652), p(0.56, 0.66)], F(rng, 1.4)));
  // chair back, empty
  out.push(...loop([p(0.36, 0.3), p(0.54, 0.3), p(0.54, 0.5), p(0.36, 0.5)], C(rng, 2.4)));
  out.push(...hatch(region([p(0.36, 0.3), p(0.54, 0.3), p(0.54, 0.5), p(0.36, 0.5)]), { value: 0.35, rng, angle: -1.05, spacing: 6.4, width: 0.8 }));
  out.push(...stroke([p(0.45, 0.5), p(0.45, 0.63)], F(rng, 1.8)));
  return out;
}

function mug(rng, box) {
  const p = mk(box);
  const out = [];
  const body = [p(0.3, 0.34), p(0.7, 0.34), p(0.66, 0.84), p(0.34, 0.84)];
  out.push(...loop(body, C(rng, 3)));
  const poly = region(body);
  out.push(...hatch(poly, { value: 0.28, rng, angle: -1.25, spacing: 7.4, width: 0.9 }));
  out.push(...hatch(region([p(0.56, 0.36), p(0.7, 0.36), p(0.66, 0.83), p(0.56, 0.83)]), { value: 0.6, rng, angle: -1.25, spacing: 4.4, width: 0.9 }));
  // rim ellipse
  out.push(...loop(ellipsePoly(box.x + 0.5 * box.w, box.y + 0.34 * box.h, box.w * 0.2, box.h * 0.052, 28), C(rng, 2.4)));
  out.push(...hatch(ellipsePoly(box.x + 0.5 * box.w, box.y + 0.34 * box.h, box.w * 0.185, box.h * 0.045, 28), { value: 0.55, rng, angle: 0.2, spacing: 3.6, width: 0.8 }));
  // handle
  out.push(...stroke([p(0.69, 0.44), p(0.84, 0.46), p(0.86, 0.6), p(0.72, 0.66)], C(rng, 2.6)));
  out.push(...stroke([p(0.69, 0.5), p(0.79, 0.52), p(0.8, 0.59), p(0.71, 0.62)], F(rng, 1.6)));
  // steam
  for (let i = 0; i < 3; i++) {
    const sx = 0.4 + i * 0.1;
    out.push(...stroke([p(sx, 0.3), p(sx + 0.045, 0.22), p(sx - 0.03, 0.14), p(sx + 0.03, 0.05)], { ...F(rng, 1.7), taperIn: 0.25, taperOut: 0.6, wob: 1 }));
  }
  // saucer shadow
  out.push(...hatch(region([p(0.26, 0.85), p(0.74, 0.85), p(0.8, 0.92), p(0.2, 0.92)]), { value: 0.45, rng, angle: -0.1, spacing: 4.4, width: 0.8 }));
  return out;
}

function book(rng, box) {
  const p = mk(box);
  const out = [];
  const spineX = 0.5;
  const left = [p(0.08, 0.42), p(spineX, 0.32), p(spineX, 0.8), p(0.1, 0.86)];
  const right = [p(spineX, 0.32), p(0.92, 0.42), p(0.9, 0.86), p(spineX, 0.8)];
  out.push(...loop(left, C(rng, 2.7)));
  out.push(...loop(right, C(rng, 2.7)));
  out.push(...hatch(region(left), { value: 0.16, rng, angle: -0.25, spacing: 10, width: 0.6, opacity: 0.6 }));
  out.push(...hatch(region(right), { value: 0.12, rng, angle: 0.25, spacing: 11, width: 0.6, opacity: 0.55 }));
  // text lines
  for (let i = 0; i < 7; i++) {
    const t = 0.42 + i * 0.055;
    out.push(...stroke([p(0.15, t + 0.03), p(0.45, t - 0.02)], { ...F(rng, 1.1), wob: 0.5 }));
    out.push(...stroke([p(0.55, t - 0.02), p(0.85, t + 0.03)], { ...F(rng, 1.1), wob: 0.5 }));
  }
  // page edges
  for (let i = 1; i < 4; i++) {
    out.push(...stroke([p(0.1 - i * 0.006, 0.86 + i * 0.02), p(spineX, 0.8 + i * 0.018)], F(rng, 1.2)));
    out.push(...stroke([p(spineX, 0.8 + i * 0.018), p(0.9 + i * 0.006, 0.86 + i * 0.02)], F(rng, 1.2)));
  }
  out.push(...stroke([p(spineX, 0.32), p(spineX, 0.8)], C(rng, 2.2)));
  // bookmark ribbon
  out.push(...stroke([p(0.66, 0.37), p(0.68, 0.62), p(0.64, 0.7)], F(rng, 2)));
  return out;
}

function phone(rng, box) {
  const p = mk(box);
  const out = [];
  const tilt = (rng() - 0.5) * 0.04;
  const body = [p(0.33 + tilt, 0.14), p(0.67 + tilt, 0.16), p(0.66 - tilt, 0.9), p(0.32 - tilt, 0.88)];
  out.push(...loop(body, C(rng, 3)));
  const screen = [p(0.37 + tilt, 0.2), p(0.63 + tilt, 0.215), p(0.62 - tilt, 0.82), p(0.36 - tilt, 0.81)];
  out.push(...loop(screen, F(rng, 1.8)));
  out.push(...hatch(region(screen), { value: 0.5, rng, angle: -1.2, spacing: 5, width: 0.85 }));
  out.push(...stipple(region(screen), { density: 0.02, rng, opacity: 0.5 }));
  // glare streak
  out.push(...stroke([p(0.4, 0.75), p(0.58, 0.28)], { ...C(rng, 5), opacity: 0.0 }));
  out.push(...loop([p(0.4, 0.74), p(0.47, 0.74), p(0.6, 0.3), p(0.53, 0.3)], { ...F(rng, 1.2), opacity: 0.6 }));
  // speaker + button
  out.push(...stroke([p(0.45, 0.175), p(0.55, 0.18)], F(rng, 1.6)));
  out.push(...loop(ellipsePoly(box.x + 0.5 * box.w, box.y + 0.86 * box.h, box.w * 0.022, box.h * 0.022, 12), F(rng, 1.4)));
  // notification sparks
  for (let i = 0; i < 4; i++) {
    const a = -1.9 + i * 0.3;
    out.push(...line(p(0.5 + Math.cos(a) * 0.28, 0.5 + Math.sin(a) * 0.5), p(0.5 + Math.cos(a) * 0.4, 0.5 + Math.sin(a) * 0.68), { ...F(rng, 1.4), taperOut: 0.9 }));
  }
  return out;
}

function plant(rng, box) {
  const p = mk(box);
  const out = [];
  const pot = [p(0.34, 0.66), p(0.66, 0.66), p(0.6, 0.94), p(0.4, 0.94)];
  out.push(...loop(pot, C(rng, 2.9)));
  out.push(...hatch(region(pot), { value: 0.5, rng, angle: -1.2, spacing: 5.2, width: 0.9 }));
  out.push(...stroke([p(0.32, 0.66), p(0.68, 0.66)], C(rng, 2.4)));
  out.push(...stroke([p(0.33, 0.72), p(0.67, 0.72)], F(rng, 1.6)));
  // leaves
  const nLeaves = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < nLeaves; i++) {
    const t = i / (nLeaves - 1);
    const ang = -Math.PI / 2 + (t - 0.5) * 2.1 + (rng() - 0.5) * 0.2;
    const len = 0.34 + rng() * 0.2;
    const bx = 0.5 + (t - 0.5) * 0.06;
    const tipx = bx + Math.cos(ang) * len * 0.9;
    const tipy = 0.66 + Math.sin(ang) * len;
    const midx = bx + Math.cos(ang) * len * 0.45;
    const midy = 0.66 + Math.sin(ang) * len * 0.5;
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const wdt = 0.055 + rng() * 0.03;
    const leaf = [P(box.x + bx * box.w, box.y + 0.66 * box.h),
      P(box.x + (midx + nx * wdt) * box.w, box.y + (midy + ny * wdt) * box.h),
      P(box.x + tipx * box.w, box.y + tipy * box.h),
      P(box.x + (midx - nx * wdt) * box.w, box.y + (midy - ny * wdt) * box.h)];
    out.push(...loop(leaf, C(rng, 2.2)));
    out.push(...stroke([leaf[0], P(box.x + midx * box.w, box.y + midy * box.h), leaf[2]], F(rng, 1.3)));
    if (i % 2 === 0) out.push(...hatch(region(leaf), { value: 0.36, rng, angle: ang + 1.2, spacing: 5.4, width: 0.75 }));
  }
  // soil stipple
  out.push(...stipple(region([p(0.34, 0.66), p(0.66, 0.66), p(0.65, 0.71), p(0.35, 0.71)]), { density: 0.06, rng, rMin: 0.5, rMax: 1.4 }));
  return out;
}

function food(rng, box) {
  const p = mk(box);
  const out = [];
  // a bowl of noodles, because it hatches beautifully
  const bowl = [p(0.16, 0.5), p(0.84, 0.5), p(0.72, 0.88), p(0.28, 0.88)];
  out.push(...loop(bowl, C(rng, 3)));
  out.push(...hatch(region(bowl), { value: 0.4, rng, angle: -1.2, spacing: 6, width: 0.9 }));
  out.push(...hatch(region([p(0.62, 0.52), p(0.84, 0.5), p(0.72, 0.88), p(0.6, 0.88)]), { value: 0.62, rng, angle: -1.2, spacing: 4.2, width: 0.9 }));
  out.push(...loop(ellipsePoly(box.x + 0.5 * box.w, box.y + 0.5 * box.h, box.w * 0.34, box.h * 0.07, 32), C(rng, 2.4)));
  // noodles
  for (let i = 0; i < 9; i++) {
    const sx = 0.24 + rng() * 0.5;
    out.push(...stroke([p(sx, 0.5), p(sx + 0.05 - rng() * 0.1, 0.42), p(sx + 0.09 - rng() * 0.18, 0.35), p(sx + 0.02, 0.3)], { ...F(rng, 1.5), wob: 1.1, taperOut: 0.5 }));
  }
  // chopsticks
  out.push(...stroke([p(0.62, 0.14), p(0.44, 0.5)], C(rng, 2.2)));
  out.push(...stroke([p(0.68, 0.15), p(0.5, 0.51)], C(rng, 2.2)));
  // steam
  for (let i = 0; i < 2; i++) {
    const sx = 0.3 + i * 0.13;
    out.push(...stroke([p(sx, 0.4), p(sx + 0.05, 0.3), p(sx - 0.03, 0.2), p(sx + 0.03, 0.1)], { ...F(rng, 1.6), wob: 1, taperIn: 0.3 }));
  }
  out.push(...hatch(region([p(0.22, 0.88), p(0.78, 0.88), p(0.86, 0.95), p(0.14, 0.95)]), { value: 0.42, rng, angle: -0.1, spacing: 4.6, width: 0.8 }));
  return out;
}

function boxObj(rng, box) {
  const p = mk(box);
  const out = [];
  const front = [p(0.26, 0.42), p(0.66, 0.46), p(0.66, 0.88), p(0.26, 0.84)];
  const side = [p(0.66, 0.46), p(0.84, 0.36), p(0.84, 0.78), p(0.66, 0.88)];
  const top = [p(0.26, 0.42), p(0.44, 0.3), p(0.84, 0.36), p(0.66, 0.46)];
  out.push(...loop(front, C(rng, 2.9)));
  out.push(...loop(side, C(rng, 2.7)));
  out.push(...loop(top, C(rng, 2.7)));
  out.push(...hatch(region(front), { value: 0.2, rng, angle: -1.2, spacing: 8, width: 0.8, opacity: 0.7 }));
  out.push(...hatch(region(side), { value: 0.62, rng, angle: -1.05, spacing: 4.4, width: 0.9 }));
  out.push(...hatch(region(top), { value: 0.1, rng, angle: 0.3, spacing: 12, width: 0.6, opacity: 0.5 }));
  // tape
  out.push(...stroke([p(0.44, 0.3), p(0.46, 0.86)], F(rng, 2)));
  out.push(...stroke([p(0.26, 0.62), p(0.66, 0.66)], F(rng, 1.6)));
  // ground shadow
  out.push(...hatch(region([p(0.2, 0.86), p(0.86, 0.79), p(0.94, 0.9), p(0.16, 0.95)]), { value: 0.4, rng, angle: -0.08, spacing: 5, width: 0.85 }));
  return out;
}

function lamp(rng, box) {
  const p = mk(box);
  const out = [];
  const shade = [p(0.34, 0.2), p(0.66, 0.2), p(0.78, 0.44), p(0.22, 0.44)];
  out.push(...loop(shade, C(rng, 3)));
  out.push(...hatch(region(shade), { value: 0.55, rng, angle: -1.15, spacing: 4.6, width: 0.95 }));
  out.push(...stroke([p(0.22, 0.44), p(0.78, 0.44)], C(rng, 2.4)));
  out.push(...stroke([p(0.5, 0.44), p(0.5, 0.82)], C(rng, 2.6)));
  out.push(...loop(ellipsePoly(box.x + 0.5 * box.w, box.y + 0.86 * box.h, box.w * 0.2, box.h * 0.05, 26), C(rng, 2.6)));
  out.push(...hatch(ellipsePoly(box.x + 0.5 * box.w, box.y + 0.87 * box.h, box.w * 0.19, box.h * 0.045, 26), { value: 0.5, rng, angle: 0.2, spacing: 4, width: 0.8 }));
  // light cone: stipple, brightest near the bulb
  const cone = region([p(0.24, 0.46), p(0.76, 0.46), p(0.98, 0.98), p(0.02, 0.98)]);
  out.push(...stipple(cone, { density: 0.018, rng, rMin: 0.4, rMax: 1.1, opacity: 0.45 }));
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    out.push(...line(p(0.26 + t * 0.48, 0.47), p(0.06 + t * 0.88, 0.97), { ...F(rng, 1), opacity: 0.45, taperIn: 0.3, taperOut: 0.5 }));
  }
  // radiating flicks
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.1 + (i / 6) * 0.8);
    out.push(...line(p(0.5 + Math.cos(a) * 0.36, 0.34 + Math.sin(a) * 0.2), p(0.5 + Math.cos(a) * 0.46, 0.34 + Math.sin(a) * 0.28), { ...F(rng, 1.4), taperOut: 0.9 }));
  }
  return out;
}

function car(rng, box) {
  const p = mk(box);
  const out = [];
  const body = [p(0.08, 0.72), p(0.16, 0.54), p(0.34, 0.5), p(0.44, 0.34), p(0.68, 0.34), p(0.78, 0.52), p(0.92, 0.58), p(0.94, 0.74), p(0.1, 0.76)];
  out.push(...loop(body, C(rng, 3)));
  out.push(...hatch(region(body), { value: 0.32, rng, angle: -1.15, spacing: 6.8, width: 0.9 }));
  out.push(...loop([p(0.46, 0.37), p(0.56, 0.37), p(0.56, 0.5), p(0.4, 0.5)], F(rng, 1.8)));
  out.push(...loop([p(0.6, 0.37), p(0.66, 0.37), p(0.74, 0.51), p(0.6, 0.51)], F(rng, 1.8)));
  for (const cx of [0.3, 0.74]) {
    out.push(...loop(ellipsePoly(box.x + cx * box.w, box.y + 0.78 * box.h, box.w * 0.1, box.h * 0.1, 24), C(rng, 2.8)));
    out.push(...hatch(ellipsePoly(box.x + cx * box.w, box.y + 0.78 * box.h, box.w * 0.095, box.h * 0.095, 24), { value: 0.68, rng, angle: -0.9, spacing: 3.6, width: 0.85 }));
    out.push(...loop(ellipsePoly(box.x + cx * box.w, box.y + 0.78 * box.h, box.w * 0.035, box.h * 0.035, 16), F(rng, 1.6)));
  }
  for (let i = 0; i < 4; i++) out.push(...line(p(0.02, 0.5 + i * 0.07), p(0.18 - i * 0.02, 0.5 + i * 0.07), { ...F(rng, 1.3), taperOut: 0.85 }));
  return out;
}

function mystery(rng, box) {
  const p = mk(box);
  const out = [];
  // amorphous silhouette
  const n = 14;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 0.24 + 0.09 * Math.sin(a * 3 + rng()) + rng() * 0.05;
    pts.push(P(box.x + (0.5 + Math.cos(a) * r) * box.w, box.y + (0.55 + Math.sin(a) * r * 1.15) * box.h));
  }
  out.push(...loop(pts, C(rng, 3)));
  out.push(...hatch(region(pts), { value: 0.6, rng, angle: -1.1, spacing: 5, width: 0.95 }));
  out.push(...stipple(region(pts), { density: 0.02, rng, opacity: 0.4 }));
  // question mark carved out in white-ish strokes above
  const qx = 0.5;
  const qy = 0.24;
  out.push(...stroke([p(qx - 0.07, qy - 0.06), p(qx - 0.02, qy - 0.12), p(qx + 0.06, qy - 0.09), p(qx + 0.05, qy - 0.01), p(qx, qy + 0.04), p(qx, qy + 0.09)], { ...C(rng, 3.2), wob: 1.4 }));
  out.push(...loop(ellipsePoly(box.x + qx * box.w, box.y + (qy + 0.15) * box.h, box.w * 0.014, box.h * 0.016, 10), C(rng, 2)));
  // uncertainty ticks
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    out.push(...line(p(0.5 + Math.cos(a) * 0.34, 0.55 + Math.sin(a) * 0.38), p(0.5 + Math.cos(a) * 0.42, 0.55 + Math.sin(a) * 0.47), { ...F(rng, 1.4), taperOut: 0.9, opacity: 0.8 }));
  }
  return out;
}

function bottle(rng, box) {
  const p = mk(box);
  const out = [];
  const body = [p(0.36, 0.36), p(0.36, 0.28), p(0.64, 0.28), p(0.64, 0.36), p(0.74, 0.5), p(0.74, 0.92), p(0.26, 0.92), p(0.26, 0.5)];
  out.push(...loop(body, C(rng, 2.9)));
  out.push(...hatch(region(body), { value: 0.26, rng, angle: -1.2, spacing: 8, width: 0.85 }));
  out.push(...hatch(region([p(0.6, 0.46), p(0.74, 0.52), p(0.74, 0.92), p(0.6, 0.92)]), { value: 0.6, rng, angle: -1.2, spacing: 4.4, width: 0.9 }));
  out.push(...loop([p(0.34, 0.24), p(0.66, 0.24), p(0.66, 0.3), p(0.34, 0.3)], F(rng, 2)));
  out.push(...loop([p(0.3, 0.6), p(0.7, 0.6), p(0.7, 0.78), p(0.3, 0.78)], F(rng, 1.9)));
  for (let i = 0; i < 3; i++) out.push(...stroke([p(0.35, 0.65 + i * 0.045), p(0.65, 0.652 + i * 0.045)], { ...F(rng, 1.1), wob: 0.5 }));
  return out;
}

/* ------------------------------------------------------------------ */
/* registry + fuzzy matching                                            */
/* ------------------------------------------------------------------ */

export const MOTIFS = {
  cat: { draw: cat, noun: 'cat', keys: ['cat', 'kitten', 'kitty', 'feline', 'meow', 'tabby'] },
  dog: { draw: dog, noun: 'dog', keys: ['dog', 'puppy', 'pup', 'hound', 'canine', 'doggo', 'woof'] },
  face: { draw: face, noun: 'person', keys: ['face', 'person', 'people', 'me', 'human', 'selfie', 'head', 'portrait', 'smile', 'you', 'guy', 'girl', 'boy', 'man', 'woman'] },
  hand: { draw: thumbsUp, noun: 'hand', keys: ['hand', 'thumb', 'thumbs', 'fist', 'wave', 'gesture', 'palm', 'finger', 'ok', 'peace'] },
  desk: { draw: desk, noun: 'desk', keys: ['desk', 'empty', 'room', 'nothing', 'table', 'office', 'workspace', 'background', 'wall', 'chair', 'none'] },
  mug: { draw: mug, noun: 'mug', keys: ['mug', 'cup', 'coffee', 'tea', 'espresso', 'latte', 'drink'] },
  book: { draw: book, noun: 'book', keys: ['book', 'novel', 'read', 'paper', 'notebook', 'journal', 'magazine'] },
  phone: { draw: phone, noun: 'phone', keys: ['phone', 'mobile', 'iphone', 'android', 'cell', 'device', 'screen', 'tablet'] },
  plant: { draw: plant, noun: 'plant', keys: ['plant', 'tree', 'leaf', 'flower', 'fern', 'succulent', 'cactus', 'green', 'garden'] },
  food: { draw: food, noun: 'food', keys: ['food', 'noodle', 'ramen', 'bowl', 'lunch', 'dinner', 'snack', 'pasta', 'soup', 'meal', 'eat'] },
  box: { draw: boxObj, noun: 'box', keys: ['box', 'package', 'parcel', 'object', 'thing', 'crate', 'carton', 'cube'] },
  lamp: { draw: lamp, noun: 'lamp', keys: ['lamp', 'light', 'bulb', 'lantern', 'torch', 'bright', 'glow'] },
  car: { draw: car, noun: 'car', keys: ['car', 'auto', 'vehicle', 'truck', 'van', 'bus', 'drive'] },
  bottle: { draw: bottle, noun: 'bottle', keys: ['bottle', 'water', 'flask', 'jar', 'can', 'soda', 'juice'] },
  mystery: { draw: mystery, noun: 'mystery object', keys: ['mystery', 'unknown', 'other', '?'] },
};

function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Fuzzy-match a user class name to a motif key. */
export function matchMotif(label) {
  const raw = String(label || '').toLowerCase().trim();
  if (!raw) return 'mystery';
  const words = raw.split(/[^a-z0-9]+/).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const [key, motif] of Object.entries(MOTIFS)) {
    for (const k of motif.keys) {
      let score = 0;
      if (raw === k) score = 100;
      else if (words.includes(k)) score = 90;
      else if (raw.includes(k) && k.length >= 3) score = 70 + k.length;
      else {
        for (const w of words) {
          if (w.length < 3) continue;
          const d = editDistance(w, k);
          const sim = 1 - d / Math.max(w.length, k.length);
          if (sim > 0.72) score = Math.max(score, 40 + sim * 30);
          if (k.startsWith(w) || w.startsWith(k)) score = Math.max(score, 45 + Math.min(w.length, k.length) * 2);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = key;
      }
    }
  }
  return bestScore >= 45 ? best : 'mystery';
}

export function motifNoun(label) {
  return MOTIFS[matchMotif(label)].noun;
}

export function drawMotif(key, rng, box, opts = {}) {
  const motif = MOTIFS[key] || MOTIFS.mystery;
  const prims = motif.draw(rng, box, opts);
  if (opts.ghost) {
    return prims.map((pr) => ({ ...pr, opacity: (pr.opacity ?? 1) * (opts.ghostOpacity ?? 0.24) }));
  }
  return prims;
}
