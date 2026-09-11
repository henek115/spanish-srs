// Service worker - нужен, чтобы приложение открывалось офлайн (например, в
// метро без интернета), и как часть PWA (даёт браузеру основание считать
// сайт "устанавливаемым"). Стратегия - "сеть в приоритете, кэш - только
// подстраховка на случай отсутствия интернета", специально НЕ кэш-в-приоритете:
// весь этот проект уже наступал на грабли устаревшего кэша (см. историю с
// ?v= в index.html) - сервис-воркер не должен повторить ту же ошибку и
// показывать старую версию, пока есть интернет.
//
// CACHE_VERSION нужно бампать вручную при каждом деплое вместе с ?v= в
// index.html - иначе назначение новой версии кэша не произойдёт и старые
// файлы будут годами лежать в кэше "на подстраховке".
const CACHE_VERSION = "v20260911e";
const CACHE_NAME = `spanish-srs-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/theme.css",
  "./css/components.css",
  "./js/bundle.js",
  "./js/firebase-bridge.js",
  "./js/firebase-config.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!req.url.startsWith(self.location.origin)) return; // Firebase и прочее внешнее - не трогаем

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
