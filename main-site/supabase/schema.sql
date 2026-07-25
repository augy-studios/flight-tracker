-- uwuFlights Supabase schema
-- Run this in the Supabase SQL editor for your project.
--
-- Auth: this app uses Supabase Anonymous Sign-ins (Auth > Providers >
-- Anonymous Sign-ins > Enable) so favourites persist per-device without
-- requiring the user to create an account. Each anonymous session gets a
-- stable auth.uid() that Row Level Security ties favourites to.

create table if not exists public.uwuflights_favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('flight', 'aircraft')),
  value text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, value)
);

alter table public.uwuflights_favourites enable row level security;

create policy "Users can read their own favourites"
  on public.uwuflights_favourites for select
  using (auth.uid() = user_id);

create policy "Users can insert their own favourites"
  on public.uwuflights_favourites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own favourites"
  on public.uwuflights_favourites for delete
  using (auth.uid() = user_id);

create index if not exists uwuflights_favourites_user_kind_idx on public.uwuflights_favourites (user_id, kind);
