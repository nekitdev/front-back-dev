const CACHE = "note-cache-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/output.css",
  "/app.js",
  "/manifest.json",
  "/icons/icon.svg",
];

const INSTALL = "install";
const ACTIVATE = "activate";
const FETCH = "fetch";

self.addEventListener(INSTALL, (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener(ACTIVATE, (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key != CACHE).map((key) => caches.delete(key)),
      )
    ),
  );
});

self.addEventListener(FETCH, (event) => {
  event.respondWith(
    caches.match(event.request).then((response) =>
      response || fetch(event.request)
    ),
  );
});
