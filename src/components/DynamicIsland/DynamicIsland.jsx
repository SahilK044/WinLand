import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UsbWidget from '../Activities/UsbWidget';
import DiscordWidget from '../Activities/DiscordWidget';
import MusicWidget from '../Activities/MusicWidget';
import TimerWidget from '../Activities/TimerWidget';
import CallWidget from '../Activities/CallWidget';
import AirDropWidget from '../Activities/AirDropWidget';
import VoiceMemoWidget from '../Activities/VoiceMemoWidget';
import ScreenRecorderWidget from '../Activities/ScreenRecorderWidget';
import useRecordingState from '../RecordingControlsPill/useRecordingState.js';
import BatteryWidget from '../Activities/BatteryWidget';
import VolumeOSDWidget from '../Activities/VolumeOSDWidget';
import NotificationWidget from '../Activities/NotificationWidget';
import WeatherWidget from '../Activities/WeatherWidget';
import IdleWidget from '../Activities/IdleWidget';
import ShelfWidget from '../Activities/ShelfWidget';
import SystemMonitorWidget from '../Activities/SystemMonitorWidget';
import LauncherWidget from '../Activities/LauncherWidget';
import ScreenshotWidget from '../Activities/ScreenshotWidget';
import BluetoothWidget from '../Activities/BluetoothWidget';
import LiveActivitiesWidget from '../Activities/LiveActivitiesWidget';
import PrivacyIndicator from '../Activities/PrivacyIndicator';
import { soundEngine } from '../../utils/soundEngine';
import { driveEq, useEqBars } from '../../utils/eqStore';
import ThemeCanvas from '../../theme/ThemeCanvas';
import { themeManager } from '../../theme/ThemeManager';
import { Moon, Play, Pause, Square } from 'lucide-react';
import { MUSIC_AURA_KEY } from '../../data/devicePrefs';
import { timerStore } from '../../features/timer/TimerStore';
import { fetchLiveWeather } from '../../utils/weatherUtils';


const IDLE_TRACK = {
  title: null, artist: null, album: null,
  coverUrl: null, isPlaying: false, progressMs: 0, durationMs: 0,
};

// Default accent = Spotify green
const DEFAULT_ACCENT = { r: 29, g: 185, b: 84 };

// ─────────────────────────────────────────────────────────────────────────────
// Canvas-based dominant color extractor
// Samples downscaled artwork, selects a vibrant, elegant accent color.
// ─────────────────────────────────────────────────────────────────────────────
function extractVibrantColor(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) return resolve(DEFAULT_ACCENT);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const SIZE = 40;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        canvas.width = 0;
        canvas.height = 0;

        let bestColor = null;
        let maxVibrancyScore = -1;
        let fallbackSumR = 0, fallbackSumG = 0, fallbackSumB = 0, validPixelCount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 180) continue;

          fallbackSumR += r; fallbackSumG += g; fallbackSumB += b; validPixelCount++;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const sat = max === 0 ? 0 : delta / max;
          const bright = max / 255;

          // Reject dark muddy pixels (bright < 0.24) and extreme whites (bright > 0.96)
          if (bright < 0.24 || bright > 0.96) continue;

          // Favor vibrant saturated hues over dull browns
          const score = sat * 2.8 + bright * 0.4;

          if (sat >= 0.16 && score > maxVibrancyScore) {
            maxVibrancyScore = score;
            bestColor = { r, g, b };
          }
        }

        if (bestColor) {
          // Normalize channel brightness so controls are bright & vivid, never muddy brown
          const maxChannel = Math.max(bestColor.r, bestColor.g, bestColor.b);
          if (maxChannel < 165) {
            const scale = 185 / Math.max(1, maxChannel);
            bestColor = {
              r: Math.min(255, Math.round(bestColor.r * scale)),
              g: Math.min(255, Math.round(bestColor.g * scale)),
              b: Math.min(255, Math.round(bestColor.b * scale)),
            };
          }
          return resolve(bestColor);
        }

        // Handle monochrome / low-saturation covers (e.g. white/black album art)
        if (validPixelCount > 0) {
          const avgR = Math.round(fallbackSumR / validPixelCount);
          const avgG = Math.round(fallbackSumG / validPixelCount);
          const avgB = Math.round(fallbackSumB / validPixelCount);

          const max = Math.max(avgR, avgG, avgB);
          const min = Math.min(avgR, avgG, avgB);
          const sat = max === 0 ? 0 : (max - min) / max;

          if (sat < 0.15) {
            // Crisp elegant Apple silver-white accent for monochrome covers
            return resolve({ r: 235, g: 238, b: 245 });
          }
          return resolve({ r: avgR, g: avgG, b: avgB });
        }

        resolve(DEFAULT_ACCENT);
      } catch {
        resolve(DEFAULT_ACCENT);
      }
    };

    img.onerror = () => resolve(DEFAULT_ACCENT);
    img.src = imageUrl;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat-synced liquid aura. Subscribes to eqStore itself so the island root
// never re-renders on a beat tick — only this small subtree does.
// ─────────────────────────────────────────────────────────────────────────────
function LiquidAura({ isPlaying, isEnabled = true, isLight = false, eqColor, smoothR, smoothG, smoothB }) {
  const bars = useEqBars();
  const beatPulse = (isPlaying && isEnabled) ? (bars.reduce((sum, h) => sum + h, 0) / 75) : 0;
  const maxOpacity = isLight ? (isPlaying ? 0.36 + beatPulse * 0.18 : 0.08) : (isPlaying ? 0.72 + beatPulse * 0.28 : 0.16);
  const targetOpacity = isEnabled ? maxOpacity : 0;

  return (
    <div
      className="liquid-aura-container"
      style={{
        opacity: targetOpacity,
        transform: `scale3d(${1 + beatPulse * 0.12}, ${1 + beatPulse * 0.12}, 1)`,
        pointerEvents: 'none',
        transition: 'opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div className="liquid-blob-1" style={{ background: `radial-gradient(circle, ${eqColor} 0%, rgba(${smoothR},${smoothG},${smoothB},0.35) 55%, transparent 100%)` }} />
      <div className="liquid-blob-2" style={{ background: `radial-gradient(circle, rgba(${smoothR},${smoothG},${smoothB},0.9) 0%, rgba(${smoothR},${smoothG},${smoothB},0.25) 50%, transparent 100%)` }} />
      <div className="liquid-blob-3" style={{ background: `radial-gradient(circle, ${eqColor} 0%, rgba(${smoothR},${smoothG},${smoothB},0.2) 45%, transparent 100%)` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Irrational-ratio oscillator bank lives in src/utils/eqStore.js — the bar
// heights and the gain spring are driven there so only the visualizer
// components re-render.
// ─────────────────────────────────────────────────────────────────────────────

export default function DynamicIsland({
  activeState,
  setActiveState,
  notification,
  setNotification,
  onClearNotification,
}) {
  const [trackInfo, setTrackInfo] = useState(IDLE_TRACK);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [displayAccentColor, setDisplayAccentColor] = useState(DEFAULT_ACCENT);
  // Equalizer bars live in eqStore — the visualizer widgets subscribe
  // themselves, so the island root never re-renders on a bar tick.
  const [battery, setBattery] = useState({ pct: 0, charging: false, minsLeft: -1 });
  const [volume, setVolume] = useState(50);
  const [shelvedItems, setShelvedItems] = useState([]);
  const [sysStats, setSysStats] = useState({ cpu: 22, ram: 54, gpu: 30 });
  const [screenshotData, setScreenshotData] = useState(null);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('winland_theme_mode') || themeManager.getMode() || 'dark');
  const [weatherConfig, setWeatherConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('winland_live_weather');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { weatherUnit: 'C' };
  });
  const [weatherSearchCount, setWeatherSearchCount] = useState(0);
  const [devicePrefs, setDevicePrefs] = useState(() => {
    try {
      const savedDuration = localStorage.getItem('winland_autohide_duration');
      const savedIdle = localStorage.getItem('winland_autohide_idle');
      const savedAura = localStorage.getItem(MUSIC_AURA_KEY);
      return {
        autoHideIdle: savedIdle !== 'false',
        autoHideDuration: savedDuration ? parseInt(savedDuration, 10) : 10,
        musicAura: savedAura !== 'false',
      };
    } catch {
      return { autoHideIdle: true, autoHideDuration: 10, musicAura: true };
    }
  });

  useEffect(() => {
    const handleLocalSettings = (e) => {
      if (e.detail) {
        setDevicePrefs((prev) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('winland-settings-changed', handleLocalSettings);

    if (!window.electronAPI?.onDevicePrefsUpdate) {
      return () => window.removeEventListener('winland-settings-changed', handleLocalSettings);
    }
    const unsub = window.electronAPI.onDevicePrefsUpdate((prefs) => {
      if (prefs) {
        setDevicePrefs((prev) => ({ ...prev, ...prefs }));
      }
    });
    return () => {
      window.removeEventListener('winland-settings-changed', handleLocalSettings);
      unsub();
    };
  }, []);

  const [callData, setCallData] = useState(null);
  const [usbData, setUsbData] = useState(null);
  const [discordVoice, setDiscordVoice] = useState(null);
  const capsuleRef = useRef(null);
  const secondaryCapsuleRef = useRef(null);
  const [isCapsuleHovered, setIsCapsuleHovered] = useState(false);
  const [isCapsulePressed, setIsCapsulePressed] = useState(false);
  // Independent hover/press tracking for the secondary (Timer) split capsule -
  // it must not share the primary capsule's interaction state, or hovering/
  // pressing one pill incorrectly lights up the other's glass shimmer.
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false);
  const [isSecondaryPressed, setIsSecondaryPressed] = useState(false);
  const isDraggingRef = useRef(false);
  const isCapsulePressedRef = useRef(false);
  useEffect(() => {
    isCapsulePressedRef.current = isCapsulePressed || isSecondaryPressed;
  }, [isCapsulePressed, isSecondaryPressed]);

  const {
    isRecording: isScreenRecordingActive,
    isPaused: isScreenRecordingPaused,
    formattedTime,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useRecordingState();
  const isScreenRecordingOngoing = isScreenRecordingActive || isScreenRecordingPaused;
  const isScreenRecordingOngoingRef = useRef(isScreenRecordingOngoing);
  useEffect(() => {
    isScreenRecordingOngoingRef.current = isScreenRecordingOngoing;
  }, [isScreenRecordingOngoing]);

  const [bluetoothData, setBluetoothData] = useState({
    deviceName: 'AirPods Pro',
    batteryPct: 88,
    isCharging: false,
    leftPct: null,
    rightPct: null,
  });
  const isLight = themeMode === 'light';



  const isMusicState = activeState === 'compact-music' || activeState === 'expanded-music' || activeState === 'expanded-lyrics';

  useEffect(() => {
    const unsubManager = themeManager.subscribe((mode) => {
      setThemeMode(mode || 'dark');
    });

    let unsubIpc;
    if (window.electronAPI?.onAppearancePrefsUpdate) {
      unsubIpc = window.electronAPI.onAppearancePrefsUpdate((data) => {
        if (data && data.mode) {
          setThemeMode(data.mode);
        }
      });
    }

    return () => {
      unsubManager();
      if (unsubIpc) unsubIpc();
    };
  }, []);

  // ── Config sync & Live Local Weather Fetching ─────────────────────────────
  useEffect(() => {
    const handleLiveData = (liveData) => {
      if (liveData && (liveData.temperatureC !== undefined || liveData.weatherCondition)) {
        setWeatherConfig((prev) => {
          const updated = { ...prev, ...liveData };
          try { localStorage.setItem('winland_live_weather', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
    };

    // 1. Initial fetch of live local weather via web fetcher
    fetchLiveWeather().then(handleLiveData).catch(() => {});

    // 2. Fetch via Electron main process IPC
    if (window.electronAPI?.getLiveWeather) {
      window.electronAPI.getLiveWeather().then(handleLiveData).catch(() => {});
    }

    // 3. Periodic weather refresh every 10 minutes
    const weatherInterval = setInterval(() => {
      fetchLiveWeather(true).then(handleLiveData).catch(() => {});
      if (window.electronAPI?.getLiveWeather) {
        window.electronAPI.getLiveWeather().then(handleLiveData).catch(() => {});
      }
    }, 10 * 60 * 1000);

    const handleCustomWeather = (e) => {
      if (e?.detail) handleLiveData(e.detail);
    };
    window.addEventListener('winland-weather-updated', handleCustomWeather);

    if (window.electronAPI?.getInitialConfig) {
      window.electronAPI.getInitialConfig().then((data) => {
        if (data) handleLiveData(data);
      }).catch(() => {});
    }
    if (!window.electronAPI?.onConfigUpdate) {
      return () => {
        clearInterval(weatherInterval);
        window.removeEventListener('winland-weather-updated', handleCustomWeather);
      };
    }
    const cleanConfig = window.electronAPI.onConfigUpdate((data) => {
      if (data) handleLiveData(data);
    });
    return () => {
      clearInterval(weatherInterval);
      window.removeEventListener('winland-weather-updated', handleCustomWeather);
      if (typeof cleanConfig === 'function') cleanConfig();
    };
  }, []);

  const [isDndActive, setIsDndActive]         = useState(false);
  const [shouldRenderDnd, setShouldRenderDnd] = useState(false);
  const [isDndVisible, setIsDndVisible]       = useState(false);
  const [isDocked, setIsDocked]               = useState(false);
  const [isDraggingOverIsland, setIsDraggingOverIsland] = useState(false);
  const [morphClass, setMorphClass]           = useState('');
  const morphTimeoutRef = useRef(null);
  const dragDepthRef = useRef(0);
  const idleTimerRef = useRef(null);
  const dragTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    };
  }, []);

  // Listen to Focus Mode / DND state updates
  useEffect(() => {
    if (window.electronAPI?.getDndState) {
      window.electronAPI.getDndState().then((isDnd) => setIsDndActive(!!isDnd)).catch(() => {});
    }
    if (!window.electronAPI?.onDndStateUpdate) return;
    const cleanDnd = window.electronAPI.onDndStateUpdate(({ isDnd }) => {
      setIsDndActive(!!isDnd);
    });
    return () => { if (typeof cleanDnd === 'function') cleanDnd(); };
  }, []);

  // Smooth Apple spring fade-in / fade-out transition for DND badge
  useEffect(() => {
    if (isDndActive) {
      setShouldRenderDnd(true);
      let raf2;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsDndVisible(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    } else {
      setIsDndVisible(false);
      const timer = setTimeout(() => {
        setShouldRenderDnd(false);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [isDndActive]);

  // Smart Docking / Idle Auto-Hide Timer
  const resetIdleTimer = useCallback(() => {
    setIsDocked(false);
    clearTimeout(idleTimerRef.current);
    if (isDraggingRef.current || isCapsulePressedRef.current) return;
    const isEnabled = devicePrefs?.autoHideIdle !== false && weatherConfig?.autoHideIdle !== false;
    const durationSec = devicePrefs?.autoHideDuration || weatherConfig?.autoHideDuration || 10;
    const delayMs = Math.max(1000, durationSec * 1000);

    if (isEnabled && activeState === 'idle') {
      idleTimerRef.current = setTimeout(() => {
        if (!isDraggingRef.current && !isCapsulePressedRef.current) {
          setIsDocked(true);
        }
      }, delayMs);
    }
  }, [activeState, devicePrefs?.autoHideIdle, devicePrefs?.autoHideDuration, weatherConfig?.autoHideIdle, weatherConfig?.autoHideDuration]);

  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimerRef.current);
  }, [activeState, resetIdleTimer]);

  const userToggleLockRef     = useRef(0);
  const lastFetchedTitleRef   = useRef('');
  const volumeDismiss         = useRef(null);
  const batteryDismiss        = useRef(null);
  const bluetoothDismiss      = useRef(null);
  const screenshotDismiss     = useRef(null);
  const usbDismiss            = useRef(null);
  const discordDismiss        = useRef(null);
  // Remembers what the island was showing (e.g. expanded-lyrics) right before a
  // transient overlay (bluetooth / battery / volume) interrupted it, so we can
  // resume that view instead of always dropping back to the compact player -
  // this was why the lyrics tab kept appearing to "auto-close".
  const preOverlayStateRef    = useRef(null);
  const prevCoverRef          = useRef(null);
  const trackInfoRef          = useRef(trackInfo);
  const setNotificationRef    = useRef(setNotification);

  // Keep a ref mirror of trackInfo & setNotification so the mount-once IPC listener effect below
  // (empty dep array) can read current values without stale closures.
  useEffect(() => {
    trackInfoRef.current = trackInfo;
  }, [trackInfo]);

  useEffect(() => {
    setNotificationRef.current = setNotification;
  }, [setNotification]);



  // ── Simulated telemetry tick for System Monitor ────────────────────────────
  // PERF FIX: this used to run every 2s for the app's entire lifetime, even
  // when the System Monitor widget was nowhere on screen, forcing a needless
  // re-render every tick. Now it only ticks while that widget is visible.
  useEffect(() => {
    if (activeState !== 'expanded-sysmon') return undefined;
    const timer = setInterval(() => {
      setSysStats({
        cpu: Math.floor(15 + Math.random() * 25),
        ram: Math.floor(50 + Math.random() * 12),
        gpu: Math.floor(20 + Math.random() * 30),
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [activeState]);


  // ── Gamepad Controller Connection Detector ──────────────────────────────────
  useEffect(() => {
    const handleGamepadConnected = (e) => {
      const gp = e.gamepad;
      const isPs = gp.id?.toLowerCase().includes('dualsense') || gp.id?.toLowerCase().includes('playstation') || gp.id?.toLowerCase().includes('054c');
      const name = isPs ? 'DualSense Wireless Controller' : 'Xbox Wireless Controller';

      setNotificationRef.current?.({
        title: `${name} Connected`,
        subtitle: `Gaming Gamepad • ${gp.buttons?.length || 16} Buttons • Ready`,
        icon: '🎮',
      });
      setActiveState('notification');
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    return () => window.removeEventListener('gamepadconnected', handleGamepadConnected);
  }, [setActiveState]);



  const currentArtUrlRef = useRef(null);
  // ── Accent color extraction when album art changes ────────────────────────
  useEffect(() => {
    const url = trackInfo.coverUrl;
    if (!url || url === prevCoverRef.current) return;
    prevCoverRef.current = url;
    currentArtUrlRef.current = url;

    extractVibrantColor(url).then((color) => {
      if (currentArtUrlRef.current === url) {
        setAccentColor(color);
      }
    });
  }, [trackInfo.coverUrl]);

  // Reset accent when track goes idle
  useEffect(() => {
    if (!trackInfo.title) {
      setAccentColor(DEFAULT_ACCENT);
      prevCoverRef.current = null;
      lastFetchedTitleRef.current = '';
    }
  }, [trackInfo.title]);

  const accentEaseRef = useRef(DEFAULT_ACCENT);

  // ── Accent easing without re-render storms ────────────────────────────────
  // The eased accent commits to React state on a throttled cadence (~8Hz)
  // instead of every frame: the old setState-per-frame loop forced a full
  // island-tree re-render at 60fps for the whole track-change transition.
  useEffect(() => {
    let rafId;
    let lastCommit = 0;
    const target = accentColor;
    const easeColor = () => {
      const prev = accentEaseRef.current;
      const next = {
        r: prev.r + (target.r - prev.r) * 0.075,
        g: prev.g + (target.g - prev.g) * 0.075,
        b: prev.b + (target.b - prev.b) * 0.075,
      };
      const converged =
        Math.abs(next.r - target.r) < 0.5 &&
        Math.abs(next.g - target.g) < 0.5 &&
        Math.abs(next.b - target.b) < 0.5;
      accentEaseRef.current = converged ? target : next;

      if (converged) {
        setDisplayAccentColor(target);
        return;
      }
      const now = performance.now();
      if (now - lastCommit > 120) {
        lastCommit = now;
        setDisplayAccentColor({ r: Math.round(next.r), g: Math.round(next.g), b: Math.round(next.b) });
      }
      rafId = requestAnimationFrame(easeColor);
    };

    rafId = requestAnimationFrame(easeColor);
    return () => cancelAnimationFrame(rafId);
  }, [accentColor]);

  // ── Central Controlled Timer State ───────────────────────────────────────
  // Mirrors whatever the native Windows Clock app's Timer/Focus Session is
  // doing (see electron.js pollTimerState). Starts empty rather than a
  // hardcoded 5:00 so the island stays hidden until a real timer exists -
  // opening it manually from the launcher seeds a fresh 5:00 default itself.
  // ── Central Controlled Multi-Timer State ─────────────────────────────────
  // Subscribes to central timerStore
  const [timers, setTimers] = useState([]);
  const isNativeSyncedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = timerStore.subscribe((updatedTimers) => {
      setTimers(updatedTimers);
    });
    return unsubscribe;
  }, []);

  const isTimerActive = timers.some((t) => t.status === 'running');

  // ── Automatic smooth state morphing when Spotify starts/stops or Timer runs ────
  useEffect(() => {
    if (
      activeState.startsWith('expanded-') ||
      activeState === 'volume-osd' ||
      activeState === 'notification' ||
      activeState === 'compact-call'
    ) {
      return;
    }

    if (isScreenRecordingOngoing || isTimerActive) {
      if (activeState !== 'split') {
        setActiveState('split');
      }
      return;
    }

    if (trackInfo.title) {
      if (activeState !== 'compact-music') {
        setActiveState('compact-music');
      }
    } else {
      if (activeState !== 'idle') {
        setActiveState('idle');
      }
    }
  }, [trackInfo.title, isTimerActive, activeState, setActiveState, isScreenRecordingOngoing]);

  // ── Monotonic Media Progress Tracker ─────────────────────────────────────

  // ── Accurate Media Metadata & Cover Artwork Resolver ─────────────
  const updateTrackData = useCallback(async (dataOrString) => {
    let titleString   = typeof dataOrString === 'string' ? dataOrString : dataOrString?.title;
    let initialPosMs  = typeof dataOrString === 'object' ? dataOrString?.posMs : undefined;
    let initialEndMs  = typeof dataOrString === 'object' ? dataOrString?.endMs : undefined;
    let isPlayingFlag = typeof dataOrString === 'object' ? Boolean(dataOrString?.isPlaying) : true;
    let nativeCoverUrl = typeof dataOrString === 'object' ? dataOrString?.coverUrl : null;

    if (!titleString || titleString === '__NO_MEDIA__') {
      lastFetchedTitleRef.current = '';
      setTrackInfo(IDLE_TRACK);
      return;
    }

    let parsedTitle  = typeof dataOrString === 'object' ? (dataOrString?.title || titleString) : titleString;
    let parsedArtist = typeof dataOrString === 'object' ? (dataOrString?.artist || '') : '';

    if (!parsedArtist && titleString && titleString.includes(' - ')) {
      const parts  = titleString.split(' - ');
      parsedTitle  = parts[0].trim();
      parsedArtist = parts.slice(1).join(' - ').trim();
    }

    const cleanTitle = parsedTitle || titleString;

    setTrackInfo((prev) => {
      const isUserLocked = (Date.now() - userToggleLockRef.current) < 1500;
      const targetIsPlaying = isUserLocked ? prev.isPlaying : isPlayingFlag;

      let updatedProgressMs = (initialPosMs !== undefined && initialPosMs >= 0) ? initialPosMs : prev.progressMs;
      let updatedDurationMs = (initialEndMs !== undefined && initialEndMs > 0) ? initialEndMs : prev.durationMs;

      return {
        ...prev,
        title: cleanTitle,
        artist: parsedArtist || prev.artist,
        coverUrl: nativeCoverUrl || prev.coverUrl,
        isPlaying: targetIsPlaying,
        progressMs: updatedProgressMs,
        durationMs: updatedDurationMs,
      };
    });

    if (nativeCoverUrl) return;
    if (lastFetchedTitleRef.current === cleanTitle) return;
    lastFetchedTitleRef.current = cleanTitle;
  }, []);

  // ── IPC listeners (registered once) ──────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanSpotify = window.electronAPI.onSystemMediaUpdate ? window.electronAPI.onSystemMediaUpdate(updateTrackData) : null;
    // Mirrors the real Windows Clock timer (electron.js polls it via UI
    // Automation). Previously called a setter (setIsTimerActive) that never
    // existed, so this threw every time an update arrived and the sync
    // silently did nothing - that was the "doesn't detect the clock at all"
    // bug. Now it actually feeds the central timer state.
    const cleanTimer = window.electronAPI.onTimerUpdate ? window.electronAPI.onTimerUpdate((data) => {
      if (!data) return;
      if (data.hasNativeTimer && typeof data.secondsLeft === 'number' && data.secondsLeft > 0) {
        isNativeSyncedRef.current = true;
        timerStore.syncNativeTimer(data.label, data.secondsLeft, data.totalSeconds, !!data.isRunning);
      } else if (isNativeSyncedRef.current) {
        // Native timer finished or stopped - clear native sync state
        isNativeSyncedRef.current = false;
        timerStore.clearNativeTimer();
        setActiveState((cur) => cur === 'expanded-timer' ? (trackInfoRef.current.title ? 'compact-music' : 'idle') : cur);
      }
    }) : null;

    const isOverlayState = (s) => (
      s === 'expanded-battery' ||
      s === 'volume-osd' ||
      s === 'expanded-bluetooth' ||
      s === 'expanded-call' ||
      s === 'compact-call' ||
      s === 'compact-screenrec' ||
      s === 'expanded-screenrec' ||
      s === 'expanded-screenshot' ||
      s === 'expanded-usb' ||
      s === 'expanded-discord'
    );
    const resumeFromOverlay = () => {
      const resumeState = preOverlayStateRef.current;
      preOverlayStateRef.current = null;
      if (isScreenRecordingOngoingRef.current) return 'split';
      if (resumeState === 'expanded-lyrics' || resumeState === 'expanded-music') return resumeState;
      const isTimerRunning = timerStore.getTimers().some((t) => t.status === 'running');
      return trackInfoRef.current.title && isTimerRunning ? 'split' : (trackInfoRef.current.title ? 'compact-music' : (isTimerRunning ? 'compact-timer' : 'idle'));
    };

    const cleanBattery = window.electronAPI.onBatteryUpdate ? window.electronAPI.onBatteryUpdate(({ pct, charging, minsLeft, changed, isInitial }) => {
      setBattery({ pct, charging, minsLeft });
      if (isInitial) return;
      if (changed && (pct <= 20 || charging)) {
        setActiveState((prev) => {
          if (prev === 'expanded-call' || prev === 'compact-call') return prev; // never interrupt an active call
          if (!isOverlayState(prev)) preOverlayStateRef.current = prev;
          return 'expanded-battery';
        });
        clearTimeout(batteryDismiss.current);
        batteryDismiss.current = setTimeout(() => setActiveState((prev) => prev === 'expanded-battery' ? resumeFromOverlay() : prev), 5000);
      }
    }) : null;

    const cleanVolume = window.electronAPI.onVolumeUpdate ? window.electronAPI.onVolumeUpdate(({ vol, isUserAction, changed, isInitial }) => {
      setVolume(vol);
      // Do not trigger the top volume-osd overlay during initial silent sync or background polling when volume hasn't changed
      if (isInitial) return;
      if (isUserAction || (changed && isUserAction !== false)) {
        setActiveState((prev) => {
          if (prev === 'expanded-call' || prev === 'compact-call') return prev; // never interrupt an active call
          if (!isOverlayState(prev)) preOverlayStateRef.current = prev;
          return 'volume-osd';
        });
        clearTimeout(volumeDismiss.current);
        volumeDismiss.current = setTimeout(() => setActiveState((prev) => prev === 'volume-osd' ? resumeFromOverlay() : prev), 2000);
      }
    }) : null;

    if (window.electronAPI?.getBluetoothState) {
      window.electronAPI.getBluetoothState().then((data) => {
        if (data && data.deviceName) {
          setBluetoothData(data);
        }
      }).catch(() => {});
    }

    const cleanBT = window.electronAPI?.onBluetoothUpdate
      ? window.electronAPI.onBluetoothUpdate((data) => {
          if (data && data.deviceName) {
            const timestamped = { ...data, timestamp: Date.now() };
            setBluetoothData(timestamped);
            if (data.isInitial && !data.forceShow && data.typeStr !== 'phone') return;
            setIsDocked(false);
            soundEngine.playChime();
            setActiveState((prev) => {
              if (prev === 'expanded-call' || prev === 'compact-call') return prev;
              if (!isOverlayState(prev)) preOverlayStateRef.current = prev;
              return 'expanded-bluetooth';
            });
            clearTimeout(bluetoothDismiss.current);
            bluetoothDismiss.current = setTimeout(() => {
              setActiveState((prev) => prev === 'expanded-bluetooth' ? resumeFromOverlay() : prev);
            }, 6200);
          }
        })
      : () => {};

    const cleanCall = window.electronAPI?.onCallUpdate
      ? window.electronAPI.onCallUpdate((data) => {
          if (!data || !data.state || data.state === 'ended') {
            setCallData(null);
            setActiveState((prev) => (prev === 'expanded-call' || prev === 'compact-call') ? resumeFromOverlay() : prev);
          } else if (data.state === 'incoming' || data.state === 'active') {
            setCallData(data);
            setActiveState((prev) => {
              if (!isOverlayState(prev)) preOverlayStateRef.current = prev;
              return 'expanded-call';
            });
          }
        })
      : () => {};

    const cleanScreenshot = window.electronAPI?.onScreenshotCaptured
      ? window.electronAPI.onScreenshotCaptured((dataUrl) => {
          if (dataUrl) {
            setScreenshotData(dataUrl);
            setIsDocked(false);
            soundEngine.playChime();
            setActiveState((prev) => {
              if (!isOverlayState(prev)) preOverlayStateRef.current = prev;
              return 'expanded-screenshot';
            });
            clearTimeout(screenshotDismiss.current);
            screenshotDismiss.current = setTimeout(() => {
              setActiveState((prev) => prev === 'expanded-screenshot' ? resumeFromOverlay() : prev);
            }, 5000);
          }
        })
      : () => {};

    const cleanScreenRec = window.electronAPI?.onScreenRecUpdate
      ? window.electronAPI.onScreenRecUpdate((data) => {
          if (data && data.state === 'open') {
            setIsDocked(false);
            setActiveState('expanded-screenrec');
          } else if (data && data.state === 'close') {
            setActiveState((prev) => (prev === 'compact-screenrec' || prev === 'expanded-screenrec') ? resumeFromOverlay() : prev);
          }
        })
      : () => {};

    const cleanUsb = window.electronAPI?.onUsbConnected
      ? window.electronAPI.onUsbConnected((data) => {
          if (!data) return;
          setUsbData(data);
          setIsDocked(false);
          soundEngine.playChime();
          setActiveState((prev) => {
            if (!isOverlayState(prev)) preOverlayStateRef.current = prev;
            return 'expanded-usb';
          });
          clearTimeout(usbDismiss.current);
          usbDismiss.current = setTimeout(() => {
            setActiveState((prev) => prev === 'expanded-usb' ? resumeFromOverlay() : prev);
          }, 6000);
        })
      : () => {};

    const cleanUsbEjected = window.electronAPI?.onUsbEjected
      ? window.electronAPI.onUsbEjected((data) => {
          if (data && data.success) {
            soundEngine.playChime();
            setNotificationRef.current?.({
              icon: 'HardDrive',
              title: 'Drive Ejected',
              subtitle: 'It is now safe to disconnect your device.',
            });
            setActiveState('notification');
          }
        })
      : () => {};

    const cleanDiscord = window.electronAPI?.onDiscordVoiceUpdate
      ? window.electronAPI.onDiscordVoiceUpdate((data) => {
          if (!data) return;
          setDiscordVoice(data);
          if (data.speaking) {
            setIsDocked(false);
            setActiveState((prev) => {
              if (!isOverlayState(prev)) preOverlayStateRef.current = prev;
              return 'expanded-discord';
            });
            clearTimeout(discordDismiss.current);
          } else {
            clearTimeout(discordDismiss.current);
            discordDismiss.current = setTimeout(() => {
              setActiveState((prev) => prev === 'expanded-discord' ? resumeFromOverlay() : prev);
            }, 3000);
          }
        })
      : () => {};

    if (window.electronAPI?.requestBluetoothStatus) {
      window.electronAPI.requestBluetoothStatus();
    }

    // Ask the main process for the current call state now that we're listening.
    if (window.electronAPI?.requestCallStatus) {
      window.electronAPI.requestCallStatus();
    }
    if (window.electronAPI?.requestTimerStatus) {
      window.electronAPI.requestTimerStatus();
    }

    return () => {
      cleanSpotify?.();
      cleanTimer?.();
      cleanBattery?.();
      cleanVolume?.();
      cleanBT?.();
      cleanCall?.();
      cleanScreenshot?.();
      cleanScreenRec?.();
      cleanUsb?.();
      cleanUsbEjected?.();
      cleanDiscord?.();
      clearTimeout(batteryDismiss.current);
      clearTimeout(bluetoothDismiss.current);
      clearTimeout(screenshotDismiss.current);
      clearTimeout(usbDismiss.current);
      clearTimeout(discordDismiss.current);
      if (volumeDismiss.current) clearTimeout(volumeDismiss.current);
    };
  }, [updateTrackData, setActiveState]);

  // ── 60fps Equalizer drive ────────────────────────────────────────────────
  // The oscillator loop lives in eqStore. The island only flips its play
  // state; bar updates re-render the visualizer components alone, not the
  // whole island tree.
  useEffect(() => {
    driveEq(!!trackInfo.isPlaying);
    return () => {
      driveEq(false);
    };
  }, [trackInfo.isPlaying]);

  // ── Window resize IPC ─────────────────────────────────────────────────────
  // Tracks the last size sent to main so we can tell it whether this
  // transition is growing or shrinking (see resize-window handler in
  // electron.js) — shrinks are delayed there until the CSS elastic-overshoot
  // transition finishes, so the real OS window never clips the bounce.
  const prevWindowSizeRef = useRef({ w: 250, h: 44 });
  const prevActiveStateRef = useRef(activeState);
  useEffect(() => {
    if (!window.electronAPI) return;
    const timerHeight = Math.max(82, timers.length * 56 + 26);
    const shelfCount = shelvedItems.length;
    const shelfRows = Math.max(1, Math.min(4, Math.ceil(shelfCount / 3)));
    const shelfHeight = 70 + shelfRows * 95;
    const weatherHeight = weatherSearchCount > 0 ? Math.min(330, 210 + weatherSearchCount * 36 + 14) : 210;
    const sizeMap = {
      'idle':              [250, 42],
      'compact-music':     [310, 44],
      'compact-timer':     [250, 42],
      'split':             [isScreenRecordingOngoing ? 410 : 340, 54],
      'expanded-music':    [356, 156],
      'expanded-lyrics':   [420, 320],
      'expanded-timer':    [480, timerHeight],
      'compact-call':      [280, 44],
      'expanded-call':     callData?.state === 'incoming' ? [380, 72] : [380, 140],
      'expanded-airdrop':  [380, 200],
      'expanded-recorder': [370, 205],
      'expanded-screenrec':[400, 214],
      'compact-screenrec': [110, 36],
      'expanded-battery':  [340, 85],
      'volume-osd':        [360, 85],
      'notification':      [400, 110],
      'expanded-weather':  [370, weatherHeight],
      'expanded-shelf':    [380, shelfHeight],
      'expanded-sysmon':   [370, 150],
      'expanded-launcher': [390, 185],
      'expanded-screenshot':[360, 90],
      'expanded-bluetooth': [376, 61],
      'expanded-usb':      [384, 68],
      'expanded-discord':  [370, 76],
      'compact-live-activity': [300, 44],
      'expanded-live-activity': [380, 160],
    };
    const [w, h] = sizeMap[activeState] || [250, 44];
    const prev = prevWindowSizeRef.current;
    const isStateChange = prevActiveStateRef.current !== activeState;
    prevActiveStateRef.current = activeState;

    const growing = w > prev.w || h > prev.h;
    const shrinking = w < prev.w || h < prev.h;
    prevWindowSizeRef.current = { w, h };
    window.electronAPI?.resizeWindow?.(w, h, growing);

    if (isStateChange && prev.w > 0 && (growing || shrinking) && activeState !== 'split') {
      setMorphClass(growing ? 'morph-expand' : 'morph-collapse');
      if (morphTimeoutRef.current) clearTimeout(morphTimeoutRef.current);
      morphTimeoutRef.current = setTimeout(() => {
        setMorphClass('');
      }, 440);
    }

    return () => {
      if (morphTimeoutRef.current) clearTimeout(morphTimeoutRef.current);
    };
  }, [activeState, callData?.state, timers.length, shelvedItems.length, weatherSearchCount, isScreenRecordingOngoing]);

  // ── State class map ───────────────────────────────────────────────────────
  const getStateClass = () => {
    return {
      'idle':              'state-idle',
      'compact-music':     'state-compact-music',
      'compact-timer':     'state-compact-timer',
      'split':             'state-split',
      'expanded-music':    'state-expanded-music',
      'expanded-lyrics':   'state-expanded-lyrics',
      'expanded-timer':    'state-expanded-timer',
      'compact-call':      'state-compact-call',
      'expanded-call':     callData?.state === 'incoming' ? 'state-incoming-call' : 'state-expanded-call',
      'expanded-airdrop':  'state-expanded-airdrop',
      'expanded-recorder': 'state-expanded-recorder',
      'expanded-screenrec':'state-expanded-screenrec',
      'compact-screenrec': 'state-compact-screenrec',
      'expanded-battery':  'state-expanded-battery',
      'volume-osd':        'state-volume-osd',
      'notification':      'state-notification',
      'expanded-weather':  'state-expanded-weather',
      'expanded-shelf':    'state-expanded-shelf',
      'expanded-sysmon':   'state-expanded-sysmon',
      'expanded-launcher': 'state-expanded-launcher',
      'expanded-screenshot':'state-expanded-screenshot',
      'expanded-bluetooth':'state-expanded-bluetooth',
      'expanded-usb':      'state-expanded-usb',
      'expanded-discord':  'state-expanded-discord',
      'compact-live-activity': 'state-compact-live-activity',
      'expanded-live-activity': 'state-expanded-live-activity',
    }[activeState] || 'state-idle';
  };

  // 100% Solid Opaque background gradient (strictly #000000 when idle)

  // ── Mouse Passthrough Management ──────────────────────────────────────────
  // The renderer window is intentionally larger than the visible pill so it
  // can animate into its expanded states.  Never leave that transparent area
  // interactive: it would block clicks on the desktop/apps underneath.  When
  // Electron is ignoring the window, forwarded mousemove events still arrive
  // here, so use the actual pill bounds to opt back in before a click occurs.
  useEffect(() => {
    const setIgnore = window.electronAPI?.setIgnoreMouseEvents;
    if (!setIgnore) return undefined;
    const shouldCaptureExpandedSurface =
      activeState.startsWith('expanded-') ||
      activeState === 'volume-osd' ||
      activeState === 'notification';

    const isInside = (rect, x, y) => (
      rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );

    let lastIgnoreState = null;
    let mouseCheckRaf = null;

    const syncMousePassthrough = (event) => {
      if (isDraggingRef.current || isCapsulePressedRef.current) {
        if (lastIgnoreState !== false) {
          lastIgnoreState = false;
          setIgnore(false);
        }
        return;
      }
      if (mouseCheckRaf) return;
      const x = event.clientX;
      const y = event.clientY;
      mouseCheckRaf = requestAnimationFrame(() => {
        mouseCheckRaf = null;
        const primary = capsuleRef.current?.getBoundingClientRect();
        const secondary = secondaryCapsuleRef.current?.getBoundingClientRect();
        const overPill = isInside(primary, x, y) || isInside(secondary, x, y);
        const shouldIgnore = !overPill;
        if (shouldIgnore !== lastIgnoreState) {
          lastIgnoreState = shouldIgnore;
          setIgnore(shouldIgnore);
        }
      });
    };
    const handleWindowLeave = () => {
      if (mouseCheckRaf) {
        cancelAnimationFrame(mouseCheckRaf);
        mouseCheckRaf = null;
      }
      if (lastIgnoreState !== true) {
        lastIgnoreState = true;
        setIgnore(true);
      }
    };

    const handleBlur = () => {
      isDraggingRef.current = false;
      isCapsulePressedRef.current = false;
      if (mouseCheckRaf) {
        cancelAnimationFrame(mouseCheckRaf);
        mouseCheckRaf = null;
      }
      if (lastIgnoreState !== true) {
        lastIgnoreState = true;
        setIgnore(true);
      }
    };

    // Expanded widgets contain real controls, so hold the Electron window in
    // interactive mode immediately.
    const initialIgnore = !shouldCaptureExpandedSurface;
    lastIgnoreState = initialIgnore;
    setIgnore(initialIgnore);
    window.addEventListener('mousemove', syncMousePassthrough, { capture: true, passive: true });
    window.addEventListener('mouseleave', handleWindowLeave, { capture: true, passive: true });
    window.addEventListener('blur', handleBlur, { capture: true, passive: true });

    return () => {
      if (mouseCheckRaf) cancelAnimationFrame(mouseCheckRaf);
      window.removeEventListener('mousemove', syncMousePassthrough, { capture: true });
      window.removeEventListener('mouseleave', handleWindowLeave, { capture: true });
      window.removeEventListener('blur', handleBlur, { capture: true });
      setIgnore(true);
    };
  }, [activeState]);

  const handleMouseEnter = () => {
    setIsDocked(false);
    if (window.electronAPI?.setIgnoreMouseEvents) {
      window.electronAPI.setIgnoreMouseEvents(false);
    }
  };

  const handleMouseLeave = () => {
    if (window.electronAPI?.setIgnoreMouseEvents) {
      window.electronAPI.setIgnoreMouseEvents(true);
    }
  };

  // ── Escape Key Collapse Listener ──────────────────────────────────────────
  useEffect(() => {
    const handleEscape = () => {
      setActiveState((prev) => {
        if (prev === 'idle') return prev;
        if (prev === 'expanded-call') return 'compact-call';
        if (prev === 'compact-call') return prev;
        if (isScreenRecordingOngoing || isTimerActive) return 'split';
        if (trackInfo.title) return 'compact-music';
        return 'idle';
      });
      if (window.electronAPI?.setIgnoreMouseEvents) {
        window.electronAPI.setIgnoreMouseEvents(true);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        handleEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const unsubIPC = window.electronAPI?.onEscapePressed
      ? window.electronAPI.onEscapePressed(handleEscape)
      : () => {};

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsubIPC();
    };
  }, [trackInfo.title, isTimerActive, setActiveState, isScreenRecordingOngoing]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveState((prev) => prev === 'expanded-launcher' ? (trackInfo.title ? 'compact-music' : 'idle') : 'expanded-launcher');
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragDepthRef.current++;
    setIsDraggingOverIsland(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDraggingOverIsland(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverIsland(true);
    if (activeState !== 'expanded-shelf') {
      setActiveState('expanded-shelf');
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDraggingOverIsland(false);
    const rawFiles = Array.from(e.dataTransfer?.files || []);
    const items = await Promise.all(
      rawFiles.map(async (f) => {
        let resolvedPath = f.path;
        if ((!resolvedPath || resolvedPath === '') && window.electronAPI?.getPathForFile) {
          try {
            resolvedPath = window.electronAPI.getPathForFile(f);
          } catch {}
        }
        let iconUrl = null;
        if (resolvedPath && window.electronAPI?.getFileIcon) {
          try {
            iconUrl = await window.electronAPI.getFileIcon(resolvedPath);
          } catch {}
        }
        const filename = f.name;
        const hasDot = filename.includes('.') && !filename.startsWith('.');
        const ext = hasDot ? filename.split('.').pop().toLowerCase() : '';
        const isShortcutOrFile = ext === 'lnk' || ext === 'url' || ext === 'exe' || (ext.length > 0 && ext.length <= 5);
        const isFolder = !isShortcutOrFile && (f.type?.includes('folder') || f.type === 'directory' || !ext);
        const displayName = f.name.replace(/\.lnk$/i, '').replace(/\.exe$/i, '').replace(/\.url$/i, '');
        return {
          name: displayName,
          type: isFolder ? 'folder' : (f.type || 'file'),
          path: resolvedPath || f.path || f.name,
          iconUrl: iconUrl,
        };
      })
    );
    const textData = e.dataTransfer?.getData('text');
    if (textData && (!items.length || !items.some((i) => i.text === textData))) {
      items.push({ name: textData.slice(0, 35), text: textData, type: 'text/plain', iconUrl: null });
    }
    if (items.length > 0) {
      setShelvedItems((prev) => [...prev, ...items].slice(0, 12));
    }
  };

  const handleOpenItem = (item) => {
    const targetPath = item.path || item.name;
    if (targetPath && window.electronAPI?.openPath) {
      window.electronAPI.openPath(targetPath);
    }
  };

  const handleLaunchApp = (cmd) => {
    if (cmd === 'screenshot') {
      if (window.electronAPI?.takeScreenshot) {
        window.electronAPI.takeScreenshot();
      }
      return;
    }
    if (cmd === 'screenrec') {
      setActiveState('expanded-screenrec');
      return;
    }
    if (cmd === 'timer') {
      if (window.electronAPI?.requestTimerStatus) {
        window.electronAPI.requestTimerStatus();
      }
      if (timerStore.getTimers().length === 0) {
        timerStore.addTimer();
      }
      setActiveState('expanded-timer');
      return;
    }
    if (cmd === 'settings') {
      if (window.electronAPI?.openSettingsWindow) {
        window.electronAPI.openSettingsWindow();
      }
      setActiveState(isScreenRecordingOngoing || isTimerActive ? 'split' : (trackInfo.title ? 'compact-music' : 'idle'));
      return;
    }
    if (window.electronAPI?.launchApp) {
      window.electronAPI.launchApp(cmd);
    }
    setActiveState(isScreenRecordingOngoing || isTimerActive ? 'split' : (trackInfo.title ? 'compact-music' : 'idle'));
  };

  const handleIslandClick = (e) => {
    if (isDraggingRef.current) return;
    if (e.defaultPrevented) return;
    if (activeState === 'expanded-screenrec') return;
    if (e.target && (e.target.closest('button') || e.target.closest('input') || e.target.closest('svg') || e.target.closest('.interactive-child'))) {
      return;
    }
    e.stopPropagation();
    clearTimeout(bluetoothDismiss.current);
    clearTimeout(batteryDismiss.current);
    clearTimeout(screenshotDismiss.current);
    clearTimeout(volumeDismiss.current);

    if (activeState.startsWith('expanded-') || activeState === 'volume-osd') {
      if (activeState === 'expanded-call') {
        setActiveState('compact-call');
      } else {
        setActiveState(isScreenRecordingOngoing || isTimerActive ? 'split' : (trackInfo.title ? 'compact-music' : 'idle'));
      }
    } else if (activeState === 'compact-call') {
      setActiveState('expanded-call');
    } else if (activeState === 'compact-timer') {
      setActiveState('expanded-timer');
    } else if (trackInfo.title) {
      setActiveState('expanded-music');
    } else if (isTimerActive) {
      setActiveState('expanded-timer');
    } else {
      setActiveState('expanded-weather');
    }
  };

  const handleTogglePlay = () => {
    userToggleLockRef.current = Date.now();
    window.electronAPI?.sendMediaControl?.('toggle');
    setTrackInfo((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleNext = () => {
    userToggleLockRef.current = Date.now();
    window.electronAPI?.sendMediaControl?.('next');
  };
  const handlePrev = () => {
    userToggleLockRef.current = Date.now();
    window.electronAPI?.sendMediaControl?.('previous');
  };

  const handleSeek = (newProgressMs) => {
    setTrackInfo((prev) => ({ ...prev, progressMs: newProgressMs }));
    if (window.electronAPI?.sendMediaControl) {
      window.electronAPI.sendMediaControl({ action: 'seek', posMs: newProgressMs });
    }
  };

  // ── Eq bar color & glow ───────────────────────────────────────────────────
  const { r, g, b } = displayAccentColor;
  const smoothR = Math.round(r);
  const smoothG = Math.round(g);
  const smoothB = Math.round(b);
  const eqColor  = `rgb(${smoothR},${smoothG},${smoothB})`;
  const eqGlow   = `rgba(${smoothR},${smoothG},${smoothB},0.42)`;
  const progGrad = `linear-gradient(90deg, rgb(${smoothR},${smoothG},${smoothB}), rgba(${smoothR},${smoothG},${smoothB},0.75))`;

  const isSplitLayout = activeState === 'split';
  const isRecordingSidePill = isScreenRecordingOngoing;
  const isPrimaryMusicInSplit = isSplitLayout && Boolean(trackInfo.title);

  return (
    <motion.div 
      className="island-anchor" 
      onMouseEnter={(e) => { handleMouseEnter(e); setIsCapsuleHovered(true); }} 
      onMouseLeave={(e) => { setIsCapsuleHovered(false); handleMouseLeave(e); }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.45}
      dragSnapToOrigin={true}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 28, power: 0.12 }}
      onDragStart={() => {
        isDraggingRef.current = true;
        setIsDocked(false);
        resetIdleTimer();
      }}
      onDragEnd={() => {
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = setTimeout(() => {
          isDraggingRef.current = false;
        }, 80);
        resetIdleTimer();
      }}
    >
      {/* Invisible top edge hit trigger region to wake up auto-hidden island on mouse hover */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 360,
          height: 32,
          zIndex: 9999,
          pointerEvents: activeState === 'idle' ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => {
          resetIdleTimer();
          handleMouseEnter(e);
          setIsCapsuleHovered(true);
        }}
        onMouseMove={resetIdleTimer}
      />

      <div className="island-split-container">
        {/* Primary Capsule */}
        <div
          ref={capsuleRef}
          style={{
            '--shelf-dynamic-height': `${70 + Math.max(1, Math.min(4, Math.ceil(shelvedItems.length / 3))) * 95}px`,
            '--weather-dynamic-height': `${weatherSearchCount > 0 ? Math.min(330, 210 + weatherSearchCount * 36 + 14) : 210}px`,
          }}
          className={`island-capsule ${isSplitLayout ? 'primary-split' : ''} ${getStateClass()} ${morphClass} ${isLight ? 'theme-light' : 'theme-dark'} ${isDocked ? 'is-docked' : ''} ${isCapsulePressed ? 'is-pressed' : ''} ${isDraggingOverIsland ? 'shelf-absorption-active' : ''}`}
          onClick={(e) => { resetIdleTimer(); handleIslandClick(e); }}
          onMouseEnter={(e) => { resetIdleTimer(); handleMouseEnter(e); setIsCapsuleHovered(true); }}
          onMouseLeave={(e) => { handleMouseLeave(e); setIsCapsuleHovered(false); }}
          onMouseMove={resetIdleTimer}
          onMouseDown={() => setIsCapsulePressed(true)}
          onMouseUp={() => setIsCapsulePressed(false)}
          onContextMenu={handleContextMenu}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <ThemeCanvas
            containerRef={capsuleRef}
            isHovered={isCapsuleHovered}
            isPressed={isCapsulePressed}
            accentColor={isPrimaryMusicInSplit ? eqColor : (trackInfo.title ? eqColor : '#ffffff')}
          />
          {/* macOS Privacy Indicator (Camera & Mic Active Dots) */}
          <div style={{ position: 'absolute', top: 5, right: 8, zIndex: 99, pointerEvents: 'auto' }}>
            <PrivacyIndicator isLight={isLight} />
          </div>
          {/* Smooth organic moving liquid aura background — Beat-Synced Equalizer Glow Pulse with 0.75s Silk Fade */}
          {(activeState === 'expanded-music' || activeState === 'expanded-lyrics') && !!trackInfo?.title && (
            <LiquidAura
              isEnabled={devicePrefs?.musicAura !== false}
              isLight={isLight}
              isPlaying={trackInfo?.isPlaying}
              eqColor={eqColor}
              smoothR={smoothR}
              smoothG={smoothG}
              smoothB={smoothB}
            />
          )}

          <div className="activity-fade-content" key={isSplitLayout ? 'split-primary' : (activeState === 'expanded-screenrec' || activeState === 'compact-screenrec') ? 'screenrec' : (activeState === 'expanded-music' || activeState === 'compact-music' || activeState === 'expanded-lyrics') ? 'music' : (activeState === 'expanded-call' || activeState === 'compact-call') ? 'call' : activeState}>
            {isSplitLayout && (
              isPrimaryMusicInSplit ? (
                <MusicWidget
                  isSplit={true}
                  isLight={isLight}
                  trackInfo={trackInfo}
                  eqColor={eqColor}
                  eqGlow={eqGlow}
                  progressGradient={progGrad}
                />
              ) : (
                <IdleWidget weatherConfig={weatherConfig} isLight={isLight} />
              )
            )}

            {!isSplitLayout && activeState === 'idle' && <IdleWidget isLight={isLight} weatherConfig={weatherConfig} />}

          {isMusicState && (
            <MusicWidget
              isCompact={activeState === 'compact-music'}
              isExpanded={activeState === 'expanded-music' || activeState === 'expanded-lyrics'}
              isLyricsView={activeState === 'expanded-lyrics'}
              isLight={isLight}
              isDndActive={isDndActive}
              isDndVisible={isDndVisible}
              onToggleLyrics={() => setActiveState((prev) => prev === 'expanded-lyrics' ? 'expanded-music' : 'expanded-lyrics')}
              trackInfo={trackInfo}
              eqColor={eqColor}
              eqGlow={eqGlow}
              progressGradient={progGrad}
              onExpand={() => setActiveState('expanded-music')}
              onTogglePlay={handleTogglePlay}
              onNext={handleNext}
              onPrev={handlePrev}
              onSeek={handleSeek}
            />
          )}

          {(activeState === 'compact-timer' || activeState === 'expanded-timer') && (
            <TimerWidget
              isCompact={activeState === 'compact-timer'}
              isExpanded={activeState === 'expanded-timer'}
              onExpand={() => setActiveState('expanded-timer')}
            />
          )}

          {activeState === 'compact-call' && (
            <CallWidget callData={callData} isCompact={true} onEndCall={() => setActiveState('idle')} />
          )}
          {activeState === 'expanded-call' && (
            <CallWidget callData={callData} onEndCall={() => setActiveState('idle')} />
          )}
          {activeState === 'expanded-airdrop' && (
            <AirDropWidget onComplete={() => setActiveState('compact-music')} />
          )}
          {activeState === 'expanded-recorder' && (
            <VoiceMemoWidget onStop={() => setActiveState('idle')} />
          )}
          {activeState === 'expanded-battery' && (
            <BatteryWidget pct={battery?.pct} charging={battery?.charging} minsLeft={battery?.minsLeft} />
          )}
          {activeState === 'volume-osd' && <VolumeOSDWidget volume={volume} />}
          {activeState === 'notification' && notification && (
            <NotificationWidget notification={notification} onClose={onClearNotification} />
          )}
          {activeState === 'expanded-weather' && (
            <WeatherWidget
              isLight={isLight}
              weatherConfig={weatherConfig}
              onSuggestionsChange={setWeatherSearchCount}
              onUpdateWeather={(updated) => {
                if (updated) {
                  setWeatherConfig((prev) => {
                    const next = { ...prev, ...updated };
                    try { localStorage.setItem('winland_live_weather', JSON.stringify(next)); } catch {}
                    return next;
                  });
                }
              }}
            />
          )}

          {/* New Filtered Implementation Plan Widgets */}
          {activeState === 'expanded-shelf' && (
            <ShelfWidget
              shelvedItems={shelvedItems}
              onRemoveItem={(idx) => setShelvedItems((prev) => prev.filter((_, i) => i !== idx))}
              onClearAll={() => setShelvedItems([])}
              onOpenItem={handleOpenItem}
            />
          )}
          {activeState === 'expanded-sysmon' && <SystemMonitorWidget stats={sysStats} />}
          {activeState === 'expanded-launcher' && (
            <LauncherWidget isLight={isLight} onLaunchApp={handleLaunchApp} isDndActive={isDndActive} onClose={() => setActiveState('idle')} />
          )}
          {/* Settings now opens in its own Electron window (see electron.js
              createSettingsWindow / openSettingsWindow) - there is no
              SettingsWidget component in this tree anymore. The old
              'expanded-settings' render branch referenced an undefined
              component and would have crashed if that state were ever set. */}
          {activeState === 'expanded-screenshot' && (
            <ScreenshotWidget imageSrc={screenshotData} onDismiss={() => setActiveState('idle')} />
          )}
          {activeState === 'expanded-usb' && <UsbWidget data={usbData} />}
          {activeState === 'expanded-discord' && <DiscordWidget data={discordVoice} />}
          {(activeState === 'compact-screenrec' || activeState === 'expanded-screenrec') && (
            <ScreenRecorderWidget
              isCompact={activeState === 'compact-screenrec'}
              onExpand={() => setActiveState('expanded-screenrec')}
              onMinimize={() => setActiveState(isScreenRecordingOngoing ? 'split' : 'idle')}
              onStop={() => setActiveState('idle')}
            />
          )}
          {activeState === 'expanded-bluetooth' && (
            <BluetoothWidget
              key={`${bluetoothData.deviceName}-${bluetoothData.connectionState}`}
              deviceName={bluetoothData.deviceName}
              batteryPct={bluetoothData.batteryPct}
              isCharging={bluetoothData.isCharging}
              leftPct={bluetoothData.leftPct}
              rightPct={bluetoothData.rightPct}
              typeStr={bluetoothData.typeStr}
              connectionState={bluetoothData.connectionState || 'connected'}
            />
          )}
          {activeState === 'compact-live-activity' && (
            <LiveActivitiesWidget isCompact={true} onExpand={() => setActiveState('expanded-live-activity')} />
          )}
          {activeState === 'expanded-live-activity' && (
            <LiveActivitiesWidget onExpand={() => setActiveState('expanded-live-activity')} />
          )}

        </div>
      </div>

      {/* Secondary Capsule on Right Side with Smooth Pop-in / Pop-out Spring Animation */}
      <AnimatePresence mode="popLayout">
        {isSplitLayout && (
          <motion.div
            key="secondary-pill"
            ref={secondaryCapsuleRef}
            initial={{ scale: 0.25, opacity: 0, x: -16, filter: 'blur(6px)' }}
            animate={{
              scale: 1,
              opacity: 1,
              x: 0,
              filter: 'blur(0px)',
              transition: {
                type: 'spring',
                stiffness: 480,
                damping: 26,
                mass: 0.7,
              },
            }}
            exit={{
              scale: 0.25,
              opacity: 0,
              x: -16,
              filter: 'blur(6px)',
              transition: {
                duration: 0.2,
                ease: [0.32, 0.72, 0, 1],
              },
            }}
            className={`island-capsule island-capsule-secondary ${isRecordingSidePill ? 'secondary-screenrec' : ''} ${isLight ? 'theme-light' : 'theme-dark'} ${isDocked ? 'is-docked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              resetIdleTimer();
              if (isRecordingSidePill) {
                setActiveState('expanded-screenrec');
              } else {
                setActiveState('expanded-timer');
              }
            }}
            onMouseEnter={(e) => { resetIdleTimer(); handleMouseEnter(e); setIsSecondaryHovered(true); }}
            onMouseLeave={(e) => { handleMouseLeave(e); setIsSecondaryHovered(false); }}
            onMouseMove={resetIdleTimer}
            onMouseDown={() => setIsSecondaryPressed(true)}
            onMouseUp={() => setIsSecondaryPressed(false)}
            title={isRecordingSidePill ? "Screen Recording (Click to expand Studio)" : "Click to expand Timer"}
          >
            <ThemeCanvas
              containerRef={secondaryCapsuleRef}
              isHovered={isSecondaryHovered}
              isPressed={isSecondaryPressed}
              accentColor={isRecordingSidePill ? (isScreenRecordingPaused ? '#f59e0b' : '#ff453a') : '#ff9f0a'}
            />
            <div className="activity-fade-content" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isRecordingSidePill ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                    padding: '0 4px',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                  }}
                >
                  {/* Status dot + Timer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: isScreenRecordingPaused ? '#f59e0b' : '#ff453a',
                        boxShadow: isScreenRecordingPaused
                          ? '0 0 6px rgba(245,158,11,0.6)'
                          : '0 0 8px rgba(255,69,58,0.5)',
                        animation: isScreenRecordingActive ? 'pulse 1.2s infinite ease-in-out' : 'none',
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
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isScreenRecordingPaused ? 'PAUSED' : formattedTime}
                    </span>
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 1px' }} />

                  {/* Pause / Resume button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isScreenRecordingPaused) resumeRecording();
                      else pauseRecording();
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: 'none',
                      background: isScreenRecordingPaused ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.12s ease',
                      flexShrink: 0,
                    }}
                    title={isScreenRecordingPaused ? 'Resume' : 'Pause'}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.background = isScreenRecordingPaused ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = isScreenRecordingPaused ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.1)'; }}
                  >
                    {isScreenRecordingPaused ? (
                      <Play size={9} color="#f59e0b" fill="#f59e0b" style={{ marginLeft: 1 }} />
                    ) : (
                      <Pause size={9} color="#fff" fill="#fff" />
                    )}
                  </button>

                  {/* Stop button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopRecording();
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: 'none',
                      background: 'rgba(255,69,58,0.2)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.12s ease',
                      flexShrink: 0,
                    }}
                    title="Stop & Save Recording"
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.background = 'rgba(255,69,58,0.35)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,69,58,0.2)'; }}
                  >
                    <Square size={8} color="#ff453a" fill="#ff453a" />
                  </button>
                </div>
              ) : (
                <TimerWidget
                  isSplit={true}
                  onExpand={() => setActiveState('expanded-timer')}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

      {/* Official 1:1 macOS Dark Translucent Glass Focus / Do Not Disturb Badge */}
      {shouldRenderDnd && activeState !== 'compact-music' && activeState !== 'split' && activeState !== 'expanded-launcher' && (
        <button
          title="Focus Mode / Do Not Disturb Active (Click to toggle)"
          onClick={(e) => {
            e.stopPropagation();
            if (window.electronAPI?.toggleDnd) window.electronAPI.toggleDnd();
          }}
          style={{
            position: 'absolute',
            top: activeState.startsWith('expanded-') ? 14 : 9,
            right: (activeState === 'expanded-music' || activeState === 'expanded-lyrics') ? 52 : (activeState.startsWith('expanded-') ? 16 : 14),
            background: 'rgba(94, 92, 230, 0.24)',
            border: '1px solid rgba(135, 133, 255, 0.38)',
            borderRadius: 14,
            padding: activeState.startsWith('expanded-') ? '3.5px 9px' : '3.5px 7px',
            cursor: 'pointer',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            opacity: isDndVisible ? 1 : 0,
            transform: isDndVisible ? 'scale(1) translateY(0)' : 'scale(0.72) translateY(-4px)',
            filter: isDndVisible ? 'blur(0px)' : 'blur(4px)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.22)',
            transition: 'opacity 0.28s cubic-bezier(0.32, 1.25, 0.36, 1), transform 0.28s cubic-bezier(0.32, 1.25, 0.36, 1), filter 0.28s ease, background 0.2s ease, box-shadow 0.2s ease',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
          onMouseEnter={(e) => {
            if (!isDndVisible) return;
            e.currentTarget.style.transform = 'scale(1.06) translateY(-1px)';
            e.currentTarget.style.background = 'rgba(94, 92, 230, 0.42)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(94, 92, 230, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.35)';
          }}
          onMouseLeave={(e) => {
            if (!isDndVisible) return;
            e.currentTarget.style.transform = 'scale(1.0) translateY(0)';
            e.currentTarget.style.background = 'rgba(94, 92, 230, 0.24)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.22)';
          }}
        >
          <Moon size={11} color="#a5a3ff" fill="#a5a3ff" />
          {activeState.startsWith('expanded-') && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 650,
                color: '#e4e3ff',
                letterSpacing: '-0.2px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              Do Not Disturb
            </span>
          )}
        </button>
      )}

    </motion.div>
  );
}

