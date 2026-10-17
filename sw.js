const SHELL = "english-studio-shell-v4.1.0",
  DATA = "english-studio-data";
const FILES = [
  "./",
  "./index.html",
  "./studio/ui.css?v=4.1.0",
  "./studio/app.mjs?v=4.1.0",
  "./studio/core.mjs",
  "./studio/lexicon.mjs",
  "./studio/speech.mjs",
  "./studio/imports.mjs",
  "./studio/courses.mjs",
  "./studio/reader-popover.mjs",
  "./studio/reader-layout.mjs",
  "./studio/reading-study.mjs",
  "./studio/reading-practice.mjs",
  "./reading-data.js",
  "./bible-catalog.js",
  "./classics-catalog.js",
  "./lexicon/manifest.json",
  "./icon.svg",
  "./manifest.json",
];
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(FILES.map((path) => new Request(new URL(path, self.location.href), { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k.startsWith("english-studio-") && ![SHELL, DATA].includes(k),
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  const isData =
    /\/(lexicon|bible|content)\//.test(url.pathname) &&
    !url.pathname.endsWith("/manifest.json");
  event.respondWith(
    (async () => {
      const cache = await caches.open(isData ? DATA : SHELL);
      if (isData) {
        const saved = await cache.match(request);
        if (saved) return saved;
      }
      try {
        const response = await fetch(request, isData ? {} : { cache: "no-cache" });
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        const saved = await cache.match(request);
        return (
          saved ||
          (request.mode === "navigate"
            ? await caches.match("./index.html")
            : Response.error())
        );
      }
    })(),
  );
});
