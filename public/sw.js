const CACHE_NAME = 'velocity-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './activity.tcx',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  const isWebAsset = 
    event.request.mode === 'navigate' || 
    url.includes('.js') || 
    url.includes('.css') || 
    url.includes('manifest.json') || 
    url.includes('activity.tcx');

  if (isWebAsset) {
    // Network-First strategy for core logic/styles to ensure prompt updates
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || Response.error();
          });
        })
    );
  } else {
    // Cache-First strategy for images, icons, and Leaflet map tiles
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) {
            if (url.includes('basemaps.cartocdn.com') || url.includes('openstreetmap.org')) {
              const responseClone = response.clone();
              caches.open('map-tiles').then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return response;
        });
      })
    );
  }
});
