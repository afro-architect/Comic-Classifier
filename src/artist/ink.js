/**
 * ink.js — a small pen-and-ink engine.
 *
 * Everything the artist agent draws is a *filled* path: a nib laid on paper has
 * variable width, so constant-width SVG strokes look like clipart. Here each
 * mark is an outline built by walking a jittered spine and offsetting along the
 * normals by a pressure profile.
 *
 * All functions return "prims": { d, fill, opacity } — trivially serialisable so
 * the same panel can be rendered to SVG in the DOM or rasterised for export.
 */

import { makeNoise1D } from './prng.js';

export const INK = '#191713';

/* ------------------------------------------------------------------ */
/* geometry helpers                                                     */
/* ------------------------------------------------------------------ */

export const P = (x, y) => ({ x, y });

export function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function polyLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L;
}

/** Evenly resample a polyline at `step` px. */
export function resample(pts, step = 3) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = dist(a, b);
    if (seg < 1e-6) continue;
    let t = carry;
    while (t + step <= seg) {
      t += step;
      const u = t / seg;
      out.push(P(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u));
    }
    carry = t - seg;
  }
  const last = pts[pts.length - 1];
  if (dist(out[out.length - 1], last) > step * 0.35) out.push(last);
  return out;
}

/** Chaikin corner cutting — turns blocky control points into a flowing line. */
export function smooth(pts, iterations = 2, closed = false) {
  let cur = pts;
  for (let it = 0; it < iterations; it++) {
    const next = [];
    const n = cur.length;
    if (!closed) next.push(cur[0]);
    const end = closed ? n : n - 1;
    for (let i = 0; i < end; i++) {
      const a = cur[i];
      const b = cur[(i + 1) % n];
      next.push(P(a.x * 0.75 + b.x * 0.25, a.y * 0.75 + b.y * 0.25));
      next.push(P(a.x * 0.25 + b.x * 0.75, a.y * 0.25 + b.y * 0.75));
    }
    if (!closed) next.push(cur[n - 1]);
    cur = next;
  }
  return cur;
}

/**
 * Centripetal Catmull-Rom densification. Unlike Chaikin this passes *through*
 * the control points, so a mug stays a mug while the line between corners still
 * flows like a wrist movement.
 */
export function densify(pts, closed = false, samples = 9) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const out = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i % n];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const a = closed ? p0 : i === 0 ? p1 : p0;
    const b = closed ? p3 : i >= n - 2 ? p2 : p3;
    for (let s = 0; s < samples; s++) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        P(
          0.5 * (2 * p1.x + (-a.x + p2.x) * t + (2 * a.x - 5 * p1.x + 4 * p2.x - b.x) * t2 + (-a.x + 3 * p1.x - 3 * p2.x + b.x) * t3),
          0.5 * (2 * p1.y + (-a.y + p2.y) * t + (2 * a.y - 5 * p1.y + 4 * p2.y - b.y) * t2 + (-a.y + 3 * p1.y - 3 * p2.y + b.y) * t3)
        )
      );
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

/**
 * Corner-aware pre-pass: at any vertex where the line turns hard (a box corner,
 * a book spine) inject two nearby anchors so the spline hugs the corner instead
 * of ballooning it into a cylinder. Gentle turns are left to flow.
 */
export function preserveCorners(pts, closed = false, maxCut = 7) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const out = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    if (!closed && (i === 0 || i === n - 1)) {
      out.push(cur);
      continue;
    }
    const v1x = cur.x - prev.x;
    const v1y = cur.y - prev.y;
    const v2x = next.x - cur.x;
    const v2y = next.y - cur.y;
    const l1 = Math.hypot(v1x, v1y) || 1;
    const l2 = Math.hypot(v2x, v2y) || 1;
    const cosT = (v1x * v2x + v1y * v2y) / (l1 * l2);
    if (cosT < 0.72) {
      // turn sharper than ~44° — pin the corner
      const c1 = Math.min(maxCut, l1 * 0.3);
      const c2 = Math.min(maxCut, l2 * 0.3);
      out.push(P(cur.x - (v1x / l1) * c1, cur.y - (v1y / l1) * c1));
      out.push(cur);
      out.push(P(cur.x + (v2x / l2) * c2, cur.y + (v2y / l2) * c2));
    } else {
      out.push(cur);
    }
  }
  return out;
}

/** Compact polyline path data (1 decimal). Dense point sets don't need beziers. */
export function polyPath(pts, closed = true) {
  if (!pts.length) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
  return closed ? d + 'Z' : d;
}

/** Signed area — used to keep every ink ring wound the same way so that
 *  merging many strokes into one <path> never punches accidental holes. */
export function signedArea(pts) {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/** Catmull-Rom → cubic bezier path data. */
export function pathData(pts, closed = false) {
  if (pts.length < 2) return '';
  const p = pts;
  const n = p.length;
  let d = `M${p[0].x.toFixed(2)},${p[0].y.toFixed(2)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    const a = closed || i > 0 ? p0 : p1;
    const b = closed || i < n - 2 ? p3 : p2;
    const c1 = P(p1.x + (p2.x - a.x) / 6, p1.y + (p2.y - a.y) / 6);
    const c2 = P(p2.x - (b.x - p1.x) / 6, p2.y - (b.y - p1.y) / 6);
    d += `C${c1.x.toFixed(2)},${c1.y.toFixed(2)} ${c2.x.toFixed(2)},${c2.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  if (closed) d += 'Z';
  return d;
}

/* ------------------------------------------------------------------ */
/* the nib                                                              */
/* ------------------------------------------------------------------ */

/**
 * Perturb a spine with smooth low-frequency noise so the line "wanders" the way
 * a wrist does, plus a touch of high-frequency tremor.
 */
export function wobble(pts, rng, amp = 1.1, freq = 0.035) {
  const nx = makeNoise1D(rng, 2);
  const ny = makeNoise1D(rng, 2);
  const tremor = makeNoise1D(rng, 1);
  const n = pts.length;
  return pts.map((pt, i) => {
    const t = i * freq * 6;
    const ease = n > 3 ? Math.min(1, (i + 0.6) / 2.2) * Math.min(1, (n - i + 0.6) / 2.2) : 1;
    const k = amp * (0.55 + 0.45 * ease);
    return P(
      pt.x + nx(t) * k + tremor(t * 4.3) * amp * 0.22,
      pt.y + ny(t + 11.3) * k + tremor(t * 4.9 + 7) * amp * 0.22
    );
  });
}

/**
 * Build a filled outline for a stroke.
 * opts: { width, taperIn, taperOut, pressure (0..1 bias), rng, wob, jitter, closed }
 */
export function nib(spine, opts = {}) {
  const {
    width = 2.2,
    taperIn = 0.55,
    taperOut = 0.75,
    rng = Math.random,
    wob = 0.9,
    step = 3.2,
    closed = false,
    opacity = 1,
    fill = INK,
    swell = 0.35, // mid-stroke pressure swell
  } = opts;

  const L = polyLength(spine);
  const adaptiveStep = Math.max(step, L / 90); // keep rings light for the DOM
  let pts = resample(spine, adaptiveStep);
  if (pts.length < 2) return null;
  if (wob > 0) pts = wobble(pts, rng, wob, 0.03);
  if (!closed) pts = smooth(pts, 1, false);

  const n = pts.length;
  const wNoise = makeNoise1D(rng, 2);
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const t = i / (n - 1);
    let profile = 1;
    if (!closed) {
      const inp = taperIn > 0 ? Math.min(1, Math.pow(t / taperIn, 0.62)) : 1;
      const outp = taperOut > 0 ? Math.min(1, Math.pow((1 - t) / taperOut, 0.62)) : 1;
      profile = Math.min(inp, outp);
    }
    const swelling = 1 + swell * Math.sin(Math.PI * t) * 0.9;
    const w = Math.max(0.08, (width * profile * swelling * (1 + 0.18 * wNoise(t * 5))) / 2);
    left.push(P(pts[i].x + -ty * w, pts[i].y + tx * w));
    right.push(P(pts[i].x + ty * w, pts[i].y - tx * w));
  }
  right.reverse();
  const ring = left.concat(right);
  if (signedArea(ring) < 0) ring.reverse();
  return { d: polyPath(ring, true), fill, opacity };
}

/** A stroke drawn with 1–2 overlapping passes, the way a pen retraces a line. */
export function stroke(spineIn, opts = {}) {
  const { passes = 1, rng = Math.random, offset = 0.9, presmooth = true } = opts;
  // Sparse control points make angular lines; ease them first so contours flow.
  const spine = presmooth && spineIn.length > 2 && spineIn.length <= 16 ? densify(preserveCorners(spineIn, false), false, 6) : spineIn;
  const out = [];
  for (let i = 0; i < passes; i++) {
    const dx = i === 0 ? 0 : (rng() - 0.5) * offset * 2;
    const dy = i === 0 ? 0 : (rng() - 0.5) * offset * 2;
    const shifted = i === 0 ? spine : spine.map((p) => P(p.x + dx, p.y + dy));
    const prim = nib(shifted, {
      ...opts,
      width: (opts.width ?? 2.2) * (i === 0 ? 1 : 0.72),
      opacity: (opts.opacity ?? 1) * (i === 0 ? 1 : 0.7),
    });
    if (prim) out.push(prim);
  }
  return out;
}

export function line(a, b, opts = {}) {
  return stroke([a, b], opts);
}

/** Closed jittered loop from a point ring. */
export function loop(pts, opts = {}) {
  const eased = pts.length <= 20 ? densify(preserveCorners(pts, true), true, 6) : pts;
  const ring = eased.concat([eased[0]]);
  const prim = nib(ring, { ...opts, closed: true, presmooth: false });
  return prim ? [prim] : [];
}

export function ellipse(cx, cy, rx, ry, opts = {}) {
  const { segments = 34, rot = 0, squash = 1 } = opts;
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry * squash;
    pts.push(P(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)));
  }
  return loop(pts, opts);
}

export function ellipsePoly(cx, cy, rx, ry, segments = 40, rot = 0) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pts.push(P(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)));
  }
  return pts;
}

export function rectPoly(x, y, w, h) {
  return [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)];
}

/* ------------------------------------------------------------------ */
/* hatching                                                             */
/* ------------------------------------------------------------------ */

function rotatePt(p, ang, cx, cy) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return P(cx + dx * c - dy * s, cy + dx * s + dy * c);
}

/** Scanline/edge intersections of a polygon along horizontal lines. */
function scanSegments(poly, y) {
  const xs = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    if (a.y === b.y) continue;
    const lo = Math.min(a.y, b.y);
    const hi = Math.max(a.y, b.y);
    if (y < lo || y >= hi) continue;
    xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
  }
  xs.sort((p, q) => p - q);
  const segs = [];
  for (let i = 0; i + 1 < xs.length; i += 2) segs.push([xs[i], xs[i + 1]]);
  return segs;
}

export function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    if (yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Fill a polygon region with hatch lines.
 * value 0..1 controls darkness: spacing tightens and extra angle passes kick in.
 */
export function hatch(poly, opts = {}) {
  const {
    value = 0.4,
    rng = Math.random,
    angle = -0.62,
    spacing: spacingOpt,
    width = 0.95,
    opacity = 1,
    jitterEnds = 3.2,
    skip = 0.06,
    maxPasses = 3,
  } = opts;
  if (!poly || poly.length < 3 || value <= 0.02) return [];

  let cx = 0;
  let cy = 0;
  for (const p of poly) {
    cx += p.x;
    cy += p.y;
  }
  cx /= poly.length;
  cy /= poly.length;

  const v = Math.max(0, Math.min(1, value));
  const passes = Math.max(1, Math.min(maxPasses, v > 0.72 ? 3 : v > 0.42 ? 2 : 1));
  const baseSpacing = spacingOpt ?? 8.5 - v * 4.6; // 8.5 → 3.9
  const angles = [angle, angle + 1.15, angle - 0.62];
  const prims = [];

  for (let pass = 0; pass < passes; pass++) {
    const ang = angles[pass] + (rng() - 0.5) * 0.06;
    const rp = poly.map((p) => rotatePt(p, -ang, cx, cy));
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of rp) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const spacing = baseSpacing * (pass === 0 ? 1 : 1.22 + pass * 0.16);
    let y = minY + rng() * spacing;
    let idx = 0;
    while (y < maxY) {
      const segs = scanSegments(rp, y);
      for (const [x0, x1] of segs) {
        if (x1 - x0 < 1.6) continue;
        if (rng() < skip) continue;
        // stroke sometimes overshoots, sometimes falls short of the boundary
        const a = x0 - jitterEnds * 0.35 + rng() * jitterEnds * 0.9;
        const b = x1 + jitterEnds * 0.35 - rng() * jitterEnds * 0.9;
        if (b - a < 1.2) continue;
        const bow = (rng() - 0.5) * Math.min(2.4, (b - a) * 0.05);
        const spine = [
          rotatePt(P(a, y), ang, cx, cy),
          rotatePt(P((a + b) / 2, y + bow), ang, cx, cy),
          rotatePt(P(b, y), ang, cx, cy),
        ];
        const prim = nib(spine, {
          width: width * (0.78 + rng() * 0.5) * (pass === 0 ? 1 : 0.86),
          taperIn: 0.3,
          taperOut: 0.34,
          rng,
          wob: 0.32,
          step: 5,
          swell: 0.2,
          opacity: opacity * (pass === 0 ? 1 : 0.9),
        });
        if (prim) prims.push(prim);
      }
      y += spacing * (0.7 + rng() * 0.62);
      idx++;
      if (idx > 400) break;
    }
  }
  return prims;
}

/** Dot-scatter fill: midtones, sky, paper grain. */
export function stipple(poly, opts = {}) {
  const { density = 0.012, rng = Math.random, rMin = 0.45, rMax = 1.25, opacity = 1, jitter = 1 } = opts;
  if (!poly || poly.length < 3) return [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const area = (maxX - minX) * (maxY - minY);
  const count = Math.min(2600, Math.floor(area * density));
  const out = [];
  for (let i = 0; i < count; i++) {
    const pt = P(minX + rng() * (maxX - minX), minY + rng() * (maxY - minY));
    if (!pointInPolygon(pt, poly)) continue;
    const r = rMin + rng() * (rMax - rMin);
    const ox = (rng() - 0.5) * jitter;
    const oy = (rng() - 0.5) * jitter;
    // slightly elliptical, rotated dots read as ink specks rather than pixels
    const ring = ellipsePoly(pt.x + ox, pt.y + oy, r, r * (0.7 + rng() * 0.6), 6, rng() * 3.14);
    if (signedArea(ring) < 0) ring.reverse();
    out.push({ d: polyPath(ring, true), fill: INK, opacity: opacity * (0.5 + rng() * 0.5) });
  }
  return out;
}

/** Short flick marks — grass, fur, motion, texture. */
export function flicks(poly, opts = {}) {
  const { count = 40, rng = Math.random, len = 9, angle = -1.2, spread = 0.5, width = 1 } = opts;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const out = [];
  let tries = 0;
  while (out.length < count && tries < count * 12) {
    tries++;
    const pt = P(minX + rng() * (maxX - minX), minY + rng() * (maxY - minY));
    if (!pointInPolygon(pt, poly)) continue;
    const a = angle + (rng() - 0.5) * spread;
    const L = len * (0.5 + rng());
    const spine = [pt, P(pt.x + Math.cos(a) * L * 0.5 + (rng() - 0.5) * 2, pt.y + Math.sin(a) * L * 0.5), P(pt.x + Math.cos(a) * L, pt.y + Math.sin(a) * L)];
    const prim = nib(spine, { width: width * (0.7 + rng() * 0.6), taperIn: 0.18, taperOut: 0.85, rng, wob: 0.4, step: 4 });
    if (prim) out.push(prim);
  }
  return out;
}

/** Solid-ish ink fill built from a very tight hatch (keeps the brush texture). */
export function solid(poly, opts = {}) {
  const { rng = Math.random, opacity = 1 } = opts;
  return [
    { d: pathData(smooth(poly, 1, true), true), fill: INK, opacity: opacity * 0.92 },
    ...hatch(poly, { value: 0.6, rng, spacing: 3.2, width: 1.6, opacity, maxPasses: 1 }),
  ];
}

/* ------------------------------------------------------------------ */
/* frames                                                              */
/* ------------------------------------------------------------------ */

/** Hand-drawn irregular rectangle: four strokes with corner overshoot. */
export function handRect(x, y, w, h, opts = {}) {
  const { rng = Math.random, width = 3.1, overshoot = 7, wob = 1.5, passes = 1 } = opts;
  const o = () => (rng() - 0.5) * overshoot;
  const corners = [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)];
  const out = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const ex = (b.x - a.x) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
    const ey = (b.y - a.y) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
    const s = P(a.x - ex * (overshoot * 0.35 + Math.abs(o())) + o() * 0.3, a.y - ey * (overshoot * 0.35 + Math.abs(o())) + o() * 0.3);
    const e = P(b.x + ex * (overshoot * 0.4 + Math.abs(o())) + o() * 0.3, b.y + ey * (overshoot * 0.4 + Math.abs(o())) + o() * 0.3);
    const mid = P((s.x + e.x) / 2 + o() * 0.55, (s.y + e.y) / 2 + o() * 0.55);
    out.push(
      ...stroke([s, mid, e], {
        width: width * (0.85 + rng() * 0.3),
        taperIn: 0.08,
        taperOut: 0.12,
        rng,
        wob,
        passes,
        step: 6,
        swell: 0.18,
      })
    );
  }
  return out;
}

/** Rounded-ish hand-drawn blob rectangle used for caption boxes and bubbles. */
export function handBoxPoly(x, y, w, h, rng, rough = 3) {
  const pts = [];
  const push = (px, py) => pts.push(P(px + (rng() - 0.5) * rough, py + (rng() - 0.5) * rough));
  const stepsX = Math.max(3, Math.round(w / 26));
  const stepsY = Math.max(2, Math.round(h / 26));
  for (let i = 0; i < stepsX; i++) push(x + (w * i) / stepsX, y);
  for (let i = 0; i < stepsY; i++) push(x + w, y + (h * i) / stepsY);
  for (let i = stepsX; i > 0; i--) push(x + (w * i) / stepsX, y + h);
  for (let i = stepsY; i > 0; i--) push(x, y + (h * i) / stepsY);
  return pts;
}

export const PAPER = '#f4f0e6';

/**
 * Collapse a long list of ink marks into a handful of <path> elements by
 * merging *adjacent* prims that share a fill and an opacity bucket. Draw order
 * is preserved (paper-coloured knockouts still cover what they should) and the
 * DOM goes from ~1600 nodes per panel to ~40.
 */
export function mergePrims(prims, bucket = 0.08) {
  const out = [];
  for (const p of prims) {
    if (!p || !p.d) continue;
    const op = Math.max(0.04, Math.round((p.opacity ?? 1) / bucket) * bucket);
    const last = out[out.length - 1];
    if (last && last.fill === p.fill && Math.abs(last.opacity - op) < 1e-6) last.d += p.d;
    else out.push({ d: p.d, fill: p.fill, opacity: op });
  }
  return out;
}
