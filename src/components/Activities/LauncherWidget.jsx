import React, { useState } from 'react';
import { Folder, Music, Globe, Settings, Power, Timer as TimerIcon } from 'lucide-react';

/* ── iOS Control Center Frosted Glass Launcher Items ───────────────────────────── */

const PINNED_APPS = [
  {
    name: 'Timer',
    cmd: 'timer',
    icon: <TimerIcon size={22} strokeWidth={2.2} />,
    accent: '#FF9F0A',
    hoverBg: 'rgba(255, 159, 10, 0.22)',
    hoverBorder: 'rgba(255, 159, 10, 0.55)',
    hoverGlow: '0 0 22px rgba(255, 159, 10, 0.5)',
  },
  {
    name: 'Spotify',
    cmd: 'spotify',
    icon: <Music size={22} strokeWidth={2.2} />,
    accent: '#1DB954',
    hoverBg: 'rgba(29, 185, 84, 0.22)',
    hoverBorder: 'rgba(29, 185, 84, 0.55)',
    hoverGlow: '0 0 22px rgba(29, 185, 84, 0.5)',
  },
  {
    name: 'Browser',
    cmd: 'browser',
    icon: <Globe size={22} strokeWidth={2.2} />,
    accent: '#0A84FF',
    hoverBg: 'rgba(10, 132, 255, 0.22)',
    hoverBorder: 'rgba(10, 132, 255, 0.55)',
    hoverGlow: '0 0 22px rgba(10, 132, 255, 0.5)',
  },
  {
    name: 'Files',
    cmd: 'explorer',
    icon: <Folder size={22} strokeWidth={2.2} />,
    accent: '#FFB340',
    hoverBg: 'rgba(255, 179, 64, 0.22)',
    hoverBorder: 'rgba(255, 179, 64, 0.55)',
    hoverGlow: '0 0 22px rgba(255, 179, 64, 0.5)',
  },
  {
    name: 'Exit',
    cmd: 'exit',
    icon: <Power size={22} strokeWidth={2.2} />,
    accent: '#FF3B30',
    hoverBg: 'rgba(255, 59, 48, 0.22)',
    hoverBorder: 'rgba(255, 59, 48, 0.55)',
    hoverGlow: '0 0 22px rgba(255, 59, 48, 0.5)',
  },
  {
    name: 'Settings',
    cmd: 'settings',
    icon: <Settings size={22} strokeWidth={2.2} />,
    accent: '#FFFFFF',
    hoverBg: 'rgba(255, 255, 255, 0.2)',
    hoverBorder: 'rgba(255, 255, 255, 0.45)',
    hoverGlow: '0 0 22px rgba(255, 255, 255, 0.4)',
  },
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
        gap: 7,
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
      {/* Frosted Glass Tile (iOS Control Center Squircle) */}
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 16,
          background: isHovered ? app.hoverBg : 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isHovered ? `1px solid ${app.hoverBorder}` : '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: isPressed
            ? '0 2px 6px rgba(0, 0, 0, 0.4)'
            : isHovered
            ? `${app.hoverGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.35)`
            : '0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
          transform: isPressed
            ? 'translateZ(0) scale(0.93)'
            : isHovered
            ? 'translateZ(0) translateY(-3px) scale(1.08)'
            : 'translateZ(0) scale(1.0)',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, border 0.2s ease, box-shadow 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isHovered ? app.accent : '#FFFFFF',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isHovered && app.cmd === 'settings' ? 'rotate(45deg)' : 'none',
            transition: app.cmd === 'settings' ? 'transform 0.35s ease, color 0.2s ease' : 'color 0.2s ease',
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
          color: isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
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
