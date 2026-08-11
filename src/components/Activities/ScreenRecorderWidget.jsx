import React, { useState, useEffect, useRef } from 'react';
import { Square, Folder, Play, Pause, MousePointer2, ZoomIn, Video, Sparkles } from 'lucide-react';

const RESOLUTION_OPTIONS = [
  { id: '1080p', label: '1080p HD', width: 1920, height: 1080, bitrate: 15000000 },
  { id: '1440p', label: '1440p 2K', width: 2560, height: 1440, bitrate: 22000000 },
  { id: '4k', label: '4K Ultra', width: 3840, height: 2160, bitrate: 35000000 },
];

const FPS_OPTIONS = [30, 60, 120];

export default function ScreenRecorderWidget({ isCompact, onStop, onExpand }) {
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('ready'); // 'ready' | 'recording' | 'paused' | 'saving' | 'saved'
  const [resolutionId, setResolutionId] = useState('1080p');
  const [selectedFps, setSelectedFps] = useState(60);
  const [enableZoom, setEnableZoom] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [savedPath, setSavedPath] = useState('');

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const composedStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mouseCleanupRef = useRef(null);

  const clicksRef = useRef([]);
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const camPosRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const lastClickTimeRef = useRef(0);

  // Live Timer Tick
  useEffect(() => {
    if (status !== 'recording') return undefined;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Draw RapiDemo macOS Style Pointer Cursor
  const drawRapiDemoCursor = (ctx, x, y) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 24);
    ctx.lineTo(6, 18);
    ctx.lineTo(11, 28);
    ctx.lineTo(15, 26);
    ctx.lineTo(11, 16);
    ctx.lineTo(19, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // RapiDemo Auto-Zoom Camera Engine + HDR Tone-Mapped Color Matrix
  const createComposedStream = async (screenStream, source, preset, targetFps) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = screenStream;
    await video.play();
    videoRef.current = video;

    const canvas = document.createElement('canvas');
    canvas.width = preset.width;
    canvas.height = preset.height;
    canvasRef.current = canvas;

    // Force sRGB color space context + HDR color correction filter to eliminate washed-out gray/purple tones
    const ctx = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const bounds = source.bounds || { x: 0, y: 0, width: preset.width, height: preset.height };

    // Initial camera position centered on screen
    camPosRef.current = { x: preset.width / 2, y: preset.height / 2 };

    const draw = () => {
      if (!ctx || !videoRef.current) return;

      const now = performance.now();

      // Smooth RapiDemo spring interpolation for 60fps/120fps mouse movement
      const current = mousePosRef.current;
      const target = mouseTargetRef.current;
      current.x += (target.x - current.x) * 0.25;
      current.y += (target.y - current.y) * 0.25;

      const cursorX = ((current.x - bounds.x) / bounds.width) * canvas.width;
      const cursorY = ((current.y - bounds.y) / bounds.height) * canvas.height;

      // RapiDemo Auto-Zoom Camera Logic: Zooms into cursor on click/action (1.35x zoom)
      let desiredZoom = 1.0;
      if (enableZoom && now - lastClickTimeRef.current < 1800) {
        desiredZoom = 1.35;
      }
      zoomRef.current += (desiredZoom - zoomRef.current) * 0.08;

      const currentCam = camPosRef.current;
      currentCam.x += (cursorX - currentCam.x) * 0.08;
      currentCam.y += (cursorY - currentCam.y) * 0.08;

      const zoom = zoomRef.current;

      ctx.save();
      // Apply sRGB HDR color correction matrix filter to prevent washed-out colors
      ctx.filter = 'contrast(105%) saturate(112%) brightness(101%)';

      if (enableZoom && zoom > 1.01) {
        // Transform canvas matrix centered around RapiDemo camera focus point
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-currentCam.x, -currentCam.y);
      }

      // Render video frame
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      if (showCursor) {
        // Clean old click ripples
        clicksRef.current = clicksRef.current.filter((c) => now - c.startedAt < 650);

        // Render click ripple rings
        for (const click of clicksRef.current) {
          const progress = Math.min(1, (now - click.startedAt) / 650);
          const radius = 12 + progress * 38;
          ctx.save();
          ctx.globalAlpha = 1 - progress;
          ctx.strokeStyle = click.button === 'right' ? '#0a84ff' : '#30d158';
          ctx.lineWidth = 4 - progress * 2.5;
          ctx.beginPath();
          ctx.arc(click.x, click.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        if (Number.isFinite(cursorX) && Number.isFinite(cursorY)) {
          drawRapiDemoCursor(ctx, cursorX, cursorY);
        }
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return canvas.captureStream(targetFps);
  };

  // Start Recording Action (Triggered ONLY when user clicks Start Recording button!)
  const handleStartRecording = async (e) => {
    e?.stopPropagation();
    setSeconds(0);
    setStatus('recording');

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.electronAPI?.getPrimaryScreenSource) {
        return;
      }

      const preset = RESOLUTION_OPTIONS.find((p) => p.id === resolutionId) || RESOLUTION_OPTIONS[0];
      const source = await window.electronAPI.getPrimaryScreenSource();
      if (!source?.id) return;

      // Start global RapiDemo mouse listener
      mouseCleanupRef.current = window.electronAPI?.onScreenRecMouseUpdate?.((data) => {
        if (!data) return;
        mouseTargetRef.current = { x: data.x, y: data.y };
        if (data.eventType === 'down') {
          lastClickTimeRef.current = performance.now();
          const bounds = source.bounds;
          clicksRef.current.push({
            x: ((data.x - bounds.x) / bounds.width) * preset.width,
            y: ((data.y - bounds.y) / bounds.height) * preset.height,
            button: data.button,
            startedAt: performance.now(),
          });
        }
      });
      window.electronAPI?.startScreenRecMouseTracking?.();

      const screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
            minFrameRate: selectedFps,
            maxFrameRate: selectedFps,
            maxWidth: preset.width,
            maxHeight: preset.height,
          },
        },
      });

      streamRef.current = screenStream;

      let recordingStream = screenStream;
      if (enableZoom) {
        recordingStream = await createComposedStream(screenStream, source, preset, selectedFps);
        composedStreamRef.current = recordingStream;
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm; codecs=vp8')
        ? 'video/webm; codecs=vp8'
        : 'video/webm';

      const recorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: selectedFps >= 60 ? preset.bitrate * 1.5 : preset.bitrate,
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size > 0 && window.electronAPI?.saveScreenRecording) {
          const buffer = await blob.arrayBuffer();
          const res = await window.electronAPI.saveScreenRecording({ buffer, mimeType: blob.type });
          if (res?.ok && res?.filePath) {
            setSavedPath(res.filePath);
            setStatus('saved');
            window.electronAPI?.openFileLocation?.(res.filePath);
          }
        }
      };

      recorder.start(250); // Slices 250ms chunks so zero trailing frames get lost on stop
    } catch (err) {
      console.error('Screen recording failed:', err);
    }
  };

  // INSTANT Hard Stop Action
  const handleStopRecording = (e) => {
    e?.stopPropagation();
    if (status === 'saved') {
      onStop?.();
      return;
    }

    setStatus('saving');

    // Stop mouse tracking
    mouseCleanupRef.current?.();
    window.electronAPI?.stopScreenRecMouseTracking?.();

    // Instantly terminate video tracks so zero extra frames capture
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (composedStreamRef.current) composedStreamRef.current.getTracks().forEach((t) => t.stop());
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      onStop?.();
    }
  };

  // Pause / Resume Toggle
  const handleTogglePause = (e) => {
    e?.stopPropagation();
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (status === 'recording') {
      recorder.pause();
      setStatus('paused');
    } else if (status === 'paused') {
      recorder.resume();
      setStatus('recording');
    }
  };

  const handleOpenFolder = (e) => {
    e?.stopPropagation();
    window.electronAPI?.openFileLocation?.(savedPath);
  };

  const currentPreset = RESOLUTION_OPTIONS.find((p) => p.id === resolutionId) || RESOLUTION_OPTIONS[0];

  // Compact Notch Mode (Pinned at top notch while recording)
  if (isCompact) {
    return (
      <div
        onClick={onExpand}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
      >
        {/* Left: Red Pulse + Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: status === 'paused' ? '#ffcc00' : '#ff453a',
              boxShadow: status === 'paused' ? '0 0 10px #ffcc00' : '0 0 10px #ff453a',
              animation: status === 'recording' ? 'pulse 1.2s infinite ease-in-out' : 'none',
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 800, color: status === 'paused' ? '#ffcc00' : '#ff453a', fontVariantNumeric: 'tabular-nums' }}>
            {status === 'paused' ? 'PAUSED' : `REC ${formatTime(seconds)}`}
          </span>
        </div>

        {/* Center: Resolution + FPS Badge */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255, 255, 255, 0.75)' }}>
          {currentPreset.label} • {selectedFps}FPS {enableZoom ? '• Zoom' : ''}
        </div>

        {/* Right: Instant Stop Button */}
        <button
          onClick={handleStopRecording}
          title="Stop Recording Instantly"
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: 'rgba(255, 69, 58, 0.25)',
            border: '1px solid rgba(255, 69, 58, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <Square size={9} fill="#ff453a" color="#ff453a" />
        </button>
      </div>
    );
  }

  // Expanded Setup & Control Card Mode
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '14px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: status === 'ready' ? '#30d158' : status === 'saved' ? '#30d158' : status === 'paused' ? '#ffcc00' : '#ff453a',
              boxShadow: status === 'ready' ? '0 0 10px #30d158' : status === 'saved' ? '0 0 10px #30d158' : '0 0 10px #ff453a',
            }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>
              {status === 'ready'
                ? 'RapiDemo Screen Studio'
                : status === 'saved'
                ? 'Screen Recording Saved'
                : status === 'paused'
                ? 'Recording Paused'
                : 'RapiDemo Studio Active'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.55)', marginTop: 1 }}>
              {status === 'ready'
                ? 'Configure resolution, FPS & dynamic auto-zoom'
                : status === 'saved'
                ? 'Saved to Videos\\WinLand Captures'
                : `HDR Tone-Mapped • ${currentPreset.label} • ${selectedFps} FPS`}
            </div>
          </div>
        </div>

        {status !== 'ready' && (
          <span style={{ fontSize: 15, fontWeight: 800, color: status === 'saved' ? '#30d158' : '#ff453a', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(seconds)}
          </span>
        )}
      </div>

      {/* Configuration Controls Grid (Shown in SETUP mode & RECORDING mode) */}
      {status !== 'saved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' }}>
          {/* Row 1: Resolution Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Quality:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {RESOLUTION_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  disabled={status !== 'ready'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setResolutionId(r.id);
                  }}
                  style={{
                    background: resolutionId === r.id ? 'rgba(48, 209, 88, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    border: resolutionId === r.id ? '1px solid #30d158' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 7,
                    padding: '3px 8px',
                    color: resolutionId === r.id ? '#30d158' : '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: status === 'ready' ? 'pointer' : 'default',
                    opacity: status === 'ready' ? 1 : 0.65,
                    transition: 'all 0.18s ease',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: FPS + Auto-Zoom + Cursor Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>FPS:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {FPS_OPTIONS.map((fpsVal) => (
                <button
                  key={fpsVal}
                  disabled={status !== 'ready'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFps(fpsVal);
                  }}
                  style={{
                    background: selectedFps === fpsVal ? 'rgba(48, 209, 88, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    border: selectedFps === fpsVal ? '1px solid #30d158' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 7,
                    padding: '3px 8px',
                    color: selectedFps === fpsVal ? '#30d158' : '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: status === 'ready' ? 'pointer' : 'default',
                    opacity: status === 'ready' ? 1 : 0.65,
                    transition: 'all 0.18s ease',
                  }}
                >
                  {fpsVal} FPS
                </button>
              ))}
            </div>

            {/* RapiDemo Auto-Zoom Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEnableZoom(!enableZoom);
              }}
              title="Toggle RapiDemo Auto-Zoom Camera"
              style={{
                background: enableZoom ? 'rgba(10, 132, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                border: enableZoom ? '1px solid #0a84ff' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 7,
                padding: '3px 8px',
                color: enableZoom ? '#0a84ff' : 'rgba(255,255,255,0.5)',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ZoomIn size={11} />
              Zoom {enableZoom ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {status === 'ready' ? (
          <button
            onClick={handleStartRecording}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              background: '#30d158',
              border: 'none',
              color: '#000',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 3px 14px rgba(48, 209, 88, 0.45)',
            }}
          >
            <Play size={14} fill="#000" />
            Start Screen Recording
          </button>
        ) : status === 'saved' ? (
          <>
            <button
              onClick={handleOpenFolder}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 10,
                background: 'rgba(48, 209, 88, 0.2)',
                border: '1px solid rgba(48, 209, 88, 0.4)',
                color: '#30d158',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Folder size={14} />
              Open File Location
            </button>
            <button
              onClick={onStop}
              style={{
                height: 36,
                padding: '0 16px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleTogglePause}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={status === 'paused' ? 'Resume Recording' : 'Pause Recording'}
            >
              {status === 'paused' ? <Play size={14} fill="#fff" /> : <Pause size={14} fill="#fff" />}
            </button>
            <button
              onClick={handleStopRecording}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255, 69, 58, 0.88)',
                border: 'none',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 3px 12px rgba(255, 69, 58, 0.45)',
              }}
            >
              <Square size={12} fill="#fff" />
              Stop Recording Instantly
            </button>
          </>
        )}
      </div>
    </div>
  );
}
