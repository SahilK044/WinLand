import React, { useState, useEffect, useRef } from 'react';

/**
 * WinLand - PrivacyIndicator.jsx
 * Exact 1:1 macOS Sequoia & iOS 18 Hardware Privacy Indicators.
 * Features vibrant 6.5px green (camera) and orange (mic) luminous dots
 * and a full macOS Control Center Privacy sensor drop-down card.
 */
export default function PrivacyIndicator({ isLight = false, onExpandChange = null }) {
  const [privacyState, setPrivacyState] = useState({
    cameraActive: false,
    micActive: false,
    cameraApps: [],
    micApps: [],
  });
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Subscribe to real-time OS sensor updates
  useEffect(() => {
    if (window.electronAPI?.getPrivacySensors) {
      window.electronAPI.getPrivacySensors().then((data) => {
        if (data) setPrivacyState(data);
      }).catch(() => {});
    }

    if (!window.electronAPI?.onPrivacySensorsUpdate) return undefined;
    const unsub = window.electronAPI.onPrivacySensorsUpdate((data) => {
      if (data) setPrivacyState(data);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Notify parent on expand change if needed
  useEffect(() => {
    if (typeof onExpandChange === 'function') {
      onExpandChange(isOpen);
    }
  }, [isOpen, onExpandChange]);

  // Click outside to dismiss popover
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const hasActiveSensor = privacyState.cameraActive || privacyState.micActive;

  // Toggle demo/simulation
  const handleToggleDemo = (type) => {
    if (!window.electronAPI?.simulatePrivacySensors) return;
    if (type === 'camera') {
      window.electronAPI.simulatePrivacySensors({
        ...privacyState,
        cameraActive: !privacyState.cameraActive,
        cameraApps: !privacyState.cameraActive ? ['FaceTime HD Camera', 'OBS Studio'] : [],
      });
    } else if (type === 'mic') {
      window.electronAPI.simulatePrivacySensors({
        ...privacyState,
        micActive: !privacyState.micActive,
        micApps: !privacyState.micActive ? ['Voice Memos', 'Discord'] : [],
      });
    }
  };

  if (!hasActiveSensor && !isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      {/* Privacy Indicator Dot Cluster */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title="macOS Privacy Indicators — Click for Control Center"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 4px',
          cursor: 'pointer',
          borderRadius: 8,
          background: isOpen ? 'rgba(255,255,255,0.12)' : 'transparent',
          transition: 'background 0.2s ease',
        }}
      >
        {/* Green Camera Dot (macOS #30D158) */}
        {privacyState.cameraActive && (
          <div
            style={{
              width: 6.5,
              height: 6.5,
              borderRadius: '50%',
              background: '#30D158',
              boxShadow: '0 0 7px rgba(48, 209, 88, 0.85)',
              animation: 'privacyDotSpring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          />
        )}

        {/* Orange Microphone Dot (macOS #FF9F0A) */}
        {privacyState.micActive && (
          <div
            style={{
              width: 6.5,
              height: 6.5,
              borderRadius: '50%',
              background: '#FF9F0A',
              boxShadow: '0 0 7px rgba(255, 159, 10, 0.85)',
              animation: 'privacyDotSpring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          />
        )}
      </div>

      {/* 1:1 macOS Control Center Privacy Dropdown Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 260,
            padding: '12px 14px',
            borderRadius: 16,
            background: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(24, 24, 28, 0.86)',
            backdropFilter: 'blur(32px) saturate(190%)',
            WebkitBackdropFilter: 'blur(32px) saturate(190%)',
            border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: isLight
              ? '0 16px 36px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08)'
              : '0 20px 48px rgba(0, 0, 0, 0.65), 0 6px 18px rgba(0, 0, 0, 0.45)',
            fontFamily: 'var(--mac-font), -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            color: isLight ? '#000000' : '#ffffff',
            zIndex: 99999,
            animation: 'privacyCardSpring 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            transformOrigin: 'top right',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              paddingBottom: 6,
              borderBottom: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
              }}
            >
              Privacy & Sensors
            </span>
            <div
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: 11,
                cursor: 'pointer',
                opacity: 0.6,
                padding: '2px 4px',
              }}
            >
              ✕
            </div>
          </div>

          {/* Active Sensor Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Camera Items */}
            {privacyState.cameraActive ? (
              (privacyState.cameraApps.length > 0 ? privacyState.cameraApps : ['Camera']).map((app) => (
                <div
                  key={`cam-${app}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 8px',
                    borderRadius: 10,
                    background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: 'rgba(48, 209, 88, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, truncate: 'true', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {app}
                    </div>
                    <div style={{ fontSize: 10, color: '#30D158', fontWeight: 500 }}>
                      Camera in use
                    </div>
                  </div>
                </div>
              ))
            ) : null}

            {/* Microphone Items */}
            {privacyState.micActive ? (
              (privacyState.micApps.length > 0 ? privacyState.micApps : ['Microphone']).map((app) => (
                <div
                  key={`mic-${app}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 8px',
                    borderRadius: 10,
                    background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: 'rgba(255, 159, 10, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9F0A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, truncate: 'true', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {app}
                    </div>
                    <div style={{ fontSize: 10, color: '#FF9F0A', fontWeight: 500 }}>
                      Microphone in use
                    </div>
                  </div>
                </div>
              ))
            ) : null}

            {!privacyState.cameraActive && !privacyState.micActive && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '8px 0' }}>
                No active camera or microphone sessions
              </div>
            )}
          </div>

          {/* Quick Simulation / Test Footer */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              gap: 6,
            }}
          >
            <button
              onClick={() => handleToggleDemo('camera')}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                background: privacyState.cameraActive ? '#30D158' : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                color: privacyState.cameraActive ? '#000' : (isLight ? '#000' : '#fff'),
                cursor: 'pointer',
              }}
            >
              {privacyState.cameraActive ? 'Stop Cam' : 'Test Cam'}
            </button>
            <button
              onClick={() => handleToggleDemo('mic')}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                background: privacyState.micActive ? '#FF9F0A' : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                color: privacyState.micActive ? '#000' : (isLight ? '#000' : '#fff'),
                cursor: 'pointer',
              }}
            >
              {privacyState.micActive ? 'Stop Mic' : 'Test Mic'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
