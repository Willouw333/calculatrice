// Service worker : met les fichiers en cache pour que la calculatrice
// fonctionne hors ligne. Quand tu modifies un fichier de l'application,
// change le numéro de version ci-dessous pour forcer la mise à jour.
const VERSION = "calculatrice-v1";

const FICHIERS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      // Chaque fichier est ajouté séparément : un fichier absent n'empêche pas les autres
      Promise.all(FICHIERS.map((f) => cache.add(f).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((enCache) => {
      if (enCache) return enCache;
      return fetch(event.request).catch(() => caches.match("./index.html"));
    })
  );
});
