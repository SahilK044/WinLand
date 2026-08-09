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
        ...themeState.options,
        accentColor,
      };

      const computedRadius = Math.min(height / 2, 28);
      const bounds = {
        x: 0,
        y: 0,
        width,
        height,
        radius: computedRadius,
      };

      const state = {
        isHovered,
        isPressed,
        isDragging,
        mouseX: mousePosRef.current.x,
        mouseY: mousePosRef.current.y,
      };

      renderer.DrawShadow(ctx, bounds, state, options);
      renderer.DrawBackground(ctx, bounds, state, options);
      renderer.DrawHighlight(ctx, bounds, state, options);
      renderer.DrawReflection(ctx, bounds, state, options);
      renderer.DrawBorder(ctx, bounds, state, options);
      renderer.DrawGlow(ctx, bounds, state, options);
      if (isHovered) renderer.DrawHover(ctx, bounds, state, options);
      if (isPressed) renderer.DrawPressed(ctx, bounds, state, options);

      ctx.restore();

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [containerRef, isHovered, isPressed, isDragging, accentColor, themeState]);

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
