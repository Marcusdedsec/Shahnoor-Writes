import React from 'react';

interface OrnamentProps {
  className?: string;
}

/**
 * Handcrafted Kashmiri Chinar (Platanus orientalis) leaf engraving.
 */
export const ChinarLeafMark: React.FC<OrnamentProps> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M32 6C30.5 13 28 18 24 21C19 16.5 13 15.5 8 17C11.5 22 14 27 12.5 32.5C9 34 6.5 36.5 6 40C12 40.5 17 42.5 20.5 46C22 44 25 43 28.5 43.5C30 46 31 50 31.5 58H32.5C33 50 34 46 35.5 43.5C39 43 42 44 43.5 46C47 42.5 52 40.5 58 40C57.5 36.5 55 34 51.5 32.5C50 27 52.5 22 56 17C51 15.5 45 16.5 40 21C36 18 33.5 13 32 6Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M32 10V45" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M32 28L16 21" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M32 28L48 21" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M32 37L14 37" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M32 37L50 37" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
  </svg>
);

/**
 * Kashmiri papier-mâché / naqashi inspired floral medallion section divider.
 */
export const ManuscriptDivider: React.FC<OrnamentProps> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-4 ${className}`} aria-hidden="true">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#493528]/25 to-[#B59A65]/55" />
    <svg
      viewBox="0 0 88 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-20 h-5 text-[#B59A65] shrink-0"
    >
      <path
        d="M44 3C46.5 7 49 9.5 53 12C49 14.5 46.5 17 44 21C41.5 17 39 14.5 35 12C39 9.5 41.5 7 44 3Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <circle cx="44" cy="12" r="2.2" fill="#9C443B" opacity="0.85" />
      <path
        d="M30 12C25 8 20 8.5 16 12C20 15.5 25 16 30 12Z"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M58 12C63 8 68 8.5 72 12C68 15.5 63 16 58 12Z"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M4 12H13" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M75 12H84" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#493528]/25 to-[#B59A65]/55" />
  </div>
);

/**
 * Walnut wood pinjrakari geometric lattice corner detail for manuscript folios.
 */
export const PinjrakariCorner: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M2 2H46M2 2V46" stroke="currentColor" strokeWidth="1.2" />
    <path d="M8 8H32M8 8V32" stroke="currentColor" strokeWidth="0.9" opacity="0.7" />
    <path d="M14 14L24 14L14 24Z" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
    <circle cx="8" cy="8" r="1.75" fill="currentColor" opacity="0.75" />
  </svg>
);

/**
 * Delicate repeating Kashmiri Sozni embroidery border motif.
 */
export const SozniBorderPattern: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
    <svg
      viewBox="0 0 1200 18"
      fill="none"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-4 text-[#493528]/35"
    >
      <pattern id="sozni-motif" x="0" y="0" width="48" height="18" patternUnits="userSpaceOnUse">
        <path d="M0 9H14M34 9H48" stroke="currentColor" strokeWidth="0.8" />
        <path d="M24 3L29 9L24 15L19 9L24 3Z" stroke="#9C443B" strokeOpacity="0.65" strokeWidth="0.9" />
        <circle cx="24" cy="9" r="1.3" fill="#B59A65" />
        <circle cx="14" cy="9" r="1" fill="currentColor" opacity="0.5" />
        <circle cx="34" cy="9" r="1" fill="currentColor" opacity="0.5" />
      </pattern>
      <rect width="1200" height="18" fill="url(#sozni-motif)" />
    </svg>
  </div>
);
