import { useState, useEffect, useCallback, useRef } from 'react';
import { RECORDING_STATUS } from './recordingControlsPillTypes.js';

export function useRecordingState() {
  const [state, setState] = useState({
    status: RECORDING_STATUS.IDLE,
    elapsedMs: 0,
    micEnabled: true,
    webcamEnabled: false,
    smartFocusEnabled: false,
    options: {
      resolutionId: '1080p',
      fps: 60,
      mode: 'normal',
    },
    outputTargetPath: null,
  });

  const [tick, setTick] = useState({
    elapsedMs: 0,
    seconds: 0,
    formatted: '00:00',
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    // Fetch initial state
    if (window.electronAPI?.getRecordingState) {
      window.electronAPI.getRecordingState().then((res) => {
        if (isMounted && res) {
          setState((prev) => ({ ...prev, ...res }));
          if (res.elapsedMs) {
            const secs = Math.floor(res.elapsedMs / 1000);
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            setTick({
              elapsedMs: res.elapsedMs,
              seconds: secs,
              formatted: `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`,
            });
          }
        }
      }).catch(() => {});
    }

    // Subscribe to state changes
    const unsubState = window.electronAPI?.onRecordingStateChanged?.((newState) => {
      if (isMounted && newState) {
        setState((prev) => ({ ...prev, ...newState }));
        if (newState.status === RECORDING_STATUS.IDLE) {
          setTick({ elapsedMs: 0, seconds: 0, formatted: '00:00' });
        }
      }
    });

    // Subscribe to timer ticks
    const unsubTick = window.electronAPI?.onRecordingTick?.((tickData) => {
      if (isMounted && tickData) {
        setTick(tickData);
      }
    });

    // Request active subscription
    window.electronAPI?.subscribeRecordingState?.();

    return () => {
      isMounted = false;
      if (typeof unsubState === 'function') unsubState();
      if (typeof unsubTick === 'function') unsubTick();
    };
  }, []);

  const startRecording = useCallback(async (options) => {
    return window.electronAPI?.startRecording?.(options);
  }, []);

  const pauseRecording = useCallback(async () => {
    return window.electronAPI?.pauseRecording?.();
  }, []);

  const resumeRecording = useCallback(async () => {
    return window.electronAPI?.resumeRecording?.();
  }, []);

  const stopRecording = useCallback(async () => {
    return window.electronAPI?.stopRecording?.();
  }, []);

  const discardRecording = useCallback(async () => {
    return window.electronAPI?.discardRecording?.();
  }, []);

  const toggleMic = useCallback(async () => {
    return window.electronAPI?.toggleRecordingMic?.();
  }, []);

  const toggleWebcam = useCallback(async () => {
    return window.electronAPI?.toggleRecordingWebcam?.();
  }, []);

  const toggleSmartFocus = useCallback(async () => {
    return window.electronAPI?.toggleRecordingSmartFocus?.();
  }, []);

  const openSettings = useCallback(() => {
    window.electronAPI?.openSettingsWindow?.();
  }, []);

  return {
    ...state,
    tick,
    seconds: tick.seconds,
    formattedTime: tick.formatted,
    isRecording: state.status === RECORDING_STATUS.RECORDING,
    isPaused: state.status === RECORDING_STATUS.PAUSED,
    isStarting: state.status === RECORDING_STATUS.STARTING,
    isStopping: state.status === RECORDING_STATUS.STOPPING,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
    toggleMic,
    toggleWebcam,
    toggleSmartFocus,
    openSettings,
  };
}

export default useRecordingState;
