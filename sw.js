const CACHE_NAME = "beru-pwa-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./pwa.js",
  "./manifest.json",
  "./manifest-admin.json",
  "./admin.html",
  "./admin-pwa.js",
  "./assets/images/beru-admin-icon.png",
  "./assets/images/beru-pwa.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("/workers.dev/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match(url.pathname.endsWith("/admin.html") ? "./admin.html" : "./index.html")) )
    );
    return;
  }

  if (url.pathname.endsWith("/script.js") || url.pathname.endsWith("/style.css") ||
      url.pathname.endsWith("/manifest.json") || url.pathname.includes("/assets/")) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => caches.match(request))
    );
  }
});
