/* eslint-disable no-restricted-globals */
/**
 * CivicCare Haldia — Production Offline Service Worker (/sw.js)
 * Provides:
 *  1. Pre-caching & Stale-While-Revalidate caching for static assets, app shell, fonts, and all 28 Haldia real issue photos.
 *  2. Cache-First with Offline Fallback SVG Tile for Haldia OSM & Esri map tiles (/api/tiles/osm/*).
 *  3. Network-First with Offline Snapshot Fallback for /api/issues, /api/stats, and /api/geocode/*.
 *  4. IndexedDB Store-and-Forward Queue + Background Sync ('sync-haldia-issues') for offline issue reports in Haldia areas with poor connectivity.
 */

const SW_VERSION = '2.1.0-haldia';
const CACHE_STATIC = 'civiccare-haldia-static-v2';
const CACHE_RUNTIME = 'civiccare-haldia-runtime-v2';
const CACHE_TILES = 'civiccare-haldia-tiles-v2';
const CACHE_API = 'civiccare-haldia-api-v2';

const IDB_NAME = 'civiccare_haldia_offline_db';
const IDB_VERSION = 1;
const IDB_STORE = 'offline_issue_queue';

const CORE_STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/assets/issues/issue-1.jpg',
  '/assets/issues/issue-2.jpg',
  '/assets/issues/issue-3.jpg',
  '/assets/issues/issue-4.jpg',
  '/assets/issues/issue-5.jpg',
  '/assets/issues/issue-6.jpg',
  '/assets/issues/issue-7.jpg',
  '/assets/issues/issue-8.jpg',
  '/assets/issues/issue-9.jpg',
  '/assets/issues/issue-10.jpg',
  '/assets/issues/issue-11.jpg',
  '/assets/issues/issue-12.jpg',
  '/assets/issues/issue-13.jpg',
  '/assets/issues/issue-14.jpg',
  '/assets/issues/issue-15.jpg',
  '/assets/issues/issue-16.jpg',
  '/assets/issues/issue-17.jpg',
  '/assets/issues/issue-18.jpg',
  '/assets/issues/issue-19.jpg',
  '/assets/issues/issue-20.jpg',
  '/assets/issues/issue-21.jpg',
  '/assets/issues/issue-22.jpg',
  '/assets/issues/issue-23.jpg',
  '/assets/issues/issue-24.jpg',
  '/assets/issues/issue-25.jpg',
  '/assets/issues/issue-26.jpg',
  '/assets/issues/issue-27.jpg',
  '/assets/issues/issue-28.jpg',
];

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: 'queueId' });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveReportToSwIdb(report) {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(report);
      tx.oncomplete = () => resolve(report);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return report;
  }
}

async function getAllQueuedReportsFromSwIdb() {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function broadcastToClients(message) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  for (const client of clients) {
    client.postMessage(message);
  }
}

function createOfflineMapTileResponse() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#eef1f6"/>
    <path d="M0 64h256M0 128h256M0 192h256M64 0v256M128 0v256M192 0v256" stroke="#dde2ec" stroke-width="1"/>
    <text x="128" y="122" text-anchor="middle" fill="#7c8294" font-family="sans-serif" font-size="11" font-weight="600">Haldia Offline Map Cache</text>
    <text x="128" y="140" text-anchor="middle" fill="#9ca3b5" font-family="monospace" font-size="10">GPS Pin Active</text>
  </svg>`;
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store',
    },
  });
}

// Install: pre-cache core static assets resiliently (individual failures never abort install)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);
      await Promise.allSettled(
        CORE_STATIC_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res && res.ok) {
              await cache.put(url, res.clone());
            }
          } catch {
            // Ignore single asset failure during install
          }
        })
      );
    })()
  );
});

// Activate: purge outdated caches and claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const validCaches = new Set([
        CACHE_STATIC,
        CACHE_RUNTIME,
        CACHE_TILES,
        CACHE_API,
      ]);
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (!validCaches.has(key)) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
      await self.clients.claim();
      const queued = await getAllQueuedReportsFromSwIdb();
      await broadcastToClients({
        type: 'SW_ACTIVATED',
        version: SW_VERSION,
        queuedCount: queued.filter((item) => item.syncStatus === 'pending').length,
      });
    })()
  );
});

// Helper: Stale-While-Revalidate for static assets & bundles
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (
        networkResponse &&
        (networkResponse.status === 200 || networkResponse.type === 'opaque')
      ) {
        cache.put(request, networkResponse.clone()).catch(() => {});
      }
      return networkResponse;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response('Offline asset unavailable', { status: 503 });
}

// Helper: Network-First with Cache Fallback for API GET & HTML navigations
async function networkFirstWithCache(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    if (fallbackUrl) {
      const staticCache = await caches.open(CACHE_STATIC);
      const fallback = await staticCache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return new Response(
      JSON.stringify({
        offline: true,
        error: 'Device is offline in Haldia connectivity zone. Showing cached state.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Fetch event listener
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore Vite HMR or browser extension requests
  if (
    url.protocol !== 'http:' &&
    url.protocol !== 'https:'
  ) {
    return;
  }
  if (url.pathname.includes('@vite/client') || url.searchParams.has('t')) {
    return;
  }

  // 1. Intercept POST /api/issues when offline -> Store-and-Forward in Service Worker IndexedDB
  if (
    request.method === 'POST' &&
    url.origin === self.location.origin &&
    url.pathname === '/api/issues'
  ) {
    event.respondWith(
      (async () => {
        try {
          const cloned = request.clone();
          const response = await fetch(request);
          return response;
        } catch {
          try {
            const body = await request.clone().json();
            const nowIso = new Date().toISOString();
            const queueId = `SWQ-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            const queuedItem = {
              queueId,
              tempIssueId: -Math.floor(1000 + Math.random() * 8999),
              title: body.title || 'Untitled Offline Civic Report',
              description: body.description || '',
              location: body.location || 'Haldia Municipal Area',
              photo_url: body.photo_url || '/assets/issues/issue-1.jpg',
              lat: typeof body.lat === 'number' ? body.lat : 22.0604,
              lng: typeof body.lng === 'number' ? body.lng : 88.1095,
              predictedCategory: 'Other',
              urgencyHits: 0,
              createdAt: nowIso,
              syncStatus: 'pending',
              syncedIssueId: null,
            };
            await saveReportToSwIdb(queuedItem);
            await broadcastToClients({
              type: 'OFFLINE_REPORT_QUEUED',
              report: queuedItem,
            });
            return new Response(
              JSON.stringify({
                id: queuedItem.tempIssueId,
                category: queuedItem.predictedCategory,
                status: 'Open',
                similar_to: [],
                queued_offline: true,
                queue_id: queueId,
              }),
              {
                status: 202,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          } catch {
            return new Response(
              JSON.stringify({ error: 'Offline queue error' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      })()
    );
    return;
  }

  // Only handle GET requests for caching below
  if (request.method !== 'GET') {
    return;
  }

  // 2. Map Tiles (/api/tiles/osm/* or ArcGIS tiles) -> Cache-First with Offline SVG Fallback
  if (
    url.pathname.startsWith('/api/tiles/osm/') ||
    url.hostname.includes('arcgisonline.com')
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_TILES);
        const cached = await cache.match(request);
        if (cached) {
          fetch(request)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(request, res.clone()).catch(() => {});
              }
            })
            .catch(() => {});
          return cached;
        }
        try {
          const netRes = await fetch(request);
          if (netRes && (netRes.status === 200 || netRes.type === 'opaque')) {
            cache.put(request, netRes.clone()).catch(() => {});
            return netRes;
          }
          return createOfflineMapTileResponse();
        } catch {
          return createOfflineMapTileResponse();
        }
      })()
    );
    return;
  }

  // 3. Same-origin API GET requests (/api/issues, /api/stats, /api/geocode/*) -> Network-First with Cache Fallback
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, CACHE_API, null));
    return;
  }

  // 4. HTML Navigation requests -> Network-First falling back to cached /index.html
  if (
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html')
  ) {
    event.respondWith(networkFirstWithCache(request, CACHE_STATIC, '/index.html'));
    return;
  }

  // 5. Static Assets: Photos (/assets/*), Icons, Manifest, JS/TS/CSS bundles, Google Fonts, Leaflet CSS
  if (
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('unpkg.com')
  ) {
    const targetCache =
      url.pathname.startsWith('/assets/issues/') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.webmanifest')
        ? CACHE_STATIC
        : CACHE_RUNTIME;
    event.respondWith(staleWhileRevalidate(request, targetCache));
  }
});

// Background Sync API listener ('sync-haldia-issues')
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-haldia-issues') {
    event.waitUntil(
      (async () => {
        const queued = await getAllQueuedReportsFromSwIdb();
        const pending = queued.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
        // Notify any active client window to flush to Cloud Firestore + /api/issues
        await broadcastToClients({
          type: 'OFFLINE_QUEUE_SYNC_REQUEST',
          pendingCount: pending.length,
        });
      })()
    );
  }
});

// Message listener for two-way communication with client tabs
self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'QUEUE_OFFLINE_REPORT' && data.report) {
    event.waitUntil(
      (async () => {
        await saveReportToSwIdb(data.report);
        await broadcastToClients({
          type: 'OFFLINE_REPORT_QUEUED',
          report: data.report,
        });
      })()
    );
    return;
  }

  if (data.type === 'SYNC_OFFLINE_QUEUE') {
    event.waitUntil(
      broadcastToClients({
        type: 'OFFLINE_QUEUE_SYNC_REQUEST',
      })
    );
    return;
  }

  if (data.type === 'GET_SW_STATUS') {
    event.waitUntil(
      (async () => {
        const staticCache = await caches.open(CACHE_STATIC);
        const runtimeCache = await caches.open(CACHE_RUNTIME);
        const tileCache = await caches.open(CACHE_TILES);
        const [staticKeys, runtimeKeys, tileKeys, queued] = await Promise.all([
          staticCache.keys(),
          runtimeCache.keys(),
          tileCache.keys(),
          getAllQueuedReportsFromSwIdb(),
        ]);
        const payload = {
          type: 'SW_STATUS_UPDATE',
          version: SW_VERSION,
          staticCachedCount: staticKeys.length,
          runtimeCachedCount: runtimeKeys.length,
          tileCachedCount: tileKeys.length,
          queuedReportsCount: queued.filter((r) => r.syncStatus === 'pending').length,
        };
        if (event.source && typeof event.source.postMessage === 'function') {
          event.source.postMessage(payload);
        } else {
          await broadcastToClients(payload);
        }
      })()
    );
  }
});
