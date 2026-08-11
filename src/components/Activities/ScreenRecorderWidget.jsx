import React, { useState, useEffect, useRef } from 'react';
import { Square, Folder, Play, Pause, MousePointer2, Settings2, Video, Check, CircleDot } from 'lucide-react';

const RESOLUTION_OPTIONS = [
  { id: '720p', label: '720p', width: 1280, height: 720, defaultBitrate: 5000000 },
  { id: '1080p', label: '1080p', width: 1920, height: 1080, defaultBitrate: 9000000 },
  { id: '1440p', label: '1440p', width: 2560, height: 1440, defaultBitrate: 15000000 },
  { id: '4k', label: '4K', width: 3840, height: 2160, defaultBitrate: 25000000 },
];

const FPS_OPTIONS = [30, 60, 120];

export default function ScreenRecorderWidget({ isCompact, onStop, onExpand }) {
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('ready'); // 'ready' | 'recording' | 'paused' | 'saving' | 'saved'
  const [resolutionId, setResolutionId] = useState('1080p');
  const [selectedFps, setSelectedFps] = useState(60);
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

  // HDR sRGB Tone-Mapped Canvas Compositer with Smooth RapiDemo Cursor Tracking
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

    // Force sRGB color space context to tone-map HDR screen capture without washed-out gray colors
    const ctx = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const bounds = source.bounds || { x: 0, y: 0, width: preset.width, height: preset.height };

    const draw = () => {
      if (!ctx || !videoRef.current) return;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      if (showCursor) {
        // Smooth RapiDemo spring interpolation for 60fps/120fps mouse movement
        const current = mousePosRef.current;
        const target = mouseTargetRef.current;
        current.x += (target.x - current.x) * 0.35;
        current.y += (target.y - current.y) * 0.35;

        const cursorX = ((current.x - bounds.x) / bounds.width) * canvas.width;
        const cursorY = ((current.y - bounds.y) / bounds.height) * canvas.height;

        const now = performance.now();
        clicksRef.current = clicksRef.current.filter((c) => now - c.startedAt < 650);

        // Render click ripple rings
        for (const click of clicksRef.current) {
          const progress = Math.min(1, (now - click.startedAt) / 650);
          const radius = 10 + progress * 35;
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

      const preset = RESOLUTION_OPTIONS.find((p) => p.id === resolutionId) || RESOLUTION_OPTIONS[1];
      const source = await window.electronAPI.getPrimaryScreenSource();
      if (!source?.id) return;

      // Start global RapiDemo mouse listener
      if (showCursor) {
        mouseCleanupRef.current = window.electronAPI?.onScreenRecMouseUpdate?.((data) => {
          if (!data) return;
          mouseTargetRef.current = { x: data.x, y: data.y };
          if (data.eventType === 'down') {
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
      }

      const screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
            maxWidth: preset.width,
            maxHeight: preset.height,
            maxFrameRate: selectedFps,
          },
        },
      });

      streamRef.current = screenStream;
      const composedStream = await createComposedStream(screenStream, source, preset, selectedFps);
      composedStreamRef.current = composedStream;

      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm; codecs=vp8';

      const recorder = new MediaRecorder(composedStream, {
        mimeType,
        videoBitsPerSecond: preset.defaultBitrate,
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

  const currentPreset = RESOLUTION_OPTIONS.find((p) => p.id === resolutionId) || RESOLUTION_OPTIONS[1];

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
          padding: '0 8px',
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
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255, 255, 255, 0.65)' }}>
          {currentPreset.label} • {selectedFps}FPS
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
        padding: '12px 14px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: status === 'ready' ? '#0a84ff' : status === 'saved' ? '#30d158' : status === 'paused' ? '#ffcc00' : '#ff453a',
              boxShadow: status === 'ready' ? '0 0 10px #0a84ff' : status === 'saved' ? '0 0 10px #30d158' : '0 0 10px #ff453a',
            }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
              {status === 'ready'
                ? 'Screen Studio Setup'
                : status === 'saved'
                ? 'Screen Recording Saved'
                : status === 'paused'
                ? 'Recording Paused'
                : 'HDR Screen Studio Active'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.55)', marginTop: 1 }}>
              {status === 'ready'
                ? 'Configure resolution, FPS & RapiDemo cursor'
                : status === 'saved'
                ? 'Saved to Videos\\WinLand Captures'
                : `sRGB Tone-Mapped • ${currentPreset.label} • ${selectedFps} FPS`}
            </div>
          </div>
        </div>

        {status !== 'ready' && (
          <span style={{ fontSize: 15, fontWeight: 800, color: status === 'saved' ? '#30d158' : '#ff453a', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(seconds)}
          </span>
        )}
      </div>

      {/* Configuration Controls (Shown in SETUP mode & RECORDING mode) */}
      {status !== 'saved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' }}>
          {/* Row 1: Resolution Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Quality:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {RESOLUTION_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  disabled={status !== 'ready'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setResolutionId(r.id);
                  }}
                  style={{
                    background: resolutionId === r.id ? 'rgba(10, 132, 255, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                    border: resolutionId === r.id ? '1px solid #0a84ff' : '1px solid transparent',
                    borderRadius: 6,
                    padding: '2px 6px',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: status === 'ready' ? 'pointer' : 'default',
                    opacity: status === 'ready' ? 1 : 0.6,
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: FPS + Cursor Tracking Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>FPS:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {FPS_OPTIONS.map((fpsVal) => (
                <button
                  key={fpsVal}
                  disabled={status !== 'ready'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFps(fpsVal);
                  }}
                  style={{
                    background: selectedFps === fpsVal ? 'rgba(10, 132, 255, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                    border: selectedFps === fpsVal ? '1px solid #0a84ff' : '1px solid transparent',
                    borderRadius: 6,
                    padding: '2px 8px',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: status === 'ready' ? 'pointer' : 'default',
                    opacity: status === 'ready' ? 1 : 0.6,
                  }}
                >
                  {fpsVal} FPS
                </button>
              ))}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCursor(!showCursor);
              }}
              title="Toggle RapiDemo Cursor & Click Overlay"
              style={{
                background: showCursor ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: showCursor ? '1px solid rgba(48, 209, 88, 0.4)' : '1px solid transparent',
                borderRadius: 6,
                padding: '2px 8px',
                color: showCursor ? '#30d158' : 'rgba(255,255,255,0.5)',
                fontSize: 9,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MousePointer2 size={10} />
              Cursor {showCursor ? 'ON' : 'OFF'}
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
              height: 34,
              borderRadius: 9,
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
              boxShadow: '0 2px 12px rgba(48, 209, 88, 0.45)',
            }}
          >
            <Play size={13} fill="#000" />
            Start Recording Screen
          </button>
        ) : status === 'saved' ? (
          <>
            <button
              onClick={handleOpenFolder}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 9,
                background: 'rgba(48, 209, 88, 0.2)',
                border: '1px solid rgba(48, 209, 88, 0.4)',
                color: '#30d158',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Folder size={13} />
              Open File Location
            </button>
            <button
              onClick={onStop}
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 9,
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
                width: 34,
                height: 34,
                borderRadius: 9,
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
              {status === 'paused' ? <Play size={13} fill="#fff" /> : <Pause size={13} fill="#fff" />}
            </button>
            <button
              onClick={handleStopRecording}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 9,
                background: 'rgba(255, 69, 58, 0.85)',
                border: 'none',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 2px 10px rgba(255, 69, 58, 0.4)',
              }}
            >
              <Square size={11} fill="#fff" />
              Stop Recording Instantly
            </button>
          </>
        )}
      </div>
    </div>
  );
}
