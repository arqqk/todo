const CACHE_NAME = 'todo-pwa-v1';
const urlsToCache = [
  '/todo/',
  '/todo/index.html',
  '/todo/styles.css',
  '/todo/app.js',
  '/todo/manifest.json',
  '/todo/icons/icon-72x72.png',
  '/todo/icons/icon-96x96.png',
  '/todo/icons/icon-120x120.png',
  '/todo/icons/icon-128x128.png',
  '/todo/icons/icon-144x144.png',
  '/todo/icons/icon-152x152.png',
  '/todo/icons/icon-180x180.png',
  '/todo/icons/icon-192x192.png',
  '/todo/icons/icon-384x384.png',
  '/todo/icons/icon-512x512.png'
];

// Установка сервис-воркера и кэширование ресурсов
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэш открыт');
        return cache.addAll(urlsToCache);
      })
  );
});

// Перехват запросов и возврат кэшированных версий
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем кэшированную версию или делаем запрос к сети
        return response || fetch(event.request);
      })
  );
});

// Обновление кэша при активации нового сервис-воркера
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
// Добавлена закрывающая скобка
