import { BlackRenderer } from './renderers/BlackRenderer.js';
import { LightRenderer } from './renderers/LightRenderer.js';

/**
 * WinLand - ThemeManager.js
 * Central theme & appearance manager for WinLand.
 * Supports Dark Mode and Light Mode with 1:1 Apple-inspired visuals.
 */

const readMode = () => {
  try {
    const val = typeof window !== 'undefined' ? localStorage.getItem('winland_theme_mode') : null;
    return val === 'light' || val === 'dark' ? val : 'dark';
  } catch {
    return 'dark';
  }
};

export class ThemeManager {
  constructor() {
    this.mode = readMode();
    this.blackRenderer = new BlackRenderer();
    this.lightRenderer = new LightRenderer();

    this.options = {
      blurStrength: 28,
      motionEnabled: true,
      autoFallback: true,
      performanceMode: false,
    };

    this.listeners = new Set();
    this.telemetry = {
      isBatterySaver: false,
      isRemoteDesktop: false,
      isLowGpu: false,
      isTransparencyDisabled: false,
    };

    this.initTelemetryBridge();
  }

  initTelemetryBridge() {
    if (typeof window !== 'undefined' && window.electronAPI?.getSystemTelemetry) {
      window.electronAPI.getSystemTelemetry().then((data) => {
        if (data) {
          this.updateTelemetry(data);
        }
      }).catch(() => {});
    }

    if (typeof window !== 'undefined' && window.electronAPI?.onAppearancePrefsUpdate) {
      this.unsubAppearance = window.electronAPI.onAppearancePrefsUpdate((prefs) => {
        if (prefs) {
          const { mode, ...cleanPrefs } = prefs;
          if (mode === 'dark' || mode === 'light') {
            this.mode = mode;
            try { localStorage.setItem('winland_theme_mode', mode); } catch {}
          }
          this.options = { ...this.options, ...cleanPrefs };
          this.notifyListeners();
        }
      });
    }
  }

  updateTelemetry(data) {
    this.telemetry = { ...this.telemetry, ...data };
    this.evaluateFallback();
  }

  evaluateFallback() {
    if (!this.options.autoFallback) return;

    const shouldFallback = 
      this.telemetry.isBatterySaver ||
      this.telemetry.isRemoteDesktop ||
      this.telemetry.isLowGpu ||
      this.telemetry.isTransparencyDisabled;

    if (shouldFallback !== this.options.performanceMode) {
      this.options = { ...this.options, performanceMode: shouldFallback };
      this.notifyListeners();
    }
  }

  setMode(mode) {
    if (mode !== 'dark' && mode !== 'light') return;
    this.mode = mode;
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('winland_theme_mode', mode); } catch {}
    }
    this.notifyListeners();
  }

  getMode() {
    return this.mode;
  }

  getRenderer() {
    return this.mode === 'light' ? this.lightRenderer : this.blackRenderer;
  }

  setOptions(newOptions = {}) {
    this.options = { ...this.options, ...newOptions };
    this.notifyListeners();
  }

  getOptions() {
    return { ...this.options };
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    try {
      listener(this.getMode(), this.getOptions());
    } catch {}
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getMode(), this.getOptions());
      } catch (e) {
        console.error('ThemeManager listener error:', e);
      }
    });
  }

  destroy() {
    if (typeof this.unsubAppearance === 'function') {
      this.unsubAppearance();
      this.unsubAppearance = null;
    }
    this.listeners.clear();
  }
}

export const themeManager = new ThemeManager();
