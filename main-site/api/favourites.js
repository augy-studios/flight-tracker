// Vercel serverless function: the only thing allowed to talk to Supabase.
// Uses SUPABASE_URL + SUPABASE_SERVICE_KEY (service role, full access,
// bypasses Row Level Security) which must never be sent to the client.
// The browser only ever sees its own randomly generated device_id
// (js/favourites.js), and every query here is scoped to that device_id so
// one device can't read or delete another's favourites.
//
// GET    /api/favourites?deviceId=...&kind=flight|aircraft
// POST   /api/favourites          body: { deviceId, kind, value, label }
// DELETE /api/favourites?deviceId=...&id=...

const KINDS = new Set(["flight", "aircraft"]);
const UPSTREAM_TIMEOUT_MS = 8000;

function isValidDeviceId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(id);
}

async function supabaseRest(path, options = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    res.status(200).json({ configured: false, favourites: [] });
    return;
  }

  try {
    if (req.method === "GET") {
      const { deviceId, kind } = req.query;
      if (!isValidDeviceId(deviceId) || !KINDS.has(kind)) {
        res.status(400).json({ error: "Invalid deviceId or kind." });
        return;
      }
      const upstream = await supabaseRest(
        `uwuflights_favourites?device_id=eq.${encodeURIComponent(deviceId)}&kind=eq.${encodeURIComponent(kind)}&order=created_at.desc`
      );
      if (!upstream.ok) {
        res.status(502).json({ error: `Supabase returned ${upstream.status}.` });
        return;
      }
      const rows = await upstream.json().catch(() => []);
      res.status(200).json({ configured: true, favourites: Array.isArray(rows) ? rows : [] });
      return;
    }

    if (req.method === "POST") {
      const { deviceId, kind, value, label } = req.body || {};
      if (!isValidDeviceId(deviceId) || !KINDS.has(kind) || typeof value !== "string" || !value) {
        res.status(400).json({ error: "Invalid favourite payload." });
        return;
      }
      const upstream = await supabaseRest(
        "uwuflights_favourites?on_conflict=device_id,kind,value",
        {
          method: "POST",
          headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
          body: JSON.stringify({ device_id: deviceId, kind, value, label: label || value }),
        }
      );
      if (!upstream.ok) {
        res.status(502).json({ error: `Supabase returned ${upstream.status}.` });
        return;
      }
      const rows = await upstream.json().catch(() => []);
      res.status(200).json({ configured: true, favourite: rows[0] || null });
      return;
    }

    if (req.method === "DELETE") {
      const { deviceId, id } = req.query;
      if (!isValidDeviceId(deviceId) || typeof id !== "string" || !id) {
        res.status(400).json({ error: "Invalid deviceId or id." });
        return;
      }
      const upstream = await supabaseRest(
        `uwuflights_favourites?id=eq.${encodeURIComponent(id)}&device_id=eq.${encodeURIComponent(deviceId)}`,
        { method: "DELETE" }
      );
      if (!upstream.ok) {
        res.status(502).json({ error: `Supabase returned ${upstream.status}.` });
        return;
      }
      res.status(200).json({ configured: true, ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    const message = err.name === "AbortError" ? "Supabase request timed out." : err.message;
    res.status(504).json({ error: message });
  }
}
