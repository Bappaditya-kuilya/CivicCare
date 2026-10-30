import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  LocateFixed,
  Navigation,
  Search,
  Layers,
  ExternalLink,
  MapPin,
  Loader2,
} from 'lucide-react';
import { AdminIssueItem, IssueCategory, IssueStatus } from '../types';
import {
  HALDIA_WARD_ZONES,
  inferNearestHaldiaLocality,
  reverseGeocodeRealLocation,
  searchRealLocations,
  RealGeocodedPlace,
} from '../lib/syntheticAssets';

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';

const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';

interface HaldiaIssueMapProps {
  issues: AdminIssueItem[];
  selectedIssueId: number | null;
  onSelectIssue: (id: number) => void;
}

export const HaldiaIssueMap: React.FC<HaldiaIssueMapProps> = ({
  issues,
  selectedIssueId,
  onSelectIssue,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [locatingUser, setLocatingUser] = useState(false);
  const [userGpsStatus, setUserGpsStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.048, 88.088],
      zoom: 12,
      scrollWheelZoom: true,
    });

    const tileLayer = L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    const userLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    markersLayerRef.current = layerGroup;
    userLocationLayerRef.current = userLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      userLocationLayerRef.current = null;
    };
  }, []);

  // Switch between Street Map and Real Satellite Imagery
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const newTile = L.tileLayer(
      mapStyle === 'satellite' ? SATELLITE_TILE_URL : OSM_TILE_URL,
      {
        attribution: mapStyle === 'satellite' ? SATELLITE_ATTRIBUTION : OSM_ATTRIBUTION,
        maxZoom: 19,
      }
    ).addTo(map);
    tileLayerRef.current = newTile;
  }, [mapStyle]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    issues.forEach((issue) => {
      if (issue.lat === null || issue.lng === null) return;

      let fillColor = '#4f46c8';
      if (issue.status === 'Resolved') {
        fillColor = '#25985a';
      } else if (issue.band === 'High') {
        fillColor = '#a33e3e';
      } else if (issue.band === 'Medium') {
        fillColor = '#344da6';
      }

      const isSelected = issue.id === selectedIssueId;
      const radius = isSelected ? 12 : issue.band === 'High' && issue.status !== 'Resolved' ? 9 : 7;

      const marker = L.circleMarker([issue.lat, issue.lng], {
        radius,
        fillColor,
        color: isSelected ? '#171925' : '#ffffff',
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.92,
      });

      const tooltipContent = document.createElement('div');
      tooltipContent.className = 'text-xs font-sans max-w-[230px]';
      const titleLine = document.createElement('div');
      titleLine.className = 'font-semibold text-[#17181d]';
      titleLine.textContent = `#${issue.id} · ${issue.title}`;
      const locLine = document.createElement('div');
      locLine.className = 'text-[11px] text-[#4f46c8] mt-0.5';
      locLine.textContent = `${issue.location} (${issue.lat.toFixed(5)}, ${issue.lng.toFixed(5)})`;
      const metaLine = document.createElement('div');
      metaLine.className = 'text-[#5e606b] mt-0.5';
      metaLine.textContent = `${issue.category} · ${issue.status} · Score ${issue.priority} (${issue.band})`;
      tooltipContent.appendChild(titleLine);
      tooltipContent.appendChild(locLine);
      tooltipContent.appendChild(metaLine);

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -6],
      });

      marker.on('click', () => {
        onSelectIssue(issue.id);
      });

      marker.addTo(layerGroup);

      if (isSelected) {
        map.flyTo([issue.lat, issue.lng], Math.max(map.getZoom(), 14), {
          animate: true,
          duration: 0.7,
        });
      }
    });
  }, [issues, selectedIssueId, onSelectIssue]);

  const handleLocateOfficerGps = () => {
    if (!navigator.geolocation) {
      setUserGpsStatus('Browser Geolocation is not supported on this device.');
      return;
    }
    setLocatingUser(true);
    setUserGpsStatus('Acquiring real-time GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const map = mapInstanceRef.current;
        const userLayer = userLocationLayerRef.current;
        if (map && userLayer) {
          userLayer.clearLayers();
          L.circle([latitude, longitude], {
            radius: Math.max(accuracy, 30),
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(userLayer);

          const myDot = L.circleMarker([latitude, longitude], {
            radius: 7,
            fillColor: '#2563eb',
            color: '#ffffff',
            weight: 2.5,
            fillOpacity: 1,
          }).addTo(userLayer);

          myDot.bindTooltip(
            `Your Real-Time GPS Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
            { permanent: true, direction: 'top', offset: [0, -8] }
          );

          map.flyTo([latitude, longitude], 14, { animate: true, duration: 0.9 });
        }
        setUserGpsStatus(
          `Live GPS locked: ${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E (±${Math.round(
            accuracy
          )}m)`
        );
      },
      (err) => {
        setLocatingUser(false);
        setUserGpsStatus(`GPS access error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-2">
      {/* Top Real-Time Map Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLocateOfficerGps}
            disabled={locatingUser}
            className="h-8 px-3 rounded-[6px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {locatingUser ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5" />
            )}
            <span>Point to My Real-Time GPS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const map = mapInstanceRef.current;
              if (map) map.flyTo([22.048, 88.088], 12, { animate: true, duration: 0.7 });
            }}
            className="h-8 px-2.5 rounded-[6px] border border-[#d8dbe2] bg-white hover:bg-[#f7f8fb] text-xs font-medium text-[#17181d] cursor-pointer"
          >
            Reset Haldia View
          </button>

          {userGpsStatus && (
            <span className="text-[11px] font-mono text-[#4f46c8]">{userGpsStatus}</span>
          )}
        </div>

        <div className="inline-flex items-center rounded-[6px] border border-[#d8dbe2] bg-[#f7f8fb] p-0.5">
          <button
            type="button"
            onClick={() => setMapStyle('street')}
            className={`h-7 px-2.5 rounded-[5px] text-xs font-semibold cursor-pointer ${
              mapStyle === 'street' ? 'bg-white text-[#17181d] shadow-xs' : 'text-[#5e606b]'
            }`}
          >
            Street Map
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('satellite')}
            className={`h-7 px-2.5 rounded-[5px] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
              mapStyle === 'satellite' ? 'bg-white text-[#17181d] shadow-xs' : 'text-[#5e606b]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Real Satellite</span>
          </button>
        </div>
      </div>

      <div className="relative w-full h-[380px] rounded-[12px] overflow-hidden border border-[#d8dbe2] bg-[#f7f8fb]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs border border-[#d8dbe2] rounded-[8px] px-3 py-2 text-xs text-[#17181d] shadow-xs flex flex-wrap items-center gap-3">
          <span className="font-semibold text-[#17181d]">Real-Time Dispatch Map:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#a33e3e] inline-block" />
            <span>High Priority</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#344da6] inline-block" />
            <span>Medium</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4f46c8] inline-block" />
            <span>Low / Open</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#25985a] inline-block" />
            <span>Resolved</span>
          </span>
        </div>
      </div>
    </div>
  );
};

interface HaldiaLocationPickerMapProps {
  lat: number;
  lng: number;
  onChangeLocation: (lat: number, lng: number, inferredLocality?: string) => void;
}

export const HaldiaLocationPickerMap: React.FC<HaldiaLocationPickerMapProps> = ({
  lat,
  lng,
  onChangeLocation,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const pinLayerRef = useRef<L.LayerGroup | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const onChangeLocationRef = useRef(onChangeLocation);

  useEffect(() => {
    onChangeLocationRef.current = onChangeLocation;
  }, [onChangeLocation]);

  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [liveTracking, setLiveTracking] = useState(false);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Real Location Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [searchResults, setSearchResults] = useState<RealGeocodedPlace[]>([]);

  const resolveAndEmitLocation = async (
    targetLat: number,
    targetLng: number,
    accuracy?: number
  ) => {
    const roundedLat = Number(targetLat.toFixed(5));
    const roundedLng = Number(targetLng.toFixed(5));
    if (accuracy !== undefined) {
      setGpsAccuracyMeters(Math.round(accuracy));
    }

    // Immediate fallback update so pin moves instantaneously
    const fallbackLabel = inferNearestHaldiaLocality(roundedLat, roundedLng);
    onChangeLocationRef.current(roundedLat, roundedLng, fallbackLabel);

    // Real-time reverse geocoding from OpenStreetMap Nominatim
    setReverseGeocoding(true);
    try {
      const realAddress = await reverseGeocodeRealLocation(roundedLat, roundedLng);
      onChangeLocationRef.current(roundedLat, roundedLng, realAddress);
    } finally {
      setReverseGeocoding(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat || 22.0604, lng || 88.1095],
      zoom: 14,
      scrollWheelZoom: true,
    });

    const tile = L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    const pinLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    tileLayerRef.current = tile;
    pinLayerRef.current = pinLayer;

    map.on('click', (e: L.LeafletMouseEvent) => {
      resolveAndEmitLocation(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      pinLayerRef.current = null;
    };
  }, []);

  // Switch between Street Map and Real Satellite Imagery
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const newTile = L.tileLayer(
      mapStyle === 'satellite' ? SATELLITE_TILE_URL : OSM_TILE_URL,
      {
        attribution: mapStyle === 'satellite' ? SATELLITE_ATTRIBUTION : OSM_ATTRIBUTION,
        maxZoom: 19,
      }
    ).addTo(map);
    tileLayerRef.current = newTile;
  }, [mapStyle]);

  // Render exact reported pin + accuracy circle
  useEffect(() => {
    const map = mapRef.current;
    const pinLayer = pinLayerRef.current;
    if (!map || !pinLayer) return;

    pinLayer.clearLayers();

    if (gpsAccuracyMeters !== null && gpsAccuracyMeters > 0) {
      L.circle([lat, lng], {
        radius: Math.min(Math.max(gpsAccuracyMeters, 20), 600),
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.14,
        weight: 1.5,
      }).addTo(pinLayer);
    }

    // Outer pulse ring
    L.circleMarker([lat, lng], {
      radius: 18,
      fillColor: '#4f46c8',
      color: '#4f46c8',
      weight: 1.5,
      opacity: 0.5,
      fillOpacity: 0.18,
    }).addTo(pinLayer);

    // Inner exact pin
    const mainPin = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: '#a33e3e',
      color: '#ffffff',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 1,
    }).addTo(pinLayer);

    const label = document.createElement('div');
    label.className = 'text-xs font-sans font-semibold text-[#17181d]';
    label.textContent = `Real Location Pin: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
    mainPin.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -10] });

    map.panTo([lat, lng], { animate: true });
  }, [lat, lng, gpsAccuracyMeters]);

  const handleUseMyRealTimeGps = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('Geolocation API is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsStatusMsg('Detecting your real-time physical GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setGpsLoading(false);
        const { latitude, longitude, accuracy } = position.coords;
        const map = mapRef.current;
        if (map) {
          map.flyTo([latitude, longitude], 16, { animate: true, duration: 0.9 });
        }
        setGpsStatusMsg(
          `Locked to your real location (${latitude.toFixed(5)}°, ${longitude.toFixed(
            5
          )}° · ±${Math.round(accuracy)}m)`
        );
        await resolveAndEmitLocation(latitude, longitude, accuracy);
      },
      (err) => {
        setGpsLoading(false);
        setGpsStatusMsg(
          `Could not read browser GPS (${err.message}). Click anywhere on the map or search an address.`
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleToggleLiveTracking = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('Geolocation API is not supported by your browser.');
      return;
    }

    if (liveTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setLiveTracking(false);
      setGpsStatusMsg('Live GPS tracking paused.');
      return;
    }

    setLiveTracking(true);
    setGpsStatusMsg('Real-time GPS tracking active — following your live device location...');
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const map = mapRef.current;
        if (map) {
          map.flyTo([latitude, longitude], Math.max(map.getZoom(), 16), {
            animate: true,
            duration: 0.6,
          });
        }
        setGpsStatusMsg(
          `Live GPS Tracking Active: ${latitude.toFixed(5)}°, ${longitude.toFixed(
            5
          )}° (±${Math.round(accuracy)}m)`
        );
        await resolveAndEmitLocation(latitude, longitude, accuracy);
      },
      (err) => {
        setLiveTracking(false);
        setGpsStatusMsg(`Live GPS tracking stopped: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    watchIdRef.current = id;
  };

  const handleSearchRealPlace = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearchingPlaces(true);
    try {
      const results = await searchRealLocations(searchQuery);
      setSearchResults(results);
      if (results.length > 0) {
        const first = results[0];
        const map = mapRef.current;
        if (map) {
          map.flyTo([first.lat, first.lng], 16, { animate: true, duration: 0.8 });
        }
        onChangeLocation(
          Number(first.lat.toFixed(5)),
          Number(first.lng.toFixed(5)),
          first.shortAddress
        );
      }
    } finally {
      setSearchingPlaces(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Real-Time GPS & Map Layer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUseMyRealTimeGps}
            disabled={gpsLoading}
            className="h-9 px-3.5 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            {gpsLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5" />
            )}
            <span>Use My Real-Time GPS Location</span>
          </button>

          <button
            type="button"
            onClick={handleToggleLiveTracking}
            className={`h-9 px-3 rounded-[8px] border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              liveTracking
                ? 'border-[#25985a] bg-[#d8f3e3] text-[#25985a]'
                : 'border-[#d8dbe2] bg-white hover:bg-[#f7f8fb] text-[#17181d]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{liveTracking ? 'Live GPS Follow: ON' : 'Live GPS Follow: OFF'}</span>
          </button>
        </div>

        {/* Street vs Real Satellite Toggle */}
        <div className="inline-flex items-center rounded-[8px] border border-[#d8dbe2] bg-[#f7f8fb] p-0.5">
          <button
            type="button"
            onClick={() => setMapStyle('street')}
            className={`h-7 px-2.5 rounded-[6px] text-xs font-semibold cursor-pointer ${
              mapStyle === 'street' ? 'bg-white text-[#17181d] shadow-xs' : 'text-[#5e606b]'
            }`}
          >
            Street Map
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('satellite')}
            className={`h-7 px-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
              mapStyle === 'satellite' ? 'bg-white text-[#17181d] shadow-xs' : 'text-[#5e606b]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Real Satellite</span>
          </button>
        </div>
      </div>

      {/* Real-Time OpenStreetMap Nominatim Address Search */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#858793] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchRealPlace();
                }
              }}
              placeholder="Search any real street, town, or landmark (e.g., Durgachak Haldia, Park Street Kolkata)..."
              className="w-full h-9 pl-8 pr-3 rounded-[8px] border border-[#d8dbe2] bg-white text-xs text-[#17181d] placeholder:text-[#858793] focus:outline-none focus:ring-2 focus:ring-[#4f46c8]"
            />
          </div>
          <button
            type="button"
            onClick={handleSearchRealPlace}
            disabled={searchingPlaces}
            className="h-9 px-3.5 rounded-[8px] border border-[#d8dbe2] bg-[#f7f8fb] hover:bg-[#e8e8fb]/60 hover:border-[#4f46c8] text-xs font-semibold text-[#17181d] shrink-0 cursor-pointer"
          >
            {searchingPlaces ? 'Searching...' : 'Find Real Address'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="bg-white border border-[#d8dbe2] rounded-[8px] p-1.5 space-y-1 max-h-36 overflow-y-auto shadow-xs">
            {searchResults.map((place, idx) => (
              <button
                key={`${place.lat}-${place.lng}-${idx}`}
                type="button"
                onClick={() => {
                  const map = mapRef.current;
                  if (map) {
                    map.flyTo([place.lat, place.lng], 16, { animate: true, duration: 0.7 });
                  }
                  onChangeLocation(
                    Number(place.lat.toFixed(5)),
                    Number(place.lng.toFixed(5)),
                    place.shortAddress
                  );
                  setSearchResults([]);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-[6px] hover:bg-[#e8e8fb]/60 text-xs text-[#17181d] flex items-center justify-between gap-2 cursor-pointer"
              >
                <span className="truncate">{place.displayName}</span>
                <span className="text-[10px] font-mono text-[#4f46c8] shrink-0">
                  {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Haldia Ward Jump Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-[#5e606b] mr-1">
          Haldia Wards:
        </span>
        {HALDIA_WARD_ZONES.slice(0, 6).map((zone) => (
          <button
            key={zone.name}
            type="button"
            onClick={() => {
              const map = mapRef.current;
              if (map) {
                map.flyTo([zone.lat, zone.lng], 15, { animate: true, duration: 0.6 });
              }
              resolveAndEmitLocation(zone.lat, zone.lng);
            }}
            className="px-2 py-1 rounded-[6px] border border-[#d8dbe2] bg-[#f7f8fb] hover:border-[#4f46c8] hover:bg-[#e8e8fb]/60 text-[11px] font-medium text-[#17181d] transition-colors cursor-pointer"
          >
            {zone.name}
          </button>
        ))}
      </div>

      {/* Interactive Map Canvas */}
      <div className="relative w-full h-[270px] rounded-[10px] overflow-hidden border border-[#d8dbe2] bg-[#f7f8fb]">
        <div ref={containerRef} className="w-full h-full z-0 cursor-crosshair" />
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[400] bg-white/95 backdrop-blur-xs border border-[#d8dbe2] rounded-[6px] px-2.5 py-1.5 text-[11px] text-[#17181d] font-medium shadow-xs flex flex-wrap items-center justify-between gap-2">
          <span>
            {reverseGeocoding
              ? 'Resolving real street address from OpenStreetMap...'
              : gpsStatusMsg ||
                'Click anywhere on the map or use Live GPS to point to the exact real location'}
          </span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[#4f46c8] font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Verify on Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

interface HaldiaSingleIssueMapProps {
  id: number;
  title: string;
  location: string;
  category: IssueCategory;
  status: IssueStatus;
  lat: number | null;
  lng: number | null;
  heightClass?: string;
}

export const HaldiaSingleIssueMap: React.FC<HaldiaSingleIssueMapProps> = ({
  id,
  title,
  location,
  category,
  status,
  lat,
  lng,
  heightClass = 'h-[220px]',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');

  const safeLat = lat ?? 22.0604;
  const safeLng = lng ?? 88.1095;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [safeLat, safeLng],
      zoom: 15,
      scrollWheelZoom: true,
    });

    const tile = L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    tileRef.current = tile;
    layerRef.current = layer;

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) {
      map.removeLayer(tileRef.current);
    }
    const newTile = L.tileLayer(
      mapStyle === 'satellite' ? SATELLITE_TILE_URL : OSM_TILE_URL,
      {
        attribution: mapStyle === 'satellite' ? SATELLITE_ATTRIBUTION : OSM_ATTRIBUTION,
        maxZoom: 19,
      }
    ).addTo(map);
    tileRef.current = newTile;
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    map.setView([safeLat, safeLng], 15);

    const pinColor =
      status === 'Resolved'
        ? '#25985a'
        : status === 'In Progress'
        ? '#344da6'
        : '#a33e3e';

    L.circleMarker([safeLat, safeLng], {
      radius: 18,
      fillColor: pinColor,
      color: pinColor,
      weight: 1.5,
      opacity: 0.45,
      fillOpacity: 0.15,
    }).addTo(layer);

    const marker = L.circleMarker([safeLat, safeLng], {
      radius: 8,
      fillColor: pinColor,
      color: '#ffffff',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 1,
    }).addTo(layer);

    const tip = document.createElement('div');
    tip.className = 'text-xs font-sans max-w-[200px]';
    const line1 = document.createElement('div');
    line1.className = 'font-bold text-[#17181d]';
    line1.textContent = `#${id} · ${category} (${status})`;
    const line2 = document.createElement('div');
    line2.className = 'text-[11px] text-[#5e606b] truncate';
    line2.textContent = location;
    tip.appendChild(line1);
    tip.appendChild(line2);

    marker.bindTooltip(tip, {
      permanent: true,
      direction: 'top',
      offset: [0, -10],
    });
  }, [id, title, location, category, status, safeLat, safeLng]);

  return (
    <div
      className={`relative w-full ${heightClass} rounded-[10px] overflow-hidden border border-[#d8dbe2] bg-[#f7f8fb]`}
    >
      <div ref={containerRef} className="w-full h-full z-0" />
      <div className="absolute top-2 right-2 z-[400] flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMapStyle(mapStyle === 'street' ? 'satellite' : 'street')}
          className="bg-white/95 hover:bg-white border border-[#d8dbe2] rounded-[6px] px-2 py-1 text-[11px] font-semibold text-[#17181d] shadow-xs cursor-pointer"
        >
          {mapStyle === 'street' ? 'Satellite View' : 'Street View'}
        </button>
      </div>
      <div className="absolute bottom-2 left-2 right-2 z-[400] bg-white/95 backdrop-blur-xs border border-[#d8dbe2] rounded-[6px] px-2.5 py-1 text-[11px] font-mono tabular-nums text-[#17181d] flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 text-[#a33e3e] shrink-0" />
          <span>
            {safeLat.toFixed(5)}° N, {safeLng.toFixed(5)}° E
          </span>
        </span>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${safeLat},${safeLng}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-sans font-semibold text-[#4f46c8] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>Google Maps</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
