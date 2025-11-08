const CACHE_NAME = 'neuron-os-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
