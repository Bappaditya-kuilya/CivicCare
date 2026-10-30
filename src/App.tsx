import React, { useState, useEffect, useCallback } from 'react';
import {
  FilePlus2,
  Search,
  ShieldCheck,
  Compass,
  Building2,
  KeyRound,
  LayoutDashboard,
  Bot,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { IssueCategory, IssueStatus } from './types';
import {
  ReportIssueView,
  ReportSuccessView,
  TrackIssueView,
} from './components/ResidentViews';
import { UserPortalView } from './components/UserPortalView';
import { AdminViews } from './components/AdminViews';
import { DemoWalkthroughDrawer } from './components/DemoWalkthroughDrawer';
import { CivicAiChatbot } from './components/CivicAiChatbot';
import {
  MASTER_AUTHORITY_KEY,
  subscribeToAuth,
  ensureFirestoreSeeded,
} from './lib/firebase';

type RouteState =
  | { name: 'user' }
  | { name: 'report' }
  | { name: 'done'; id: number }
  | { name: 'track'; id: number | null }
  | { name: 'admin'; id: number | null };

function parseHashRoute(hash: string): RouteState {
  const cleaned = hash.replace(/^#/, '') || '/';
  if (cleaned === '/user') {
    return { name: 'user' };
  }
  if (cleaned === '/' || cleaned === '' || cleaned === '/report') {
    return { name: 'report' };
  }
  const doneMatch = cleaned.match(/^\/done\/(\d+)$/);
  if (doneMatch) {
    return { name: 'done', id: Number(doneMatch[1]) };
  }
  if (cleaned === '/track') {
    return { name: 'track', id: null };
  }
  const issueMatch = cleaned.match(/^\/issue\/(\d+)$/);
  if (issueMatch) {
    return { name: 'track', id: Number(issueMatch[1]) };
  }
  if (cleaned === '/admin') {
    return { name: 'admin', id: null };
  }
  const adminIssueMatch = cleaned.match(/^\/admin\/issue\/(\d+)$/);
  if (adminIssueMatch) {
    return { name: 'admin', id: Number(adminIssueMatch[1]) };
  }
  return { name: 'user' };
}

const MY_SUBMITTED_STORAGE_KEY = 'civicpulse_my_submitted_ids';

export default function App() {
  const [route, setRoute] = useState<RouteState>(() =>
    parseHashRoute(window.location.hash)
  );
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    const stored = sessionStorage.getItem('civicpulse_admin_token');
    if (stored === 'LOCKED') return null;
    return stored || MASTER_AUTHORITY_KEY;
  });
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [mySubmittedIds, setMySubmittedIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(MY_SUBMITTED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });
  const [lastSubmission, setLastSubmission] = useState<{
    id: number;
    category: IssueCategory;
    status: IssueStatus;
    similar_to: number[];
  } | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [prefillReport, setPrefillReport] = useState<{
    title: string;
    description: string;
    location: string;
    photo_url?: string;
  } | null>(null);

  // Subscribe to Firebase Authentication state & ensure Cloud Firestore is seeded on boot
  useEffect(() => {
    ensureFirestoreSeeded().catch(() => {
      // Handled by firebase error reporter
    });
    const unsubscribe = subscribeToAuth((user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateHash = useCallback((newHash: string) => {
    if (window.location.hash === newHash) {
      setRoute(parseHashRoute(newHash));
    } else {
      window.location.hash = newHash;
    }
  }, []);

  const handleSaveToken = useCallback((tok: string) => {
    sessionStorage.setItem('civicpulse_admin_token', tok);
    setAdminToken(tok);
  }, []);

  const handleClearToken = useCallback(() => {
    sessionStorage.setItem('civicpulse_admin_token', 'LOCKED');
    setAdminToken(null);
  }, []);

  const recordMySubmittedIssue = useCallback((id: number) => {
    setMySubmittedIds((prev) => {
      const next = prev.includes(id) ? prev : [id, ...prev];
      try {
        localStorage.setItem(MY_SUBMITTED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const isUserDashboardActive = route.name === 'user';
  const isReportActive = route.name === 'report' || route.name === 'done';
  const isTrackActive = route.name === 'track';
  const isAdminActive = route.name === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f5f8] text-[#17181d]">
      {/* Top Bar (Strictly 3 zones separated by gap-8 per Top Bar Contract & design.md Section 5) */}
      <header className="h-[56px] bg-white border-b border-[#d8dbe2] px-3 sm:px-6 flex items-center justify-between gap-4 sm:gap-8 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#/user"
          className="text-[15px] sm:text-[16px] font-bold tracking-tight text-[#17181d] whitespace-nowrap shrink-0"
        >
          CivicCare Haldia
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5e606b]"
        >
          <a
            href="#/user"
            className={`hover:text-[#17181d] transition-colors whitespace-nowrap shrink-0 ${
              isUserDashboardActive
                ? 'text-[#4f46c8] font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            User Panel
          </a>
          <a
            href="#/"
            className={`hover:text-[#17181d] transition-colors whitespace-nowrap shrink-0 ${
              isReportActive ? 'text-[#4f46c8] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Report Issue
          </a>
          <a
            href="#/track"
            className={`hover:text-[#17181d] transition-colors whitespace-nowrap shrink-0 ${
              isTrackActive ? 'text-[#4f46c8] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Track by ID
          </a>
          <a
            href="#/admin"
            className={`hover:text-[#17181d] transition-colors whitespace-nowrap shrink-0 ${
              isAdminActive ? 'text-[#4f46c8] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Admin Panel
          </a>
          <button
            type="button"
            onClick={() => setAiChatOpen((prev) => !prev)}
            className="hover:text-[#17181d] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            AI Assistant
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setWalkthroughOpen(true)}
            className="h-9 px-3.5 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            3-Min Demo Guide
          </button>
        </div>
      </header>

      {/* Main Application Shell: Left Sidebar on Desktop + Scrollable Content Canvas */}
      <div className="flex-1 flex">
        {/* Persistent Left Sidebar (Desktop >= 768px) */}
        <aside
          aria-label="Workspace Sidebar"
          className="hidden md:flex md:w-[220px] bg-white border-r border-[#d8dbe2] flex-col justify-between p-3 shrink-0"
        >
          <div className="space-y-6">
            {/* Resident User Panel Navigation */}
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-xs font-semibold text-[#858793]">
                User Panel (Resident)
              </div>
              <a
                href="#/user"
                className={`h-[38px] px-3 rounded-[8px] text-sm font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                  isUserDashboardActive
                    ? 'bg-[#e8e8fb] text-[#4f46c8] font-semibold'
                    : 'text-[#5e606b] hover:bg-[#f7f8fb] hover:text-[#17181d]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Citizen Dashboard</span>
              </a>

              <a
                href="#/"
                className={`h-[38px] px-3 rounded-[8px] text-sm font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                  isReportActive
                    ? 'bg-[#e8e8fb] text-[#4f46c8] font-semibold'
                    : 'text-[#5e606b] hover:bg-[#f7f8fb] hover:text-[#17181d]'
                }`}
              >
                <FilePlus2 className="w-4 h-4 shrink-0" />
                <span>Report Issue</span>
              </a>

              <a
                href="#/track"
                className={`h-[38px] px-3 rounded-[8px] text-sm font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                  isTrackActive
                    ? 'bg-[#e8e8fb] text-[#4f46c8] font-semibold'
                    : 'text-[#5e606b] hover:bg-[#f7f8fb] hover:text-[#17181d]'
                }`}
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>Track by ID</span>
              </a>

              <button
                type="button"
                onClick={() => setAiChatOpen(true)}
                className={`w-full h-[38px] px-3 rounded-[8px] text-sm font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap cursor-pointer ${
                  aiChatOpen
                    ? 'bg-[#e8e8fb] text-[#4f46c8] font-semibold'
                    : 'text-[#5e606b] hover:bg-[#f7f8fb] hover:text-[#17181d]'
                }`}
              >
                <Bot className="w-4 h-4 shrink-0" />
                <span>AI Civic Chatbot</span>
              </button>
            </div>

            {/* Authority Admin Panel Navigation */}
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-xs font-semibold text-[#858793]">
                Admin Panel (Authority)
              </div>
              <a
                href="#/admin"
                className={`h-[38px] px-3 rounded-[8px] text-sm font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                  isAdminActive
                    ? 'bg-[#e8e8fb] text-[#4f46c8] font-semibold'
                    : 'text-[#5e606b] hover:bg-[#f7f8fb] hover:text-[#17181d]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Ward Dispatch</span>
              </a>

              <button
                type="button"
                onClick={() => setWalkthroughOpen(true)}
                className="w-full h-[38px] px-3 rounded-[8px] text-sm font-medium flex items-center gap-2.5 text-[#5e606b] hover:bg-[#f7f8fb] hover:text-[#17181d] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span>Demo Checklist</span>
              </button>
            </div>

            {/* Firebase Authority Key Quick Box */}
            <div className="pt-2 border-t border-[#d8dbe2] px-3 space-y-2">
              <div className="text-xs font-semibold text-[#858793] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#4f46c8]" />
                <span>Authority Master Key</span>
              </div>
              <div className="p-2 rounded-[6px] bg-[#f7f8fb] border border-[#d8dbe2] font-mono text-[11px] font-bold text-[#4f46c8] select-all">
                {MASTER_AUTHORITY_KEY}
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 rounded-[10px] bg-[#f7f8fb] border border-[#d8dbe2] text-xs text-[#5e606b] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#17181d]">
              <Building2 className="w-3.5 h-3.5 text-[#4f46c8]" />
              <span>User + Admin + Gemini AI</span>
            </div>
            <div className="text-[11px] text-[#858793]">
              28 Haldia issues · Live GPS &amp; Real Photos
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 pb-20 md:pb-8 max-w-[1320px] mx-auto w-full">
          {route.name === 'user' && (
            <UserPortalView
              mySubmittedIds={mySubmittedIds}
              onNavigateReport={() => navigateHash('#/')}
              onNavigateTrackId={(id) => navigateHash(`#/issue/${id}`)}
              onOpenAiChat={() => setAiChatOpen(true)}
            />
          )}

          {route.name === 'report' && (
            <ReportIssueView
              prefillData={prefillReport}
              onClearPrefill={() => setPrefillReport(null)}
              onSuccess={(result) => {
                recordMySubmittedIssue(result.id);
                setLastSubmission(result);
                navigateHash(`#/done/${result.id}`);
              }}
              onNavigateIssue={(id) => navigateHash(`#/issue/${id}`)}
            />
          )}

          {route.name === 'done' && (
            <ReportSuccessView
              submission={
                lastSubmission && lastSubmission.id === route.id
                  ? lastSubmission
                  : {
                      id: route.id,
                      category: 'Other',
                      status: 'Open',
                      similar_to: [],
                    }
              }
              onTrackIssue={(id) => navigateHash(`#/issue/${id}`)}
              onReportAnother={() => navigateHash('#/')}
            />
          )}

          {route.name === 'track' && (
            <TrackIssueView
              initialIssueId={route.id}
              onSelectIssueId={(id) => navigateHash(`#/issue/${id}`)}
            />
          )}

          {route.name === 'admin' && (
            <AdminViews
              token={adminToken}
              firebaseUser={firebaseUser}
              onSaveToken={handleSaveToken}
              onClearToken={handleClearToken}
              selectedIssueId={route.id}
              onSelectIssue={(id) => {
                if (id === null) {
                  navigateHash('#/admin');
                } else {
                  navigateHash(`#/admin/issue/${id}`);
                }
              }}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white border-t border-[#d8dbe2] grid grid-cols-5 z-30"
      >
        <a
          href="#/user"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            isUserDashboardActive ? 'text-[#4f46c8] font-semibold' : 'text-[#5e606b]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>User Panel</span>
        </a>
        <a
          href="#/"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            isReportActive ? 'text-[#4f46c8] font-semibold' : 'text-[#5e606b]'
          }`}
        >
          <FilePlus2 className="w-4 h-4" />
          <span>Report</span>
        </a>
        <a
          href="#/track"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            isTrackActive ? 'text-[#4f46c8] font-semibold' : 'text-[#5e606b]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Track ID</span>
        </a>
        <a
          href="#/admin"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            isAdminActive ? 'text-[#4f46c8] font-semibold' : 'text-[#5e606b]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admin</span>
        </a>
        <button
          type="button"
          onClick={() => setAiChatOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
            aiChatOpen ? 'text-[#4f46c8] font-semibold' : 'text-[#5e606b]'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Chat</span>
        </button>
      </nav>

      {/* Interactive CivicPulse AI Chatbot Drawer */}
      <CivicAiChatbot
        isOpen={aiChatOpen}
        onToggleOpen={setAiChatOpen}
        onApplyDraftToReport={(draft) => {
          setPrefillReport(draft);
          navigateHash('#/');
        }}
        onInspectIssue={(id) => {
          navigateHash(`#/issue/${id}`);
        }}
      />

      {/* Interactive 3-Minute Judge Walkthrough Drawer */}
      <DemoWalkthroughDrawer
        isOpen={walkthroughOpen}
        onClose={() => setWalkthroughOpen(false)}
        onTriggerDemoReport={(preset) => {
          setPrefillReport(preset);
          navigateHash('#/');
        }}
        onOpenAdminWithDemoToken={() => {
          handleSaveToken(MASTER_AUTHORITY_KEY);
          navigateHash('#/admin');
        }}
        onOpenPublicTrack={(id) => {
          navigateHash(`#/issue/${id}`);
        }}
      />
    </div>
  );
}
