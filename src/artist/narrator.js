/**
 * narrator.js — the recurring character.
 *
 * A noodle-limbed ink person in a beret who holds a dip pen and reacts to
 * whatever the classifier just decided. He is drawn with the same nib helpers
 * as everything else so he never looks pasted in.
 */

import { P, stroke, loop, ellipsePoly, hatch, ellipse, smooth, pathData, INK } from './ink.js';

export const POSES = ['pointing', 'shrugging', 'startled', 'delighted', 'scratching', 'asleep', 'saluting'];

const C = (rng, w = 2.4) => ({ width: w, rng, wob: 1.05, taperIn: 0.22, taperOut: 0.32, step: 4 });
const F = (rng, w = 1.4) => ({ width: w, rng, wob: 0.65, taperIn: 0.3, taperOut: 0.45, step: 3.2 });

/**
 * @param rng seeded prng
 * @param box { x, y, w, h } — the character fills this box
 * @param pose one of POSES
 * @param flip draw facing left instead of right
 */
export function drawNarrator(rng, box, pose = 'pointing', flip = false) {
  const s = flip ? -1 : 1;
  const p = (ux, uy) => P(box.x + (flip ? 1 - ux : ux) * box.w, box.y + uy * box.h);
  const out = [];

  const asleep = pose === 'asleep';
  const headY = asleep ? 0.32 : 0.2;
  const headX = asleep ? 0.44 : 0.5;
  const hr = 0.165;

  // ---- body: a single wobbling noodle from neck to hem
  const spineTilt = asleep ? 0.16 : pose === 'startled' ? -0.05 : 0.02;
  const body = [
    p(headX, headY + hr * 1.05),
    p(headX + spineTilt * 0.6, 0.56),
    p(headX + spineTilt, 0.8),
  ];
  out.push(...stroke(body, C(rng, 2.8)));
  // coat: two flares from the neck
  const hem = asleep ? 0.82 : 0.76;
  const coatL = [p(headX - 0.05, headY + hr * 1.05), p(headX - 0.14, 0.52), p(headX - 0.18, hem)];
  const coatR = [p(headX + 0.09, headY + hr * 1.05), p(headX + 0.17, 0.52), p(headX + 0.2, hem)];
  out.push(...stroke(coatL, C(rng, 2.5)));
  out.push(...stroke(coatR, C(rng, 2.5)));
  out.push(...stroke([p(headX - 0.18, hem), p(headX + 0.01, hem + 0.035), p(headX + 0.2, hem)], C(rng, 2.4)));
  const coatPoly = smooth([...coatL, p(headX - 0.18, hem), p(headX + 0.01, hem + 0.035), p(headX + 0.2, hem), ...coatR.slice().reverse()], 2, true);
  out.push(...hatch(coatPoly, { value: 0.26, rng, angle: -1.12, spacing: 7.2, width: 0.8, opacity: 0.85 }));
  out.push(...hatch(smooth([p(headX + 0.05, 0.44), p(headX + 0.18, 0.56), p(headX + 0.2, hem), p(headX + 0.07, hem + 0.02)], 2, true), { value: 0.5, rng, angle: -1.12, spacing: 4.6, width: 0.85 }));
  // lapel + a couple of buttons
  out.push(...stroke([p(headX - 0.03, headY + hr * 1.06), p(headX + 0.02, 0.5)], F(rng, 1.5)));
  for (let i = 0; i < 2; i++) out.push(...loop(ellipsePoly(box.x + (flip ? 1 - (headX + 0.035) : headX + 0.035) * box.w, box.y + (0.5 + i * 0.09) * box.h, box.w * 0.012, box.h * 0.013, 10), F(rng, 1.2)));
  if (!asleep) {
    // legs + shoes
    for (const lx of [-0.07, 0.07]) {
      out.push(...stroke([p(headX + lx, hem + 0.01), p(headX + lx * 1.5, 0.93)], C(rng, 2.3)));
      out.push(...stroke([p(headX + lx * 1.5 - 0.035, 0.945), p(headX + lx * 1.5 + 0.045, 0.94)], C(rng, 2.6)));
    }
  }

  // ---- head
  const hx = box.x + (flip ? 1 - headX : headX) * box.w;
  const hy = box.y + headY * box.h;
  const head = ellipsePoly(hx, hy, box.w * hr * 0.92, box.h * hr, 28, (rng() - 0.5) * 0.16);
  out.push(...loop(head, C(rng, 2.5)));
  out.push(...hatch(smooth([p(headX + 0.06, headY - 0.1), p(headX + 0.15, headY), p(headX + 0.1, headY + 0.12), p(headX + 0.03, headY + 0.13)], 2, true), { value: 0.22, rng, angle: -1.2, spacing: 8, width: 0.65, opacity: 0.75 }));

  // ---- beret: squashed ellipse tipped to one side + little stalk
  const bx = headX - 0.035 * s;
  const by = headY - hr * 0.82;
  const beret = ellipsePoly(box.x + (flip ? 1 - bx : bx) * box.w, box.y + by * box.h, box.w * 0.185, box.h * 0.075, 26, -0.22 * s);
  out.push(...loop(beret, C(rng, 2.5)));
  out.push(...hatch(beret, { value: 0.72, rng, angle: -0.4, spacing: 3.8, width: 0.95 }));
  out.push(...stroke([p(bx + 0.03 * s, by - 0.07), p(bx + 0.045 * s, by - 0.1)], F(rng, 2)));
  out.push(...stroke([p(headX - 0.14, headY - 0.03), p(headX - 0.17, headY + 0.02)], F(rng, 1.5)));

  // ---- face
  const eye = (ex, ey, kind) => {
    if (kind === 'dot') {
      out.push({ d: pathData(ellipsePoly(box.x + (flip ? 1 - ex : ex) * box.w, box.y + ey * box.h, box.w * 0.014, box.h * 0.017, 12), true), fill: INK, opacity: 0.95 });
    } else if (kind === 'wide') {
      out.push(...loop(ellipsePoly(box.x + (flip ? 1 - ex : ex) * box.w, box.y + ey * box.h, box.w * 0.032, box.h * 0.036, 16), F(rng, 1.6)));
      out.push({ d: pathData(ellipsePoly(box.x + (flip ? 1 - ex : ex) * box.w, box.y + ey * box.h, box.w * 0.013, box.h * 0.015, 10), true), fill: INK });
    } else if (kind === 'happy') {
      out.push(...stroke([p(ex - 0.03, ey + 0.012), p(ex, ey - 0.022), p(ex + 0.03, ey + 0.012)], F(rng, 1.8)));
    } else if (kind === 'closed') {
      out.push(...stroke([p(ex - 0.032, ey - 0.008), p(ex, ey + 0.014), p(ex + 0.032, ey - 0.008)], F(rng, 1.8)));
    }
  };
  const eyeKind = asleep ? 'closed' : pose === 'startled' ? 'wide' : pose === 'delighted' ? 'happy' : 'dot';
  eye(headX - 0.055, headY + 0.005, eyeKind);
  eye(headX + 0.055, headY + 0.005, eyeKind);
  // brows
  if (pose === 'scratching' || pose === 'shrugging') {
    out.push(...stroke([p(headX - 0.085, headY - 0.05), p(headX - 0.025, headY - 0.035)], F(rng, 1.5)));
    out.push(...stroke([p(headX + 0.03, headY - 0.032), p(headX + 0.09, headY - 0.055)], F(rng, 1.5)));
  }
  // mouth
  if (asleep) {
    out.push(...loop(ellipsePoly(hx, box.y + (headY + 0.06) * box.h, box.w * 0.022, box.h * 0.028, 14), F(rng, 1.5)));
  } else if (pose === 'startled') {
    out.push(...loop(ellipsePoly(hx, box.y + (headY + 0.065) * box.h, box.w * 0.03, box.h * 0.038, 16), F(rng, 1.8)));
  } else if (pose === 'delighted') {
    out.push(...stroke([p(headX - 0.055, headY + 0.045), p(headX, headY + 0.085), p(headX + 0.055, headY + 0.045)], F(rng, 2)));
    out.push(...stroke([p(headX - 0.055, headY + 0.045), p(headX + 0.055, headY + 0.045)], F(rng, 1.4)));
  } else if (pose === 'shrugging' || pose === 'scratching') {
    out.push(...stroke([p(headX - 0.045, headY + 0.07), p(headX + 0.01, headY + 0.055), p(headX + 0.045, headY + 0.075)], F(rng, 1.7)));
  } else {
    out.push(...stroke([p(headX - 0.04, headY + 0.06), p(headX + 0.045, headY + 0.062)], F(rng, 1.7)));
  }
  // moustache-ish nose
  out.push(...stroke([p(headX + 0.005, headY + 0.01), p(headX + 0.03, headY + 0.042), p(headX - 0.005, headY + 0.045)], F(rng, 1.4)));

  // ---- arms (pose specific). Each arm returns its hand point.
  const arm = (from, mid, to, w = 2.3) => {
    out.push(...stroke([p(from[0], from[1]), p(mid[0], mid[1]), p(to[0], to[1])], C(rng, w)));
    return p(to[0], to[1]);
  };
  const drawPen = (hand, ang) => {
    const L = box.w * 0.16;
    const tip = P(hand.x + Math.cos(ang) * L * s, hand.y + Math.sin(ang) * L);
    out.push(...stroke([hand, tip], { ...C(rng, 2.6), taperOut: 0.5 }));
    out.push(...stroke([tip, P(tip.x + Math.cos(ang) * 7 * s, tip.y + Math.sin(ang) * 7)], { ...F(rng, 2.2), taperOut: 0.95 }));
  };
  const hand = (pt, r = 0.034) => out.push(...loop(ellipsePoly(pt.x, pt.y, box.w * r, box.h * r * 1.05, 12), F(rng, 1.8)));

  let penHand = null;
  switch (pose) {
    case 'pointing': {
      const h1 = arm([headX + 0.06, 0.44], [headX + 0.24, 0.4], [headX + 0.42, 0.3]);
      hand(h1, 0.026);
      out.push(...stroke([h1, P(h1.x + box.w * 0.09 * s, h1.y - box.h * 0.03)], { ...F(rng, 2), taperOut: 0.8 }));
      penHand = arm([headX - 0.05, 0.45], [headX - 0.2, 0.56], [headX - 0.14, 0.7]);
      hand(penHand);
      drawPen(penHand, 1.1);
      break;
    }
    case 'shrugging': {
      const h1 = arm([headX + 0.06, 0.44], [headX + 0.26, 0.46], [headX + 0.3, 0.3]);
      const h2 = arm([headX - 0.05, 0.45], [headX - 0.25, 0.47], [headX - 0.29, 0.31]);
      hand(h1);
      hand(h2);
      // shrug ticks over the shoulders
      for (let i = 0; i < 3; i++) {
        out.push(...stroke([p(headX + 0.2 + i * 0.03, 0.2 - i * 0.02), p(headX + 0.26 + i * 0.03, 0.13 - i * 0.02)], { ...F(rng, 1.4), taperOut: 0.9 }));
      }
      break;
    }
    case 'startled': {
      const h1 = arm([headX + 0.06, 0.42], [headX + 0.28, 0.32], [headX + 0.3, 0.08]);
      const h2 = arm([headX - 0.05, 0.43], [headX - 0.27, 0.33], [headX - 0.3, 0.1]);
      hand(h1);
      hand(h2);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.45;
        out.push(...stroke([p(headX + Math.cos(a) * 0.2, headY + Math.sin(a) * 0.24), p(headX + Math.cos(a) * 0.3, headY + Math.sin(a) * 0.36)], { ...F(rng, 1.6), taperOut: 0.9 }));
      }
      break;
    }
    case 'delighted': {
      const h1 = arm([headX + 0.06, 0.43], [headX + 0.26, 0.28], [headX + 0.22, 0.1]);
      hand(h1);
      penHand = arm([headX - 0.05, 0.44], [headX - 0.24, 0.3], [headX - 0.2, 0.12]);
      hand(penHand);
      drawPen(penHand, -1.25);
      break;
    }
    case 'scratching': {
      const h1 = arm([headX + 0.06, 0.43], [headX + 0.2, 0.28], [headX + 0.11, headY - 0.09]);
      hand(h1, 0.026);
      // scratch marks
      for (let i = 0; i < 3; i++) out.push(...stroke([p(headX + 0.13 + i * 0.02, headY - 0.16), p(headX + 0.19 + i * 0.02, headY - 0.22)], { ...F(rng, 1.3), taperOut: 0.9 }));
      penHand = arm([headX - 0.05, 0.45], [headX - 0.22, 0.58], [headX - 0.16, 0.72]);
      hand(penHand);
      drawPen(penHand, 1.15);
      break;
    }
    case 'saluting': {
      const h1 = arm([headX + 0.06, 0.43], [headX + 0.22, 0.32], [headX + 0.1, headY - 0.06]);
      hand(h1, 0.025);
      penHand = arm([headX - 0.05, 0.45], [headX - 0.2, 0.58], [headX - 0.15, 0.72]);
      hand(penHand);
      drawPen(penHand, 1.1);
      break;
    }
    case 'asleep':
    default: {
      // slumped over an implied desk, pen still in hand
      const h1 = arm([headX + 0.06, 0.46], [headX + 0.26, 0.56], [headX + 0.36, 0.62]);
      hand(h1);
      penHand = arm([headX - 0.06, 0.47], [headX - 0.2, 0.6], [headX - 0.06, 0.66]);
      hand(penHand);
      drawPen(penHand, 0.2);
      // zzz
      const zz = (zx, zy, sz) => {
        out.push(...stroke([p(zx, zy), p(zx + sz, zy), p(zx, zy + sz * 1.1), p(zx + sz, zy + sz * 1.1)], F(rng, 1.7)));
      };
      zz(headX + 0.24, headY - 0.16, 0.06);
      zz(headX + 0.36, headY - 0.3, 0.08);
      break;
    }
  }
  return out;
}

/** Choose a pose from the classifier's mood. */
export function pickPose(rng, { confidence, changed, confused, first }) {
  if (confused) return 'scratching';
  if (confidence >= 0.93 && changed) return rng() < 0.5 ? 'delighted' : 'saluting';
  if (confidence >= 0.8) return first ? 'startled' : rng() < 0.65 ? 'pointing' : 'delighted';
  if (confidence >= 0.6) return rng() < 0.5 ? 'pointing' : 'shrugging';
  return 'shrugging';
}
