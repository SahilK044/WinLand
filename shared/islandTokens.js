// Single source of truth for the island's geometry and material contract.
// This file is consumed by both the renderer and Electron's main process.
export const RADIUS = 20;
export const TOP_OFFSET = 0;

export const COLOR = Object.freeze({
  background: '#000000',
  backgroundOpacity: 1,
  shadow: '0 6px 18px rgba(0, 0, 0, 0.4)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
});

export const STATES = Object.freeze({
  idle: { width: 250, height: 44 },
  mediaCompact: { width: 270, height: 54 },
  mediaExpanded: { width: 390, height: 172 },
  bluetoothToast: { width: 376, height: 61 },
  karaokeExpanded: { width: 390, height: 300 },
});

export const WINDOW_BOUNDS = Object.freeze({ width: 580, height: 420 });

export const SPRING = Object.freeze({
  // CSS cannot consume a numeric spring directly, so the renderer uses the
  // equivalent overshoot curve while Electron stays independent of timing.
  stiffness: 500,
  damping: 34,
  mass: 0.9,
  cssCurve: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  contentDurationMs: 180,
});
