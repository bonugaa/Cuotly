const CACHE_NAME = 'cuotly-v28-push';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './client-panel.css',
  './client-panel-extra.css',
  './config.js',
  './app.js',
  './push-client.js',
  './client-panel.js',
  './manifest.webmanifest',
  './app-icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text?.() || '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Quotly', {
    body: data.body || 'Tienes un aviso nuevo.', icon: './app-icon.svg', badge: './app-icon.svg',
    tag: data.tag || 'cuotly', renotify: true, data: { url: data.url || './' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    const current = clientList.find(client => 'focus' in client);
    if (current) { current.navigate(targetUrl); return current.focus(); }
    return self.clients.openWindow(targetUrl);
  }));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate' || ['script', 'style'].includes(event.request.destination)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => caches.match('./index.html')))
  );
});
