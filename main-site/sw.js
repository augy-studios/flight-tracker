const SHELL_CACHE = "uwuflights-shell-v10";
const API_CACHE = "uwuflights-api-v3";

const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/js/app.js",
  "/js/ui.js",
  "/js/theme.js",
  "/js/geo.js",
  "/js/compass.js",
  "/js/api.js",
  "/js/favourites.js",
  "/js/icons.js",
  "/UFL-main.png",
  "/UFL-192.png",
  "/UFL-512.png",
  "/favicon.ico",
  "/manifest.json"
];

const CURRENT_CACHES = [SHELL_CACHE, API_CACHE];

/* -- Install: cache shell -- */

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
    .then(cache => cache.addAll(ASSETS))
    .then(() => self.skipWaiting())
  );
});

/* -- Activate: clean old caches -- */

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
    .then(keys =>
      Promise.all(
        keys
        .filter(k => !CURRENT_CACHES.includes(k))
        .map(k => caches.delete(k))
      )
    )
    .then(() => self.clients.claim())
  );
});

/* -- Fetch: strategy per route -- */

self.addEventListener('fetch', event => {
  const {
    request
  } = event;

  const url = new URL(request.url);

  // Favourites - reads can fall back to a cached copy offline, but writes
  // (POST/DELETE) must always hit the network; there's nothing sane to
  // cache-fallback a mutation to.
  if (url.pathname === '/api/favourites') {
    if (request.method === 'GET') {
      event.respondWith(networkFirstCached(request, API_CACHE));
    }
    return;
  }

  if (request.method !== 'GET') return;

  // Aircraft proxies - network-first, but cached in Cache Storage so the
  // *same* request (same rounded lat/lon/dist) can be replayed fully
  // offline, not just re-served from an in-memory map that dies on reload.
  if (url.pathname === '/api/adsb' || url.pathname === '/api/opensky') {
    event.respondWith(networkFirstCached(request, API_CACHE, 12));
    return;
  }

  // Google Fonts - cache-first (immutable once fetched).
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // App shell / static assets - cache-first.
  event.respondWith(cacheFirst(request));
});

/* -- Strategies -- */

async function networkFirstCached(request, cacheName, maxAgeIgnored) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        aircraft: [],
        error: "You're offline and no cached data exists for this request yet."
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        },
      }
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // offline - fallback for navigation
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', {
      status: 503
    });
  }
}
