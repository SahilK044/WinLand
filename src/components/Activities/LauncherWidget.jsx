import React, { useState } from 'react';
import { Folder, Music, Globe, Settings, Power, Timer as TimerIcon } from 'lucide-react';

const PINNED_APPS = [
  {
    name: 'Timer',
    cmd: 'timer',
    color: '#ff9f0a',
    icon: (isHovered) => (
      <TimerIcon
        size={24}
        color="#ff9f0a"
        style={{
          transform: isHovered ? 'rotate(18deg) scale(1.16)' : 'rotate(0deg) scale(1.0)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: isHovered ? 'drop-shadow(0 0 8px rgba(255, 159, 10, 0.75))' : 'none',
        }}
      />
    ),
  },
  {
    name: 'Spotify',
    cmd: 'spotify',
    color: '#30d158',
    icon: (isHovered) => (
      <Music
        size={24}
        color="#30d158"
        style={{
          transform: isHovered ? 'translateY(-3px) scale(1.18)' : 'translateY(0) scale(1.0)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: isHovered ? 'drop-shadow(0 0 8px rgba(48, 209, 88, 0.75))' : 'none',
        }}
      />
    ),
  },
  {
    name: 'Browser',
    cmd: 'browser',
    color: '#0a84ff',
    icon: (isHovered) => (
      <Globe
        size={24}
        color="#0a84ff"
        style={{
          transform: isHovered ? 'rotate(180deg) scale(1.16)' : 'rotate(0deg) scale(1.0)',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: isHovered ? 'drop-shadow(0 0 8px rgba(10, 132, 255, 0.75))' : 'none',
        }}
      />
    ),
  },
  {
    name: 'Files',
    cmd: 'explorer',
    color: '#ffd60a',
    icon: (isHovered) => (
      <Folder
        size={24}
        color="#ffd60a"
        style={{
          transform: isHovered ? 'translateY(-2px) rotate(-10deg) scale(1.16)' : 'translateY(0) rotate(0deg) scale(1.0)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: isHovered ? 'drop-shadow(0 0 8px rgba(255, 214, 10, 0.75))' : 'none',
        }}
      />
    ),
  },
  {
    name: 'Exit',
    cmd: 'exit',
    color: '#ff453a',
    icon: (isHovered) => (
      <Power
        size={24}
        color="#ff453a"
        style={{
          transform: isHovered ? 'scale(1.22)' : 'scale(1.0)',
          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: isHovered ? 'drop-shadow(0 0 10px rgba(255, 69, 58, 0.85))' : 'none',
        }}
      />
    ),
  },
  {
    name: 'Settings',
    cmd: 'settings',
    color: '#98989d',
    icon: (isHovered) => (
      <Settings
        size={24}
        color="#98989d"
        style={{
          transform: isHovered ? 'rotate(90deg) scale(1.16)' : 'rotate(0deg) scale(1.0)',
          transition: 'transform 0.4s ease',
          filter: isHovered ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.65))' : 'none',
        }}
      />
    ),
  },
];

function LauncherButton({ app, onLaunch }) {
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
        background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
        border: isHovered ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: 'pointer',
        padding: '8px 4px',
        boxSizing: 'border-box',
        transform: isPressed
          ? 'translateZ(0) scale(0.92)'
          : isHovered
          ? 'translateZ(0) translateY(-2px) scale(1.06)'
          : 'translateZ(0) scale(1.0)',
        transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, border 0.2s ease',
        WebkitAppearance: 'none',
        WebkitFontSmoothing: 'antialiased',
        outline: 'none',
        backdropFilter: isHovered ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: isHovered ? 'blur(12px)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* Animated Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 28,
        }}
      >
        {app.icon(isHovered)}
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.82)',
          letterSpacing: '0.2px',
          transition: 'color 0.18s ease',
          textShadow: isHovered ? '0 1px 4px rgba(0, 0, 0, 0.8)' : 'none',
        }}
      >
        {app.name}
      </span>
    </button>
  );
}

export default function LauncherWidget({ onLaunchApp }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%' }}>
        {PINNED_APPS.map((app) => (
          <LauncherButton key={app.cmd} app={app} onLaunch={onLaunchApp} />
        ))}
      </div>
    </div>
  );
}
