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
  const [localLabel, setLocalLabel] = React.useState(timer.label ?? '');

  React.useEffect(() => {
    setLocalLabel(timer.label ?? '');
  }, [timer.label]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalLabel(val);
    onUpdateLabel(timer.id, val);
  };

  const handleLabelBlur = () => {
    if (!localLabel.trim()) {
      setLocalLabel('Timer');
      onUpdateLabel(timer.id, 'Timer');
    }
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const baseBtnStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    border: 'none',
    outline: 'none',
    padding: 0,
    margin: 0,
    WebkitAppearance: 'none',
    WebkitFontSmoothing: 'antialiased',
    backfaceVisibility: 'hidden',
    transform: 'translateZ(0)',
    transition: 'transform 0.15s cubic-bezier(0.2, 0.9, 0.2, 1), background 0.15s ease, box-shadow 0.15s ease',
  };

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
            ...baseBtnStyle,
            background: isRunning ? 'rgba(255, 159, 10, 0.22)' : TIMER_COLORS.accent,
            color: isRunning ? TIMER_COLORS.accent : '#000000',
            boxShadow: isRunning
              ? 'inset 0 0 0 1.5px #FF9F0A, 0 0 12px rgba(255, 159, 10, 0.2)'
              : '0 0 14px rgba(255, 159, 10, 0.45)',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'translateZ(0) scale(0.94)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateZ(0) scale(1.0)')}
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
            ...baseBtnStyle,
            background: TIMER_COLORS.buttonSecondary,
            color: TIMER_COLORS.white,
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.16)',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'translateZ(0) scale(0.94)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateZ(0) scale(1.0)')}
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
            ...baseBtnStyle,
            background: TIMER_COLORS.buttonSecondary,
            color: TIMER_COLORS.white,
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.16)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.color = '#000000';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = TIMER_COLORS.buttonSecondary;
            e.currentTarget.style.color = TIMER_COLORS.white;
            e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.16)';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'translateZ(0) scale(0.94)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateZ(0) scale(1.0)')}
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
              ...baseBtnStyle,
              background: 'rgba(255, 159, 10, 0.16)',
              color: TIMER_COLORS.accent,
              boxShadow: 'inset 0 0 0 1.5px rgba(255, 159, 10, 0.45)',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'translateZ(0) scale(0.94)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'translateZ(0) scale(1.0)')}
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {/* Right cluster: editable label + large orange countdown digits */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          value={localLabel}
          onChange={handleLabelChange}
          onBlur={handleLabelBlur}
          onKeyDown={handleLabelKeyDown}
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
