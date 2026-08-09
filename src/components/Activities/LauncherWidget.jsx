import React, { useState } from 'react';
import { Folder, Music, Globe, Settings, Power, Timer as TimerIcon } from 'lucide-react';

/* ── Glassmorphic Dark Mode Cards with Colored Badges ───────────────────────────── */

const PINNED_APPS = [
  {
    name: 'Timer',
    cmd: 'timer',
    icon: <TimerIcon size={20} strokeWidth={2.0} />,
    accent: '#FF9F0A',
    glow: 'rgba(255, 159, 10, 0.45)',
  },
  {
    name: 'Spotify',
    cmd: 'spotify',
    icon: <Music size={20} strokeWidth={2.0} />,
    accent: '#1DB954',
    glow: 'rgba(29, 185, 84, 0.45)',
  },
  {
    name: 'Browser',
    cmd: 'browser',
    icon: <Globe size={20} strokeWidth={2.0} />,
    accent: '#0A84FF',
    glow: 'rgba(10, 132, 255, 0.45)',
  },
  {
    name: 'Files',
    cmd: 'explorer',
    icon: <Folder size={20} strokeWidth={2.0} />,
    accent: '#FFB340',
    glow: 'rgba(255, 179, 64, 0.45)',
  },
  {
    name: 'Exit',
    cmd: 'exit',
    icon: <Power size={20} strokeWidth={2.0} />,
    accent: '#FF3B30',
    glow: 'rgba(255, 59, 48, 0.45)',
  },
  {
    name: 'Settings',
    cmd: 'settings',
    icon: <Settings size={20} strokeWidth={2.0} />,
    accent: '#A2A2A7',
    glow: 'rgba(255, 255, 255, 0.35)',
  },
];

function LauncherCard({ app, onLaunch }) {
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
        width: '100%',
        height: 62,
        borderRadius: 14,
        background: isHovered
          ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: isHovered ? `1px solid ${app.accent}` : '1px solid rgba(255, 255, 255, 0.11)',
        boxShadow: isPressed
          ? '0 2px 6px rgba(0, 0, 0, 0.4)'
          : isHovered
          ? `0 10px 24px rgba(0, 0, 0, 0.45), 0 0 16px ${app.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.25)`
          : '0 4px 14px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.12)',
        transform: isPressed
          ? 'translateZ(0) scale(0.94)'
          : isHovered
          ? 'translateZ(0) translateY(-3px) scale(1.05)'
          : 'translateZ(0) scale(1.0)',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, border 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        cursor: 'pointer',
        position: 'relative',
        padding: '8px 4px',
        boxSizing: 'border-box',
        WebkitAppearance: 'none',
        WebkitFontSmoothing: 'antialiased',
        outline: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* Top-Right Vibrant Colored Badge Pill */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          right: 7,
          width: isHovered ? 7 : 6,
          height: isHovered ? 7 : 6,
          borderRadius: '50%',
          background: app.accent,
          boxShadow: `0 0 ${isHovered ? '10px' : '6px'} ${app.accent}`,
          transition: 'transform 0.2s ease, width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease',
        }}
      />

      {/* Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isHovered ? app.accent : 'rgba(255, 255, 255, 0.95)',
          transform: isHovered
            ? app.cmd === 'settings'
              ? 'translateY(-1px) rotate(45deg)'
              : 'translateY(-1px)'
            : 'none',
          transition: 'transform 0.25s ease, color 0.2s ease',
        }}
      >
        {app.icon}
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          letterSpacing: '0.1px',
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
        padding: '14px 18px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          columnGap: 14,
          rowGap: 10,
          width: '100%',
          alignItems: 'center',
          justifyItems: 'center',
        }}
      >
        {PINNED_APPS.map((app) => (
          <LauncherCard key={app.cmd} app={app} onLaunch={onLaunchApp} />
        ))}
      </div>
    </div>
  );
}
