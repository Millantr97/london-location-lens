const VERSION = "location-potential-pwa-v1";
const CORE = [
  "/", "/index.html", "/manifest.webmanifest", "/offline.html",
  "/styles.css?v=32", "/cities.js?v=5", "/app.js?v=32",
  "/report.js?v=21", "/trends.js?v=18", "/extras.js?v=21",
  "/tabs.js?v=22", "/leads.js?v=20",
  "/assets/favicon.svg", "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png", "/assets/icons/apple-touch-icon.png",
  "/assets/icons/maskable-192.png", "/assets/icons/maskable-512.png",
  "/birmingham/", "/bristol/", "/edinburgh/", "/glasgow/",
  "/leeds/", "/liverpool/", "/manchester/", "/sheffield/"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || (await caches.match("/")) || caches.match("/offline.html"))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, copy));
        }
        return response;
      }))
    );
  }
});
