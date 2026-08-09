import React from 'react';
import { Play, Pause, X, RotateCcw, Plus } from 'lucide-react';
import { TimerInstance } from './timer.types';
import { TIMER_COLORS } from './timer.constants';

const SF_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", "SF Compact", "Helvetica Neue", system-ui, sans-serif';

function formatTimeMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

interface TimerRowProps {
  timer: TimerInstance;
  isFirst: boolean;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onReset: (id: string) => void;
  onAddSplit?: () => void;
  onUpdateLabel: (id: string, label: string) => void;
}

export const TimerRow: React.FC<TimerRowProps> = ({
  timer,
  isFirst,
  onToggle,
  onRemove,
  onReset,
  onAddSplit,
  onUpdateLabel,
}) => {
  const isRunning = timer.status === 'running';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: 56,
        padding: '0 8px',
        boxSizing: 'border-box',
        fontFamily: SF_FONT,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left cluster: 44px circular control buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Play/Pause button — solid orange (#FF9F0A) circle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(timer.id);
          }}
          title={isRunning ? 'Pause' : 'Start'}
          className="interactive-child"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: isRunning ? 'rgba(255, 159, 10, 0.28)' : TIMER_COLORS.accent,
            border: `1.5px solid ${TIMER_COLORS.accent}`,
            color: isRunning ? TIMER_COLORS.accent : '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, background 0.15s ease',
            flexShrink: 0,
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
        >
          {isRunning ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
          )}
        </button>

        {/* Close (X) button — dark gray circle (#3A3A3C) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(timer.id);
          }}
          title="Close Timer"
          className="interactive-child"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: TIMER_COLORS.buttonSecondary,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: TIMER_COLORS.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, background 0.15s ease',
            flexShrink: 0,
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
        >
          <X size={18} />
        </button>

        {/* Reset/Restart button — clock-arrow glyph (⟲) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReset(timer.id);
          }}
          title="Reset Timer"
          className="interactive-child"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: TIMER_COLORS.buttonSecondary,
            border: `1.5px solid ${TIMER_COLORS.buttonSecondary}`,
            color: TIMER_COLORS.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, background 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.color = '#000000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = TIMER_COLORS.buttonSecondary;
            e.currentTarget.style.color = TIMER_COLORS.white;
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
        >
          <RotateCcw size={17} />
        </button>

        {/* Add Split Timer Button (+) on primary row */}
        {isFirst && onAddSplit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddSplit();
            }}
            title="Add Split Timer"
            className="interactive-child"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(255, 159, 10, 0.16)',
              border: `1.5px solid rgba(255, 159, 10, 0.45)`,
              color: TIMER_COLORS.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, background 0.15s ease',
              flexShrink: 0,
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {/* Right cluster: editable label + large orange countdown digits */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          value={timer.label || 'Timer'}
          onChange={(e) => onUpdateLabel(timer.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="Timer"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: TIMER_COLORS.label,
            fontSize: 14,
            fontWeight: 500,
            textAlign: 'right',
            width: 100,
            fontFamily: SF_FONT,
            caretColor: TIMER_COLORS.accent,
          }}
        />
        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: TIMER_COLORS.accent,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-1px',
            fontFamily: SF_FONT,
            lineHeight: 1,
          }}
        >
          {formatTimeMs(timer.remainingMs)}
        </span>
      </div>
    </div>
  );
};
