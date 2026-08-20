/**
 * The user's chosen device per category, and the animation style to play when
 * one connects or disconnects.
 *
 * Settings and the Dynamic Island are separate renderer windows. They share an
 * origin, so localStorage carries the values across a relaunch, while live
 * edits are relayed over IPC (device-prefs-changed → device-prefs-update) so
 * the island reflects a change immediately instead of on next launch.
 */

export const PREF_KEYS = {
  phone: 'winland_phone_id',
  headphones: 'winland_headphones_id',
  earbuds: 'winland_earbuds_id',
  controller: 'winland_controller_id',
  speaker: 'winland_speaker_id',
};

export const STYLE_KEYS = {
  phone: 'winland_anim_style_phone',
  headphones: 'winland_anim_style_headphones',
  earbuds: 'winland_anim_style_earbuds',
  controller: 'winland_anim_style_controller',
  speaker: 'winland_anim_style_speaker',
};

export const DEFAULT_DEVICES = {
  phone: 's24ultra',
  headphones: 'razerbarracuda',
  earbuds: 'airpodspro',
  controller: 'ps5_controller',
  speaker: 'sonos_soundbar',
};

export const DEFAULT_STYLES = {
  phone: 'amoled',
  headphones: 'spin',
  earbuds: 'case-dock',
  controller: 'levitate',
  speaker: 'wave',
};

// The Xbox card offers a colour variant, which is a different GLB.
export const XBOX_VARIANT_KEY = 'winland_xbox_variant';
export const MUSIC_AURA_KEY = 'winland_music_aura';
export const MUSIC_WAVES_KEY = 'winland_music_waves';
export const THEME_MODE_KEY = 'winland_theme_mode';

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export function readDevicePrefs() {
  const devices = {};
  const styles = {};
  for (const cat of Object.keys(PREF_KEYS)) {
    devices[cat] = read(PREF_KEYS[cat], DEFAULT_DEVICES[cat]);
    styles[cat] = read(STYLE_KEYS[cat], DEFAULT_STYLES[cat]);
  }
  // 'xbox_controller' is a catalog entry, not a model; resolve to the variant.
  if (devices.controller === 'xbox_controller') {
    devices.controller = read(XBOX_VARIANT_KEY, 'xbox_white');
  }
  const musicAura = read(MUSIC_AURA_KEY, 'true') !== 'false';
  const musicWaves = read(MUSIC_WAVES_KEY, 'true') !== 'false';
  const themeMode = read(THEME_MODE_KEY, 'dark');
  return { devices, styles, musicAura, musicWaves, themeMode };
}

/** Map a detected bluetooth device category to the pref category. */
export function prefCategoryFor(deviceCategory) {
  if (!deviceCategory || typeof deviceCategory !== 'string') return null;
  const cat = deviceCategory.toLowerCase().trim();
  switch (cat) {
    case 'earbud':
    case 'earbuds':
    case 'audio':
      return 'earbuds';
    case 'headphone':
    case 'headphones':
    case 'headset':
      return 'headphones';
    case 'controller':
    case 'controllers':
    case 'gamepad':
      return 'controller';
    case 'speaker':
    case 'speakers':
    case 'soundbar':
      return 'speaker';
    case 'phone':
    case 'phones':
    case 'smartphone':
      return 'phone';
    default:
      return null; // mouse/keyboard have no 3D model; keep the vector icon
  }
}

/** Engine category (how the model is rigged) for a pref category. */
export function engineCategoryFor(prefCategory) {
  if (!prefCategory || typeof prefCategory !== 'string') return 'phone';
  const cat = prefCategory.toLowerCase().trim();
  switch (cat) {
    case 'earbud':
    case 'earbuds':
      return 'earbud';
    case 'headphone':
    case 'headphones':
    case 'headset':
      return 'headphone';
    case 'controller':
    case 'controllers':
    case 'gamepad':
      return 'controller';
    case 'speaker':
    case 'speakers':
    case 'soundbar':
      return 'speaker';
    case 'phone':
    case 'phones':
    default:
      return 'phone';
  }
}
