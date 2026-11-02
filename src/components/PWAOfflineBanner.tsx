import React, { useState, useEffect, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  CloudUpload,
  CheckCircle2,
  Clock,
  Download,
  HardDrive,
  RefreshCw,
  Trash2,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Smartphone,
} from 'lucide-react';
import {
  QueuedIssueReport,
  ServiceWorkerCacheStats,
  getQueuedReports,
  getSimulatedOfflineMode,
  setSimulatedOfflineMode,
  isBrowserOnline,
  isEffectiveOnline,
  getServiceWorkerCacheStats,
  subscribeToOfflineQueue,
  syncQueuedReportsNow,
  clearSyncedReports,
  removeQueuedReport,
  enqueueOfflineIssueReport,
  requestServiceWorkerCacheStats,
} from '../lib/offlineQueue';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const ios =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstalled,
    canInstallNatively: !!deferredPrompt,
    isIOS,
    promptInstall,
  };
}

export const PWAInstallButton: React.FC = () => {
  const { isInstalled, canInstallNatively, isIOS, promptInstall } =
    usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (canInstallNatively) {
      await promptInstall();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Install CivicCare Haldia for offline access"
        className="hidden sm:inline-flex h-9 px-3 rounded-[8px] border border-[#d8dbe2] bg-[#f7f8fb] hover:bg-[#e8e8fb] text-[#17181d] hover:text-[#4f46c8] text-xs font-semibold items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-[#4f46c8]" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-[12px] bg-white border border-[#d8dbe2] p-5 shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#d8dbe2] pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#4f46c8]" />
                <h3 className="text-base font-bold text-[#17181d]">
                  Install CivicCare Haldia (Offline PWA)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-[#5e606b] hover:text-[#17181d] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <p className="text-xs text-[#5e606b] leading-relaxed">
                Tap the <strong>Share</strong> button in Safari&apos;s toolbar
                and select <strong>&quot;Add to Home Screen&quot;</strong> to
                launch CivicCare Haldia in full-screen offline mode across all 8
                Haldia wards.
              </p>
            ) : (
              <p className="text-xs text-[#5e606b] leading-relaxed">
                To install CivicCare Haldia with offline Service Worker caching,
                open this app in a standalone browser tab and click the{' '}
                <strong>Install</strong> icon in the address bar (or open your
                browser menu and choose <strong>&quot;Install App&quot;</strong>
                ).
              </p>
            )}

            <div className="p-3 rounded-[8px] bg-[#f7f8fb] border border-[#d8dbe2] text-[11px] text-[#5e606b] space-y-1">
              <div className="font-semibold text-[#17181d]">
                Offline Capabilities Enabled by Service Worker (/sw.js):
              </div>
              <div>
                • Static app shell, 28 Haldia evidence photos &amp; map tiles
                cached locally
              </div>
              <div>
                • Issue reports submitted in poor connectivity zones are queued
                in IndexedDB and synced automatically when online
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="h-9 px-4 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-xs font-semibold cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface OfflineConnectivityBannerProps {
  onNavigateIssue: (id: number) => void;
  onRecordSubmittedIssue?: (id: number) => void;
}

export const OfflineConnectivityBanner: React.FC<
  OfflineConnectivityBannerProps
> = ({ onNavigateIssue, onRecordSubmittedIssue }) => {
  const [queuedReports, setQueuedReports] = useState<QueuedIssueReport[]>(() =>
    getQueuedReports()
  );
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(() =>
    getSimulatedOfflineMode()
  );
  const [browserOnline, setBrowserOnline] = useState<boolean>(() =>
    isBrowserOnline()
  );
  const [swStats, setSwStats] = useState<ServiceWorkerCacheStats>(() =>
    getServiceWorkerCacheStats()
  );
  const [syncingNow, setSyncingNow] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [syncBannerMessage, setSyncBannerMessage] = useState<string | null>(
    null
  );

  const refreshState = useCallback(() => {
    setQueuedReports(getQueuedReports());
    setSimulatedOffline(getSimulatedOfflineMode());
    setBrowserOnline(isBrowserOnline());
    setSwStats(getServiceWorkerCacheStats());
  }, []);

  useEffect(() => {
    refreshState();
    requestServiceWorkerCacheStats();
    const unsub = subscribeToOfflineQueue(refreshState);

    const handleReportSynced = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          queueId: string;
          tempIssueId: number;
          syncedIssueId: number;
        }>
      ).detail;
      if (detail?.syncedIssueId) {
        if (onRecordSubmittedIssue) {
          onRecordSubmittedIssue(detail.syncedIssueId);
        }
        setSyncBannerMessage(
          `Offline queued report (${detail.queueId}) synced to Cloud Firestore as Issue #${detail.syncedIssueId}.`
        );
      }
      refreshState();
    };

    window.addEventListener(
      'civiccare-offline-report-synced',
      handleReportSynced
    );
    return () => {
      unsub();
      window.removeEventListener(
        'civiccare-offline-report-synced',
        handleReportSynced
      );
    };
  }, [refreshState, onRecordSubmittedIssue]);

  const effectiveOnline = browserOnline && !simulatedOffline;
  const pendingReports = queuedReports.filter(
    (r) =>
      r.syncStatus === 'pending' ||
      r.syncStatus === 'syncing' ||
      r.syncStatus === 'failed'
  );
  const syncedReports = queuedReports.filter((r) => r.syncStatus === 'synced');

  const handleToggleOfflineSimulation = () => {
    const nextOffline = !simulatedOffline;
    setSimulatedOfflineMode(nextOffline);
    if (!nextOffline) {
      setSyncBannerMessage(
        'Connectivity restored in Haldia. Synchronizing queued offline reports...'
      );
    } else {
      setSyncBannerMessage(
        'Simulated Offline Mode enabled (Haldia low-signal zone). New issue reports will be stored in the Service Worker Offline Queue.'
      );
    }
  };

  const handleManualSync = async () => {
    if (syncingNow) return;
    if (simulatedOffline) {
      // Automatically switch back online when the user explicitly clicks "Reconnect & Sync Now"
      setSimulatedOfflineMode(false);
    }
    setSyncingNow(true);
    try {
      const res = await syncQueuedReportsNow((syncedId) => {
        if (onRecordSubmittedIssue) {
          onRecordSubmittedIssue(syncedId);
        }
      });
      if (res.syncedCount > 0) {
        setSyncBannerMessage(
          `Successfully synced ${res.syncedCount} queued offline report${
            res.syncedCount === 1 ? '' : 's'
          } to Cloud Firestore.`
        );
      }
    } finally {
      setSyncingNow(false);
      refreshState();
    }
  };

  const handleQueueSampleOfflineReport = async () => {
    const sample = await enqueueOfflineIssueReport({
      title: 'Broken culvert slab and waterlogging near Sutahata port road',
      description:
        'Heavy port trucks cracked the concrete drainage culvert near Sutahata Ward 3 crossing. Rainwater and drain sludge are overflowing onto the main carriageway during poor network weather.',
      location: 'Sutahata Port Approach Crossing, Ward 3, Haldia',
      photo_url: '/assets/issues/issue-13.jpg',
      lat: 22.1325,
      lng: 88.141,
    });
    setDrawerOpen(true);
    setSyncBannerMessage(
      `Queued report ${sample.queuedReport.queueId} locally (${sample.queuedReport.predictedCategory} · ${sample.queuedReport.urgencyHits} urgency hits). Ready to sync when online.`
    );
  };

  return (
    <div className="bg-white border-b border-[#d8dbe2] px-3 sm:px-6 py-2">
      <div className="max-w-[1320px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Service Worker & Network Connectivity Status */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] font-semibold border ${
              effectiveOnline
                ? 'bg-[#e6f4ed] text-[#127848] border-[#b7e1cd]'
                : 'bg-[#fef3c7] text-[#92400e] border-[#fcd34d]'
            }`}
          >
            {effectiveOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 shrink-0" />
                <span>Haldia Network: Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {simulatedOffline
                    ? 'Haldia Offline Mode (Simulated Poor Signal)'
                    : 'Offline — Service Worker Active'}
                </span>
              </>
            )}
          </div>

          <div className="hidden md:inline-flex items-center gap-1.5 text-[#5e606b] font-mono text-[11px]">
            <HardDrive className="w-3.5 h-3.5 text-[#4f46c8]" />
            <span>
              SW Cache: {swStats.staticCachedCount} static assets
              {swStats.tileCachedCount > 0
                ? ` · ${swStats.tileCachedCount} map tiles`
                : ' · Map tiles & queue ready'}
            </span>
          </div>

          {pendingReports.length > 0 && (
            <button
              type="button"
              onClick={() => setDrawerOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#e8e8fb] border border-[#c9c8f1] text-[#4f46c8] font-semibold cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {pendingReports.length} Queued Offline Report
                {pendingReports.length === 1 ? '' : 's'}
              </span>
            </button>
          )}
        </div>

        {/* Right: Offline Simulation Toggle, Sync Button & Queue Inspector */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleOfflineSimulation}
            className={`h-7 px-2.5 rounded-[6px] border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              simulatedOffline
                ? 'bg-[#92400e] text-white border-[#92400e] hover:bg-[#78350f]'
                : 'bg-[#f7f8fb] text-[#17181d] border-[#d8dbe2] hover:bg-[#eef0f6]'
            }`}
          >
            {simulatedOffline ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>Reconnect &amp; Auto-Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-[#92400e]" />
                <span>Simulate Offline Mode</span>
              </>
            )}
          </button>

          {pendingReports.length > 0 && (
            <button
              type="button"
              disabled={syncingNow}
              onClick={handleManualSync}
              className="h-7 px-2.5 rounded-[6px] bg-[#4f46c8] hover:bg-[#4338b5] disabled:opacity-50 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 ${syncingNow ? 'animate-spin' : ''}`}
              />
              <span>
                {syncingNow
                  ? 'Syncing...'
                  : `Sync ${pendingReports.length} Queued Now`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            className="h-7 px-2.5 rounded-[6px] border border-[#d8dbe2] bg-white hover:bg-[#f7f8fb] text-[#5e606b] hover:text-[#17181d] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5 text-[#4f46c8]" />
            <span>Offline Queue ({queuedReports.length})</span>
            {drawerOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Transient Sync Status Notice */}
      {syncBannerMessage && (
        <div className="max-w-[1320px] mx-auto mt-2 px-3 py-2 rounded-[8px] bg-[#e8e8fb]/70 border border-[#c9c8f1] text-xs text-[#17181d] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#4f46c8] shrink-0" />
            <span>{syncBannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncBannerMessage(null)}
            className="text-[#5e606b] hover:text-[#17181d] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Expandable Service Worker & Offline Issue Queue Manager */}
      {drawerOpen && (
        <div className="max-w-[1320px] mx-auto mt-2.5 p-4 rounded-[10px] bg-[#f7f8fb] border border-[#d8dbe2] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d8dbe2] pb-2.5">
            <div>
              <h3 className="text-xs font-bold text-[#17181d] flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#4f46c8]" />
                <span>
                  Haldia Offline Service Worker Cache &amp; Queued Issue Reports
                  (IndexedDB Store-and-Forward)
                </span>
              </h3>
              <p className="text-[11px] text-[#5e606b] mt-0.5">
                When connectivity drops in Haldia port, industrial, or rural
                wards, reports are triaged locally and queued in IndexedDB until
                network returns.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleQueueSampleOfflineReport}
                className="h-7 px-2.5 rounded-[6px] border border-[#c9c8f1] bg-white hover:bg-[#e8e8fb] text-[#4f46c8] text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CloudUpload className="w-3 h-3" />
                <span>+ Queue Demo Offline Report</span>
              </button>

              {syncedReports.length > 0 && (
                <button
                  type="button"
                  onClick={clearSyncedReports}
                  className="h-7 px-2.5 rounded-[6px] border border-[#d8dbe2] bg-white hover:bg-[#fdeceb] text-[#5e606b] hover:text-[#c7342e] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Synced History</span>
                </button>
              )}
            </div>
          </div>

          {queuedReports.length === 0 ? (
            <div className="py-4 text-center text-xs text-[#5e606b]">
              No offline reports currently in queue. Toggle{' '}
              <strong>&quot;Simulate Offline Mode&quot;</strong> above and
              submit any report (or click{' '}
              <strong>&quot;+ Queue Demo Offline Report&quot;</strong>) to test
              offline store-and-forward queuing.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {queuedReports.map((item) => (
                <div
                  key={item.queueId}
                  className="p-3 rounded-[8px] bg-white border border-[#d8dbe2] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-[#4f46c8]">
                        {item.queueId}
                      </span>
                      <span className="font-semibold text-[#17181d] truncate">
                        {item.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#f4f5f8] border border-[#d8dbe2] text-[10px] font-semibold text-[#5e606b]">
                        {item.predictedCategory}
                      </span>
                      {item.urgencyHits > 0 && (
                        <span className="px-2 py-0.5 rounded-[4px] bg-[#fae4e4] text-[#a33e3e] text-[10px] font-semibold">
                          {item.urgencyHits} Urgency Hits
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#5e606b] truncate">
                      {item.location} · Queued{' '}
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                    {item.lastError && (
                      <div className="text-[11px] text-[#a33e3e] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{item.lastError}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.syncStatus === 'pending' && (
                      <span className="px-2.5 py-1 rounded-[6px] bg-[#fef3c7] text-[#92400e] font-semibold text-[11px] inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Pending Sync</span>
                      </span>
                    )}
                    {item.syncStatus === 'syncing' && (
                      <span className="px-2.5 py-1 rounded-[6px] bg-[#e8e8fb] text-[#4f46c8] font-semibold text-[11px] inline-flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Syncing...</span>
                      </span>
                    )}
                    {item.syncStatus === 'failed' && (
                      <span className="px-2.5 py-1 rounded-[6px] bg-[#fae4e4] text-[#a33e3e] font-semibold text-[11px]">
                        Retry Queued
                      </span>
                    )}
                    {item.syncStatus === 'synced' && item.syncedIssueId && (
                      <button
                        type="button"
                        onClick={() => onNavigateIssue(item.syncedIssueId!)}
                        className="px-2.5 py-1 rounded-[6px] bg-[#e6f4ed] hover:bg-[#d1ebd9] text-[#127848] font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Synced → Issue #{item.syncedIssueId}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeQueuedReport(item.queueId)}
                      title="Remove from queue"
                      className="p-1.5 rounded-[6px] text-[#858793] hover:text-[#c7342e] hover:bg-[#fdeceb] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
