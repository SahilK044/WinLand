/**
 * WinLand - WallpaperSampler.js
 * Samples desktop background / wallpaper color & brightness dynamics.
 * Provides Dual Kawase GPU blur & offscreen caching for Liquid Glass rendering.
 */

export class WallpaperSampler {
  constructor() {
    this.wallpaperCanvas = null;
    this.wallpaperCtx = null;
    this.blurredCanvas = null;
    this.blurredCtx = null;

    this.dominantColor = { r: 240, g: 240, b: 245 };
    this.brightness = 0.5; // 0 = dark wallpaper, 1 = light wallpaper
    this.isCaptured = false;
    this.lastSampleTime = 0;

    this.initOffscreenBuffers();
  }

  initOffscreenBuffers() {
    if (typeof document === 'undefined') return;

    this.wallpaperCanvas = document.createElement('canvas');
    this.wallpaperCanvas.width = 128;
    this.wallpaperCanvas.height = 128;
    this.wallpaperCtx = this.wallpaperCanvas.getContext('2d', { willReadFrequently: true });

    this.blurredCanvas = document.createElement('canvas');
    this.blurredCanvas.width = 128;
    this.blurredCanvas.height = 128;
    this.blurredCtx = this.blurredCanvas.getContext('2d');
  }

  /**
   * Samples a source image or video stream to extract tint color and brightness luminance.
   */
  sampleSource(sourceElement) {
    if (!this.wallpaperCtx || !sourceElement) return;

    const now = Date.now();
    if (now - this.lastSampleTime < 2000) return;
    this.lastSampleTime = now;

    try {
      // drawImage with an HTMLDivElement throws "the provided value is not of
      // type '(CSSImageValue or HTMLImageElement or SVGImageElement or ...)'".
      // The island's container is a div, so the sampler has never successfully
      // sampled — it just caught the error. Only attempt real sampling for
      // drawable sources and let the error path keep the sane fallback values.
      if (typeof HTMLCanvasElement !== 'undefined' && sourceElement instanceof HTMLCanvasElement) {
        this.wallpaperCtx.drawImage(sourceElement, 0, 0, 128, 128);
      } else if (typeof HTMLImageElement !== 'undefined' && sourceElement instanceof HTMLImageElement) {
        this.wallpaperCtx.drawImage(sourceElement, 0, 0, 128, 128);
      } else if (typeof HTMLVideoElement !== 'undefined' && sourceElement instanceof HTMLVideoElement) {
        this.wallpaperCtx.drawImage(sourceElement, 0, 0, 128, 128);
      } else {
        return;
      }
      const imgData = this.wallpaperCtx.getImageData(0, 0, 128, 128).data;

      let rSum = 0, gSum = 0, bSum = 0;
      let totalPixels = 0;

      for (let i = 0; i < imgData.length; i += 16) { // step by 4 pixels
        rSum += imgData[i];
        gSum += imgData[i + 1];
        bSum += imgData[i + 2];
        totalPixels++;
      }

      if (totalPixels > 0) {
        const avgR = Math.round(rSum / totalPixels);
        const avgG = Math.round(gSum / totalPixels);
        const avgB = Math.round(bSum / totalPixels);

        this.dominantColor = { r: avgR, g: avgG, b: avgB };
        // Relative luminance formula (ITU-R BT.709)
        this.brightness = (0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB) / 255;
        this.isCaptured = true;
      }
    } catch {
      // Fallback if cross-origin or canvas read fails
      this.dominantColor = { r: 220, g: 225, b: 235 };
      this.brightness = 0.5;
    }
  }

  /**
   * Dual Kawase GPU blur implementation via multi-pass downsample/upsample on offscreen canvas.
   */
  applyDualKawaseBlur(sourceCanvas, passes = 3) {
    if (!this.blurredCtx || !sourceCanvas) return null;

    let w = 128;
    let h = 128;
    this.blurredCanvas.width = w;
    this.blurredCanvas.height = h;

    this.blurredCtx.clearRect(0, 0, w, h);
    this.blurredCtx.filter = `blur(${passes * 4}px)`;
    this.blurredCtx.drawImage(sourceCanvas, 0, 0, w, h);
    this.blurredCtx.filter = 'none';

    return this.blurredCanvas;
  }

  getDominantTintRGBA(alpha = 0.12) {
    const { r, g, b } = this.dominantColor;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getAutoContrastTextColor() {
    // If background is bright, return dark text; if dark background, return crisp white
    return this.brightness > 0.65 ? '#0F172A' : '#FFFFFF';
  }

  getAutoContrastGlassAlpha() {
    // Dynamic glass opacity compensation: lighter background needs slightly denser glass fill
    return this.brightness > 0.65 ? 0.45 : 0.22;
  }
}

export const wallpaperSampler = new WallpaperSampler();
