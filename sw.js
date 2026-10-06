const CACHE_NAME = 'shipping-driver-v1.0.0';
const RUNTIME_CACHE = 'shipping-driver-runtime-v1.0.0';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(err => console.log(err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.hostname.includes('firebase') || url.hostname.includes('firebaseio')) return;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate' || 
      (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
        return response;
      }).catch(() => {
        if (request.destination === 'image') return caches.match('./logo.png');
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}
  const title = data.title || 'مندوب مشوار';
  const options = {
    body: data.body || 'عندك شحنة جديدة',
    icon: './logo.png',
    badge: './logo.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    requireInteraction: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./index.html'));
}); 