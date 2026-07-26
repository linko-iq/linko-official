const CACHE_NAME = 'linko-pwa-v3';

const FILES_TO_CACHE = [
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

/* تثبيت ملفات التطبيق */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
        } catch (error) {
          console.warn('تعذر تخزين الملف:', file);
        }
      }
    })
  );

  self.skipWaiting();
});

/* حذف التخزين القديم عند تحديث الموقع */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  self.clients.claim();
});

/* تشغيل الصفحات من الإنترنت، والرجوع للنسخة المخزنة عند الانقطاع */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put('./index.html', copy);
            });
          }

          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(event.request)) ||
            (await caches.match('./index.html'))
          );
        })
    );

    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });

          return response;
        })
        .catch(() => {
          return new Response('Offline', {
            status: 503,
            statusText: 'Offline'
          });
        });
    })
  );
});
