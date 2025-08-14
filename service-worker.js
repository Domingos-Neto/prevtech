const CACHE_NAME = "itaprev-cache-v2";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css",
  "https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css"
];

// Lista de domínios que NÃO devem ser cacheados (Firebase/Google Auth)
const AUTH_BYPASS = [
  "accounts.google.com",
  "securetoken.googleapis.com",
  "www.googleapis.com",
  "gstatic.com",
  "googleapis.com",
  "firebaseapp.com"
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
  const url = new URL(event.request.url);

  // Se for um domínio do Firebase/Google Auth, não cacheia
  if (AUTH_BYPASS.some(domain => url.hostname.includes(domain))) {
    return; // deixa passar direto para a rede
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
