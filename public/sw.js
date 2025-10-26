// Service Worker for handling chunk loading failures
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  // Only handle /_next/static/ requests
  if (!event.request.url.includes('/_next/static/')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch((error) => {
      // If chunk loading fails, force reload the page
      console.warn('[SW] Failed to load chunk, triggering reload:', event.request.url);

      // Notify all clients to reload
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'CHUNK_LOAD_ERROR',
            url: event.request.url
          });
        });
      });

      throw error;
    })
  );
});
