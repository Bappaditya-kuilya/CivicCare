import React from 'react';

export const CivicReportIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-40' }) => (
  <svg
    viewBox="0 0 360 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Illustration of civic infrastructure reporting and ward dispatch"
  >
    <rect width="360" height="180" rx="12" fill="#F7F8FB" />
    {/* Subtle grid lines */}
    <path d="M0 140H360" stroke="#D8DBE2" strokeWidth="1" />
    <path d="M40 30V140M120 30V140M200 30V140M280 30V140" stroke="#E8E8FB" strokeWidth="1" strokeDasharray="3 3" />

    {/* Municipal building silhouette */}
    <rect x="44" y="64" width="76" height="76" rx="4" fill="#FFFFFF" stroke="#C7CAD3" strokeWidth="1.5" />
    <rect x="56" y="78" width="16" height="16" rx="2" fill="#E8E8FB" />
    <rect x="88" y="78" width="16" height="16" rx="2" fill="#E8E8FB" />
    <rect x="56" y="104" width="16" height="16" rx="2" fill="#E8E8FB" />
    <rect x="88" y="104" width="16" height="36" rx="2" fill="#4F46C8" />
    <path d="M38 64L82 38L126 64H38Z" fill="#E8E8FB" stroke="#4F46C8" strokeWidth="1.5" strokeLinejoin="round" />

    {/* Streetlight & road vector */}
    <path d="M168 140V52H194" stroke="#5E606B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="198" cy="52" r="6" fill="#4F46C8" />
    <path d="M192 62L182 82M198 64V86M204 62L214 82" stroke="#4F46C8" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

    {/* Triage dispatch card graphic */}
    <rect x="220" y="42" width="106" height="82" rx="8" fill="#FFFFFF" stroke="#4F46C8" strokeWidth="1.5" />
    <rect x="232" y="54" width="44" height="8" rx="4" fill="#4F46C8" />
    <rect x="232" y="70" width="80" height="6" rx="3" fill="#D8DBE2" />
    <rect x="232" y="82" width="64" height="6" rx="3" fill="#D8DBE2" />
    <circle cx="240" cy="104" r="8" fill="#D8F3E3" />
    <path d="M236.5 104L239 106.5L244 101.5" stroke="#25985A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="254" y="100" width="52" height="8" rx="4" fill="#D8F3E3" />

    {/* Connecting flow line */}
    <path d="M126 98C152 98 188 82 218 82" stroke="#4F46C8" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export const AuthorityShieldIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-44' }) => (
  <svg
    viewBox="0 0 380 190"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Illustration of ward authority priority queue and dispatch console"
  >
    <rect width="380" height="190" rx="12" fill="#F7F8FB" />
    {/* Priority Queue Stack */}
    <rect x="34" y="32" width="196" height="36" rx="6" fill="#FFFFFF" stroke="#4F46C8" strokeWidth="1.5" />
    <rect x="46" y="44" width="28" height="12" rx="3" fill="#FAE4E4" />
    <rect x="82" y="46" width="96" height="8" rx="4" fill="#17181D" />
    <circle cx="210" cy="50" r="6" fill="#A33E3E" />

    <rect x="34" y="78" width="196" height="36" rx="6" fill="#FFFFFF" stroke="#D8DBE2" strokeWidth="1.5" />
    <rect x="46" y="90" width="28" height="12" rx="3" fill="#E8E8FB" />
    <rect x="82" y="92" width="84" height="8" rx="4" fill="#5E606B" />
    <circle cx="210" cy="96" r="6" fill="#4F46C8" />

    <rect x="34" y="124" width="196" height="36" rx="6" fill="#FFFFFF" stroke="#D8DBE2" strokeWidth="1.5" />
    <rect x="46" y="136" width="28" height="12" rx="3" fill="#D8F3E3" />
    <rect x="82" y="138" width="72" height="8" rx="4" fill="#858793" />
    <circle cx="210" cy="142" r="6" fill="#25985A" />

    {/* Verification Shield */}
    <path
      d="M304 42L346 58V96C346 126 328 148 304 158C280 148 262 126 262 96V58L304 42Z"
      fill="#E8E8FB"
      stroke="#4F46C8"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M291 98L300 107L319 88"
      stroke="#4F46C8"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TrackLookupIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-36' }) => (
  <svg
    viewBox="0 0 340 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Illustration of public issue timeline tracking"
  >
    <rect width="340" height="140" rx="12" fill="#F7F8FB" />
    {/* Timeline horizontal progression */}
    <line x1="64" y1="70" x2="276" y2="70" stroke="#C9C8F1" strokeWidth="3" />
    <circle cx="64" cy="70" r="14" fill="#FFFFFF" stroke="#4F46C8" strokeWidth="2.5" />
    <circle cx="64" cy="70" r="5" fill="#4F46C8" />
    <rect x="40" y="96" width="48" height="8" rx="4" fill="#5E606B" />

    <circle cx="170" cy="70" r="14" fill="#FFFFFF" stroke="#344DA6" strokeWidth="2.5" />
    <circle cx="170" cy="70" r="5" fill="#344DA6" />
    <rect x="142" y="96" width="56" height="8" rx="4" fill="#344DA6" />

    <circle cx="276" cy="70" r="14" fill="#D8F3E3" stroke="#25985A" strokeWidth="2.5" />
    <path d="M271 70L274.5 73.5L281.5 66.5" stroke="#25985A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="252" y="96" width="48" height="8" rx="4" fill="#25985A" />
  </svg>
);
