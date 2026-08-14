import { FOCUS_STATES, MOVEMENT_CATEGORIES, DEFAULT_CONFIG } from './smartFocusTypes.js';

export function createSmartFocusEngine(userConfig = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    clickFocusHoldMs: 2200,      // Clicks hold zoom for 2.2s
    minFocusHoldMs: 2000,        // Drag / interaction hold duration
    focusRadius: 0.18,           // Movement within 18% screen maintains current focus
    ...userConfig
  };

  let bounds = { x: 0, y: 0, width: 1920, height: 1080 };

  const cursor = { x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5, lastMoveTime: 0, speed: 0, direction: 0 };
  const movement = { category: MOVEMENT_CATEGORIES.IDLE, lastSignificantPos: { x: 0.5, y: 0.5 }, lastSignificantTime: 0 };
  const interaction = { buttonDown: false, downPos: { x: 0.5, y: 0.5 }, downTime: 0, dragging: false, dragDistance: 0 };

  const MAX_CLICKS = 20;
  const clicks = new Array(MAX_CLICKS).fill(null).map(() => ({ t: 0, x: 0, y: 0, button: null, active: false }));
  let clickHead = 0;

  const focus = {
    state: FOCUS_STATES.OVERVIEW,
    targetX: 0.5,
    targetY: 0.5,
    targetZoom: 1.0,
    holdUntil: 0,
    lastClickTime: 0,
    lastStateChangeTime: 0,
    reason: 'Initial Overview'
  };

  const currentDecision = {
    state: focus.state,
    confidence: 1.0,
    targetX: focus.targetX,
    targetY: focus.targetY,
    targetZoom: focus.targetZoom,
    reason: focus.reason
  };

  function setBounds(newBounds) {
    bounds.x = newBounds.x ?? bounds.x;
    bounds.y = newBounds.y ?? bounds.y;
    bounds.width = newBounds.width ?? bounds.width;
    bounds.height = newBounds.height ?? bounds.height;
  }

  function normalizeX(gx) { return Math.max(0, Math.min(1, (gx - bounds.x) / (bounds.width || 1))); }
  function normalizeY(gy) { return Math.max(0, Math.min(1, (gy - bounds.y) / (bounds.height || 1))); }

  function handlePointerEvent(event) {
    const { t, globalX, globalY, type, button } = event;
    const nx = normalizeX(globalX);
    const ny = normalizeY(globalY);

    if (type === 'move') {
      const dt = Math.max(1, t - cursor.lastMoveTime);
      const dtSec = dt / 1000;
      const dx = nx - cursor.x;
      const dy = ny - cursor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      cursor.prevX = cursor.x;
      cursor.prevY = cursor.y;
      cursor.x = nx;
      cursor.y = ny;

      if (dist > config.jitterRadius) {
        cursor.speed = dist / dtSec;
        cursor.direction = Math.atan2(dy, dx);
        cursor.lastMoveTime = t;

        if (cursor.speed > config.fastTravelSpeed) {
          movement.category = MOVEMENT_CATEGORIES.FAST_TRAVEL;
        } else {
          movement.category = MOVEMENT_CATEGORIES.MOVING;
        }
      }

      // Drag detection
      if (interaction.buttonDown) {
        const downDx = nx - interaction.downPos.x;
        const downDy = ny - interaction.downPos.y;
        interaction.dragDistance = Math.sqrt(downDx * downDx + downDy * downDy);
        if (interaction.dragDistance > config.dragMinDistance) {
          interaction.dragging = true;
        }
      }
    } else if (type === 'down') {
      const click = clicks[clickHead];
      click.t = t;
      click.x = nx;
      click.y = ny;
      click.button = button;
      click.active = true;
      clickHead = (clickHead + 1) % MAX_CLICKS;

      interaction.buttonDown = true;
      interaction.downPos.x = nx;
      interaction.downPos.y = ny;
      interaction.downTime = t;
      interaction.dragging = false;
      interaction.dragDistance = 0;

      focus.lastClickTime = t;
      focus.holdUntil = t + config.clickFocusHoldMs;
      focus.state = FOCUS_STATES.CLICK_FOCUS;
      focus.targetX = nx;
      focus.targetY = ny;
      focus.reason = 'Click interaction';
      focus.lastStateChangeTime = t;
    } else if (type === 'up') {
      interaction.buttonDown = false;
      if (interaction.dragging) {
        interaction.dragging = false;
        focus.holdUntil = t + config.minFocusHoldMs;
        focus.state = FOCUS_STATES.CLICK_FOCUS;
        focus.targetX = nx;
        focus.targetY = ny;
        focus.reason = 'Drag end focus';
        focus.lastStateChangeTime = t;
      }
    }
  }

  function update(now) {
    // 1. Age out clicks
    for (let i = 0; i < MAX_CLICKS; i++) {
      if (clicks[i].active && (now - clicks[i].t > config.clickWindowMs)) {
        clicks[i].active = false;
      }
    }

    const isMoving = (now - cursor.lastMoveTime) < config.idleThresholdMs;
    const isLocked = now < focus.holdUntil;

    // 2. State Machine
    if (interaction.dragging) {
      focus.state = FOCUS_STATES.DRAG;
      focus.targetX = cursor.x;
      focus.targetY = cursor.y;
      focus.reason = 'Active drag';
    } else if (isLocked) {
      // While locked in focus after a click/drag, stay focused on target
      const dx = cursor.x - focus.targetX;
      const dy = cursor.y - focus.targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > config.focusRadius && isMoving) {
        // If user moves noticeably away to another element, pan over smoothly
        focus.targetX = cursor.x;
        focus.targetY = cursor.y;
      }
    } else {
      // When not locked in a click interaction:
      // If mouse is NOT clicking or NOT moving, return to full screen (1.0x Overview)!
      if (!isMoving || (now - focus.lastClickTime > 2000)) {
        focus.state = FOCUS_STATES.OVERVIEW;
        focus.targetX = 0.5;
        focus.targetY = 0.5;
        focus.reason = 'Full screen overview';
      } else {
        // Gentle follow during transit
        focus.state = FOCUS_STATES.FOLLOW;
        focus.targetX = cursor.x;
        focus.targetY = cursor.y;
        focus.reason = 'Cursor travel';
      }
    }

    // 3. Stable Zoom Target
    switch (focus.state) {
      case FOCUS_STATES.OVERVIEW:
      case FOCUS_STATES.RETURN:
        focus.targetZoom = 1.0;
        break;
      case FOCUS_STATES.FOLLOW:
        focus.targetZoom = 1.08;
        break;
      case FOCUS_STATES.CLICK_FOCUS:
      case FOCUS_STATES.FOCUS:
        focus.targetZoom = 1.45;
        break;
      case FOCUS_STATES.DRAG:
        focus.targetZoom = 1.35;
        break;
      default:
        focus.targetZoom = 1.0;
        break;
    }

    currentDecision.state = focus.state;
    currentDecision.confidence = 1.0;
    currentDecision.targetX = focus.targetX;
    currentDecision.targetY = focus.targetY;
    currentDecision.targetZoom = focus.targetZoom;
    currentDecision.reason = focus.reason;

    return currentDecision;
  }

  function reset() {
    focus.state = FOCUS_STATES.OVERVIEW;
    focus.targetX = 0.5;
    focus.targetY = 0.5;
    focus.targetZoom = 1.0;
    focus.holdUntil = 0;
    cursor.x = 0.5;
    cursor.y = 0.5;
    cursor.speed = 0;
    interaction.buttonDown = false;
    interaction.dragging = false;
    for (let i = 0; i < MAX_CLICKS; i++) clicks[i].active = false;
  }

  function destroy() {
    reset();
  }

  function getDecision() {
    return currentDecision;
  }

  return {
    setBounds,
    handlePointerEvent,
    update,
    reset,
    destroy,
    getDecision
  };
}

