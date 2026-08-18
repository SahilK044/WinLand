import React, { useState, useEffect, useRef } from 'react';
import { Square, Play, Pause, ZoomIn, Minimize2 } from 'lucide-react';
import { createSmartCamera } from './smartCamera';
import { createSmartFocusEngine } from './smartFocusEngine';

// Set to true locally when debugging the capture pipeline. Left off by default
// so recording sessions don't spam the renderer console (each console-message
// gets piped through IPC to winland_renderer.log in electron.js).
const REC_DEBUG = false;
const dbg = (...args) => { if (REC_DEBUG) console.log(...args); };
const dbgWarn = (...args) => { if (REC_DEBUG) console.warn(...args); };
const dbgErr = (...args) => { if (REC_DEBUG) console.error(...args); };

const RESOLUTION_OPTIONS = [
  { id: '1080p', label: '1080p', width: 1920, height: 1080, bitrate: 20000000 },
  { id: '1440p', label: '1440p', width: 2560, height: 1440, bitrate: 32000000 },
  { id: '4k', label: '4K', width: 3840, height: 2160, bitrate: 50000000 },
];

const FPS_OPTIONS = [30, 60, 90, 120];

const getStableCaptureFps = (requestedFps) => {
  return Math.max(30, Math.min(120, Number(requestedFps) || 60));
};

const ScreenRecorderWidget = React.memo(function ScreenRecorderWidget({ isCompact, onStop, onExpand, onMinimize }) {
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('ready'); // 'ready' | 'starting' | 'recording' | 'paused' | 'saving' | 'error'
  const [resolutionId, setResolutionId] = useState('1080p');
  const [selectedFps, setSelectedFps] = useState(60);
  const [recordingMode, setRecordingMode] = useState('normal');

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const composedStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const drawIntervalRef = useRef(null);
  const mouseCleanupRef = useRef(null);

  const smartCameraRef = useRef(null);
  const smartFocusRef = useRef(null);

  const errorTimerRef = useRef(null);

  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Keyboard listener for P (pan-out) and Z (zoom-in) during recording via IPC & DOM
  useEffect(() => {
    if (status !== 'recording' && status !== 'paused') return undefined;

    const handleKeyStr = (keyStr) => {
      const k = keyStr.toLowerCase();
      if (k === 'p') {
        smartCameraRef.current?.handleOverride('pan-out');
      } else if (k === 'z') {
        smartCameraRef.current?.handleOverride('zoom-in');
      }
    };

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      handleKeyStr(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    const hotkeyCleanup = window.electronAPI?.onScreenRecHotkey?.((key) => {
      handleKeyStr(key);
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof hotkeyCleanup === 'function') hotkeyCleanup();
    };
  }, [status]);

  // Live Timer Tick
  useEffect(() => {
    if (status !== 'recording') return undefined;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (composedStreamRef.current) {
        composedStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
      mouseCleanupRef.current?.();
      window.electronAPI?.stopScreenRecMouseTracking?.();
      window.electronAPI?.stopScreenRecHotkeys?.();
      stopDrawLoop();
      if (smartFocusRef.current) {
        smartFocusRef.current.destroy();
        smartFocusRef.current = null;
      }
    };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const stopDrawLoop = () => {
    const loop = drawIntervalRef.current;
    if (!loop) return;
    if (typeof loop.stop === 'function') {
      loop.stop();
    } else if (loop.type === 'raf') {
      cancelAnimationFrame(loop.id);
    } else if (loop.type === 'interval') {
      clearInterval(loop.id);
    } else {
      clearInterval(loop);
    }
    drawIntervalRef.current = null;
  };

  const getPreferredMimeType = () => {
    // Prioritize hardware-accelerated H.264 / AVC1 for silky 60/120fps recording with zero CPU stutter.
    const mimeTypes = [
      'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      'video/mp4; codecs=avc1',
      'video/mp4',
      'video/webm; codecs="h264, opus"',
      'video/webm; codecs=h264',
      'video/webm; codecs="vp8, opus"',
      'video/webm; codecs=vp8',
      'video/webm; codecs="vp9, opus"',
      'video/webm; codecs=vp9',
      'video/webm',
    ];
    return mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  };

  const HIGH_QUALITY_AUDIO_CONSTRAINTS = {
    echoCancellation: false,
    autoGainControl: false,
    noiseSuppression: false,
    channelCount: { ideal: 2 },
    sampleRate: { ideal: 48000 },
    suppressLocalAudioPlayback: false,
  };

  const createDesktopStream = async (source, targetFps, preset) => {
    const videoConstraints = {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source?.id,
        minFrameRate: Math.min(30, targetFps),
        maxFrameRate: targetFps,
        minWidth: preset.width,
        maxWidth: preset.width,
        minHeight: preset.height,
        maxHeight: preset.height,
      },
    };

    const audioConstraints = {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source?.id,
      },
      optional: [
        { echoCancellation: false },
        { autoGainControl: false },
        { noiseSuppression: false },
        { googEchoCancellation: false },
        { googAutoGainControl: false },
        { googNoiseSuppression: false },
        { googHighpassFilter: false },
      ],
    };

    if (source?.id) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints,
        });
        dbg('[REC_DEBUG] getUserMedia success with stereo loopback audio');
        return stream;
      } catch (errAudioVideo) {
        dbgWarn('[REC_DEBUG] getUserMedia with audio failed, falling back to video only:', errAudioVideo);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: videoConstraints,
          });
          return stream;
        } catch (errVideoOnly) {
          dbgWarn('[REC_DEBUG] getUserMedia fallback failed, trying getDisplayMedia:', errVideoOnly);
        }
      }
    }

    if (navigator.mediaDevices?.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: preset.width, min: preset.width, max: preset.width },
            height: { ideal: preset.height, min: preset.height, max: preset.height },
            frameRate: { ideal: targetFps, max: targetFps },
          },
          audio: HIGH_QUALITY_AUDIO_CONSTRAINTS,
        });
        dbg('[REC_DEBUG] getDisplayMedia fallback success! audio tracks:', stream.getAudioTracks().length);
        return stream;
      } catch (errDisplay) {
        dbgWarn('[REC_DEBUG] getDisplayMedia with audio failed:', errDisplay);
        throw errDisplay;
      }
    }

    throw new Error('No desktop capture method available');
  };


  const createComposedStream = async (screenStream, source, preset, targetFps, _mode) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = screenStream;
    await new Promise((resolve) => {
      let resolved = false;
      let fallbackTimer;

      video.onloadedmetadata = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(fallbackTimer);
          video.play().then(resolve).catch(resolve);
        }
      };

      if (video.readyState >= 2) {
        if (!resolved) {
          resolved = true;
          clearTimeout(fallbackTimer);
          video.play().then(resolve).catch(resolve);
        }
      } else {
        fallbackTimer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }, 400);
      }
    });
    videoRef.current = video;

    const canvas = document.createElement('canvas');
    canvas.width = preset.width;
    canvas.height = preset.height;
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) { throw new Error('Canvas 2D context not available'); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';

    const bounds = source?.bounds || { x: 0, y: 0, width: preset.width, height: preset.height };

    // Create the intelligence engine + camera controller for Smart Focus
    const engine = createSmartFocusEngine();
    engine.setBounds(bounds);
    smartFocusRef.current = engine;

    const camera = createSmartCamera();
    smartCameraRef.current = camera;
    camera.updateBounds(bounds, { width: preset.width, height: preset.height });

    const ENGINE_TICK_MS = 50;
    let lastEngineTick = 0;

    const cW = canvas.width;
    const cH = canvas.height;

    const draw = () => {
      if (!ctx || !videoRef.current) return;
      
      const now = performance.now();

      if (now - lastEngineTick >= ENGINE_TICK_MS) {
        const decision = engine.update(now);
        camera.setDecision(decision);
        lastEngineTick = now;
      }
      const camState = camera.update(now);

      if (camState.zoom > 1.005) {
        const viewW = cW / camState.zoom;
        const viewH = cH / camState.zoom;
        const srcX = Math.max(0, Math.min(camState.x - viewW / 2, cW - viewW));
        const srcY = Math.max(0, Math.min(camState.y - viewH / 2, cH - viewH));
        ctx.drawImage(videoRef.current, srcX, srcY, viewW, viewH, 0, 0, cW, cH);
      } else {
        ctx.drawImage(videoRef.current, 0, 0, cW, cH);
      }
    };

    draw();

    // Use captureStream(0) and drive frame production directly via requestVideoFrameCallback
    const composedStream = canvas.captureStream(0);
    const [canvasTrack] = composedStream.getVideoTracks();
    screenStream.getAudioTracks().forEach((track) => composedStream.addTrack(track));

    const requestCanvasFrame = () => {
      try { canvasTrack?.requestFrame?.(); } catch {}
    };
    requestCanvasFrame();

    let isRunning = true;
    let rafHandle = null;
    let lastDrawTime = performance.now();
    const frameInterval = 1000 / targetFps;

    const onFrame = () => {
      if (!isRunning) return;
      
      if (statusRef.current === 'paused') {
        rafHandle = requestAnimationFrame(onFrame);
        return;
      }
      
      if (statusRef.current === 'saving' || statusRef.current === 'saved') {
        isRunning = false;
        return;
      }

      const now = performance.now();
      // 1ms tolerance for rAF timing jitter
      if (now - lastDrawTime >= frameInterval - 1) {
        draw();
        requestCanvasFrame();
        lastDrawTime = now;
      }
      
      rafHandle = requestAnimationFrame(onFrame);
    };

    rafHandle = requestAnimationFrame(onFrame);

    drawIntervalRef.current = {
      stop: () => {
        isRunning = false;
        if (rafHandle !== null) cancelAnimationFrame(rafHandle);
      }
    };

    return composedStream;
  };

  // Start Recording Action
  const handleStartRecording = async (e) => {
    e?.stopPropagation();
    dbg('[REC_DEBUG] handleStartRecording clicked');
    
    statusRef.current = 'starting';
    setStatus('starting');

    try {
      const preset = RESOLUTION_OPTIONS.find((p) => p.id === resolutionId) || RESOLUTION_OPTIONS[0];
      const captureFps = getStableCaptureFps(selectedFps);
      dbg('[REC_DEBUG] preset:', preset, 'fps:', captureFps);

      const source = await window.electronAPI?.getPrimaryScreenSource?.();
      dbg('[REC_DEBUG] primaryScreenSource:', source);

      let screenStream = null;

      if (source && source.id) {
        try {
          dbg('[REC_DEBUG] calling getUserMedia for source.id:', source.id);
          screenStream = await createDesktopStream(source, captureFps, preset);
          dbg('[REC_DEBUG] getUserMedia SUCCESS stream:', screenStream?.id);
        } catch (err) {
          dbgErr('[REC_DEBUG] getUserMedia FAILED:', err);
        }
      }

      if (!screenStream && navigator.mediaDevices?.getDisplayMedia) {
        try {
          dbg('[REC_DEBUG] calling getDisplayMedia');
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: preset.width, max: preset.width },
              height: { ideal: preset.height, max: preset.height },
              frameRate: { ideal: captureFps, max: captureFps },
            },
            audio: HIGH_QUALITY_AUDIO_CONSTRAINTS,
          });
          dbg('[REC_DEBUG] getDisplayMedia SUCCESS stream:', screenStream?.id);
        } catch (err) {
          dbgErr('[REC_DEBUG] getDisplayMedia FAILED:', err);
        }
      }

      if (!screenStream || screenStream.getVideoTracks().length === 0) {
        dbgErr('[REC_DEBUG] Captured screen stream has no video tracks! Aborting.');
        if (screenStream) screenStream.getTracks().forEach(t => t.stop());
        setStatus('ready');
        return;
      }

      streamRef.current = screenStream;
      let recordingStream = screenStream;
      
      if (recordingMode === 'smart') {
        mouseCleanupRef.current = window.electronAPI?.onScreenRecMouseUpdate?.((data) => {
          if (!data || !smartFocusRef.current) return;
          const now = performance.now();
          if (data.eventType === 'down') {
            smartFocusRef.current.handlePointerEvent({ t: now, globalX: data.x, globalY: data.y, type: 'down', button: data.button ?? 0 });
          } else if (data.eventType === 'up') {
            smartFocusRef.current.handlePointerEvent({ t: now, globalX: data.x, globalY: data.y, type: 'up', button: data.button ?? 0 });
          } else {
            smartFocusRef.current.handlePointerEvent({ t: now, globalX: data.x, globalY: data.y, type: 'move', button: null });
          }
        });
        window.electronAPI?.startScreenRecMouseTracking?.();
        window.electronAPI?.startScreenRecHotkeys?.();

        try {
          dbg(`[REC_DEBUG] creating composed stream (mode: ${recordingMode})`);
          recordingStream = await createComposedStream(screenStream, source, preset, captureFps, recordingMode);
          
          if (statusRef.current !== 'starting') {
            dbgWarn('[REC_DEBUG] Recording cancelled during stream composition');
            if (recordingStream) recordingStream.getTracks().forEach(t => t.stop());
            if (screenStream) screenStream.getTracks().forEach(t => t.stop());
            if (videoRef.current) {
              videoRef.current.srcObject = null;
              videoRef.current.pause();
            }
            return;
          }
        } catch (streamErr) {
          dbgWarn('[REC_DEBUG] createComposedStream failed, aborting:', streamErr);
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.pause();
            videoRef.current = null;
          }
          stopDrawLoop();
          throw streamErr;
        }
      } else {
        // Normal recording: zero canvas overhead, direct hardware DXGI stream
        recordingStream = screenStream;
      }
      recordingStream.getVideoTracks().forEach((track) => {
        try { track.contentHint = 'motion'; } catch {}
      });
      composedStreamRef.current = recordingStream;

      const supportedType = getPreferredMimeType();
      dbg('[REC_DEBUG] supportedType:', supportedType);
      dbg('[REC_DEBUG] audio tracks:', recordingStream.getAudioTracks().map((track) => track.label || track.kind));

      let recorder;
      try {
        const recorderFps = getStableCaptureFps(selectedFps);
        const fpsScale = Math.max(1, recorderFps / 60);
        recorder = new MediaRecorder(recordingStream, {
          mimeType: supportedType,
          videoBitsPerSecond: Math.min(Math.round(preset.bitrate * fpsScale), 80000000),
          audioBitsPerSecond: recordingStream.getAudioTracks().length > 0 ? 320000 : undefined,
        });
      } catch (errRec) {
        dbgWarn('[REC_DEBUG] MediaRecorder 1 failed:', errRec);
        try {
          recorder = new MediaRecorder(recordingStream, { mimeType: 'video/webm' });
        } catch (errRec2) {
          dbgWarn('[REC_DEBUG] MediaRecorder 2 failed:', errRec2);
          recorder = new MediaRecorder(recordingStream);
        }
      }

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        dbg('[REC_DEBUG] recorder.onstop fired! chunks length:', chunksRef.current.length);
        
        mouseCleanupRef.current?.();
        window.electronAPI?.stopScreenRecMouseTracking?.();
        window.electronAPI?.stopScreenRecHotkeys?.();

        const finalMime = recorder.mimeType || supportedType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        chunksRef.current = [];

        if (streamRef.current) {
          try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
          streamRef.current = null;
        }
        if (composedStreamRef.current) {
          try { composedStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
          composedStreamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.pause();
          if (videoRef.current.parentNode) {
            videoRef.current.parentNode.removeChild(videoRef.current);
          }
        }
        stopDrawLoop();
        if (smartFocusRef.current) {
          smartFocusRef.current.destroy();
          smartFocusRef.current = null;
        }

        let saveError = false;
        if (blob.size > 0 && window.electronAPI?.saveScreenRecording) {
          const buffer = await blob.arrayBuffer();
          const res = await window.electronAPI.saveScreenRecording({
            buffer,
            mimeType: blob.type,
            fps: getStableCaptureFps(selectedFps),
            width: preset.width,
            height: preset.height,
          });
          if (res?.ok && res?.filePath) {
            window.electronAPI?.openFileLocation?.(res.filePath);
          } else {
            console.error('Screen recording save failed:', res?.error);
            saveError = true;
          }
        } else {
          if (blob.size === 0) {
            console.error('Screen recording produced an empty file.');
            saveError = true;
          }
        }
        // Show brief error indicator then auto-dismiss, or dismiss immediately on success
        if (saveError) {
          setStatus('error');
          errorTimerRef.current = setTimeout(() => { setStatus('ready'); onStop?.(); }, 3000);
        } else {
          setStatus('ready');
          onStop?.();
        }
      };

      recorder.start(250);
      dbg('[REC_DEBUG] recorder.start(250) SUCCESS! status -> recording');

      setSeconds(0);
      setStatus('recording');

      onMinimize?.();
    } catch (err) {
      dbgErr('[REC_DEBUG] FATAL handleStartRecording ERROR:', err);
      streamRef.current?.getTracks().forEach(t => t.stop());
      composedStreamRef.current?.getTracks().forEach(t => t.stop());
      stopDrawLoop();
      
      mouseCleanupRef.current?.();
      window.electronAPI?.stopScreenRecMouseTracking?.();
      window.electronAPI?.stopScreenRecHotkeys?.();
      
      if (smartFocusRef.current) {
        smartFocusRef.current.destroy();
        smartFocusRef.current = null;
      }
      
      setStatus('error');
      errorTimerRef.current = setTimeout(() => setStatus('ready'), 3000);
    }
  };

  // INSTANT Hard Stop Action
  const handleStopRecording = async (e) => {
    e?.stopPropagation();
    if (statusRef.current === 'saving') return;
    statusRef.current = 'saving';

    setStatus('saving');

    mouseCleanupRef.current?.();
    window.electronAPI?.stopScreenRecMouseTracking?.();
    window.electronAPI?.stopScreenRecHotkeys?.();

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.requestData(); } catch {}
      recorder.stop();
    } else {
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
        streamRef.current = null;
      }
      // The composed canvas stream held its own video track — stopping only
      // streamRef leaked the canvas capture pipeline (draw loop kept running).
      if (composedStreamRef.current) {
        try { composedStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
        composedStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current);
        }
        videoRef.current = null;
      }
      stopDrawLoop();
      if (smartFocusRef.current) {
        smartFocusRef.current.destroy();
        smartFocusRef.current = null;
      }
      setStatus('ready');
      onStop?.();
    }
  };

  // Pause / Resume Toggle
  const handleTogglePause = (e) => {
    e?.stopPropagation();
    e?.preventDefault();
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      dbgWarn('[REC_DEBUG] handleTogglePause: no recorder available');
      return;
    }

    try {
      if (recorder.state === 'recording') {
        recorder.pause();
        setStatus('paused');
      } else if (recorder.state === 'paused') {
        recorder.resume();
        setStatus('recording');
      }
    } catch (err) {
      dbgErr('[REC_DEBUG] handleTogglePause error:', err);
    }
  };

  const currentPreset = RESOLUTION_OPTIONS.find((p) => p.id === resolutionId) || RESOLUTION_OPTIONS[0];

  // ── Compact Pill ──
  if (isCompact) {
    return (
      <div
        onClick={onExpand}
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px', boxSizing: 'border-box',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: status === 'paused' ? '#f59e0b' : '#ff453a',
            boxShadow: status === 'paused'
              ? '0 0 6px rgba(245,158,11,0.6)'
              : '0 0 8px rgba(255,69,58,0.5)',
            animation: status === 'recording' ? 'pulse 1.2s infinite ease-in-out' : 'none',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#fff',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em',
          }}>
            {status === 'paused' ? 'PAUSED' : formatTime(seconds)}
          </span>
        </div>

        <div
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleTogglePause}
            style={{
              width: 22, height: 22, borderRadius: 6, border: 'none',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          >
            {status === 'paused'
              ? <Play size={9} color="#f59e0b" fill="#f59e0b" />
              : <Pause size={9} color="#fff" fill="#fff" />}
          </button>
          <button
            onClick={handleStopRecording}
            style={{
              width: 22, height: 22, borderRadius: 6, border: 'none',
              background: 'rgba(255,69,58,0.15)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = 'rgba(255,69,58,0.28)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,69,58,0.15)'; }}
          >
            <Square size={8} color="#ff453a" fill="#ff453a" />
          </button>
        </div>
      </div>
    );
  }

  // ── Expanded ──
  const seg = (active) => ({
    flex: 1, border: 'none', borderRadius: 7,
    padding: '5px 6px', textAlign: 'center',
    fontSize: 10.5, fontWeight: active ? 650 : 550,
    whiteSpace: 'nowrap',
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
  });

  const segRow = {
    display: 'flex', gap: 2, padding: 3,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '13px 15px 11px', boxSizing: 'border-box', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
            {status === 'ready' ? 'Screen Studio'
              : status === 'starting' ? 'Starting…'
              : status === 'saving' ? 'Saving…'
              : status === 'paused' ? 'Paused'
              : status === 'error' ? 'Recording Failed'
              : 'Recording'}
          </div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.38)', marginTop: 1.5, fontWeight: 500 }}>
            {`${currentPreset.label} · ${selectedFps} FPS · ${recordingMode === 'smart' ? 'Smart Focus' : 'Normal'}`}
          </div>
        </div>

        {(status === 'recording' || status === 'paused' || status === 'saving') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              fontSize: 20, fontWeight: 800, letterSpacing: '-0.8px',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              color: status === 'paused' ? '#f59e0b'
                : status === 'saving' ? 'rgba(255,255,255,0.3)'
                : '#ff453a',
            }}>
              {formatTime(seconds)}
            </span>
            {(status === 'recording' || status === 'paused') && (
              <button
                onClick={(e) => { e.stopPropagation(); onMinimize?.(); }}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none',
                  borderRadius: 6, padding: '4px 5px', color: 'rgba(255,255,255,0.35)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  transition: 'all 0.15s ease', fontSize: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
              >
                <Minimize2 size={11} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      {status === 'ready' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, justifyContent: 'center' }}>
          {/* Resolution + FPS */}
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ ...segRow, flex: '1 1 45%', minWidth: 155 }}>
              {RESOLUTION_OPTIONS.map((r) => (
                <button key={r.id} onClick={(e) => { e.stopPropagation(); setResolutionId(r.id); }}
                  style={seg(resolutionId === r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
            <div style={{ ...segRow, flex: '1.2 1 55%', minWidth: 185 }}>
              {FPS_OPTIONS.map((fps) => (
                <button key={fps} onClick={(e) => { e.stopPropagation(); setSelectedFps(fps); }}
                  style={seg(selectedFps === fps)}>
                  {fps}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div style={segRow}>
            <button onClick={(e) => { e.stopPropagation(); setRecordingMode('normal'); }}
              style={{ ...seg(recordingMode === 'normal'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              Normal
            </button>
            <button onClick={(e) => { e.stopPropagation(); setRecordingMode('smart'); }}
              style={{ ...seg(recordingMode === 'smart'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <ZoomIn size={10} style={{ opacity: 0.65 }} /> Smart Focus
            </button>
          </div>
        </div>
      ) : (status === 'recording' || status === 'paused') ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Shortcuts
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ k: 'P', d: 'Full View' }, { k: 'Z', d: 'Zoom In' }].map(({ k, d }) => (
              <div key={k} style={{
                display: 'flex', alignItems: 'center', gap: 6, flex: 1,
                background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '5px 8px',
              }}>
                <span style={{
                  background: 'rgba(255,255,255,0.09)', borderRadius: 4,
                  padding: '1px 5px', fontSize: 9.5, fontWeight: 700,
                  color: 'rgba(255,255,255,0.55)', fontFamily: 'SF Mono, Consolas, monospace',
                }}>{k}</span>
                <span style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Action */}
      <div style={{ display: 'flex', gap: 6 }}>
        {status === 'ready' ? (
          <button
            onClick={handleStartRecording}
            style={{
              flex: 1, height: 34, borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, rgba(255,69,58,0.85) 0%, rgba(220,38,38,0.95) 100%)',
              color: '#fff', fontSize: 11.5, fontWeight: 700, letterSpacing: '-0.01em',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 3px 14px rgba(255,69,58,0.3)',
              transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 20px rgba(255,69,58,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 14px rgba(255,69,58,0.3)'; }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', opacity: 0.9 }} />
            Start Recording
          </button>
        ) : status === 'starting' ? (
          <div style={{
            flex: 1, height: 34, borderRadius: 9,
            background: 'rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600,
          }}>
            Starting…
          </div>
        ) : status === 'error' ? (
          <div style={{
            flex: 1, height: 34, borderRadius: 9,
            background: 'rgba(255,69,58,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ff453a', fontSize: 11, fontWeight: 600,
          }}>
            Recording failed
          </div>
        ) : status === 'saving' ? (
          <div style={{
            flex: 1, height: 34, borderRadius: 9,
            background: 'rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600,
          }}>
            Saving…
          </div>
        ) : (
          <>
            <button
              onClick={handleTogglePause}
              style={{
                width: 34, height: 34, borderRadius: 9, border: 'none',
                background: status === 'paused' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.06)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = status === 'paused' ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = status === 'paused' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.06)'; }}
            >
              {status === 'paused' ? <Play size={13} fill="#f59e0b" color="#f59e0b" /> : <Pause size={13} fill="#fff" />}
            </button>
            <button
              onClick={handleStopRecording}
              style={{
                flex: 1, height: 34, borderRadius: 9, border: 'none',
                background: 'rgba(255,69,58,0.85)',
                color: '#fff', fontSize: 11.5, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 2px 10px rgba(255,69,58,0.3)',
                transition: 'all 0.15s ease', letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Square size={9} fill="#fff" />
              Stop & Save
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default ScreenRecorderWidget;






