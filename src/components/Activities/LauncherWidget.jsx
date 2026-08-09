import React, { useState } from 'react';
import { Folder, Music, Globe, Settings, Power, Timer as TimerIcon } from 'lucide-react';

const PINNED_APPS = [
  {
    name: 'Timer',
    cmd: 'timer',
    icon: <TimerIcon size={22} strokeWidth={2.4} color="#ffffff" />,
    gradient: 'linear-gradient(135deg, #FFB340 0%, #FF9F0A 50%, #D67C00 100%)',
    glow: 'rgba(255, 159, 10, 0.55)',
  },
  {
    name: 'Spotify',
    cmd: 'spotify',
    icon: <Music size={22} strokeWidth={2.4} color="#ffffff" />,
    gradient: 'linear-gradient(135deg, #22E768 0%, #1DB954 50%, #108539 100%)',
    glow: 'rgba(29, 185, 84, 0.55)',
  },
  {
    name: 'Browser',
    cmd: 'browser',
    icon: <Globe size={22} strokeWidth={2.4} color="#ffffff" />,
    gradient: 'linear-gradient(135deg, #38A5FF 0%, #0A84FF 50%, #0056B3 100%)',
    glow: 'rgba(10, 132, 255, 0.55)',
  },
  {
    name: 'Files',
    cmd: 'explorer',
    icon: <Folder size={22} strokeWidth={2.4} color="#ffffff" />,
    gradient: 'linear-gradient(135deg, #FFC738 0%, #FFB340 50%, #D88200 100%)',
    glow: 'rgba(255, 179, 64, 0.55)',
  },
  {
    name: 'Exit',
    cmd: 'exit',
    icon: <Power size={22} strokeWidth={2.4} color="#ffffff" />,
    gradient: 'linear-gradient(135deg, #FF6961 0%, #FF453A 50%, #C92A2A 100%)',
    glow: 'rgba(255, 69, 58, 0.55)',
  },
  {
    name: 'Settings',
    cmd: 'settings',
    icon: <Settings size={22} strokeWidth={2.4} color="#ffffff" />,
    gradient: 'linear-gradient(135deg, #A2A2A7 0%, #636366 50%, #3A3A3C 100%)',
    glow: 'rgba(255, 255, 255, 0.3)',
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
        gap: 8,
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
      {/* Squircle Tile Container */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: app.gradient,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isPressed
            ? '0 2px 8px rgba(0, 0, 0, 0.4)'
            : isHovered
            ? `0 10px 24px ${app.glow}, inset 0 1px 1.5px rgba(255, 255, 255, 0.5)`
            : '0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
          transform: isPressed
            ? 'translateZ(0) scale(0.93)'
            : isHovered
            ? 'translateZ(0) translateY(-3px) scale(1.08)'
            : 'translateZ(0) scale(1.0)',
          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), boxShadow 0.22s ease',
          overflow: 'hidden',
        }}
      >
        {/* Top Gloss Highlights */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 100%)',
            pointerEvents: 'none',
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
          }}
        />

        {/* Icon */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isHovered && app.cmd === 'settings' ? 'rotate(45deg)' : 'none',
            transition: app.cmd === 'settings' ? 'transform 0.3s ease' : 'none',
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
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
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
