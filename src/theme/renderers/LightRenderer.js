import { IThemeRenderer } from '../IThemeRenderer.js';

/**
 * WinLand - LightRenderer.js
 * Theme renderer implementing translucent frosted white glass styling for Light Mode.
 */
export class LightRenderer extends IThemeRenderer {
  DrawBackground(ctx, bounds, _state, options = {}) {
    if (options.bgColor) {
      const { width, height, radius = 24 } = bounds;
      ctx.save();
      ctx.fillStyle = options.bgColor;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, radius);
      ctx.fill();
      ctx.restore();
    }
  }

  DrawBorder() {
    // Border is cleanly handled by CSS ::after with subpixel hardware antialiasing
  }

  DrawShadow() {
    // Shadow is cleanly handled by CSS box-shadow on .island-capsule.theme-light::before
  }

  DrawHighlight() {}
  DrawReflection() {}
  DrawGlow() {}

  DrawPressed(ctx, bounds, state) {
    if (!state?.isPressed) return;
    const { width, height, radius = 24 } = bounds;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();
    ctx.restore();
  }

  DrawHover() {}

  DrawDisabled(ctx, bounds, state, options) {
    this.DrawBackground(ctx, bounds, state, options);
  }
}

