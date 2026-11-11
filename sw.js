// Easy Carve: works offline once opened. Always tries the internet first so updates show up.
const CACHE = "easy-carve-v1.2";
const FILES = ["./", "./index.html", "./quick-guide.pdf", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
               "./drawings/hare.jpg", "./drawings/dragon.jpg", "./drawings/hare-thumb.jpg", "./drawings/dragon-thumb.jpg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
