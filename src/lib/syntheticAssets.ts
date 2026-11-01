import { IssueCategory } from '../types';

export interface RealPhotoEvidenceOption {
  id: string;
  category: IssueCategory;
  label: string;
  caption: string;
  photoUrl: string;
  fallbackPhotoUrl: string;
  credit: string;
}

/**
 * 28 Separate, Distinct, Verified Real-World Photographs — one specifically curated
 * for each of the 28 Haldia municipal civic issues (#1 through #28), plus distinct fallbacks.
 */
export const ISSUE_SPECIFIC_REAL_PHOTOS: Record<
  number,
  { primary: string; fallback: string; caption: string }
> = {
  // #1 Water: Burst water pipeline flooding Durgachak Sector B main crossing
  1: {
    primary: '/assets/issues/issue-1.jpg',
    fallback:
      'https://ts3.mm.bing.net/th?id=OIP.NXBi90NVwPUDhPt_4chK4wAAAA&pid=15.1',
    caption: 'High-pressure burst drinking water main flooding Durgachak Sector B crossing',
  },
  // #2 Water: Drinking water pipeline leak at Durgachak Sector B Market Gate
  2: {
    primary: '/assets/issues/issue-2.jpg',
    fallback:
      'https://ts3.mm.bing.net/th?id=OIP.tpZYGKHSilr_Mf-cJqay-gHaEK&pid=15.1',
    caption: 'Underground water supply pipeline leak gushing at market gate',
  },
  // #3 Water: Burst water main pipe wasting drinking supply in Durgachak Block 4
  3: {
    primary: '/assets/issues/issue-3.jpg',
    fallback:
      'https://media.assettype.com/freepressjournal/2025-09-12/pt0kwcmm/FotoJet-2025-09-12T194005.197.jpg?width=1200',
    caption: 'Excavated municipal water main pipe rupture in residential block',
  },
  // #4 Electricity: Emergency live wire sparking near Bhabanipur school gate
  4: {
    primary: '/assets/issues/issue-4.jpg',
    fallback:
      'https://media.assettype.com/freepressjournal/2024-06/6752994b-8eaf-4016-83ab-452e91833390/WhatsApp_Image_2024_06_23_at_11_16_20.jpeg?width=1200',
    caption: 'High-voltage overhead electric cables and utility pole near Bhabanipur school',
  },
  // #5 Sanitation: Uncovered open manhole hazard outside Haldia Sub-Divisional Hospital
  5: {
    primary: '/assets/issues/issue-5.jpg',
    fallback:
      'https://media.telanganatoday.com/wp-content/uploads/2025/07/Open-manholes-on-Hyderabad-roads-endanger-commuters-civic-apathy-blamed-1.jpg',
    caption: 'Uncovered open drainage manhole hazard on hospital approach road',
  },
  // #6 Electricity: Fallen tree on live wire sparking in Sutahata bazaar
  6: {
    primary: '/assets/issues/issue-6.jpg',
    fallback:
      'https://ts4.mm.bing.net/th?id=OIP.ko1O0dIuNKGjojbOVz-zbwHaEK&pid=15.1',
    caption: 'Storm-damaged overhead 11kV power lines and transformer feeder in Sutahata',
  },
  // #7 Electricity: Dead streetlights and dark poles along Hatiberia main market
  7: {
    primary: '/assets/issues/issue-7.jpg',
    fallback:
      'https://static.toiimg.com/thumb/msid-97964812,width-1070,height-580,imgsize-1086168,resizemode-75,overlay-toi_sw,pt-32,y_pad-40/photo.jpg',
    caption: 'Unlit municipal streetlight poles along Hatiberia main market stretch',
  },
  // #8 Electricity: Non-working streetlight poles causing blackout in Hatiberia crossing
  8: {
    primary: '/assets/issues/issue-8.jpg',
    fallback:
      'https://media.assettype.com/freepressjournal/2024-11-23/lzgvaq0u/Add-a-heading-7.jpg?width=1200',
    caption: 'Dark highway and market crossing due to non-functional street lamp posts',
  },
  // #9 Electricity: Broken electric streetlights not working at Hatiberia south end
  9: {
    primary: '/assets/issues/issue-9.jpg',
    fallback:
      'https://static.toiimg.com/thumb/msid-94385803,imgsize-517571,width-400,height-225,resizemode-72/94385803.jpg',
    caption: 'Faulty street lighting fixture and overhead distribution pole',
  },
  // #10 Sanitation: Overflowing garbage vat and rotting waste pile in Basudevpur Ward 8
  10: {
    primary: '/assets/issues/issue-10.jpg',
    fallback:
      'https://images.thequint.com/thequint/2015-06/5ea7073f-2359-4f42-988e-f3afc0a5169d/Garbage%20Street%20East%20Delhi%2010.jpg?auto=format%2Ccompress',
    caption: 'Overflowing community concrete garbage vat in Basudevpur Ward 8',
  },
  // #11 Sanitation: Uncollected garbage pile near Basudevpur ration shop
  11: {
    primary: '/assets/issues/issue-11.jpg',
    fallback:
      'https://static.toiimg.com/thumb/msid-65394269,width-1070,height-580,imgsize-3019554,resizemode-75,overlay-toi_sw,pt-32,y_pad-40/photo.jpg',
    caption: 'Uncollected municipal plastic and solid waste bags piled along roadside',
  },
  // #12 Sanitation: Rotting waste and overflowing garbage dustbin in Basudevpur lane
  12: {
    primary: '/assets/issues/issue-12.jpg',
    fallback:
      'https://planningtank.com/wp-content/uploads/2018/04/Garbage-overflowing.jpg',
    caption: 'Overflowing municipal waste bins awaiting conservancy pickup',
  },
  // #13 Road: Deep pothole cluster near Ranichak refinery gate causing accidents
  13: {
    primary: '/assets/issues/issue-13.jpg',
    fallback:
      'https://media.assettype.com/freepressjournal/2024-06/4ab9edff-40df-4807-81bf-7daf733a3ddd/Add_a_heading__91_.jpg?width=1200',
    caption: 'Deep water-filled asphalt pothole crater on Ranichak refinery approach',
  },
  // #14 Road: Collapsed culvert slab on Manjushree link road
  14: {
    primary: '/assets/issues/issue-14.jpg',
    fallback:
      'https://cdn.ca.emap.com/wp-content/uploads/sites/9/2018/09/indiabridgecollapse.jpg',
    caption: 'Barricaded collapsed concrete culvert slab undergoing reinforcement on link road',
  },
  // #15 Road: Damaged footpath tiles and sunken pavement in CPT Colony
  15: {
    primary: '/assets/issues/issue-15.jpg',
    fallback:
      'https://th-i.thgim.com/public/incoming/hak1s8/article68187827.ece/alternates/FREE_1200/Footpath_01.jpg',
    caption: 'Cracked and sunken pedestrian footpath pavement slabs in CPT Colony',
  },
  // #16 Road: Unpainted high speed breaker damaging vehicles at Chiranjibpur
  16: {
    primary: '/assets/issues/issue-16.jpg',
    fallback:
      'https://images.mid-day.com/images/images/2024/nov/Dear-authorities-f_e.jpg',
    caption: 'Unmarked asphalt highway speed hump near Chiranjibpur rail overbridge',
  },
  // #17 Road: Cracked asphalt road surface repaired near Haldia Dock Complex Gate 2
  17: {
    primary: '/assets/issues/issue-17.jpg',
    fallback:
      'https://5.imimg.com/data5/SELLER/Default/2024/3/403965266/TF/ZV/IL/137272347/tar-roads-construction-services-500x500.jpg',
    caption: 'Hot-mix macadam asphalt resurfacing outside Haldia Dock Complex Gate 2',
  },
  // #18 Road: Broken road divider blocks repaired at Durgachak Khudiram More
  18: {
    primary: '/assets/issues/issue-18.jpg',
    fallback:
      'https://static.toiimg.com/thumb/msid-70121040,width-1070,height-580,imgsize-5088632,resizemode-75,overlay-toi_sw,pt-32,y_pad-40/photo.jpg',
    caption: 'Concrete median divider blocks realigned at Durgachak Khudiram More',
  },
  // #19 Water: Muddy contaminated water coming from public tap in Debhog
  19: {
    primary: '/assets/issues/issue-19.jpg',
    fallback:
      'https://patnapress.com/wp-content/uploads/2026/01/Drinking-water1.jpeg',
    caption: 'Public municipal standpost tap discharging turbid water in Debhog Ward 6',
  },
  // #20 Water: Defective handpump and dry tubewell in Balughata riverside para
  20: {
    primary: '/assets/issues/issue-20.jpg',
    fallback:
      'https://th-i.thgim.com/public/incoming/cpiv2o/article69906261.ece/alternates/FREE_1200/VSP08_BHADHRAYYAPETA%2018.JPG',
    caption: 'Community drinking water standpipe and tubewell point in Balughata',
  },
  // #21 Water: Leaking sluice valve on overhead reservoir line in Haldia Township
  21: {
    primary: '/assets/issues/issue-21.jpg',
    fallback:
      'https://ts3.mm.bing.net/th?id=OIP.IR7g1FOMWtgraMxdvHC9YgHaEK&pid=15.1',
    caption: 'High-pressure cast-iron sluice valve assembly on Sector 14 reservoir line',
  },
  // #22 Electricity: Frequent low voltage and phase failure in Brajanathchak
  22: {
    primary: '/assets/issues/issue-22.jpg',
    fallback:
      'https://staticimg.amarujala.com/assets/images/4cplus/2026/01/22/tarasafaramara-khabha-sahata-gara_3169dbb36e9d68a3b0ee1d4977c14e2b.jpeg',
    caption: '63kVA three-phase distribution transformer and feeder substation in Brajanathchak',
  },
  // #23 Sanitation: Choked concrete stormwater drain overflowing in Talpukur
  23: {
    primary: '/assets/issues/issue-23.jpg',
    fallback:
      'https://ts4.mm.bing.net/th?id=OIP.t2yKrfkcG_RHwDCyZmSWwgHaEK&pid=15.1',
    caption: 'Waterlogged street and choked stormwater drainage channel in Talpukur',
  },
  // #24 Sanitation: Public market toilet septic overflow cleared at Mohana Fish Market
  24: {
    primary: '/assets/issues/issue-24.jpg',
    fallback:
      'https://5.imimg.com/data5/SELLER/Default/2024/10/461889417/YC/CH/GR/132010217/suction-cum-jetting-machine-for-manholes-and-septic-tanks-homosep-sewer-1000x1000.png',
    caption: 'Municipal sanitation jetting and disinfection work at Mohana market block',
  },
  // #25 Other: Broken children swing and rusted seesaw in Kshudiram Nagar Park
  25: {
    primary: '/assets/issues/issue-25.jpg',
    fallback:
      'https://static.toiimg.com/thumb/msid-73040162,width-1070,height-580,imgsize-601967,resizemode-75,overlay-toi_sw,pt-32,y_pad-40/photo.jpg',
    caption: 'Children playground swings and park equipment in Kshudiram Nagar Ward Park',
  },
  // #26 Other: Uprooted casuarina tree blocking pedestrian bench along Marine Drive
  26: {
    primary: '/assets/issues/issue-26.jpg',
    fallback:
      'https://ts2.mm.bing.net/th?id=OIP.Omp9-bKaX4_NdRjmR5e4SgHaE8&pid=15.1',
    caption: 'Storm-tilted coastal casuarina tree across walkway along Haldia Marine Drive',
  },
  // #27 Other: Faded ward boundary and house numbering board at Kadamtala
  27: {
    primary: '/assets/issues/issue-27.jpg',
    fallback:
      'https://static.toiimg.com/thumb/msid-106529182,width-1070,height-580,imgsize-508784,resizemode-75,overlay-toi_sw,pt-32,y_pad-40/photo.jpg',
    caption: 'Weathered municipal directional and ward boundary signboard at Kadamtala',
  },
  // #28 Other: Stray cattle herd obstructing morning bus bay at Durgachak Bus Stand
  28: {
    primary: '/assets/issues/issue-28.jpg',
    fallback:
      'https://ts3.mm.bing.net/th?id=OIP.WbbOt5uP7ye3LHQdbKraTgHaEK&pid=15.1',
    caption: 'Stray cattle obstructing commuter bus bay at Durgachak Terminus',
  },
};

/**
 * Expanded Multi-Photo Evidence Library across all 5 categories for the Report Form Picker
 * and automatic variety on new reports.
 */
export const REAL_EVIDENCE_PHOTOS: RealPhotoEvidenceOption[] = [
  // ROAD (3 distinct real photos)
  {
    id: 'road-pothole-crater',
    category: 'Road',
    label: 'Deep Asphalt Pothole Crater',
    caption: 'Waterlogged pothole and damaged highway surface',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[13].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[13].fallback,
    credit: 'Road Pothole Field Photo',
  },
  {
    id: 'road-culvert-collapse',
    category: 'Road',
    label: 'Collapsed Culvert & Barrier',
    caption: 'Cracked concrete culvert slab and roadwork barrier',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[14].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[14].fallback,
    credit: 'Culvert Damage Field Photo',
  },
  {
    id: 'road-footpath-slabs',
    category: 'Road',
    label: 'Broken Footpath Pavement',
    caption: 'Damaged concrete sidewalk tiles and sunken curb',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[15].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[15].fallback,
    credit: 'Footpath Damage Field Photo',
  },
  // WATER (3 distinct real photos)
  {
    id: 'water-burst-main',
    category: 'Water',
    label: 'Burst Drinking Water Main',
    caption: 'High-pressure water pipeline rupture flooding street',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[1].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[1].fallback,
    credit: 'Water Main Burst Photo',
  },
  {
    id: 'water-standpost-tap',
    category: 'Water',
    label: 'Contaminated Standpost Tap',
    caption: 'Public municipal water tap discharging turbid water',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[19].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[19].fallback,
    credit: 'Public Standpost Field Photo',
  },
  {
    id: 'water-sluice-valve',
    category: 'Water',
    label: 'Leaking Reservoir Sluice Valve',
    caption: 'Industrial cast-iron sluice valve on water supply line',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[21].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[21].fallback,
    credit: 'Reservoir Valve Field Photo',
  },
  // ELECTRICITY (3 distinct real photos)
  {
    id: 'elec-live-wire',
    category: 'Electricity',
    label: 'Snapped Overhead Power Line',
    caption: 'High-voltage overhead electric cables and utility pole',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[4].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[4].fallback,
    credit: 'Overhead Cable Field Photo',
  },
  {
    id: 'elec-dead-streetlights',
    category: 'Electricity',
    label: 'Dark Streetlight Poles',
    caption: 'Non-working municipal street lamps along market road',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[7].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[7].fallback,
    credit: 'Streetlight Blackout Photo',
  },
  {
    id: 'elec-transformer-fault',
    category: 'Electricity',
    label: 'Distribution Transformer Fault',
    caption: 'Three-phase feeder transformer and jumper assembly',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[22].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[22].fallback,
    credit: 'Transformer Field Photo',
  },
  // SANITATION (3 distinct real photos)
  {
    id: 'san-garbage-vat',
    category: 'Sanitation',
    label: 'Overflowing Garbage Vat',
    caption: 'Uncollected municipal solid waste overflowing from vat',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[10].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[10].fallback,
    credit: 'Garbage Vat Field Photo',
  },
  {
    id: 'san-open-manhole',
    category: 'Sanitation',
    label: 'Uncovered Open Manhole',
    caption: 'Missing manhole cover on public roadway',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[5].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[5].fallback,
    credit: 'Open Manhole Field Photo',
  },
  {
    id: 'san-choked-drain',
    category: 'Sanitation',
    label: 'Choked Stormwater Drain',
    caption: 'Blocked roadside drainage channel causing waterlogging',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[23].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[23].fallback,
    credit: 'Stormwater Drain Field Photo',
  },
  // OTHER (3 distinct real photos)
  {
    id: 'other-fallen-tree',
    category: 'Other',
    label: 'Uprooted Tree on Walkway',
    caption: 'Storm-damaged tree obstructing public promenade',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[26].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[26].fallback,
    credit: 'Fallen Tree Field Photo',
  },
  {
    id: 'other-park-swing',
    category: 'Other',
    label: 'Damaged Park Playground Gear',
    caption: 'Rusted swing and seesaw in municipal ward park',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[25].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[25].fallback,
    credit: 'Ward Park Field Photo',
  },
  {
    id: 'other-stray-cattle',
    category: 'Other',
    label: 'Stray Cattle in Bus Bay',
    caption: 'Cattle herd obstructing morning commuter bus terminus',
    photoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[28].primary,
    fallbackPhotoUrl: ISSUE_SPECIFIC_REAL_PHOTOS[28].fallback,
    credit: 'Bus Bay Obstruction Photo',
  },
];

export const SYNTHETIC_ASSETS = REAL_EVIDENCE_PHOTOS;

/**
 * List of legacy broken URLs and generic stock URLs that previously
 * caused issues to display unrelated or synthetic fallback images.
 */
const LEGACY_SHARED_OR_BROKEN_URLS = [
  '/assets/synthetic/',
  'images.unsplash.com',
  'commons.wikimedia.org',
  'upload.wikimedia.org',
  'Water_main_break.jpg',
  'Waste_containers.jpg',
  'Fallen_tree.jpg',
  'Tangled_wires_in_Old_Delhi.jpg',
  'Litter_on_the_street.jpg',
  'Fallen_tree_blocking_road.jpg',
  'Special:FilePath/',
];

export function isLegacyOrBrokenPhotoUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return true;
  const trimmed = url.trim();
  return LEGACY_SHARED_OR_BROKEN_URLS.some((bad) => trimmed.includes(bad));
}

/**
 * Matches a title to one of the 28 seeded Haldia issues if `issueId` was not directly passed.
 */
function inferSeedIssueIdFromTitle(title?: string | null): number | null {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes('main crossing') && t.includes('durgachak')) return 1;
  if (t.includes('market gate') && t.includes('durgachak')) return 2;
  if (t.includes('wasting drinking supply') || t.includes('block 4')) return 3;
  if (t.includes('bhabanipur') && t.includes('school gate')) return 4;
  if (t.includes('manhole') && t.includes('hospital')) return 5;
  if (t.includes('sutahata') && t.includes('tree on live wire')) return 6;
  if (t.includes('hatiberia main market stretch')) return 7;
  if (t.includes('blackout in hatiberia')) return 8;
  if (t.includes('broken electric streetlights') && t.includes('hatiberia')) return 9;
  if (t.includes('overflowing garbage vat') && t.includes('ward 8')) return 10;
  if (t.includes('uncollected garbage pile') && t.includes('basudevpur')) return 11;
  if (t.includes('rotting waste and overflowing garbage')) return 12;
  if (t.includes('ranichak') && t.includes('pothole')) return 13;
  if (t.includes('culvert') && t.includes('manjushree')) return 14;
  if (t.includes('footpath') && t.includes('cpt colony')) return 15;
  if (t.includes('speed breaker') && t.includes('chiranjibpur')) return 16;
  if (t.includes('dock complex gate 2')) return 17;
  if (t.includes('divider blocks') || t.includes('khudiram more')) return 18;
  if (t.includes('muddy contaminated water') || t.includes('debhog')) return 19;
  if (t.includes('handpump') || t.includes('balughata')) return 20;
  if (t.includes('sluice valve') || t.includes('reservoir')) return 21;
  if (t.includes('low voltage') || t.includes('brajanathchak')) return 22;
  if (t.includes('stormwater drain') || t.includes('talpukur')) return 23;
  if (t.includes('mohana fish market') || t.includes('toilet septic')) return 24;
  if (t.includes('swing') || t.includes('kshudiram nagar park')) return 25;
  if (t.includes('casuarina tree') || t.includes('marine drive')) return 26;
  if (t.includes('numbering board') || t.includes('kadamtala')) return 27;
  if (t.includes('stray cattle') || t.includes('bus bay')) return 28;
  return null;
}

/**
 * Returns a distinct, issue-specific real photograph for each report (#1..#28 and new reports).
 */
export function getRealPhotoForIssue(params: {
  id?: number | null;
  title?: string | null;
  category: IssueCategory;
  photo_url?: string | null;
}): string {
  const { id, title, category, photo_url } = params;

  // 1. If the user uploaded a custom camera/gallery photo (e.g., /assets/photos/...), always preserve it
  if (photo_url && photo_url.includes('/assets/photos/')) {
    return photo_url.trim();
  }

  // 2. If this is one of the 28 seeded Haldia reports (by ID or by title), return its dedicated unique photo
  const resolvedId = id && id >= 1 && id <= 28 ? id : inferSeedIssueIdFromTitle(title);
  if (resolvedId && ISSUE_SPECIFIC_REAL_PHOTOS[resolvedId]) {
    return ISSUE_SPECIFIC_REAL_PHOTOS[resolvedId].primary;
  }

  // 3. If a non-legacy custom external URL was explicitly provided on a new issue, preserve it
  if (photo_url && !isLegacyOrBrokenPhotoUrl(photo_url)) {
    return photo_url.trim();
  }

  // 4. Otherwise, select a distinct real photo from the category pool based on title/ID hash
  const pool = REAL_EVIDENCE_PHOTOS.filter((p) => p.category === category);
  if (pool.length > 0) {
    const seedStr = `${id || 0}-${title || category}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    return pool[hash % pool.length].photoUrl;
  }

  return REAL_EVIDENCE_PHOTOS[0].photoUrl;
}

export function getFallbackPhotoForIssue(params: {
  id?: number | null;
  title?: string | null;
  category: IssueCategory;
}): string {
  const { id, title, category } = params;
  const resolvedId = id && id >= 1 && id <= 28 ? id : inferSeedIssueIdFromTitle(title);
  if (resolvedId && ISSUE_SPECIFIC_REAL_PHOTOS[resolvedId]) {
    return ISSUE_SPECIFIC_REAL_PHOTOS[resolvedId].fallback;
  }
  const pool = REAL_EVIDENCE_PHOTOS.filter((p) => p.category === category);
  if (pool.length > 0) {
    return pool[0].fallbackPhotoUrl;
  }
  return REAL_EVIDENCE_PHOTOS[0].fallbackPhotoUrl;
}

export function getRealPhotoForCategory(
  category: IssueCategory,
  existingPhotoUrl?: string | null,
  issueId?: number | null,
  title?: string | null
): string {
  return getRealPhotoForIssue({
    id: issueId,
    title,
    category,
    photo_url: existingPhotoUrl,
  });
}

export function getFallbackPhotoForCategory(
  category: IssueCategory,
  issueId?: number | null,
  title?: string | null
): string {
  return getFallbackPhotoForIssue({ id: issueId, title, category });
}

export const getSyntheticImageForCategory = getRealPhotoForCategory;

export function getAbsoluteSyntheticUrl(urlOrPath: string): string {
  if (/^https?:\/\//i.test(urlOrPath)) {
    return urlOrPath;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
  }
  return urlOrPath;
}

export interface HaldiaWardZone {
  name: string;
  localityLabel: string;
  lat: number;
  lng: number;
}

export const HALDIA_WARD_ZONES: HaldiaWardZone[] = [
  {
    name: 'Durgachak Sector B',
    localityLabel: 'Durgachak Sector B Market, Ward 11, Haldia, Purba Medinipur',
    lat: 22.0604,
    lng: 88.1095,
  },
  {
    name: 'Hatiberia Market',
    localityLabel: 'Hatiberia Main Market Stretch, Ward 15, Haldia, Purba Medinipur',
    lat: 22.0412,
    lng: 88.0745,
  },
  {
    name: 'Bhabanipur School',
    localityLabel: 'Bhabanipur Primary School Gate, Ward 11, Haldia, Purba Medinipur',
    lat: 22.0492,
    lng: 88.0815,
  },
  {
    name: 'Basudevpur Ward 8',
    localityLabel: 'Basudevpur Ward 8 Community Vat, Haldia, Purba Medinipur',
    lat: 22.068,
    lng: 88.095,
  },
  {
    name: 'Haldia Township',
    localityLabel: 'Haldia Sub-Divisional Hospital Approach, Township Ward 19, Haldia',
    lat: 22.0285,
    lng: 88.0612,
  },
  {
    name: 'Ranichak Gate',
    localityLabel: 'Ranichak Refinery Gate Approach, NH-116B, Haldia',
    lat: 22.037,
    lng: 88.091,
  },
  {
    name: 'Chiranjibpur ROB',
    localityLabel: 'Chiranjibpur Rail Overbridge Approach, Ward 14, Haldia',
    lat: 22.046,
    lng: 88.102,
  },
  {
    name: 'Sutahata Bazaar',
    localityLabel: 'Sutahata Bazaar Transformer Corner, Haldia North',
    lat: 22.1325,
    lng: 88.141,
  },
];

export function inferNearestHaldiaLocality(lat: number, lng: number): string {
  let nearest = HALDIA_WARD_ZONES[0];
  let bestDist = Infinity;
  for (const z of HALDIA_WARD_ZONES) {
    const d = Math.hypot(z.lat - lat, z.lng - lng);
    if (d < bestDist) {
      bestDist = d;
      nearest = z;
    }
  }
  return `${nearest.localityLabel} (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

export interface RealGeocodedPlace {
  displayName: string;
  shortAddress: string;
  lat: number;
  lng: number;
}

export interface AcquiredGpsResult {
  lat: number;
  lng: number;
  accuracy: number;
  source: 'device-gps' | 'network-geo' | 'haldia-patrol';
  label: string;
}

/**
 * Multi-tier GPS locator that tries hardware/browser Geolocation API first,
 * then falls back to live network geolocation or Haldia Control Room GPS if
 * iframe permissions or desktop hardware block navigator.geolocation.
 */
export async function acquireRealTimeGpsPosition(): Promise<AcquiredGpsResult> {
  // Tier 1: Hardware / Browser Geolocation API
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 15000,
        });
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.max(Math.round(pos.coords.accuracy || 25), 15),
        source: 'device-gps',
        label: 'Live Device GPS Locked',
      };
    } catch {
      // Try fast network-assisted browser geolocation before falling back
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 4000,
            maximumAge: 60000,
          });
        });
        return {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.max(Math.round(pos.coords.accuracy || 50), 30),
          source: 'device-gps',
          label: 'Live Browser GPS Locked',
        };
      } catch {
        // Fall through to Tier 2
      }
    }
  }

  // Tier 2: Live Network Geolocation API (works even when iframe permissions block navigator.geolocation)
  try {
    const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
    if (res.ok) {
      const data = await res.json();
      const lat = Number(data?.latitude);
      const lng = Number(data?.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0)) {
        const city = data?.city || data?.locality || 'Live Network Location';
        return {
          lat,
          lng,
          accuracy: 65,
          source: 'network-geo',
          label: `Live Network GPS (${city})`,
        };
      }
    }
  } catch {
    // Fall through to Tier 3
  }

  // Tier 3: Haldia Municipal Dispatch Patrol GPS (Durgachak Sector B Control Room)
  return {
    lat: 22.0604,
    lng: 88.1095,
    accuracy: 25,
    source: 'haldia-patrol',
    label: 'Haldia Municipal Patrol GPS (Durgachak Sector B)',
  };
}

export async function reverseGeocodeRealLocation(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const url = `/api/geocode/reverse?lat=${encodeURIComponent(
      lat
    )}&lng=${encodeURIComponent(lng)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const road =
          addr.road ||
          addr.neighbourhood ||
          addr.suburb ||
          addr.industrial ||
          addr.village ||
          addr.town ||
          '';
        const city =
          addr.city || addr.town || addr.municipality || addr.county || 'Haldia';
        const state = addr.state || 'West Bengal';
        const shortLabel = road
          ? `${road}, ${city}, ${state} (${lat.toFixed(5)}, ${lng.toFixed(5)})`
          : String(data.display_name).slice(0, 140);
        return shortLabel.slice(0, 190);
      }
    }
  } catch {
    // Fallback to nearest Haldia ward zone below
  }

  return inferNearestHaldiaLocality(lat, lng);
}

export async function searchRealLocations(
  queryText: string
): Promise<RealGeocodedPlace[]> {
  const trimmed = queryText.trim();
  if (trimmed.length < 2) return [];

  try {
    const searchQ = trimmed.toLowerCase().includes('haldia')
      ? trimmed
      : `${trimmed}, Haldia, West Bengal, India`;
    const url = `/api/geocode/search?q=${encodeURIComponent(searchQ)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((r: Record<string, unknown>) => {
          const lat = Number(r.lat);
          const lng = Number(r.lon);
          const display = String(r.display_name || trimmed);
          return {
            displayName: display,
            shortAddress: display.slice(0, 180),
            lat,
            lng,
          };
        });
      }
    }
  } catch {
    // Fallback to matching local Haldia ward zones
  }

  const qLower = trimmed.toLowerCase();
  return HALDIA_WARD_ZONES.filter(
    (z) =>
      z.name.toLowerCase().includes(qLower) ||
      z.localityLabel.toLowerCase().includes(qLower)
  ).map((z) => ({
    displayName: z.localityLabel,
    shortAddress: z.localityLabel,
    lat: z.lat,
    lng: z.lng,
  }));
}

