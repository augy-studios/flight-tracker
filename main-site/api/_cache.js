// Tiny in-memory micro-cache shared by the aircraft proxy functions.
// This only helps within a single warm serverless instance; the real
// rate-limit protection comes from the Cache-Control headers each
// function sets, which let Vercel's edge network dedupe requests for
// the same rounded coordinates across ALL users.

const store = new Map();
const MAX_ENTRIES = 200;

export function cacheGet(key, ttlMs) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value) {
  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    store.delete(oldestKey);
  }
  store.set(key, { at: Date.now(), value });
}
