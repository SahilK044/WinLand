import React from 'react';

// ─── 1. Smartphones (iPhone / Galaxy flagship with Dynamic Island notch) ───
export function IconSmartphones({ size = 14, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5.5" y="1.75" width="13" height="20.5" rx="3.5" stroke={color} strokeWidth="1.8" />
      {/* Top Dynamic Island pill */}
      <rect x="9.5" y="4" width="5" height="1.6" rx="0.8" fill={color} />
      {/* Bottom Home Indicator Bar */}
      <rect x="9.5" y="19" width="5" height="1.2" rx="0.6" fill={color} />
    </svg>
  );
}

// ─── 2. Headphones (AirPods Max / Studio Over-Ear Headband) ───
export function IconHeadphones({ size = 14, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Curved Headband */}
      <path
        d="M3 13V11C3 6.02944 7.02944 2 12 2C16.9706 2 21 6.02944 21 11V13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Left Earcup */}
      <rect x="2" y="12" width="4.5" height="8" rx="2.25" fill={color} />
      {/* Right Earcup */}
      <rect x="17.5" y="12" width="4.5" height="8" rx="2.25" fill={color} />
    </svg>
  );
}

// ─── 3. Earbuds & Audio (AirPods Pro / Wireless Earbuds Pair) ───
export function IconEarbuds({ size = 14, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left Earbud */}
      <circle cx="8" cy="7.5" r="4.5" fill={color} />
      <path d="M7 11V18C7 19.1 7.9 20 9 20C9.55 20 10 19.55 10 19V11" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill={color} />
      <circle cx="9" cy="7.5" r="1.4" fill="rgba(0,0,0,0.3)" />

      {/* Right Earbud */}
      <circle cx="16" cy="7.5" r="4.5" fill={color} />
      <path d="M17 11V18C17 19.1 16.1 20 15 20C14.45 20 14 19.55 14 19V11" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill={color} />
      <circle cx="15" cy="7.5" r="1.4" fill="rgba(0,0,0,0.3)" />
    </svg>
  );
}

// ─── 4. Gaming Controllers (DualSense / Xbox Gamepad with analog sticks) ───
export function IconGamingControllers({ size = 14, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ergonomic Controller Body */}
      <path
        d="M6 5H18C20.2091 5 22 6.79086 22 9C22 10.8492 20.7381 12.4042 19.0142 12.8718L18.4069 19.1977C18.2522 20.8066 16.9029 22 15.2854 22C14.1947 22 13.2384 21.4116 12.7214 20.5282L12 19.3L11.2786 20.5282C10.7616 21.4116 9.80534 22 8.71458 22C7.09708 22 5.74776 20.8066 5.59312 19.1977L4.98584 12.8718C3.26188 12.4042 2 10.8492 2 9C2 6.79086 3.79086 5 6 5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* D-Pad Left */}
      <path d="M6 10H8M7 9V11" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* Face Buttons Right */}
      <circle cx="16" cy="9.2" r="0.9" fill={color} />
      <circle cx="17.8" cy="11" r="0.9" fill={color} />
      <circle cx="14.2" cy="11" r="0.9" fill={color} />
      <circle cx="16" cy="12.8" r="0.9" fill={color} />
      {/* Dual Thumbsticks */}
      <circle cx="9.5" cy="14.5" r="1.8" fill={color} />
      <circle cx="14.5" cy="14.5" r="1.8" fill={color} />
    </svg>
  );
}

// ─── 5. Speakers & Sound (Hi-Fi Studio Soundbar & Acoustic Cones) ───
export function IconSpeakers({ size = 14, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer Enclosure */}
      <rect x="4" y="2.5" width="16" height="19" rx="3.5" stroke={color} strokeWidth="1.8" />
      {/* Top Tweeter */}
      <circle cx="12" cy="7.5" r="2.2" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="7.5" r="0.8" fill={color} />
      {/* Bottom Subwoofer Woofer */}
      <circle cx="12" cy="15" r="4.2" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="15" r="2" fill={color} />
    </svg>
  );
}

// ─── 6. Appearance & Theme (macOS Sun / Moon Split Dual-Tone) ───
export function IconAppearance({ size = 14, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.8" />
      {/* Half-filled dark/light sphere */}
      <path d="M12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5V3.5Z" fill={color} />
    </svg>
  );
}

// ─── 7. Style & Motion (Fluid Sparkles / Physics Wand) ───
export function IconStyleMotion({ size = 14, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Large 4-point Sparkle */}
      <path
        d="M10 2C10 6.41828 6.41828 10 2 10C6.41828 10 10 13.5817 10 18C10 13.5817 13.5817 10 18 10C13.5817 10 10 6.41828 10 2Z"
        fill={color}
      />
      {/* Small 4-point Sparkle Top Right */}
      <path
        d="M18 13C18 15.2091 16.2091 17 14 17C16.2091 17 18 18.7909 18 21C18 18.7909 19.7909 17 22 17C19.7909 17 18 15.2091 18 13Z"
        fill={color}
      />
    </svg>
  );
}

// ─── 8. System & Placement (Mac Display + Dynamic Island Notch & Sliders) ───
export function IconSystemPlacement({ size = 14, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Display Screen */}
      <rect x="2.5" y="3" width="19" height="13.5" rx="2.5" stroke={color} strokeWidth="1.8" />
      {/* Mini Dynamic Island Notch */}
      <rect x="9" y="4.5" width="6" height="1.6" rx="0.8" fill={color} />
      {/* Display Stand */}
      <path d="M12 16.5V20.5M8 20.5H16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ─── 9. About (Apple Info / Official Shield Crest) ───
export function IconAbout({ size = 14, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.8" />
      {/* Stylized 'i' glyph */}
      <circle cx="12" cy="8" r="1.3" fill={color} />
      <path d="M12 11.5V16.5M10.5 11.5H12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
