import React, { useState } from 'react';

/* ── Genuine Official macOS Sonoma High-Resolution App Icons ─────────────────── */

const PINNED_APPS = [
  {
    name: 'Timer',
    cmd: 'timer',
    iconSrc: '/icons/timer.jpg',
    glow: 'rgba(255, 159, 10, 0.6)',
    accent: '#FF9F0A',
  },
  {
    name: 'Spotify',
    cmd: 'spotify',
    iconSrc: '/icons/spotify.jpg',
    glow: 'rgba(29, 185, 84, 0.6)',
    accent: '#1DB954',
  },
  {
    name: 'Browser',
    cmd: 'browser',
    iconSrc: '/icons/browser.jpg',
    glow: 'rgba(10, 132, 255, 0.6)',
    accent: '#0A84FF',
  },
  {
    name: 'Files',
    cmd: 'explorer',
    iconSrc: '/icons/files.jpg',
    glow: 'rgba(255, 179, 64, 0.6)',
    accent: '#FFB340',
  },
  {
    name: 'Exit',
    cmd: 'exit',
    iconSrc: '/icons/exit.jpg',
    glow: 'rgba(255, 59, 48, 0.6)',
    accent: '#FF3B30',
  },
  {
    name: 'Settings',
    cmd: 'settings',
    iconSrc: '/icons/settings.jpg',
    glow: 'rgba(255, 255, 255, 0.4)',
    accent: '#FFFFFF',
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
      {/* Official 3D macOS Sonoma Icon Container */}
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 14,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isPressed
            ? '0 2px 6px rgba(0, 0, 0, 0.4)'
            : isHovered
            ? `0 12px 28px ${app.glow}, 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 1.5px rgba(255, 255, 255, 0.4)`
            : '0 6px 16px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
          transform: isPressed
            ? 'translateZ(0) scale(0.93)'
            : isHovered
            ? 'translateZ(0) translateY(-4px) scale(1.1)'
            : 'translateZ(0) scale(1.0)',
          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease',
          overflow: 'hidden',
          background: '#000000',
        }}
      >
        {/* macOS Sonoma High-Res App Icon Image */}
        <img
          src={app.iconSrc}
          alt={app.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 14,
            display: 'block',
            transform: isHovered && app.cmd === 'settings' ? 'rotate(45deg)' : 'none',
            transition: app.cmd === 'settings' ? 'transform 0.35s ease' : 'none',
          }}
        />

        {/* Top Gloss Reflection */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%)',
            pointerEvents: 'none',
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
          }}
        />
      </div>

      {/* App Label */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.82)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          letterSpacing: '-0.1px',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
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
