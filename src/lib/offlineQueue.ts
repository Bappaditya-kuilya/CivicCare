import { IssueCategory, IssueStatus, TriagePreviewResponse } from '../types';
import { classify, urgencyHits, priority } from './triage';
import { createIssueInFirestore } from './firebase';
import { getRealPhotoForCategory } from './syntheticAssets';

export type OfflineSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface QueuedIssueReport {
  queueId: string;
  tempIssueId: number;
  title: string;
  description: string;
  location: string;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  predictedCategory: IssueCategory;
  urgencyHits: number;
  urgentTerms: string[];
  matchedKeywords: string[];
  createdAt: string;
  syncedAt?: string | null;
  syncStatus: OfflineSyncStatus;
  syncedIssueId?: number | null;
  lastError?: string | null;
}

export interface ServiceWorkerCacheStats {
  swActive: boolean;
  swVersion: string;
  staticCachedCount: number;
  runtimeCachedCount: number;
  tileCachedCount: number;
}

const OFFLINE_QUEUE_STORAGE_KEY = 'civiccare_offline_issue_queue_v1';
const SIMULATED_OFFLINE_STORAGE_KEY = 'civiccare_simulated_offline_haldia_v1';
const IDB_NAME = 'civiccare_haldia_offline_db';
const IDB_VERSION = 1;
const IDB_STORE = 'offline_issue_queue';

type QueueSubscriber = () => void;
const subscribers = new Set<QueueSubscriber>();

let swCacheStats: ServiceWorkerCacheStats = {
  swActive: false,
  swVersion: '2.1.0-haldia',
  staticCachedCount: 28,
  runtimeCachedCount: 0,
  tileCachedCount: 0,
};

let isSyncInFlight = false;

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {
      // Ignore subscriber error
    }
  });
}

export function subscribeToOfflineQueue(cb: QueueSubscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function getSimulatedOfflineMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SIMULATED_OFFLINE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSimulatedOfflineMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      localStorage.setItem(SIMULATED_OFFLINE_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(SIMULATED_OFFLINE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage error
  }
  notifySubscribers();
  if (!enabled && isBrowserOnline()) {
    // Automatically flush queued reports when reconnecting from simulated Haldia dead-zone
    void syncQueuedReportsNow();
  }
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function isEffectiveOnline(): boolean {
  return isBrowserOnline() && !getSimulatedOfflineMode();
}

export function getServiceWorkerCacheStats(): ServiceWorkerCacheStats {
  return swCacheStats;
}

function openOfflineIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          const store = db.createObjectStore(IDB_STORE, { keyPath: 'queueId' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function syncQueueToIndexedDb(items: QueuedIssueReport[]): Promise<void> {
  const db = await openOfflineIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function getQueuedReports(): QueuedIssueReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as QueuedIssueReport[];
    }
  } catch {
    // Ignore parse error
  }
  return [];
}

function saveQueuedReports(items: QueuedIssueReport[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage error
  }
  void syncQueueToIndexedDb(items);
  notifySubscribers();
}

/**
 * Local deterministic triage preview that works 100% offline in Haldia dead-zones.
 */
export function buildOfflineTriagePreview(
  title: string,
  description: string
): TriagePreviewResponse {
  const cResult = classify(title, description);
  const uResult = urgencyHits(title, description);
  const pResult = priority({
    urgency_hits: uResult.count,
    similar_count: 0,
    created_at: new Date().toISOString(),
    status: 'Open',
  });

  return {
    category: cResult.category,
    confidence: cResult.confidence,
    matched_keywords: cResult.matchedKeywords,
    urgency_hits: uResult.count,
    urgent_terms: uResult.matchedTerms,
    estimated_priority: pResult.score,
    estimated_band: pResult.band,
    duplicates: [],
  };
}

/**
 * Enqueues a civic issue report locally in IndexedDB + localStorage + Service Worker
 * when offline or when network connectivity drops in Haldia.
 */
export async function enqueueOfflineIssueReport(payload: {
  title: string;
  description: string;
  location: string;
  photo_url?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<{
  queuedReport: QueuedIssueReport;
  submissionResult: {
    id: number;
    category: IssueCategory;
    status: IssueStatus;
    similar_to: number[];
    queuedOffline: boolean;
    queueId: string;
  };
}> {
  const cResult = classify(payload.title, payload.description);
  const uResult = urgencyHits(payload.title, payload.description);
  const nowIso = new Date().toISOString();
  const queueId = `HALDIA-Q${Date.now().toString().slice(-5)}`;
  const tempIssueId = -Math.floor(1000 + Math.random() * 8999);

  const resolvedPhoto =
    payload.photo_url && payload.photo_url.trim().length > 0
      ? payload.photo_url.trim()
      : getRealPhotoForCategory(cResult.category);

  const queuedReport: QueuedIssueReport = {
    queueId,
    tempIssueId,
    title: payload.title.trim(),
    description: payload.description.trim(),
    location: payload.location.trim(),
    photo_url: resolvedPhoto,
    lat: payload.lat ?? 22.0604,
    lng: payload.lng ?? 88.1095,
    predictedCategory: cResult.category,
    urgencyHits: uResult.count,
    urgentTerms: uResult.matchedTerms,
    matchedKeywords: cResult.matchedKeywords,
    createdAt: nowIso,
    syncedAt: null,
    syncStatus: 'pending',
    syncedIssueId: null,
    lastError: null,
  };

  const current = getQueuedReports();
  saveQueuedReports([queuedReport, ...current]);

  // Notify Service Worker & register Background Sync tag if supported
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg.active) {
        reg.active.postMessage({
          type: 'QUEUE_OFFLINE_REPORT',
          report: queuedReport,
        });
      }
      if ('sync' in reg && typeof (reg as unknown as { sync: { register: (t: string) => Promise<void> } }).sync?.register === 'function') {
        await (reg as unknown as { sync: { register: (t: string) => Promise<void> } }).sync.register('sync-haldia-issues');
      }
    } catch {
      // Ignore SW message error
    }
  }

  return {
    queuedReport,
    submissionResult: {
      id: tempIssueId,
      category: cResult.category,
      status: 'Open',
      similar_to: [],
      queuedOffline: true,
      queueId,
    },
  };
}

/**
 * Synchronizes all pending/failed queued issue reports to Cloud Firestore and /api/issues.
 */
export async function syncQueuedReportsNow(
  onIssueSynced?: (syncedId: number, queueId: string) => void
): Promise<{ syncedCount: number; remainingPending: number }> {
  if (isSyncInFlight) {
    const pending = getQueuedReports().filter((r) => r.syncStatus === 'pending').length;
    return { syncedCount: 0, remainingPending: pending };
  }

  if (!isEffectiveOnline()) {
    const pending = getQueuedReports().filter((r) => r.syncStatus === 'pending').length;
    return { syncedCount: 0, remainingPending: pending };
  }

  const allItems = getQueuedReports();
  const candidates = allItems.filter(
    (item) => item.syncStatus === 'pending' || item.syncStatus === 'failed'
  );
  if (candidates.length === 0) {
    return { syncedCount: 0, remainingPending: 0 };
  }

  isSyncInFlight = true;
  let syncedCount = 0;

  // Mark candidates as 'syncing'
  const workingList = allItems.map((item) =>
    item.syncStatus === 'pending' || item.syncStatus === 'failed'
      ? { ...item, syncStatus: 'syncing' as OfflineSyncStatus, lastError: null }
      : item
  );
  saveQueuedReports(workingList);

  const updatedList = [...workingList];

  for (let i = 0; i < updatedList.length; i++) {
    const item = updatedList[i];
    if (item.syncStatus !== 'syncing') continue;

    try {
      const firestoreRes = await createIssueInFirestore({
        title: item.title,
        description: item.description,
        location: item.location,
        photo_url: item.photo_url,
        lat: item.lat,
        lng: item.lng,
        website: '',
      });

      // Also mirror to Express SQLite backend best-effort
      try {
        await fetch('/api/issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            description: item.description,
            location: item.location,
            photo_url: item.photo_url,
            lat: item.lat,
            lng: item.lng,
            website: '',
          }),
        });
      } catch {
        // Ignore secondary SQLite sync failure if Firestore succeeded
      }

      updatedList[i] = {
        ...item,
        syncStatus: 'synced',
        syncedIssueId: firestoreRes.id,
        syncedAt: new Date().toISOString(),
        lastError: null,
      };
      syncedCount++;

      // Save to user's submitted issues list in localStorage
      try {
        const rawIds = localStorage.getItem('civicpulse_my_submitted_ids');
        const parsedIds: number[] = rawIds ? JSON.parse(rawIds) : [];
        if (Array.isArray(parsedIds) && !parsedIds.includes(firestoreRes.id)) {
          localStorage.setItem(
            'civicpulse_my_submitted_ids',
            JSON.stringify([firestoreRes.id, ...parsedIds])
          );
        }
      } catch {
        // Ignore
      }

      if (onIssueSynced) {
        onIssueSynced(firestoreRes.id, item.queueId);
      }

      window.dispatchEvent(
        new CustomEvent('civiccare-offline-report-synced', {
          detail: {
            queueId: item.queueId,
            tempIssueId: item.tempIssueId,
            syncedIssueId: firestoreRes.id,
          },
        })
      );
    } catch (err) {
      updatedList[i] = {
        ...item,
        syncStatus: 'failed',
        lastError:
          err instanceof Error ? err.message : 'Network error during background sync',
      };
    }
  }

  saveQueuedReports(updatedList);
  isSyncInFlight = false;
  requestServiceWorkerCacheStats();

  const remainingPending = updatedList.filter(
    (r) => r.syncStatus === 'pending' || r.syncStatus === 'failed'
  ).length;
  return { syncedCount, remainingPending };
}

export function clearSyncedReports(): void {
  const remaining = getQueuedReports().filter((item) => item.syncStatus !== 'synced');
  saveQueuedReports(remaining);
}

export function removeQueuedReport(queueId: string): void {
  const remaining = getQueuedReports().filter((item) => item.queueId !== queueId);
  saveQueuedReports(remaining);
}

export function requestServiceWorkerCacheStats(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((reg) => {
      if (reg.active) {
        reg.active.postMessage({ type: 'GET_SW_STATUS' });
      }
    })
    .catch(() => {});
}

let swInitialized = false;

/**
 * Registers `/sw.js` and wires up automatic online/offline sync listeners.
 */
export function registerHaldiaServiceWorker(): void {
  if (typeof window === 'undefined' || swInitialized) return;
  swInitialized = true;

  window.addEventListener('online', () => {
    notifySubscribers();
    if (isEffectiveOnline()) {
      void syncQueuedReportsNow();
    }
  });

  window.addEventListener('offline', () => {
    notifySubscribers();
  });

  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'SW_STATUS_UPDATE' || data.type === 'SW_ACTIVATED') {
      swCacheStats = {
        swActive: true,
        swVersion: data.version || '2.1.0-haldia',
        staticCachedCount:
          typeof data.staticCachedCount === 'number'
            ? data.staticCachedCount
            : swCacheStats.staticCachedCount,
        runtimeCachedCount:
          typeof data.runtimeCachedCount === 'number'
            ? data.runtimeCachedCount
            : swCacheStats.runtimeCachedCount,
        tileCachedCount:
          typeof data.tileCachedCount === 'number'
            ? data.tileCachedCount
            : swCacheStats.tileCachedCount,
      };
      notifySubscribers();
    } else if (data.type === 'OFFLINE_QUEUE_SYNC_REQUEST') {
      if (isEffectiveOnline()) {
        void syncQueuedReportsNow();
      }
    } else if (data.type === 'OFFLINE_REPORT_QUEUED' && data.report) {
      const current = getQueuedReports();
      if (!current.some((r) => r.queueId === data.report.queueId)) {
        saveQueuedReports([data.report as QueuedIssueReport, ...current]);
      }
    }
  });

  const registerNow = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      swCacheStats = {
        ...swCacheStats,
        swActive: true,
      };
      notifySubscribers();
      requestServiceWorkerCacheStats();

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              requestServiceWorkerCacheStats();
            }
          });
        }
      });

      // If online on boot and there are pending offline reports, sync them automatically
      if (isEffectiveOnline()) {
        void syncQueuedReportsNow();
      }
    } catch {
      // Service worker registration failed (e.g. restricted environment)
    }
  };

  if (document.readyState === 'complete') {
    void registerNow();
  } else {
    window.addEventListener('load', () => {
      void registerNow();
    });
  }
}
