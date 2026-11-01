import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, MapPin, Filter, X } from 'lucide-react';
import { AdminIssueItem, IssueCategory, StatsResponse } from '../types';
import { SEED_ISSUES } from '../lib/seed';
import { classify, urgencyHits, priority } from '../lib/triage';

export interface WardDescriptor {
  wardCode: string;
  wardLabel: string;
  shortLabel: string;
  locality: string;
}

const HALDIA_WARD_DEFINITIONS: Array<{
  wardCode: string;
  wardLabel: string;
  shortLabel: string;
  locality: string;
  matchers: string[];
}> = [
  {
    wardCode: 'Ward 11',
    wardLabel: 'Ward 11 · Durgachak & Bhabanipur',
    shortLabel: 'W11 Durgachak',
    locality: 'Durgachak Sector B, Khudiram More & Bhabanipur',
    matchers: ['durgachak', 'bhabanipur', 'khudiram more', 'ward 11'],
  },
  {
    wardCode: 'Ward 19',
    wardLabel: 'Ward 19 · Haldia Township',
    shortLabel: 'W19 Township',
    locality: 'Hospital Approach, CPT Colony, Sector 14, Mohana & Marine Drive',
    matchers: [
      'township',
      'cpt colony',
      'sector 14',
      'mohana',
      'marine drive',
      'ward 19',
      'sub-divisional hospital',
    ],
  },
  {
    wardCode: 'Ward 15',
    wardLabel: 'Ward 15 · Hatiberia',
    shortLabel: 'W15 Hatiberia',
    locality: 'Hatiberia Main Market Stretch & Crossing',
    matchers: ['hatiberia', 'ward 15'],
  },
  {
    wardCode: 'Ward 8',
    wardLabel: 'Ward 8 · Basudevpur',
    shortLabel: 'W08 Basudevpur',
    locality: 'Basudevpur Community Vat & Primary Lane',
    matchers: ['basudevpur', 'ward 8'],
  },
  {
    wardCode: 'Ward 14',
    wardLabel: 'Ward 14 · Chiranjibpur & Ranichak',
    shortLabel: 'W14 Chiranjibpur',
    locality: 'Ranichak Refinery Gate, Chiranjibpur ROB & Dock Gate 2',
    matchers: ['chiranjibpur', 'ranichak', 'dock complex', 'ward 14'],
  },
  {
    wardCode: 'Ward 10',
    wardLabel: 'Ward 10 · Manjushree & Kadamtala',
    shortLabel: 'W10 Manjushree',
    locality: 'Manjushree Link Road & Kadamtala Housing',
    matchers: ['manjushree', 'kadamtala', 'ward 10'],
  },
  {
    wardCode: 'Ward 13',
    wardLabel: 'Ward 13 · Talpukur & Kshudiram Nagar',
    shortLabel: 'W13 Talpukur',
    locality: 'Talpukur Main Lane & Kshudiram Nagar Park',
    matchers: ['talpukur', 'kshudiram nagar', 'ward 13'],
  },
  {
    wardCode: 'Ward 2',
    wardLabel: 'Ward 2 · Sutahata & Balughata',
    shortLabel: 'W02 Sutahata',
    locality: 'Sutahata Bazaar & Balughata Riverside Para',
    matchers: ['sutahata', 'balughata', 'ward 2'],
  },
  {
    wardCode: 'Ward 6',
    wardLabel: 'Ward 6 · Debhog',
    shortLabel: 'W06 Debhog',
    locality: 'Debhog Standpost & Residential Zone',
    matchers: ['debhog', 'ward 6'],
  },
  {
    wardCode: 'Ward 4',
    wardLabel: 'Ward 4 · Brajanathchak',
    shortLabel: 'W04 Brajanathchak',
    locality: 'Brajanathchak Residential Block',
    matchers: ['brajanathchak', 'ward 4'],
  },
];

export function resolveHaldiaWard(location: string, title?: string): WardDescriptor {
  const combined = `${location || ''} ${title || ''}`.toLowerCase();
  for (const def of HALDIA_WARD_DEFINITIONS) {
    if (def.matchers.some((m) => combined.includes(m))) {
      return {
        wardCode: def.wardCode,
        wardLabel: def.wardLabel,
        shortLabel: def.shortLabel,
        locality: def.locality,
      };
    }
  }
  return {
    wardCode: 'Ward 11',
    wardLabel: 'Ward 11 · Durgachak & Bhabanipur',
    shortLabel: 'W11 Durgachak',
    locality: location || 'Haldia Municipal Area',
  };
}

const CATEGORY_COLORS: Record<IssueCategory, string> = {
  Road: '#4f46c8',
  Water: '#0284c7',
  Electricity: '#d97706',
  Sanitation: '#25985a',
  Other: '#64748b',
};

const STATUS_COLORS = {
  Open: '#a33e3e',
  'In Progress': '#344da6',
  Resolved: '#25985a',
};

interface AdminAnalyticsChartsProps {
  issues: AdminIssueItem[];
  stats: StatsResponse | null;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedWard: string;
  onSelectWard: (wardCode: string) => void;
}

function buildFallbackSeedItems(): AdminIssueItem[] {
  const now = new Date();
  return SEED_ISSUES.map((item, idx) => {
    const id = idx + 1;
    const category = item.category || classify(item.title, item.description).category;
    const urg = urgencyHits(item.title, item.description).count;
    const createdAt = new Date(now.getTime() - item.daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const p = priority(
      {
        status: item.status,
        urgency_hits: urg,
        similar_count: 0,
        created_at: createdAt,
      },
      now
    );
    return {
      id,
      title: item.title,
      description: item.description,
      location: item.location,
      photo_url: item.photo_url || null,
      lat: item.lat,
      lng: item.lng,
      category,
      status: item.status,
      priority: p.score,
      band: p.band,
      urgency_hits: urg,
      similar_count: 0,
      age_days: p.breakdown.ageDays,
      breakdown: p.breakdown,
      created_at: createdAt,
      updated_at: createdAt,
    };
  });
}

export const AdminAnalyticsCharts: React.FC<AdminAnalyticsChartsProps> = ({
  issues,
  stats,
  selectedCategory,
  onSelectCategory,
  selectedWard,
  onSelectWard,
}) => {
  const [categoryViewType, setCategoryViewType] = useState<'donut' | 'stacked'>('donut');

  // Ensure analytics always reflect the complete 28 seeded issues + any newly added live issues,
  // even when the table below is filtered by a specific category or status.
  const fullDataset = useMemo<AdminIssueItem[]>(() => {
    const seedBaseline = buildFallbackSeedItems();
    const byId = new Map<number, AdminIssueItem>();
    for (const s of seedBaseline) {
      byId.set(s.id, s);
    }
    for (const liveItem of issues) {
      byId.set(liveItem.id, liveItem);
    }
    return Array.from(byId.values());
  }, [issues]);

  // 1. Category Distribution Dataset for Recharts
  const categoryData = useMemo(() => {
    const categories: IssueCategory[] = ['Road', 'Water', 'Electricity', 'Sanitation', 'Other'];
    const totalCount = stats?.total || fullDataset.length || 1;

    return categories.map((cat) => {
      const catItems = fullDataset.filter((i) => i.category === cat);
      const total = stats?.by_category?.[cat] ?? catItems.length;
      const open =
        stats?.by_category_status?.[cat]?.Open ??
        catItems.filter((i) => i.status === 'Open').length;
      const inProgress =
        stats?.by_category_status?.[cat]?.['In Progress'] ??
        catItems.filter((i) => i.status === 'In Progress').length;
      const resolved =
        stats?.by_category_status?.[cat]?.Resolved ??
        catItems.filter((i) => i.status === 'Resolved').length;
      const highPriority = catItems.filter(
        (i) => i.status !== 'Resolved' && i.band === 'High'
      ).length;
      const sharePct = Math.round((total / totalCount) * 1000) / 10;

      return {
        category: cat,
        total,
        Open: open,
        'In Progress': inProgress,
        Resolved: resolved,
        highPriority,
        sharePct,
        fill: CATEGORY_COLORS[cat],
      };
    });
  }, [fullDataset, stats]);

  // 2. Volume of Reports per Ward Dataset for Recharts
  const wardData = useMemo(() => {
    const map = new Map<
      string,
      {
        wardCode: string;
        wardLabel: string;
        shortLabel: string;
        locality: string;
        total: number;
        Open: number;
        'In Progress': number;
        Resolved: number;
        highPriority: number;
      }
    >();

    for (const def of HALDIA_WARD_DEFINITIONS) {
      map.set(def.wardCode, {
        wardCode: def.wardCode,
        wardLabel: def.wardLabel,
        shortLabel: def.shortLabel,
        locality: def.locality,
        total: 0,
        Open: 0,
        'In Progress': 0,
        Resolved: 0,
        highPriority: 0,
      });
    }

    for (const item of fullDataset) {
      const ward = resolveHaldiaWard(item.location, item.title);
      const entry = map.get(ward.wardCode) || {
        wardCode: ward.wardCode,
        wardLabel: ward.wardLabel,
        shortLabel: ward.shortLabel,
        locality: ward.locality,
        total: 0,
        Open: 0,
        'In Progress': 0,
        Resolved: 0,
        highPriority: 0,
      };
      entry.total += 1;
      entry[item.status] += 1;
      if (item.status !== 'Resolved' && item.band === 'High') {
        entry.highPriority += 1;
      }
      map.set(ward.wardCode, entry);
    }

    return Array.from(map.values())
      .filter((w) => w.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [fullDataset]);

  const topWard = wardData[0] || null;

  return (
    <div className="space-y-5">
      {/* Active Chart Filter Banner */}
      {(selectedCategory !== 'All' || selectedWard !== 'All') && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-[8px] bg-[#f7f8fb] border border-[#d8dbe2] text-xs text-[#17181d]">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#4f46c8]" />
            <span className="font-medium">Active Analytics Filter:</span>
            {selectedCategory !== 'All' && (
              <span className="font-mono font-semibold text-[#4f46c8]">
                Category = {selectedCategory}
              </span>
            )}
            {selectedCategory !== 'All' && selectedWard !== 'All' && (
              <span aria-hidden="true">·</span>
            )}
            {selectedWard !== 'All' && (
              <span className="font-mono font-semibold text-[#4f46c8]">
                Ward = {selectedWard}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectCategory('All');
              onSelectWard('All');
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#a33e3e] hover:underline cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Chart Filters</span>
          </button>
        </div>
      )}

      {/* Two-Column Recharts Grid: Category Distribution + Ward Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Panel (5 cols): Distribution of Issue Categories */}
        <div className="lg:col-span-5 border border-[#d8dbe2] rounded-[10px] p-4 bg-[#fcfcfd] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#e4e6ed]">
            <div>
              <h3 className="text-sm font-semibold text-[#17181d]">
                Issue Category Distribution
              </h3>
              <p className="text-xs text-[#5e606b] mt-0.5">
                {fullDataset.length} seeded &amp; live reports across 5 municipal departments
              </p>
            </div>

            <div className="inline-flex items-center p-0.5 rounded-[6px] bg-[#eff1f6] border border-[#d8dbe2] shrink-0">
              <button
                type="button"
                onClick={() => setCategoryViewType('donut')}
                className={`px-2 py-1 rounded-[4px] text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                  categoryViewType === 'donut'
                    ? 'bg-white text-[#4f46c8] shadow-2xs'
                    : 'text-[#5e606b] hover:text-[#17181d]'
                }`}
              >
                <PieChartIcon className="w-3 h-3" />
                <span>Donut</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryViewType('stacked')}
                className={`px-2 py-1 rounded-[4px] text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                  categoryViewType === 'stacked'
                    ? 'bg-white text-[#4f46c8] shadow-2xs'
                    : 'text-[#5e606b] hover:text-[#17181d]'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                <span>Status Split</span>
              </button>
            </div>
          </div>

          {/* Recharts Container for Category Distribution */}
          <div className="h-[250px] w-full mt-3">
            {categoryViewType === 'donut' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={3}
                    onClick={(_data, index) => {
                      const entry = categoryData[index];
                      if (entry?.category) {
                        onSelectCategory(
                          selectedCategory === entry.category ? 'All' : entry.category
                        );
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {categoryData.map((entry) => {
                      const isSelected =
                        selectedCategory === 'All' || selectedCategory === entry.category;
                      return (
                        <Cell
                          key={`cell-${entry.category}`}
                          fill={entry.fill}
                          fillOpacity={isSelected ? 1 : 0.35}
                          stroke={selectedCategory === entry.category ? '#17181d' : '#ffffff'}
                          strokeWidth={selectedCategory === entry.category ? 2 : 1}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown, _name: unknown, item: { payload?: (typeof categoryData)[number] }) => {
                      const p = item?.payload;
                      if (!p) return [String(value), 'Reports'];
                      return [
                        `${p.total} reports (${p.sharePct}%) · Open: ${p.Open}, In Prog: ${p['In Progress']}, Resolved: ${p.Resolved}`,
                        p.category,
                      ];
                    }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#d8dbe2',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#17181d',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 12, bottom: 4 }}
                  onClick={(state) => {
                    const label = state?.activeLabel !== undefined ? String(state.activeLabel) : '';
                    if (label) {
                      onSelectCategory(
                        selectedCategory === label ? 'All' : label
                      );
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e6ed" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#5e606b' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={76}
                    tick={{ fontSize: 12, fill: '#17181d', fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#d8dbe2',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#17181d',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="Open"
                    stackId="status"
                    fill={STATUS_COLORS.Open}
                    radius={[0, 0, 0, 0]}
                    className="cursor-pointer"
                  />
                  <Bar
                    dataKey="In Progress"
                    stackId="status"
                    fill={STATUS_COLORS['In Progress']}
                    radius={[0, 0, 0, 0]}
                    className="cursor-pointer"
                  />
                  <Bar
                    dataKey="Resolved"
                    stackId="status"
                    fill={STATUS_COLORS.Resolved}
                    radius={[0, 4, 4, 0]}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Interactive Category Legend & Breakdown Table */}
          <div className="pt-3 border-t border-[#e4e6ed] grid grid-cols-5 gap-1.5">
            {categoryData.map((c) => {
              const active = selectedCategory === c.category;
              return (
                <button
                  key={c.category}
                  type="button"
                  onClick={() => onSelectCategory(active ? 'All' : c.category)}
                  className={`p-2 rounded-[6px] border text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-[#4f46c8] bg-[#e8e8fb]/50'
                      : 'border-[#e4e6ed] bg-white hover:border-[#c7cad3]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-xs shrink-0"
                      style={{ backgroundColor: c.fill }}
                    />
                    <span className="text-[11px] font-semibold text-[#17181d] truncate">
                      {c.category}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-sm font-bold font-mono tabular-nums text-[#17181d]">
                      {c.total}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-[#5e606b]">
                      {c.sharePct}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel (7 cols): Volume of Reports per Municipal Ward (Recharts BarChart) */}
        <div className="lg:col-span-7 border border-[#d8dbe2] rounded-[10px] p-4 bg-[#fcfcfd] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e4e6ed]">
            <div>
              <h3 className="text-sm font-semibold text-[#17181d]">
                Volume of Reports per Municipal Ward
              </h3>
              <p className="text-xs text-[#5e606b] mt-0.5">
                Stacked by status across {wardData.length} active Haldia wards · Click any ward bar to filter queue
              </p>
            </div>

            {topWard && (
              <div className="text-xs text-[#5e606b] font-mono tabular-nums shrink-0">
                <span>Peak Load: </span>
                <span className="font-semibold text-[#17181d]">{topWard.shortLabel}</span>
                <span> ({topWard.total} reports)</span>
              </div>
            )}
          </div>

          {/* Recharts BarChart for Ward Report Volume */}
          <div className="h-[250px] w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={wardData}
                margin={{ top: 10, right: 12, left: -12, bottom: 28 }}
                onClick={(state) => {
                  const label = state?.activeLabel !== undefined ? String(state.activeLabel) : '';
                  const matched = wardData.find((w) => w.shortLabel === label);
                  if (matched) {
                    onSelectWard(selectedWard === matched.wardCode ? 'All' : matched.wardCode);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e6ed" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: '#17181d', fontWeight: 500 }}
                  angle={-20}
                  textAnchor="end"
                  height={48}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#5e606b' }}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    `${value} report${Number(value) === 1 ? '' : 's'}`,
                    String(name),
                  ]}
                  labelFormatter={(_label: unknown, payload: ReadonlyArray<{ payload?: (typeof wardData)[number] }>) => {
                    const row = payload?.[0]?.payload;
                    if (!row) return String(_label);
                    return `${row.wardLabel} — Total: ${row.total} (High Priority Open: ${row.highPriority})`;
                  }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#d8dbe2',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#17181d',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar
                  dataKey="Open"
                  name="Open"
                  stackId="wardStatus"
                  fill={STATUS_COLORS.Open}
                  className="cursor-pointer"
                />
                <Bar
                  dataKey="In Progress"
                  name="In Progress"
                  stackId="wardStatus"
                  fill={STATUS_COLORS['In Progress']}
                  className="cursor-pointer"
                />
                <Bar
                  dataKey="Resolved"
                  name="Resolved"
                  stackId="wardStatus"
                  fill={STATUS_COLORS.Resolved}
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Ward Filter Strip */}
          <div className="pt-3 border-t border-[#e4e6ed] flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#5e606b] inline-flex items-center gap-1 mr-1">
              <MapPin className="w-3 h-3 text-[#4f46c8]" />
              <span>Filter by Ward:</span>
            </span>
            {wardData.map((w) => {
              const isSelected = selectedWard === w.wardCode;
              return (
                <button
                  key={w.wardCode}
                  type="button"
                  onClick={() => onSelectWard(isSelected ? 'All' : w.wardCode)}
                  title={`${w.wardLabel} (${w.locality})`}
                  className={`px-2 py-1 rounded-[6px] border text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#4f46c8] bg-[#4f46c8] text-white font-semibold'
                      : 'border-[#d8dbe2] bg-white text-[#17181d] hover:bg-[#f4f5f8]'
                  }`}
                >
                  {w.shortLabel} ({w.total})
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
