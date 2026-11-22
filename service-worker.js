const CACHE_NAME = 'personal-language-app-core-v71';
const IS_LOCAL_DEVELOPMENT = ['localhost', '127.0.0.1'].includes(self.location.hostname);
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/custom-select.js',
  './js/router.js',
  './js/db.js',
  './js/vocabulary.js',
  './js/word-sets.js',
  './js/sentences.js',
  './js/study.js',
  './js/speech.js',
  './js/recorder.js',
  './js/review.js',
  './js/statistics.js',
  './js/settings.js',
  './js/session-detail.js',
  './js/backup.js',
  './js/backup-page.js',
  './js/supabase.js',
  './js/sync.js',
  './js/notifications.js',
  './pages/home.js',
  './pages/vocabulary-page.js',
  './pages/study-page.js',
  './pages/speaking-page.js',
  './pages/progress-page.js',
  './pages/settings-page.js',
  './pages/session-detail-page.js',
  './assets/icons/icon.svg',
  './assets/icons/favicon.png?v=2',
  './image/1.png',
  './image/nút nhap hang loat.png',
  './image/nút them từ.png',
  './image/2.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  if (IS_LOCAL_DEVELOPMENT) {
    const request = event.request.method === 'GET'
      ? new Request(event.request, { cache: 'no-store' })
      : event.request;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })),
  );
});
