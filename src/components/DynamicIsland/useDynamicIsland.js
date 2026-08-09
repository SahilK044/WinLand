import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const PILL_STATE = Object.freeze({ IDLE_COMPACT: 'idle-compact', COMPACT_ACTIVE: 'compact-active', EXPANDED_WIDGET: 'expanded-widget' });
export const ACTIVE_WIDGET = Object.freeze({ NONE: 'none', MEDIA: 'media', BLUETOOTH: 'bluetooth', NOTIFICATION: 'notification' });
const COMPACT_STATES = new Set(['idle', 'compact-music', 'compact-timer', 'compact-call', 'compact-live-activity']);
const EXPANDED_STATES = new Set(['expanded-music', 'expanded-lyrics', 'expanded-timer', 'expanded-call', 'expanded-airdrop', 'expanded-recorder', 'expanded-screenrec', 'expanded-battery', 'expanded-weather', 'expanded-shelf', 'expanded-sysmon', 'expanded-launcher', 'expanded-settings', 'expanded-screenshot', 'expanded-bluetooth', 'expanded-live-activity', 'volume-osd', 'notification']);

function getActiveWidget(state) {
  if (state === 'expanded-bluetooth') return ACTIVE_WIDGET.BLUETOOTH;
  if (state === 'notification') return ACTIVE_WIDGET.NOTIFICATION;
  if (state === 'compact-music' || state === 'expanded-music' || state === 'expanded-lyrics') return ACTIVE_WIDGET.MEDIA;
  return ACTIVE_WIDGET.NONE;
}

function getPillState(state) {
  if (EXPANDED_STATES.has(state)) return PILL_STATE.EXPANDED_WIDGET;
  if (COMPACT_STATES.has(state) && state !== 'idle') return PILL_STATE.COMPACT_ACTIVE;
  return PILL_STATE.IDLE_COMPACT;
}

function expandState(state) {
  if (state === 'compact-music') return 'expanded-music';
  if (state === 'compact-timer') return 'expanded-timer';
  if (state === 'compact-call') return 'expanded-call';
  if (state === 'compact-live-activity') return 'expanded-live-activity';
  return null;
}

export function useDynamicIsland({ activeState, setActiveState, hoverDelay = 150 }) {
  const timerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const clearTimer = useCallback(() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = null; }, []);
  const collapse = useCallback(() => {
    clearTimer();
    setActiveState((state) => {
      if (state === 'expanded-bluetooth' || state === 'notification') return 'idle';
      if (!EXPANDED_STATES.has(state)) return state;
      if (state === 'expanded-call') return 'compact-call';
      if (state === 'expanded-timer') return 'compact-timer';
      if (state === 'expanded-live-activity') return 'compact-live-activity';
      return 'compact-music';
    });
  }, [clearTimer, setActiveState]);
  const onPointerEnter = useCallback(() => {
    setIsHovered(true);
    clearTimer();
    const next = expandState(activeState);
    if (next) timerRef.current = setTimeout(() => setActiveState(next), hoverDelay);
  }, [activeState, clearTimer, hoverDelay, setActiveState]);
  const onPointerLeave = useCallback(() => { setIsHovered(false); clearTimer(); }, [clearTimer]);
  useEffect(() => {
    const onPointerDown = (event) => { if (!event.target.closest?.('.island-capsule, .island-anchor')) collapse(); };
    const onKeyDown = (event) => { if (event.key === 'Escape') collapse(); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown); clearTimer(); };
  }, [clearTimer, collapse]);
  return useMemo(() => ({ isExpanded: getPillState(activeState) === PILL_STATE.EXPANDED_WIDGET, pillState: getPillState(activeState), activeWidget: getActiveWidget(activeState), isHovered, isFocused, setIsFocused, onPointerEnter, onPointerLeave, collapse }), [activeState, collapse, isFocused, isHovered, onPointerEnter, onPointerLeave]);
}
