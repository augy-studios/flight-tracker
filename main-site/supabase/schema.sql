-- uwuFlights Supabase schema
-- Run this in the Supabase SQL editor for your project.
--
-- Access model: the app's serverless functions (api/favourites.js) talk to
-- Supabase's REST API using the service role key (SUPABASE_SERVICE_KEY),
-- which is kept server-side only and bypasses Row Level Security. There is
-- no Supabase Auth involved: each browser generates its own random
-- device_id (stored in localStorage), and every query is scoped to that
-- device_id in application code, not by an auth.uid() policy.
--
-- Row Level Security is still enabled below with no policies, purely as a
-- defence-in-depth measure: if a public/anon key were ever mistakenly
-- exposed to the client, it would be denied access outright rather than
-- falling back to some default-allow behaviour.
--
-- Note: this Supabase project also has uwu_users / uwu_sessions tables
-- (shared login system used by other Augy Studios apps). uwuFlights
-- deliberately does not use them; it has no login, by design, and
-- uwuflights_favourites.device_id is intentionally independent of
-- uwu_users.id.

create table if not exists public.uwuflights_favourites (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  kind text not null check (kind in ('flight', 'aircraft')),
  value text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (device_id, kind, value)
);

alter table public.uwuflights_favourites enable row level security;

create index if not exists uwuflights_favourites_device_kind_idx on public.uwuflights_favourites (device_id, kind);
