/* Generated at build time. Never cache API responses or user content. */
const CACHE_PREFIX = 'fish-island-pwa-';
const CACHE_NAME = CACHE_PREFIX + '__VERSION__';
const FILES = __PRECACHE__;
const URLS = FILES.map((file) => new URL(file, self.registration.scope).href);
const SHELL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(
          URLS.map((url) => new Request(url, { credentials: 'omit', cache: 'reload' })),
        );
      } catch (error) {
        await caches.delete(CACHE_NAME);
        throw error;
      }
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'FISH_ISLAND_ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (/^\/(api|ws|emoticon-search)(\/|$)/.test(url.pathname)) return;
  const isNavigation = request.mode === 'navigate' && !/\/[^/]*\.[^/]+$/.test(url.pathname);
  if (!isNavigation && !URLS.includes(url.href)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Public build assets are identical across request Origin headers (modulepreload/CORS).
      const cached = await cache.match(isNavigation ? SHELL : request, { ignoreVary: true });
      return cached ?? fetch(request);
    })(),
  );
});
