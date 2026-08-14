import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings, Smartphone, Headphones, Disc, Palette, Monitor, Info,
  Check, X, Sparkles, Gamepad, Speaker, Search, Moon, Sun,
} from 'lucide-react';
import { DEVICE_CATALOG, DEVICE_COLOR_VARIANTS, ANIMATION_STYLES } from '../../data/deviceCatalog';
import { STYLE_KEYS, DEFAULT_STYLES } from '../../data/devicePrefs';
import Canvas3DCard from './Canvas3DCard';
import MotionPreviewStage from './MotionPreviewStage';
import { SETTINGS_CSS } from './settingsTheme';
import { themeManager } from '../../theme/ThemeManager';

// Sidebar grouping with macOS System Colors for badges
const SIDEBAR_GROUPS = [
  {
    label: 'Devices',
    tabs: [
      { id: 'phones',      label: 'Smartphones',        icon: Smartphone, bg: '#007AFF' },
      { id: 'headphones',  label: 'Headphones',         icon: Headphones, bg: '#AF52DE' },
      { id: 'earbuds',     label: 'Earbuds & Audio',    icon: Disc,       bg: '#FF9500' },
      { id: 'controllers', label: 'Gaming Controllers', icon: Gamepad,    bg: '#34C759' },
      { id: 'speakers',    label: 'Speakers & Sound',   icon: Speaker,    bg: '#5AC8FA' },
    ],
  },
  {
    label: 'WinLand Preferences',
    tabs: [
      { id: 'appearance', label: 'Appearance & Theme', icon: Sun,        bg: '#5856D6' },
      { id: 'style',      label: 'Style & Motion',     icon: Palette,    bg: '#FF2D55' },
      { id: 'system',     label: 'System & Placement', icon: Monitor,    bg: '#8E8E93' },
      { id: 'about',      label: 'About',              icon: Info,       bg: '#FFCC00' },
    ],
  },
];

const MOTION_CATEGORIES = [
  { cat: 'phone',      label: 'Phone',      styleKey: 'phone' },
  { cat: 'headphones', label: 'Headphones', styleKey: 'headphones' },
  { cat: 'earbuds',    label: 'Earbuds',    styleKey: 'earbuds' },
  { cat: 'controller', label: 'Controller', styleKey: 'controller' },
  { cat: 'speaker',    label: 'Speaker',    styleKey: 'speaker' },
];

function Header({ title, sub, count }) {
  return (
    <header className="wl-head">
      <div className="wl-head-row">
        <div>
          <h1 className="wl-h1">{title}</h1>
          {sub && <p className="wl-sub">{sub}</p>}
        </div>
        {count != null && <span className="wl-count">{count} models</span>}
      </div>
    </header>
  );
}

const DeviceCard = React.memo(function DeviceCard({
  id, modelId, name, badge, category, selected, colorHex,
  isHovered, isActivated, onSelect, onHover, onLeave,
}) {
  return (
    <button
      type="button"
      className="wl-card"
      aria-pressed={selected}
      onClick={() => onSelect(id, category)}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onLeave(category)}
    >
      {selected && <span className="wl-tick"><Check size={11} strokeWidth={3.2} /></span>}
      <Canvas3DCard
        modelId={modelId}
        category={category}
        colorHex={colorHex}
        isSelected={selected}
        isHovered={isHovered}
        isActivated={isActivated}
      />
      <span className="wl-card-name">{name}</span>
      {badge && <span className="wl-card-badge">{badge}</span>}
    </button>
  );
});

export default function SettingsWindow() {
  const [activeTab, setActiveTab]                   = useState('phones');
  const [searchQuery, setSearchQuery]               = useState('');
  const [selectedPhone, setSelectedPhone]           = useState(() => localStorage.getItem('winland_phone_id')      || 's24ultra');
  const [selectedHeadphones, setSelectedHeadphones] = useState(() => localStorage.getItem('winland_headphones_id') || 'razerbarracuda');
  const [selectedEarbuds, setSelectedEarbuds]       = useState(() => localStorage.getItem('winland_earbuds_id')    || 'airpodspro');
  const [selectedController, setSelectedController] = useState(() => localStorage.getItem('winland_controller_id') || 'ps5_controller');
  const [selectedSpeaker, setSelectedSpeaker]       = useState(() => localStorage.getItem('winland_speaker_id')    || 'sonos_soundbar');
  const [selectedColor, setSelectedColor]           = useState(() => localStorage.getItem('winland_color_variant') || 'space-grey');

  const [animStyles, setAnimStyles] = useState(() => {
    const initial = {};
    for (const cat of Object.keys(STYLE_KEYS)) {
      initial[cat] = localStorage.getItem(STYLE_KEYS[cat]) || DEFAULT_STYLES[cat];
    }
    return initial;
  });
  const currentCategory = ['phones', 'headphones', 'earbuds', 'controllers', 'speakers'].includes(activeTab)
    ? (activeTab === 'phones' ? 'phone' : activeTab)
    : 'phone';
  const animStyle = animStyles[currentCategory] || animStyles.phone;

  const [appearanceMode, setAppearanceMode] = useState(() => localStorage.getItem('winland_theme_mode') || themeManager.getMode() || 'dark');
  const [appearanceOptions] = useState(() => themeManager.getOptions());

  const handleUpdateAppearanceMode = (mode) => {
    setAppearanceMode(mode);
    localStorage.setItem('winland_theme_mode', mode);
    themeManager.setMode(mode);
    if (window.electronAPI?.sendAppearancePrefs) {
      window.electronAPI.sendAppearancePrefs({ mode, ...appearanceOptions });
    }
  };

  const [autoHide, setAutoHide]             = useState(() => localStorage.getItem('winland_autohide_enabled') === 'true');
  const [autoHideIdle, setAutoHideIdle]     = useState(() => localStorage.getItem('winland_autohide_idle') !== 'false');
  const [autoHideDuration, setAutoHideDuration] = useState(() => {
    const saved = localStorage.getItem('winland_autohide_duration');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [displays, setDisplays]             = useState([]);
  const [selectedDisplay, setSelectedDisplay] = useState(() => localStorage.getItem('winland_target_display') || '');
  const [hoveredCardId, setHoveredCardId]   = useState(null);
  const [activeEarbudId, setActiveEarbudId] = useState(null);
  const [motionCat, setMotionCat]           = useState('phone');
  const [isDndActive, setIsDndActive]       = useState(false);

  const handleTabChange = (id) => {
    setActiveTab(id);
    setHoveredCardId(null);
    setActiveEarbudId(null);
  };

  useEffect(() => {
    if (window.electronAPI?.getDisplays) {
      window.electronAPI.getDisplays().then((list) => {
        if (Array.isArray(list)) setDisplays(list);
      }).catch(() => {});
    }
    if (window.electronAPI?.getDndState) {
      window.electronAPI.getDndState().then((isDnd) => setIsDndActive(!!isDnd)).catch(() => {});
    }
    if (!window.electronAPI?.onDndStateUpdate) return;
    const unsub = window.electronAPI.onDndStateUpdate(({ isDnd }) => {
      setIsDndActive(!!isDnd);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const [xboxVariant, setXboxVariant] = useState(() => localStorage.getItem('winland_xbox_variant') || 'xbox_white');
  const [xboxFading, setXboxFading]   = useState(false);
  const xboxTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (xboxTimeoutRef.current) clearTimeout(xboxTimeoutRef.current);
    };
  }, []);

  const currentColorHex = DEVICE_COLOR_VARIANTS[selectedColor]?.hex || '#3a3a3c';

  const readDevicePrefs = useCallback(() => ({
    phoneId:        selectedPhone,
    headphonesId:   selectedHeadphones,
    earbudsId:      selectedEarbuds,
    controllerId:   selectedController === 'xbox_controller' ? xboxVariant : selectedController,
    speakerId:      selectedSpeaker,
    colorVariant:   selectedColor,
    animStyle:      animStyle,
    animStyles:     animStyles,
    autoHideIdle:   autoHideIdle,
    autoHideDuration: autoHideDuration,
    autoHide:       autoHide,
    targetDisplay:  selectedDisplay,
  }), [selectedPhone, selectedHeadphones, selectedEarbuds, selectedController,
       selectedSpeaker, xboxVariant, selectedColor, animStyle, animStyles, autoHide, autoHideIdle, autoHideDuration, selectedDisplay]);

  useEffect(() => {
    localStorage.setItem('winland_phone_id',        selectedPhone);
    localStorage.setItem('winland_headphones_id',   selectedHeadphones);
    localStorage.setItem('winland_earbuds_id',      selectedEarbuds);
    localStorage.setItem('winland_controller_id',   selectedController);
    localStorage.setItem('winland_speaker_id',      selectedSpeaker);
    localStorage.setItem('winland_color_variant',   selectedColor);
    localStorage.setItem('winland_anim_style',      animStyle);
    localStorage.setItem('winland_autohide_enabled', autoHide ? 'true' : 'false');
    localStorage.setItem('winland_autohide_idle',    autoHideIdle ? 'true' : 'false');
    localStorage.setItem('winland_autohide_duration', autoHideDuration.toString());
    localStorage.setItem('winland_xbox_variant',    xboxVariant);
    if (selectedDisplay) localStorage.setItem('winland_target_display', selectedDisplay);
    for (const cat of Object.keys(STYLE_KEYS)) {
      localStorage.setItem(STYLE_KEYS[cat], animStyles[cat]);
    }

    if (window.electronAPI?.writeSettings) {
      window.electronAPI.writeSettings({ autoHideIdle, autoHideDuration, hideInFullscreen: autoHide });
    }

    window.dispatchEvent(new CustomEvent('winland-settings-changed', {
      detail: { selectedPhone, selectedHeadphones, selectedEarbuds, selectedController, selectedSpeaker, xboxVariant, selectedColor, animStyle, autoHide, autoHideDuration },
    }));

    window.electronAPI?.sendDevicePrefs?.(readDevicePrefs());
  }, [selectedPhone, selectedHeadphones, selectedEarbuds, selectedController,
      selectedSpeaker, xboxVariant, selectedColor, animStyle, animStyles, autoHide, autoHideIdle, autoHideDuration, selectedDisplay, readDevicePrefs]);

  const handleClose = () => window.electronAPI?.closeSettingsWindow?.();

  const switchXboxVariant = (next) => {
    if (next === xboxVariant) return;
    setXboxFading(true);
    if (xboxTimeoutRef.current) clearTimeout(xboxTimeoutRef.current);
    xboxTimeoutRef.current = setTimeout(() => { setXboxVariant(next); setXboxFading(false); }, 260);
  };

  const handleHover = useCallback((id) => setHoveredCardId(id), []);
  const handleLeave = useCallback((cat) => {
    setHoveredCardId(null);
    if (cat === 'earbud') setActiveEarbudId(null);
  }, []);

  const motionDeviceId = {
    phone:      selectedPhone,
    headphones: selectedHeadphones,
    earbuds:    selectedEarbuds,
    controller: selectedController === 'xbox_controller' ? xboxVariant : selectedController,
    speaker:    selectedSpeaker,
  }[motionCat] || selectedPhone;

  const catalogNameFor = (modelId) => {
    for (const list of Object.values(DEVICE_CATALOG)) {
      const match = list.find((d) => d.id === modelId);
      if (match) return match.name;
    }
    if (modelId === 'xbox_white') return 'Xbox Wireless Controller (White)';
    if (modelId === 'xbox_black') return 'Xbox Wireless Controller (Black)';
    return modelId;
  };

  const activeStyleId   = animStyles[motionCat] || DEFAULT_STYLES[motionCat];
  const activeStyleName = (ANIMATION_STYLES[motionCat] || []).find((s) => s.id === activeStyleId)?.name || activeStyleId;
  const motionStyleList = ANIMATION_STYLES[motionCat] || [];

  return (
    <div className={`wl-root ${appearanceMode === 'light' ? 'theme-light' : 'theme-dark'}`}>
      <style>{SETTINGS_CSS}</style>

      {/* ── Title bar (macOS Style without traffic lights) ── */}
      <div className="wl-titlebar">
        <div className="wl-title">
          <div className="wl-title-mark"><Settings size={14} /></div>
          <span className="wl-title-text">WinLand System Settings</span>
        </div>
        <button
          type="button"
          className="wl-close"
          aria-label="Close settings window"
          onClick={handleClose}
        >
          <X size={14} />
        </button>
      </div>

      <div className="wl-body">
        {/* ── Sidebar (1:1 macOS Tahoe System Settings) ── */}
        <nav className="wl-sidebar" aria-label="Settings categories">
          {/* macOS Search Box */}
          <div className="wl-search-box">
            <Search size={13} className="wl-search-icon" />
            <input
              type="text"
              placeholder="Search"
              className="wl-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {(() => {
            let hasResults = false;
            const lowerQuery = searchQuery.toLowerCase();
            const groups = SIDEBAR_GROUPS.map((group) => {
              const filteredTabs = group.tabs.filter(t => {
                if (t.label.toLowerCase().includes(lowerQuery)) return true;
                if (t.id === 'phones') return DEVICE_CATALOG.phones?.some(d => d.name.toLowerCase().includes(lowerQuery));
                if (t.id === 'headphones') return DEVICE_CATALOG.headphones?.some(d => d.name.toLowerCase().includes(lowerQuery));
                if (t.id === 'earbuds') return DEVICE_CATALOG.earbuds?.some(d => d.name.toLowerCase().includes(lowerQuery));
                if (t.id === 'speakers') return DEVICE_CATALOG.speakers?.some(d => d.name.toLowerCase().includes(lowerQuery));
                if (t.id === 'controllers') return 'playstation 5 dualsense xbox wireless controller gamepad'.includes(lowerQuery);
                if (t.id === 'system') return 'auto-hide focus mode do not disturb timer display placement smart docking fullscreen'.includes(lowerQuery);
                if (t.id === 'style') return 'motion finish physics color variant'.includes(lowerQuery);
                if (t.id === 'appearance') return 'dark light theme mode'.includes(lowerQuery);
                return false;
              });
              if (filteredTabs.length > 0) hasResults = true;
              return { ...group, filteredTabs };
            });

            if (searchQuery && !hasResults) {
              return (
                <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--label-2)', fontSize: 12 }}>
                  No matching settings
                </div>
              );
            }

            return groups.map((group) => {
              if (searchQuery && group.filteredTabs.length === 0) return null;
              return (
                <React.Fragment key={group.label}>
                  <div className="wl-side-group">{group.label}</div>
                  {group.filteredTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className="wl-tab"
                        aria-current={activeTab === tab.id}
                        onClick={() => handleTabChange(tab.id)}
                      >
                        <div className="wl-tab-badge" style={{ background: tab.bg }}>
                          <Icon size={13} color="#fff" />
                        </div>
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </React.Fragment>
              );
            });
          })()}
        </nav>

        {/* ── Main Content Area ── */}
        <main className="wl-content">
          {/* ── Appearance & Theme Tab (macOS Dark / Light Selector) ── */}
          {activeTab === 'appearance' && (
            <>
              <Header
                title="Appearance & Theme"
                sub="Choose macOS system appearance and theme mode."
              />

              <div className="wl-theme-cards">
                <div
                  className={`wl-theme-card ${appearanceMode === 'dark' ? 'is-selected' : ''}`}
                  onClick={() => handleUpdateAppearanceMode('dark')}
                >
                  <div className="wl-theme-preview dark-preview">
                    <div className="wl-theme-pill">Dynamic Island</div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Moon size={14} color="#a855f7" /> Dark Mode
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--label-2)', marginTop: 4, textAlign: 'center' }}>
                    Solid deep black capsule with zero border artifacts.
                  </div>
                </div>

                <div
                  className={`wl-theme-card ${appearanceMode === 'light' ? 'is-selected' : ''}`}
                  onClick={() => handleUpdateAppearanceMode('light')}
                >
                  <div className="wl-theme-preview light-preview">
                    <div className="wl-theme-pill">Dynamic Island</div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sun size={14} color="#f59e0b" /> Light Mode
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--label-2)', marginTop: 4, textAlign: 'center' }}>
                    Translucent frosted glass with crisp macOS light material.
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'phones' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Header
                  title="Smartphone"
                  sub="Shown when a phone connects. Hover a card to spin it."
                  count={DEVICE_CATALOG.phones.length}
                />
                <button
                  className="wl-pill"
                  onClick={() => window.electronAPI?.triggerPhoneNotification && window.electronAPI.triggerPhoneNotification()}
                >
                  Test Connection
                </button>
              </div>
              <div className="wl-grid wl-grid-3">
                {DEVICE_CATALOG.phones.map((p) => (
                  <DeviceCard
                    key={p.id} id={p.id} modelId={p.id}
                    name={p.name} badge={`${p.brand} · ${p.formFactor}`} category="phone"
                    selected={selectedPhone === p.id} colorHex={currentColorHex}
                    isHovered={hoveredCardId === p.id}
                    isActivated={false}
                    onSelect={() => setSelectedPhone(p.id)}
                    onHover={handleHover} onLeave={handleLeave}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === 'headphones' && (
            <>
              <Header
                title="Headphones"
                sub="Over-ear audio devices."
                count={DEVICE_CATALOG.headphones.length}
              />
              <div className="wl-grid wl-grid-2">
                {DEVICE_CATALOG.headphones.map((h) => (
                  <DeviceCard
                    key={h.id} id={h.id} modelId={h.id}
                    name={h.name} badge={`${h.brand} · over-ear`} category="headphones"
                    selected={selectedHeadphones === h.id} colorHex={currentColorHex}
                    isHovered={hoveredCardId === h.id}
                    isActivated={false}
                    onSelect={() => setSelectedHeadphones(h.id)}
                    onHover={handleHover} onLeave={handleLeave}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === 'earbuds' && (
            <>
              <Header
                title="Earbuds"
                sub="Hover to lift the closed case, click to reveal earbuds."
                count={DEVICE_CATALOG.earbuds.length}
              />
              <div className="wl-grid wl-grid-2">
                {DEVICE_CATALOG.earbuds.map((e) => (
                  <DeviceCard
                    key={e.id} id={e.id} modelId={e.id}
                    name={e.name} badge={`${e.brand} · in-ear`} category="earbud"
                    selected={selectedEarbuds === e.id} colorHex={currentColorHex}
                    isHovered={hoveredCardId === e.id}
                    isActivated={activeEarbudId === e.id}
                    onSelect={() => { setSelectedEarbuds(e.id); setActiveEarbudId(e.id); }}
                    onHover={handleHover} onLeave={handleLeave}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === 'controllers' && (
            <>
              <Header
                title="Controller"
                sub="Shown when a gamepad connects."
                count={2}
              />
              <div className="wl-grid wl-grid-2">
                <DeviceCard
                  id="ps5_controller" modelId="ps5_controller"
                  name="PlayStation 5 DualSense" badge="Sony · gamepad" category="controller"
                  selected={selectedController === 'ps5_controller'}
                  colorHex={currentColorHex}
                  isHovered={hoveredCardId === 'ps5_controller'}
                  isActivated={false}
                  onSelect={() => setSelectedController('ps5_controller')}
                  onHover={handleHover} onLeave={handleLeave}
                />

                <div
                  className="wl-card"
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedController === 'xbox_controller'}
                  onClick={() => setSelectedController('xbox_controller')}
                  onMouseEnter={() => setHoveredCardId('xbox_controller')}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  {selectedController === 'xbox_controller' && (
                    <span className="wl-tick"><Check size={11} strokeWidth={3.2} /></span>
                  )}
                  <div style={{ opacity: xboxFading ? 0 : 1, transition: 'opacity 240ms ease' }}>
                    <Canvas3DCard
                      modelId={xboxVariant}
                      category="controller"
                      colorHex={currentColorHex}
                      isSelected={selectedController === 'xbox_controller'}
                      isHovered={hoveredCardId === 'xbox_controller'}
                    />
                  </div>
                  <span className="wl-card-name">Xbox Wireless Controller</span>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {[{ key: 'xbox_white', label: 'White' }, { key: 'xbox_black', label: 'Black' }].map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        className="wl-pill"
                        aria-pressed={xboxVariant === v.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedController('xbox_controller');
                          switchXboxVariant(v.key);
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'speakers' && (
            <>
              <Header
                title="Speakers & Soundbar"
                sub="External audio hardware."
                count={DEVICE_CATALOG.speakers.length}
              />
              <div className="wl-grid wl-grid-2">
                {DEVICE_CATALOG.speakers.map((s) => (
                  <DeviceCard
                    key={s.id} id={s.id} modelId={s.id}
                    name={s.name} badge={`${s.brand} · speaker`} category="speaker"
                    selected={selectedSpeaker === s.id} colorHex={currentColorHex}
                    isHovered={hoveredCardId === s.id}
                    isActivated={false}
                    onSelect={() => setSelectedSpeaker(s.id)}
                    onHover={handleHover} onLeave={handleLeave}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === 'style' && (
            <>
              <Header
                title="Style & Motion"
                sub="Physics presets for island state morphing."
              />

              <div style={{ marginBottom: 14 }}>
                <div className="wl-seg" role="group" aria-label="Device category">
                  {MOTION_CATEGORIES.map((m) => (
                    <button
                      key={m.cat}
                      type="button"
                      className="wl-seg-item"
                      aria-pressed={motionCat === m.cat}
                      onClick={() => setMotionCat(m.cat)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <MotionPreviewStage
                modelId={motionDeviceId}
                prefCategory={motionCat}
                animStyle={activeStyleId}
                deviceName={catalogNameFor(motionDeviceId)}
                styleName={activeStyleName}
              />

              <div className="wl-style-list" style={{ marginTop: 16 }}>
                {motionStyleList.map((anim) => (
                  <button
                    key={anim.id}
                    type="button"
                    className="wl-style"
                    aria-pressed={activeStyleId === anim.id}
                    onClick={() => setAnimStyles((prev) => ({ ...prev, [motionCat]: anim.id }))}
                  >
                    <span>{anim.name}</span>
                    {activeStyleId === anim.id
                      ? <Check size={15} strokeWidth={3} />
                      : <span className="wl-style-hint">Preview</span>}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 26 }}>
                <h2 className="wl-h1" style={{ fontSize: 15 }}>Hardware finish</h2>
                <p className="wl-sub" style={{ marginBottom: 12 }}>
                  Tints phone bodies. Earbud cases and AirPods Max keep their own finish.
                </p>
                <div className="wl-grid wl-grid-3">
                  {Object.keys(DEVICE_COLOR_VARIANTS).map((key) => {
                    const variant = DEVICE_COLOR_VARIANTS[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        className="wl-swatch"
                        aria-pressed={selectedColor === key}
                        onClick={() => setSelectedColor(key)}
                      >
                        <span className="wl-swatch-dot" style={{ background: variant.hex }} />
                        {variant.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── System & Placement Tab (macOS Inset Group Cards) ── */}
          {activeTab === 'system' && (
            <>
              <Header title="System & Placement" sub="Multi-monitor edge pinning and display behaviors." />

              <div className="wl-card-group">
                {/* Multi-Monitor Display Picker */}
                <div className="wl-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div className="wl-row-title">Active Monitor Placement</div>
                    <div className="wl-row-sub">
                      Attach Dynamic Island to the top edge of a specific display.
                    </div>
                  </div>
                  <select
                    value={selectedDisplay}
                    onChange={(e) => {
                      const dispId = e.target.value;
                      setSelectedDisplay(dispId);
                      if (window.electronAPI?.setTargetDisplay) {
                        window.electronAPI.setTargetDisplay(Number(dispId) || dispId);
                      }
                    }}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      background: 'var(--surface)', border: '1px solid var(--stroke)',
                      color: 'var(--label)', fontSize: 13, outline: 'none', cursor: 'pointer',
                    }}
                  >
                    <option value="">Default (Primary Monitor)</option>
                    {displays.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Smart Docking / Idle Auto-Hide */}
                <div className="wl-row">
                  <div>
                    <div className="wl-row-title">Smart Docking (Idle Auto-Hide)</div>
                    <div className="wl-row-sub">
                      Slides the island into the top bezel when idle, waking up when hovered.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoHideIdle}
                    aria-label="Smart Docking"
                    className="wl-switch"
                    onClick={() => setAutoHideIdle((v) => !v)}
                  >
                    <span className="wl-switch-knob" />
                  </button>
                </div>

                {/* Auto-Hide Idle Timer Duration Select */}
                {autoHideIdle && (
                  <div className="wl-row" style={{ paddingTop: 12, borderTop: '1px solid var(--stroke)' }}>
                    <div>
                      <div className="wl-row-title">Auto-Hide Timer Duration</div>
                      <div className="wl-row-sub">
                        Time before idle island docks into top bezel ({autoHideDuration}s).
                      </div>
                    </div>
                    <select
                      value={autoHideDuration}
                      onChange={(e) => setAutoHideDuration(Number(e.target.value))}
                      style={{
                        padding: '6px 12px', borderRadius: 8,
                        background: 'var(--surface)', border: '1px solid var(--stroke)',
                        color: 'var(--label)', fontSize: 13, outline: 'none', cursor: 'pointer',
                        fontWeight: 600, minWidth: 140,
                      }}
                    >
                      <option value={3}>3 Seconds (Fast)</option>
                      <option value={5}>5 Seconds</option>
                      <option value={10}>10 Seconds (Default)</option>
                      <option value={15}>15 Seconds</option>
                      <option value={30}>30 Seconds</option>
                      <option value={60}>1 Minute</option>
                    </select>
                  </div>
                )}

                {/* Hide during Fullscreen */}
                <div className="wl-row">
                  <div>
                    <div className="wl-row-title">Hide during fullscreen games</div>
                    <div className="wl-row-sub">
                      Keeps the island out of the way while an exclusive fullscreen game is running.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoHide}
                    aria-label="Hide during fullscreen games"
                    className="wl-switch"
                    onClick={() => setAutoHide((v) => !v)}
                  >
                    <span className="wl-switch-knob" />
                  </button>
                </div>

                {/* Focus Mode / DND Toggle */}
                <div className="wl-row">
                  <div>
                    <div className="wl-row-title">Toggle Focus Mode / Do Not Disturb</div>
                    <div className="wl-row-sub">
                      Shows DND badge indicator in Dynamic Island top bar.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`wl-switch ${isDndActive ? 'is-on' : ''}`}
                    aria-checked={isDndActive}
                    onClick={() => {
                      if (window.electronAPI?.toggleDnd) window.electronAPI.toggleDnd();
                    }}
                  >
                    <span className="wl-switch-knob" />
                  </button>
                </div>

                {/* Test Call Notification Banner */}
                <div className="wl-row">
                  <div>
                    <div className="wl-row-title">Test Call Notification Banner</div>
                    <div className="wl-row-sub">
                      Simulates an incoming Phone Link / WhatsApp call banner.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="wl-pill"
                    onClick={() => {
                      if (window.electronAPI?.triggerDemoCall) window.electronAPI.triggerDemoCall();
                    }}
                  >
                    Simulate Call
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'about' && (
            <div className="wl-about">
              <div className="wl-about-mark"><Sparkles size={32} /></div>
              <div className="wl-about-name">WinLand</div>
              <div className="wl-about-ver">Version 1.0.0</div>
              <p className="wl-about-copy">
                A Dynamic Island for Windows with 1:1 macOS Tahoe System Settings.
                Shows what is playing, what just connected, and how much battery it has left.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
