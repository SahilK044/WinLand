/**
 * smartCamera.js
 * 
 * A clean camera controller that receives decisions from the smartFocusEngine
 * and smoothly renders them. This module handles:
 * 1. Receiving decisions from the engine
 * 2. Smooth interpolation of camera position and zoom (frame-rate independent)
 * 3. Look-ahead application (handled via target positions)
 * 4. Edge clamping
 * 5. Manual hotkey overrides (P=pan-out, Z=zoom-in)
 * 6. Composition (mapping normalized 0-1 coords to canvas pixel coords)
 */

import { FOCUS_STATES } from './smartFocusTypes.js';

const OVERRIDE_TIMEOUT_MS = 3000;

/**
 * Creates a smart camera controller.
 * @param {Object} config - Configuration options for the camera.
 * @returns {Object} Camera API methods.
 */
export function createSmartCamera(config = {}) {
  const options = {
    minZoom: 1.0,
    maxZoom: 1.5,
    manualZoomIn: 1.8,
    panTauMs: 200,      // exponential time constant for pan smoothing
    zoomTauMs: 140,     // exponential time constant for zoom smoothing  
    lookAheadMaxPx: 100,
    lookAheadGainMs: 90,
    ...config
  };

  const state = {
    current: { x: 0, y: 0, zoom: 1.0 },
    target: { x: 0, y: 0, zoom: 1.0 },
    override: null, // null | 'pan-out' | 'zoom-in'
    overrideStartTime: 0,
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    canvasSize: { width: 0, height: 0 },
    lastUpdateTime: 0,
    lastDecisionState: FOCUS_STATES.IDLE
  };

  /**
   * Set source bounds and canvas dimensions.
   * Initialize current position to canvas center if not set.
   * @param {Object} bounds - Source bounds { x, y, width, height }
   * @param {Object} canvasSize - Canvas dimensions { width, height }
   */
  function updateBounds(bounds, canvasSize) {
    state.bounds = { ...bounds };
    state.canvasSize = { ...canvasSize };

    // If first time initialization or canvas center has moved, and we're at 0,0
    if (state.current.x === 0 && state.current.y === 0 && canvasSize.width > 0) {
      const centerX = canvasSize.width / 2;
      const centerY = canvasSize.height / 2;
      
      state.current.x = centerX;
      state.current.y = centerY;
      state.target.x = centerX;
      state.target.y = centerY;
    }
  }

  /**
   * Receive a decision from smartFocusEngine.
   * decision: { state, targetX, targetY, targetZoom } (0-1 normalized coords)
   * @param {Object} decision - The focus decision from the engine
   */
  function setDecision(decision) {
    if (!decision) return;

    state.lastDecisionState = decision.state;

    // Convert normalized (0-1) coords to canvas pixel coordinates
    let targetPixelX = decision.targetX * state.canvasSize.width;
    let targetPixelY = decision.targetY * state.canvasSize.height;
    let targetZoom = decision.targetZoom;

    // Apply active override
    if (state.override === 'pan-out') {
      targetPixelX = state.canvasSize.width / 2;
      targetPixelY = state.canvasSize.height / 2;
      targetZoom = 1.0;
    } else if (state.override === 'zoom-in') {
      targetZoom = options.manualZoomIn;
      // Keep target position based on decision
    }

    // Update internal target
    state.target.x = targetPixelX;
    state.target.y = targetPixelY;
    state.target.zoom = Math.max(
      options.minZoom, 
      Math.min(targetZoom, state.override === 'zoom-in' ? options.manualZoomIn : options.maxZoom)
    );
  }

  /**
   * Handle manual hotkey overrides
   * @param {string} keyMode - 'pan-out', 'zoom-in', or other to clear
   */
  function handleOverride(keyMode) {
    const now = performance.now();
    if (keyMode === 'pan-out' || keyMode === 'zoom-in') {
      if (state.override === keyMode) {
        // Toggle off if already set
        state.override = null;
      } else {
        state.override = keyMode;
        state.overrideStartTime = now;
      }
    } else {
      state.override = null;
    }
  }

  /**
   * Helper to clamp camera position to prevent showing outside-source pixels
   * @private
   */
  function _getClampedPosition(x, y, zoom) {
    if (state.canvasSize.width === 0 || state.canvasSize.height === 0 || zoom <= 0) {
      return { x, y, zoom };
    }

    const halfW = (state.canvasSize.width / 2) / zoom;
    const halfH = (state.canvasSize.height / 2) / zoom;
    
    // If zoom is exactly 1 or less, we want to center it exactly
    if (zoom <= 1.0) {
      return {
        x: state.canvasSize.width / 2,
        y: state.canvasSize.height / 2,
        zoom
      };
    }

    const clampedX = Math.max(halfW, Math.min(x, state.canvasSize.width - halfW));
    const clampedY = Math.max(halfH, Math.min(y, state.canvasSize.height - halfH));

    return { x: clampedX, y: clampedY, zoom };
  }

  /**
   * Called every frame to update internal state and return render-ready values
   * @param {number} now - High-resolution timestamp
   * @returns {Object} Current clamped camera state { x, y, zoom, mode }
   */
  function update(now) {
    if (!state.lastUpdateTime) {
      state.lastUpdateTime = now;
      return getState();
    }

    const dt = now - state.lastUpdateTime;
    state.lastUpdateTime = now;

    // Auto-expire override if stale
    if (state.override && (now - state.overrideStartTime > OVERRIDE_TIMEOUT_MS)) {
      state.override = null;
    }

    if (dt > 0) {
      // Time-based exponential smoothing
      // Use asymmetrical zoom tau: responsive on zoom-in (180ms), cinematic & slow on zoom-out (450ms)
      const currentZoomTau = state.target.zoom > state.current.zoom ? (options.zoomTauMs || 180) : 450;
      const panAlpha = 1 - Math.exp(-dt / (options.panTauMs || 220));
      const zoomAlpha = 1 - Math.exp(-dt / currentZoomTau);

      state.current.x += (state.target.x - state.current.x) * panAlpha;
      state.current.y += (state.target.y - state.current.y) * panAlpha;
      state.current.zoom += (state.target.zoom - state.current.zoom) * zoomAlpha;
    }

    // Snap zoom to 1.0 if very close and target is 1.0
    if (state.target.zoom === 1.0 && Math.abs(state.current.zoom - 1.0) < 0.005) {
      state.current.zoom = 1.0;
    }

    // When zoom is near 1.0, gently pull camera toward center to prevent drift
    if (state.current.zoom < 1.05) {
      const centerX = state.canvasSize.width / 2;
      const centerY = state.canvasSize.height / 2;
      // A gentle pull towards center
      state.current.x += (centerX - state.current.x) * 0.1;
      state.current.y += (centerY - state.current.y) * 0.1;
    }

    // Apply edge clamping before returning
    const clamped = _getClampedPosition(state.current.x, state.current.y, state.current.zoom);
    state.current.x = clamped.x;
    state.current.y = clamped.y;
    state.current.zoom = clamped.zoom;

    return {
      x: state.current.x,
      y: state.current.y,
      zoom: state.current.zoom,
      mode: state.override || state.lastDecisionState
    };
  }

  /**
   * Return current clamped camera state without recomputing
   * @returns {Object} Current clamped camera state { x, y, zoom, mode }
   */
  function getState() {
    const clamped = _getClampedPosition(state.current.x, state.current.y, state.current.zoom);
    return {
      x: clamped.x,
      y: clamped.y,
      zoom: clamped.zoom,
      mode: state.override || state.lastDecisionState
    };
  }

  /**
   * Reset to center, zoom 1.0, clear override
   */
  function reset() {
    state.override = null;
    state.overrideStartTime = 0;
    
    const centerX = state.canvasSize.width / 2;
    const centerY = state.canvasSize.height / 2;
    
    state.current.x = centerX;
    state.current.y = centerY;
    state.current.zoom = 1.0;
    
    state.target.x = centerX;
    state.target.y = centerY;
    state.target.zoom = 1.0;
    
    state.lastDecisionState = FOCUS_STATES.IDLE;
    state.lastUpdateTime = 0;
  }

  /**
   * No-op backwards compatibility methods
   */
  function updateCursor(_cursorPos, _now) {
    // No-op for backwards compatibility
  }
  
  function registerClick(_now) {
    // No-op for backwards compatibility
  }

  return {
    updateBounds,
    setDecision,
    handleOverride,
    update,
    getState,
    reset,
    
    // Backwards compatibility
    updateCursor,
    registerClick,
    
    // For debugging
    state
  };
}
