const CACHE_NAME = 'ricochet-v18';

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json',
  './js/main.js',
  './js/audio/SoundEngine.js',
  './js/engine/GameEngine.js',
  './js/engine/Vector2D.js',
  './js/engine/StorageManager.js',
  './js/world/Engine.js',
  './js/view/Renderer.js',
  './js/entities/Asteroid.js',
  './js/entities/MiningDrone.js',
  './js/entities/CollectorDrone.js',
  './js/entities/OreParticle.js',
  './js/ui/UIManager.js',
  './js/ui/Shell.js',
  './js/ui/Upgrades.js',
  './js/content/Campaign.js',
  './js/sim/Tuning.js',
  './js/sim/Economy.js'
];

function emptyFallback() {
  return new Response('Service unavailable', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function cachePut(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') {
    return;
  }
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);

    if (event.request.mode === 'navigate') {
      try {
        const fresh = await fetch(event.request);
        await cachePut(event.request, fresh);
        return fresh;
      } catch (err) {
        return cached || (await caches.match('./index.html')) || emptyFallback();
      }
    }

    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(event.request);
      await cachePut(event.request, response);
      return response;
    } catch (err) {
      return emptyFallback();
    }
  })());
});
