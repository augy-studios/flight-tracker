# uwuFlights

Point-and-search live aircraft tracking for plane spotters, worldwide.
Static PWA + Vercel serverless functions + optional Supabase backend for
favourites. Deployed at `flights.uwuapps.org`.

## What's in here

```text
index.html          shell markup
style.css            glassmorphism styling, theme tokens (light/dark x 7 brand colours)
script.js             entry point -> imports js/app.js
js/
  app.js              app state, event wiring, tabs, radar rendering
  ui.js               DOM render helpers (cards, modal, toast)
  icons.js            inline SVG icon set (no emoji anywhere)
  theme.js            7 brand-colour swatches + light/dark mode
  geo.js              geolocation + manual location + haversine/bearing math
  compass.js           device-orientation heading (handles iOS permission prompt)
  api.js               client for /api/adsb + /api/opensky with fallback + caching
  favourites.js        Supabase (anonymous auth) favourites, with localStorage fallback
api/
  adsb.js               serverless proxy: adsb.lol (primary aircraft source)
  opensky.js            serverless proxy: OpenSky Network (fallback source)
  config.js             hands the (RLS-safe) Supabase URL/anon key to the client
  _cache.js             shared in-memory micro-cache used by the two proxies
supabase/
  schema.sql            uwuflights_favourites table + RLS policies
manifest.json / sw.js    PWA manifest + service worker (offline shell + fallback)
robots.txt / sitemap.xml / llms.txt    crawler and LLM discovery files
```

## Deploying (Vercel)

1. Import this repo into Vercel, with `main-site` as the project root.
2. No build step is required (static HTML/CSS/JS + serverless functions
   under `/api`), Framework Preset: "Other".
3. Point the `flights.uwuapps.org` domain at the Vercel project.
4. (Optional, for favourites) set these Environment Variables in the
   Vercel project settings:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

   These are read at request time by `api/config.js` and handed to the
   client. The anon key is safe to expose because access is enforced by
   Row Level Security (see `supabase/schema.sql`), not by keeping the key
   secret.

If you skip the Supabase env vars entirely, the app still works; favourites
just fall back to `localStorage` on that device instead of syncing anywhere.

## Setting up Supabase (optional, for cross-device favourites)

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql`.
3. In **Authentication > Providers**, enable **Anonymous Sign-ins**. This is
   what lets the app persist favourites per-device without a login screen.
4. Copy the Project URL and `anon` public API key into the Vercel env vars
   above.

## Do I need to host anything on my Debian 13 VPS?

**No, not for this web app.** Everything here (the static site, the two
`/api` proxies, and Supabase) runs on Vercel/Supabase's infrastructure.
There's nothing in `main-site` that needs your VPS.

The **only** piece that will eventually need the VPS is the planned
Telegram bot in `../telegram-bot`; see that directory's `README.md`. In
short: a bot that polls for aircraft and pushes alerts needs an always-on
process, which is a better fit for your VPS (via `systemd`/`pm2`) than for
Vercel's request-driven serverless functions. That bot hasn't been built
yet; it's a plan.

## Data sources & production safeguards

- **Primary:** [adsb.lol](https://api.adsb.lol/docs), worldwide, queried by
  point + radius.
- **Fallback:** [OpenSky Network](https://openskynetwork.github.io/opensky-api/rest.html),
  also worldwide, queried by bounding box (derived from the same point +
  radius). Used automatically if adsb.lol errors or times out.
- Both proxies (`api/adsb.js`, `api/opensky.js`):
  - validate and clamp input (bad coordinates, oversized radius),
  - time out upstream calls instead of hanging,
  - defensively parse the response so upstream schema drift or empty
    payloads return `{ aircraft: [] }` instead of crashing,
  - set `Cache-Control: s-maxage=...` so Vercel's edge network serves
    repeat/nearby requests from cache instead of re-hitting the upstream
    API for every user; this is the main rate-limit safeguard.
  - keep a small in-memory micro-cache as a second layer within a warm
    instance.
- The client (`js/api.js`) also caches briefly, detects offline mode, and
  falls back to the last good response (marked `stale`) if both sources
  fail.

## Fully offline use

The whole app, including the two aircraft data sources, is designed to keep
working with no network connection, once it's been opened online at least
once:

- **App shell:** `sw.js` precaches every HTML/CSS/JS/icon/manifest file on
  install, and serves them cache-first afterwards. Navigating to the app
  offline falls back to the cached `index.html`.
- **Aircraft data:** `/api/adsb` and `/api/opensky` are served network-first
  by the service worker, but every successful response is also stored in a
  dedicated Cache Storage bucket (`uwuflights-api-v3`), keyed by the exact
  request (rounded latitude/longitude/radius). If the network request fails,
  the service worker replays that cached response instead of failing.
- **Last-known-good fallback:** `js/api.js` separately persists the most
  recent successful aircraft response to `localStorage`. If there's no
  matching service worker cache entry for the current coordinates (for
  example, you moved since the last successful fetch), the app still shows
  that last known result, clearly labelled with how old it is (for example,
  "showing aircraft near (lat, lon) from 5 minutes ago").
- **Favourites:** already work offline by design, since the Supabase client
  falls back to `localStorage` whenever the network (or Supabase itself)
  isn't reachable.

Fonts are loaded from Google Fonts and cached the same way (cache-first)
after their first successful fetch, so they also render correctly offline
on subsequent visits.

## Theming

Default is **light mode** with the **Classic** (`#ccffcc`) brand colour, per
spec; this is not influenced by OS dark-mode preference on first load.
The theme button in the header opens a modal with a light/dark toggle and
7 brand-colour swatches (`js/theme.js`); the selection is persisted in
`localStorage` and re-applied on load. Backgrounds are always a flat,
static colour derived from the current theme, with no gradients, orbs, or
blobs anywhere.

## Font & icons

Font is [Jua](https://fonts.google.com/specimen/Jua) throughout (loaded from
Google Fonts, cached by the service worker). All icons are inline SVG
(`js/icons.js`); there are no emoji characters in the UI.
