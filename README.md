# uwuFlights

Point your phone at the sky and find that flight. **uwuFlights** is a free,
open source, worldwide live aircraft tracker built for plane spotters, with
a point-and-search radar view, a nearby-aircraft list, and the ability to
favourite flights (by callsign) or aircraft models (by type) so you can spot
your firsts.

Live at [flights.uwuapps.org](https://flights.uwuapps.org), by
[Augy Studios](https://uwuapps.org).

## Repo layout

```text
main-site/       the PWA itself: static HTML/CSS/JS + Vercel serverless
                 functions + Supabase schema. See main-site/README.md for
                 full architecture, deployment, and env var docs.
telegram-bot/    plans for a future companion Telegram bot (push alerts
                 for rare aircraft, favourite-flight watching, noise-
                 complaint logging). Not built yet; see
                 telegram-bot/README.md.
```

## What it does

- Detects your location (GPS, or manual lat/lon) and finds live aircraft
  around you, anywhere in the world.
- **Radar tab**: a compass-style view; enable device orientation and the
  ring rotates so aircraft markers point toward where they actually are.
- **Nearby tab**: a sortable list with distance, altitude, speed, and
  bearing for each aircraft.
- **Favourites**: star a flight or an aircraft type to keep track of it;
  syncs across devices if a Supabase backend is configured, otherwise
  stored locally on-device.
- Installable as a PWA, works offline for the app shell, and degrades
  gracefully when the upstream flight-data APIs are rate-limited or down.

## Data sources

Both are free to use:

- [adsb.lol](https://api.adsb.lol/docs), the primary source.
- [OpenSky Network](https://openskynetwork.github.io/opensky-api/rest.html),
  used as an automatic fallback if adsb.lol is unavailable.

## Tech stack

- Vanilla HTML/CSS/JS (no build step, no framework) for the frontend.
- Vercel for static hosting + serverless API proxy functions.
- Supabase (optional) for cross-device favourites, via anonymous auth + RLS.

## Contributing

Issues and pull requests are welcome. Please read the
[Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## License

[MIT](LICENSE) © Augy Studios.
