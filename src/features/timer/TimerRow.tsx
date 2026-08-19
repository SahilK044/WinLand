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

interface GlowButtonProps {
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  className?: string;
  glowColor?: string;
  style?: React.CSSProperties;
  hoverStyle?: React.CSSProperties;
  children: React.ReactNode;
}

const GlowButton: React.FC<GlowButtonProps> = ({
  onClick,
  className = '',
  glowColor,
  style = {},
  hoverStyle = {},
  children,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const baseStyle: React.CSSProperties = {
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
    position: 'relative',
    WebkitAppearance: 'none',
    WebkitFontSmoothing: 'antialiased',
    backfaceVisibility: 'hidden',
    transform: isPressed
      ? 'translateZ(0) scale(0.92)'
      : isHovered
      ? 'translateZ(0) scale(1.08)'
      : 'translateZ(0) scale(1.0)',
    transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.18s ease, box-shadow 0.18s ease, color 0.18s ease',
    ...style,
    ...(isHovered ? hoverStyle : {}),
  };

  return (
    <button
      onClick={onClick}
      className={`interactive-child ${className}`}
      style={baseStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {glowColor && (
        <div
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </span>
    </button>
  );
};

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
  const [isMounted, setIsMounted] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    setLocalLabel(timer.label ?? '');
  }, [timer.label]);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onRemove(timer.id);
    }, 280);
  };

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

  const isVisible = isMounted && !isExiting;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: isVisible ? 56 : 0,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-14px) scale(0.92)',
        overflow: isVisible ? 'visible' : 'hidden',
        padding: '0 8px',
        boxSizing: 'border-box',
        fontFamily: SF_FONT,
        transition: 'height 0.32s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease, transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'height, opacity, transform',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left cluster: 44px circular control buttons with smooth radial glow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Play/Pause button — solid orange (#FF9F0A) circle */}
        <GlowButton
          onClick={(e) => {
            e.stopPropagation();
            onToggle(timer.id);
          }}
          glowColor="rgba(255, 159, 10, 0.7)"
          style={{
            background: isRunning ? 'rgba(255, 159, 10, 0.22)' : TIMER_COLORS.accent,
            color: isRunning ? TIMER_COLORS.accent : '#000000',
            boxShadow: isRunning
              ? 'inset 0 0 0 1.5px #FF9F0A'
              : '0 2px 10px rgba(255, 159, 10, 0.4)',
          }}
          hoverStyle={{
            background: isRunning ? 'rgba(255, 159, 10, 0.32)' : '#FFAA2C',
            boxShadow: isRunning
              ? 'inset 0 0 0 1.5px #FF9F0A'
              : '0 2px 14px rgba(255, 159, 10, 0.65)',
          }}
        >
          {isRunning ? (
            <Pause size={18} fill="currentColor" style={{ shapeRendering: 'geometricPrecision' }} />
          ) : (
            <Play size={18} fill="currentColor" style={{ marginLeft: 2, shapeRendering: 'geometricPrecision' }} />
          )}
        </GlowButton>

        {/* Close (X) button — dark gray circle (#3A3A3C) */}
        <GlowButton
          onClick={handleRemove}
          glowColor="rgba(255, 59, 48, 0.6)"
          style={{
            background: TIMER_COLORS.buttonSecondary,
            color: TIMER_COLORS.white,
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.16)',
          }}
          hoverStyle={{
            background: 'rgba(255, 59, 48, 0.28)',
            color: '#FF453A',
            boxShadow: 'inset 0 0 0 1.5px #FF453A',
          }}
        >
          <X size={18} style={{ shapeRendering: 'geometricPrecision' }} />
        </GlowButton>

        {/* Reset/Restart button — clock-arrow glyph (⟲) */}
        <GlowButton
          onClick={(e) => {
            e.stopPropagation();
            onReset(timer.id);
          }}
          glowColor="rgba(255, 255, 255, 0.6)"
          style={{
            background: TIMER_COLORS.buttonSecondary,
            color: TIMER_COLORS.white,
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.16)',
          }}
          hoverStyle={{
            background: '#ffffff',
            color: '#000000',
            boxShadow: '0 2px 12px rgba(255, 255, 255, 0.5)',
          }}
        >
          <RotateCcw size={17} style={{ shapeRendering: 'geometricPrecision' }} />
        </GlowButton>

        {/* Add Split Timer Button (+) on primary row */}
        {isFirst && onAddSplit && (
          <GlowButton
            onClick={(e) => {
              e.stopPropagation();
              onAddSplit();
            }}
            glowColor="rgba(255, 159, 10, 0.6)"
            style={{
              background: 'rgba(255, 159, 10, 0.16)',
              color: TIMER_COLORS.accent,
              boxShadow: 'inset 0 0 0 1.5px rgba(255, 159, 10, 0.45)',
            }}
            hoverStyle={{
              background: 'rgba(255, 159, 10, 0.32)',
              boxShadow: 'inset 0 0 0 1.5px #FF9F0A',
            }}
          >
            <Plus size={18} style={{ shapeRendering: 'geometricPrecision' }} />
          </GlowButton>
        )}
      </div>

      {/* Right cluster: editable label + large orange countdown digits */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          aria-label="Timer Label"
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
