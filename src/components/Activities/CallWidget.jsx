import React, { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../../utils/soundEngine';

/* ────────────────────────────────────────────────────────────────────────────
   macOS Tahoe – Phone / FaceTime Call Widget
   ────────────────────────────────────────────────────────────────────────────
   Compact pill  : green waveform left · caller name · duration right
   Expanded view : avatar, caller name, source label, duration,
                   4-button grid (mute · end · speaker · keypad)
   Incoming ring : pulsing green ring around avatar, accept/decline buttons
   ──────────────────────────────────────────────────────────────────────────── */

const SF_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", "SF Compact", "Helvetica Neue", system-ui, sans-serif';

/* ── Inline SVG icons (Clean macOS Apple style) ─────────────────────────── */
const PhoneIcon = ({ size = 16, color = '#fff', style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', shapeRendering: 'geometricPrecision', ...style }}
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const MicIcon = ({ size = 14, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', shapeRendering: 'geometricPrecision' }}>
    <rect x="9" y="1" width="6" height="13" rx="3"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const MicOffIcon = ({ size = 14, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', shapeRendering: 'geometricPrecision' }}>
    <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .73-.11 1.43-.32 2.09"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const SpeakerIcon = ({ size = 14, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', shapeRendering: 'geometricPrecision' }}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
  </svg>
);

const KeypadIcon = ({ size = 14, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', shapeRendering: 'geometricPrecision' }}>
    <rect x="3" y="3" width="4" height="4" rx="1"/><rect x="10" y="3" width="4" height="4" rx="1"/><rect x="17" y="3" width="4" height="4" rx="1"/>
    <rect x="3" y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/><rect x="17" y="10" width="4" height="4" rx="1"/>
    <rect x="3" y="17" width="4" height="4" rx="1"/><rect x="10" y="17" width="4" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/>
  </svg>
);

/* ── Tiny equalizer waveform for compact pill ───────────────────────────── */
function CompactWaveform() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 20 * dpr;
    canvas.height = 20 * dpr;
    ctx.scale(dpr, dpr);

    const loop = () => {
      tRef.current += 0.06;
      ctx.clearRect(0, 0, 20, 20);
      const bars = 4;
      const barW = 2.2;
      const gap = 1.6;
      const startX = (20 - (bars * barW + (bars - 1) * gap)) / 2;
      const freqs = [1.0, 1.618, 2.414, 3.317];
      const phases = [0, 1.1, 2.3, 0.7];

      for (let i = 0; i < bars; i++) {
        const h = 4 + 7 * (0.5 + 0.5 * Math.sin(tRef.current * freqs[i] + phases[i]));
        const x = startX + i * (barW + gap);
        const y = 10 - h / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, h, barW / 2);
        ctx.fillStyle = '#30d158';
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
      width={20}
      height={20}
      style={{ width: 20, height: 20, flexShrink: 0, imageRendering: 'auto' }}
    />
  );
}

export default function CallWidget({ callData, isCompact, onEndCall }) {
  const [callState, setCallState] = useState(callData?.state || 'active');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [callData?.avatar]);

  useEffect(() => {
    setCallState(callData?.state || 'active');
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
    if (!name || name === 'Phone call' || name === 'Phone Link' || name === 'PC' || name.length < 2) return '📞';
    const clean = name.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const rawCaller = callData?.callerName || 'Phone Call';
  const callerName = (rawCaller === 'Phone Link' || rawCaller === 'Phone call') ? 'Phone Call' : rawCaller;
  const source = callData?.source || 'Phone Link';
  const initials = getInitials(callerName);
  const hasAvatar = !!callData?.avatar;

  /* ── COMPACT PILL (green waveform + name + timer) ─────────────────────── */
  if (isCompact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', height: '100%', padding: '0 14px',
        fontFamily: SF_FONT,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CompactWaveform />
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#ffffff',
            letterSpacing: '-0.2px', lineHeight: 1,
          }}>{callerName}</span>
        </div>
        {callState === 'active' && (
          <span style={{
            fontSize: 12.5, color: '#30d158', fontWeight: 600,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '0.3px',
          }}>
            {formatDuration(duration)}
          </span>
        )}
        {callState === 'incoming' && (
          <span style={{
            fontSize: 11, color: '#30d158', fontWeight: 500,
            animation: 'callTextPulse 1.8s ease-in-out infinite',
          }}>
            Incoming…
          </span>
        )}
      </div>
    );
  }

  /* ── EXPANDED VIEW ────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px 24px 16px',
        position: 'relative',
        borderRadius: 'inherit',
        background: '#000000',
        fontFamily: SF_FONT,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Avatar ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 10, flexShrink: 0 }}>
        {/* Incoming pulse ring */}
        {callState === 'incoming' && (
          <>
            <div style={{
              position: 'absolute', inset: -5,
              borderRadius: '50%',
              border: '2px solid rgba(48, 209, 88, 0.6)',
              animation: 'callRingPulse1 2s ease-out infinite',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', inset: -5,
              borderRadius: '50%',
              border: '2px solid rgba(48, 209, 88, 0.4)',
              animation: 'callRingPulse2 2s ease-out infinite 0.6s',
              pointerEvents: 'none',
            }} />
          </>
        )}

        {/* Active call glow */}
        {callState === 'active' && (
          <div style={{
            position: 'absolute', inset: -3,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(48, 209, 88, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
            animation: 'callGlowBreath 3s ease-in-out infinite',
          }} />
        )}

        {hasAvatar && !avatarError ? (
          <img
            src={callData.avatar}
            alt={callerName}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              objectFit: 'cover',
              border: callState === 'incoming'
                ? '2px solid #30d158'
                : '1.5px solid rgba(255, 255, 255, 0.15)',
              animation: 'callAvatarEntry 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            }}
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: callState === 'incoming'
              ? 'linear-gradient(145deg, #1a3a1a 0%, #0d1f0d 100%)'
              : 'linear-gradient(145deg, #2c2c32 0%, #1a1a1e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 17, color: '#ffffff',
            border: callState === 'incoming'
              ? '2px solid #30d158'
              : '1.5px solid rgba(255, 255, 255, 0.15)',
            letterSpacing: '0.4px',
            fontFamily: SF_FONT,
            animation: 'callAvatarEntry 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          }}>
            {initials !== '📞' ? initials : (
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#30d158', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PhoneIcon size={18} color="#ffffff" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Caller Name ─────────────────────────────────────────────────── */}
      <div style={{
        fontSize: 16, fontWeight: 600, color: '#ffffff',
        letterSpacing: '-0.3px', textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: '85%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        animation: 'callTextEntry 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both',
      }}>
        {callerName}
      </div>

      {/* ── Status Line ─────────────────────────────────────────────────── */}
      <div style={{
        fontSize: 11.5, fontWeight: 500,
        color: callState === 'active' ? '#30d158' : 'rgba(255, 255, 255, 0.5)',
        letterSpacing: '0.1px', textAlign: 'center',
        marginTop: 2, marginBottom: callState === 'incoming' ? 14 : 12,
        display: 'flex', alignItems: 'center', gap: 5,
        animation: 'callTextEntry 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both',
      }}>
        {callState === 'active' ? (
          <>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#30d158', display: 'inline-block',
              boxShadow: '0 0 6px rgba(48, 209, 88, 0.5)',
              animation: 'callDotPulse 2s ease-in-out infinite',
            }} />
            <span>{source}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{
              fontVariantNumeric: 'tabular-nums', fontWeight: 600,
              color: '#30d158',
            }}>
              {formatDuration(duration)}
            </span>
          </>
        ) : (
          <span style={{
            animation: 'callTextPulse 1.8s ease-in-out infinite',
          }}>
            {source} · Incoming Call
          </span>
        )}
      </div>

      {/* ── Action Buttons ──────────────────────────────────────────────── */}
      {callState === 'incoming' ? (
        /* ── Incoming: Decline (red) + Accept (green) ───────────────────── */
        <div style={{
          display: 'flex', alignItems: 'center', gap: 24,
          animation: 'callButtonsEntry 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both',
        }}>
          <button
            onClick={declineCall}
            className="interactive-child"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: '#ff3b30',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255, 59, 48, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            title="Decline"
          >
            <PhoneIcon size={18} color="#ffffff" style={{ transform: 'rotate(135deg)' }} />
          </button>

          <button
            onClick={acceptCall}
            className="interactive-child"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: '#30d158',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(48, 209, 88, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            title="Accept"
          >
            <PhoneIcon size={18} color="#ffffff" />
          </button>
        </div>
      ) : (
        /* ── Active call: 4-button row (Mute · End · Speaker · Keypad) ── */
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'callButtonsEntry 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both',
        }}>
          {/* Mute */}
          <CallActionBtn
            icon={isMuted ? <MicOffIcon size={15} color={isMuted ? '#ff453a' : '#fff'} /> : <MicIcon size={15} color="#fff" />}
            label="Mute"
            active={isMuted}
            activeColor="rgba(255, 69, 58, 0.2)"
            activeBorder="#ff453a"
            onClick={toggleMute}
          />
          {/* End Call Button - macOS Solid Red Circle with Phone Hung Up Icon */}
          <button
            onClick={endCall}
            className="interactive-child"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: '#ff3b30',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255, 59, 48, 0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            title="End Call"
          >
            <PhoneIcon size={18} color="#ffffff" style={{ transform: 'rotate(135deg)' }} />
          </button>
          {/* Speaker */}
          <CallActionBtn
            icon={<SpeakerIcon size={15} color={isSpeaker ? '#007aff' : '#fff'} />}
            label="Speaker"
            active={isSpeaker}
            activeColor="rgba(0, 122, 255, 0.2)"
            activeBorder="#007aff"
            onClick={toggleSpeaker}
          />
          {/* Keypad */}
          <CallActionBtn
            icon={<KeypadIcon size={15} color="#fff" />}
            label="Keypad"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/* ── Reusable circular action button (macOS Tahoe style) ─────────────────── */
function CallActionBtn({ icon, label, active, activeColor, activeBorder, onClick }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      className="interactive-child"
      onClick={onClick}
      title={label}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        width: 38, height: 38, borderRadius: '50%',
        background: active ? (activeColor || 'rgba(255,255,255,0.15)') : 'rgba(255, 255, 255, 0.1)',
        border: active ? `1px solid ${activeBorder || 'rgba(255,255,255,0.25)'}` : '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {icon}
    </button>
  );
}
