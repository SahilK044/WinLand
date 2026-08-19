import React, { useEffect, useState } from 'react';
import { Play, Pause, Timer as TimerIcon } from 'lucide-react';
import { timerStore } from '../../features/timer/TimerStore';
import { TimerRow } from '../../features/timer/TimerRow';
import { TIMER_COLORS } from '../../features/timer/timer.constants';

const SF_FONT = '"SF Pro Display", "SF Pro Text", "SF Pro", -apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", system-ui, sans-serif';

const DEFAULT_FALLBACK_TIMERS = [
  { id: 'default', label: 'Timer', durationMs: 300000, remainingMs: 300000, status: 'paused', createdAt: 0 },
];

function formatTimeMs(ms) {
  const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function TimerWidget({
  isCompact,
  isSplit,
  isExpanded,
  onExpand,
}) {
  const [timers, setTimers] = useState(() => timerStore.getTimers());
  const handleResetTimer = (id) => timerStore.resetTimer(id);

  useEffect(() => {
    const unsubscribe = timerStore.subscribe((updatedTimers) => {
      setTimers(updatedTimers);
    });
    return unsubscribe;
  }, []);

  const activeTimers = timers.length > 0 ? timers : DEFAULT_FALLBACK_TIMERS;

  const primaryTimer = activeTimers[0];
  const isPrimaryRunning = primaryTimer.status === 'running';

  // 1. Split Pill Mode
  if (isSplit) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
      >
        <TimerIcon size={14} color={TIMER_COLORS.accent} strokeWidth={2.3} />
        <span
          className="timer-accent-text"
          style={{ fontSize: 11.5, fontWeight: 700, color: TIMER_COLORS.accent, fontVariantNumeric: 'tabular-nums' }}
        >
          {formatTimeMs(primaryTimer.remainingMs)}
        </span>
      </div>
    );
  }

  // Determine active view mode if not explicitly passed
  const showCompact = isCompact || (!isExpanded && !isSplit);
  const showExpanded = isExpanded;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        fontFamily: SF_FONT,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Layer A: Compact View (Morphs out on expand, morphs in on collapse) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          boxSizing: 'border-box',
          opacity: showCompact ? 1 : 0,
          transform: showCompact ? 'scale(1)' : 'scale(0.90)',
          pointerEvents: showCompact ? 'auto' : 'none',
          transition: 'opacity 0.24s ease 0.04s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'pointer',
          zIndex: showCompact ? 2 : 1,
        }}
        onClick={onExpand}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(255, 159, 10, 0.16)',
              boxShadow: 'inset 0 0 0 1px rgba(255, 159, 10, 0.45)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TimerIcon size={12} color={TIMER_COLORS.accent} strokeWidth={2.3} />
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: TIMER_COLORS.accent,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.2px',
            }}
          >
            {formatTimeMs(primaryTimer.remainingMs)}
          </span>
        </div>
        <button
          aria-label={isPrimaryRunning ? 'Pause Timer' : 'Start Timer'}
          onClick={(e) => {
            e.stopPropagation();
            timerStore.toggleTimer(primaryTimer.id);
          }}
          className="interactive-child"
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.12)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.18)',
            border: 'none',
            outline: 'none',
            padding: 0,
            margin: 0,
            WebkitAppearance: 'none',
            WebkitFontSmoothing: 'antialiased',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            color: '#fff',
          }}
        >
          {isPrimaryRunning ? (
            <Pause size={11} fill="currentColor" />
          ) : (
            <Play size={11} fill="currentColor" style={{ marginLeft: 1 }} />
          )}
        </button>
      </div>

      {/* Layer B: Expanded View (Morphs in on expand, morphs out on collapse) */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 18px',
          boxSizing: 'border-box',
          opacity: showExpanded ? 1 : 0,
          transform: showExpanded ? 'scale(1)' : 'scale(0.92)',
          pointerEvents: showExpanded ? 'auto' : 'none',
          transition: 'opacity 0.28s ease 0.05s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: showExpanded ? 2 : 1,
        }}
      >
        {activeTimers.map((timer, index) => (
          <TimerRow
            key={timer.id}
            timer={timer}
            isFirst={index === 0}
            onToggle={(id) => timerStore.toggleTimer(id)}
            onRemove={(id) => timerStore.removeTimer(id)}
            onReset={handleResetTimer}
            onAddSplit={() => timerStore.addTimer()}
            onUpdateLabel={(id, label) => timerStore.updateLabel(id, label)}
          />
        ))}
      </div>
    </div>
  );
}
