import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ────────────────────────────────────────────────────────────────────────────
   WinLand — Samsung One UI 9 Beta Dynamic Music Progress Wave
   ────────────────────────────────────────────────────────────────────────────
   • Wave sits directly ON the progress baseline and rises UPWARD.
   • Bottom edge of the wave is completely flat along baselineY with 0 underspill.
   • Continuous single-body colored shape: thin baseline + soft dynamic liquid wave.
   • Frame-rate independent horizontal flow (phase += speed * dt).
   • Multi-harmonic sinusoidal hills (base + 0.28x 2nd harmonic + 0.14x 3rd harmonic).
   • Smooth play/pause/resume velocity & amplitude easing with 0% CPU idle settling.
   • Integrated glowing seek thumb centered on (playedW, baselineY).
   • Full theme adaptability (Dark, Light, Liquid Glass) using active album art colors.
   ──────────────────────────────────────────────────────────────────────────── */

const CANVAS_HEIGHT = 28;
const TRACK_THICKNESS = 3.5;

function fmtTime(ms) {
  if (!ms || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function DynamicWaveProgress({
  progressMs = 0,
  durationMs = 0,
  isPlaying = false,
  eqColor = '#34c759',
  eqGlow = 'rgba(52, 199, 89, 0.35)',
  isLight = false,
  onSeek,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // ── Seek & Drag State ──────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [dragProgressMs, setDragProgressMs] = useState(0);
  const dragProgressMsRef = useRef(0);
  const [dragPosX, setDragPosX] = useState(0);

  // ── Authoritative Synchronization ──────────────────────────────────────────
  const syncRef = useRef({ baseMs: progressMs, baseTime: performance.now() });
  const seekLockUntilRef = useRef(0);
  const [displayMs, setDisplayMs] = useState(progressMs);

  // ── Wave Animation State (imperative, 0 React re-renders per frame) ───────
  const animStateRef = useRef({
    phase1: 0,
    phase2: 1.2,
    phase3: 2.7,
    velocity: isPlaying ? 1 : 0,
    amplitudeFactor: isPlaying ? 1 : 0.85,
    targetVelocity: isPlaying ? 1 : 0,
    targetAmplitude: isPlaying ? 1 : 0.85,
    lastFrameTime: performance.now(),
    isSettled: !isPlaying,
  });

  const rafIdRef = useRef(null);

  // Sync with incoming backend progress updates
  useEffect(() => {
    if (isDraggingRef.current) return;
    if (Date.now() < seekLockUntilRef.current) return;

    if (!isPlaying) {
      syncRef.current = { baseMs: progressMs, baseTime: performance.now() };
      setDisplayMs(progressMs);
      return;
    }

    const currentCalculated = syncRef.current.baseMs + (performance.now() - syncRef.current.baseTime);
    const drift = progressMs - currentCalculated;

    if (Math.abs(drift) > 1500) {
      syncRef.current = { baseMs: progressMs, baseTime: performance.now() };
      setDisplayMs(progressMs);
    } else if (Math.abs(drift) > 60) {
      syncRef.current.baseMs += drift * 0.25;
    }
  }, [progressMs, isPlaying]);

  // Easing targets when playback state flips
  useEffect(() => {
    animStateRef.current.targetVelocity = isPlaying ? 1 : 0;
    animStateRef.current.targetAmplitude = isPlaying ? 1 : 0.85;
    animStateRef.current.isSettled = false;
    animStateRef.current.lastFrameTime = performance.now();
  }, [isPlaying]);

  // ── Calculate Seek MS from Pointer Event ───────────────────────────────────
  const calcMsFromEvent = useCallback((e) => {
    if (!containerRef.current || !durationMs) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = rect.width > 0 ? clickX / rect.width : 0;
    setDragPosX(clickX);
    return Math.round(ratio * durationMs);
  }, [durationMs]);

  // ── Pointer Handlers (Capture, Move, Commit) ───────────────────────────────
  const handlePointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    seekLockUntilRef.current = Date.now() + 1800;
    setIsDragging(true);
    const targetMs = calcMsFromEvent(e);
    dragProgressMsRef.current = targetMs;
    setDragProgressMs(targetMs);
    setDisplayMs(targetMs);

    animStateRef.current.isSettled = false;

    if (e.target && e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const onPointerMove = (e) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const targetMs = calcMsFromEvent(e);
      dragProgressMsRef.current = targetMs;
      setDragProgressMs(targetMs);
      setDisplayMs(targetMs);
      animStateRef.current.isSettled = false;
    };
    const onPointerUp = (e) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      seekLockUntilRef.current = Date.now() + 1800;
      const targetMs = calcMsFromEvent(e);
      dragProgressMsRef.current = targetMs;
      syncRef.current = { baseMs: targetMs, baseTime: performance.now() };
      setDisplayMs(targetMs);
      onSeek?.(targetMs);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging, calcMsFromEvent, onSeek]);

  // ── 60/120/144 FPS GPU-Accelerated Canvas Rendering Loop ───────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let isMounted = true;

    const render = (now) => {
      if (!isMounted) return;

      const anim = animStateRef.current;
      const dt = Math.min(64, Math.max(1, now - anim.lastFrameTime));
      anim.lastFrameTime = now;

      // Smoothly ease velocity and amplitude (220ms time constant)
      const easeFactor = Math.min(1, dt / 220);
      anim.velocity += (anim.targetVelocity - anim.velocity) * easeFactor;
      anim.amplitudeFactor += (anim.targetAmplitude - anim.amplitudeFactor) * easeFactor;

      // Update horizontal phases with smooth, gentle flow speeds
      if (anim.velocity > 0.005) {
        anim.phase1 += 0.0024 * anim.velocity * dt;
        anim.phase2 += 0.0036 * anim.velocity * dt;
        anim.phase3 += 0.0050 * anim.velocity * dt;
      }

      // Check if settled (to save CPU when paused and not seeking)
      const velocitySettled = Math.abs(anim.velocity - anim.targetVelocity) < 0.002;
      const amplitudeSettled = Math.abs(anim.amplitudeFactor - anim.targetAmplitude) < 0.002;
      if (!isPlaying && !isDraggingRef.current && velocitySettled && amplitudeSettled) {
        anim.isSettled = true;
      }

      // Resize canvas buffer to match physical container width & DPR
      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      const displayW = containerRef.current ? containerRef.current.clientWidth : 300;
      const displayH = CANVAS_HEIGHT;

      if (displayW > 0) {
        const requiredPixelW = Math.round(displayW * dpr);
        const requiredPixelH = Math.round(displayH * dpr);
        if (canvas.width !== requiredPixelW || canvas.height !== requiredPixelH) {
          canvas.width = requiredPixelW;
          canvas.height = requiredPixelH;
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayW, displayH);

      // Compute current playback fraction
      let currentPlayedMs = 0;
      if (isDraggingRef.current) {
        currentPlayedMs = dragProgressMsRef.current;
      } else if (isPlaying && durationMs > 0) {
        const elapsed = performance.now() - syncRef.current.baseTime;
        currentPlayedMs = Math.min(syncRef.current.baseMs + elapsed, durationMs);
        setDisplayMs(currentPlayedMs);
      } else {
        currentPlayedMs = syncRef.current.baseMs;
      }

      const fraction = durationMs > 0 ? Math.min(1, Math.max(0, currentPlayedMs / durationMs)) : 0;
      const playedW = fraction * displayW;

      // ── Authoritative Baseline Coordinate ──────────────────────────────────
      // Everything anchors strictly to this Y coordinate:
      // Track, unplayed line, wave bottom boundary, playhead center.
      const baselineY = Math.round(displayH * 0.65);

      // ── 1. Unplayed Background Track ───────────────────────────────────────
      ctx.beginPath();
      ctx.roundRect(0, baselineY - (TRACK_THICKNESS / 2), displayW, TRACK_THICKNESS, TRACK_THICKNESS / 2);
      ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 255, 255, 0.14)';
      ctx.fill();

      // ── 2. Played Base Track Line ──────────────────────────────────────────
      if (playedW > 0) {
        ctx.beginPath();
        ctx.roundRect(0, baselineY - (TRACK_THICKNESS / 2), playedW, TRACK_THICKNESS, TRACK_THICKNESS / 2);
        const baseGrad = ctx.createLinearGradient(0, 0, Math.max(playedW, 10), 0);
        baseGrad.addColorStop(0, '#ffffff');
        baseGrad.addColorStop(1, eqColor);
        ctx.fillStyle = baseGrad;
        ctx.fill();
      }

      // ── 3. Multi-Layer Ultra-Smooth Dynamic Liquid Waves (Samsung One UI) ──
      if (playedW > 6) {
        ctx.save();
        // Hard clipping boundary: strictly clipped to [0, playedW] and ABOVE baselineY
        ctx.beginPath();
        ctx.rect(0, 0, playedW, baselineY + (TRACK_THICKNESS / 2));
        ctx.clip();

        // Subtle breathing dynamic modulation while playing
        const breathMod = isPlaying ? 1 + 0.04 * Math.sin(now * 0.0014) : 1;

        // Wave Layer Definitions: [phase, baseAmp, fillOp, wavelength]
        // 3 Soft Translucent Liquid Ribbon Layers without harsh borders
        const layers = [
          { phase: anim.phase1, amp: 12.5 * anim.amplitudeFactor * breathMod, fillOp: 0.32, wl: Math.max(65, playedW / 1.9) },
          { phase: anim.phase2, amp: 10.0 * anim.amplitudeFactor * breathMod, fillOp: 0.52, wl: Math.max(50, playedW / 2.4) },
          { phase: anim.phase3, amp: 7.5 * anim.amplitudeFactor * breathMod, fillOp: 0.78, wl: Math.max(38, playedW / 3.0) },
        ];

        layers.forEach((layer) => {
          ctx.beginPath();
          ctx.moveTo(0, baselineY);

          const step = 1.2;
          for (let x = 0; x <= playedW; x += step) {
            // Smooth natural cosine ease at start & end boundaries
            const startTaper = Math.min(1, x / 18);
            const endTaper = Math.min(1, (playedW - x) / 15);
            const taper = (0.5 - 0.5 * Math.cos(startTaper * Math.PI)) * (0.5 - 0.5 * Math.cos(endTaper * Math.PI));

            // Ultra-smooth broad liquid wave
            const k = (Math.PI * 2) / layer.wl;
            const s1 = Math.sin(x * k + layer.phase);
            const s2 = 0.18 * Math.sin(x * k * 1.6 + layer.phase * 1.2);
            const raw = (s1 + s2) / 1.18; // In [-1, 1]

            // Pure upward elevation: perfectly smooth 0 at baseline, layer.amp at crests
            const positiveElevation = (raw + 1) * 0.5; // In [0, 1]
            const heightAboveBaseline = Math.pow(positiveElevation, 1.35) * layer.amp * taper;
            const waveTopY = baselineY - heightAboveBaseline;

            ctx.lineTo(x, waveTopY);
          }

          // Flat bottom edge terminating cleanly at baselineY
          ctx.lineTo(playedW, baselineY);
          ctx.lineTo(0, baselineY);
          ctx.closePath();

          // Soft translucent liquid fill (Seamless tone, zero harsh border)
          const waveGrad = ctx.createLinearGradient(0, baselineY - layer.amp, 0, baselineY);
          waveGrad.addColorStop(0, hexToRgba(eqColor, layer.fillOp * 0.35));
          waveGrad.addColorStop(0.55, hexToRgba(eqColor, layer.fillOp * 0.75));
          waveGrad.addColorStop(1, hexToRgba(eqColor, layer.fillOp));
          ctx.fillStyle = waveGrad;
          ctx.fill();
        });

        ctx.restore();
      }

      // ── 4. Glowing Seek Thumb Centered Exactly on Baseline ────────────────
      if (fraction > 0.005 || isDraggingRef.current) {
        const thumbRadius = isDraggingRef.current ? 5.5 : 4.5;

        // Outer ambient glow aura centered on (playedW, baselineY)
        ctx.save();
        ctx.shadowColor = eqGlow;
        ctx.shadowBlur = isDraggingRef.current ? 14 : 9;
        ctx.beginPath();
        ctx.arc(playedW, baselineY, thumbRadius + 1.2, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(eqColor, 0.45);
        ctx.fill();
        ctx.restore();

        // Inner solid white circle with crisp subtle outline
        ctx.beginPath();
        ctx.arc(playedW, baselineY, thumbRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.15)';
        ctx.stroke();
      }

      ctx.restore();

      // Continue animation loop if active or transitioning
      if (!animStateRef.current.isSettled || isPlaying || isDraggingRef.current) {
        rafIdRef.current = requestAnimationFrame(render);
      } else {
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, durationMs, eqColor, eqGlow, isLight]);

  const activeDisplayMs = isDragging ? dragProgressMs : displayMs;

  return (
    <div style={{ width: '100%', position: 'relative', userSelect: 'none' }}>
      {/* Floating Tooltip during Seek Drag */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: -24,
            left: dragPosX,
            transform: 'translateX(-50%)',
            background: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(255, 255, 255, 0.95)',
            color: '#000000',
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 6,
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            zIndex: 25,
            whiteSpace: 'nowrap',
          }}
        >
          {fmtTime(dragProgressMs)}
        </div>
      )}

      {/* Interactive Wave Progress Scrubber Track */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="interactive-child"
        style={{
          width: '100%',
          height: CANVAS_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'visible',
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: CANVAS_HEIGHT,
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Timers Row */}
      <div
        className="widget-subtitle"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          marginTop: -2,
          fontWeight: 600,
          color: isLight ? 'rgba(60, 60, 67, 0.75)' : 'rgba(255, 255, 255, 0.55)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>{fmtTime(activeDisplayMs)}</span>
        <span>{durationMs > 0 ? fmtTime(durationMs) : '--:--'}</span>
      </div>
    </div>
  );
}

// ── Color Utility Helper ────────────────────────────────────────────────────
function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(52, 199, 89, ${alpha})`;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex;
  }
  const cleanHex = hex.replace('#', '');
  let r = 52, g = 199, b = 89;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
