import logoImg from '../assets/logo.png';

export const LOGO_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="logo-icon-svg" style="width: 100%; height: 100%; display: block;">
  <defs>
    <linearGradient id="docGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <linearGradient id="waveGradient1Icon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00d2ff" />
      <stop offset="100%" stop-color="#0066ff" />
    </linearGradient>
    <linearGradient id="waveGradient2Icon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0052d4" />
      <stop offset="50%" stop-color="#4364f7" />
      <stop offset="100%" stop-color="#6fb1fc" />
    </linearGradient>
    <linearGradient id="waveGradient3Icon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <filter id="logoShadowIcon" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#091e36" flood-opacity="0.15" />
    </filter>
  </defs>
  <g transform="translate(2, 5)" filter="url(#logoShadowIcon)">
    <rect x="34" y="16" width="28" height="36" rx="3" fill="none" stroke="url(#docGradientIcon)" stroke-width="2.5" />
    <rect x="49" y="22" width="5" height="5" fill="none" stroke="url(#docGradientIcon)" stroke-width="2" />
    <rect x="44" y="23" width="28" height="36" rx="3" fill="none" stroke="url(#docGradientIcon)" stroke-width="2.5" />
    <line x1="50" y1="31" x2="62" y2="31" stroke="url(#docGradientIcon)" stroke-width="2" stroke-linecap="round" />
    <line x1="50" y1="37" x2="58" y2="37" stroke="url(#docGradientIcon)" stroke-width="2" stroke-linecap="round" />
    <path d="M 60,45 L 63,48 L 68,42" fill="none" stroke="url(#docGradientIcon)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 8,50 C 24,36 44,66 74,40 C 77,36 78,30 78,30 C 78,30 79,42 75,50 C 67,62 45,70 28,70 C 15,70 8,60 8,50 Z" fill="url(#waveGradient3Icon)" opacity="0.8" />
    <path d="M 11,52 C 26,38 46,68 76,42 C 79,38 80,32 80,32 C 80,32 81,44 77,52 C 69,64 47,71 30,71 C 17,71 11,62 11,52 Z" fill="url(#waveGradient2Icon)" opacity="0.9" />
    <path d="M 14,54 C 28,40 48,70 78,44 C 81,40 82,34 82,34 C 82,34 83,46 79,54 C 71,66 49,72 32,72 C 19,72 14,64 14,54 Z" fill="url(#waveGradient1Icon)" />
  </g>
</svg>
`;

export const getFullLogoSVG = (width = "100%") => `
<div style="width: ${width}; max-width: 140px; margin: 0 auto 1.5rem; aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center;">
  <img src="${logoImg}" alt="InvoiceFlow" style="width: 100%; height: 100%; object-fit: contain; border-radius: 16px; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15);" />
</div>
`;
