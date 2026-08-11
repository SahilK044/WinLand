import React, { useState, useEffect, useRef } from 'react';
import { Square, Folder, Check, Play, Film } from 'lucide-react';

export default function ScreenRecorderWidget({ isCompact, onStop, onExpand }) {
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('recording'); // 'recording' | 'saving' | 'saved'
  const [savedPath, setSavedPath] = useState('');
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // Timer tick
  useEffect(() => {
    if (status !== 'recording') return undefined;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Format seconds -> mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Initialize background MediaRecorder on mount
  useEffect(() => {
    let isSubscribed = true;

    async function initRecorder() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.electronAPI?.getPrimaryScreenSource) {
          return;
        }

        const source = await window.electronAPI.getPrimaryScreenSource();
        if (!source?.id || !isSubscribed) return;

        const screenStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id,
              maxWidth: 1920,
              maxHeight: 1080,
              maxFrameRate: 30,
            },
          },
        });

        if (!isSubscribed) {
          screenStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = screenStream;
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
          ? 'video/webm; codecs=vp9'
          : 'video/webm; codecs=vp8';

        const recorder = new MediaRecorder(screenStream, { mimeType, videoBitsPerSecond: 5000000 });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }

          if (blob.size > 0 && window.electronAPI?.saveScreenRecording) {
            const buffer = await blob.arrayBuffer();
            const res = await window.electronAPI.saveScreenRecording({ buffer, mimeType: blob.type });
            if (res?.ok && res?.filePath) {
              setSavedPath(res.filePath);
              setStatus('saved');
              // Automatically open saved location in File Explorer
              window.electronAPI?.openFileLocation?.(res.filePath);
            }
          }
        };

        recorder.start(1000);
      } catch (err) {
        console.error('Screen recording failed to start:', err);
      }
    }

    initRecorder();

    return () => {
      isSubscribed = false;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch {}
      } else if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleStopRecording = (e) => {
    e?.stopPropagation();
    if (status === 'saved') {
      onStop?.();
      return;
    }
    setStatus('saving');
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      onStop?.();
    }
  };

  const handleOpenFolder = (e) => {
    e?.stopPropagation();
    window.electronAPI?.openFileLocation?.(savedPath);
  };

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
              background: '#ff453a',
              boxShadow: '0 0 10px #ff453a',
              animation: 'pulse 1.2s infinite ease-in-out',
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#ff453a', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.3px' }}>
            REC {formatTime(seconds)}
          </span>
        </div>

        {/* Center: Live Waveform Bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 2, height: 10, background: 'rgba(255, 69, 58, 0.85)', borderRadius: 1 }} />
          <div style={{ width: 2, height: 16, background: '#ff453a', borderRadius: 1 }} />
          <div style={{ width: 2, height: 8, background: 'rgba(255, 69, 58, 0.7)', borderRadius: 1 }} />
          <div style={{ width: 2, height: 14, background: '#ff453a', borderRadius: 1 }} />
        </div>

        {/* Right: Stop Button */}
        <button
          onClick={handleStopRecording}
          title="Stop Recording"
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
            transition: 'transform 0.15s ease',
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
      {/* Top Bar: Recording Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: status === 'saved' ? '#30d158' : '#ff453a',
              boxShadow: status === 'saved' ? '0 0 10px #30d158' : '0 0 10px #ff453a',
            }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
              {status === 'saved' ? 'Screen Recording Saved' : status === 'saving' ? 'Saving Video...' : 'Screen Recording Active'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.55)', marginTop: 1 }}>
              {status === 'saved' ? 'Saved to Videos\\WinLand Captures' : 'Capturing 1080p • 30 FPS'}
            </div>
          </div>
        </div>

        {/* Live Timer */}
        <span style={{ fontSize: 15, fontWeight: 800, color: status === 'saved' ? '#30d158' : '#ff453a', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(seconds)}
        </span>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
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
                padding: '0 12px',
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
              onClick={handleStopRecording}
              disabled={status === 'saving'}
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
              {status === 'saving' ? 'Saving Recording...' : 'Stop Recording'}
            </button>
            <button
              onClick={handleOpenFolder}
              title="Open Captures Folder"
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Folder size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
