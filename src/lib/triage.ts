import { IssueCategory, IssueStatus, PriorityBand, PriorityBreakdown, NotificationPreview } from '../types';

export const CATEGORY_KEYWORDS: Record<Exclude<IssueCategory, 'Other'>, string[]> = {
  Road: [
    'pothole',
    'road',
    'highway',
    'crack',
    'footpath',
    'pavement',
    'speed breaker',
    'bridge',
    'culvert',
    'asphalt',
    'divider',
    'sinkhole',
    'tar',
    'lane',
    'crossing',
    // Romanised Hindi / Bengali (R12)
    'rasta',
    'sadak',
    'moram',
    'pitch',
    'gaddha',
    'garh',
    'pulia',
  ],
  Water: [
    'water',
    'pipe',
    'pipeline',
    'leak',
    'tap',
    'tanker',
    'supply',
    'borewell',
    'tubewell',
    'tube well',
    'contaminat',
    'muddy',
    'hydrant',
    'valve',
    'pressure',
    'drinking',
    // Romanised Hindi / Bengali (R12)
    'paani',
    'pani',
    'jol',
    'kol',
    'nalkoop',
  ],
  Electricity: [
    'electric',
    'power',
    'outage',
    'blackout',
    'transformer',
    'wire',
    'cable',
    'pole',
    'streetlight',
    'street light',
    'voltage',
    'spark',
    'meter',
    'feeder',
    'short circuit',
    'load shedding',
    'substation',
    // Romanised Hindi / Bengali (R12)
    'bijli',
    'bidyut',
    'bati',
    'current',
    'taar',
    'khamba',
  ],
  Sanitation: [
    'garbage',
    'waste',
    'trash',
    'drain',
    'sewage',
    'sewer',
    'manhole',
    'toilet',
    'dustbin',
    'sanitation',
    'stink',
    'mosquito',
    'dump',
    'filth',
    'cesspool',
    'gutter',
    'sludge',
    // Romanised Hindi / Bengali (R12)
    'kachra',
    'nali',
    'nala',
    'moyla',
    'vat',
    'durgandho',
    'machhar',
  ],
};

export const URGENT_TERMS: string[] = [
  'urgent',
  'emergency',
  'danger',
  'accident',
  'injur',
  'spark',
  'live wire',
  'fire',
  'flood',
  'burst',
  'collapse',
  'open manhole',
  'overflowing',
  'electrocut',
  'short circuit',
  'school gate',
  'hospital',
  'sinkhole',
  'fatal',
  // Romanised Hindi / Bengali urgent terms
  'agun',
  'bipod',
];

const STOPWORDS = new Set([
  'the', 'and', 'near', 'from', 'with', 'that', 'this', 'have', 'been', 'since',
  'for', 'are', 'was', 'were', 'not', 'but', 'all', 'any', 'can', 'had', 'her',
  'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way',
  'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'very',
  'days', 'week', 'month', 'area', 'ward', 'sector', 'block', 'main', 'side',
  'front', 'back', 'opp', 'opposite', 'beside', 'behind', 'haldia', 'road',
  'street', 'lane', 'nagar', 'para', 'colony', 'market', 'crossing', 'more',
]);

export function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function countTermHits(text: string, words: string[], term: string): number {
  const lowerTerm = term.toLowerCase();
  if (lowerTerm.includes(' ')) {
    // Multi-word phrase prefix match
    const regex = new RegExp(`\\b${lowerTerm.replace(/\s+/g, '\\s+')}`, 'g');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }
  // Single word prefix match so "potholes" hits "pothole"
  let hits = 0;
  for (const w of words) {
    if (w.startsWith(lowerTerm)) {
      hits += 1;
    }
  }
  return hits;
}

export function classify(
  title: string,
  description: string
): { category: IssueCategory; confidence: number; matchedKeywords: string[] } {
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const titleWords = tokenizeWords(titleLower);
  const descWords = tokenizeWords(descLower);

  const scores: Record<Exclude<IssueCategory, 'Other'>, number> = {
    Road: 0,
    Water: 0,
    Electricity: 0,
    Sanitation: 0,
  };
  const matchedPerCategory: Record<Exclude<IssueCategory, 'Other'>, Set<string>> = {
    Road: new Set(),
    Water: new Set(),
    Electricity: new Set(),
    Sanitation: new Set(),
  };

  const categories = Object.keys(CATEGORY_KEYWORDS) as Array<Exclude<IssueCategory, 'Other'>>;

  for (const cat of categories) {
    for (const term of CATEGORY_KEYWORDS[cat]) {
      const tHits = countTermHits(titleLower, titleWords, term);
      const dHits = countTermHits(descLower, descWords, term);
      if (tHits > 0 || dHits > 0) {
        // Title hits weigh x2 per PRD 2.6
        scores[cat] += tHits * 2 + dHits;
        matchedPerCategory[cat].add(term);
      }
    }
  }

  let bestCat: IssueCategory = 'Other';
  let maxScore = 0;
  let tie = false;

  for (const cat of categories) {
    const s = scores[cat];
    if (s > maxScore) {
      maxScore = s;
      bestCat = cat;
      tie = false;
    } else if (s === maxScore && s > 0) {
      tie = true;
    }
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  if (maxScore === 0 || tie || bestCat === 'Other') {
    return {
      category: 'Other',
      confidence: 0.5,
      matchedKeywords: [],
    };
  }

  const confidence = Number(Math.min(0.99, Math.max(0.55, maxScore / Math.max(totalScore, maxScore + 1))).toFixed(2));
  return {
    category: bestCat,
    confidence,
    matchedKeywords: Array.from(matchedPerCategory[bestCat]),
  };
}

export function urgencyHits(
  title: string,
  description: string
): { count: number; matchedTerms: string[] } {
  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  const words = tokenizeWords(combined);
  const matched = new Set<string>();

  for (const term of URGENT_TERMS) {
    if (countTermHits(combined, words, term) > 0) {
      matched.add(term);
    }
  }

  return {
    count: matched.size,
    matchedTerms: Array.from(matched),
  };
}

export function extractSignificantTokens(text: string): Set<string> {
  const words = tokenizeWords(text);
  const tokens = new Set<string>();
  for (const w of words) {
    if (w.length >= 3 && !STOPWORDS.has(w)) {
      // Normalize simple plural suffix so "streetlights" and "streetlight" match
      const stem = w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w;
      tokens.add(stem);
    }
  }
  return tokens;
}

export function extractLocationTokens(location: string): Set<string> {
  const words = tokenizeWords(location);
  const locStopwords = new Set(['near', 'from', 'with', 'the', 'and', 'main', 'side', 'front', 'opp', 'opposite', 'beside', 'haldia']);
  const tokens = new Set<string>();
  for (const w of words) {
    if (w.length >= 3 && !locStopwords.has(w)) {
      tokens.add(w);
    }
  }
  return tokens;
}

export function similar(
  a: { category: IssueCategory; title: string; description: string; location: string },
  b: { category: IssueCategory; title: string; description: string; location: string }
): boolean {
  if (a.category !== b.category) {
    return false;
  }

  // Check shared location token (len >= 3, stopwords removed)
  const locA = extractLocationTokens(a.location);
  const locB = extractLocationTokens(b.location);
  let sharedLocation = false;
  for (const tok of locA) {
    if (locB.has(tok)) {
      sharedLocation = true;
      break;
    }
  }
  if (!sharedLocation) {
    return false;
  }

  // Text Jaccard >= 0.30
  const textA = extractSignificantTokens(`${a.title} ${a.description}`);
  const textB = extractSignificantTokens(`${b.title} ${b.description}`);

  if (textA.size === 0 || textB.size === 0) {
    return false;
  }

  let intersection = 0;
  for (const tok of textA) {
    if (textB.has(tok)) {
      intersection += 1;
    }
  }
  const union = textA.size + textB.size - intersection;
  const jaccard = union > 0 ? intersection / union : 0;

  return jaccard >= 0.30;
}

export function priority(
  row: {
    status: IssueStatus;
    urgency_hits: number;
    similar_count: number;
    created_at: string;
  },
  now: Date = new Date()
): { score: number; band: PriorityBand; breakdown: PriorityBreakdown } {
  const createdMs = new Date(row.created_at).getTime();
  const ageDays = Math.max(0, Math.floor((now.getTime() - createdMs) / (1000 * 60 * 60 * 24)));

  if (row.status === 'Resolved') {
    return {
      score: 0,
      band: 'Low',
      breakdown: {
        urgencyPts: 0,
        similarPts: 0,
        agePts: 0,
        ageDays,
      },
    };
  }

  const urgencyPts = 30 * Math.min(row.urgency_hits, 2);
  const similarPts = 8 * Math.min(row.similar_count, 5);
  const agePts = 2 * Math.min(ageDays, 10);
  const score = Math.min(100, urgencyPts + similarPts + agePts);

  let band: PriorityBand = 'Low';
  if (score >= 60) {
    band = 'High';
  } else if (score >= 30) {
    band = 'Medium';
  }

  return {
    score,
    band,
    breakdown: {
      urgencyPts,
      similarPts,
      agePts,
      ageDays,
    },
  };
}

export function buildNotificationPreview(
  issue: { id: number; title: string; location: string; category: IssueCategory },
  fromStatus: IssueStatus,
  toStatus: IssueStatus,
  note: string
): NotificationPreview {
  const timestamp = new Date().toISOString();
  const sms = `[Haldia Civic Dispatch] Issue #${issue.id} (${issue.category} at ${issue.location}) moved from ${fromStatus} to ${toStatus}. Officer Note: "${note}". Track at #/issue/${issue.id}`;
  const emailSubject = `Status Update: Civic Issue #${issue.id} is now ${toStatus}`;
  const emailBody = [
    `Haldia Municipal Civic Issue Tracker — Official Update`,
    `------------------------------------------------------`,
    `Issue ID: #${issue.id}`,
    `Category: ${issue.category}`,
    `Location: ${issue.location}`,
    `Summary:  ${issue.title}`,
    ``,
    `Status Change: ${fromStatus} -> ${toStatus}`,
    `Ward Authority Note: "${note}"`,
    `Updated At: ${new Date(timestamp).toLocaleString()}`,
    ``,
    `No personal data is stored by CivicCare. Keep your Issue ID (#${issue.id}) to inspect the full timeline at any time.`,
  ].join('\n');

  return {
    sms,
    emailSubject,
    emailBody,
    generatedAt: timestamp,
  };
}

// 40-item committed labelled benchmark set per PRD R2 & 10.5
export const LABELLED_BENCHMARK_SET: Array<{
  title: string;
  description: string;
  expected: IssueCategory;
}> = [
  // Road (8)
  { title: 'Deep pothole near school gate', description: 'Large crater on the main asphalt lane causing two-wheeler accidents.', expected: 'Road' },
  { title: 'Broken footpath tiles in Durgachak', description: 'Pedestrians cannot walk on the damaged pavement slabs near market.', expected: 'Road' },
  { title: 'Unmarked speed breaker causing accidents', description: 'Newly laid speed breaker on highway service lane has no paint.', expected: 'Road' },
  { title: 'Cracked culvert bridge approach', description: 'Concrete bridge approach has deep cracks and sinking divider.', expected: 'Road' },
  { title: 'Rasta bhenge geche near Hatiberia', description: 'Boro gaddha on the pitch rasta making rickshaw movement impossible.', expected: 'Road' },
  { title: 'Sadak par bada gaddha at Ranichak', description: 'Heavy trucks damaged the asphalt crossing near refinery gate.', expected: 'Road' },
  { title: 'Collapsed road shoulder after rain', description: 'Half of the asphalt carriageway caved in beside the canal.', expected: 'Road' },
  { title: 'Broken concrete divider at Bhabanipur', description: 'Damaged road divider blocks the right turn lane.', expected: 'Road' },

  // Water (8)
  { title: 'Main water pipeline burst in Sector B', description: 'Clean drinking water gushing out from underground pipe since morning.', expected: 'Water' },
  { title: 'Muddy contaminated tap supply', description: 'Households receiving brown contaminated water from municipal tap.', expected: 'Water' },
  { title: 'Broken public tubewell handle', description: 'Community borewell and tubewell pump in Ward 12 is not drawing water.', expected: 'Water' },
  { title: 'Low water pressure and empty supply line', description: 'No municipal water tanker or tap supply for three days.', expected: 'Water' },
  { title: 'Paani ka pipe leak ho raha hai', description: 'Continuous paani wastage from broken valve near CPT colony.', expected: 'Water' },
  { title: 'Jol supply bondho in Basudevpur', description: 'Rastar kol theke jol porche na since yesterday morning.', expected: 'Water' },
  { title: 'Leaking overhead water tank valve', description: 'Main distribution pipeline valve is leaking gallons of water hourly.', expected: 'Water' },
  { title: 'Contaminated borewell drinking source', description: 'Foul taste in tubewell water supply near primary school.', expected: 'Water' },

  // Electricity (8)
  { title: 'Live wire sparking near school gate', description: 'High voltage electric cable hanging low and throwing sparks.', expected: 'Electricity' },
  { title: 'Dead streetlights along Hatiberia market', description: 'Entire stretch of 12 street light poles is dark at night.', expected: 'Electricity' },
  { title: 'Transformer loud blast and power outage', description: 'Local distribution transformer sparked causing total blackout.', expected: 'Electricity' },
  { title: 'Leaning electric pole with loose wires', description: 'Rusted electric pole tilted dangerously after storm with live wire.', expected: 'Electricity' },
  { title: 'Bijli cut and low voltage fluctuation', description: 'Frequent bijli outage and severe voltage drop damaging appliances.', expected: 'Electricity' },
  { title: 'Rastar light kharap and electric taar jhulche', description: 'No bati on the pole and dangerous current wire hanging.', expected: 'Electricity' },
  { title: 'Sparking meter box in community hall', description: 'Main feeder cable and electric meter smoking with short circuit risk.', expected: 'Electricity' },
  { title: 'Prolonged power blackout in Sutahata', description: 'No electricity for 14 hours following substation feeder fault.', expected: 'Electricity' },

  // Sanitation (8)
  { title: 'Overflowing garbage vat near hospital', description: 'Uncollected municipal waste and trash rotting with terrible stink.', expected: 'Sanitation' },
  { title: 'Open manhole on busy walkway', description: 'Uncovered sewage manhole posing fatal danger to pedestrians.', expected: 'Sanitation' },
  { title: 'Blocked stormwater drain breeding mosquitoes', description: 'Clogged drain full of plastic waste and stagnant sewage water.', expected: 'Sanitation' },
  { title: 'Broken community toilet sewage line', description: 'Raw sewage overflowing from public toilet septic pipe.', expected: 'Sanitation' },
  { title: 'Kachra and ganda nali overflowing', description: 'Nala jam ho gaya hai and kachra piled up on the corner.', expected: 'Sanitation' },
  { title: 'Moyla phela hocche and nali bondho', description: 'Severe durgandho and mosquito breeding in open dustbin vat.', expected: 'Sanitation' },
  { title: 'Uncollected trash dump catching fire', description: 'Huge garbage heap beside vegetable market has not been cleared.', expected: 'Sanitation' },
  { title: 'Choked sewer gutter flooding alley', description: 'Black sludge and sewer water backing up into residential lane.', expected: 'Sanitation' },

  // Other & Hard Ties (8)
  { title: 'Stray cattle blocking market entrance', description: 'Herd of stray cows sitting in the middle of the bazaar entrance.', expected: 'Other' },
  { title: 'Illegal loudspeaker noise late at night', description: 'amplifiers playing past midnight disturbing students before exams.', expected: 'Other' },
  { title: 'Fallen banyan tree branch in public park', description: 'Large tree limb fell on the park bench during yesterday wind.', expected: 'Other' },
  { title: 'Broken boundary wall of community playground', description: 'Brick wall around children park has collapsed on the north side.', expected: 'Other' },
  { title: 'Abandoned vehicle parked for two months', description: 'Rusted old truck left unclaimed near bus stand corner.', expected: 'Other' },
  { title: 'Damaged signboard at ward office', description: 'Information board outside ward 7 office is rusted and unreadable.', expected: 'Other' },
  // Intentional tie: 1 Road hit in title + 1 Water hit in title -> tie -> Other
  { title: 'Water on road after monsoon shower', description: 'General complaint about puddles after afternoon rain in locality.', expected: 'Other' },
  // Intentional tie: 1 Sanitation hit + 1 Electricity hit -> tie -> Other
  { title: 'Garbage near pole at corner', description: 'Someone left a small bag beside the post this morning.', expected: 'Other' },
];

export function evaluateBenchmarkAccuracy(): {
  correct: number;
  total: number;
  percentage: number;
} {
  let correct = 0;
  for (const item of LABELLED_BENCHMARK_SET) {
    const res = classify(item.title, item.description);
    if (res.category === item.expected) {
      correct += 1;
    }
  }
  const total = LABELLED_BENCHMARK_SET.length;
  return {
    correct,
    total,
    percentage: Number(((correct / total) * 100).toFixed(1)),
  };
}
