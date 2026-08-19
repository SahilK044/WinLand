import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Square,
  Play,
  Pause,
  Minimize2,
  Video,
  Mic,
  MicOff,
  Camera,
  Sparkles,
  Monitor,
} from 'lucide-react';
import useRecordingState from '../RecordingControlsPill/useRecordingState.js';

const RESOLUTION_OPTIONS = [
  { id: '1080p', label: '1080p', width: 1920, height: 1080, bitrate: 20000000 },
  { id: '1440p', label: '2K', width: 2560, height: 1440, bitrate: 32000000 },
  { id: '4k', label: '4K', width: 3840, height: 2160, bitrate: 50000000 },
];

const FPS_OPTIONS = [30, 60, 120, 240];

const SEG_ROW_STYLE = {
  display: 'flex',
  gap: 3,
  padding: 3,
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 10,
  border: '1px solid rgba(255, 255, 255, 0.06)',
};

const ScreenRecorderWidget = React.memo(function ScreenRecorderWidget({
  isCompact,
  onStop,
  onExpand,
  onMinimize,
}) {
  const {
    status,
    formattedTime,
    isRecording,
    isPaused,
    isStarting,
    isStopping,
    micEnabled,
    webcamEnabled,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    toggleMic,
    toggleWebcam,
  } = useRecordingState();

  const [resolutionId, setResolutionId] = useState('1080p');
  const [selectedFps, setSelectedFps] = useState(60);
  const [recordingMode, setRecordingMode] = useState('normal');

  const currentPreset = RESOLUTION_OPTIONS.find((p) => p.id === resolutionId) || RESOLUTION_OPTIONS[0];

  const handleStart = async (e) => {
    e?.stopPropagation();
    await startRecording({
      resolutionId,
      fps: selectedFps,
      mode: recordingMode,
    });
    onMinimize?.();
  };

  const handleTogglePause = (e) => {
    e?.stopPropagation();
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  const handleStop = (e) => {
    e?.stopPropagation();
    stopRecording();
    onStop?.();
  };

  // ── Compact Minimal Timer Pill ──
  if (isCompact) {
    return (
      <div
        onClick={onExpand}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          padding: '0 10px',
          boxSizing: 'border-box',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        title="Screen Studio Recording (Click to expand)"
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: isPaused ? '#f59e0b' : '#ff453a',
            boxShadow: isPaused
              ? '0 0 6px rgba(245,158,11,0.6)'
              : '0 0 8px rgba(255,69,58,0.5)',
            animation: isRecording ? 'pulse 1.2s infinite ease-in-out' : 'none',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em',
          }}
        >
          {isPaused ? 'PAUSED' : formattedTime}
        </span>
      </div>
    );
  }

  // ── Expanded Setup & Controls Card ──
  const isRecordingActive = isRecording || isPaused;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '12px 14px 11px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginLeft: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: 'rgba(255, 69, 58, 0.15)',
              border: '1px solid rgba(255, 69, 58, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(255, 69, 58, 0.2)',
              flexShrink: 0,
            }}
          >
            <Video size={13} color="#ff453a" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 750, color: '#ffffff', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              {isStarting ? 'Preparing Studio…'
                : isStopping ? 'Finishing…'
                : isPaused ? 'Studio Paused'
                : isRecording ? 'Screen Recording'
                : status === 'error' ? 'Recording Error'
                : 'Screen Studio'}
            </div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.42)', marginTop: 1, fontWeight: 500 }}>
              {`${currentPreset.label} · ${selectedFps} FPS · ${recordingMode === 'smart' ? 'Smart Focus' : 'Standard'}`}
            </div>
          </div>
        </div>

        {isRecordingActive ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '-0.5px',
                fontVariantNumeric: 'tabular-nums',
                color: isPaused ? '#f59e0b' : '#ff453a',
              }}
            >
              {formattedTime}
            </span>
            <button
              aria-label="Minimize Studio"
              onClick={(e) => {
                e.stopPropagation();
                onMinimize?.();
              }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: 6,
                padding: '4px 6px',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.16)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
              }}
            >
              <Minimize2 size={11} />
            </button>
          </div>
        ) : (
          <button
            aria-label="Close Studio"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize?.();
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Body Options */}
      {!isRecordingActive && !isStarting && !isStopping ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'center', margin: '4px 0' }}>
          {/* Row 1: Resolution + FPS */}
          <div style={{ display: 'flex', gap: 6 }}>
            {/* Resolution Segment */}
            <div style={{ ...SEG_ROW_STYLE, flex: '1 1 45%' }}>
              {RESOLUTION_OPTIONS.map((r) => {
                const isSelected = resolutionId === r.id;
                return (
                  <button
                    key={r.id}
                    aria-label={`Resolution ${r.label}`}
                    onClick={(e) => { e.stopPropagation(); setResolutionId(r.id); }}
                    style={{
                      position: 'relative',
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      padding: '6px 4px',
                      borderRadius: 7,
                      textAlign: 'center',
                      fontSize: 10.5,
                      fontWeight: isSelected ? 700 : 500,
                      whiteSpace: 'nowrap',
                      color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                      cursor: 'pointer',
                      transition: 'color 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="resolution-active-indicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.7 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 7,
                          background: 'rgba(255, 255, 255, 0.16)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
                          zIndex: 0,
                        }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* FPS Segment */}
            <div style={{ ...SEG_ROW_STYLE, flex: '1 1 55%' }}>
              {FPS_OPTIONS.map((fps) => {
                const isSelected = selectedFps === fps;
                return (
                  <button
                    key={fps}
                    aria-label={`${fps} Frames Per Second`}
                    onClick={(e) => { e.stopPropagation(); setSelectedFps(fps); }}
                    style={{
                      position: 'relative',
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      padding: '6px 4px',
                      borderRadius: 7,
                      textAlign: 'center',
                      fontSize: 10.5,
                      fontWeight: isSelected ? 700 : 500,
                      whiteSpace: 'nowrap',
                      color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                      cursor: 'pointer',
                      transition: 'color 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="fps-active-indicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.7 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 7,
                          background: 'rgba(255, 255, 255, 0.16)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
                          zIndex: 0,
                        }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{fps}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Mode + Quick Device Toggles */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Mode Segment */}
            <div style={{ ...SEG_ROW_STYLE, flex: 1 }}>
              {[
                { id: 'normal', label: 'Standard', Icon: Monitor },
                { id: 'smart', label: 'Smart Focus', Icon: Sparkles },
              ].map(({ id, label, Icon }) => {
                const isSelected = recordingMode === id;
                return (
                  <button
                    key={id}
                    aria-label={`${label} Recording Mode`}
                    onClick={(e) => { e.stopPropagation(); setRecordingMode(id); }}
                    style={{
                      position: 'relative',
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      padding: '6px 4px',
                      borderRadius: 7,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      fontSize: 10.5,
                      fontWeight: isSelected ? 700 : 500,
                      whiteSpace: 'nowrap',
                      color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                      cursor: 'pointer',
                      transition: 'color 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="mode-active-indicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.7 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 7,
                          background: 'rgba(255, 255, 255, 0.16)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
                          zIndex: 0,
                        }}
                      />
                    )}
                    <Icon
                      size={11}
                      color={id === 'smart' && isSelected ? '#ff9f0a' : 'currentColor'}
                      opacity={isSelected ? 1 : 0.6}
                      style={{ position: 'relative', zIndex: 1 }}
                    />
                    <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mic Quick Toggle */}
            <button
              aria-label={micEnabled ? 'Mute Microphone' : 'Enable Microphone'}
              onClick={(e) => {
                e.stopPropagation();
                toggleMic();
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                border: micEnabled ? '1px solid rgba(52, 199, 89, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: micEnabled ? 'rgba(52, 199, 89, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                color: micEnabled ? '#34c759' : 'rgba(255, 255, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={micEnabled ? 'Microphone Enabled' : 'Microphone Muted'}
            >
              {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
            </button>

            {/* Webcam Quick Toggle */}
            <button
              aria-label={webcamEnabled ? 'Disable Webcam Overlay' : 'Enable Webcam Overlay'}
              onClick={(e) => {
                e.stopPropagation();
                toggleWebcam();
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                border: webcamEnabled ? '1px solid rgba(10, 132, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: webcamEnabled ? 'rgba(10, 132, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                color: webcamEnabled ? '#0a84ff' : 'rgba(255, 255, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={webcamEnabled ? 'Webcam Overlay Active' : 'Webcam Overlay Disabled'}
            >
              <Camera size={13} />
            </button>
          </div>
        </div>
      ) : isRecordingActive ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Smart Controls
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ k: 'P', d: 'Pan / Full View' }, { k: 'Z', d: 'Focus / Zoom' }].map(({ k, d }) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  padding: '5px 8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: 4,
                    padding: '1px 5px',
                    fontSize: 9.5,
                    fontWeight: 750,
                    color: '#ffffff',
                    fontFamily: 'SF Mono, Consolas, monospace',
                  }}
                >
                  {k}
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        {!isRecordingActive && !isStarting && !isStopping ? (
          <button
            aria-label="Start Screen Recording"
            onClick={handleStart}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #ff3b30 0%, #d32f2f 100%)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 750,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 18px rgba(255, 59, 48, 0.42), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
              e.currentTarget.style.boxShadow = '0 6px 22px rgba(255, 59, 48, 0.52), inset 0 1px 1px rgba(255, 255, 255, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 18px rgba(255, 59, 48, 0.42), inset 0 1px 1px rgba(255, 255, 255, 0.35)';
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 0 6px rgba(255,255,255,0.8)',
              }}
            />
            Start Recording
          </button>
        ) : isStarting ? (
          <div
            style={{
              flex: 1,
              height: 36,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 11.5,
              fontWeight: 650,
            }}
          >
            Preparing capture stream…
          </div>
        ) : isStopping ? (
          <div
            style={{
              flex: 1,
              height: 36,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 11.5,
              fontWeight: 650,
            }}
          >
            Encoding & saving recording…
          </div>
        ) : (
          <>
            <button
              aria-label={isPaused ? 'Resume Recording' : 'Pause Recording'}
              onClick={handleTogglePause}
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                border: 'none',
                background: isPaused ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isPaused ? 'rgba(245,158,11,0.32)' : 'rgba(255,255,255,0.16)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isPaused ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)';
              }}
            >
              {isPaused ? <Play size={14} fill="#f59e0b" color="#f59e0b" style={{ marginLeft: 1 }} /> : <Pause size={14} fill="#fff" />}
            </button>
            <button
              aria-label="Stop and Save Recording"
              onClick={handleStop}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 11,
                border: 'none',
                background: 'linear-gradient(135deg, #ff3b30 0%, #d32f2f 100%)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 750,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                boxShadow: '0 4px 16px rgba(255,59,48,0.38)',
                transition: 'all 0.15s ease',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Square size={10} fill="#fff" />
              Stop & Save
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default ScreenRecorderWidget;

