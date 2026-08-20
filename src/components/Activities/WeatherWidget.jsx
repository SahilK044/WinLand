import React, { useState, useEffect, useRef } from 'react';
import {
  conditionIcon,
  conditionColor,
  weatherTempString,
  searchPlaces,
  fetchWeatherForCoordinates,
  fetchLiveWeather,
} from '../../utils/weatherUtils';
import { RefreshCw, MapPin, Search, Loader2, X } from 'lucide-react';

export default function WeatherWidget({
  isCompact,
  weatherConfig,
  onUpdateWeather,
  onSuggestionsChange,
  isLight = false,
}) {
  const [now, setNow] = useState(() => new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // Sync suggestion count to expand the dynamic island container smoothly
  useEffect(() => {
    if (onSuggestionsChange) {
      const count = isEditing ? Math.min(suggestions.length, 3) : 0;
      onSuggestionsChange(count);
    }
  }, [suggestions, isEditing, onSuggestionsChange]);

  // Debounced auto-complete place search as user types
  useEffect(() => {
    if (!isEditing || !cityInput.trim() || cityInput.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);
    let isMounted = true;

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(cityInput.trim());
        if (isMounted) setSuggestions((results || []).slice(0, 3));
      } catch {
        if (isMounted) setSuggestions([]);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 180);

    return () => {
      isMounted = false;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [cityInput, isEditing]);

  const tempDisplay = weatherTempString(weatherConfig);
  const condition = weatherConfig?.weatherCondition || (() => {
    try {
      const saved = localStorage.getItem('winland_live_weather');
      if (saved) return JSON.parse(saved).weatherCondition;
    } catch {}
    return '';
  })() || 'Weather';

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const fullDateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const isNight = hours < 6 || hours >= 20;

  const ConditionGlyph = conditionIcon(condition, isNight);
  const iconColor = conditionColor(condition, isLight, isNight);

  const handleSelectPlace = async (place) => {
    setIsRefreshing(true);
    setIsEditing(false);
    setSuggestions([]);
    if (onSuggestionsChange) onSuggestionsChange(0);
    try {
      try {
        localStorage.setItem('winland_custom_city', place.name);
        localStorage.setItem('winland_custom_lat', String(place.latitude));
        localStorage.setItem('winland_custom_lon', String(place.longitude));
      } catch {}

      if (window.electronAPI?.writeSettings) {
        try {
          const currentSettings = await window.electronAPI.readSettings().catch(() => ({}));
          window.electronAPI.writeSettings({
            ...currentSettings,
            pinnedCity: place.name,
            pinnedLat: place.latitude,
            pinnedLon: place.longitude,
            isLocationPinned: true,
          });
        } catch {}
      }

      const live = await fetchWeatherForCoordinates(place.latitude, place.longitude, place.name);
      if (live && onUpdateWeather && isMountedRef.current) {
        onUpdateWeather(live);
      }
    } finally {
      if (isMountedRef.current) setIsRefreshing(false);
    }
  };

  const handleManualSubmit = async (e) => {
    if (e) e.stopPropagation();
    const query = cityInput.trim();
    if (!query) {
      setIsEditing(false);
      setSuggestions([]);
      if (onSuggestionsChange) onSuggestionsChange(0);
      return;
    }

    setIsRefreshing(true);
    setIsEditing(false);
    setSuggestions([]);
    if (onSuggestionsChange) onSuggestionsChange(0);
    try {
      if (suggestions.length > 0) {
        const best = suggestions[0];
        try {
          localStorage.setItem('winland_custom_city', best.name);
          localStorage.setItem('winland_custom_lat', String(best.latitude));
          localStorage.setItem('winland_custom_lon', String(best.longitude));
        } catch {}

        if (window.electronAPI?.writeSettings) {
          try {
            const currentSettings = await window.electronAPI.readSettings().catch(() => ({}));
            window.electronAPI.writeSettings({
              ...currentSettings,
              pinnedCity: best.name,
              pinnedLat: best.latitude,
              pinnedLon: best.longitude,
              isLocationPinned: true,
            });
          } catch {}
        }

        const live = await fetchWeatherForCoordinates(best.latitude, best.longitude, best.name);
        if (live && onUpdateWeather && isMountedRef.current) onUpdateWeather(live);
      } else {
        const live = await fetchLiveWeather(true, query);
        if (live && live.latitude && live.longitude) {
          try {
            localStorage.setItem('winland_custom_city', live.city || query);
            localStorage.setItem('winland_custom_lat', String(live.latitude));
            localStorage.setItem('winland_custom_lon', String(live.longitude));
          } catch {}

          if (window.electronAPI?.writeSettings) {
            try {
              const currentSettings = await window.electronAPI.readSettings().catch(() => ({}));
              window.electronAPI.writeSettings({
                ...currentSettings,
                pinnedCity: live.city || query,
                pinnedLat: live.latitude,
                pinnedLon: live.longitude,
                isLocationPinned: true,
              });
            } catch {}
          }
        }
        if (live && onUpdateWeather && isMountedRef.current) onUpdateWeather(live);
      }
    } finally {
      if (isMountedRef.current) setIsRefreshing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleManualSubmit(e);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setSuggestions([]);
      if (onSuggestionsChange) onSuggestionsChange(0);
    }
  };

  if (isCompact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ConditionGlyph size={14} color={iconColor} strokeWidth={2.2} />
          <span style={{ fontSize: 12, fontWeight: 600, color: isLight ? 'rgba(60, 60, 67, 0.78)' : 'rgba(255, 255, 255, 0.9)' }}>{condition}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#000000' : '#ffffff' }}>{tempDisplay}</span>
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
        padding: '12px 20px',
        boxSizing: 'border-box',
        color: isLight ? '#000000' : '#ffffff',
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
        position: 'relative',
      }}
    >
      {/* Big Centered Digital Time */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, lineHeight: 1 }}>
        <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums', color: isLight ? '#000000' : '#ffffff' }}>
          {displayHours}:{displayMinutes}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: isLight ? 'rgba(60, 60, 67, 0.75)' : 'rgba(255, 255, 255, 0.55)' }}>
          {ampm}
        </span>
      </div>

      {/* Date directly under the Big Time */}
      <div style={{ fontSize: 12, fontWeight: 600, color: isLight ? 'rgba(60, 60, 67, 0.75)' : 'rgba(255, 255, 255, 0.65)', marginTop: 3, letterSpacing: '-0.1px' }}>
        {fullDateStr}
      </div>

      {/* Interactive Weather / Search Box */}
      {isEditing ? (
        <div
          style={{
            position: 'relative',
            marginTop: 10,
            width: '94%',
            maxWidth: 260,
            zIndex: 50,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 30, 35, 0.92)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 18,
              boxShadow: isLight ? '0 4px 14px rgba(0, 0, 0, 0.1)' : '0 6px 20px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <Search size={13} color={isLight ? '#666666' : '#aaaaaa'} />
            <input
              type="text"
              autoFocus
              aria-label="Search city name"
              placeholder="Search city (e.g. Dwarka)..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: isLight ? '#000000' : '#ffffff',
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            {isSearching ? (
              <Loader2 size={13} className="animate-spin" color="#0071e3" />
            ) : (
              <button
                aria-label="Cancel search"
                onClick={() => {
                  setIsEditing(false);
                  setSuggestions([]);
                  if (onSuggestionsChange) onSuggestionsChange(0);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? '#888' : '#aaa',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown without scrollbars */}
          {suggestions.length > 0 && (
            <div
              className="no-scrollbar"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 6,
                background: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(26, 26, 30, 0.98)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: 14,
                boxShadow: isLight ? '0 8px 24px rgba(0, 0, 0, 0.15)' : '0 10px 28px rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                textAlign: 'left',
              }}
            >
              {suggestions.map((item, idx) => (
                <div
                  key={item.id ? `place-${item.id}` : `${item.name}-${item.latitude}-${item.longitude}-${idx}`}
                  onClick={() => handleSelectPlace(item)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: isLight ? '#1d1d1f' : '#f5f5f7',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderBottom: idx < suggestions.length - 1 ? (isLight ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.06)') : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isLight ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <MapPin size={11} color="#0071e3" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => {
            setIsEditing(true);
            setCityInput(weatherConfig?.city || '');
          }}
          title="Click to search city or refresh weather"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            marginTop: 11,
            padding: '5px 13px',
            background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
            border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            color: isLight ? '#1d1d1f' : 'rgba(255, 255, 255, 0.9)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <ConditionGlyph size={16} color={iconColor} strokeWidth={2.2} />
          {weatherConfig?.city && (
            <>
              <span>{weatherConfig.city}</span>
              <span style={{ color: isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.4)' }}>•</span>
            </>
          )}
          <span>{condition}</span>
          <span style={{ color: isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.4)' }}>•</span>
          <span style={{ fontWeight: 700, color: isLight ? '#000000' : '#ffffff' }}>{tempDisplay}</span>
          <RefreshCw
            size={11}
            style={{
              marginLeft: 3,
              opacity: 0.6,
              transform: isRefreshing ? 'rotate(360deg)' : 'none',
              transition: 'transform 0.6s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
