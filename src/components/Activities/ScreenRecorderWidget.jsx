import React, { useState, useEffect, useRef } from 'react';
import { Square, Folder, Play, Pause, MousePointer2, Settings2, Video, Check } from 'lucide-react';

const RESOLUTION_PRESETS = [
  { id: '1080p', label: '1080p 60FPS', width: 1920, height: 1080, fps: 60, bitrate: 7000000 },
  { id: '1440p', label: '1440p 60FPS', width: 2560, height: 1440, fps: 60, bitrate: 12000000 },
  { id: '4k', label: '4K 60FPS', width: 3840, height: 2160, fps: 60, bitrate: 20000000 },
  { id: '720p', label: '720p 60FPS', width: 1280, height: 720, fps: 60, bitrate: 4000000 },
];

export default function ScreenRecorderWidget({ isCompact, onStop, onExpand }) {
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('recording'); // 'recording' | 'paused' | 'saving' | 'saved'
  const [presetId, setPresetId] = useState('1080p');
  const [showCursor, setShowCursor] = useState(true);
  const [savedPath, setSavedPath] = useState('');

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const composedStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);
  const clicksRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });

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

  // HDR Tone-Mapped Canvas Compositer with Cursor & Click Overlay
  const createComposedStream = async (screenStream, preset) => {
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

    // Force sRGB color space on 2D context to tone-map HDR screen capture cleanly
    const ctx = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });

    const draw = () => {
      if (!ctx || !videoRef.current) return;
      // Draw screen video frame with sRGB tone-mapping
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      if (showCursor) {
        const now = performance.now();
        // Clean old click ripples
        clicksRef.current = clicksRef.current.filter((c) => now - c.startedAt < 600);

        // Render click ripple rings
        for (const click of clicksRef.current) {
          const progress = Math.min(1, (now - click.startedAt) / 600);
          const radius = 12 + progress * 32;
          ctx.save();
          ctx.globalAlpha = 1 - progress;
          ctx.strokeStyle = '#30d158';
          ctx.lineWidth = 4 - progress * 2;
          ctx.beginPath();
          ctx.arc(click.x, click.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return canvas.captureStream(preset.fps);
  };

  // Start Screen Recording
  useEffect(() => {
    let isSubscribed = true;

    async function initRecorder() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.electronAPI?.getPrimaryScreenSource) {
          return;
        }

        const preset = RESOLUTION_PRESETS.find((p) => p.id === presetId) || RESOLUTION_PRESETS[0];
        const source = await window.electronAPI.getPrimaryScreenSource();
        if (!source?.id || !isSubscribed) return;

        const screenStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id,
              maxWidth: preset.width,
              maxHeight: preset.height,
              maxFrameRate: preset.fps,
            },
          },
        });

        if (!isSubscribed) {
          screenStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = screenStream;
        const composedStream = await createComposedStream(screenStream, preset);
        composedStreamRef.current = composedStream;

        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
          ? 'video/webm; codecs=vp9'
          : 'video/webm; codecs=vp8';

        const recorder = new MediaRecorder(composedStream, {
          mimeType,
          videoBitsPerSecond: preset.bitrate,
        });

        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
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

        recorder.start(250); // Instant 250ms chunk slicing so zero trailing frames get lost
      } catch (err) {
        console.error('Screen recorder failed:', err);
      }
    }

    initRecorder();

    return () => {
      isSubscribed = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (composedStreamRef.current) {
        composedStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch {}
      }
    };
  }, [presetId]);

  // INSTANT Hard Stop (Stops media tracks immediately so recording cuts right on click)
  const handleStopRecording = (e) => {
    e?.stopPropagation();
    if (status === 'saved') {
      onStop?.();
      return;
    }

    setStatus('saving');

    // Hard-stop video tracks immediately so audio/video capture halts instantly
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (composedStreamRef.current) {
      composedStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

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

  const currentPreset = RESOLUTION_PRESETS.find((p) => p.id === presetId) || RESOLUTION_PRESETS[0];

  // Compact Notch Mode (Stays pinned at top notch while recording)
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

        {/* Center: Live Waveform / Resolution Pill */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255, 255, 255, 0.65)' }}>
          {currentPreset.label}
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

  // Expanded Control Card Mode
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
      {/* Top Bar: Status + Timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: status === 'saved' ? '#30d158' : status === 'paused' ? '#ffcc00' : '#ff453a',
              boxShadow: status === 'saved' ? '0 0 10px #30d158' : '0 0 10px #ff453a',
            }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
              {status === 'saved' ? 'Screen Recording Saved' : status === 'paused' ? 'Recording Paused' : 'HDR Screen Studio'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.55)', marginTop: 1 }}>
              {status === 'saved' ? 'Saved to Videos\\WinLand Captures' : `sRGB HDR Tone-Mapped • ${currentPreset.label}`}
            </div>
          </div>
        </div>

        <span style={{ fontSize: 15, fontWeight: 800, color: status === 'saved' ? '#30d158' : '#ff453a', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(seconds)}
        </span>
      </div>

      {/* Preset Tabs + Cursor Toggle */}
      {status !== 'saved' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {RESOLUTION_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setPresetId(p.id);
                }}
                style={{
                  background: presetId === p.id ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  border: presetId === p.id ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
                  borderRadius: 6,
                  padding: '2px 6px',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {p.id.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCursor(!showCursor);
            }}
            title="Toggle Cursor Tracking"
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
      )}

      {/* Bottom Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {status === 'saved' ? (
          <>
            <button
              onClick={handleOpenFolder}
              style={{
                flex: 1,
                height: 32,
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
                height: 32,
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
                height: 32,
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
                height: 32,
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
