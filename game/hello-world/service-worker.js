// Service Worker for 真理のマリオネット
const CACHE_NAME = 'marionette-v26';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/src/main.js',
  '/src/config.js',
  '/src/logic/flags.js',
  '/src/logic/endings.js',
  '/src/logic/controls.js',
  '/src/logic/enemies.js',
  '/src/logic/items.js',
  '/src/scenes/BootScene.js',
  '/src/scenes/TitleScene.js',
  '/src/scenes/StoryScene.js',
  '/src/scenes/GameScene.js',
  '/src/scenes/BossScene.js',
  '/src/scenes/EndingScene.js',
  '/assets/bg_lab.png'
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first, then network fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache new assets dynamically (images, audio, etc.)
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      return caches.match('/index.html');
    })
  );
});
