/**
 * Aurora Visualizer
 * ThemeEngine.js
 *
 * Manages visual presets, custom palette generation, and CSS variable binding.
 */

export const THEME_PRESETS = {
  Aurora: {
    accent: '#E8C48A',
    glow: '#FFDCA7',
    glassBg: 'rgba(22, 22, 26, 0.55)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#FFFFFF',
    textSecondary: '#CFCFCF',
  },
  Minimal: {
    accent: '#F5F5F5',
    glow: '#FFFFFF',
    glassBg: 'rgba(18, 18, 18, 0.65)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
  },
  Neon: {
    accent: '#4EF2FF',
    glow: '#00E5FF',
    glassBg: 'rgba(10, 15, 28, 0.70)',
    glassBorder: 'rgba(78, 242, 255, 0.25)',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
  },
  Glass: {
    accent: '#CFCFCF',
    glow: '#E2E8F0',
    glassBg: 'rgba(255, 255, 255, 0.10)',
    glassBorder: 'rgba(255, 255, 255, 0.20)',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
  },
  Cinema: {
    accent: '#F9A826',
    glow: '#FFB74D',
    glassBg: 'rgba(15, 12, 20, 0.80)',
    glassBorder: 'rgba(249, 168, 38, 0.18)',
    textPrimary: '#FFF8E7',
    textSecondary: '#D1C4E9',
  },
};

export class ThemeEngine {
  constructor(rootElement = document.documentElement) {
    this.root = rootElement;
    this.currentPreset = 'Aurora';
  }

  applyPreset(name) {
    const preset = THEME_PRESETS[name];
    if (!preset) return;

    this.currentPreset = name;
    this.applyThemeVariables(preset);
  }

  applyThemeVariables(vars) {
    if (!this.root) return;

    if (vars.accent) this.root.style.setProperty('--aurora-accent', vars.accent);
    if (vars.glow) this.root.style.setProperty('--aurora-glow', vars.glow);
    if (vars.glassBg) this.root.style.setProperty('--glass-bg', vars.glassBg);
    if (vars.glassBorder) this.root.style.setProperty('--glass-border', vars.glassBorder);
    if (vars.textPrimary) this.root.style.setProperty('--text-primary', vars.textPrimary);
    if (vars.textSecondary) this.root.style.setProperty('--text-secondary', vars.textSecondary);
  }

  setAccentColor(colorHex) {
    if (!this.root) return;
    this.root.style.setProperty('--aurora-accent', colorHex);
    this.root.style.setProperty('--aurora-glow', colorHex);
  }

  getCurrentPreset() {
    return this.currentPreset;
  }
}
