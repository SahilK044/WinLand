import { BlackRenderer } from './renderers/BlackRenderer.js';
import { LightRenderer } from './renderers/LightRenderer.js';

/**
 * WinLand - ThemeManager.js
 * Central theme & appearance manager for WinLand.
 * Supports Dark Mode and Light Mode with 1:1 Apple-inspired visuals.
 */

export class ThemeManager {
  constructor() {
    this.mode = typeof window !== 'undefined' && localStorage.getItem('winland_theme_mode') ? localStorage.getItem('winland_theme_mode') : 'dark';
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
      this.options.performanceMode = shouldFallback;
      this.notifyListeners();
    }
  }

  setMode(mode) {
    if (mode !== 'dark' && mode !== 'light') return;
    this.mode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('winland_theme_mode', mode);
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
    this.listeners.add(listener);
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
}

export const themeManager = new ThemeManager();
