import React from 'react';
import { Folder, Music, Globe, Settings, Power, Timer as TimerIcon } from 'lucide-react';

const PINNED_APPS = [
  { name: 'Timer', icon: <TimerIcon size={22} color="#ff9f0a" />, cmd: 'timer' },
  { name: 'Spotify', icon: <Music size={22} color="#30d158" />, cmd: 'spotify' },
  { name: 'Browser', icon: <Globe size={22} color="#0a84ff" />, cmd: 'browser' },
  { name: 'Files', icon: <Folder size={22} color="#ffd60a" />, cmd: 'explorer' },
  { name: 'Exit', icon: <Power size={22} color="#ff453a" />, cmd: 'exit' },
  { name: 'Settings', icon: <Settings size={22} color="#98989d" />, cmd: 'settings' },
];

export default function LauncherWidget({ onLaunchApp }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, width: '100%' }}>
        {PINNED_APPS.map((app) => (
          <button
            key={app.cmd}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onLaunchApp?.(app.cmd);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              padding: '6px 4px',
              transition: 'transform 0.15s ease, opacity 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.opacity = '1.0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1.0)';
              e.currentTarget.style.opacity = '0.9';
            }}
          >
            {app.icon}
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--launcher-text-color, #ffffff)', letterSpacing: '0.2px' }}>{app.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
