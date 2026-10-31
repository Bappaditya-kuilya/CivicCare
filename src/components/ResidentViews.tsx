import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Info,
  MapPin,
  Search,
  Send,
  FileText,
  ArrowRight,
  RotateCcw,
  Camera,
  Upload,
  Crosshair,
} from 'lucide-react';
import {
  IssueCategory,
  IssueStatus,
  PublicIssueDetail,
  TriagePreviewResponse,
} from '../types';
import { CivicReportIllustration, TrackLookupIllustration } from './Illustrations';
import {
  previewTriageFromFirestore,
  createIssueInFirestore,
  getIssueByIdFromFirestore,
} from '../lib/firebase';
import {
  REAL_EVIDENCE_PHOTOS,
  getRealPhotoForCategory,
  getAbsoluteSyntheticUrl,
} from '../lib/syntheticAssets';
import {
  HaldiaLocationPickerMap,
  HaldiaSingleIssueMap,
} from './HaldiaIssueMap';
import { CivicRealImage } from './CivicRealImage';
import { IssueActivityLog } from './IssueActivityLog';

interface ReportIssueViewProps {
  onSuccess: (result: {
    id: number;
    category: IssueCategory;
    status: IssueStatus;
    similar_to: number[];
  }) => void;
  onNavigateIssue: (id: number) => void;
  prefillData?: {
    title: string;
    description: string;
    location: string;
    photo_url?: string;
    lat?: number;
    lng?: number;
  } | null;
  onClearPrefill?: () => void;
}

const HALDIA_SAMPLE_PRESETS = [
  {
    label: 'Urgent Live Wire (High Priority)',
    title: 'Live wire sparking dangerously near Durgachak school gate',
    description:
      'High-voltage overhead electric wire snapped after storm and is throwing sparks right outside Durgachak primary school gate. Urgent danger to children and commuters.',
    location: 'Durgachak Primary School Gate, Ward 11, Haldia',
    lat: 22.0604,
    lng: 88.1095,
    photoUrl: '/assets/issues/issue-4.jpg',
  },
  {
    label: 'Duplicate Pipe Leak (Triggers R10 Hint)',
    title: 'Burst drinking water pipeline flooding Durgachak Sector B market',
    description:
      'Clean drinking water is gushing from the broken underground pipeline near Durgachak Sector B market crossing and tap water supply is completely cut off.',
    location: 'Durgachak Sector B Market, Haldia',
    lat: 22.0609,
    lng: 88.1101,
    photoUrl: '/assets/issues/issue-1.jpg',
  },
  {
    label: 'Bengali / Hindi Keywords (R12 Triage)',
    title: 'Rastar jol pipe leak and kachra nali overflowing in Basudevpur',
    description:
      'Boro rasta gaddha with paani pipe leak and ganda nali overflowing near Basudevpur ration shop causing severe durgandho and machhar.',
    location: 'Basudevpur Ward 8 Ration Shop Lane, Haldia',
    lat: 22.068,
    lng: 88.095,
    photoUrl: '/assets/issues/issue-10.jpg',
  },
  {
    label: 'Road Pothole Hazard',
    title: 'Deep pothole crater on Ranichak refinery highway crossing',
    description:
      'Asphalt surface has collapsed into a 1-foot deep pothole near Ranichak refinery gate causing two-wheelers to skid at night.',
    location: 'Ranichak Refinery Gate Approach, Haldia',
    lat: 22.037,
    lng: 88.091,
    photoUrl: '/assets/issues/issue-13.jpg',
  },
];

function validateClientPayload(fields: {
  title: string;
  description: string;
  location: string;
  photoUrl: string;
  lat: string;
  lng: string;
}): Record<string, string> {
  const errs: Record<string, string> = {};
  const t = fields.title.trim();
  const d = fields.description.trim();
  const l = fields.location.trim();
  const p = fields.photoUrl.trim();

  if (t.length < 5 || t.length > 120) {
    errs.title = 'Title must be between 5 and 120 characters.';
  }
  if (d.length < 10 || d.length > 2000) {
    errs.description = 'Description must be between 10 and 2,000 characters.';
  }
  if (l.length < 3 || l.length > 200) {
    errs.location = 'Location must be between 3 and 200 characters.';
  }
  if (p.length > 0 && (p.length > 500 || !/^(\/assets\/|https?:\/\/)\S+$/i.test(p))) {
    errs.photo_url = 'Photo link must be a valid /assets/ or http(s):// URL under 500 characters.';
  }
  if (fields.lat.trim()) {
    const parsedLat = Number(fields.lat);
    if (Number.isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      errs.lat = 'Latitude must be between -90 and 90.';
    }
  }
  if (fields.lng.trim()) {
    const parsedLng = Number(fields.lng);
    if (Number.isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      errs.lng = 'Longitude must be between -180 and 180.';
    }
  }
  return errs;
}

/**
 * Compresses a user-selected real image file onto an HTML5 Canvas and returns a JPEG data URL.
 */
async function compressImageFileToJpegDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file format.'));
      img.onload = () => {
        const maxWidth = 960;
        const maxHeight = 720;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const ReportIssueView: React.FC<ReportIssueViewProps> = ({
  onSuccess,
  onNavigateIssue,
  prefillData,
  onClearPrefill,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Durgachak Sector B Market, Ward 11, Haldia');
  const [photoUrl, setPhotoUrl] = useState<string>(REAL_EVIDENCE_PHOTOS[0].photoUrl);
  const [customPhotoUploaded, setCustomPhotoUploaded] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [lat, setLat] = useState('22.0604');
  const [lng, setLng] = useState('88.1095');
  const [website, setWebsite] = useState(''); // Honeypot

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [triagePreview, setTriagePreview] = useState<TriagePreviewResponse | null>(null);

  useEffect(() => {
    if (prefillData) {
      setTitle(prefillData.title);
      setDescription(prefillData.description);
      setLocation(prefillData.location);
      if (prefillData.lat !== undefined) setLat(String(prefillData.lat));
      if (prefillData.lng !== undefined) setLng(String(prefillData.lng));
      if (prefillData.photo_url) {
        setPhotoUrl(prefillData.photo_url);
      }
      setFieldErrors({});
      setErrorBanner(null);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillData, onClearPrefill]);

  // Debounced live triage & duplicate hint preview from Cloud Firestore
  useEffect(() => {
    if (title.trim().length < 4 && description.trim().length < 6) {
      setTriagePreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const preview = await previewTriageFromFirestore(title, description, location);
        setTriagePreview(preview);
        // Auto-sync real photo to matched category unless user uploaded their own camera photo
        if (!customPhotoUploaded) {
          const matchedRealPhoto = getRealPhotoForCategory(preview.category);
          setPhotoUrl(matchedRealPhoto);
        }
      } catch {
        // Ignore transient preview errors
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [title, description, location, customPhotoUploaded]);

  const applyPreset = (preset: (typeof HALDIA_SAMPLE_PRESETS)[number]) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setLocation(preset.location);
    setLat(String(preset.lat));
    setLng(String(preset.lng));
    setCustomPhotoUploaded(false);
    setPhotoUrl(preset.photoUrl);
    setUploadStatusMsg(null);
    setFieldErrors({});
    setErrorBanner(null);
  };

  const handleSelectRealPresetPhoto = (url: string) => {
    setCustomPhotoUploaded(false);
    setPhotoUrl(url);
    setUploadStatusMsg(null);
  };

  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setUploadStatusMsg('Processing & uploading your real photograph...');
    setErrorBanner(null);

    try {
      const compressedDataUrl = await compressImageFileToJpegDataUrl(file);
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: compressedDataUrl }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Could not upload photograph.');
      }

      const data = await res.json();
      const fullUrl = getAbsoluteSyntheticUrl(data.relativePath);
      setPhotoUrl(fullUrl);
      setCustomPhotoUploaded(true);
      setUploadStatusMsg(`Uploaded real photo: ${file.name}`);
    } catch (err) {
      setUploadStatusMsg(
        err instanceof Error ? err.message : 'Failed to upload photo.'
      );
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleMapLocationPick = (newLat: number, newLng: number, inferredLoc?: string) => {
    setLat(String(newLat));
    setLng(String(newLng));
    if (inferredLoc) {
      setLocation(inferredLoc);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setLocation('Durgachak Sector B Market, Ward 11, Haldia');
    setCustomPhotoUploaded(false);
    setPhotoUrl(REAL_EVIDENCE_PHOTOS[0].photoUrl);
    setUploadStatusMsg(null);
    setLat('22.0604');
    setLng('88.1095');
    setFieldErrors({});
    setErrorBanner(null);
    setTriagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setErrorBanner(null);
    const errs = validateClientPayload({ title, description, location, photoUrl, lat, lng });
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setErrorBanner('Please fix the highlighted validation errors.');
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

    try {
      const result = await createIssueInFirestore({
        title,
        description,
        location,
        photo_url: photoUrl.trim() || null,
        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,
        website,
      });

      onSuccess(result);
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Could not save report to Cloud Firestore. Your form text is preserved.'
      );
      setSubmitting(false);
    }
  };

  const numericLat = Number(lat) || 22.0604;
  const numericLng = Number(lng) || 88.1095;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#17181d] leading-tight">
            Report a Civic Issue
          </h1>
          <p className="text-sm sm:text-[15px] text-[#5e606b] mt-1">
            Point to your real-time GPS location on the map, attach a real photograph, and submit in under 60 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="h-10 px-3.5 rounded-[8px] border border-[#d8dbe2] bg-white text-[#17181d] hover:bg-[#f7f8fb] text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#5e606b]" />
            <span>Reset Form</span>
          </button>
        </div>
      </div>

      {/* Quick Test Presets Bar */}
      <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-[#5e606b]">
            Quick Demo Scenarios (Click to autofill report, real GPS coordinates &amp; real photograph):
          </span>
          <span className="text-xs text-[#858793]">
            Supports English, Romanised Bengali &amp; Hindi keywords
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {HALDIA_SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="text-left p-2.5 rounded-[8px] border border-[#d8dbe2] bg-[#f7f8fb] hover:border-[#4f46c8] hover:bg-[#e8e8fb]/50 transition-colors cursor-pointer group"
            >
              <div className="text-xs font-semibold text-[#17181d] group-hover:text-[#4f46c8] truncate">
                {preset.label}
              </div>
              <div className="text-[11px] text-[#5e606b] truncate mt-0.5">
                {preset.location}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Creation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Sections */}
        <form onSubmit={handleSubmit} noValidate className="lg:col-span-7 space-y-5">
          {errorBanner && (
            <div
              role="alert"
              className="p-4 rounded-[12px] border border-[#a33e3e] bg-[#fae4e4] text-[#a33e3e] text-sm flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Validation Error</div>
                <div className="mt-0.5">{errorBanner}</div>
              </div>
            </div>
          )}

          {/* Section 01: Summary & Description */}
          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#d8dbe2] pb-3">
              <h2 className="text-[17px] font-semibold text-[#17181d]">
                01. Issue Summary &amp; Description
              </h2>
              <p className="text-xs text-[#5e606b] mt-0.5">
                Describe what is broken and any immediate danger (e.g., live wire, open manhole, burst main).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="issue-title" className="block text-sm font-medium text-[#17181d]">
                  Issue Title <span className="text-[#a33e3e]">*</span>
                </label>
                <span className="text-xs font-mono tabular-nums text-[#858793]">
                  {title.trim().length}/120 chars (min 5)
                </span>
              </div>
              <input
                id="issue-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Live wire sparking near Bhabanipur school gate"
                className={`w-full h-11 px-3.5 rounded-[8px] border text-sm bg-white text-[#17181d] placeholder:text-[#858793] focus:outline-none focus:ring-2 focus:ring-[#4f46c8] ${
                  fieldErrors.title ? 'border-[#a33e3e]' : 'border-[#d8dbe2]'
                }`}
              />
              {fieldErrors.title && (
                <p className="text-xs text-[#a33e3e] mt-1.5 font-medium">{fieldErrors.title}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="issue-description" className="block text-sm font-medium text-[#17181d]">
                  Detailed Description <span className="text-[#a33e3e]">*</span>
                </label>
                <span className="text-xs font-mono tabular-nums text-[#858793]">
                  {description.trim().length}/2000 chars (min 10)
                </span>
              </div>
              <textarea
                id="issue-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide clear details so the ward officer can dispatch the right crew (10–2,000 characters)..."
                className={`w-full p-3.5 rounded-[8px] border text-sm bg-white text-[#17181d] placeholder:text-[#858793] focus:outline-none focus:ring-2 focus:ring-[#4f46c8] ${
                  fieldErrors.description ? 'border-[#a33e3e]' : 'border-[#d8dbe2]'
                }`}
              />
              {fieldErrors.description && (
                <p className="text-xs text-[#a33e3e] mt-1.5 font-medium">{fieldErrors.description}</p>
              )}
            </div>
          </div>

          {/* Section 02: Real-Time GPS Map Pin & Real Street Address */}
          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d8dbe2] pb-3">
              <div>
                <h2 className="text-[17px] font-semibold text-[#17181d] flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-[#4f46c8]" />
                  <span>02. Real-Time GPS Location &amp; Street Address</span>
                </h2>
                <p className="text-xs text-[#5e606b] mt-0.5">
                  Use your live browser GPS, search any real address, or click anywhere on the map to point to the exact real location.
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#4f46c8] font-semibold">
                {numericLat.toFixed(5)}° N, {numericLng.toFixed(5)}° E
              </span>
            </div>

            {/* Interactive Real-Time Map Pin Picker */}
            <HaldiaLocationPickerMap
              lat={numericLat}
              lng={numericLng}
              onChangeLocation={handleMapLocationPick}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="issue-location" className="block text-sm font-medium text-[#17181d]">
                  Real Street Address / Landmark <span className="text-[#a33e3e]">*</span>
                </label>
                <span className="text-xs font-mono tabular-nums text-[#858793]">
                  {location.trim().length}/200 chars
                </span>
              </div>
              <input
                id="issue-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Durgachak Sector B Market, Ward 11, Haldia"
                className={`w-full h-11 px-3.5 rounded-[8px] border text-sm bg-white text-[#17181d] placeholder:text-[#858793] focus:outline-none focus:ring-2 focus:ring-[#4f46c8] ${
                  fieldErrors.location ? 'border-[#a33e3e]' : 'border-[#d8dbe2]'
                }`}
              />
              {fieldErrors.location && (
                <p className="text-xs text-[#a33e3e] mt-1.5 font-medium">{fieldErrors.location}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="issue-lat" className="block text-xs font-medium text-[#5e606b] mb-1">
                  Latitude (Real GPS)
                </label>
                <input
                  id="issue-lat"
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full h-9 px-3 rounded-[8px] border border-[#d8dbe2] text-xs font-mono tabular-nums bg-[#f7f8fb]"
                />
                {fieldErrors.lat && <p className="text-xs text-[#a33e3e] mt-1">{fieldErrors.lat}</p>}
              </div>
              <div>
                <label htmlFor="issue-lng" className="block text-xs font-medium text-[#5e606b] mb-1">
                  Longitude (Real GPS)
                </label>
                <input
                  id="issue-lng"
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full h-9 px-3 rounded-[8px] border border-[#d8dbe2] text-xs font-mono tabular-nums bg-[#f7f8fb]"
                />
                {fieldErrors.lng && <p className="text-xs text-[#a33e3e] mt-1">{fieldErrors.lng}</p>}
              </div>
            </div>
          </div>

          {/* Section 03: Real Issue Photograph Upload & Selection */}
          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d8dbe2] pb-3">
              <div>
                <h2 className="text-[17px] font-semibold text-[#17181d] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#4f46c8]" />
                  <span>03. Real Issue Photograph Evidence</span>
                </h2>
                <p className="text-xs text-[#5e606b] mt-0.5">
                  Upload a real photo from your device/camera, select a real civic infrastructure photograph below, or paste a photo URL.
                </p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUploadChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-3.5 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? 'Uploading...' : 'Upload / Capture Real Photo'}</span>
                </button>
              </div>
            </div>

            {uploadStatusMsg && (
              <div className="text-xs font-medium text-[#4f46c8] bg-[#e8e8fb]/60 border border-[#c9c8f1] rounded-[8px] px-3 py-2">
                {uploadStatusMsg}
              </div>
            )}

            {/* Real Photograph Thumbnail Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {REAL_EVIDENCE_PHOTOS.map((asset) => {
                const isSelected = photoUrl === asset.photoUrl;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleSelectRealPresetPhoto(asset.photoUrl)}
                    className={`text-left rounded-[8px] border p-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#4f46c8] bg-[#e8e8fb]/60 ring-2 ring-[#4f46c8]/30'
                        : 'border-[#d8dbe2] bg-[#f7f8fb] hover:border-[#c7cad3]'
                    }`}
                  >
                    <CivicRealImage
                      category={asset.category}
                      photoUrl={asset.photoUrl}
                      alt={asset.label}
                      className="w-full h-16 object-cover rounded-[5px] border border-[#d8dbe2] bg-[#171925]"
                    />
                    <div className="text-[11px] font-semibold text-[#17181d] mt-1.5 truncate">
                      {asset.category}
                    </div>
                    <div className="text-[10px] text-[#5e606b] truncate">
                      {asset.label}
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label htmlFor="issue-photo" className="block text-xs font-medium text-[#5e606b] mb-1">
                Real Photograph URL (http/https)
              </label>
              <input
                id="issue-photo"
                type="url"
                value={photoUrl}
                onChange={(e) => {
                  setCustomPhotoUploaded(true);
                  setPhotoUrl(e.target.value);
                }}
                placeholder="https://commons.wikimedia.org/wiki/Special:FilePath/Pothole.jpg?width=800"
                className={`w-full h-10 px-3.5 rounded-[8px] border text-xs font-mono bg-white text-[#17181d] focus:outline-none focus:ring-2 focus:ring-[#4f46c8] ${
                  fieldErrors.photo_url ? 'border-[#a33e3e]' : 'border-[#d8dbe2]'
                }`}
              />
              {fieldErrors.photo_url && (
                <p className="text-xs text-[#a33e3e] mt-1.5 font-medium">{fieldErrors.photo_url}</p>
              )}
            </div>

            {/* Honeypot input */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="issue-website">Website</label>
              <input
                id="issue-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#d8dbe2]">
              <span className="text-xs text-[#5e606b]">
                Cloud Firestore Synced · Real GPS Coordinates &amp; Real Photograph attached
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="h-11 px-6 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] disabled:opacity-50 text-white font-semibold text-sm shadow-xs inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting to Firestore...' : 'Submit Civic Report'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Live Real Photograph Preview + Automated Triage Preview */}
        <div className="lg:col-span-5 space-y-5">
          {/* Active Real Photograph Preview Card */}
          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#17181d]">
                Attached Real Field Photograph
              </h2>
              <span className="text-xs font-mono text-[#4f46c8] font-medium">
                {numericLat.toFixed(5)}°N, {numericLng.toFixed(5)}°E
              </span>
            </div>
            <div className="rounded-[10px] overflow-hidden border border-[#d8dbe2] bg-[#171925]">
              <CivicRealImage
                category={triagePreview?.category || 'Road'}
                photoUrl={photoUrl}
                alt="Attached real civic issue photograph"
                className="w-full h-52 object-cover"
              />
            </div>
            <p className="text-xs text-[#5e606b]">
              {REAL_EVIDENCE_PHOTOS.find((a) => a.photoUrl === photoUrl)?.caption ||
                'Real photographic field evidence attached to this report.'}
            </p>
          </div>

          {/* Live Automated Triage Preview Card */}
          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#d8dbe2] pb-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#17181d]">
                  Automated Triage Preview
                </h2>
                <p className="text-xs text-[#5e606b]">
                  Real-time keyword classification &amp; Firestore duplicate check
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#4f46c8] font-medium">
                R2 · R3 · R10
              </span>
            </div>

            {triagePreview ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-[8px] bg-[#f7f8fb] border border-[#d8dbe2]">
                    <div className="text-xs text-[#5e606b]">Detected Category</div>
                    <div className="text-base font-bold text-[#17181d] mt-0.5">
                      {triagePreview.category}
                    </div>
                    <div className="text-[11px] text-[#858793] font-mono tabular-nums mt-0.5">
                      Confidence: {Math.round(triagePreview.confidence * 100)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-[8px] bg-[#f7f8fb] border border-[#d8dbe2]">
                    <div className="text-xs text-[#5e606b]">Urgency Signals</div>
                    <div
                      className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
                        triagePreview.urgency_hits > 0 ? 'text-[#a33e3e]' : 'text-[#17181d]'
                      }`}
                    >
                      {triagePreview.urgency_hits} hit{triagePreview.urgency_hits === 1 ? '' : 's'}
                    </div>
                    <div className="text-[11px] text-[#858793] mt-0.5 truncate">
                      {triagePreview.urgent_terms.length > 0
                        ? triagePreview.urgent_terms.join(', ')
                        : 'Standard queue'}
                    </div>
                  </div>
                </div>

                {triagePreview.matched_keywords.length > 0 && (
                  <div className="text-xs text-[#5e606b]">
                    <span className="font-semibold text-[#17181d]">Matched Terms: </span>
                    <span>{triagePreview.matched_keywords.join(' · ')}</span>
                  </div>
                )}

                {/* R10 Duplicate Hint Callout */}
                {triagePreview.duplicates.length > 0 && (
                  <div className="p-3.5 rounded-[10px] border border-[#c9c8f1] bg-[#e8e8fb]/60 space-y-2">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-[#4f46c8] shrink-0 mt-0.5" />
                      <div className="text-xs text-[#17181d]">
                        <span className="font-semibold text-[#4f46c8]">
                          Similar report exists (R10 Duplicate Hint):
                        </span>{' '}
                        We found {triagePreview.duplicates.length} active report
                        {triagePreview.duplicates.length > 1 ? 's' : ''} in this locality. Submitting will automatically link and boost the cluster&apos;s priority score.
                      </div>
                    </div>
                    <div className="space-y-1.5 pl-6">
                      {triagePreview.duplicates.slice(0, 3).map((dup) => (
                        <div
                          key={dup.id}
                          className="flex items-center justify-between gap-2 text-xs bg-white/90 border border-[#d8dbe2] rounded-[6px] px-2.5 py-1.5"
                        >
                          <div className="truncate">
                            <span className="font-mono font-semibold text-[#4f46c8]">#{dup.id}</span>
                            <span className="mx-1.5 text-[#858793]">·</span>
                            <span className="text-[#17181d]">{dup.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigateIssue(dup.id)}
                            className="text-[11px] font-semibold text-[#4f46c8] hover:underline shrink-0 cursor-pointer"
                          >
                            View #{dup.id}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-[#5e606b] py-3">
                Start typing a title and description (or select a quick demo scenario above) to preview automatic department routing and duplicate detection.
              </div>
            )}
          </div>

          {/* Flat Vector Illustration + Informational Callout */}
          <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-5 space-y-4">
            <CivicReportIllustration className="w-full h-32" />
            <div className="flex items-start gap-3 pt-1">
              <Info className="w-4 h-4 text-[#4f46c8] shrink-0 mt-0.5" />
              <div className="text-xs text-[#5e606b] leading-relaxed">
                <div className="font-semibold text-[#17181d] mb-0.5">
                  How Ward Triage Works
                </div>
                Every report is scored using urgency keywords, duplicate cluster volume within 14 days, and report age. Urgent hazards rise to the top of the ward officer&apos;s queue immediately.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ReportSuccessViewProps {
  submission: {
    id: number;
    category: IssueCategory;
    status: IssueStatus;
    similar_to: number[];
  };
  onTrackIssue: (id: number) => void;
  onReportAnother: () => void;
}

export const ReportSuccessView: React.FC<ReportSuccessViewProps> = ({
  submission,
  onTrackIssue,
  onReportAnother,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(submission.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="bg-white border border-[#d8dbe2] rounded-[16px] p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-[10px] bg-[#d8f3e3] text-[#25985a] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#17181d]">
              Civic Issue Reported Successfully
            </h1>
            <p className="text-sm text-[#5e606b] mt-1">
              Saved to Cloud Firestore with your real-time GPS location pin and real photographic evidence. Keep your Issue ID below to check status updates.
            </p>
          </div>
        </div>

        {/* Large Monospace ID Display */}
        <div className="bg-[#f7f8fb] border border-[#d8dbe2] rounded-[12px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-[#5e606b]">
              Official Tracking ID
            </div>
            <div className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-[#4f46c8] mt-1">
              #{submission.id}
            </div>
            <div className="text-xs text-[#5e606b] mt-1.5 flex items-center gap-2">
              <span>Auto-Routed Department: <strong className="text-[#17181d]">{submission.category}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Initial Status: <strong className="text-[#17181d]">{submission.status}</strong></span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="h-10 px-4 rounded-[8px] border border-[#d8dbe2] bg-white hover:bg-[#f4f5f8] text-sm font-medium text-[#17181d] inline-flex items-center gap-2 shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#25985a]" />
                <span className="text-[#25985a]">Copied ID #{submission.id}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#5e606b]" />
                <span>Copy Issue ID</span>
              </>
            )}
          </button>
        </div>

        {submission.similar_to && submission.similar_to.length > 0 && (
          <div className="p-4 rounded-[10px] border border-[#c9c8f1] bg-[#e8e8fb]/60 text-xs text-[#17181d] flex items-start gap-3">
            <Info className="w-4 h-4 text-[#4f46c8] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#4f46c8]">
                Cluster Priority Boosted (R3 / R10):
              </span>{' '}
              Your report matched {submission.similar_to.length} existing unresolved report
              {submission.similar_to.length > 1 ? 's' : ''} (
              {submission.similar_to.map((id) => `#${id}`).join(', ')}). All linked reports have been bumped in the ward authority priority queue.
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#d8dbe2]">
          <button
            type="button"
            onClick={onReportAnother}
            className="h-11 px-4 rounded-[8px] border border-[#d8dbe2] bg-white hover:bg-[#f7f8fb] text-sm font-medium text-[#17181d] inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Submit Another Issue</span>
          </button>

          <button
            type="button"
            onClick={() => onTrackIssue(submission.id)}
            className="h-11 px-6 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-sm font-semibold shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Public Status &amp; Real Map (#{submission.id})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface TrackIssueViewProps {
  initialIssueId: number | null;
  onSelectIssueId: (id: number) => void;
}

export const TrackIssueView: React.FC<TrackIssueViewProps> = ({
  initialIssueId,
  onSelectIssueId,
}) => {
  const [inputId, setInputId] = useState(initialIssueId ? String(initialIssueId) : '');
  const [inputError, setInputError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);
  const [issue, setIssue] = useState<PublicIssueDetail | null>(null);

  const fetchIssueById = async (id: number) => {
    setLoading(true);
    setNotFoundError(null);
    setInputError(null);
    try {
      const data = await getIssueByIdFromFirestore(id);
      if (!data) {
        setIssue(null);
        setNotFoundError(`No issue found with ID #${id}.`);
      } else {
        setIssue(data);
      }
    } catch {
      setNotFoundError('Could not load issue details from Cloud Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialIssueId !== null && Number.isInteger(initialIssueId) && initialIssueId > 0) {
      setInputId(String(initialIssueId));
      fetchIssueById(initialIssueId);
    } else {
      setIssue(null);
      setNotFoundError(null);
    }
  }, [initialIssueId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputId.trim().replace(/^#/, '');
    const parsed = Number(cleaned);
    if (!cleaned || !Number.isInteger(parsed) || parsed <= 0) {
      setInputError('Please enter a valid numeric Issue ID (for example: 1, 4, or 17).');
      return;
    }
    setInputError(null);
    onSelectIssueId(parsed);
    fetchIssueById(parsed);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#17181d]">
          Track Issue Status, Real Map Pin &amp; Timeline
        </h1>
        <p className="text-sm sm:text-[15px] text-[#5e606b] mt-1">
          Enter your numeric Issue ID to inspect the real GPS map location, real issue photograph, and every ward officer note.
        </p>
      </div>

      {/* Lookup Search Bar */}
      <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-5 space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3">
          <div className="flex-1">
            <label htmlFor="track-id-input" className="sr-only">
              Issue ID
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#858793] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="track-id-input"
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                placeholder="Enter Issue ID (e.g., 1, 4, 6, 17)"
                className="w-full h-11 pl-10 pr-4 rounded-[8px] border border-[#d8dbe2] text-sm font-mono tabular-nums bg-white text-[#17181d] focus:outline-none focus:ring-2 focus:ring-[#4f46c8]"
              />
            </div>
            {inputError && (
              <p className="text-xs text-[#a33e3e] mt-1.5 font-medium">{inputError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-11 px-6 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-sm font-semibold shadow-xs inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span>{loading ? 'Looking up...' : 'Check Issue'}</span>
          </button>
        </form>

        {/* Quick Sample IDs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#5e606b]">
          <span>Sample Seeded IDs:</span>
          {[
            { id: 1, label: '#1 Burst Pipe (Open)' },
            { id: 4, label: '#4 Live Wire (Open)' },
            { id: 6, label: '#6 Tree on Wire (In Progress)' },
            { id: 17, label: '#17 Dock Gate Road (Resolved)' },
          ].map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => {
                setInputId(String(sample.id));
                onSelectIssueId(sample.id);
                fetchIssueById(sample.id);
              }}
              className={`px-2.5 py-1 rounded-[6px] border text-xs font-mono transition-colors cursor-pointer ${
                issue?.id === sample.id
                  ? 'border-[#4f46c8] bg-[#e8e8fb] text-[#4f46c8] font-semibold'
                  : 'border-[#d8dbe2] bg-[#f7f8fb] text-[#17181d] hover:border-[#4f46c8]'
              }`}
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-8 text-center text-sm text-[#5e606b]">
          Loading issue details, real GPS map pin, and audit timeline...
        </div>
      )}

      {/* Not Found State */}
      {!loading && notFoundError && (
        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#fae4e4] text-[#a33e3e] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-base font-semibold text-[#17181d]">No Issue Found</div>
          <p className="text-sm text-[#5e606b] max-w-md mx-auto">{notFoundError}</p>
        </div>
      )}

      {/* Empty Introductory State */}
      {!loading && !notFoundError && !issue && (
        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-6 sm:p-8 text-center space-y-4">
          <TrackLookupIllustration className="w-full max-w-sm mx-auto h-32" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#17181d]">
              Transparent Public Accountability Trail
            </h2>
            <p className="text-xs text-[#5e606b] max-w-lg mx-auto">
              Every status transition from Open to In Progress to Resolved requires a timestamped note from the ward authority. Internal priority scores and duplicate counts are kept private on public views (S8).
            </p>
          </div>
        </div>
      )}

      {/* Public Issue Detail, Real Map Pin, Real Photograph & Timeline Card */}
      {!loading && issue && (
        <div className="bg-white border border-[#d8dbe2] rounded-[12px] p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#d8dbe2] pb-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#5e606b]">
                <span className="font-mono font-bold text-sm text-[#4f46c8]">
                  Issue #{issue.id}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#17181d]">{issue.category} Department</span>
                <span aria-hidden="true">·</span>
                <span>Reported {new Date(issue.created_at).toLocaleString()}</span>
              </div>
              <h2 className="text-xl font-bold text-[#17181d]">{issue.title}</h2>
              <div className="flex items-center gap-1.5 text-xs text-[#5e606b]">
                <MapPin className="w-3.5 h-3.5 text-[#4f46c8] shrink-0" />
                <span>{issue.location}</span>
              </div>
            </div>

            <div className="shrink-0">
              {issue.status === 'Resolved' && (
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#25985a]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resolved</span>
                </div>
              )}
              {issue.status === 'In Progress' && (
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#344da6]">
                  <Clock className="w-4 h-4" />
                  <span>In Progress</span>
                </div>
              )}
              {issue.status === 'Open' && (
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#a33e3e]">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Open (Awaiting Dispatch)</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#5e606b]">Reported Description</h3>
            <p className="text-sm text-[#17181d] leading-relaxed whitespace-pre-line">
              {issue.description}
            </p>
          </div>

          {/* Side-by-Side Real Field Photograph + Real-Time Issue Location Map */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[#5e606b]">
                Real Field Photograph ({issue.category})
              </div>
              <div className="rounded-[10px] overflow-hidden border border-[#d8dbe2] bg-[#171925] h-[220px]">
                <CivicRealImage
                  category={issue.category}
                  photoUrl={issue.photo_url}
                  issueId={issue.id}
                  alt={issue.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[#5e606b]">
                Real-Time Reported GPS Location (Street &amp; Satellite)
              </div>
              <HaldiaSingleIssueMap
                id={issue.id}
                title={issue.title}
                location={issue.location}
                category={issue.category}
                status={issue.status}
                lat={issue.lat}
                lng={issue.lng}
                heightClass="h-[220px]"
              />
            </div>
          </div>

          {issue.photo_url && (
            <div>
              <a
                href={getRealPhotoForCategory(
                  issue.category,
                  issue.photo_url,
                  issue.id,
                  issue.title
                )}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4f46c8] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open full resolution real photograph in new tab</span>
              </a>
            </div>
          )}

          {/* Chronological Status Activity Log & Audit Trail */}
          <div className="border-t border-[#d8dbe2] pt-5">
            <IssueActivityLog
              issueId={issue.id}
              currentStatus={issue.status}
              createdAt={issue.created_at}
              updatedAt={issue.updated_at}
              timeline={issue.timeline}
            />
          </div>
        </div>
      )}
    </div>
  );
};
