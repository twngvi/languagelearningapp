const CACHE_NAME = 'personal-language-app-core-v14';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
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
  './assets/icons/icon.svg',
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
