/**
 * Scrub Practical - Production Progressive Web App Service Worker
 * Version: 1.0.0
 * 
 * Provides offline application shell access, font caching, and safe update
 * workflows that protect student examination data and ongoing attempts.
 */

const CACHE_VERSION = 'v1.0.0';
const APP_CACHE = `scrub-practical-app-${CACHE_VERSION}`;
const STATIC_CACHE = `scrub-practical-static-${CACHE_VERSION}`;
const FONT_CACHE = 'scrub-practical-fonts-v1';

// Essential core assets for offline boot
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.png',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

// Install Event: Precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then(async (cache) => {
      // Use individual puts so a single missing optional asset doesn't fail the whole install
      for (const asset of PRECACHE_ASSETS) {
        try {
          const res = await fetch(asset, { cache: 'no-cache' });
          if (res && res.status === 200) {
            await cache.put(asset, res);
          }
        } catch (err) {
          console.warn(`[PWA SW] Precache skipped for ${asset}:`, err);
        }
      }
    })
  );
  // Do NOT blindly self.skipWaiting() here to avoid refreshing while a student is in an exam.
});

// Activate Event: Cleanup stale caches and claim clients safely
self.addEventListener('activate', (event) => {
  const currentCaches = [APP_CACHE, STATIC_CACHE, FONT_CACHE];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('scrub-practical-') && !currentCaches.includes(key)) {
            console.log(`[PWA SW] Removing obsolete cache: ${key}`);
            return caches.delete(key);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event: Allow client UI to trigger skipWaiting on demand (when exam is not running)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event: Implement specialized caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1. Google Fonts Cache Strategy (Cache-First)
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.status === 200) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          // If offline and not in cache, fallback gracefully
          return cached || new Response('', { status: 408, statusText: 'Offline font' });
        }
      })
    );
    return;
  }

  // 2. Navigation / App Shell HTML Request Strategy (Network First with Cache Fallback)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(APP_CACHE).then((cache) => {
              cache.put(request, clone);
              cache.put('./index.html', clone);
            });
          }
          return networkRes;
        })
        .catch(async () => {
          // Offline fallback: return cached document or index.html
          const cachedDoc = await caches.match(request);
          if (cachedDoc) return cachedDoc;
          const cachedIndex = await caches.match('./index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('./');
          if (cachedRoot) return cachedRoot;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Scrub Practical - Offline</title></head><body><h1>Scrub Practical</h1><p>Offline shell unavailable. Please connect to the internet once to cache the examination environment.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 3. Static Bundled Assets (Vite hashed JS, CSS, media in /assets/) (Cache First)
  if (url.pathname.includes('/assets/') || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.status === 200) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch (err) {
          if (cached) return cached;
          throw err;
        }
      })
    );
    return;
  }

  // 4. Other same-origin static assets (images, icons, manifest)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) {
          // Stale-While-Revalidate: serve cached immediately, update in background
          fetch(request)
            .then((res) => {
              if (res && res.status === 200) {
                caches.open(APP_CACHE).then((cache) => cache.put(request, res));
              }
            })
            .catch(() => {});
          return cached;
        }

        return fetch(request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(APP_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        });
      })
    );
  }
});
