// Client for the /api serverless proxies.
// Handles: short-lived in-memory cache, a persisted "last known good"
// result so the app is fully usable offline, upstream fallback
// (adsb.lol -> OpenSky), and defensive parsing of whatever schema comes
// back. The service worker (sw.js) also caches successful /api responses
// so a repeat request near the same spot can be served with no network
// at all, straight from the Cache Storage.

const CLIENT_CACHE_TTL_MS = 12000;
const LAST_KNOWN_KEY = "uwuflights.lastKnownAircraft";
const cache = new Map();

function round(n) {
  return Math.round(n * 100) / 100;
}

function cacheKey(lat, lon, distKm) {
  return `${round(lat)}:${round(lon)}:${Math.round(distKm)}`;
}

function saveLastKnown(lat, lon, data) {
  try {
    localStorage.setItem(LAST_KNOWN_KEY, JSON.stringify({ lat, lon, data, savedAt: Date.now() }));
  } catch {
    // localStorage can be unavailable (private browsing quota etc); non-fatal.
  }
}

function loadLastKnown() {
  try {
    const raw = localStorage.getItem(LAST_KNOWN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ageLabel(savedAt) {
  const minutes = Math.round((Date.now() - savedAt) / 60000);
  if (minutes < 1) return "moments ago";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

async function fetchJson(url, { timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) {
      throw new Error((body && body.error) || `Request failed (${res.status})`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch nearby aircraft. Returns a normalised shape:
 * { success, source, fetchedAt, aircraft: [...], stale, offline, error }
 *
 * Always attempts the network request even when navigator.onLine is false,
 * since the service worker can still answer from its own cache (and
 * navigator.onLine is an unreliable signal on some networks). Only falls
 * back to the last known good result, persisted in localStorage, once the
 * request has actually failed.
 */
export async function fetchNearbyAircraft(lat, lon, distKm = 50) {
  const roundedLat = round(lat);
  const roundedLon = round(lon);
  const key = cacheKey(lat, lon, distKm);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CLIENT_CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const params = `lat=${encodeURIComponent(roundedLat)}&lon=${encodeURIComponent(roundedLon)}&dist=${encodeURIComponent(distKm)}`;

  try {
    const data = await fetchJson(`/api/adsb?${params}`);
    cache.set(key, { at: Date.now(), data });
    saveLastKnown(roundedLat, roundedLon, data);
    return data;
  } catch (primaryErr) {
    try {
      const data = await fetchJson(`/api/opensky?${params}`);
      data.fallbackReason = primaryErr.message;
      cache.set(key, { at: Date.now(), data });
      saveLastKnown(roundedLat, roundedLon, data);
      return data;
    } catch (secondaryErr) {
      if (cached) {
        return { ...cached.data, stale: true, error: secondaryErr.message };
      }
      const lastKnown = loadLastKnown();
      if (lastKnown) {
        return {
          ...lastKnown.data,
          stale: true,
          offline: !navigator.onLine,
          error: `${navigator.onLine ? "Data sources unavailable" : "You're offline"}, showing aircraft near (${lastKnown.lat}, ${lastKnown.lon}) from ${ageLabel(lastKnown.savedAt)}.`,
        };
      }
      return {
        success: false,
        aircraft: [],
        offline: !navigator.onLine,
        error: navigator.onLine
          ? `Both data sources are unavailable right now (${secondaryErr.message}).`
          : "You're offline and there's no cached data for this location yet.",
      };
    }
  }
}

export async function fetchPublicConfig() {
  try {
    return await fetchJson("/api/config", { timeoutMs: 6000 });
  } catch {
    return { supabaseUrl: null, supabaseAnonKey: null };
  }
}
