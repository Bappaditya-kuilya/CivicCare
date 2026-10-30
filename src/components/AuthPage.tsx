import React, { useState } from 'react';
import {
  ShieldCheck,
  LogIn,
  KeyRound,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  Building2,
  MapPin,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';
import {
  MASTER_AUTHORITY_KEY,
  signInWithGooglePopup,
  isValidAuthorityKey,
} from '../lib/firebase';

export interface PortalSession {
  role: 'citizen' | 'authority';
  displayName: string;
  email: string;
  method: 'firebase-google' | 'master-key' | 'citizen-pass';
}

interface AuthPageProps {
  onUnlockSite: (session: PortalSession, targetRoute: '#/user' | '#/admin') => void;
  onSaveAdminToken: (token: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onUnlockSite,
  onSaveAdminToken,
}) => {
  const [activeTab, setActiveTab] = useState<'citizen' | 'authority'>('citizen');
  const [citizenName, setCitizenName] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [keyInput, setKeyInput] = useState(MASTER_AUTHORITY_KEY);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleGoogleSignIn = async (targetRole: 'citizen' | 'authority') => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const user = await signInWithGooglePopup();
      if (targetRole === 'authority') {
        onSaveAdminToken(MASTER_AUTHORITY_KEY);
      }
      onUnlockSite(
        {
          role: targetRole,
          displayName: user.displayName || 'Verified Haldia User',
          email: user.email || 'verified@civiccare.haldia.in',
          method: 'firebase-google',
        },
        targetRole === 'authority' ? '#/admin' : '#/user'
      );
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In popup was closed or blocked by the browser.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCitizenFormSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const name = citizenName.trim() || 'Haldia Resident';
    const email = citizenEmail.trim() || 'citizen@haldia.gov.in';
    onUnlockSite(
      {
        role: 'citizen',
        displayName: name,
        email,
        method: 'citizen-pass',
      },
      '#/user'
    );
  };

  const handleMasterKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setAuthError('Please enter an Authority Master Key.');
      return;
    }
    if (!isValidAuthorityKey(trimmed)) {
      setAuthError(
        `Invalid Authority Key. Use the provisioned master key: ${MASTER_AUTHORITY_KEY}`
      );
      return;
    }
    onSaveAdminToken(trimmed);
    onUnlockSite(
      {
        role: 'authority',
        displayName: 'Ward Dispatch Officer',
        email: 'authority@haldiamunicipality.org',
        method: 'master-key',
      },
      '#/admin'
    );
  };

  const handleCopyMasterKey = async () => {
    try {
      await navigator.clipboard.writeText(MASTER_AUTHORITY_KEY);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-[#17181d] flex flex-col justify-between p-4 sm:p-6 md:p-10 overflow-x-hidden">
      {/* Top Minimal Brand Bar */}
      <header className="max-w-[1120px] w-full mx-auto flex items-center justify-between gap-4 pb-4 border-b border-[#d8dbe2]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[#4f46c8] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            CC
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold tracking-tight text-[#17181d]">
              CivicCare Haldia
            </div>
            <div className="text-[11px] text-[#5e606b]">
              Municipal Civic Issue Tracker &amp; Real-Time Dispatch
            </div>
          </div>
        </div>
        <div className="text-xs font-medium text-[#5e606b] hidden sm:flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4f46c8]" />
          <span>Secured by Firebase Authentication &amp; Cloud Firestore</span>
        </div>
      </header>

      {/* Center Entry Gate Split Layout */}
      <main className="max-w-[1120px] w-full mx-auto my-auto py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Left Column: CivicCare Haldia Platform Overview (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#4f46c8]">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Haldia Municipality · Citizen &amp; Authority Portal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight text-[#17181d] leading-tight">
            Sign in to access CivicCare Haldia
          </h1>

          <p className="text-xs sm:text-sm text-[#5e606b] leading-relaxed">
            Authenticate via Firebase to report civic infrastructure issues with live GPS &amp; real camera photos, track timestamped resolution logs, or manage municipal ward dispatch queues.
          </p>

          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-[10px] bg-white border border-[#d8dbe2] flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#4f46c8] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#17181d]">
                  Real-Time GPS &amp; Verified Field Photos
                </div>
                <p className="text-[11px] text-[#5e606b] mt-0.5 leading-relaxed">
                  Pin exact Haldia ward coordinates on OpenStreetMap or Esri Satellite imagery and attach camera evidence.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-[10px] bg-white border border-[#d8dbe2] flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#127848] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#17181d]">
                  Complete Timestamped Activity Audit Trail
                </div>
                <p className="text-[11px] text-[#5e606b] mt-0.5 leading-relaxed">
                  Every issue tracks `Reported` → `In Progress` → `Resolved` milestones with verified SLA turnaround times.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-[10px] bg-white border border-[#d8dbe2] flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#4f46c8] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#17181d]">
                  Instant Multilingual AI Civic Assistant
                </div>
                <p className="text-[11px] text-[#5e606b] mt-0.5 leading-relaxed">
                  Draft civic reports and query ward statuses in English, Bengali (বাংলা), and Hindi (हिन्दी).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Firebase Login Card (7 cols on desktop) */}
        <div className="lg:col-span-7 bg-white border border-[#d8dbe2] rounded-[14px] p-5 sm:p-7 shadow-sm space-y-5">
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f4f5f8] rounded-[10px] border border-[#d8dbe2]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('citizen');
                setAuthError(null);
              }}
              className={`h-10 px-3 rounded-[8px] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'citizen'
                  ? 'bg-white text-[#4f46c8] shadow-xs'
                  : 'text-[#5e606b] hover:text-[#17181d]'
              }`}
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              <span>Citizen / Resident Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('authority');
                setAuthError(null);
              }}
              className={`h-10 px-3 rounded-[8px] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'authority'
                  ? 'bg-white text-[#4f46c8] shadow-xs'
                  : 'text-[#5e606b] hover:text-[#17181d]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Ward Authority Login</span>
            </button>
          </div>

          {authError && (
            <div
              role="alert"
              className="p-3 rounded-[8px] bg-[#fdeceb] border border-[#f5c2c0] text-[#c7342e] text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{authError}</div>
            </div>
          )}

          {activeTab === 'citizen' ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-[#17181d]">
                  Sign In as a Haldia Citizen
                </h2>
                <p className="text-xs text-[#5e606b]">
                  Sign in with your Google Account via Firebase Authentication to unlock the Citizen Dashboard, Report Wizard, and Live Ward Map.
                </p>
              </div>

              {/* Primary Firebase Google OAuth Button */}
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleGoogleSignIn('citizen')}
                className="w-full h-11 px-4 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {authLoading
                    ? 'Connecting to Firebase Google Auth…'
                    : 'Sign In with Google (Firebase Auth)'}
                </span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#d8dbe2]" />
                <span className="flex-shrink mx-3 text-[11px] font-medium text-[#858793] uppercase tracking-wider">
                  Or Quick Citizen Sign-In
                </span>
                <div className="flex-grow border-t border-[#d8dbe2]" />
              </div>

              {/* Direct Citizen Name/Email Entry Form */}
              <form onSubmit={handleCitizenFormSignIn} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="citizen-name-input"
                      className="block text-xs font-semibold text-[#17181d] mb-1"
                    >
                      Resident Name
                    </label>
                    <input
                      id="citizen-name-input"
                      type="text"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      placeholder="e.g., Bappaditya Kuilya"
                      className="w-full h-10 px-3 rounded-[8px] bg-[#f7f8fb] border border-[#d8dbe2] text-xs sm:text-sm text-[#17181d] focus:bg-white focus:outline-none focus:border-[#4f46c8]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="citizen-email-input"
                      className="block text-xs font-semibold text-[#17181d] mb-1"
                    >
                      Email or Phone
                    </label>
                    <input
                      id="citizen-email-input"
                      type="text"
                      value={citizenEmail}
                      onChange={(e) => setCitizenEmail(e.target.value)}
                      placeholder="e.g., resident@haldia.in"
                      className="w-full h-10 px-3 rounded-[8px] bg-[#f7f8fb] border border-[#d8dbe2] text-xs sm:text-sm text-[#17181d] focus:bg-white focus:outline-none focus:border-[#4f46c8]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-10 px-4 rounded-[8px] bg-[#17181d] hover:bg-[#2c2e37] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Enter Citizen Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-[#17181d]">
                  Sign In as Municipal Ward Authority
                </h2>
                <p className="text-xs text-[#5e606b]">
                  Authenticate with your authorized Google Officer account or verify the Authority Master Key to unlock the Ward Dispatch Console.
                </p>
              </div>

              {/* Option 1: Firebase Google OAuth for Officer */}
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleGoogleSignIn('authority')}
                className="w-full h-11 px-4 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {authLoading
                    ? 'Verifying Firebase Officer Account…'
                    : 'Sign In with Google Officer Account'}
                </span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#d8dbe2]" />
                <span className="flex-shrink mx-3 text-[11px] font-medium text-[#858793] uppercase tracking-wider">
                  Or Authority Master Key
                </span>
                <div className="flex-grow border-t border-[#d8dbe2]" />
              </div>

              {/* Option 2: Authority Master Key Form */}
              <form onSubmit={handleMasterKeySubmit} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="entry-master-key-input"
                      className="text-xs font-semibold text-[#17181d] flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#4f46c8]" />
                      <span>Authority Master Key</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyMasterKey}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4f46c8] hover:underline cursor-pointer"
                    >
                      {copiedKey ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied Key</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy {MASTER_AUTHORITY_KEY}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    id="entry-master-key-input"
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Enter NOVA-HALDIA-KEY-2026"
                    className="w-full h-10 px-3 rounded-[8px] bg-[#f7f8fb] border border-[#d8dbe2] font-mono text-xs sm:text-sm text-[#17181d] focus:bg-white focus:outline-none focus:border-[#4f46c8]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-10 px-4 rounded-[8px] bg-[#17181d] hover:bg-[#2c2e37] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Verify Key &amp; Enter Authority Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-[1120px] w-full mx-auto pt-4 border-t border-[#d8dbe2] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#858793]">
        <span>CivicCare Haldia · Municipal Issue Tracking &amp; Priority Triage</span>
        <span>28 Active Seeded Ward Issues · Live OpenStreetMap &amp; Esri Satellite</span>
      </footer>
    </div>
  );
};
