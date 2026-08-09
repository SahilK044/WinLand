import React, { useState } from 'react';

/* ── Authentic 3D macOS App Icon Components ────────────────────────────────────── */

const MacOSTimerIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="timerMetalBezel" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F1F5F9" />
        <stop offset="40%" stopColor="#94A3B8" />
        <stop offset="70%" stopColor="#CBD5E1" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      <radialGradient id="timerFace" cx="24" cy="26" r="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFC738" />
        <stop offset="70%" stopColor="#FF9F0A" />
        <stop offset="100%" stopColor="#D67C00" />
      </radialGradient>
      <filter id="timerShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#FF9F0A" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#timerShadow)">
      {/* Top Stopwatch Push Button */}
      <rect x="21" y="2" width="6" height="5" rx="1.5" fill="url(#timerMetalBezel)" />
      <rect x="22.5" y="0.5" width="3" height="2" rx="0.5" fill="#E2E8F0" />

      {/* Outer Metallic Ring */}
      <circle cx="24" cy="26" r="20" fill="url(#timerMetalBezel)" />
      <circle cx="24" cy="26" r="17.5" fill="#0F172A" />
      <circle cx="24" cy="26" r="16.5" fill="url(#timerFace)" />

      {/* Gloss Highlight Overlay */}
      <path d="M 10 18 A 15.5 15.5 0 0 1 38 18 A 15.5 12 0 0 0 10 18 Z" fill="#FFFFFF" fillOpacity="0.32" />

      {/* Dial Ticks */}
      <line x1="24" y1="12" x2="24" y2="14.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
      <line x1="24" y1="37.5" x2="24" y2="40" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
      <line x1="10" y1="26" x2="12.5" y2="26" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
      <line x1="35.5" y1="26" x2="38" y2="26" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />

      {/* Stopwatch Hands */}
      <line x1="24" y1="26" x2="24" y2="15" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="24" y1="26" x2="31" y2="26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="26" r="2.5" fill="#FFFFFF" />
      <circle cx="24" cy="26" r="1" fill="#FF9F0A" />
    </g>
  </svg>
);

const MacOSSpotifyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="spotifyGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#25EE6B" />
        <stop offset="50%" stopColor="#1DB954" />
        <stop offset="100%" stopColor="#138B3C" />
      </linearGradient>
      <filter id="spotifyShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#1DB954" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#spotifyShadow)">
      <rect width="48" height="48" rx="13.5" fill="url(#spotifyGrad)" />
      <path d="M 0 13.5 C 0 6 6 0 13.5 0 L 34.5 0 C 42 0 48 6 48 13.5 L 48 20 C 32 20 16 16 0 24 Z" fill="#FFFFFF" fillOpacity="0.24" />
      {/* 3 Curved Soundwaves */}
      <path d="M 12 18 C 20 14.8 30 16 36 19.8" stroke="#000000" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M 14 24.5 C 21 21.8 28 22.5 34 25.5" stroke="#000000" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M 16.5 31 C 22 29.3 27 29.8 31.5 31.8" stroke="#000000" strokeWidth="2.8" strokeLinecap="round" />
    </g>
  </svg>
);

const MacOSSafariIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="safariGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38A5FF" />
        <stop offset="50%" stopColor="#0A84FF" />
        <stop offset="100%" stopColor="#0056B3" />
      </linearGradient>
      <linearGradient id="safariBezel" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F8FAFC" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
      <filter id="safariShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0A84FF" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#safariShadow)">
      <rect width="48" height="48" rx="13.5" fill="url(#safariGrad)" />
      <circle cx="24" cy="24" r="18" fill="url(#safariBezel)" opacity="0.95" />
      <circle cx="24" cy="24" r="16.5" fill="url(#safariGrad)" />
      <path d="M 0 13.5 C 0 6 6 0 13.5 0 L 34.5 0 C 42 0 48 6 48 13.5 L 48 18 C 24 18 12 14 0 22 Z" fill="#FFFFFF" fillOpacity="0.25" />

      {/* Compass Ticks */}
      <line x1="24" y1="9.5" x2="24" y2="11.5" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
      <line x1="24" y1="36.5" x2="24" y2="38.5" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
      <line x1="9.5" y1="24" x2="11.5" y2="24" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
      <line x1="36.5" y1="24" x2="38.5" y2="24" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />

      {/* 3D Compass Needle */}
      <g transform="rotate(45 24 24)">
        <polygon points="24,9 20.5,24 24,22.5 27.5,24" fill="#FF3B30" />
        <polygon points="24,9 24,22.5 27.5,24" fill="#D7261B" />
        <polygon points="24,39 20.5,24 24,25.5 27.5,24" fill="#FFFFFF" />
        <polygon points="24,39 24,25.5 27.5,24" fill="#CBD5E1" />
        <circle cx="24" cy="24" r="2.2" fill="#FFFFFF" />
        <circle cx="24" cy="24" r="1" fill="#64748B" />
      </g>
    </g>
  </svg>
);

const MacOSFinderIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="finderLeftGrad" x1="0" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#5CD2FF" />
        <stop offset="100%" stopColor="#007AFF" />
      </linearGradient>
      <linearGradient id="finderRightGrad" x1="24" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0080FF" />
        <stop offset="100%" stopColor="#0040A8" />
      </linearGradient>
      <filter id="finderShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#007AFF" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#finderShadow)">
      {/* Dual Tone 3D Finder Face */}
      <path d="M 13.5 0 L 24 0 L 24 48 L 13.5 48 C 6 48 0 42 0 34.5 L 0 13.5 C 0 6 6 0 13.5 0 Z" fill="url(#finderLeftGrad)" />
      <path d="M 24 0 L 34.5 0 C 42 0 48 6 48 13.5 L 48 34.5 C 48 42 42 48 34.5 48 L 24 48 Z" fill="url(#finderRightGrad)" />
      <path d="M 0 13.5 C 0 6 6 0 13.5 0 L 34.5 0 C 42 0 48 6 48 13.5 L 48 18 C 24 18 12 14 0 22 Z" fill="#FFFFFF" fillOpacity="0.25" />

      {/* Finder Nose Divider & Eyes & Smile */}
      <path d="M 24 9 L 24 26 C 24 29 21.5 31 18.5 29" stroke="#000000" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.88" />
      <circle cx="14.5" cy="18" r="2.4" fill="#000000" opacity="0.88" />
      <circle cx="33.5" cy="18" r="2.4" fill="#000000" opacity="0.88" />
      <path d="M 12 30 C 16 38.5 32 38.5 36 30" stroke="#000000" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.88" />
    </g>
  </svg>
);

const MacOSSettingsIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="settingsBg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#94A3B8" />
        <stop offset="50%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1E293B" />
      </linearGradient>
      <linearGradient id="gearMetal" x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#E2E8F0" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
      <filter id="settingsShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
      </filter>
    </defs>
    <g filter="url(#settingsShadow)">
      <rect width="48" height="48" rx="13.5" fill="url(#settingsBg)" />
      <path d="M 0 13.5 C 0 6 6 0 13.5 0 L 34.5 0 C 42 0 48 6 48 13.5 L 48 18 C 24 18 12 14 0 22 Z" fill="#FFFFFF" fillOpacity="0.24" />

      {/* 3D Metallic Gear */}
      <g transform="translate(24 24)">
        <path
          d="M -3,-15 L 3,-15 L 4,-11 C 6,-10 8,-9 10,-7 L 14,-9 L 17,-4 L 14,-1 C 15,1 15,4 14,6 L 17,9 L 14,14 L 10,12 C 8,14 6,15 4,16 L 3,20 L -3,20 L -4,16 C -6,15 -8,14 -10,12 L -14,14 L -17,9 L -14,6 C -15,4 -15,1 -14,-1 L -17,-4 L -14,-9 L -10,-7 C -8,-9 -6,-10 -4,-11 Z"
          fill="url(#gearMetal)"
        />
        <circle cx="0" cy="0" r="10" fill="url(#gearMetal)" />
        <circle cx="0" cy="0" r="4.5" fill="#1E293B" />
      </g>
    </g>
  </svg>
);

const MacOSPowerIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="powerGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF6961" />
        <stop offset="50%" stopColor="#FF453A" />
        <stop offset="100%" stopColor="#C92A2A" />
      </linearGradient>
      <filter id="powerShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#FF453A" floodOpacity="0.5" />
      </filter>
    </defs>
    <g filter="url(#powerShadow)">
      <rect width="48" height="48" rx="13.5" fill="url(#powerGrad)" />
      <path d="M 0 13.5 C 0 6 6 0 13.5 0 L 34.5 0 C 42 0 48 6 48 13.5 L 48 18 C 24 18 12 14 0 22 Z" fill="#FFFFFF" fillOpacity="0.25" />

      {/* 3D Glowing Power Symbol */}
      <path d="M 17 19.5 A 9.5 9.5 0 1 0 31 19.5" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <line x1="24" y1="13" x2="24" y2="23" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" />
    </g>
  </svg>
);

/* ── App Registry Mapping ──────────────────────────────────────────────────────── */

const PINNED_APPS = [
  { name: 'Timer', cmd: 'timer', icon: <MacOSTimerIcon /> },
  { name: 'Spotify', cmd: 'spotify', icon: <MacOSSpotifyIcon /> },
  { name: 'Browser', cmd: 'browser', icon: <MacOSSafariIcon /> },
  { name: 'Files', cmd: 'explorer', icon: <MacOSFinderIcon /> },
  { name: 'Exit', cmd: 'exit', icon: <MacOSPowerIcon /> },
  { name: 'Settings', cmd: 'settings', icon: <MacOSSettingsIcon /> },
];

function LauncherTile({ app, onLaunch }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onLaunch?.(app.cmd);
      }}
      style={{
        background: 'transparent',
        border: 'none',
        outline: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: 'pointer',
        WebkitAppearance: 'none',
        WebkitFontSmoothing: 'antialiased',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* 3D macOS App Icon Container with Spring Hover */}
      <div
        style={{
          width: 48,
          height: 48,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isPressed
            ? 'translateZ(0) scale(0.92)'
            : isHovered
            ? 'translateZ(0) translateY(-4px) scale(1.1)'
            : 'translateZ(0) scale(1.0)',
          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          style={{
            transform: isHovered && app.cmd === 'settings' ? 'rotate(45deg)' : 'none',
            transition: app.cmd === 'settings' ? 'transform 0.35s ease' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {app.icon}
        </div>
      </div>

      {/* App Label */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          letterSpacing: '-0.1px',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)',
          transition: 'color 0.18s ease',
        }}
      >
        {app.name}
      </span>
    </button>
  );
}

export default function LauncherWidget({ onLaunchApp }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          columnGap: 24,
          rowGap: 14,
          width: '100%',
          alignItems: 'center',
          justifyItems: 'center',
        }}
      >
        {PINNED_APPS.map((app) => (
          <LauncherTile key={app.cmd} app={app} onLaunch={onLaunchApp} />
        ))}
      </div>
    </div>
  );
}
