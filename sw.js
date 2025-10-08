const CACHE_NAME = 'squotato-v1.0.1';
const urlsToCache = [
  '/Squotato/',
  '/Squotato/index.html',
  '/Squotato/style.css',
  '/Squotato/script.js',
  '/Squotato/firebase.js',
  '/Squotato/manifest.json',
  '/Squotato/sw.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});