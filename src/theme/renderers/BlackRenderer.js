import { IThemeRenderer } from '../IThemeRenderer.js';

/**
 * WinLand - BlackRenderer.js
 * Reference theme renderer implementing pure matte deep black pill styling.
 */
export class BlackRenderer extends IThemeRenderer {
  DrawBackground(ctx, bounds, state, options = {}) {
    const { width, height, radius = 24 } = bounds;
    ctx.save();
    
    // Pure 100% solid matte black fill
    ctx.fillStyle = options.bgColor || '#000000';
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    ctx.restore();
  }

  DrawBorder(ctx, bounds, state, options = {}) {
    // No visible border — pure borderless matte black pill
  }

  DrawShadow(ctx, bounds, state, options = {}) {
    // Shadow is cleanly handled by CSS box-shadow on .island-capsule::before
  }

  DrawHighlight(ctx, bounds, state, options = {}) {
    // Pure matte black - no specular highlight gradients
  }

  DrawReflection(ctx, bounds, state, options = {}) {
    // Pure matte black - no reflection sheen sweeps
  }

  DrawGlow(ctx, bounds, state, options = {}) {
    // No visible border glow stroke — keeps the pill clean and borderless
  }

  DrawPressed(ctx, bounds, state, options = {}) {
    if (!state.isPressed) return;
    const { width, height, radius = 24 } = bounds;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();
    ctx.restore();
  }

  DrawHover(ctx, bounds, state, options = {}) {
    // Pure matte black - no hover gradient
  }

  DrawDisabled(ctx, bounds, state, options = {}) {
    this.DrawBackground(ctx, bounds, state, options);
    this.DrawBorder(ctx, bounds, state, options);
  }
}
