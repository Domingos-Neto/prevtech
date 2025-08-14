const CACHE_NAME = "itaprev-cache-v1";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css",
  "https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
