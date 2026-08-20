import React, { useRef, useEffect, useState, useCallback } from 'react';

const CANVAS_HEIGHT = 28;
const TRACK_THICKNESS = 3.5;
const PADDING_X = 6;

function fmtTime(ms) {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export default function ClassicShimmerProgress({
  progressMs = 0,
  durationMs = 0,
  isPlaying = false,
  eqColor = '#ffffff',
  eqGlow = 'rgba(255, 255, 255, 0.4)',
  isLight = false,
  onSeek,
}) {
  const containerRef = useRef(null);
  const progressBarRef = useRef(null);
  const knobRef = useRef(null);
  const timeDisplayRef = useRef(null);

  // Timekeeper state
  const syncRef = useRef({
    baseMs: progressMs,
    baseTs: performance.now(),
    durationMs,
  });

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [dragProgressMs, setDragProgressMs] = useState(0);
  const [dragPosX, setDragPosX] = useState(0);

  // Synchronize internal timekeeper on prop updates
  useEffect(() => {
    syncRef.current.durationMs = durationMs;
    if (isDraggingRef.current) return;

    const prevBase = syncRef.current.baseMs;
    const drift = progressMs - prevBase;

    // Reset base time on seek or large jumps (>1.5s)
    if (Math.abs(drift) > 1500) {
      syncRef.current.baseMs = progressMs;
      syncRef.current.baseTs = performance.now();
    } else if (Math.abs(drift) > 50) {
      syncRef.current.baseMs += drift * 0.35;
    }

    if (!isPlaying) {
      syncRef.current.baseMs = progressMs;
      syncRef.current.baseTs = performance.now();
    }
  }, [progressMs, durationMs, isPlaying]);

  // Sub-millisecond continuous interpolation RAF loop
  useEffect(() => {
    let rafId = null;

    const render = () => {
      if (!isDraggingRef.current) {
        const now = performance.now();
        let curMs = syncRef.current.baseMs;
        if (isPlaying) {
          curMs += (now - syncRef.current.baseTs);
        }

        const dur = syncRef.current.durationMs || 1;
        const clampedMs = Math.min(dur, Math.max(0, curMs));
        const fraction = dur > 0 ? clampedMs / dur : 0;
        const pct = Math.min(100, Math.max(0, fraction * 100));

        const width = containerRef.current ? containerRef.current.clientWidth : 0;
        const trackWidth = Math.max(1, width - PADDING_X * 2);
        const thumbX = PADDING_X + fraction * trackWidth;

        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${pct}%`;
        }
        if (knobRef.current) {
          knobRef.current.style.left = `${thumbX}px`;
          knobRef.current.style.opacity = fraction > 0.005 ? '1' : '0';
        }
        if (timeDisplayRef.current) {
          timeDisplayRef.current.textContent = fmtTime(clampedMs);
        }
      }

      if (isPlaying || isDraggingRef.current) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying, isDragging, progressMs]);

  // Pointer Scrub / Drag Calculation
  const computeTargetFromPointer = useCallback((clientX) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(PADDING_X, Math.min(rect.width - PADDING_X, clientX - rect.left));
    const trackWidth = Math.max(1, rect.width - PADDING_X * 2);
    const fraction = (clickX - PADDING_X) / trackWidth;
    const targetMs = Math.round(fraction * durationMs);
    const pct = Math.min(100, Math.max(0, fraction * 100));

    setDragPosX(clickX);
    setDragProgressMs(targetMs);

    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${pct}%`;
    }
    if (knobRef.current) {
      knobRef.current.style.left = `${clickX}px`;
      knobRef.current.style.opacity = '1';
    }
    if (timeDisplayRef.current) {
      timeDisplayRef.current.textContent = fmtTime(targetMs);
    }
    return targetMs;
  }, [durationMs]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (!durationMs || durationMs <= 0) return;

    isDraggingRef.current = true;
    setIsDragging(true);
    computeTargetFromPointer(e.clientX);

    if (e.target && e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (moveEvt) => {
      if (!isDraggingRef.current) return;
      moveEvt.preventDefault();
      computeTargetFromPointer(moveEvt.clientX);
    };

    const onPointerUp = (upEvt) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      const finalMs = computeTargetFromPointer(upEvt.clientX);
      syncRef.current.baseMs = finalMs;
      syncRef.current.baseTs = performance.now();

      if (onSeek) onSeek(finalMs);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging, computeTargetFromPointer, onSeek]);

  const initialFraction = durationMs > 0 ? Math.min(1, Math.max(0, progressMs / durationMs)) : 0;
  const initialPct = initialFraction * 100;

  return (
    <div style={{ width: '100%', position: 'relative', userSelect: 'none' }}>
      {/* Floating Glassmorphic Tooltip */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: -26,
            left: dragPosX,
            transform: 'translateX(-50%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            background: isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(28, 28, 32, 0.92)',
            color: isLight ? '#000000' : '#ffffff',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 7,
            border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: isLight ? '0 3px 10px rgba(0,0,0,0.12)' : '0 4px 16px rgba(0,0,0,0.45)',
            pointerEvents: 'none',
            zIndex: 25,
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtTime(dragProgressMs)}
        </div>
      )}

      {/* Interactive Progress Bar Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="interactive-child"
        style={{
          width: '100%',
          height: CANVAS_HEIGHT,
          cursor: 'pointer',
          position: 'relative',
          overflow: 'visible',
          touchAction: 'none',
        }}
      >
        {/* Track Background Line (Aligned to baselineY = 20px) */}
        <div
          style={{
            position: 'absolute',
            left: PADDING_X,
            right: PADDING_X,
            top: 18.25,
            height: TRACK_THICKNESS,
            borderRadius: TRACK_THICKNESS / 2,
            background: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)',
            overflow: 'hidden',
          }}
        >
          {/* Active Played Fill Bar with Shimmer Effect */}
          <div
            ref={progressBarRef}
            className="progress-shimmer-bar"
            style={{
              width: `${initialPct}%`,
              height: '100%',
              borderRadius: TRACK_THICKNESS / 2,
              background: eqColor,
              boxShadow: `0 0 10px ${eqGlow}`,
              transition: isDragging ? 'none' : 'background 0.8s ease, box-shadow 0.8s ease',
              willChange: 'width',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              className="progress-shimmer-overlay"
              style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
            />
          </div>
        </div>

        {/* 1:1 One UI 9 Concentric Glowing Knob Handle */}
        <div
          ref={knobRef}
          style={{
            position: 'absolute',
            top: 20,
            left: `calc(${PADDING_X}px + ${(initialPct / 100)} * (100% - ${PADDING_X * 2}px))`,
            transform: 'translate(-50%, -50%)',
            width: isDragging ? 14 : 11.5,
            height: isDragging ? 14 : 11.5,
            borderRadius: '50%',
            background: eqColor,
            border: isDragging ? '2.4px solid #ffffff' : '2px solid #ffffff',
            boxShadow: `0 0 10px ${eqGlow}, 0 2px 6px rgba(0,0,0,0.45)`,
            opacity: initialPct > 0.5 ? 1 : 0,
            transition: isDragging ? 'none' : 'transform 0.15s ease, opacity 0.2s ease, width 0.15s ease, height 0.15s ease, background 0.8s ease',
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Inner Solid White Core Dot */}
          <div
            style={{
              width: isDragging ? 4.2 : 3.2,
              height: isDragging ? 4.2 : 3.2,
              borderRadius: '50%',
              background: '#ffffff',
            }}
          />
        </div>
      </div>

      {/* Timestamps Row */}
      <div
        className="widget-subtitle"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10.5,
          marginTop: -2,
          padding: '0 2px',
          fontWeight: 600,
          color: isLight ? 'rgba(60, 60, 67, 0.78)' : 'rgba(255, 255, 255, 0.58)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}
      >
        <span ref={timeDisplayRef}>{fmtTime(progressMs)}</span>
        <span>{durationMs > 0 ? fmtTime(durationMs) : '--:--'}</span>
      </div>
    </div>
  );
}
