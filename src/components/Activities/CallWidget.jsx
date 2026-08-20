import React, { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../../utils/soundEngine';

/* ────────────────────────────────────────────────────────────────────────────
   macOS Sequoia / Tahoe – 1:1 Phone & FaceTime Call Live Activity
   ────────────────────────────────────────────────────────────────────────────
   • Incoming Call : Deep black squircle, 3-tier concentric acoustic radar rings,
                     dark initials avatar with crisp Apple green border, bold typography,
                     glowing circular Decline (Red #ff3b30) & Accept (Green #34c759) buttons.
   • Active Call   : Compact pill (live 4-bar equalizer + name + timer) &
                     Expanded view (avatar, name, live timer, Mute / Speaker / Keypad / End).
   ──────────────────────────────────────────────────────────────────────────── */

const SF_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", "Inter", "Helvetica Neue", system-ui, sans-serif';

/* ── Inline SVG icons (1:1 Apple SF-Symbols style) ────────────────────────── */
const PhoneIcon = ({ size = 20, color = '#ffffff', style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', shapeRendering: 'geometricPrecision', ...style }}
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const MicIcon = ({ size = 16, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', shapeRendering: 'geometricPrecision' }}>
    <rect x="9" y="1" width="6" height="13" rx="3"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const MicOffIcon = ({ size = 16, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', shapeRendering: 'geometricPrecision' }}>
    <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .73-.11 1.43-.32 2.09"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const SpeakerIcon = ({ size = 16, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', shapeRendering: 'geometricPrecision' }}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
  </svg>
);

const KeypadIcon = ({ size = 16, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', shapeRendering: 'geometricPrecision' }}>
    <rect x="3" y="3" width="4" height="4" rx="1"/><rect x="10" y="3" width="4" height="4" rx="1"/><rect x="17" y="3" width="4" height="4" rx="1"/>
    <rect x="3" y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/><rect x="17" y="10" width="4" height="4" rx="1"/>
    <rect x="3" y="17" width="4" height="4" rx="1"/><rect x="10" y="17" width="4" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/>
  </svg>
);

/* ── Live Waveform for Compact Pill ──────────────────────────────────────── */
function CompactWaveform() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    canvas.width = 22 * dpr;
    canvas.height = 22 * dpr;
    ctx.scale(dpr, dpr);

    const loop = () => {
      tRef.current += 0.08;
      ctx.clearRect(0, 0, 22, 22);
      const bars = 4;
      const barW = 2.4;
      const gap = 2.0;
      const startX = (22 - (bars * barW + (bars - 1) * gap)) / 2;
      const freqs = [1.0, 1.618, 2.414, 3.317];
      const phases = [0, 1.1, 2.3, 0.7];

      for (let i = 0; i < bars; i++) {
        const h = 5 + 9 * (0.5 + 0.5 * Math.sin(tRef.current * freqs[i] + phases[i]));
        const x = startX + i * (barW + gap);
        const y = 11 - h / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, h, barW / 2);
        ctx.fillStyle = '#34c759';
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 22, height: 22, flexShrink: 0, imageRendering: 'auto' }}
    />
  );
}

export default function CallWidget({ callData, isCompact, onEndCall }) {
  const [callState, setCallState] = useState(callData?.state || 'incoming');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Button hover / active physics
  const [hoverAccept, setHoverAccept] = useState(false);
  const [pressAccept, setPressAccept] = useState(false);
  const [hoverDecline, setHoverDecline] = useState(false);
  const [pressDecline, setPressDecline] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [callData?.avatar]);

  useEffect(() => {
    setCallState(callData?.state || 'incoming');
  }, [callData?.state]);

  useEffect(() => {
    if (callState === 'incoming') {
      soundEngine.playRingtone();
    }
  }, [callState]);

  useEffect(() => {
    let interval;
    if (callState === 'active') {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const acceptCall = (e) => {
    e.stopPropagation();
    soundEngine.playClick();
    setCallState('active');
    if (window.electronAPI?.sendCallAction) {
      window.electronAPI.sendCallAction('accept');
    }
  };

  const declineCall = (e) => {
    e.stopPropagation();
    soundEngine.playClick();
    if (window.electronAPI?.sendCallAction) {
      window.electronAPI.sendCallAction('decline');
      window.electronAPI.sendCallAction('end');
    }
    if (onEndCall) onEndCall();
  };

  const endCall = (e) => {
    e.stopPropagation();
    soundEngine.playClick();
    if (window.electronAPI?.sendCallAction) {
      window.electronAPI.sendCallAction('end');
    }
    if (onEndCall) onEndCall();
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    soundEngine.playClick();
    setIsMuted((prev) => !prev);
    if (window.electronAPI?.sendCallAction) {
      window.electronAPI.sendCallAction('mute');
    }
  };

  const toggleSpeaker = (e) => {
    e.stopPropagation();
    soundEngine.playClick();
    setIsSpeaker((prev) => !prev);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getInitials = (name) => {
    if (!name || name === 'Phone call' || name === 'Phone Link' || name === 'PC') return 'AM';
    const textOnly = name.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim();
    if (!textOnly || textOnly.length === 0) return 'AM';
    const parts = textOnly.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return textOnly.length >= 2 ? textOnly.slice(0, 2).toUpperCase() : textOnly[0].toUpperCase();
  };

  const rawCaller = callData?.callerName || 'Alex Morgan';
  const callerName = (rawCaller === 'Phone Link' || rawCaller === 'Phone call') ? 'Alex Morgan' : rawCaller;
  const source = callData?.source || 'Phone Link';
  const initials = getInitials(callerName);
  const hasAvatar = !!callData?.avatar;

  /* ──────────────────────────────────────────────────────────────────────────
     1. COMPACT PILL (macOS Active Live Indicator)
     ────────────────────────────────────────────────────────────────────────── */
  if (isCompact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', height: '100%', padding: '0 16px',
        fontFamily: SF_FONT,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <CompactWaveform />
          <span style={{
            fontSize: 13.5, fontWeight: 600, color: '#ffffff',
            letterSpacing: '-0.25px', lineHeight: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {callerName}
          </span>
        </div>
        {callState === 'active' && (
          <span style={{
            fontSize: 13, color: '#34c759', fontWeight: 600,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '0.3px', flexShrink: 0,
          }}>
            {formatDuration(duration)}
          </span>
        )}
        {callState === 'incoming' && (
          <span style={{
            fontSize: 12, color: '#34c759', fontWeight: 500,
            animation: 'callTextPulse 1.8s ease-in-out infinite', flexShrink: 0,
          }}>
            Incoming…
          </span>
        )}
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────────────────
     2. EXPANDED VIEW (1:1 macOS Incoming Call & Active Call)
     ────────────────────────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '16px 20px',
        position: 'relative',
        borderRadius: 'inherit',
        background: '#000000',
        fontFamily: SF_FONT,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
        userSelect: 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Top Avatar Area with macOS Concentric Acoustic Radar Rings ── */}
      <div style={{
        position: 'relative',
        width: 64,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        flexShrink: 0,
      }}>
        {callState === 'incoming' && (
          <>
            {/* Ambient Base Green Core Glow */}
            <div style={{
              position: 'absolute',
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(52, 199, 89, 0.45) 0%, rgba(52, 199, 89, 0.1) 60%, transparent 85%)',
              pointerEvents: 'none',
              animation: 'callGlowBreath 2.2s ease-in-out infinite',
            }} />

            {/* Radar Wave 1 (Inner Wave) */}
            <div style={{
              position: 'absolute',
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '1.5px solid rgba(52, 199, 89, 0.75)',
              pointerEvents: 'none',
              animation: 'macosCallPulse1 2.2s cubic-bezier(0.2, 0.8, 0.4, 1) infinite',
            }} />

            {/* Radar Wave 2 (Middle Wave) */}
            <div style={{
              position: 'absolute',
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '1.5px solid rgba(52, 199, 89, 0.65)',
              pointerEvents: 'none',
              animation: 'macosCallPulse2 2.2s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 0.75s',
            }} />

            {/* Radar Wave 3 (Outer Wave) */}
            <div style={{
              position: 'absolute',
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '1px solid rgba(52, 199, 89, 0.45)',
              pointerEvents: 'none',
              animation: 'macosCallPulse3 2.2s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 1.4s',
            }} />
          </>
        )}

        {/* Active Connected Call Glow */}
        {callState === 'active' && (
          <div style={{
            position: 'absolute',
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52, 199, 89, 0.3) 0%, rgba(52, 199, 89, 0.08) 55%, transparent 80%)',
            pointerEvents: 'none',
            animation: 'callGlowBreath 3s ease-in-out infinite',
          }} />
        )}

        {/* Center Avatar Circle */}
        {hasAvatar && !avatarError ? (
          <img
            src={callData.avatar}
            alt={callerName}
            style={{
              width: 54, height: 54, borderRadius: '50%',
              objectFit: 'cover',
              border: callState === 'incoming'
                ? '2.5px solid #34c759'
                : '1.5px solid rgba(255, 255, 255, 0.18)',
              boxShadow: callState === 'incoming'
                ? '0 0 14px rgba(52, 199, 89, 0.4)'
                : '0 4px 12px rgba(0, 0, 0, 0.5)',
              zIndex: 2,
              animation: 'callAvatarEntry 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            }}
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            background: '#232326',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 20, color: '#ffffff',
            border: callState === 'incoming'
              ? '2.5px solid #34c759'
              : '1.5px solid rgba(255, 255, 255, 0.18)',
            boxShadow: callState === 'incoming'
              ? '0 0 14px rgba(52, 199, 89, 0.4)'
              : '0 4px 12px rgba(0, 0, 0, 0.5)',
            letterSpacing: '-0.5px',
            fontFamily: SF_FONT,
            zIndex: 2,
            animation: 'callAvatarEntry 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          }}>
            {initials}
          </div>
        )}
      </div>

      {/* ── Caller Name ────────────────────────────────────────────────────── */}
      <div style={{
        fontSize: 18, fontWeight: 700, color: '#ffffff',
        letterSpacing: '-0.35px', textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: '90%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        animation: 'callTextEntry 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.04s both',
      }}>
        {callerName}
      </div>

      {/* ── Subtitle Status Line ───────────────────────────────────────────── */}
      <div style={{
        fontSize: 12.5, fontWeight: 500,
        color: callState === 'active' ? '#34c759' : 'rgba(255, 255, 255, 0.48)',
        letterSpacing: '-0.1px', textAlign: 'center',
        marginTop: 3,
        marginBottom: callState === 'incoming' ? 18 : 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        animation: 'callTextEntry 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both',
      }}>
        {callState === 'active' ? (
          <>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#34c759', display: 'inline-block',
              boxShadow: '0 0 8px rgba(52, 199, 89, 0.6)',
              animation: 'callDotPulse 2s ease-in-out infinite',
            }} />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{source}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{
              fontVariantNumeric: 'tabular-nums', fontWeight: 600,
              color: '#34c759',
            }}>
              {formatDuration(duration)}
            </span>
          </>
        ) : (
          <span>
            {source} · Incoming Call
          </span>
        )}
      </div>

      {/* ── Bottom Controls ────────────────────────────────────────────────── */}
      {callState === 'incoming' ? (
        /* ── Incoming: 1:1 Circular Decline (Red) + Accept (Green) Buttons ── */
        <div style={{
          display: 'flex', alignItems: 'center', gap: 42,
          animation: 'callButtonsEntry 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both',
        }}>
          {/* Decline (Red) */}
          <button
            onClick={declineCall}
            onMouseEnter={() => setHoverDecline(true)}
            onMouseLeave={() => { setHoverDecline(false); setPressDecline(false); }}
            onMouseDown={() => setPressDecline(true)}
            onMouseUp={() => setPressDecline(false)}
            className="interactive-child"
            style={{
              width: 50, height: 50, borderRadius: '50%',
              background: '#ff3b30',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: hoverDecline
                ? '0 6px 20px rgba(255, 59, 48, 0.55), 0 2px 8px rgba(255, 59, 48, 0.35)'
                : '0 4px 16px rgba(255, 59, 48, 0.42), 0 2px 6px rgba(255, 59, 48, 0.22)',
              transform: pressDecline ? 'scale(0.92)' : hoverDecline ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease',
              outline: 'none',
            }}
            title="Decline"
          >
            <PhoneIcon size={20} color="#ffffff" style={{ transform: 'rotate(135deg)' }} />
          </button>

          {/* Accept (Green) */}
          <button
            onClick={acceptCall}
            onMouseEnter={() => setHoverAccept(true)}
            onMouseLeave={() => { setHoverAccept(false); setPressAccept(false); }}
            onMouseDown={() => setPressAccept(true)}
            onMouseUp={() => setPressAccept(false)}
            className="interactive-child"
            style={{
              width: 50, height: 50, borderRadius: '50%',
              background: '#34c759',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: hoverAccept
                ? '0 6px 20px rgba(52, 199, 89, 0.55), 0 2px 8px rgba(52, 199, 89, 0.35)'
                : '0 4px 16px rgba(52, 199, 89, 0.42), 0 2px 6px rgba(52, 199, 89, 0.22)',
              transform: pressAccept ? 'scale(0.92)' : hoverAccept ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease',
              outline: 'none',
            }}
            title="Accept"
          >
            <PhoneIcon size={20} color="#ffffff" />
          </button>
        </div>
      ) : (
        /* ── Active Connected Call: 4-button macOS Toolbar ── */
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'callButtonsEntry 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both',
        }}>
          {/* Mute Toggle */}
          <CallActionBtn
            icon={isMuted ? <MicOffIcon size={16} color={isMuted ? '#ff453a' : '#ffffff'} /> : <MicIcon size={16} color="#ffffff" />}
            label="Mute"
            active={isMuted}
            activeColor="rgba(255, 69, 58, 0.22)"
            activeBorder="#ff453a"
            onClick={toggleMute}
          />

          {/* End Call Button (Solid Red Circle with Hung Up Icon) */}
          <button
            onClick={endCall}
            className="interactive-child"
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: '#ff3b30',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255, 59, 48, 0.45), 0 2px 6px rgba(255, 59, 48, 0.25)',
              transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease',
              outline: 'none',
            }}
            title="End Call"
          >
            <PhoneIcon size={20} color="#ffffff" style={{ transform: 'rotate(135deg)' }} />
          </button>

          {/* Speaker / Audio Toggle */}
          <CallActionBtn
            icon={<SpeakerIcon size={16} color={isSpeaker ? '#007aff' : '#ffffff'} />}
            label="Speaker"
            active={isSpeaker}
            activeColor="rgba(0, 122, 255, 0.22)"
            activeBorder="#007aff"
            onClick={toggleSpeaker}
          />

          {/* Keypad */}
          <CallActionBtn
            icon={<KeypadIcon size={16} color="#ffffff" />}
            label="Keypad"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/* ── Circular Glass Action Button (macOS Tahoe style) ─────────────────────── */
function CallActionBtn({ icon, label, active, activeColor, activeBorder, onClick }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      className="interactive-child"
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width: 40, height: 40, borderRadius: '50%',
        background: active ? (activeColor || 'rgba(255,255,255,0.18)') : hovered ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.1)',
        border: active ? `1px solid ${activeBorder || 'rgba(255,255,255,0.3)'}` : '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.18s ease',
        transform: pressed ? 'scale(0.90)' : hovered ? 'scale(1.05)' : 'scale(1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        outline: 'none',
      }}
    >
      {icon}
    </button>
  );
}
