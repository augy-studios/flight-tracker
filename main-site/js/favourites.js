// Favourites: flights (by callsign) and aircraft (by ICAO type code).
// Uses Supabase (anonymous auth + RLS) when configured via /api/config,
// otherwise falls back to localStorage so the app still fully works
// without a Supabase project attached.

import { fetchPublicConfig } from "./api.js";

const LOCAL_KEY = "uwuflights.favourites";
let supabase = null;
let userId = null;
let backend = "local";

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

export async function initFavourites() {
  const { supabaseUrl, supabaseAnonKey } = await fetchPublicConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    backend = "local";
    return { backend };
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = createClient(supabaseUrl, supabaseAnonKey);

    let { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      userId = signInData.user.id;
    } else {
      userId = data.session.user.id;
    }
    backend = "supabase";
  } catch (err) {
    console.warn("Supabase unavailable, using local favourites instead:", err.message);
    backend = "local";
  }
  return { backend };
}

export function getBackend() {
  return backend;
}

export async function listFavourites(kind) {
  if (backend === "supabase") {
    const { data, error } = await supabase
      .from("uwuflights_favourites")
      .select("*")
      .eq("kind", kind)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn(error.message);
      return [];
    }
    return data;
  }
  return readLocal().filter((f) => f.kind === kind);
}

export async function addFavourite(kind, value, label) {
  if (backend === "supabase") {
    const { data, error } = await supabase
      .from("uwuflights_favourites")
      .insert({ kind, value, label, user_id: userId })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return null; // already favourited
      throw error;
    }
    return data;
  }
  const list = readLocal();
  if (list.some((f) => f.kind === kind && f.value === value)) return null;
  const entry = { id: crypto.randomUUID(), kind, value, label, created_at: new Date().toISOString() };
  list.unshift(entry);
  writeLocal(list);
  return entry;
}

export async function removeFavourite(id) {
  if (backend === "supabase") {
    const { error } = await supabase.from("uwuflights_favourites").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  writeLocal(readLocal().filter((f) => f.id !== id));
}

export async function isFavourited(kind, value) {
  const list = await listFavourites(kind);
  return list.some((f) => f.value === value);
}
