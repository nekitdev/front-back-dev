const CACHE = "note-cache-v2";
const DYNAMIC = "dynamic-v1";

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
const PUSH = "push";

self.addEventListener(INSTALL, (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener(ACTIVATE, (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key != CACHE && key != DYNAMIC)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener(FETCH, (event) => {
  const url = new URL(event.request.url);

  if (url.origin != location.origin) {
    return;
  }

  if (url.pathname.startsWith("/content/")) {
    event.respondWith(
      fetch(event.request)
        .then((network) => {
          const clone = network.clone();

          caches.open(DYNAMIC).then((cache) => {
            cache.put(event.request, clone);
          });

          return network;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match("/content/home.html")),
        ),
    );
  }
});

self.addEventListener(PUSH, (event) => {
  let data = {
    title: "Новое уведомление",
    body: "",
  };

  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body,
    icon: "/icons/icon.svg",
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
