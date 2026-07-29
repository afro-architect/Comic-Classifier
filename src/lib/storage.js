/**
 * storage.js — session persistence.
 *
 * The app runs inside a sandboxed preview iframe where persistent browser
 * storage APIs are unavailable, so everything is kept in an in-memory store
 * for the life of the tab. The async API shape is preserved so callers stay
 * unchanged.
 */

const MEM = new Map();

export async function idbSet(key, value) {
  MEM.set(key, value);
  return true;
}

export async function idbGet(key) {
  return MEM.has(key) ? MEM.get(key) : null;
}

export async function idbDel(key) {
  MEM.delete(key);
}

export function lsGet(key, fallback = null) {
  return MEM.has(key) ? MEM.get(key) : fallback;
}

export function lsSet(key, value) {
  MEM.set(key, value);
}

/* ---- session serialisation ---- */

export function serialiseClasses(classes) {
  return classes.map((c) => ({
    id: c.id,
    name: c.name,
    samples: c.samples.map((s) => ({ id: s.id, thumb: s.thumb, emb: Array.from(s.emb) })),
  }));
}

export function deserialiseClasses(raw) {
  if (!Array.isArray(raw)) return null;
  return raw.map((c) => ({
    id: c.id,
    name: c.name,
    samples: (c.samples || []).map((s) => ({ id: s.id, thumb: s.thumb, emb: Float32Array.from(s.emb) })),
  }));
}
