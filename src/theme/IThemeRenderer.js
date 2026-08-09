/**
 * WinLand - IThemeRenderer.js
 * Interface contract for all visual theme rendering backends in WinLand.
 *
 * Renderers must implement drawing methods for all states without modifying
 * component layout, mouse handling, scaling, or business logic.
 */

export class IThemeRenderer {
  /**
   * Draw main container background (fill, frosted glass, or desktop blur sampling).
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Object} bounds { x, y, width, height, radius }
   * @param {Object} state { isHovered, isPressed, isDragging, magnification }
   * @param {Object} options Theme options (blur, opacity, tint, etc.)
   */
  DrawBackground(ctx, bounds, state, options) {
    throw new Error('DrawBackground must be implemented by theme renderer.');
  }

  /**
   * Draw outer and inner borders (e.g. dual white highlights for Liquid Glass).
   */
  DrawBorder(ctx, bounds, state, options) {
    throw new Error('DrawBorder must be implemented by theme renderer.');
  }

  /**
   * Draw floating drop shadows and inner rim shadows.
   */
  DrawShadow(ctx, bounds, state, options) {
    throw new Error('DrawShadow must be implemented by theme renderer.');
  }

  /**
   * Draw specular highlights and edge sheens.
   */
  DrawHighlight(ctx, bounds, state, options) {
    throw new Error('DrawHighlight must be implemented by theme renderer.');
  }

  /**
   * Draw dynamic light reflections and animated sheen sweeps.
   */
  DrawReflection(ctx, bounds, state, options) {
    throw new Error('DrawReflection must be implemented by theme renderer.');
  }

  /**
   * Draw edge micro-bloom or glow effects.
   */
  DrawGlow(ctx, bounds, state, options) {
    throw new Error('DrawGlow must be implemented by theme renderer.');
  }

  /**
   * Draw dynamic compression / transformation effect when pressed.
   */
  DrawPressed(ctx, bounds, state, options) {
    // Default implementation can be no-op or subclass overridden
  }

  /**
   * Draw interactive hover reflection response.
   */
  DrawHover(ctx, bounds, state, options) {
    // Default implementation can be no-op or subclass overridden
  }

  /**
   * Draw low power / disabled performance state.
   */
  DrawDisabled(ctx, bounds, state, options) {
    // Default implementation can be no-op or subclass overridden
  }
}
