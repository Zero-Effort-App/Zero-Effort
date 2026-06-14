// HANAP PWA service worker
// Caching strategy (chosen for instant updates + low mobile-data use + offline resilience):
//   - HTML / navigations       -> network-first  : always loads the newest app shell, which
//                                                   points at the newest hashed bundles.
//   - /assets/* (hashed build) -> cache-first     : content-hashed names never change, so each
//                                                   file is downloaded ONCE and reused forever.
//   - icons / manifest / misc  -> stale-while-revalidate : instant from cache, refreshed in bg.
//   - Cross-origin (Supabase, API server, Agora, Groq, fonts) -> NOT intercepted (network only).
// Bump VERSION whenever this file changes so old caches are purged on activate.
const VERSION = 'v7';
const STATIC_CACHE = `hanap-static-${VERSION}`;
const SHELL_CACHE = `hanap-shell-${VERSION}`;

// Minimal shell precache. addAll is best-effort: a single 404 must not fail install.
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/hanap-icon-192.png',
  '/hanap-icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.allSettled(SHELL_ASSETS.map((u) => cache.add(u)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== SHELL_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Let the page tell a freshly-installed SW to take over immediately (used for auto-update).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const isHashedAsset = (url) => url.pathname.startsWith('/assets/');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only ever handle our own origin. Supabase / API / Agora / Groq / fonts pass straight through
  // to the network so live data and auth are never served from cache.
  if (url.origin !== self.location.origin) return;

  // 1) Navigations & HTML documents -> network-first (instant updates), cached shell when offline.
  const accept = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', clone));
          return res;
        })
        .catch(() =>
          caches.match('/index.html').then((r) => r || caches.match('/'))
        )
    );
    return;
  }

  // 2) Immutable hashed build assets -> cache-first (no re-downloads on mobile data).
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // 3) Other same-origin static (icons, manifest, etc.) -> stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------
self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'HANAP', body: event.data ? event.data.text() : 'You have a new notification' };
  }

  const isCall = data.notificationType === 'call';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/hanap-icon-192.png',
    badge: '/hanap-icon-192.png',
    tag: data.tag || (isCall ? 'incoming-call' : 'notification'),
    // Keep an incoming call on screen until the user acts on it.
    requireInteraction: isCall ? true : (data.requireInteraction || false),
    data: {
      interviewId: data.interviewId,
      applicantId: data.applicantId,
      companyId: data.companyId,
      notificationType: data.notificationType,
      channel_name: data.channel_name,
      caller: data.caller,
      url: data.url || '/',
    },
    vibrate: isCall ? [300, 150, 300, 150, 300] : [200, 100, 200],
  };
  // Accept/Decline buttons (Android; iOS Safari ignores actions and just opens on tap).
  if (isCall) {
    options.actions = [
      { action: 'accept', title: '✅ Accept' },
      { action: 'decline', title: '✕ Decline' },
    ];
  }
  if (data.image) options.image = data.image;

  event.waitUntil(self.registration.showNotification(data.title || 'HANAP', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  // "Decline" just dismisses the notification.
  if (event.action === 'decline') return;

  const d = event.notification.data || {};
  const urlToOpen = d.url || '/';
  const isCall = d.notificationType === 'call' && d.channel_name;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // If the app is already open, focus it and tell it about the call (no reload needed).
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('/applicant') && 'focus' in client) {
          client.focus();
          if (isCall) {
            client.postMessage({ type: 'incoming-call', channel: d.channel_name, caller: d.caller });
          } else if ('navigate' in client && client.url !== urlToOpen) {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // Otherwise open a fresh window at the call URL (the app reads ?call=… on load).
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
