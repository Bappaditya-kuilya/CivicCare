import React, { useState, useEffect, useCallback } from 'react';
import {
  FilePlus2,
  Search,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Bot,
  ArrowRight,
  RefreshCw,
  Map as MapIcon,
  LayoutGrid,
} from 'lucide-react';
import { AdminIssueItem, StatsResponse } from '../types';
import { getDashboardDataFromFirestore } from '../lib/firebase';
import { CivicRealImage } from './CivicRealImage';
import { HaldiaIssueMap } from './HaldiaIssueMap';

interface UserPortalViewProps {
  mySubmittedIds: number[];
  onNavigateReport: () => void;
  onNavigateTrackId: (id: number) => void;
  onOpenAiChat: () => void;
}

const SAVED_ISSUES_STORAGE_KEY = 'civiccare_followed_issues';

export const UserPortalView: React.FC<UserPortalViewProps> = ({
  mySubmittedIds,
  onNavigateReport,
  onNavigateTrackId,
  onOpenAiChat,
}) => {
  const [issues, setIssues] = useState<AdminIssueItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'community' | 'my_issues' | 'map'>('community');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [followedIds, setFollowedIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_ISSUES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return [1, 4];
  });

  const loadCommunityData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboardDataFromFirestore({
        category: categoryFilter,
        status: statusFilter,
        sort: 'newest',
      });
      setIssues(data.items);
      setStats(data.stats);
    } catch {
      // Keep existing state
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  const toggleFollowIssue = (id: number) => {
    setFollowedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(SAVED_ISSUES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const combinedPersonalIds = Array.from(new Set([...mySubmittedIds, ...followedIds]));

  const filteredIssues = issues.filter((item) => {
    if (activeTab === 'my_issues' && !combinedPersonalIds.includes(item.id)) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      String(item.id) === q.replace(/^#/, '')
    );
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Citizen User Panel Header */}
      <div className="bg-white border border-[#d8dbe2] rounded-[14px] p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#4f46c8]">
            CivicCare Resident Portal · Haldia Municipality
          </div>
          <h1 className="text-[22px] sm:text-[28px] lg:text-[30px] font-bold tracking-tight text-[#17181d] leading-tight">
            Citizen Dashboard &amp; Community Hub
          </h1>
          <p className="text-xs sm:text-sm text-[#5e606b] max-w-2xl">
            Browse real-time civic issues reported across Haldia wards with real field photographs, follow repairs in your neighbourhood, or ask the CivicCare AI Assistant to draft a report.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAiChat}
            className="h-10 px-3.5 sm:px-4 rounded-[8px] border border-[#d8dbe2] bg-[#171925] hover:bg-[#222431] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Bot className="w-4 h-4 text-[#c9c8f1] shrink-0" />
            <span>Ask CivicCare AI</span>
          </button>

          <button
            type="button"
            onClick={onNavigateReport}
            className="h-10 px-3.5 sm:px-4 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-xs font-semibold shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <FilePlus2 className="w-4 h-4 shrink-0" />
            <span>Report New Issue</span>
          </button>
        </div>
      </div>

      {/* Citizen Ward Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-3.5 sm:p-4">
          <div className="text-xs font-medium text-[#5e606b]">Community Reports</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#17181d] mt-1">
            {stats ? stats.total : '28'}
          </div>
          <div className="text-[11px] text-[#858793] mt-1">
            Across 8 Haldia municipal wards
          </div>
        </div>

        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-3.5 sm:p-4">
          <div className="text-xs font-medium text-[#5e606b]">Active Repairs</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#344da6] mt-1">
            {stats ? stats.by_status['In Progress'] : '7'}
          </div>
          <div className="text-[11px] text-[#858793] mt-1">
            Engineering crews on site
          </div>
        </div>

        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-3.5 sm:p-4">
          <div className="text-xs font-medium text-[#5e606b]">Resolved Hazards</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#25985a] mt-1">
            {stats ? stats.by_status.Resolved : '5'}
          </div>
          <div className="text-[11px] text-[#858793] mt-1">
            Verified closed with notes
          </div>
        </div>

        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-3.5 sm:p-4">
          <div className="text-xs font-medium text-[#5e606b]">My Followed Issues</div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#4f46c8] mt-1">
            {combinedPersonalIds.length}
          </div>
          <div className="text-[11px] text-[#858793] mt-1">
            Saved in your Citizen Portal
          </div>
        </div>
      </div>

      {/* Navigation Tabs + Filters Bar */}
      <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-3.5 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d8dbe2] pb-3">
          <div className="flex flex-wrap items-center rounded-[8px] bg-[#f7f8fb] border border-[#d8dbe2] p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('community')}
              className={`h-8 px-3 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'community'
                  ? 'bg-white text-[#17181d] shadow-xs'
                  : 'text-[#5e606b] hover:text-[#17181d]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Community Feed ({issues.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my_issues')}
              className={`h-8 px-3 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'my_issues'
                  ? 'bg-white text-[#17181d] shadow-xs'
                  : 'text-[#5e606b] hover:text-[#17181d]'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>My Followed ({combinedPersonalIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`h-8 px-3 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-white text-[#17181d] shadow-xs'
                  : 'text-[#5e606b] hover:text-[#17181d]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Live Ward Map</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadCommunityData}
            className="h-8 px-3 rounded-[6px] border border-[#d8dbe2] bg-white hover:bg-[#f7f8fb] text-xs font-medium text-[#17181d] inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {/* Category & Search Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', 'Road', 'Water', 'Electricity', 'Sanitation', 'Other'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`h-8 px-3 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#4f46c8] text-white'
                      : 'bg-[#f7f8fb] border border-[#d8dbe2] text-[#5e606b] hover:text-[#17181d]'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by issue status"
              className="h-9 px-3 rounded-[8px] border border-[#d8dbe2] bg-white text-xs font-medium text-[#17181d]"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#858793] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ward, street, or #ID..."
                className="w-full h-9 pl-8 pr-3 rounded-[8px] border border-[#d8dbe2] bg-white text-xs text-[#17181d] placeholder:text-[#858793] focus:outline-none focus:ring-2 focus:ring-[#4f46c8]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'map' ? (
        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#17181d]">
                Real-Time Haldia Community Hazard Map
              </h2>
              <p className="text-xs text-[#5e606b]">
                Click any marker on the map to inspect the public issue status, real photograph, and timeline.
              </p>
            </div>
          </div>
          <HaldiaIssueMap
            issues={filteredIssues}
            selectedIssueId={null}
            onSelectIssue={(id) => onNavigateTrackId(id)}
          />
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-8 text-center space-y-3">
          <div className="text-base font-semibold text-[#17181d]">
            {activeTab === 'my_issues'
              ? 'You have not followed or submitted any issues matching these filters yet'
              : 'No civic reports match your current filters'}
          </div>
          <p className="text-xs text-[#5e606b] max-w-md mx-auto">
            {activeTab === 'my_issues'
              ? 'Bookmark any report from the Community Feed or submit a new issue to track its live repair progress here.'
              : 'Try clearing the category or search filter to browse all Haldia ward reports.'}
          </p>
          <div className="pt-1 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('community');
                setCategoryFilter('All');
                setStatusFilter('All');
                setSearchQuery('');
              }}
              className="h-9 px-4 rounded-[8px] border border-[#d8dbe2] bg-white hover:bg-[#f7f8fb] text-xs font-semibold text-[#4f46c8] cursor-pointer"
            >
              Show All Community Issues
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIssues.map((issue) => {
            const isFollowed = combinedPersonalIds.includes(issue.id);
            const isSubmittedByMe = mySubmittedIds.includes(issue.id);

            const stepProgress =
              issue.status === 'Resolved'
                ? 100
                : issue.status === 'In Progress'
                ? 60
                : 25;

            return (
              <article
                key={issue.id}
                className="bg-white border border-[#d8dbe2] rounded-[12px] overflow-hidden flex flex-col justify-between hover:border-[#4f46c8] transition-colors shadow-2xs"
              >
                <div>
                  {/* Unique Issue Real Photograph Header */}
                  <div className="relative h-48 bg-[#171925] border-b border-[#d8dbe2]">
                    <CivicRealImage
                      category={issue.category}
                      photoUrl={issue.photo_url}
                      issueId={issue.id}
                      alt={issue.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => toggleFollowIssue(issue.id)}
                      title={isFollowed ? 'Following in My Issues' : 'Follow this issue'}
                      className={`absolute top-3 right-3 h-7 px-2.5 rounded-[6px] border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                        isFollowed
                          ? 'bg-[#4f46c8] text-white border-[#4f46c8]'
                          : 'bg-white/95 text-[#17181d] border-[#d8dbe2] hover:bg-white'
                      }`}
                    >
                      {isFollowed ? (
                        <>
                          <BookmarkCheck className="w-3 h-3" />
                          <span>{isSubmittedByMe ? 'My Report' : 'Following'}</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3 h-3" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Clean Card Body */}
                  <div className="p-4 space-y-2">
                    {/* Unboxed Metadata Line */}
                    <div className="flex items-center justify-between text-xs text-[#5e606b]">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="font-mono font-bold text-[#17181d]">
                          #{issue.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#4f46c8] font-semibold">
                          {issue.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        {issue.status === 'Resolved' && (
                          <span className="font-semibold text-[#25985a] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resolved</span>
                          </span>
                        )}
                        {issue.status === 'In Progress' && (
                          <span className="font-semibold text-[#344da6] inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>In Progress</span>
                          </span>
                        )}
                        {issue.status === 'Open' && (
                          <span className="font-semibold text-[#a33e3e] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-[#858793]">
                        {new Date(issue.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-[15px] font-bold text-[#17181d] leading-snug line-clamp-2">
                      {issue.title}
                    </h3>

                    <p className="text-xs text-[#5e606b] leading-relaxed line-clamp-2">
                      {issue.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-[#5e606b] pt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#4f46c8] shrink-0" />
                      <span className="truncate">{issue.location}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Action Footer */}
                <div className="px-4 pb-4 pt-3 space-y-3 border-t border-[#f4f5f8]">
                  <div className="w-full h-1.5 rounded-full bg-[#e8e8fb] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        issue.status === 'Resolved'
                          ? 'bg-[#25985a]'
                          : issue.status === 'In Progress'
                          ? 'bg-[#344da6]'
                          : 'bg-[#4f46c8]'
                      }`}
                      style={{ width: `${stepProgress}%` }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateTrackId(issue.id)}
                    className="w-full h-9 px-3 rounded-[8px] border border-[#d8dbe2] bg-[#f7f8fb] hover:bg-[#e8e8fb]/60 hover:border-[#4f46c8] text-xs font-semibold text-[#17181d] hover:text-[#4f46c8] inline-flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>View Real Photo, Map &amp; Audit Log</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
