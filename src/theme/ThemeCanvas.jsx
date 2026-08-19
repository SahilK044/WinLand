import React, { useEffect, useRef, useState, useCallback } from 'react';
import { themeManager } from './ThemeManager';
import { wallpaperSampler } from './utils/WallpaperSampler';

/**
 * WinLand - ThemeCanvas.jsx
 * High-performance 120Hz/144Hz hardware-accelerated theme canvas renderer.
 * Features zero-layout-reflow caching, ResizeObserver dimension tracking,
 * and intelligent on-demand rendering that sleeps when settled to prevent animation stutter.
 */
export default function ThemeCanvas({
  containerRef,
  isHovered = false,
  isPressed = false,
  isDragging = false,
  accentColor = null,
}) {
  const canvasRef = useRef(null);
  const [themeState, setThemeState] = useState({
    mode: themeManager.getMode(),
    options: themeManager.getOptions(),
  });
  const mousePosRef = useRef({ x: undefined, y: undefined });
  const sizeRef = useRef({ width: 250, height: 44 });
  const isDirtyRef = useRef(true);
  const animIdRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const renderLoopRef = useRef(null);

  const isHoveredRef = useRef(isHovered);
  const isPressedRef = useRef(isPressed);
  const isDraggingRef = useRef(isDragging);
  const accentColorRef = useRef(accentColor);
  const themeStateRef = useRef(themeState);

  const requestRender = useCallback(() => {
    isDirtyRef.current = true;
    if (!animIdRef.current && renderLoopRef.current) {
      animIdRef.current = requestAnimationFrame(renderLoopRef.current);
    }
  }, []);

  const renderLoop = useCallback(() => {
    animIdRef.current = null;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const rect = container.getBoundingClientRect();
    const { width: currentW, height: currentH } = sizeRef.current;
    const width = Math.max(rect.width || container.clientWidth || currentW, 10);
    const height = Math.max(rect.height || container.clientHeight || currentH, 10);

    const targetWidth = Math.round(width * dpr);
    const targetHeight = Math.round(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, width, height);

    wallpaperSampler.sampleSource(container);

    const renderer = themeManager.getRenderer();
    const options = {
      ...themeStateRef.current.options,
      accentColor: accentColorRef.current,
    };

    const computedRadius = height < 65 ? Math.min(height / 2, 27) : 44;

    const bounds = {
      x: 0,
      y: 0,
      width,
      height,
      radius: computedRadius,
    };

    const hovered = isHoveredRef.current;
    const pressed = isPressedRef.current;
    const dragging = isDraggingRef.current;

    const state = {
      isHovered: hovered,
      isPressed: pressed,
      isDragging: dragging,
      mouseX: mousePosRef.current.x,
      mouseY: mousePosRef.current.y,
    };

    renderer.DrawShadow(ctx, bounds, state, options);
    renderer.DrawBackground(ctx, bounds, state, options);
    renderer.DrawHighlight(ctx, bounds, state, options);
    renderer.DrawReflection(ctx, bounds, state, options);
    renderer.DrawBorder(ctx, bounds, state, options);
    renderer.DrawGlow(ctx, bounds, state, options);
    if (hovered) renderer.DrawHover(ctx, bounds, state, options);
    if (pressed) renderer.DrawPressed(ctx, bounds, state, options);

    ctx.restore();

    isDirtyRef.current = false;

    // Keep running RAF while transitioning or when interactive effects require active per-frame rendering
    if (isTransitioningRef.current || hovered || pressed || dragging) {
      animIdRef.current = requestAnimationFrame(renderLoop);
    }
  }, [containerRef]);

  useEffect(() => {
    renderLoopRef.current = renderLoop;
  }, [renderLoop]);

  useEffect(() => {
    isHoveredRef.current = isHovered;
    requestRender();
  }, [isHovered, requestRender]);

  useEffect(() => {
    isPressedRef.current = isPressed;
    requestRender();
  }, [isPressed, requestRender]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
    requestRender();
  }, [isDragging, requestRender]);

  useEffect(() => {
    accentColorRef.current = accentColor;
    requestRender();
  }, [accentColor, requestRender]);

  useEffect(() => {
    themeStateRef.current = themeState;
    requestRender();
  }, [themeState, requestRender]);

  useEffect(() => {
    const unsubscribe = themeManager.subscribe((mode, options) => {
      setThemeState({ mode, options });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.onAppearancePrefsUpdate) {
      const unsub = window.electronAPI.onAppearancePrefsUpdate((prefs) => {
        if (prefs) {
          if (prefs.mode) themeManager.setMode(prefs.mode);
          themeManager.setOptions(prefs);
          requestRender();
        }
      });
      return () => { if (typeof unsub === 'function') unsub(); };
    }
  }, [requestRender]);

  // Dimension & Transition Tracking with zero layout reflow
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = (w, h) => {
      if (w > 0 && h > 0) {
        if (Math.abs(sizeRef.current.width - w) > 0.5 || Math.abs(sizeRef.current.height - h) > 0.5) {
          sizeRef.current = { width: w, height: h };
          requestRender();
        }
      }
    };

    // Initial size
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      sizeRef.current = { width: container.clientWidth, height: container.clientHeight };
    }

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          if (cr.width > 0 && cr.height > 0) {
            updateSize(cr.width, cr.height);
          }
        }
      });
      resizeObserver.observe(container);
    }

    const handleTransitionStart = () => {
      isTransitioningRef.current = true;
      requestRender();
    };

    const handleTransitionEnd = () => {
      isTransitioningRef.current = false;
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        sizeRef.current = { width: container.clientWidth, height: container.clientHeight };
      }
      requestRender();
    };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      if (isHoveredRef.current || isPressedRef.current) {
        requestRender();
      }
    };

    container.addEventListener('transitionrun', handleTransitionStart);
    container.addEventListener('transitionstart', handleTransitionStart);
    container.addEventListener('transitionend', handleTransitionEnd);
    container.addEventListener('transitioncancel', handleTransitionEnd);
    container.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      container.removeEventListener('transitionrun', handleTransitionStart);
      container.removeEventListener('transitionstart', handleTransitionStart);
      container.removeEventListener('transitionend', handleTransitionEnd);
      container.removeEventListener('transitioncancel', handleTransitionEnd);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [containerRef, requestRender]);

  // Initial draw
  useEffect(() => {
    requestRender();
    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [requestRender]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        borderRadius: 'inherit',
        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
        maskImage: '-webkit-radial-gradient(white, black)',
        zIndex: 0,
      }}
    />
  );
}

