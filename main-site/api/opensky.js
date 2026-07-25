// Vercel serverless function: proxies OpenSky Network's public /states/all
// endpoint (worldwide). Used as a fallback when adsb.lol is unavailable,
// since OpenSky's anonymous rate limit is fairly tight.
//
// Same safeguards as /api/adsb.js: validation, timeout, defensive parsing,
// micro-cache + Cache-Control for CDN-level rate-limit protection.

import { cacheGet, cacheSet } from "./_cache.js";

const CACHE_TTL_MS = 20000;
const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_DIST_KM = 300;

function round(n, dp) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// OpenSky state vector is a fixed-order array - see
// https://openskynetwork.github.io/opensky-api/rest.html#response
function normaliseAircraft(states) {
  if (!Array.isArray(states)) return [];
  return states
    .map((s) => {
      const [icao24, callsign, , , , lon, lat, , onGround, velocity, trueTrack, , , geoAlt, squawk] = s;
      if (typeof lat !== "number" || typeof lon !== "number" || onGround) return null;
      return {
        id: icao24,
        callsign: (callsign || "").trim() || null,
        registration: null,
        type: null,
        lat,
        lon,
        altitude: typeof geoAlt === "number" ? geoAlt : null,
        speedKt: typeof velocity === "number" ? velocity * 1.94384 : null,
        heading: typeof trueTrack === "number" ? trueTrack : null,
        squawk: squawk || null,
        source: "OpenSky",
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const distKm = Math.min(parseFloat(req.query.dist) || 50, MAX_DIST_KM);

  if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.status(400).json({ success: false, error: "Invalid lat/lon." });
    return;
  }

  const dLat = distKm / 111;
  const dLon = distKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.15));
  const lamin = Math.max(lat - dLat, -90);
  const lamax = Math.min(lat + dLat, 90);
  const lomin = Math.max(lon - dLon, -180);
  const lomax = Math.min(lon + dLon, 180);

  const key = `opensky:${round(lamin, 2)}:${round(lomin, 2)}:${round(lamax, 2)}:${round(lomax, 2)}`;
  const cached = cacheGet(key, CACHE_TTL_MS);
  if (cached) {
    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=90");
    res.status(200).json({ ...cached, cached: true });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    const upstream = await fetch(url, { signal: controller.signal });

    if (upstream.status === 429) {
      res.status(429).json({ success: false, error: "OpenSky rate limit reached, try again shortly." });
      return;
    }
    if (!upstream.ok) {
      res.status(502).json({ success: false, error: `OpenSky returned ${upstream.status}.` });
      return;
    }

    const body = await upstream.json().catch(() => null);
    const aircraft = normaliseAircraft(body?.states);

    const payload = {
      success: true,
      source: "OpenSky",
      fetchedAt: new Date().toISOString(),
      count: aircraft.length,
      aircraft,
    };

    cacheSet(key, payload);
    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=90");
    res.status(200).json(payload);
  } catch (err) {
    const message = err.name === "AbortError" ? "OpenSky timed out." : err.message;
    res.status(504).json({ success: false, error: message });
  } finally {
    clearTimeout(timer);
  }
}
