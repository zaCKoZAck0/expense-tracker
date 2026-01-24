// Expense Tracker Service Worker
const CACHE_NAME = "expense-tracker-v1";
const STATIC_CACHE_NAME = "expense-tracker-static-v2";

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      // Use addAll with error handling - don't fail if some assets missing
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`Failed to cache ${url}:`, err);
          }),
        ),
      );
    }),
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Skip Next.js internal routes and hot-reload in dev
  if (url.pathname.startsWith("/_next/")) {
    return;
  }

  // API calls - network first, fall back to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request);
        }),
    );
    return;
  }

  // Navigation requests - network first, fall back to cached app shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the navigation response
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached page or fallback to root
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match("/");
          });
        }),
    );
    return;
  }

  // Static assets - stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // Update cache with fresh response
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Return undefined if network fails and no cache
          return undefined;
        });

      // Return cached response immediately, update in background
      return cachedResponse || fetchPromise;
    }),
  );
});

// Handle messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
