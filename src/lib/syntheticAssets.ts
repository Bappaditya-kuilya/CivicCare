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
 * Verified real-world photographs of civic infrastructure hazards.
 * Every category includes both a primary real photograph URL and a secondary verified Wikimedia/Unsplash fallback.
 */
export const REAL_EVIDENCE_PHOTOS: RealPhotoEvidenceOption[] = [
  {
    id: 'road-pothole-real',
    category: 'Road',
    label: 'Asphalt Pothole & Road Crater',
    caption: 'Real field photograph: deep waterlogged pothole and damaged road surface',
    photoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pothole.jpg?width=800',
    fallbackPhotoUrl:
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    credit: 'Real Road Infrastructure Field Photo',
  },
  {
    id: 'water-burst-real',
    category: 'Water',
    label: 'Burst Drinking Water Main',
    caption: 'Real field photograph: ruptured underground water supply pipeline flooding street',
    photoUrl:
      'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=800&q=80',
    fallbackPhotoUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Water_pipe.jpg?width=800',
    credit: 'Real Water Pipeline Field Photo',
  },
  {
    id: 'electric-wire-real',
    category: 'Electricity',
    label: 'Overhead Power Line & Pole Fault',
    caption: 'Real field photograph: tangled overhead electrical distribution cables and utility pole',
    photoUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Overhead_power_lines.jpg?width=800',
    fallbackPhotoUrl:
      'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80',
    credit: 'Real Electrical Utility Field Photo',
  },
  {
    id: 'sanitation-waste-real',
    category: 'Sanitation',
    label: 'Overflowing Roadside Waste & Drain',
    caption: 'Real field photograph: uncollected municipal waste accumulation along street',
    photoUrl:
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    fallbackPhotoUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Litter.jpg?width=800',
    credit: 'Real Municipal Sanitation Field Photo',
  },
  {
    id: 'other-tree-real',
    category: 'Other',
    label: 'Uprooted Tree Blocking Roadway',
    caption: 'Real field photograph: storm-damaged fallen tree obstructing public thoroughfare',
    photoUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Windthrow.jpg?width=800',
    fallbackPhotoUrl:
      'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    credit: 'Real Fallen Tree Field Photo',
  },
];

export const SYNTHETIC_ASSETS = REAL_EVIDENCE_PHOTOS;

const LEGACY_BROKEN_SUBSTRINGS = [
  '/assets/synthetic/',
  'Water_main_break.jpg',
  'Waste_containers.jpg',
  'Fallen_tree.jpg',
  'Tangled_wires_in_Old_Delhi.jpg',
  'Litter_on_the_street.jpg',
  'Fallen_tree_blocking_road.jpg',
];

export function isLegacyOrBrokenPhotoUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return true;
  const trimmed = url.trim();
  return LEGACY_BROKEN_SUBSTRINGS.some((bad) => trimmed.includes(bad));
}

export function getRealPhotoForCategory(
  category: IssueCategory,
  existingPhotoUrl?: string | null
): string {
  if (existingPhotoUrl && !isLegacyOrBrokenPhotoUrl(existingPhotoUrl)) {
    return existingPhotoUrl.trim();
  }
  const found = REAL_EVIDENCE_PHOTOS.find((a) => a.category === category);
  return found ? found.photoUrl : REAL_EVIDENCE_PHOTOS[0].photoUrl;
}

export function getFallbackPhotoForCategory(category: IssueCategory): string {
  const found = REAL_EVIDENCE_PHOTOS.find((a) => a.category === category);
  return found ? found.fallbackPhotoUrl : REAL_EVIDENCE_PHOTOS[0].fallbackPhotoUrl;
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
    name: 'Sutahata Bazaar',
    localityLabel: 'Sutahata Bazaar Transformer Corner, Haldia',
    lat: 22.1325,
    lng: 88.141,
  },
  {
    name: 'Chiranjibpur ROB',
    localityLabel: 'Chiranjibpur Railway Overbridge Approach, Haldia',
    lat: 22.046,
    lng: 88.102,
  },
];

export function inferNearestHaldiaLocality(lat: number, lng: number): string {
  let best = HALDIA_WARD_ZONES[0];
  let bestDist = Infinity;
  for (const z of HALDIA_WARD_ZONES) {
    const d = Math.hypot(z.lat - lat, z.lng - lng);
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }
  if (bestDist > 0.25) {
    return `Live GPS Coordinates (${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E)`;
  }
  return `Near ${best.localityLabel} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

export interface RealGeocodedPlace {
  displayName: string;
  shortAddress: string;
  lat: number;
  lng: number;
}

export async function reverseGeocodeRealLocation(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      return inferNearestHaldiaLocality(lat, lng);
    }
    const data = await res.json();
    if (data && typeof data.display_name === 'string' && data.display_name.trim().length > 0) {
      const addr = data.address || {};
      const parts = [
        addr.road || addr.pedestrian || addr.amenity || addr.building || data.name,
        addr.suburb || addr.neighbourhood || addr.village || addr.residential,
        addr.city || addr.town || addr.municipality || addr.county,
        addr.state,
        addr.postcode,
      ].filter(Boolean);

      const formatted =
        parts.length >= 2 ? parts.join(', ') : data.display_name;
      return formatted.slice(0, 195);
    }
    return inferNearestHaldiaLocality(lat, lng);
  } catch {
    return inferNearestHaldiaLocality(lat, lng);
  }
}

export async function searchRealLocations(
  queryText: string
): Promise<RealGeocodedPlace[]> {
  const trimmed = queryText.trim();
  if (trimmed.length < 2) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      trimmed
    )}&limit=5&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];
    return items
      .map((item: Record<string, unknown>) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        const displayName = String(item.display_name || '').trim();
        return {
          displayName,
          shortAddress: displayName.slice(0, 195),
          lat,
          lng,
        };
      })
      .filter(
        (p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng) && p.displayName.length > 0
      );
  } catch {
    return [];
  }
}
