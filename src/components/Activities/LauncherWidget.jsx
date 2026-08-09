import React, { useState } from 'react';
import { Folder, Music, Globe, Settings, Power, Timer as TimerIcon } from 'lucide-react';

/* ── Horizontal Floating Glass Dock Bar ────────────────────────────────────────── */

const PINNED_APPS = [
  {
    name: 'Timer',
    cmd: 'timer',
    icon: <TimerIcon size={20} strokeWidth={2.2} />,
    accent: '#FF9F0A',
    glow: 'rgba(255, 159, 10, 0.55)',
  },
  {
    name: 'Spotify',
    cmd: 'spotify',
    icon: <Music size={20} strokeWidth={2.2} />,
    accent: '#1DB954',
    glow: 'rgba(29, 185, 84, 0.55)',
  },
  {
    name: 'Browser',
    cmd: 'browser',
    icon: <Globe size={20} strokeWidth={2.2} />,
    accent: '#0A84FF',
    glow: 'rgba(10, 132, 255, 0.55)',
  },
  {
    name: 'Files',
    cmd: 'explorer',
    icon: <Folder size={20} strokeWidth={2.2} />,
    accent: '#FFB340',
    glow: 'rgba(255, 179, 64, 0.55)',
  },
  {
    name: 'Settings',
    cmd: 'settings',
    icon: <Settings size={20} strokeWidth={2.2} />,
    accent: '#A2A2A7',
    glow: 'rgba(255, 255, 255, 0.4)',
  },
  {
    name: 'Exit',
    cmd: 'exit',
    icon: <Power size={20} strokeWidth={2.2} />,
    accent: '#FF3B30',
    glow: 'rgba(255, 59, 48, 0.55)',
  },
];

function DockIcon({ app, onLaunch, hoveredIndex, index, setHoveredIndex }) {
  const isHovered = hoveredIndex === index;
  const isNeighbor = Math.abs((hoveredIndex ?? -10) - index) === 1;
  const [isPressed, setIsPressed] = useState(false);

  // macOS Dock magnification logic
  let scale = 1.0;
  let translateY = 0;
  if (isHovered) {
    scale = 1.25;
    translateY = -8;
  } else if (isNeighbor) {
    scale = 1.1;
    translateY = -3;
  }
  if (isPressed) {
    scale = 0.92;
    translateY = 0;
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Floating macOS Tooltip Label */}
      <div
        style={{
          position: 'absolute',
          bottom: '100%',
          marginBottom: 10,
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.9)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          pointerEvents: 'none',
          zIndex: 10,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: 8,
          padding: '3px 8px',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#FFFFFF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
            letterSpacing: '0.1px',
          }}
        >
          {app.name}
        </span>
      </div>

      {/* Dock Icon Tile */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onLaunch?.(app.cmd);
        }}
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          background: isHovered
            ? `radial-gradient(circle, ${app.glow.replace('0.55', '0.25')} 0%, rgba(255,255,255,0.1) 100%)`
            : 'rgba(255, 255, 255, 0.08)',
          border: isHovered ? `1px solid ${app.accent}` : '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: isHovered
            ? `0 10px 24px ${app.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.35)`
            : '0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
          transform: `translateZ(0) translateY(${translateY}px) scale(${scale})`,
          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, border 0.2s ease, box-shadow 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isHovered ? app.accent : '#FFFFFF',
          WebkitAppearance: 'none',
          WebkitFontSmoothing: 'antialiased',
          outline: 'none',
          padding: 0,
          margin: 0,
        }}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => {
          setHoveredIndex(null);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isHovered && app.cmd === 'settings' ? 'rotate(45deg)' : 'none',
            transition: app.cmd === 'settings' ? 'transform 0.35s ease' : 'none',
          }}
        >
          {app.icon}
        </div>
      </button>

      {/* Active Dot Indicator under icon */}
      <div
        style={{
          width: 3.5,
          height: 3.5,
          borderRadius: '50%',
          background: isHovered ? app.accent : 'rgba(255, 255, 255, 0.35)',
          marginTop: 5,
          transition: 'background 0.2s ease, transform 0.2s ease',
          transform: isHovered ? 'scale(1.4)' : 'scale(1.0)',
        }}
      />
    </div>
  );
}

export default function LauncherWidget({ onLaunchApp }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Floating Glass Dock Shelf */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 20,
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45), inset 0 1px 1.5px rgba(255, 255, 255, 0.25)',
        }}
      >
        {PINNED_APPS.map((app, index) => (
          <DockIcon
            key={app.cmd}
            app={app}
            index={index}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
            onLaunch={onLaunchApp}
          />
        ))}
      </div>
    </div>
  );
}
