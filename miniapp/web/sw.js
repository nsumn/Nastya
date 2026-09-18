/* Service worker: нужен, чтобы приложение ставилось на рабочий стол и
   не превращалось в пустой экран без сети.

   Стратегия — «сначала сеть»: обновления доезжают сразу, без плясок со
   сбросом кэша. Кэш используется только когда сети нет. */

const CACHE = 'jows-shell-v1';
const SHELL = [
  './',
  './styles.css',
  './app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Данные и вход никогда не кэшируем: баланс из кэша — худшее, что бывает.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/login')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then(
        (cached) => cached || caches.match('./'),
      )),
  );
});
