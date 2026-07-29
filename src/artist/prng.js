// Deterministic pseudo-randomness for the artist agent.
// Every panel is reproducible from (classLabel, panelIndex).

export function mulberry32(a) {
  let t = a >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Convenience wrapper with the helpers the ink code keeps reaching for. */
export function makeRng(seed) {
  const r = typeof seed === 'number' ? mulberry32(seed) : mulberry32(hashString(seed));
  const rng = () => r();
  rng.range = (a, b) => a + (b - a) * r();
  rng.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  rng.pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
  rng.sign = () => (r() < 0.5 ? -1 : 1);
  // Bell-ish distribution, mean 0, roughly [-1,1]
  rng.gauss = () => (r() + r() + r() - 1.5) / 1.5;
  rng.chance = (p) => r() < p;
  return rng;
}

/**
 * 1-D value noise — smooth, low frequency wobble for pen tremor.
 * Returns f(t) in [-1, 1].
 */
export function makeNoise1D(rng, octaves = 2) {
  const tables = [];
  for (let o = 0; o < octaves; o++) {
    const n = 16;
    const t = new Array(n);
    for (let i = 0; i < n; i++) t[i] = rng() * 2 - 1;
    tables.push(t);
  }
  return (x) => {
    let sum = 0;
    let amp = 1;
    let total = 0;
    for (let o = 0; o < tables.length; o++) {
      const t = tables[o];
      const n = t.length;
      const p = x * (o + 1) * 1.7;
      const i = Math.floor(p);
      const f = p - i;
      const a = t[((i % n) + n) % n];
      const b = t[(((i + 1) % n) + n) % n];
      const s = f * f * (3 - 2 * f);
      sum += (a + (b - a) * s) * amp;
      total += amp;
      amp *= 0.5;
    }
    return sum / total;
  };
}
