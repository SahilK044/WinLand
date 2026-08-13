/**
 * WinLand - settingsTheme.js
 * 1:1 macOS Tahoe System Settings styling.
 *
 * Implements authentic Apple System Settings UI:
 * - Vibrancy sidebar with search input & Apple colored icon badges
 * - Grouped inset cards with hairline row dividers
 * - macOS Tahoe toggle switches, segmented pickers, and card selectors
 * - Full Dark & Light appearance modes
 */
export const SETTINGS_CSS = `
.wl-root {
  --base: #1e1e22;
  --panel-top: #232328;
  --panel-bottom: #19191d;
  --sidebar: rgba(255, 255, 255, 0.035);
  --surface: rgba(255, 255, 255, 0.045);
  --surface-hover: rgba(255, 255, 255, 0.08);
  --surface-active: rgba(255, 255, 255, 0.12);
  --group-bg: rgba(255, 255, 255, 0.035);
  --stroke: rgba(255, 255, 255, 0.08);
  --stroke-strong: rgba(255, 255, 255, 0.15);
  --label: #f5f5f7;
  --label-2: rgba(235, 235, 245, 0.65);
  --label-3: rgba(235, 235, 245, 0.35);
  --accent: #007aff;
  --accent-glow: rgba(0, 122, 255, 0.35);
  --focus: rgba(0, 122, 255, 0.85);
  --danger: #ff3b30;

  --font: "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont,
          "Segoe UI", system-ui, sans-serif;

  width: 100vw;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid var(--stroke-strong);
  background: linear-gradient(180deg, var(--panel-top) 0%, var(--panel-bottom) 100%);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.85);
  font-family: var(--font);
  color: var(--label);
  user-select: none;
  -webkit-font-smoothing: antialiased;
}

.wl-root.theme-light {
  --base: #f6f6f8;
  --panel-top: #ffffff;
  --panel-bottom: #f2f2f7;
  --sidebar: rgba(0, 0, 0, 0.03);
  --surface: #ffffff;
  --surface-hover: rgba(0, 0, 0, 0.04);
  --surface-active: rgba(0, 0, 0, 0.07);
  --group-bg: #ffffff;
  --stroke: rgba(0, 0, 0, 0.08);
  --stroke-strong: rgba(0, 0, 0, 0.12);
  --label: #1d1d1f;
  --label-2: rgba(60, 60, 67, 0.70);
  --label-3: rgba(60, 60, 67, 0.65);
  --accent: #007aff;
  --accent-glow: rgba(0, 122, 255, 0.25);
  --focus: rgba(0, 122, 255, 0.85);
}

.wl-root.theme-light .wl-stage {
  background: linear-gradient(135deg, #f5f5f7 0%, #e5e5ea 100%);
  border-color: rgba(0, 0, 0, 0.08);
}

/* ── Titlebar ─────────────────────────────────────────────────────────── */
.wl-titlebar {
  height: 48px;
  flex-shrink: 0;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--stroke);
  background: rgba(0, 0, 0, 0.08);
}
.wl-title { display: flex; align-items: center; gap: 10px; }
.wl-title-mark {
  width: 24px; height: 24px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent);
  color: #ffffff;
  box-shadow: 0 2px 6px var(--accent-glow);
}
.wl-title-text { font-size: 13px; font-weight: 600; letter-spacing: -0.01em; }
.wl-close {
  -webkit-app-region: no-drag;
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface);
  border: 1px solid var(--stroke);
  color: var(--label-2);
  cursor: pointer;
  transition: all 140ms ease;
}
.wl-close:hover { background: var(--danger); border-color: var(--danger); color: #fff; }

.wl-body { flex: 1; display: flex; min-height: 0; }

/* ── Sidebar (macOS System Settings Style) ────────────────────────────── */
.wl-sidebar {
  width: 220px; flex-shrink: 0;
  padding: 12px 10px;
  background: var(--sidebar);
  border-right: 1px solid var(--stroke);
  display: flex; flex-direction: column; gap: 2px;
  overflow-y: auto;
}
.wl-sidebar::-webkit-scrollbar { width: 0; }

/* Search box */
.wl-search-box {
  position: relative;
  margin-bottom: 10px;
  display: flex; alignItems: center;
}
.wl-search-input {
  width: 100%;
  height: 28px;
  padding: 0 10px 0 28px;
  border-radius: 7px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  color: var(--label);
  font-family: inherit;
  font-size: 12px;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.wl-search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.wl-search-icon {
  position: absolute;
  left: 8px;
  color: var(--label-3);
  pointer-events: none;
}

.wl-side-group {
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--label-3);
  padding: 12px 10px 4px;
}
.wl-side-group:first-of-type { padding-top: 2px; }

.wl-tab {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 6px 9px;
  border: none; border-radius: 7px;
  background: transparent;
  color: var(--label);
  font-family: inherit; font-size: 13px; font-weight: 450; text-align: left;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.wl-tab:hover { background: var(--surface-hover); }
.wl-tab[aria-current="true"] {
  background: var(--accent);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px var(--accent-glow);
}

.wl-tab-badge {
  width: 22px; height: 22px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: #ffffff; flex-shrink: 0;
}
.wl-tab[aria-current="true"] .wl-tab-badge {
  background: rgba(255, 255, 255, 0.25) !important;
}

/* ── Content Area ─────────────────────────────────────────────────────── */
.wl-content { flex: 1; min-width: 0; overflow-y: auto; padding: 24px 30px 32px; }
.wl-content::-webkit-scrollbar { width: 8px; }
.wl-content::-webkit-scrollbar-thumb {
  background: var(--stroke-strong); border-radius: 4px;
}

.wl-head { margin-bottom: 20px; }
.wl-head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.wl-h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.022em; }
.wl-sub { font-size: 12.5px; color: var(--label-2); margin-top: 4px; line-height: 1.45; }
.wl-count {
  flex-shrink: 0; font-size: 11px; font-weight: 600;
  color: var(--label-2); background: var(--surface);
  border: 1px solid var(--stroke); border-radius: 999px; padding: 4px 12px;
}

/* ── Inset Grouped Section (macOS Style Card Containers) ───────────── */
.wl-card-group {
  background: var(--group-bg);
  border: 1px solid var(--stroke);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.wl-row {
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  padding: 14px 18px;
  background: transparent;
  border-bottom: 1px solid var(--stroke);
  transition: background 120ms ease;
}
.wl-card-group .wl-row:last-child {
  border-bottom: none;
}
.wl-row-title { font-size: 13px; font-weight: 600; }
.wl-row-sub { font-size: 11.5px; color: var(--label-2); margin-top: 2px; line-height: 1.4; }

/* Grid views for device cards */
.wl-grid { display: grid; gap: 12px; }
.wl-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.wl-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

/* Device card */
.wl-card {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 14px 10px 12px;
  border-radius: 12px;
  background: var(--group-bg);
  border: 1px solid var(--stroke);
  cursor: pointer; text-align: center; font-family: inherit;
  transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
}
.wl-card:hover { background: var(--surface-hover); transform: translateY(-1px); }
.wl-card[aria-pressed="true"] {
  background: var(--surface-active);
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.wl-card[aria-pressed="true"]:hover {
  background: var(--surface-active);
  border-color: var(--accent);
}
.wl-card-name {
  font-size: 12px; font-weight: 600; color: var(--label);
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wl-card-badge {
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--label-3);
}
.wl-tick {
  position: absolute; top: 10px; right: 10px;
  width: 18px; height: 18px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent); color: #ffffff;
}

/* ── Apple Switch ─────────────────────────────────────────────────────── */
.wl-switch {
  position: relative; flex-shrink: 0;
  width: 44px; height: 26px; border-radius: 999px;
  background: rgba(120, 120, 128, 0.32);
  border: none; cursor: pointer; padding: 0;
  transition: background 200ms ease;
}
.wl-switch[aria-checked="true"] { background: #34c759; }
.wl-switch-knob {
  position: absolute; top: 2px; left: 2px;
  width: 22px; height: 22px; border-radius: 50%;
  background: #ffffff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.wl-switch[aria-checked="true"] .wl-switch-knob { transform: translateX(18px); }

/* ── Apple Segmented Control ────────────────────────────────────────── */
.wl-seg {
  display: inline-flex; gap: 2px; padding: 2px;
  background: rgba(120, 120, 128, 0.24);
  border: 1px solid var(--stroke);
  border-radius: 8px;
}
.wl-seg-item {
  border: none; background: transparent; cursor: pointer;
  font-family: inherit; font-size: 12px; font-weight: 500;
  color: var(--label-2); padding: 5px 14px; border-radius: 6px;
  transition: background 140ms ease, color 140ms ease;
}
.wl-seg-item:hover { color: var(--label); }
.wl-seg-item[aria-pressed="true"] {
  background: var(--surface);
  color: var(--label); font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* ── Appearance Mode Preview Cards (Dark vs Light) ───────────────────── */
.wl-theme-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.wl-theme-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 16px; border-radius: 12px;
  background: var(--group-bg); border: 2px solid var(--stroke);
  cursor: pointer; transition: all 160ms ease;
}
.wl-theme-card:hover { border-color: var(--label-3); }
.wl-theme-card.is-selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }

.wl-theme-preview {
  width: 100%; height: 90px; border-radius: 8px; overflow: hidden;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  margin-bottom: 12px; position: relative; border: 1px solid var(--stroke);
}
.wl-theme-preview.dark-preview { background: #0f0f12; color: #fff; }
.wl-theme-preview.light-preview { background: #f2f2f7; color: #000; }

.wl-theme-pill {
  width: 140px; height: 32px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600;
}
.dark-preview .wl-theme-pill { background: #000; color: #fff; border: 1px solid rgba(255,255,255,0.15); }
.light-preview .wl-theme-pill { background: #fff; color: #000; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

/* ── Motion Stage & Finish Swatches ─────────────────────────────────── */
.wl-stage {
  position: relative; overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background:
    radial-gradient(120% 85% at 50% 0%, rgba(255, 252, 245, 0.08) 0%, transparent 60%),
    linear-gradient(180deg, #1b1b20 0%, #0c0c0f 100%);
}
.wl-stage-viewport {
  position: relative; height: 220px;
  display: flex; align-items: center; justify-content: center;
  padding-bottom: 16px; box-sizing: border-box;
}
.wl-stage-bar {
  position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 11px 16px; border-top: 1px solid var(--stroke); background: rgba(0, 0, 0, 0.3);
}
.wl-stage-device { font-size: 12.5px; font-weight: 600; color: #fff; }
.wl-stage-style { font-size: 11px; color: rgba(255,255,255,0.6); }

.wl-replay {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 7px;
  background: var(--accent); border: none;
  color: #ffffff; font-family: inherit; font-size: 11.5px; font-weight: 600;
  cursor: pointer; transition: opacity 130ms ease;
}
.wl-replay:hover { opacity: 0.9; }

.wl-style-list { display: flex; flex-direction: column; gap: 6px; }
.wl-style {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  width: 100%; padding: 11px 16px;
  border-radius: 10px; background: var(--group-bg); border: 1px solid var(--stroke);
  color: var(--label); font-family: inherit; font-size: 12.5px; font-weight: 500; text-align: left;
  cursor: pointer; transition: all 140ms ease;
}
.wl-style:hover { background: var(--surface-hover); }
.wl-style[aria-pressed="true"] {
  background: var(--surface-active); border-color: var(--accent); font-weight: 600;
}

.wl-swatch {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 14px; border-radius: 10px;
  background: var(--group-bg); border: 1px solid var(--stroke);
  color: var(--label); font-family: inherit; font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 140ms ease;
}
.wl-swatch:hover { background: var(--surface-hover); }
.wl-swatch[aria-pressed="true"] { background: var(--surface-active); border-color: var(--accent); font-weight: 600; }
.wl-swatch-dot {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.wl-pill {
  font-size: 11px; font-weight: 600;
  padding: 5px 14px; border-radius: 7px;
  background: var(--accent); border: none;
  color: #ffffff; cursor: pointer; font-family: inherit;
  transition: opacity 130ms ease;
}
.wl-pill:hover { opacity: 0.9; }

/* ── About ─────────────────────────────────────────────────────────────── */
.wl-about { display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 24px; }
.wl-about-mark {
  width: 64px; height: 64px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent); color: #ffffff;
  box-shadow: 0 8px 24px var(--accent-glow);
}
.wl-about-name { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-top: 16px; }
.wl-about-ver { font-size: 12px; color: var(--label-3); margin-top: 4px; }
.wl-about-copy { font-size: 13px; color: var(--label-2); line-height: 1.6; max-width: 400px; margin-top: 14px; }
`;
