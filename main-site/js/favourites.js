// Favourites: flights (by callsign) and aircraft (by ICAO type code).
//
// There is no Supabase Auth here. Each browser has its own randomly
// generated device_id (persisted in localStorage) which is sent to
// /api/favourites; the serverless function is the only thing that holds
// the Supabase service key, and scopes every query to that device_id.
// If /api/favourites reports Supabase isn't configured (or is
// unreachable), favourites fall back to localStorage only, so the app
// still fully works without a Supabase project attached.

const DEVICE_ID_KEY = "uwuflights.deviceId";
const LOCAL_KEY = "uwuflights.favourites";
let backend = "local";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) {
    throw new Error((body && body.error) || `Request failed (${res.status})`);
  }
  return body;
}

export async function initFavourites() {
  try {
    const deviceId = getDeviceId();
    const body = await fetchJson(`/api/favourites?deviceId=${deviceId}&kind=flight`);
    backend = body.configured ? "remote" : "local";
  } catch (err) {
    console.warn("Favourites backend unavailable, using local storage instead:", err.message);
    backend = "local";
  }
  return { backend };
}

export function getBackend() {
  return backend;
}

export async function listFavourites(kind) {
  if (backend === "remote") {
    try {
      const body = await fetchJson(`/api/favourites?deviceId=${getDeviceId()}&kind=${kind}`);
      return body.favourites.map((f) => ({ ...f, value: f.value, label: f.label }));
    } catch (err) {
      console.warn(err.message);
      return [];
    }
  }
  return readLocal().filter((f) => f.kind === kind);
}

export async function addFavourite(kind, value, label) {
  if (backend === "remote") {
    try {
      const body = await fetchJson("/api/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId(), kind, value, label }),
      });
      return body.favourite;
    } catch (err) {
      console.warn(err.message);
      return null;
    }
  }
  const list = readLocal();
  if (list.some((f) => f.kind === kind && f.value === value)) return null;
  const entry = { id: crypto.randomUUID(), kind, value, label, created_at: new Date().toISOString() };
  list.unshift(entry);
  writeLocal(list);
  return entry;
}

export async function removeFavourite(id) {
  if (backend === "remote") {
    try {
      await fetchJson(`/api/favourites?deviceId=${getDeviceId()}&id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.warn(err.message);
    }
    return;
  }
  writeLocal(readLocal().filter((f) => f.id !== id));
}

export async function isFavourited(kind, value) {
  const list = await listFavourites(kind);
  return list.some((f) => f.value === value);
}
