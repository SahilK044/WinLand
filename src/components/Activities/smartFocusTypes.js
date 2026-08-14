export const FOCUS_STATES = {
  OVERVIEW: 'OVERVIEW',
  FOLLOW: 'FOLLOW',
  FOCUS: 'FOCUS',
  CLICK_FOCUS: 'CLICK_FOCUS',
  DRAG: 'DRAG',
  RETURN: 'RETURN',
  IDLE: 'OVERVIEW', // Alias — camera starts in OVERVIEW
};

export const MOVEMENT_CATEGORIES = {
  JITTER: 'JITTER',
  MOVING: 'MOVING',
  FAST_TRAVEL: 'FAST_TRAVEL',
  APPROACHING: 'APPROACHING',
  IDLE: 'IDLE'
};

export const DEFAULT_CONFIG = {
  // Movement analysis
  movementThreshold: 4,        // normalized distance * 1000 to count as real movement
  jitterRadius: 0.003,         // normalized coords — movement below this is jitter
  fastTravelSpeed: 0.8,        // normalized units/sec — above this = fast travel
  approachDecelRatio: 0.4,     // speed ratio that indicates approaching/slowing

  // Dwell detection
  dwellTimeMs: 350,            // how long cursor must settle to count as dwell
  dwellRadius: 0.015,          // normalized distance — movement within this = still dwelling

  // Click analysis
  clickWindowMs: 3000,         // rolling window for recent click history
  clickClusterRadius: 0.06,    // normalized distance — clicks within this form a cluster
  minClicksForStrongFocus: 2,  // clicks in a cluster for high confidence

  // Drag detection
  dragMinDistance: 0.02,       // normalized distance while button held to count as drag

  // Focus scoring weights
  weights: {
    movement: 0.15,
    approach: 0.20,
    dwell: 0.20,
    click: 0.25,
    clickCluster: 0.30,
    drag: 0.20,
    recentFocusPenalty: -0.15,
  },

  // Focus score interpretation bands
  overviewThreshold: 0.24,
  followThreshold: 0.49,
  focusThreshold: 0.74,

  // Cooldowns
  zoomInCooldownMs: 400,
  zoomOutCooldownMs: 600,
  focusSwitchCooldownMs: 300,
  minFocusDurationMs: 500,
  minMovementForNewFocus: 0.08,

  // Hysteresis
  focusHoldMovementThreshold: 0.05,

  // State timing
  returnDelayMs: 1500,
  idleThresholdMs: 300,

  // Target selection params
  lookAheadGainMs: 0.2
};
