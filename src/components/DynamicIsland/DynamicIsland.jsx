import React, { useState, useEffect, useRef, useCallback } from 'react';
import MusicWidget from '../Activities/MusicWidget';
import TimerWidget from '../Activities/TimerWidget';
import CallWidget from '../Activities/CallWidget';
import AirDropWidget from '../Activities/AirDropWidget';
import VoiceMemoWidget from '../Activities/VoiceMemoWidget';
import ScreenRecorderWidget from '../Activities/ScreenRecorderWidget';
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
import { soundEngine } from '../../utils/soundEngine';
import ThemeCanvas from '../../theme/ThemeCanvas';
import { themeManager } from '../../theme/ThemeManager';
import { Moon } from 'lucide-react';
import { timerStore } from '../../features/timer/TimerStore';


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
// Irrational-ratio oscillator bank — 60fps organic visualizer
// ─────────────────────────────────────────────────────────────────────────────
const EQ_FREQS   = [1.0000, 1.6180, 2.4142, 3.3166, 4.2361];
const EQ_PHASES  = [0.00,   1.10,   2.30,   0.70,   3.50 ];
const EQ_AMPS    = [42,     55,     38,     60,     46   ];
const EQ_OFFSETS = [30,     28,     32,     25,     34   ];

function computeBarHeightsWithGain(t, gain) {
  return EQ_FREQS.map((f, i) => {
    const animatedVal = EQ_OFFSETS[i]
      + EQ_AMPS[i] * (
          0.55 * Math.sin(t * f              + EQ_PHASES[i]         ) +
          0.30 * Math.cos(t * f * 1.7321     + EQ_PHASES[i] * 0.618 ) +
          0.15 * Math.sin(t * f * 2.2360     + EQ_PHASES[i] * 1.414 )
        );
    const val = 3 + (animatedVal - 3) * gain;
    return Math.max(3, Math.min(100, Math.round(val)));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 100% SOLID OPAQUE background gradient — ZERO text bleed-through!
// ─────────────────────────────────────────────────────────────────────────────
function buildPillBg(accent, expanded, isPlaying, isLight) {
  if (!expanded || !isPlaying || !accent) {
    return isLight ? 'rgba(255, 255, 255, 0.94)' : '#000000';
  }
  const { r, g, b } = accent;

  if (isLight) {
    const r1 = Math.min(255, Math.round(r * 0.54 + 180));
    const g1 = Math.min(255, Math.round(g * 0.54 + 180));
    const b1 = Math.min(255, Math.round(b * 0.54 + 180));
    return `linear-gradient(135deg, rgb(${r1},${g1},${b1}) 0%, rgba(255, 255, 255, 0.96) 65%, #FFFFFF 100%)`;
  }

  const r1 = Math.min(255, Math.round(r * 0.40));
  const g1 = Math.min(255, Math.round(g * 0.40));
  const b1 = Math.min(255, Math.round(b * 0.40));

  const r2 = Math.min(255, Math.round(r * 0.16));
  const g2 = Math.min(255, Math.round(g * 0.16));
  const b2 = Math.min(255, Math.round(b * 0.16));

  const r3 = Math.min(255, Math.round(r * 0.05));
  const g3 = Math.min(255, Math.round(g * 0.05));
  const b3 = Math.min(255, Math.round(b * 0.05));

  return `linear-gradient(135deg, rgb(${r1},${g1},${b1}) 0%, rgb(${r2},${g2},${b2}) 35%, rgb(${r3},${g3},${b3}) 65%, #000000 100%)`;
}

export default function DynamicIsland({
  activeState,
  setActiveState,
  notification,
  onClearNotification,
}) {
  const [trackInfo, setTrackInfo] = useState(IDLE_TRACK);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [displayAccentColor, setDisplayAccentColor] = useState(DEFAULT_ACCENT);
  const [barHeights, setBarHeights] = useState([3, 3, 3, 3, 3]);
  const [battery, setBattery] = useState({ pct: 0, charging: false, minsLeft: -1 });
  const [volume, setVolume] = useState(50);
  const [shelvedItems, setShelvedItems] = useState([]);
  const [sysStats, setSysStats] = useState({ cpu: 22, ram: 54, gpu: 30 });
  const [screenshotData, setScreenshotData] = useState(null);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('winland_theme_mode') || themeManager.getMode() || 'dark');
  const [weatherConfig, setWeatherConfig] = useState({ weatherUnit: 'C' });
  const [devicePrefs, setDevicePrefs] = useState(() => {
    try {
      const savedDuration = localStorage.getItem('winland_autohide_duration');
      const savedIdle = localStorage.getItem('winland_autohide_idle');
      return {
        autoHideIdle: savedIdle !== 'false',
        autoHideDuration: savedDuration ? parseInt(savedDuration, 10) : 10,
      };
    } catch {
      return { autoHideIdle: true, autoHideDuration: 10 };
    }
  });

  useEffect(() => {
    if (!window.electronAPI?.onDevicePrefsUpdate) return;
    const unsub = window.electronAPI.onDevicePrefsUpdate((prefs) => {
      if (prefs) {
        setDevicePrefs((prev) => ({ ...prev, ...prefs }));
      }
    });
    return () => unsub();
  }, []);
  const [callData, setCallData] = useState(null);
  const capsuleRef = useRef(null);
  const secondaryCapsuleRef = useRef(null);
  const [isCapsuleHovered, setIsCapsuleHovered] = useState(false);
  const [isCapsulePressed, setIsCapsulePressed] = useState(false);
  // Independent hover/press tracking for the secondary (Timer) split capsule -
  // it must not share the primary capsule's interaction state, or hovering/
  // pressing one pill incorrectly lights up the other's glass shimmer.
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false);
  const [isSecondaryPressed, setIsSecondaryPressed] = useState(false);
  const [bluetoothData, setBluetoothData] = useState({
    deviceName: 'AirPods Pro',
    batteryPct: 88,
    isCharging: false,
    leftPct: null,
    rightPct: null,
  });
  const isLight = themeMode === 'light';



  const isMusicState = activeState === 'compact-music' || activeState === 'expanded-music' || activeState === 'expanded-lyrics';

  // Compute real-time beat pulse from equalizer heights when music is playing
  const beatPulse = isMusicState && trackInfo?.isPlaying
    ? (barHeights.reduce((sum, h) => sum + h, 0) / 75)
    : 0;

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

  // ── Config sync (weatherUnit, temperature, autoHide, hideInFullscreen) ──────
  useEffect(() => {
    if (window.electronAPI?.getInitialConfig) {
      window.electronAPI.getInitialConfig().then((data) => {
        if (data) setWeatherConfig(data);
      });
    }
    if (!window.electronAPI?.onConfigUpdate) return;
    const cleanConfig = window.electronAPI.onConfigUpdate((data) => {
      if (data) setWeatherConfig(data);
    });
    return () => cleanConfig();
  }, []);

  const [isDndActive, setIsDndActive]         = useState(false);
  const [shouldRenderDnd, setShouldRenderDnd] = useState(false);
  const [isDndVisible, setIsDndVisible]       = useState(false);
  const [isDocked, setIsDocked]               = useState(false);
  const idleTimerRef = useRef(null);

  // Listen to Focus Mode / DND state updates
  useEffect(() => {
    if (window.electronAPI?.getDndState) {
      window.electronAPI.getDndState().then((isDnd) => setIsDndActive(!!isDnd)).catch(() => {});
    }
    if (!window.electronAPI?.onDndStateUpdate) return;
    const cleanDnd = window.electronAPI.onDndStateUpdate(({ isDnd }) => {
      setIsDndActive(!!isDnd);
    });
    return () => cleanDnd();
  }, []);

  // Smooth Apple spring fade-in / fade-out transition for DND badge
  useEffect(() => {
    if (isDndActive) {
      setShouldRenderDnd(true);
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          setIsDndVisible(true);
        });
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
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
    const isEnabled = devicePrefs?.autoHideIdle !== false && weatherConfig?.autoHideIdle !== false;
    const durationSec = devicePrefs?.autoHideDuration || weatherConfig?.autoHideDuration || 10;
    const delayMs = Math.max(1000, durationSec * 1000);

    if (isEnabled && activeState === 'idle') {
      idleTimerRef.current = setTimeout(() => {
        setIsDocked(true);
      }, delayMs);
    }
  }, [activeState, devicePrefs?.autoHideIdle, devicePrefs?.autoHideDuration, weatherConfig?.autoHideIdle, weatherConfig?.autoHideDuration]);

  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimerRef.current);
  }, [activeState, resetIdleTimer]);

  const userToggleLockRef     = useRef(0);
  const lastFetchedTitleRef   = useRef('');
  const rafRef                = useRef(null);
  const tRef                  = useRef(0);
  const volumeDismiss         = useRef(null);
  const bluetoothDismiss      = useRef(null);
  // Remembers what the island was showing (e.g. expanded-lyrics) right before a
  // transient overlay (bluetooth / battery / volume) interrupted it, so we can
  // resume that view instead of always dropping back to the compact player -
  // this was why the lyrics tab kept appearing to "auto-close".
  const preOverlayStateRef    = useRef(null);
  const prevCoverRef          = useRef(null);
  const trackInfoRef          = useRef(trackInfo);

  // Keep a ref mirror of trackInfo so the mount-once IPC listener effect below
  // (empty dep array) can read the *current* track instead of the value it
  // closed over at mount time.
  useEffect(() => {
    trackInfoRef.current = trackInfo;
  }, [trackInfo]);



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
      const isPs = gp.id.toLowerCase().includes('dualsense') || gp.id.toLowerCase().includes('playstation') || gp.id.toLowerCase().includes('054c');
      const name = isPs ? 'DualSense Wireless Controller' : 'Xbox Wireless Controller';

      setNotification({
        title: `${name} Connected`,
        subtitle: `Gaming Gamepad • ${gp.buttons?.length || 16} Buttons • Ready`,
        icon: '🎮',
      });
      setActiveState('notification');
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    return () => window.removeEventListener('gamepadconnected', handleGamepadConnected);
  }, []);

  // ── Accent color extraction when album art changes ────────────────────────
  useEffect(() => {
    const url = trackInfo.coverUrl;
    if (!url || url === prevCoverRef.current) return;
    prevCoverRef.current = url;

    extractVibrantColor(url).then((color) => {
      setAccentColor(color);
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

  useEffect(() => {
    let rafId;
    const easeColor = () => {
      setDisplayAccentColor((prev) => {
        const next = {
          r: prev.r + (accentColor.r - prev.r) * 0.075,
          g: prev.g + (accentColor.g - prev.g) * 0.075,
          b: prev.b + (accentColor.b - prev.b) * 0.075,
        };

        if (
          Math.abs(next.r - accentColor.r) < 0.5 &&
          Math.abs(next.g - accentColor.g) < 0.5 &&
          Math.abs(next.b - accentColor.b) < 0.5
        ) {
          return accentColor;
        }

        rafId = requestAnimationFrame(easeColor);
        return next;
      });
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
    if (activeState.startsWith('expanded-') || activeState === 'volume-osd' || activeState === 'notification') {
      return;
    }

    if (trackInfo.title && isTimerActive) {
      if (activeState !== 'split') {
        setActiveState('split');
      }
    } else if (trackInfo.title) {
      if (activeState !== 'compact-music') {
        setActiveState('compact-music');
      }
    } else if (isTimerActive) {
      if (activeState !== 'compact-timer') {
        setActiveState('compact-timer');
      }
    } else {
      if (activeState !== 'idle') {
        setActiveState('idle');
      }
    }
  }, [trackInfo.title, isTimerActive, activeState, setActiveState]);

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

    const cleanSpotify = window.electronAPI.onSystemMediaUpdate(updateTrackData);
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
        setActiveState((cur) => cur === 'expanded-timer' ? (trackInfo.title ? 'compact-music' : 'idle') : cur);
      }
    }) : null;

    const isOverlayState = (s) => s === 'expanded-battery' || s === 'volume-osd' || s === 'expanded-bluetooth' || s === 'expanded-call' || s === 'compact-call';
    const resumeFromOverlay = () => {
      const resumeState = preOverlayStateRef.current;
      preOverlayStateRef.current = null;
      if (resumeState === 'expanded-lyrics' || resumeState === 'expanded-music') return resumeState;
      return trackInfoRef.current.title && isTimerActive ? 'split' : (trackInfoRef.current.title ? 'compact-music' : (isTimerActive ? 'compact-timer' : 'idle'));
    };

    const cleanBattery = window.electronAPI.onBatteryUpdate(({ pct, charging, minsLeft, changed, isInitial }) => {
      setBattery({ pct, charging, minsLeft });
      if (isInitial) return;
      if (changed && (pct <= 20 || charging)) {
        setActiveState((prev) => {
          if (prev === 'expanded-call' || prev === 'compact-call') return prev; // never interrupt an active call
          if (!isOverlayState(prev)) preOverlayStateRef.current = prev;
          return 'expanded-battery';
        });
        setTimeout(() => setActiveState((prev) => prev === 'expanded-battery' ? resumeFromOverlay() : prev), 5000);
      }
    });

    const cleanVolume = window.electronAPI.onVolumeUpdate(({ vol, isUserAction, changed, isInitial }) => {
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
    });

    if (window.electronAPI?.getBluetoothState) {
      window.electronAPI.getBluetoothState().then((data) => {
        if (data && data.deviceName) {
          setBluetoothData(data);
        }
      }).catch(() => {});
    }

    const cleanBT = window.electronAPI.onBluetoothUpdate
      ? window.electronAPI.onBluetoothUpdate((data) => {
          if (data && data.deviceName) {
            const timestamped = { ...data, timestamp: Date.now() };
            setBluetoothData(timestamped);
            if (data.isInitial && !data.forceShow) return;
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

    const cleanCall = window.electronAPI.onCallUpdate
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

    if (window.electronAPI?.requestBluetoothStatus) {
      window.electronAPI.requestBluetoothStatus();
    }

    // Ask the main process for the current call state now that we're listening.
    // Without this, a call that started before the renderer mounted would be
    // missed — the poller only pushes call-update when the state *changes*.
    if (window.electronAPI?.requestCallStatus) {
      window.electronAPI.requestCallStatus();
    }
    if (window.electronAPI?.requestTimerStatus) {
      window.electronAPI.requestTimerStatus();
    }

    return () => { cleanSpotify(); cleanTimer(); cleanBattery(); cleanVolume(); cleanBT(); cleanCall(); clearTimeout(bluetoothDismiss.current); };
  }, []);

  const gainRef = useRef(0);
  const eqSettledRef = useRef(true);

  // ── 60fps Equalizer rAF loop (Smooth Gain Decay/Spring) ───────────────────
  // PERF FIX: this used to call requestAnimationFrame(loop) unconditionally
  // at the end of every branch, including the "already flat" branch — so once
  // gain decayed to 0 it kept calling setBarHeights([3,3,3,3,3]) (a new array
  // every frame) forever, at 60fps, forcing a full DynamicIsland re-render
  // around the clock even while idle with no music widget on screen. It now
  // stops scheduling once the decay settles and only restarts when playback
  // resumes.
  useEffect(() => {
    if (!trackInfo.isPlaying && eqSettledRef.current) return undefined;

    const loop = () => {
      const targetGain = trackInfo.isPlaying ? 1.0 : 0.0;
      gainRef.current += (targetGain - gainRef.current) * 0.12;

      if (gainRef.current < 0.01 && !trackInfo.isPlaying) {
        if (!eqSettledRef.current) {
          eqSettledRef.current = true;
          setBarHeights([3, 3, 3, 3, 3]);
        }
        rafRef.current = null;
        return; // fully decayed — stop instead of rescheduling forever
      }

      eqSettledRef.current = false;
      tRef.current += 0.04;
      setBarHeights(computeBarHeightsWithGain(tRef.current, gainRef.current));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [trackInfo.isPlaying]);

  // ── Window resize IPC ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return;
    const timerHeight = Math.max(82, timers.length * 56 + 26);
    const shelfCount = shelvedItems.length;
    const shelfRows = Math.max(1, Math.min(4, Math.ceil(shelfCount / 3)));
    const shelfHeight = 70 + shelfRows * 95;
    const sizeMap = {
      'idle':              [250, 42],
      'compact-music':     [310, 44],
      'compact-timer':     [250, 42],
      'split':             [340, 54],
      'expanded-music':    [390, 172],
      'expanded-lyrics':   [390, 300],
      'expanded-timer':    [480, timerHeight],
      'compact-call':      [270, 54],
      'expanded-call':     [310, 240],
      'expanded-airdrop':  [380, 200],
      'expanded-recorder': [370, 205],
      'expanded-screenrec':[340, 100],
      'expanded-battery':  [340, 85],
      'volume-osd':        [360, 85],
      'notification':      [400, 110],
      'expanded-weather':  [370, 210],
      'expanded-shelf':    [380, shelfHeight],
      'expanded-sysmon':   [370, 150],
      'expanded-launcher': [360, 180],
      'expanded-screenshot':[360, 90],
      'expanded-bluetooth': [376, 61],
    };
    const [w, h] = sizeMap[activeState] || [250, 44];
    window.electronAPI.resizeWindow(w, h);
  }, [activeState, timers.length, shelvedItems.length]);

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
      'expanded-call':     'state-expanded-call',
      'expanded-airdrop':  'state-expanded-airdrop',
      'expanded-recorder': 'state-expanded-recorder',
      'expanded-screenrec':'state-expanded-screenrec',
      'expanded-battery':  'state-expanded-battery',
      'volume-osd':        'state-volume-osd',
      'notification':      'state-notification',
      'expanded-weather':  'state-expanded-weather',
      'expanded-shelf':    'state-expanded-shelf',
      'expanded-sysmon':   'state-expanded-sysmon',
      'expanded-launcher': 'state-expanded-launcher',
      'expanded-settings': 'state-expanded-settings',
      'expanded-screenshot':'state-expanded-screenshot',
      'expanded-bluetooth':'state-expanded-bluetooth',
    }[activeState] || 'state-idle';
  };

  // 100% Solid Opaque background gradient (strictly #000000 when idle)
  const pillBg = buildPillBg(accentColor, activeState === 'expanded-music', !!trackInfo.title, isLight);

  // ── Mouse Passthrough Management ──────────────────────────────────────────
  useEffect(() => {
    if (window.electronAPI?.setIgnoreMouseEvents) {
      window.electronAPI.setIgnoreMouseEvents(true);
    }
  }, []);

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
        if (trackInfo.title && isTimerActive) return 'split';
        if (trackInfo.title) return 'compact-music';
        if (isTimerActive) return 'compact-timer';
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
  }, [trackInfo.title, setActiveState]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveState((prev) => prev === 'expanded-launcher' ? (trackInfo.title ? 'compact-music' : 'idle') : 'expanded-launcher');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeState !== 'expanded-shelf') {
      setActiveState('expanded-shelf');
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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
        const nameLower = f.name.toLowerCase();
        const ext = nameLower.includes('.') ? nameLower.split('.').pop() : '';
        const isShortcutOrFile = ext === 'lnk' || ext === 'url' || ext === 'exe' || (ext.length > 0 && ext.length <= 5);
        const isFolder = !isShortcutOrFile && (f.type.includes('folder') || f.type === 'directory' || !ext);
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
      setShelvedItems((prev) => [...prev, ...items]);
    }
  };

  const handleOpenItem = (item) => {
    const targetPath = item.path || item.name;
    if (targetPath && window.electronAPI?.openPath) {
      window.electronAPI.openPath(targetPath);
    }
  };

  const handleLaunchApp = (cmd) => {
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
      setActiveState(trackInfo.title && isTimerActive ? 'split' : (trackInfo.title ? 'compact-music' : (isTimerActive ? 'compact-timer' : 'idle')));
      return;
    }
    if (window.electronAPI?.launchApp) {
      window.electronAPI.launchApp(cmd);
    }
    setActiveState(trackInfo.title && isTimerActive ? 'split' : (trackInfo.title ? 'compact-music' : (isTimerActive ? 'compact-timer' : 'idle')));
  };

  const handleIslandClick = (e) => {
    if (e.defaultPrevented) return;
    if (activeState === 'expanded-settings') return;
    if (e.target && (e.target.closest('button') || e.target.closest('input') || e.target.closest('svg') || e.target.closest('.interactive-child'))) {
      return;
    }
    e.stopPropagation();
    if (activeState.startsWith('expanded-') || activeState === 'volume-osd') {
      if (activeState === 'expanded-call') {
        setActiveState('compact-call');
      } else {
        setActiveState(trackInfo.title && isTimerActive ? 'split' : (trackInfo.title ? 'compact-music' : (isTimerActive ? 'compact-timer' : 'idle')));
      }
    } else if (activeState === 'compact-call') {
      setActiveState('expanded-call');
    } else if (activeState === 'compact-timer') {
      setActiveState('expanded-timer');
    } else if (trackInfo.title && isTimerActive) {
      setActiveState('expanded-music');
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
    if (window.electronAPI) window.electronAPI.sendMediaControl('toggle');
    setTrackInfo((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleNext = () => { if (window.electronAPI) window.electronAPI.sendMediaControl('next'); };
  const handlePrev = () => { if (window.electronAPI) window.electronAPI.sendMediaControl('previous'); };

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

  const expandedGradient = buildPillBg(displayAccentColor, true, true, isLight);
  const showGradient = (activeState === 'expanded-music' || activeState === 'expanded-lyrics') && trackInfo.isPlaying && !!trackInfo.title;

  if (activeState === 'split') {
    return (
      <div className="island-anchor" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div className="island-split-container">
          {/* Primary Capsule: Music / Call */}
          <div
            ref={capsuleRef}
            className={`island-capsule primary-split ${getStateClass()} ${isLight ? 'theme-light' : 'theme-dark'} ${isDocked ? 'is-docked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              resetIdleTimer();
              setActiveState('expanded-music');
            }}
            onMouseEnter={(e) => { resetIdleTimer(); handleMouseEnter(e); setIsCapsuleHovered(true); }}
            onMouseLeave={(e) => { handleMouseLeave(e); setIsCapsuleHovered(false); }}
            onMouseMove={resetIdleTimer}
            onMouseDown={() => setIsCapsulePressed(true)}
            onMouseUp={() => setIsCapsulePressed(false)}
            onContextMenu={handleContextMenu}
          >
            <ThemeCanvas
              containerRef={capsuleRef}
              isHovered={isCapsuleHovered}
              isPressed={isCapsulePressed}
              accentColor={eqColor}
            />
            <div className="activity-fade-content" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
              <MusicWidget
                isSplit={true}
                trackInfo={trackInfo}
                barHeights={barHeights}
                eqColor={eqColor}
                eqGlow={eqGlow}
                progressGradient={progGrad}
              />
            </div>
          </div>

          {/* Secondary Floating Capsule: Timer */}
          <div
            ref={secondaryCapsuleRef}
            className={`island-capsule island-capsule-secondary ${isLight ? 'theme-light' : 'theme-dark'} ${isDocked ? 'is-docked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              resetIdleTimer();
              setActiveState('expanded-timer');
            }}
            onMouseEnter={(e) => { resetIdleTimer(); handleMouseEnter(e); setIsSecondaryHovered(true); }}
            onMouseLeave={(e) => { handleMouseLeave(e); setIsSecondaryHovered(false); }}
            onMouseMove={resetIdleTimer}
            onMouseDown={() => setIsSecondaryPressed(true)}
            onMouseUp={() => setIsSecondaryPressed(false)}
            title="Click to expand Timer"
          >
            <ThemeCanvas
              containerRef={secondaryCapsuleRef}
              isHovered={isSecondaryHovered}
              isPressed={isSecondaryPressed}
              accentColor="#ff9f0a"
            />
            <div className="activity-fade-content" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TimerWidget
                isSplit={true}
                onExpand={() => setActiveState('expanded-timer')}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="island-anchor" onMouseEnter={(e) => { handleMouseEnter(e); setIsCapsuleHovered(true); }} onMouseLeave={() => setIsCapsuleHovered(false)}>
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
      <div
        ref={capsuleRef}
        style={{ '--shelf-dynamic-height': `${70 + Math.max(1, Math.min(4, Math.ceil(shelvedItems.length / 3))) * 95}px` }}
        className={`island-capsule ${getStateClass()} ${isLight ? 'theme-light' : 'theme-dark'} ${isDocked ? 'is-docked' : ''} ${isCapsulePressed ? 'is-pressed' : ''}`}
        onClick={(e) => { resetIdleTimer(); handleIslandClick(e); }}
        onMouseEnter={(e) => { resetIdleTimer(); handleMouseEnter(e); setIsCapsuleHovered(true); }}
        onMouseLeave={(e) => { handleMouseLeave(e); setIsCapsuleHovered(false); }}
        onMouseMove={resetIdleTimer}
        onMouseDown={() => setIsCapsulePressed(true)}
        onMouseUp={() => setIsCapsulePressed(false)}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ThemeCanvas
          containerRef={capsuleRef}
          isHovered={isCapsuleHovered}
          isPressed={isCapsulePressed}
          accentColor={eqColor}
        />
        {/* Smooth organic moving liquid aura background — Beat-Synced Equalizer Glow Pulse with 0.75s Silk Fade */}
        <div
          className="liquid-aura-container"
          style={{
            opacity: (activeState === 'expanded-music' || activeState === 'expanded-lyrics') && !!trackInfo.title
              ? (trackInfo?.isPlaying ? 0.72 + beatPulse * 0.28 : 0.16)
              : 0,
            transform: `scale(${1 + beatPulse * 0.12})`,
            filter: `blur(${24 + beatPulse * 8}px)`,
            transition: 'opacity 0.75s cubic-bezier(0.2, 0.9, 0.2, 1), transform 0.6s cubic-bezier(0.2, 0.9, 0.2, 1), filter 0.6s ease',
          }}
        >
          <div className="liquid-blob-1" style={{ background: `radial-gradient(circle, ${eqColor} 0%, rgba(${smoothR},${smoothG},${smoothB},0.35) 55%, transparent 100%)`, transition: 'background 0.9s cubic-bezier(0.2, 0.9, 0.2, 1)' }} />
          <div className="liquid-blob-2" style={{ background: `radial-gradient(circle, rgba(${smoothR},${smoothG},${smoothB},0.9) 0%, rgba(${smoothR},${smoothG},${smoothB},0.25) 50%, transparent 100%)`, transition: 'background 0.9s cubic-bezier(0.2, 0.9, 0.2, 1)' }} />
          <div className="liquid-blob-3" style={{ background: `radial-gradient(circle, ${eqColor} 0%, rgba(${smoothR},${smoothG},${smoothB},0.2) 45%, transparent 100%)`, transition: 'background 0.9s cubic-bezier(0.2, 0.9, 0.2, 1)' }} />
        </div>

        <div className="activity-fade-content" key={isMusicState ? 'music' : (activeState === 'compact-timer' || activeState === 'expanded-timer') ? 'timer' : activeState}>

          {activeState === 'idle' && <IdleWidget weatherConfig={weatherConfig} />}

          {isMusicState && (
            <MusicWidget
              isCompact={activeState === 'compact-music'}
              isExpanded={activeState === 'expanded-music' || activeState === 'expanded-lyrics'}
              isLyricsView={activeState === 'expanded-lyrics'}
              isDndActive={isDndActive}
              onToggleLyrics={() => setActiveState((prev) => prev === 'expanded-lyrics' ? 'expanded-music' : 'expanded-lyrics')}
              trackInfo={trackInfo}
              barHeights={barHeights}
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
          {activeState === 'expanded-screenrec' && (
            <ScreenRecorderWidget onStop={() => setActiveState('idle')} />
          )}
          {activeState === 'expanded-battery' && (
            <BatteryWidget pct={battery.pct} charging={battery.charging} minsLeft={battery.minsLeft} />
          )}
          {activeState === 'volume-osd' && <VolumeOSDWidget volume={volume} />}
          {activeState === 'notification' && notification && (
            <NotificationWidget notification={notification} onClose={onClearNotification} />
          )}
          {activeState === 'expanded-weather' && <WeatherWidget weatherConfig={weatherConfig} />}

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
            <LauncherWidget onLaunchApp={handleLaunchApp} isDndActive={isDndActive} onClose={() => setActiveState('idle')} />
          )}
          {activeState === 'expanded-settings' && (
            <SettingsWidget onClose={() => {
              setActiveState(trackInfo.title && isTimerActive ? 'split' : (trackInfo.title ? 'compact-music' : (isTimerActive ? 'compact-timer' : 'idle')));
              if (window.electronAPI?.setIgnoreMouseEvents) window.electronAPI.setIgnoreMouseEvents(true);
            }} />
          )}
          {activeState === 'expanded-screenshot' && (
            <ScreenshotWidget imageSrc={screenshotData} onDismiss={() => setActiveState('idle')} />
          )}
          {activeState === 'expanded-bluetooth' && (
            <BluetoothWidget
              key={`${bluetoothData.deviceName}-${bluetoothData.connectionState}-${bluetoothData.timestamp || 0}`}
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
                right: (activeState === 'expanded-music' || activeState === 'expanded-lyrics') ? 46 : (activeState.startsWith('expanded-') ? 16 : 14),
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
              <Moon size={11} color="#a5a3ff" fill="#a5a3ff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
              {activeState.startsWith('expanded-') && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 650,
                    color: '#e4e3ff',
                    letterSpacing: '-0.2px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Do Not Disturb
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
