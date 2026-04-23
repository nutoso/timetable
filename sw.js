// Service Worker — 大学時間割 PWA
const CACHE_NAME = 'timetable-v6';

const ASSETS = [
  './',
  './index.html',
  './records.html',
  './settings.html',
  './lecture.html',
  './shinmen.html',
  './flyer.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/pages.css',
  './js/lucide.min.js',
  './js/app.js',
  './js/storage.js',
  './js/timetable.js',
  './js/records.js',
  './js/settings.js',
  './js/lecture.js',
  './js/swipe.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// インストール時：全ファイルをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// アクティベート時：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// フェッチ時：ignoreSearch でバージョンクエリ(?v=N)を無視してキャッシュを探す
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // オフライン時にHTMLリクエストが来たら index.html を返す
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html', { ignoreSearch: true });
        }
      });
    })
  );
});
