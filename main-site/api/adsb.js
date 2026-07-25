// Vercel serverless function: proxies adsb.lol's "aircraft near a point"
// endpoint. Worldwide coverage - lat/lon/dist are user-supplied.
//
// Production safeguards:
//  - input validation & clamping (bad/missing coords, oversized radius)
//  - upstream timeout via AbortController
//  - defensive parsing (upstream schema drift shouldn't crash the response)
//  - micro-cache + Cache-Control so repeat/near-identical requests are
//    served from cache instead of hammering the upstream API
//  - normalised output shape shared with /api/opensky so the client
//    doesn't need to care which source answered

import { cacheGet, cacheSet } from "./_cache.js";

const CACHE_TTL_MS = 12000;
const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_DIST_NM = 250; // adsb.lol hard limit

function round(n, dp) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function normaliseAircraft(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => {
      const lat = a.lat ?? a.latitude;
      const lon = a.lon ?? a.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") return null;
      return {
        id: a.hex || a.icao || `${lat},${lon}`,
        callsign: (a.flight || "").trim() || null,
        registration: a.r || a.registration || null,
        type: a.t || a.type || null,
        lat,
        lon,
        altitude: typeof a.alt_baro === "number" ? a.alt_baro * 0.3048 : (a.alt_geom ? a.alt_geom * 0.3048 : null),
        speedKt: typeof a.gs === "number" ? a.gs : null,
        heading: typeof a.track === "number" ? a.track : null,
        squawk: a.squawk || null,
        source: "adsb.lol",
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const distKm = parseFloat(req.query.dist) || 50;

  if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.status(400).json({ success: false, error: "Invalid lat/lon." });
    return;
  }

  const distNm = Math.min(Math.max(distKm / 1.852, 1), MAX_DIST_NM);
  const key = `adsb:${round(lat, 2)}:${round(lon, 2)}:${Math.round(distNm)}`;

  const cached = cacheGet(key, CACHE_TTL_MS);
  if (cached) {
    res.setHeader("Cache-Control", "s-maxage=12, stale-while-revalidate=60");
    res.status(200).json({ ...cached, cached: true });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${distNm}`;
    const upstream = await fetch(url, { signal: controller.signal });

    if (!upstream.ok) {
      res.status(502).json({ success: false, error: `adsb.lol returned ${upstream.status}.` });
      return;
    }

    const body = await upstream.json().catch(() => null);
    const aircraft = normaliseAircraft(body?.ac);

    const payload = {
      success: true,
      source: "adsb.lol",
      fetchedAt: new Date().toISOString(),
      count: aircraft.length,
      aircraft,
    };

    cacheSet(key, payload);
    res.setHeader("Cache-Control", "s-maxage=12, stale-while-revalidate=60");
    res.status(200).json(payload);
  } catch (err) {
    const message = err.name === "AbortError" ? "adsb.lol timed out." : err.message;
    res.status(504).json({ success: false, error: message });
  } finally {
    clearTimeout(timer);
  }
}
