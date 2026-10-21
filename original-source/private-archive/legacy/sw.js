self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && ['/legacy', '/legacy/', '/legacy/index.html'].includes(url.pathname)) {
    event.respondWith(Promise.resolve(Response.redirect(new URL('/', self.location.origin).href, 302)));
    return;
  }
  event.respondWith(fetch(event.request, { cache: 'no-store' }));
});
