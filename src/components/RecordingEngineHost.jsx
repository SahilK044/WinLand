import React, { useEffect, useRef } from 'react';
import { createSmartCamera } from './Activities/smartCamera.js';
import { createSmartFocusEngine } from './Activities/smartFocusEngine.js';

const RESOLUTION_OPTIONS = [
  { id: '1080p', label: '1080p', width: 1920, height: 1080, bitrate: 20000000 },
  { id: '1440p', label: '1440p', width: 2560, height: 1440, bitrate: 32000000 },
  { id: '4k', label: '4K', width: 3840, height: 2160, bitrate: 50000000 },
];

const getStableCaptureFps = (requestedFps) => {
  return Math.max(30, Math.min(240, Number(requestedFps) || 60));
};

const HIGH_QUALITY_AUDIO_CONSTRAINTS = {
  echoCancellation: false,
  autoGainControl: false,
  noiseSuppression: false,
  channelCount: { ideal: 2 },
  sampleRate: { ideal: 48000 },
  suppressLocalAudioPlayback: false,
};

const getPreferredMimeType = () => {
  const mimeTypes = [
    'video/webm; codecs="h264, opus"',
    'video/webm; codecs=h264',
    'video/webm; codecs="avc1, opus"',
    'video/webm; codecs=avc1',
    'video/mp4; codecs="avc1, mp4a.40.2"',
    'video/mp4; codecs=avc1',
    'video/mp4',
    'video/webm; codecs="vp8, opus"',
    'video/webm; codecs=vp8',
    'video/webm',
  ];
  return mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';
};

export default function RecordingEngineHost() {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const composedStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const drawIntervalRef = useRef(null);
  const mouseCleanupRef = useRef(null);
  const hotkeyCleanupRef = useRef(null);

  const smartCameraRef = useRef(null);
  const smartFocusRef = useRef(null);

  const isDiscardingRef = useRef(false);
  const statusRef = useRef('idle'); // 'idle' | 'recording' | 'paused' | 'stopping'
  const unmountedRef = useRef(false);
  const currentOptionsRef = useRef({ resolutionId: '1080p', fps: 60, mode: 'normal' });

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

  const cleanupStreamsAndEngines = () => {
    mouseCleanupRef.current?.();
    hotkeyCleanupRef.current?.();
    window.electronAPI?.stopScreenRecMouseTracking?.();
    window.electronAPI?.stopScreenRecHotkeys?.();

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
      try { videoRef.current.pause(); } catch {}
      if (videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
      videoRef.current = null;
    }
    stopDrawLoop();
    if (canvasRef.current) {
      canvasRef.current.width = 0;
      canvasRef.current.height = 0;
      canvasRef.current = null;
    }
    if (smartFocusRef.current) {
      try { smartFocusRef.current.destroy(); } catch {}
      smartFocusRef.current = null;
    }
    smartCameraRef.current = null;
    mediaRecorderRef.current = null;
  };

  const createDesktopStream = async (source, targetFps, preset) => {
    const isHighFps = targetFps >= 120;
    const videoConstraints = {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source?.id,
        minFrameRate: Math.min(60, targetFps),
        maxFrameRate: targetFps,
        ...(isHighFps ? {} : {
          minWidth: preset.width,
          maxWidth: preset.width,
          minHeight: preset.height,
          maxHeight: preset.height,
        }),
      },
      optional: [
        { googTemporalLayeredScreencast: false },
        { googLeakyBucket: true },
      ],
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
        return stream;
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: videoConstraints,
          });
          return stream;
        } catch {}
      }
    }

    if (navigator.mediaDevices?.getDisplayMedia) {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: preset.width, min: preset.width, max: preset.width },
          height: { ideal: preset.height, min: preset.height, max: preset.height },
          frameRate: { ideal: targetFps, max: targetFps },
        },
        audio: HIGH_QUALITY_AUDIO_CONSTRAINTS,
      });
      return stream;
    }

    throw new Error('No desktop capture method available');
  };

  const createComposedStream = async (screenStream, source, preset, targetFps) => {
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
    if (!ctx) throw new Error('Canvas 2D context not available');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';

    const bounds = source?.bounds || { x: 0, y: 0, width: preset.width, height: preset.height };

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

    const composedStream = canvas.captureStream(targetFps > 60 ? targetFps : 0);
    const [canvasTrack] = composedStream.getVideoTracks();
    screenStream.getAudioTracks().forEach((track) => composedStream.addTrack(track));

    const requestCanvasFrame = () => {
      try { canvasTrack?.requestFrame?.(); } catch {}
    };
    requestCanvasFrame();

    let isRunning = true;
    let rafHandle = null;
    let rvfcHandle = null;
    let lastDrawTime = performance.now();
    const frameInterval = 1000 / targetFps;

    const onFrame = () => {
      if (!isRunning) return;
      if (statusRef.current === 'paused') {
        rafHandle = requestAnimationFrame(onFrame);
        return;
      }
      if (statusRef.current === 'stopping' || statusRef.current === 'idle') {
        isRunning = false;
        return;
      }

      const now = performance.now();
      if (now - lastDrawTime >= frameInterval - 0.75) {
        draw();
        requestCanvasFrame();
        lastDrawTime = now;
      }
      rafHandle = requestAnimationFrame(onFrame);
    };

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && videoRef.current) {
      const onVideoFrame = () => {
        if (!isRunning) return;
        if (statusRef.current === 'recording') {
          draw();
          requestCanvasFrame();
        }
        if (videoRef.current && isRunning) {
          rvfcHandle = videoRef.current.requestVideoFrameCallback(onVideoFrame);
        }
      };
      rvfcHandle = videoRef.current.requestVideoFrameCallback(onVideoFrame);
    } else {
      rafHandle = requestAnimationFrame(onFrame);
    }

    drawIntervalRef.current = {
      stop: () => {
        isRunning = false;
        if (rafHandle !== null) cancelAnimationFrame(rafHandle);
        if (rvfcHandle !== null && videoRef.current?.cancelVideoFrameCallback) {
          try { videoRef.current.cancelVideoFrameCallback(rvfcHandle); } catch {}
        }
      },
    };

    return composedStream;
  };

  const handleStartCommand = async (payload = {}) => {
    const opts = payload.options || {};
    currentOptionsRef.current = opts;
    isDiscardingRef.current = false;

    // Clean up any dangling state from a previous session
    cleanupStreamsAndEngines();
    statusRef.current = 'recording';

    try {
      const preset = RESOLUTION_OPTIONS.find((p) => p.id === opts.resolutionId) || RESOLUTION_OPTIONS[0];
      const captureFps = getStableCaptureFps(opts.fps);
      const source = await window.electronAPI?.getPrimaryScreenSource?.();

      // Abort if a stop/discard command arrived during the await
      if (statusRef.current === 'stopping' || statusRef.current === 'idle') {
        cleanupStreamsAndEngines();
        return;
      }

      let screenStream = null;
      if (source && source.id) {
        try {
          screenStream = await createDesktopStream(source, captureFps, preset);
        } catch {}
      }

      if (!screenStream && navigator.mediaDevices?.getDisplayMedia) {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: preset.width, max: preset.width },
            height: { ideal: preset.height, max: preset.height },
            frameRate: { ideal: captureFps, max: captureFps },
          },
          audio: HIGH_QUALITY_AUDIO_CONSTRAINTS,
        });
      }

      // Abort if a stop/discard command arrived during the await
      if (statusRef.current === 'stopping' || statusRef.current === 'idle') {
        if (screenStream) {
          try { screenStream.getTracks().forEach((t) => t.stop()); } catch {}
        }
        cleanupStreamsAndEngines();
        return;
      }

      if (!screenStream || screenStream.getVideoTracks().length === 0) {
        throw new Error('Screen stream could not be captured.');
      }

      streamRef.current = screenStream;
      let recordingStream = screenStream;

      const isSmartMode = opts.mode === 'smart' || Boolean(payload.smartFocusEnabled);
      if (isSmartMode) {
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

        const handleKeyStr = (keyStr) => {
          const k = String(keyStr).toLowerCase();
          if (k === 'p') smartCameraRef.current?.handleOverride('pan-out');
          else if (k === 'z') smartCameraRef.current?.handleOverride('zoom-in');
        };

        hotkeyCleanupRef.current = window.electronAPI?.onScreenRecHotkey?.((key) => handleKeyStr(key));
        window.electronAPI?.startScreenRecMouseTracking?.();
        window.electronAPI?.startScreenRecHotkeys?.();

        recordingStream = await createComposedStream(screenStream, source, preset, captureFps);
      }

      recordingStream.getVideoTracks().forEach((track) => {
        try { track.contentHint = 'motion'; } catch {}
      });
      composedStreamRef.current = recordingStream;

      const supportedType = getPreferredMimeType();
      const fpsScale = Math.max(1, captureFps / 60);

      let recorder;
      try {
        recorder = new MediaRecorder(recordingStream, {
          mimeType: supportedType,
          videoBitsPerSecond: Math.min(Math.round(preset.bitrate * fpsScale), 80000000),
          audioBitsPerSecond: recordingStream.getAudioTracks().length > 0 ? 320000 : undefined,
        });
      } catch {
        try {
          recorder = new MediaRecorder(recordingStream, { mimeType: 'video/webm' });
        } catch {
          recorder = new MediaRecorder(recordingStream);
        }
      }

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        const wasDiscarded = isDiscardingRef.current;
        const finalChunks = chunksRef.current;
        chunksRef.current = [];

        cleanupStreamsAndEngines();

        // If the component unmounted (app closing), skip file operations
        if (unmountedRef.current) return;

        if (wasDiscarded) {
          window.electronAPI?.reportRecordingStatus?.({ status: 'idle' });
          return;
        }

        const finalMime = recorder.mimeType || supportedType || 'video/webm';
        const blob = new Blob(finalChunks, { type: finalMime });

        let saveOk = false;
        if (blob.size > 0 && window.electronAPI?.saveScreenRecording) {
          const buffer = await blob.arrayBuffer();
          const res = await window.electronAPI.saveScreenRecording({
            buffer,
            mimeType: blob.type,
            fps: captureFps,
            width: preset.width,
            height: preset.height,
          });
          if (res?.ok && res?.filePath) {
            saveOk = true;
            window.electronAPI?.openFileLocation?.(res.filePath);
          }
        }

        window.electronAPI?.reportRecordingStatus?.({
          status: saveOk ? 'idle' : 'error',
          error: saveOk ? null : 'Failed to save recording',
        });
      };

      recorder.start(100);
      statusRef.current = 'recording';
      window.electronAPI?.reportRecordingStatus?.({ status: 'recording' });
    } catch (err) {
      console.error('[RecordingEngineHost] start error:', err);
      cleanupStreamsAndEngines();
      statusRef.current = 'idle';
      window.electronAPI?.reportRecordingStatus?.({ status: 'error', error: err?.message || 'Failed to start capture' });
    }
  };

  const handlePauseCommand = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        statusRef.current = 'paused';
      } catch {}
    }
  };

  const handleResumeCommand = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        statusRef.current = 'recording';
      } catch {}
    }
  };

  const handleStopCommand = () => {
    statusRef.current = 'stopping';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch {
        cleanupStreamsAndEngines();
        window.electronAPI?.reportRecordingStatus?.({ status: 'idle' });
      }
    } else {
      cleanupStreamsAndEngines();
      window.electronAPI?.reportRecordingStatus?.({ status: 'idle' });
    }
  };

  const handleDiscardCommand = () => {
    isDiscardingRef.current = true;
    statusRef.current = 'stopping';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        cleanupStreamsAndEngines();
        window.electronAPI?.reportRecordingStatus?.({ status: 'idle' });
      }
    } else {
      cleanupStreamsAndEngines();
      window.electronAPI?.reportRecordingStatus?.({ status: 'idle' });
    }
  };

  const handleToggleMicCommand = (micEnabled) => {
    const stream = composedStreamRef.current || streamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = Boolean(micEnabled);
      });
    }
  };

  const handleToggleSmartFocusCommand = (smartFocusEnabled) => {
    if (smartFocusRef.current) {
      // Toggle Smart Focus camera override
      if (!smartFocusEnabled) {
        smartCameraRef.current?.handleOverride('pan-out');
      }
    }
  };

  useEffect(() => {
    const unsub = window.electronAPI?.onRecordingCommand?.((data = {}) => {
      switch (data.action) {
        case 'start':
          handleStartCommand(data);
          break;
        case 'pause':
          handlePauseCommand();
          break;
        case 'resume':
          handleResumeCommand();
          break;
        case 'stop':
          handleStopCommand();
          break;
        case 'discard':
          handleDiscardCommand();
          break;
        case 'toggle-mic':
          handleToggleMicCommand(data.micEnabled);
          break;
        case 'toggle-smart-focus':
          handleToggleSmartFocusCommand(data.smartFocusEnabled);
          break;
        default:
          break;
      }
    });

    return () => {
      unmountedRef.current = true;
      if (typeof unsub === 'function') unsub();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      cleanupStreamsAndEngines();
    };
  }, []);

  return null; // Headless component
}
