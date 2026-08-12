import React, { useEffect, useRef, useState } from 'react';
import { themeManager } from './ThemeManager';
import { wallpaperSampler } from './utils/WallpaperSampler';

/**
 * WinLand - ThemeCanvas.jsx
 * Canvas element rendering background, glass effects, borders, specular reflections,
 * and shadows via ThemeManager's active renderer.
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

  // PERF FIX: the render loop below used to depend directly on
  // isHovered/isPressed/isDragging/accentColor/themeState. accentColor in
  // particular is fed a color string that DynamicIsland eases every single
  // animation frame (60fps), so that dependency made this effect tear down
  // (cancelAnimationFrame) and rebuild (requestAnimationFrame) the whole loop
  // every frame, for every visible capsule (2x in split mode). The loop now
  // mounts once and reads the latest values through these refs each tick.
  const isHoveredRef = useRef(isHovered);
  const isPressedRef = useRef(isPressed);
  const isDraggingRef = useRef(isDragging);
  const accentColorRef = useRef(accentColor);
  const themeStateRef = useRef(themeState);
  useEffect(() => { isHoveredRef.current = isHovered; }, [isHovered]);
  useEffect(() => { isPressedRef.current = isPressed; }, [isPressed]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  useEffect(() => { accentColorRef.current = accentColor; }, [accentColor]);
  useEffect(() => { themeStateRef.current = themeState; }, [themeState]);

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
        }
      });
      return unsub;
    }
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [containerRef]);

  useEffect(() => {
    let animId;

    const renderFrame = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, 10);
      const height = Math.max(rect.height, 10);

      const targetWidth = Math.floor(width * dpr);
      const targetHeight = Math.floor(height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Sample wallpaper dynamics if available
      wallpaperSampler.sampleSource(container);

      const renderer = themeManager.getRenderer();
      const options = {
        ...themeStateRef.current.options,
        accentColor: accentColorRef.current,
      };

      const computedRadius = Math.min(height / 2, 28);
      const bounds = {
        x: 0,
        y: 0,
        width,
        height,
        radius: computedRadius,
      };

      const hovered = isHoveredRef.current;
      const pressed = isPressedRef.current;
      const state = {
        isHovered: hovered,
        isPressed: pressed,
        isDragging: isDraggingRef.current,
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

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
    // Mount-once: volatile values are read through refs above instead of deps,
    // so this loop is created once per container and never restarts mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

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
        zIndex: 0,
      }}
    />
  );
}
