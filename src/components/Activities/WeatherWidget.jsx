import React, { useState, useEffect } from 'react';
import { conditionIcon, weatherTempString } from './IdleWidget';

export default function WeatherWidget({ isCompact, weatherConfig }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const tempDisplay = weatherTempString(weatherConfig);
  const condition = weatherConfig?.weatherCondition || 'Clear';
  const ConditionGlyph = conditionIcon(condition);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const fullDateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (isCompact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ConditionGlyph size={14} color="rgba(255, 255, 255, 0.85)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>{condition}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{tempDisplay}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 20px',
        boxSizing: 'border-box',
        color: '#ffffff',
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
      }}
    >
      {/* Big Centered Digital Time */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, lineHeight: 1 }}>
        <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums' }}>
          {displayHours}:{displayMinutes}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.55)' }}>
          {ampm}
        </span>
      </div>

      {/* Date directly under the Big Time */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255, 255, 255, 0.65)', marginTop: 4, letterSpacing: '-0.1px' }}>
        {fullDateStr}
      </div>

      {/* Weather Info in Smaller Text under Date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          gap: 8,
          marginTop: 14,
          padding: '6px 14px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        <ConditionGlyph size={16} color="#007aff" />
        <span>{condition}</span>
        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</span>
        <span style={{ fontWeight: 700, color: '#ffffff' }}>{tempDisplay}</span>
      </div>
    </div>
  );
}
