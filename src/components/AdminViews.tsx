import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Mail,
  MessageSquare,
  RotateCcw,
  X,
  BarChart3,
  Map as MapIcon,
  Copy,
  Check,
  UserCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  AdminIssueItem,
  IssueCategory,
  IssueStatus,
  NotificationPreview,
  StatsResponse,
  TimelineEvent,
} from '../types';
import { AuthorityShieldIllustration } from './Illustrations';
import { HaldiaIssueMap, HaldiaSingleIssueMap } from './HaldiaIssueMap';
import { CivicRealImage } from './CivicRealImage';
import { IssueActivityLog } from './IssueActivityLog';
import { getRealPhotoForCategory } from '../lib/syntheticAssets';
import {
  MASTER_AUTHORITY_KEY,
  isValidAuthorityKey,
  signInWithGooglePopup,
  signOutFirebaseUser,
  getDashboardDataFromFirestore,
  getIssueByIdFromFirestore,
  updateIssueStatusInFirestore,
  resetFirestoreToSeed,
} from '../lib/firebase';

interface AdminViewsProps {
  token: string | null;
  firebaseUser: User | null;
  onSaveToken: (token: string) => void;
  onClearToken: () => void;
  selectedIssueId: number | null;
  onSelectIssue: (id: number | null) => void;
}

export const AdminViews: React.FC<AdminViewsProps> = ({
  token,
  firebaseUser,
  onSaveToken,
  onClearToken,
  selectedIssueId,
  onSelectIssue,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifyingAuth, setVerifyingAuth] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [issues, setIssues] = useState<AdminIssueItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Filters & Sort
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'priority' | 'newest' | 'oldest'>('priority');
  const [searchQuery, setSearchQuery] = useState('');
  const [visualMode, setVisualMode] = useState<'chart' | 'map'>('map');

  // Detail & Status Transition State
  const [detailTimeline, setDetailTimeline] = useState<TimelineEvent[]>([]);
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<NotificationPreview | null>(null);
  const [resettingSeed, setResettingSeed] = useState(false);

  const isAuthenticated = Boolean(token && isValidAuthorityKey(token)) || Boolean(firebaseUser);

  const fetchDashboardData = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await getDashboardDataFromFirestore({
        category: categoryFilter,
        status: statusFilter,
        sort: sortBy,
      });
      setIssues(data.items);
      setStats(data.stats);
    } catch {
      // Keep existing state on transient error
    } finally {
      setLoadingData(false);
    }
  }, [categoryFilter, statusFilter, sortBy]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, fetchDashboardData]);

  // Fetch timeline from Firestore when an issue is selected
  useEffect(() => {
    if (!selectedIssueId) {
      setDetailTimeline([]);
      setStatusNote('');
      setStatusError(null);
      setStatusSuccess(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getIssueByIdFromFirestore(selectedIssueId);
        if (data && !cancelled) {
          setDetailTimeline(data.timeline || []);
        }
      } catch {
        // Ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedIssueId]);

  const handleCopyMasterKey = () => {
    navigator.clipboard.writeText(MASTER_AUTHORITY_KEY);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleKeyLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setAuthError('Please enter your Firebase Authority Master Key.');
      return;
    }

    setVerifyingAuth(true);
    setAuthError(null);

    if (!isValidAuthorityKey(trimmed)) {
      setAuthError(
        `Invalid Authority Key (401 Unauthorized). Use your assigned key: ${MASTER_AUTHORITY_KEY}`
      );
      setVerifyingAuth(false);
      return;
    }

    onSaveToken(trimmed);
    setVerifyingAuth(false);
  };

  const handleGoogleSignIn = async () => {
    setVerifyingAuth(true);
    setAuthError(null);
    try {
      await signInWithGooglePopup();
      onSaveToken(MASTER_AUTHORITY_KEY);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google sign-in popup was closed or blocked. You can also use your Master Key below.'
      );
    } finally {
      setVerifyingAuth(false);
    }
  };

  const handleSignOutAll = async () => {
    if (firebaseUser) {
      await signOutFirebaseUser();
    }
    onClearToken();
  };

  const handleStatusUpdate = async (targetStatus: IssueStatus) => {
    if (!isAuthenticated || !selectedIssueId || updatingStatus) return;

    setUpdatingStatus(true);
    setStatusError(null);
    setStatusSuccess(null);

    try {
      const result = await updateIssueStatusInFirestore({
        issueId: selectedIssueId,
        targetStatus,
        note: statusNote,
        authorityKey: token || MASTER_AUTHORITY_KEY,
      });

      setDetailTimeline(result.timeline);
      setStatusNote('');
      setStatusSuccess(`Status updated to "${targetStatus}" in Cloud Firestore.`);
      setLastNotification(result.notificationPreview);
      await fetchDashboardData();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Could not update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleResetDemoSeed = async () => {
    if (!isAuthenticated || resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetFirestoreToSeed(token || MASTER_AUTHORITY_KEY);
      onSelectIssue(null);
      setLastNotification(null);
      await fetchDashboardData();
    } finally {
      setResettingSeed(false);
    }
  };

  // 1. Unauthenticated Token & Firebase Auth Gate View (design.md Section 10)
  if (!isAuthenticated) {
    return (
      <div className="max-w-5xl mx-auto py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Heading, supporting paragraph, master key callout, illustration */}
          <div className="lg:col-span-7 space-y-5">
            <div className="text-xs font-semibold text-[#4f46c8]">
              Firebase Auth &amp; Cloud Firestore Dispatch Console
            </div>
            <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[#17181d] leading-tight">
              Priority-Ranked Civic Triage for Ward Authorities
            </h1>
            <p className="text-[15px] text-[#5e606b] leading-relaxed max-w-xl">
              Backed by Cloud Firestore and Firebase Authentication. Sign in with Google or unlock directly using your dedicated Authority Master Key below.
            </p>

            {/* Dedicated Master Key Card for the User */}
            <div className="bg-white border border-[#c9c8f1] rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-xl">
              <div>
                <div className="text-xs font-semibold text-[#4f46c8]">
                  Your Assigned Firebase Authority Master Key
                </div>
                <div className="text-lg font-mono font-bold text-[#17181d] mt-0.5">
                  {MASTER_AUTHORITY_KEY}
                </div>
                <div className="text-[11px] text-[#5e606b]">
                  Also bootstrapped for Google account: bappadityakuilya@gmail.com
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyMasterKey}
                className="h-9 px-3.5 rounded-[8px] border border-[#d8dbe2] bg-[#f7f8fb] hover:bg-[#e8e8fb] text-xs font-semibold text-[#17181d] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#25985a]" />
                    <span className="text-[#25985a]">Copied Key</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#4f46c8]" />
                    <span>Copy Key</span>
                  </>
                )}
              </button>
            </div>

            <AuthorityShieldIllustration className="w-full max-w-md h-40" />
          </div>

          {/* Right Column: Bordered Authentication Card (design.md Section 10) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[360px] bg-white border border-[#d8dbe2] rounded-[16px] p-6 space-y-5 shadow-xs">
              <div className="flex items-center gap-3 border-b border-[#d8dbe2] pb-4">
                <div className="w-10 h-10 rounded-[10px] bg-[#e8e8fb] text-[#4f46c8] flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#17181d]">
                    Authority Sign In
                  </h2>
                  <p className="text-xs text-[#5e606b]">
                    Firebase Google Auth or Master Key
                  </p>
                </div>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="p-3 rounded-[8px] border border-[#a33e3e] bg-[#fae4e4] text-xs text-[#a33e3e] font-medium"
                >
                  {authError}
                </div>
              )}

              {/* Firebase Google Auth Button */}
              <button
                type="button"
                disabled={verifyingAuth}
                onClick={handleGoogleSignIn}
                className="w-full h-11 px-4 rounded-[8px] border border-[#d8dbe2] bg-white hover:bg-[#f7f8fb] text-[#17181d] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#4f46c8]" />
                <span>Sign In with Google (Firebase Auth)</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#d8dbe2]" />
                <span className="shrink mx-3 text-[11px] text-[#858793]">OR USE MASTER KEY</span>
                <div className="flex-grow border-t border-[#d8dbe2]" />
              </div>

              <form onSubmit={handleKeyLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="admin-token-input" className="block text-xs font-semibold text-[#17181d] mb-1.5">
                    Authority Master Key
                  </label>
                  <input
                    id="admin-token-input"
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder={MASTER_AUTHORITY_KEY}
                    className="w-full h-11 px-3.5 rounded-[8px] border border-[#d8dbe2] text-sm font-mono bg-white text-[#17181d] focus:outline-none focus:ring-2 focus:ring-[#4f46c8]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyingAuth}
                  className="w-full h-11 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-sm font-semibold shadow-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{verifyingAuth ? 'Verifying...' : 'Unlock with Master Key'}</span>
                </button>
              </form>

              {/* 1-Click Auto-Fill Key */}
              <div className="pt-3 border-t border-[#d8dbe2]">
                <button
                  type="button"
                  onClick={() => {
                    setTokenInput(MASTER_AUTHORITY_KEY);
                    onSaveToken(MASTER_AUTHORITY_KEY);
                  }}
                  className="w-full h-10 px-3 rounded-[8px] border border-[#c9c8f1] bg-[#e8e8fb]/60 hover:bg-[#e8e8fb] text-[#4f46c8] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>1-Click Unlock ({MASTER_AUTHORITY_KEY})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredIssues = issues.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      `#${item.id}`.includes(q)
    );
  });

  const selectedIssue = issues.find((i) => i.id === selectedIssueId) || null;
  const categories: IssueCategory[] = ['Road', 'Water', 'Electricity', 'Sanitation', 'Other'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#17181d] leading-tight">
            Ward Authority Triage Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5e606b] mt-1">
            <span>Cloud Firestore Live Queue</span>
            <span aria-hidden="true">·</span>
            <span>
              {firebaseUser?.email
                ? `Signed in as ${firebaseUser.email}`
                : `Key: ${MASTER_AUTHORITY_KEY}`}
            </span>
            {stats && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-[#25985a] font-medium">
                  Classifier Benchmark: {stats.classifier_accuracy.percentage}% ({stats.classifier_accuracy.correct}/{stats.classifier_accuracy.total})
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchDashboardData}
            className="h-10 px-3.5 rounded-[8px] border border-[#d8dbe2] bg-white hover:bg-[#f7f8fb] text-xs font-semibold text-[#17181d] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            <span>Sync Firestore</span>
          </button>
          <button
            type="button"
            onClick={handleResetDemoSeed}
            disabled={resettingSeed}
            className="h-10 px-3.5 rounded-[8px] border border-[#d8dbe2] bg-white hover:bg-[#f7f8fb] text-xs font-semibold text-[#17181d] inline-flex items-center gap-1.5 cursor-pointer"
            title="Reset Cloud Firestore back to the 28 seeded Haldia issues"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#4f46c8]" />
            <span>{resettingSeed ? 'Re-seeding...' : 'Reset 28 Seed Issues'}</span>
          </button>
          <button
            type="button"
            onClick={handleSignOutAll}
            className="h-10 px-3.5 rounded-[8px] border border-[#d8dbe2] bg-white hover:bg-[#fae4e4] hover:border-[#a33e3e] text-xs font-semibold text-[#5e606b] hover:text-[#a33e3e] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Session</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-4">
            <div className="text-xs font-medium text-[#5e606b]">Total Reports</div>
            <div className="text-[26px] font-bold font-mono tabular-nums text-[#17181d] mt-1">
              {stats.total}
            </div>
            <div className="text-[11px] text-[#858793] mt-0.5">Across 5 departments</div>
          </div>

          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-4">
            <div className="text-xs font-medium text-[#a33e3e]">High-Priority Open</div>
            <div className="text-[26px] font-bold font-mono tabular-nums text-[#a33e3e] mt-1">
              {stats.high_open}
            </div>
            <div className="text-[11px] text-[#5e606b] mt-0.5">Score &ge; 60 (Immediate action)</div>
          </div>

          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-4">
            <div className="text-xs font-medium text-[#5e606b]">Open Queue</div>
            <div className="text-[26px] font-bold font-mono tabular-nums text-[#17181d] mt-1">
              {stats.by_status.Open || 0}
            </div>
            <div className="text-[11px] text-[#858793] mt-0.5">Awaiting dispatch</div>
          </div>

          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-4">
            <div className="text-xs font-medium text-[#344da6]">In Progress</div>
            <div className="text-[26px] font-bold font-mono tabular-nums text-[#344da6] mt-1">
              {stats.by_status['In Progress'] || 0}
            </div>
            <div className="text-[11px] text-[#858793] mt-0.5">Field crew assigned</div>
          </div>

          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-4 col-span-2 sm:col-span-1">
            <div className="text-xs font-medium text-[#25985a]">Resolved</div>
            <div className="text-[26px] font-bold font-mono tabular-nums text-[#25985a] mt-1">
              {stats.by_status.Resolved || 0}
            </div>
            <div className="text-[11px] text-[#858793] mt-0.5">Verified &amp; closed</div>
          </div>
        </div>
      )}

      {/* Category & Status Bar Chart + Interactive Haldia Map Toggle (R4 + R13) */}
      {stats && (
        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d8dbe2] pb-3">
            <div>
              <h2 className="text-base font-semibold text-[#17181d]">
                {visualMode === 'chart'
                  ? 'Department Workload by Category & Status (R4)'
                  : 'Haldia Geographic Issue Distribution (R13 Map View)'}
              </h2>
              <p className="text-xs text-[#5e606b]">
                {visualMode === 'chart'
                  ? 'Click any category bar to filter the dispatch queue below'
                  : 'Click any issue marker on the OpenStreetMap canvas to open its dispatch drawer'}
              </p>
            </div>

            <div className="inline-flex items-center p-1 rounded-[8px] bg-[#f4f5f8] border border-[#d8dbe2] self-start">
              <button
                type="button"
                onClick={() => setVisualMode('chart')}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  visualMode === 'chart'
                    ? 'bg-white text-[#4f46c8] shadow-xs'
                    : 'text-[#5e606b] hover:text-[#17181d]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Category Chart</span>
              </button>
              <button
                type="button"
                onClick={() => setVisualMode('map')}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  visualMode === 'map'
                    ? 'bg-white text-[#4f46c8] shadow-xs'
                    : 'text-[#5e606b] hover:text-[#17181d]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Haldia Map (R13)</span>
              </button>
            </div>
          </div>

          {visualMode === 'chart' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {categories.map((cat) => {
                  const totalCat = stats.by_category[cat] || 0;
                  const openCount = stats.by_category_status[cat]?.Open || 0;
                  const progCount = stats.by_category_status[cat]?.['In Progress'] || 0;
                  const resCount = stats.by_category_status[cat]?.Resolved || 0;
                  const maxTotal = Math.max(...Object.values(stats.by_category), 1);

                  const openPct = Math.round((openCount / maxTotal) * 100);
                  const progPct = Math.round((progCount / maxTotal) * 100);
                  const resPct = Math.round((resCount / maxTotal) * 100);
                  const isSelected = categoryFilter === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(isSelected ? 'All' : cat)}
                      className={`text-left p-3.5 rounded-[10px] border transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#4f46c8] bg-[#e8e8fb]/40'
                          : 'border-[#d8dbe2] bg-[#f7f8fb] hover:border-[#c7cad3]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#17181d]">{cat}</span>
                        <span className="text-sm font-bold font-mono tabular-nums text-[#4f46c8]">
                          {totalCat}
                        </span>
                      </div>

                      <div className="w-full h-3 rounded-[4px] bg-[#e4e6ed] overflow-hidden flex">
                        {openCount > 0 && (
                          <div
                            style={{ width: `${openPct}%` }}
                            className="bg-[#a33e3e] h-full"
                            title={`Open: ${openCount}`}
                          />
                        )}
                        {progCount > 0 && (
                          <div
                            style={{ width: `${progPct}%` }}
                            className="bg-[#344da6] h-full"
                            title={`In Progress: ${progCount}`}
                          />
                        )}
                        {resCount > 0 && (
                          <div
                            style={{ width: `${resPct}%` }}
                            className="bg-[#25985a] h-full"
                            title={`Resolved: ${resCount}`}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#5e606b] mt-2">
                        <span>Open: {openCount}</span>
                        <span>Prog: {progCount}</span>
                        <span>Res: {resCount}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5e606b] pt-1">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#a33e3e] inline-block" />
                    <span>Open</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#344da6] inline-block" />
                    <span>In Progress</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#25985a] inline-block" />
                    <span>Resolved</span>
                  </span>
                </div>
                {categoryFilter !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('All')}
                    className="text-xs font-semibold text-[#4f46c8] hover:underline cursor-pointer"
                  >
                    Clear category filter ({categoryFilter})
                  </button>
                )}
              </div>
            </div>
          ) : (
            <HaldiaIssueMap
              issues={filteredIssues}
              selectedIssueId={selectedIssueId}
              onSelectIssue={(id) => onSelectIssue(id)}
            />
          )}
        </div>
      )}

      {/* Main Content Split: Queue Table + Selected Issue Detail Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div
          className={`${
            selectedIssue ? 'xl:col-span-7' : 'xl:col-span-12'
          } bg-white border border-[#d8dbe2] rounded-[12px] overflow-hidden`}
        >
          {/* Filter & Search Toolbar */}
          <div className="p-4 border-b border-[#d8dbe2] space-y-3 bg-[#f7f8fb]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1">
                {(['All', 'Road', 'Water', 'Electricity', 'Sanitation', 'Other'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`h-8 px-3 rounded-[6px] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-[#4f46c8] text-white'
                          : 'bg-white border border-[#d8dbe2] text-[#5e606b] hover:text-[#17181d]'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#5e606b]" />
                  <label htmlFor="status-filter" className="text-xs font-medium text-[#5e606b]">
                    Status:
                  </label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 px-2.5 rounded-[6px] border border-[#d8dbe2] bg-white text-xs font-medium text-[#17181d]"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div className="inline-flex items-center gap-1.5">
                  <label htmlFor="sort-filter" className="text-xs font-medium text-[#5e606b]">
                    Sort:
                  </label>
                  <select
                    id="sort-filter"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as 'priority' | 'newest' | 'oldest')
                    }
                    className="h-8 px-2.5 rounded-[6px] border border-[#d8dbe2] bg-white text-xs font-medium text-[#17181d]"
                  >
                    <option value="priority">Priority (Highest First)</option>
                    <option value="newest">Newest Reported</option>
                    <option value="oldest">Oldest Reported</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#858793] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter queue by title, locality (e.g. Durgachak, Hatiberia), or #ID..."
                  className="w-full h-9 pl-8 pr-3 rounded-[8px] border border-[#d8dbe2] bg-white text-xs text-[#17181d] placeholder:text-[#858793] focus:outline-none focus:ring-2 focus:ring-[#4f46c8]"
                />
              </div>
              <div className="text-xs font-mono tabular-nums text-[#5e606b] shrink-0">
                Showing {filteredIssues.length} of {issues.length}
              </div>
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="text-sm font-semibold text-[#17181d]">
                No issues match the current filters
              </div>
              <p className="text-xs text-[#5e606b]">
                Try clearing the category, status, or search filter to view all Haldia reports.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('All');
                  setStatusFilter('All');
                  setSearchQuery('');
                }}
                className="h-9 px-4 rounded-[8px] border border-[#d8dbe2] bg-white hover:bg-[#f7f8fb] text-xs font-semibold text-[#4f46c8] cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Data Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#d8dbe2] bg-[#f7f8fb] text-[12px] font-semibold text-[#5e606b]">
                      <th className="py-2.5 pl-4 pr-2 w-16">ID</th>
                      <th className="py-2.5 px-2 w-16">Photo</th>
                      <th className="py-2.5 px-2 w-28 text-right">Priority</th>
                      <th className="py-2.5 px-3">Issue &amp; Locality</th>
                      <th className="py-2.5 px-2 w-28">Department</th>
                      <th className="py-2.5 px-2 w-28">Status</th>
                      <th className="py-2.5 px-2 w-20 text-right">Similar</th>
                      <th className="py-2.5 pl-2 pr-4 w-20 text-right">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d8dbe2] text-[14px]">
                    {filteredIssues.map((row) => {
                      const isSelected = row.id === selectedIssueId;
                      return (
                        <tr
                          key={row.id}
                          onClick={() => onSelectIssue(row.id)}
                          className={`h-[52px] transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#e8e8fb]/70' : 'hover:bg-[#f7f8fb]'
                          }`}
                        >
                          <td className="py-2 pl-4 pr-2 font-mono tabular-nums font-semibold text-[#4f46c8]">
                            #{row.id}
                          </td>
                          <td className="py-2 px-2">
                            <div className="w-11 h-8 rounded-[5px] overflow-hidden border border-[#d8dbe2] bg-[#171925]">
                              <CivicRealImage
                                category={row.category}
                                photoUrl={row.photo_url}
                                issueId={row.id}
                                alt={row.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                            <span
                              className={`font-bold ${
                                row.band === 'High' && row.status !== 'Resolved'
                                  ? 'text-[#a33e3e]'
                                  : row.band === 'Medium' && row.status !== 'Resolved'
                                  ? 'text-[#344da6]'
                                  : 'text-[#5e606b]'
                              }`}
                            >
                              {row.priority}
                            </span>
                            <span className="text-xs text-[#5e606b] ml-1.5">
                              ({row.band})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[260px]">
                            <div className="font-semibold text-[#17181d] truncate">
                              {row.title}
                            </div>
                            <div className="text-xs text-[#5e606b] truncate">
                              {row.location}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-xs font-medium text-[#17181d]">
                            {row.category}
                          </td>
                          <td className="py-2.5 px-2 text-xs font-semibold whitespace-nowrap">
                            {row.status === 'Resolved' && (
                              <span className="text-[#25985a] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Resolved</span>
                              </span>
                            )}
                            {row.status === 'In Progress' && (
                              <span className="text-[#344da6] inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>In Progress</span>
                              </span>
                            )}
                            {row.status === 'Open' && (
                              <span className="text-[#a33e3e] inline-flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Open</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums text-xs text-[#5e606b]">
                            {row.similar_count > 0 ? `+${row.similar_count} dup` : '0'}
                          </td>
                          <td className="py-2.5 pl-2 pr-4 text-right font-mono tabular-nums text-xs text-[#5e606b]">
                            {row.age_days}d
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards */}
              <div className="md:hidden divide-y divide-[#d8dbe2]">
                {filteredIssues.map((row) => {
                  const isSelected = row.id === selectedIssueId;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => onSelectIssue(row.id)}
                      className={`w-full text-left p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#e8e8fb]/70' : 'hover:bg-[#f7f8fb]'
                      }`}
                    >
                      <div className="w-16 h-14 rounded-[6px] overflow-hidden border border-[#d8dbe2] bg-[#171925] shrink-0">
                        <CivicRealImage
                          category={row.category}
                          photoUrl={row.photo_url}
                          issueId={row.id}
                          alt={row.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-mono tabular-nums">
                            <span className="font-bold text-[#4f46c8]">#{row.id}</span>
                            <span className="mx-1.5 text-[#858793]">·</span>
                            <span className="font-semibold text-[#17181d]">{row.category}</span>
                            <span className="mx-1.5 text-[#858793]">·</span>
                            <span className="text-[#5e606b]">{row.status}</span>
                          </div>
                          <div className="text-xs font-mono tabular-nums font-bold text-[#a33e3e]">
                            {row.priority} ({row.band})
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-[#17181d] truncate">
                          {row.title}
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#5e606b]">
                          <span className="truncate">{row.location}</span>
                          <span className="font-mono tabular-nums shrink-0 ml-2">
                            {row.similar_count} sim · {row.age_days}d
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Selected Issue Detail & Dispatch Drawer */}
        {selectedIssue && (
          <div className="xl:col-span-5 bg-white border border-[#d8dbe2] rounded-[12px] p-5 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#d8dbe2] pb-3.5">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#5e606b]">
                  <span className="font-mono font-bold text-[#4f46c8]">
                    Issue #{selectedIssue.id}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#17181d]">{selectedIssue.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedIssue.status}</span>
                </div>
                <h2 className="text-lg font-bold text-[#17181d] mt-1">
                  {selectedIssue.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSelectIssue(null)}
                aria-label="Close issue detail panel"
                className="w-9 h-9 rounded-[8px] border border-[#d8dbe2] flex items-center justify-center text-[#5e606b] hover:text-[#17181d] hover:bg-[#f7f8fb] shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Priority Score Formula Breakdown */}
            <div className="bg-[#f7f8fb] border border-[#d8dbe2] rounded-[10px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#17181d]">
                  Priority Score Breakdown (R3)
                </span>
                <span className="text-sm font-mono tabular-nums font-bold text-[#4f46c8]">
                  Total: {selectedIssue.priority} / 100 ({selectedIssue.band})
                </span>
              </div>

              {selectedIssue.status === 'Resolved' ? (
                <div className="text-xs text-[#25985a] font-medium">
                  Issue is Resolved — priority score is set to 0 so active hazards surface first.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white border border-[#d8dbe2] rounded-[8px] p-2.5">
                    <div className="text-[11px] text-[#5e606b]">Urgency Hits</div>
                    <div className="text-sm font-bold font-mono tabular-nums text-[#a33e3e] mt-0.5">
                      +{selectedIssue.breakdown.urgencyPts} pts
                    </div>
                    <div className="text-[10px] font-mono text-[#858793]">
                      30 &times; min({selectedIssue.urgency_hits}, 2)
                    </div>
                  </div>
                  <div className="bg-white border border-[#d8dbe2] rounded-[8px] p-2.5">
                    <div className="text-[11px] text-[#5e606b]">Similar Cluster</div>
                    <div className="text-sm font-bold font-mono tabular-nums text-[#4f46c8] mt-0.5">
                      +{selectedIssue.breakdown.similarPts} pts
                    </div>
                    <div className="text-[10px] font-mono text-[#858793]">
                      8 &times; min({selectedIssue.similar_count}, 5)
                    </div>
                  </div>
                  <div className="bg-white border border-[#d8dbe2] rounded-[8px] p-2.5">
                    <div className="text-[11px] text-[#5e606b]">Report Age</div>
                    <div className="text-sm font-bold font-mono tabular-nums text-[#17181d] mt-0.5">
                      +{selectedIssue.breakdown.agePts} pts
                    </div>
                    <div className="text-[10px] font-mono text-[#858793]">
                      2 &times; min({selectedIssue.age_days}d, 10)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description, Real Field Photograph & Real-Time GPS Map Pin */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-1.5 text-xs text-[#5e606b]">
                <MapPin className="w-3.5 h-3.5 text-[#4f46c8]" />
                <span>{selectedIssue.location}</span>
              </div>
              <p className="text-sm text-[#17181d] leading-relaxed bg-[#f7f8fb] border border-[#d8dbe2] rounded-[8px] p-3">
                {selectedIssue.description}
              </p>

              {/* Real Photograph + Real-Time Single Issue Map */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-[#5e606b]">
                    Real Field Photograph ({selectedIssue.category})
                  </div>
                  <div className="rounded-[8px] overflow-hidden border border-[#d8dbe2] bg-[#171925] h-[160px]">
                    <CivicRealImage
                      category={selectedIssue.category}
                      photoUrl={selectedIssue.photo_url}
                      issueId={selectedIssue.id}
                      alt={selectedIssue.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-[#5e606b]">
                    Real-Time GPS Location Pin
                  </div>
                  <HaldiaSingleIssueMap
                    id={selectedIssue.id}
                    title={selectedIssue.title}
                    location={selectedIssue.location}
                    category={selectedIssue.category}
                    status={selectedIssue.status}
                    lat={selectedIssue.lat}
                    lng={selectedIssue.lng}
                    heightClass="h-[160px]"
                  />
                </div>
              </div>

              <a
                href={getRealPhotoForCategory(
                  selectedIssue.category,
                  selectedIssue.photo_url,
                  selectedIssue.id,
                  selectedIssue.title
                )}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4f46c8] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open full resolution real photograph</span>
              </a>
            </div>

            {/* Status Transition Form */}
            <div className="border-t border-[#d8dbe2] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#17181d]">
                  Dispatch &amp; Status Transition (R5)
                </h3>
                <span className="text-xs font-mono text-[#5e606b]">
                  Open &rarr; In Progress &rarr; Resolved
                </span>
              </div>

              {statusError && (
                <div
                  role="alert"
                  className="p-3 rounded-[8px] border border-[#a33e3e] bg-[#fae4e4] text-xs text-[#a33e3e] font-medium"
                >
                  {statusError}
                </div>
              )}

              {statusSuccess && (
                <div className="p-3 rounded-[8px] border border-[#25985a] bg-[#d8f3e3] text-xs text-[#25985a] font-medium">
                  {statusSuccess}
                </div>
              )}

              {selectedIssue.status === 'Resolved' ? (
                <div className="p-3.5 rounded-[8px] border border-[#d8dbe2] bg-[#f7f8fb] text-xs text-[#5e606b] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#25985a] shrink-0" />
                  <span>
                    This issue is <strong>Resolved</strong> (terminal state). No further transitions are permitted.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="authority-note" className="text-xs font-semibold text-[#17181d]">
                        Mandatory Ward Officer Note (3–500 chars)
                      </label>
                      <span className="text-[11px] font-mono tabular-nums text-[#858793]">
                        {statusNote.trim().length}/500
                      </span>
                    </div>
                    <textarea
                      id="authority-note"
                      rows={2}
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder={
                        selectedIssue.status === 'Open'
                          ? 'e.g., Dispatched Haldia Ward 11 maintenance crew for site barricade and repair.'
                          : 'e.g., Repair completed, tested on site, and verified safe for residents.'
                      }
                      className="w-full p-2.5 rounded-[8px] border border-[#d8dbe2] text-xs bg-white text-[#17181d] focus:outline-none focus:ring-2 focus:ring-[#4f46c8]"
                    />

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[11px] text-[#858793]">Quick Note:</span>
                      {selectedIssue.status === 'Open' ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setStatusNote(
                                'Ward engineering squad dispatched to inspect and barricade the hazard.'
                              )
                            }
                            className="text-[11px] px-2 py-0.5 rounded border border-[#d8dbe2] bg-[#f7f8fb] hover:border-[#4f46c8] text-[#17181d] cursor-pointer"
                          >
                            Crew dispatched
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStatusNote(
                                'Emergency line team assigned; material requisitioned from municipal store.'
                              )
                            }
                            className="text-[11px] px-2 py-0.5 rounded border border-[#d8dbe2] bg-[#f7f8fb] hover:border-[#4f46c8] text-[#17181d] cursor-pointer"
                          >
                            Emergency team assigned
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setStatusNote(
                                'Fault repaired and verified by ward supervisor. Area restored to normal.'
                              )
                            }
                            className="text-[11px] px-2 py-0.5 rounded border border-[#d8dbe2] bg-[#f7f8fb] hover:border-[#4f46c8] text-[#17181d] cursor-pointer"
                          >
                            Repair verified &amp; closed
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedIssue.status === 'Open' && (
                      <>
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleStatusUpdate('In Progress')}
                          className="h-10 px-4 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Move to In Progress</span>
                        </button>
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleStatusUpdate('Resolved')}
                          className="h-10 px-3 rounded-[8px] border border-[#d8dbe2] bg-white hover:bg-[#fae4e4] text-[#5e606b] hover:text-[#a33e3e] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                          title="Test R5 Guardrail: Skipping In Progress is blocked (409 Conflict)"
                        >
                          <span>Test Skip to Resolved (409)</span>
                        </button>
                      </>
                    )}

                    {selectedIssue.status === 'In Progress' && (
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleStatusUpdate('Resolved')}
                        className="h-10 px-4 rounded-[8px] bg-[#25985a] hover:bg-[#1e7e4a] text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Issue Resolved</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* R11 Notification Preview */}
            {lastNotification && (
              <div className="border-t border-[#d8dbe2] pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#4f46c8] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Resident Notification Preview (R11 · Zero PII Stored)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLastNotification(null)}
                    className="text-[11px] text-[#858793] hover:text-[#17181d] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="p-3 rounded-[8px] bg-[#171925] text-[#f7f7fb] text-xs space-y-2 font-mono">
                  <div>
                    <div className="text-[10px] text-[#858793] uppercase">SMS Dispatch Preview:</div>
                    <div className="mt-0.5 text-[#d8f3e3]">{lastNotification.sms}</div>
                  </div>
                  <div className="border-t border-[#222431] pt-2">
                    <div className="text-[10px] text-[#858793] flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>Email Subject: {lastNotification.emailSubject}</span>
                    </div>
                    <pre className="mt-1 text-[11px] text-[#f7f7fb]/90 whitespace-pre-wrap font-mono">
                      {lastNotification.emailBody}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Issue Activity Log & Audit Timeline */}
            <div className="border-t border-[#d8dbe2] pt-4">
              <IssueActivityLog
                issueId={selectedIssue.id}
                currentStatus={selectedIssue.status}
                createdAt={selectedIssue.created_at}
                updatedAt={selectedIssue.updated_at}
                timeline={detailTimeline}
                compact
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
