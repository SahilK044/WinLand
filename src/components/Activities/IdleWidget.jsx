import React, { useState, useEffect } from 'react';
import { conditionIcon, weatherTempString } from '../../utils/weatherUtils';

export default function IdleWidget({ weatherConfig }) {
  const [now, setNow] = useState(() => new Date());

  const tempStr = weatherTempString(weatherConfig);
  const condition = weatherConfig?.weatherCondition || 'Clear';
  const ConditionGlyph = conditionIcon(condition);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        fontFamily: 'var(--mac-font), -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        WebkitFontSmoothing: 'antialiased',
        userSelect: 'none',
        padding: '2px 0',
      }}
    >
      {/* Time in Middle — menu-bar-clock style: bold tabular digits, AM/PM demoted to a small tracked suffix */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 3,
          lineHeight: '17px',
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'inherit',
            letterSpacing: '-0.2px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayHours}:{displayMinutes}
        </span>
        <span
          className="widget-subtitle"
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
          }}
        >
          {ampm}
        </span>
      </div>

      {/* Live weather under the time */}
      <div
        className="widget-subtitle"
        style={{
          fontSize: 10,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 3,
        }}
      >
        <ConditionGlyph size={11} />
        <span>{tempStr} {condition}</span>
      </div>
    </div>
  );
}
