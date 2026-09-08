// Retire the previously published worker without navigating any open page.
// Keep this URL available: removing it would leave old installations active.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
