import { IThemeRenderer } from '../IThemeRenderer';

/**
 * WinLand - LightRenderer.js
 * Theme renderer implementing translucent frosted white glass styling for Light Mode.
 */
export class LightRenderer extends IThemeRenderer {
  DrawBackground(ctx, bounds, state, options = {}) {
    const { width, height, radius = 24 } = bounds;
    ctx.save();
    
    // Translucent light mode background
    ctx.fillStyle = options.bgColor || 'rgba(255, 255, 255, 0.94)';
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    ctx.restore();
  }

  DrawBorder(ctx, bounds, state, options = {}) {
    const { width, height, radius = 24 } = bounds;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, width - 1, height - 1, radius);
    ctx.stroke();
    ctx.restore();
  }

  DrawShadow(ctx, bounds, state, options = {}) {
    // Shadow is cleanly handled by CSS box-shadow on .island-capsule.theme-light::before
  }

  DrawHighlight() {}
  DrawReflection() {}
  DrawGlow() {}
  DrawPressed(ctx, bounds, state) {
    if (!state.isPressed) return;
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
    this.DrawBorder(ctx, bounds, state, options);
  }
}
