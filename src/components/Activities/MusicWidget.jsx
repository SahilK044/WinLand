import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, RefreshCw, Volume1, Volume2, VolumeX } from 'lucide-react';

const MAC_FONT = '"SF Pro Display", "SF Pro Text", "SF Pro", -apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", Arial, sans-serif';

const StraightMicIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="8" y1="21" x2="16" y2="21" />
  </svg>
);

function fmt(ms) {
  if (!ms || isNaN(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getButtonIconColor(bgColor) {
  if (!bgColor) return '#ffffff';
  let r = 255, g = 255, b = 255;
  if (bgColor.startsWith('#')) {
    const hex = bgColor.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else if (bgColor.startsWith('rgb')) {
    const parts = bgColor.match(/\d+/g);
    if (parts && parts.length >= 3) {
      r = parseInt(parts[0], 10);
      g = parseInt(parts[1], 10);
      b = parseInt(parts[2], 10);
    }
  }
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 165 ? '#000000' : '#ffffff';
}

function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Match all timestamp headers like [01:23.45], [01:23:45], or [01:23.456]
    const timestampMatches = Array.from(line.matchAll(/\[(\d+):(\d+)(?:[.:](\d+))?\]/g));
    if (timestampMatches.length > 0) {
      // Strip out timestamp headers and inline tags like <00:12.34>
      const cleanText = line.replace(/\[\d+:\d+(?:[.:]\d+)?\]/g, '').replace(/<[^>]+>/g, '').trim();
      if (cleanText) {
        for (const match of timestampMatches) {
          const min = parseInt(match[1], 10);
          const sec = parseInt(match[2], 10);
          const fractionStr = match[3] || '0';
          let msFraction = 0;
          if (fractionStr.length === 1) msFraction = parseInt(fractionStr, 10) * 100;
          else if (fractionStr.length === 2) msFraction = parseInt(fractionStr, 10) * 10;
          else if (fractionStr.length >= 3) msFraction = parseInt(fractionStr.slice(0, 3), 10);

          const timeMs = min * 60000 + sec * 1000 + msFraction;
          result.push({ timeMs, text: cleanText });
        }
      }
    }
  }

  return result.sort((a, b) => a.timeMs - b.timeMs);
}

// Fast responsive Apple decelerating smooth scroll for active lyric tracking
function smoothScrollTo(container, targetTop, duration = 300) {
  const startTop = container.scrollTop;
  const delta = targetTop - startTop;
  if (Math.abs(delta) < 1) return;

  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const ease = 1 - Math.pow(1 - t, 4); // Fast Quartic ease-out for snappy vocal tracking
    container.scrollTop = startTop + delta * ease;
    if (t < 1) {
      container.__lyricScrollRaf = requestAnimationFrame(step);
    }
  }

  if (container.__lyricScrollRaf) cancelAnimationFrame(container.__lyricScrollRaf);
  container.__lyricScrollRaf = requestAnimationFrame(step);
}


const SyncedLyricsView = ({ title, artist, coverUrl, progressMs, durationMs = 0, isPlaying = false, onSeek, onClose: _onClose, eqColor, eqGlow }) => {
  const [lyrics, setLyrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plainLyrics, setPlainLyrics] = useState('');
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  // Sub-millisecond continuous timekeeper for 60 FPS real-time vocal tracking
  const [smoothMs, setSmoothMs] = useState(progressMs);
  const syncRef = useRef({ baseMs: progressMs, baseTime: performance.now() });

  useEffect(() => {
    if (!isPlaying) {
      syncRef.current = { baseMs: progressMs, baseTime: performance.now() };
      setSmoothMs(progressMs);
      return;
    }
    const currentSmooth = syncRef.current.baseMs + (performance.now() - syncRef.current.baseTime);
    const drift = Math.abs(progressMs - currentSmooth);
    // Lower drift threshold from 1200ms to 250ms for sub-100ms sync accuracy on fast songs
    if (drift > 250) {
      syncRef.current = { baseMs: progressMs, baseTime: performance.now() };
      setSmoothMs(progressMs);
    }
  }, [progressMs, isPlaying, title]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId;
    let lastTick = 0;
    const updateLoop = (now) => {
      if (now - lastTick >= 50) {
        lastTick = now;
        const delta = performance.now() - syncRef.current.baseTime;
        setSmoothMs(syncRef.current.baseMs + delta);
      }
      rafId = requestAnimationFrame(updateLoop);
    };
    rafId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, title]);

  // Guards against a slow fetch for a previous track landing after a newer
  // one already started - without this, rapidly skipping tracks could show
  // stale lyrics from a request that was still in flight when the track
  // changed again.
  const lyricsRequestIdRef = useRef(0);

  useEffect(() => {
    if (!title) return;
    const requestId = ++lyricsRequestIdRef.current;
    setLoading(true);
    setLyrics([]);
    setPlainLyrics('');

    const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').split('-')[0].trim();
    const cleanArtist = artist ? artist.split(',')[0].split('&')[0].trim() : '';
    const isStale = () => lyricsRequestIdRef.current !== requestId;

    const isArtistMatch = (resArtist, targetArtist) => {
      if (!targetArtist) return true;
      if (!resArtist) return false;
      const a = resArtist.toLowerCase().replace(/[^a-z0-9]/g, '');
      const b = targetArtist.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!a || !b) return false;
      return a.includes(b) || b.includes(a);
    };

    const controller = new AbortController();
    const { signal } = controller;
    const attemptFetch = async () => {
      // Strategy 1: LRCLIB Direct Match (Title + Artist)
      try {
        if (cleanArtist) {
          const durParam = durationMs > 0 ? `&duration=${Math.round(durationMs / 1000)}` : '';
          const res = await fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}${durParam}`, { signal });
          if (isStale()) return;
          if (res.ok) {
            const data = await res.json();
            if (isStale()) return;
            if (data.syncedLyrics) { setLyrics(parseLrc(data.syncedLyrics)); setLoading(false); return; }
            if (data.plainLyrics) { setPlainLyrics(data.plainLyrics); setLoading(false); return; }
          }
        }
      } catch {}
      if (isStale()) return;

      // Strategy 2: LRCLIB Search (Title + Artist)
      try {
        const q = `${cleanTitle} ${cleanArtist}`.trim();
        const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, { signal });
        if (isStale()) return;
        if (res.ok) {
          const results = await res.json();
          if (isStale()) return;
          if (Array.isArray(results) && results.length > 0) {
            const matched = results.filter((r) => isArtistMatch(r.artistName, cleanArtist));
            const pool = matched.length > 0 ? matched : results;
            const synced = pool.find((r) => r.syncedLyrics);
            if (synced) { setLyrics(parseLrc(synced.syncedLyrics)); setLoading(false); return; }
            const plain = pool.find((r) => r.plainLyrics);
            if (plain) { setPlainLyrics(plain.plainLyrics); setLoading(false); return; }
          }
        }
      } catch {}
      if (isStale()) return;

      // Strategy 3: LRCLIB Search (Title Only - ONLY accept if artist matches)
      try {
        if (cleanArtist) {
          const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`, { signal });
          if (isStale()) return;
          if (res.ok) {
            const results = await res.json();
            if (isStale()) return;
            if (Array.isArray(results) && results.length > 0) {
              const matched = results.filter((r) => isArtistMatch(r.artistName, cleanArtist));
              if (matched.length > 0) {
                const synced = matched.find((r) => r.syncedLyrics);
                if (synced) { setLyrics(parseLrc(synced.syncedLyrics)); setLoading(false); return; }
                const plain = matched.find((r) => r.plainLyrics);
                if (plain) { setPlainLyrics(plain.plainLyrics); setLoading(false); return; }
              }
            }
          }
        }
      } catch {}
      if (isStale()) return;

      // Strategy 4: Lyrics.ovh API Fallback
      try {
        if (cleanArtist) {
          const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`, { signal });
          if (isStale()) return;
          if (res.ok) {
            const data = await res.json();
            if (isStale()) return;
            if (data.lyrics && data.lyrics.trim()) {
              setPlainLyrics(data.lyrics.trim());
              setLoading(false);
              return;
            }
          }
        }
      } catch {}
      if (isStale()) return;

      // Strategy 5: NetEase Synced LRC API
      try {
        const searchRes = await fetch(`https://music.163.com/api/search/get/web?csrf_token=&u=1&s=${encodeURIComponent(cleanTitle + ' ' + cleanArtist)}&type=1&offset=0&total=true&limit=5`, { signal });
        if (isStale()) return;
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const songs = searchData?.result?.songs || [];
          const matchedSong = songs.find((s) => s.artists?.some((a) => isArtistMatch(a.name, cleanArtist))) || songs[0];
          const songId = matchedSong?.id;
          if (songId) {
            const lrcRes = await fetch(`https://music.163.com/api/song/lyric?os=pc&id=${songId}&lv=-1&kv=-1&tv=-1`, { signal });
            if (isStale()) return;
            if (lrcRes.ok) {
              const lrcData = await lrcRes.json();
              if (isStale()) return;
              if (lrcData?.lrc?.lyric) {
                const parsed = parseLrc(lrcData.lrc.lyric);
                if (parsed.length > 0) {
                  setLyrics(parsed);
                  setLoading(false);
                  return;
                }
              }
            }
          }
        }
      } catch {}
      if (isStale()) return;

      setLoading(false);
    };

    attemptFetch();
    return () => controller.abort();
  }, [title, artist, durationMs]);

  const [userOffsetMs, setUserOffsetMs] = useState(() => {
    try { return parseInt(localStorage.getItem('winland_lyrics_offset') || '0', 10); } catch { return 0; }
  });

  const handleOffsetChange = (delta, e) => {
    e?.stopPropagation();
    setUserOffsetMs((prev) => {
      const next = Math.max(-2500, Math.min(2500, prev + delta));
      try { localStorage.setItem('winland_lyrics_offset', next.toString()); } catch {}
      return next;
    });
  };

  // Find active line index using effectiveMs (audio latency lead compensation +380ms + user offset)
  const effectiveMs = smoothMs + userOffsetMs + 380;
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (effectiveMs >= lyrics[i].timeMs) activeIndex = i;
    else break;
  }

  // Karaoke word-wipe progress within active line
  let activeFillPct = 0;
  if (activeIndex >= 0) {
    const lineStart = lyrics[activeIndex].timeMs;
    const lineEnd = lyrics[activeIndex + 1]?.timeMs ?? (lineStart + 3500);
    const span = Math.max(1, lineEnd - lineStart);
    activeFillPct = Math.max(0, Math.min(100, ((effectiveMs - lineStart) / span) * 100));
  }

  // Snappy spring-eased smooth scroll to center the active lyric line
  useEffect(() => {
    if (!scrollRef.current || !activeRef.current || activeIndex < 0) return;
    const container = scrollRef.current;
    const el = activeRef.current;
    const target = (el.offsetTop + el.offsetHeight / 2) - (container.clientHeight / 2);

    // Dynamic scroll duration for fast vs slow songs
    const currentLineMs = lyrics[activeIndex]?.timeMs || 0;
    const nextLineMs = lyrics[activeIndex + 1]?.timeMs || (currentLineMs + 3000);
    const lineDuration = nextLineMs - currentLineMs;
    const scrollDuration = Math.max(160, Math.min(320, Math.floor(lineDuration * 0.35)));

    smoothScrollTo(container, target, scrollDuration);

    return () => {
      if (container.__lyricScrollRaf) {
        cancelAnimationFrame(container.__lyricScrollRaf);
      }
    };
  }, [activeIndex, lyrics]);

  const glowColor = eqGlow || (eqColor ? `${eqColor}55` : 'rgba(255,255,255,0.16)');

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 14px 10px',
        boxSizing: 'border-box',
        fontFamily: MAC_FONT,
        position: 'relative',
        zIndex: 5,
        borderRadius: 'inherit',
        overflow: 'hidden',
      }}
    >
      {/* Ambient accent glow */}
      <div className="lyric-ambient-glow" style={{ '--lyric-glow-color': glowColor }} />

      {/* Header: album art + song title + artist + sync adjuster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexShrink: 0, position: 'relative', zIndex: 1 }}>
        {/* Mini album art */}
        <div
          className="album-art-spring interactive-child"
          onClick={(e) => {
            e.stopPropagation();
            window.electronAPI?.launchApp?.('spotify');
          }}
          title="Open Spotify"
          style={{
            width: 38, height: 38, minWidth: 38,
            borderRadius: 10,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 3px 12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08) inset`,
            cursor: 'pointer',
          }}
        >
          {coverUrl ? (
            <img src={coverUrl} alt="art" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Music size={16} color="rgba(255,255,255,0.4)" />
          )}
        </div>
        {/* Title + artist */}
        <div className="track-change-wrapper" key={title} style={{ flex: 1, minWidth: 0 }}>
          <MarqueeText style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.1px' }}>
            {title}
          </MarqueeText>
          <MarqueeText style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
            {artist}
          </MarqueeText>
        </div>

        {/* Real-time Sync Tuning Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '3px 6px',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={(e) => handleOffsetChange(-200, e)}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
              fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '1px 3px',
              borderRadius: 4, transition: 'color 0.15s ease',
            }}
            title="Lyrics 0.2s earlier"
          >
            -0.2s
          </button>
          <span style={{ fontSize: 9, fontWeight: 600, color: userOffsetMs !== 0 ? '#30d158' : 'rgba(255,255,255,0.4)' }}>
            {userOffsetMs > 0 ? `+${(userOffsetMs / 1000).toFixed(1)}s` : userOffsetMs < 0 ? `${(userOffsetMs / 1000).toFixed(1)}s` : 'Sync'}
          </span>
          <button
            onClick={(e) => handleOffsetChange(200, e)}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
              fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '1px 3px',
              borderRadius: 4, transition: 'color 0.15s ease',
            }}
            title="Lyrics 0.2s later"
          >
            +0.2s
          </button>
        </div>
      </div>

      {/* Clip wrapper: hard-clips the scroll layer inside the pill's rounded corners */}
      <div
        style={{
          flex: 1,
          borderRadius: 'inherit',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          maskImage: 'linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)',
        }}
      >
        {/* Lyrics scroll area — no native scrollbar */}
        <div
          ref={scrollRef}
          className="lyrics-scroll"
          style={{
            width: '100%',
            height: '100%',
            overflowY: 'scroll',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 11, gap: 6 }}>
              <RefreshCw size={13} className="spin-loader" /> Fetching lyrics…
            </div>
          ) : lyrics.length > 0 ? (
            <div style={{ padding: '34px 4px' }}>
              {lyrics.map((item, idx) => {
                const isActive = idx === activeIndex;
                const isPast = idx < activeIndex;
                const rowClass = `lyric-row ${isActive ? 'is-active' : isPast ? 'is-past' : 'is-future'}`;
                return (
                  <div
                    key={idx}
                    ref={isActive ? activeRef : null}
                    className={rowClass}
                    onClick={(e) => { e.stopPropagation(); onSeek?.(item.timeMs); }}
                    style={{ '--lyric-glow-color': glowColor }}
                  >
                    <span
                      className="lyric-text"
                      style={isActive ? { '--lyric-fill': `${activeFillPct}%` } : undefined}
                    >
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : plainLyrics ? (
            <div style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 1.6, padding: '10px 4px' }}>
              {plainLyrics}
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
              No lyrics found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 1:1 Apple Smooth Auto-Marquee Text Component
const MarqueeText = ({ children, style = {}, className = '' }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    let timer;
    let animFrame;

    const measure = () => {
      if (!containerRef.current || !textRef.current) return;
      const cWidth = containerRef.current.clientWidth || containerRef.current.offsetWidth;
      const tWidth = textRef.current.scrollWidth;

      if (tWidth > cWidth + 2 && cWidth > 0) {
        const dist = tWidth - cWidth + 14;
        const dur = Math.max(5, Math.min(16, dist / 20 + 3.5));
        textRef.current.style.setProperty('--scroll-dist', `-${dist}px`);
        textRef.current.style.setProperty('--scroll-duration', `${dur}s`);
        setShouldScroll(true);
      } else {
        setShouldScroll(false);
      }
    };

    measure();
    animFrame = requestAnimationFrame(measure);
    timer = setTimeout(measure, 100);

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(text);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        width: '100%',
        position: 'relative',
        maskImage: shouldScroll ? 'linear-gradient(90deg, transparent 0%, #000 3.5%, #000 88%, transparent 100%)' : 'none',
        WebkitMaskImage: shouldScroll ? 'linear-gradient(90deg, transparent 0%, #000 3.5%, #000 88%, transparent 100%)' : 'none',
        ...style,
      }}
    >
      <div
        ref={textRef}
        className={shouldScroll ? 'apple-marquee-text' : ''}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Dedicated Album Art Component (Defined outside parent to prevent React component teardown on re-renders)
const AlbumArt = ({ coverUrl, title, size = 28, r = 7, glowColor, glowOpacity = 0.6, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [coverUrl]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    } else if (window.electronAPI?.launchApp) {
      window.electronAPI.launchApp('spotify');
    }
  };

  const isVideo = title && (
    title.toLowerCase().includes('youtube') ||
    title.toLowerCase().includes('f1') ||
    title.includes('|') ||
    title.toLowerCase().includes('video') ||
    title.toLowerCase().includes('prime')
  );

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Dynamic Ambient Color Halo (Clean Expanded View Only) */}
      {glowColor && size >= 36 && (
        <div
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: r + 3,
            background: glowColor,
            filter: 'blur(8px)',
            opacity: coverUrl && !imgError ? glowOpacity : 0,
            transform: isHovered ? 'scale(1.15)' : 'scale(1.0)',
            transition: 'opacity 0.65s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.8s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Main Squircle Artwork Tile */}
      <div
        key={coverUrl || title}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Open Spotify"
        className="interactive-child"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          borderRadius: r,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          transform: isHovered ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {(coverUrl && !imgError) ? (
          <img
            src={coverUrl}
            alt="Album Art"
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : isVideo ? (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #ff0000 0%, #b30000 60%, #800000 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.4)',
          }}>
            <Play size={size * 0.45} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
          </div>
        ) : (
          <Music size={size * 0.45} color="rgba(255,255,255,0.5)" />
        )}
      </div>
    </div>
  );
};

// System-wide Windows Master Volume Control (Lower Left Side - Zero Overlap / Zero Popups)
const SystemVolumeControl = () => {
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const prevVolRef = useRef(50);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (window.electronAPI?.getSystemVolume) {
      window.electronAPI.getSystemVolume().then((vol) => {
        if (typeof vol === 'number' && !isNaN(vol)) {
          setVolume(vol);
          if (vol > 0) prevVolRef.current = vol;
          setIsMuted(vol === 0);
        }
      }).catch(() => {});
    }

    if (!window.electronAPI?.onVolumeUpdate) {
      return () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      };
    }
    const unsub = window.electronAPI.onVolumeUpdate(({ vol }) => {
      if (typeof vol === 'number' && !isNaN(vol)) {
        setVolume(vol);
        if (vol > 0) {
          prevVolRef.current = vol;
          setIsMuted(false);
        } else {
          setIsMuted(true);
        }
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const triggerBadge = () => {
    setShowBadge(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowBadge(false), 1600);
  };

  const updateVol = (newVol) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    setVolume(clamped);
    if (clamped > 0) {
      prevVolRef.current = clamped;
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
    triggerBadge();
    if (window.electronAPI?.setSystemVolume) {
      window.electronAPI.setSystemVolume(clamped);
    }
  };

  const toggleMute = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMuted || volume === 0) {
      const restoreVol = prevVolRef.current || 50;
      updateVol(restoreVol);
    } else {
      prevVolRef.current = volume;
      updateVol(0);
    }
  };

  const handleWheel = (e) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 5 : -5;
    updateVol(volume + delta);
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        onClick={toggleMute}
        onWheel={handleWheel}
        onMouseEnter={() => setShowBadge(true)}
        onMouseLeave={() => setShowBadge(false)}
        className="tactile-btn"
        style={{
          background: showBadge ? 'rgba(255, 255, 255, 0.15)' : 'none',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          padding: 6,
          color: 'rgba(255, 255, 255, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <VolumeIcon size={18} color="rgba(255, 255, 255, 0.85)" />
      </button>

      {/* Floating percentage badge above volume icon */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 34,
          transform: showBadge ? 'translateX(-50%) translateY(0) scale(1)' : 'translateX(-50%) translateY(4px) scale(0.9)',
          background: 'rgba(20, 20, 22, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          borderRadius: 7,
          padding: '2.5px 8px',
          fontSize: 10.5,
          fontWeight: 650,
          color: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Rounded", "SF Pro Display", system-ui, sans-serif',
          letterSpacing: '-0.2px',
          fontVariantNumeric: 'tabular-nums',
          WebkitFontSmoothing: 'antialiased',
          opacity: showBadge ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 0.2s cubic-bezier(0.32, 0.72, 0, 1), transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
          whiteSpace: 'nowrap',
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          zIndex: 25,
        }}
      >
        {volume}%
      </div>
    </div>
  );
};

// Common Equalizer Component (Smooth Liquid Spring Animation)
const EqBars = ({ h = 14, visualizerOpacity, barHeights, eqColor, eqGlow }) => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-end',
    gap: 2.5,
    height: h,
    flexShrink: 0,
    opacity: visualizerOpacity,
    transform: `scaleY(${0.92 + visualizerOpacity * 0.08})`,
    transformOrigin: 'bottom center',
    filter: visualizerOpacity < 1 ? 'blur(0.4px)' : 'none',
    transition: 'opacity 0.36s cubic-bezier(0.2, 0.9, 0.2, 1), transform 0.42s cubic-bezier(0.2, 0.9, 0.2, 1), filter 0.36s ease',
  }}>
    {barHeights.map((bh, i) => (
      <div
        key={i}
        style={{
          width: 2.5,
          height: `${Math.max(8, bh)}%`,
          background: `linear-gradient(180deg, rgba(255,255,255,0.94), ${eqColor} 38%, ${eqColor})`,
          borderRadius: 2,
          boxShadow: bh > 10 ? `0 0 7px ${eqGlow}, 0 0 14px ${eqGlow}` : `0 0 4px ${eqGlow}`,
          transition: 'height 0.05s linear, background 0.9s cubic-bezier(0.2, 0.9, 0.2, 1), box-shadow 0.9s cubic-bezier(0.2, 0.9, 0.2, 1)',
        }}
      />
    ))}
  </div>
);

export default function MusicWidget({
  isCompact,
  isExpanded: _isExpanded,
  isSplit,
  isLyricsView,
  isDndActive: _isDndActive = false,
  isDndVisible,
  onToggleLyrics,
  trackInfo = {},
  barHeights = [3, 3, 3, 3, 3],
  eqColor = '#34c759',
  eqGlow = 'rgba(52,199,89,0.35)',
  progressGradient = 'linear-gradient(90deg, #34c759, #30d158)',
  onExpand,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
}) {
  const { title, artist, coverUrl, isPlaying = false, progressMs = 0, durationMs = 0 } = trackInfo;

  const [time, setTime] = useState(new Date());

  // ── High-Refresh 60/120 FPS Progress Bar & Seek Control ─────────────────
  const progressBarRef = useRef(null);
  const knobRef = useRef(null);
  const currentTimeTextRef = useRef(null);
  const scrubberRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [dragProgressMs, setDragProgressMs] = useState(0);
  const [dragPosX, setDragPosX] = useState(0);
  const [realtimeMs, setRealtimeMs] = useState(progressMs);

  const syncRef = useRef({ baseMs: progressMs, baseTime: performance.now() });
  const seekLockUntilRef = useRef(0);
  const lastTitleRef = useRef(title);
  const [visualizerOpacity, setVisualizerOpacity] = useState(1);

  // When song changes, immediately reset progress bar to 0:00
  useEffect(() => {
    if (lastTitleRef.current === title) return;
    lastTitleRef.current = title;
    syncRef.current = { baseMs: 0, baseTime: performance.now() };
    setRealtimeMs(0);
    seekLockUntilRef.current = Date.now() + 1500;

    if (progressBarRef.current) progressBarRef.current.style.width = '0%';
    if (knobRef.current) {
      knobRef.current.style.left = '0px';
      knobRef.current.style.opacity = '0';
    }
    if (currentTimeTextRef.current) currentTimeTextRef.current.textContent = '0:00';

    setVisualizerOpacity(0.18);
    const fadeTimer = setTimeout(() => setVisualizerOpacity(1), 170);
    return () => clearTimeout(fadeTimer);
  }, [title]);

  // Sync with incoming progress updates from backend
  useEffect(() => {
    if (isDraggingRef.current) return;
    if (Date.now() < seekLockUntilRef.current) return; // Prevent rollback to stale snapshot right after user seeks

    if (!isPlaying) {
      syncRef.current = { baseMs: progressMs, baseTime: performance.now() };
      setRealtimeMs(progressMs);
      const currentPct = durationMs > 0 ? Math.min(100, Math.max(0, (progressMs / durationMs) * 100)) : 0;
      if (progressBarRef.current) progressBarRef.current.style.width = `${currentPct}%`;
      if (knobRef.current) {
        knobRef.current.style.left = `calc(${currentPct}% + ${(0.5 - currentPct / 100) * 8}px)`;
        knobRef.current.style.opacity = currentPct > 0.5 ? '1' : '0';
      }
      if (currentTimeTextRef.current) currentTimeTextRef.current.textContent = fmt(progressMs);
      return;
    }

    const currentCalculated = syncRef.current.baseMs + (performance.now() - syncRef.current.baseTime);
    const drift = progressMs - currentCalculated;

    if (Math.abs(drift) > 1500) {
      syncRef.current = { baseMs: progressMs, baseTime: performance.now() };
      setRealtimeMs(progressMs);
    } else if (Math.abs(drift) > 60) {
      syncRef.current.baseMs += drift * 0.25;
    }
  }, [progressMs, isPlaying, title, durationMs]);

  // 60/120 FPS continuous interpolation RAF loop
  useEffect(() => {
    if (!isPlaying || durationMs <= 0) return;
    let rafId;
    let lastSec = -1;

    const updateFrame = () => {
      if (!isDraggingRef.current) {
        const now = performance.now();
        const delta = now - syncRef.current.baseTime;
        const current = Math.min(syncRef.current.baseMs + delta, durationMs);
        const currentPct = durationMs > 0 ? Math.min(100, Math.max(0, (current / durationMs) * 100)) : 0;

        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${currentPct}%`;
        }
        if (knobRef.current) {
          knobRef.current.style.left = `calc(${currentPct}% + ${(0.5 - currentPct / 100) * 8}px)`;
          knobRef.current.style.opacity = currentPct > 0.5 ? '1' : '0';
        }

        const sec = Math.floor(current / 1000);
        if (sec !== lastSec) {
          lastSec = sec;
          if (currentTimeTextRef.current) {
            currentTimeTextRef.current.textContent = fmt(current);
          }
        }
      }
      rafId = requestAnimationFrame(updateFrame);
    };

    rafId = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, durationMs, title]);

  // Clock for empty expanded state fallback
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeDisplayMs = isDragging ? dragProgressMs : realtimeMs;
  const pct = durationMs > 0 ? Math.min(100, Math.max(0, (activeDisplayMs / durationMs) * 100)) : 0;

  const calcMsFromEvent = React.useCallback((e) => {
    if (!scrubberRef.current || !durationMs) return 0;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = rect.width > 0 ? clickX / rect.width : 0;
    setDragPosX(clickX);
    const targetMs = Math.round(ratio * durationMs);
    const dragPct = Math.min(100, Math.max(0, (targetMs / durationMs) * 100));
    if (progressBarRef.current) progressBarRef.current.style.width = `${dragPct}%`;
    if (knobRef.current) {
      knobRef.current.style.left = `calc(${dragPct}% + ${(0.5 - dragPct / 100) * 8}px)`;
      knobRef.current.style.opacity = '1';
    }
    if (currentTimeTextRef.current) currentTimeTextRef.current.textContent = fmt(targetMs);
    return targetMs;
  }, [durationMs]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    seekLockUntilRef.current = Date.now() + 1800;
    setIsDragging(true);
    const targetMs = calcMsFromEvent(e);
    setDragProgressMs(targetMs);
    if (e.target && e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const onPointerMove = (e) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const targetMs = calcMsFromEvent(e);
      setDragProgressMs(targetMs);
    };
    const onPointerUp = (e) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      seekLockUntilRef.current = Date.now() + 1800;
      const targetMs = calcMsFromEvent(e);
      syncRef.current = { baseMs: targetMs, baseTime: performance.now() };
      setRealtimeMs(targetMs);
      onSeek?.(targetMs);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging, calcMsFromEvent, onSeek]);

  /* ─── EXPANDED SYNCED LYRICS VIEW ───
     Must come after every hook above (Rules of Hooks: an early return can't
     precede a hook call, or the hook count changes between renders and React
     throws as soon as isLyricsView flips). */
  if (isLyricsView) {
    return (
      <SyncedLyricsView
        title={title}
        artist={artist}
        coverUrl={coverUrl}
        progressMs={progressMs}
        durationMs={durationMs}
        isPlaying={isPlaying}
        onSeek={onSeek}
        onClose={onToggleLyrics}
        eqColor={eqColor}
        eqGlow={eqGlow}
      />
    );
  }


  const hours = time.getHours();
  const mins = time.getMinutes();
  const displayHours = hours % 12 || 12;
  const timeString = `${displayHours}:${mins < 10 ? '0' : ''}${mins}`;
  const dateString = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });


  /* ─── SPLIT PILL (Primary Left Component) ─── */
  if (isSplit) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', boxSizing: 'border-box', fontFamily: MAC_FONT }}>
        <AlbumArt coverUrl={coverUrl} title={title} size={28} r={7} glowColor={eqGlow} glowOpacity={0.4} />
        <div className="track-change-wrapper" key={title} style={{ flex: 1, minWidth: 0, paddingLeft: 8, paddingRight: 8, overflow: 'hidden' }}>
          <MarqueeText style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: '14px' }}>
            {title || 'Music Player'}
          </MarqueeText>
          {artist && (
            <MarqueeText style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,0.5)', lineHeight: '13px' }}>
              {artist}
            </MarqueeText>
          )}
        </div>
        <div style={{ flexShrink: 0, marginLeft: 4, display: 'flex', alignItems: 'center' }}>
          <EqBars h={14} visualizerOpacity={visualizerOpacity} barHeights={barHeights} eqColor={eqColor} eqGlow={eqGlow} />
        </div>
      </div>
    );
  }

  /* ─── COMPACT PILL (Single Active Island State) ─── */
  if (isCompact) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', cursor: 'pointer', fontFamily: MAC_FONT, boxSizing: 'border-box',
        }}
      >
        <AlbumArt coverUrl={coverUrl} title={title} size={28} r={7} glowColor={eqGlow} glowOpacity={0.45} />
        <div className="track-change-wrapper" key={title} style={{ flex: 1, minWidth: 0, paddingLeft: 10, paddingRight: 10, overflow: 'hidden' }}>
          <MarqueeText style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', lineHeight: '15px' }}>
            {title || 'Music Player'}
          </MarqueeText>
          {artist && (
            <MarqueeText style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.55)', lineHeight: '14px' }}>
              {artist}
            </MarqueeText>
          )}
        </div>
        <div style={{ flexShrink: 0, marginLeft: 4, display: 'flex', alignItems: 'center' }}>
          <EqBars h={14} visualizerOpacity={visualizerOpacity} barHeights={barHeights} eqColor={eqColor} eqGlow={eqGlow} />
        </div>
      </div>
    );
  }

  /* ─── EXPANDED PILL (1:1 macOS / iOS Lock Screen clock) ─── */
  if (!title) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '10px 0', fontFamily: MAC_FONT,
      }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-1.5px',
            lineHeight: '58px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {timeString}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255, 255, 255, 0.55)', letterSpacing: '0.1px' }}>
          {dateString}
        </div>
      </div>
    );
  }

  const playIconColor = getButtonIconColor(eqColor);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      fontFamily: MAC_FONT,
      borderRadius: 'inherit',
      overflow: 'hidden',
    }}>
      {/* ── Content Deck (Header, Scrubber & Controls — Clean Full Width) ── */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        marginLeft: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '14px 18px 12px 18px',
        boxSizing: 'border-box',
      }}>

        {/* ── 1. Top Row: Track Info & Equalizer ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ marginRight: 11, flexShrink: 0 }}>
            <AlbumArt coverUrl={coverUrl} title={title} size={40} r={9} glowColor={eqGlow} glowOpacity={0.65} />
          </div>

          <div className="track-change-wrapper" key={title} style={{ flex: 1, minWidth: 0, overflow: 'hidden', paddingRight: isDndVisible ? 80 : 8 }}>
            <MarqueeText style={{ fontSize: 15.5, fontWeight: 750, color: '#ffffff', lineHeight: '18px', letterSpacing: '-0.3px', textShadow: '0 1px 4px rgba(0,0,0,0.85), 0 2px 10px rgba(0,0,0,0.6)' }}>
              {title}
            </MarqueeText>
            {artist && (
              <MarqueeText className="widget-subtitle" style={{ fontSize: 11.5, fontWeight: 550, marginTop: 2, lineHeight: '14px', textShadow: '0 1px 3px rgba(0,0,0,0.75)' }}>
                {artist}
              </MarqueeText>
            )}
            <div style={{ fontSize: 9.5, fontWeight: 700, marginTop: 2, color: eqColor, textShadow: '0 1px 2px rgba(0,0,0,0.6)', transition: 'color 0.8s ease' }}>
              {isPlaying ? 'Media • Active' : 'Media • Paused'}
            </div>
          </div>

          <div style={{ flexShrink: 0, marginTop: 2 }}>
            <EqBars h={15} visualizerOpacity={visualizerOpacity} barHeights={barHeights} eqColor={eqColor} eqGlow={eqGlow} />
          </div>
        </div>

        {/* ── 2. Middle Row: Scrubber / Progress Bar & Timers ── */}
        <div style={{ width: '100%', marginTop: 6, marginBottom: 2, position: 'relative' }}>
          {/* Floating Scrubber Tooltip */}
          {isDragging && (
            <div
              style={{
                position: 'absolute',
                top: -24,
                left: dragPosX,
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#000000',
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            >
              {fmt(dragProgressMs)}
            </div>
          )}

          <div
            ref={scrubberRef}
            onPointerDown={handlePointerDown}
            className="interactive-child"
            style={{
              width: '100%',
              height: 14,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'visible',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            {/* Track Background */}
            <div style={{
              width: '100%',
              height: 5,
              background: 'rgba(255, 255, 255, 0.16)',
              borderRadius: 3,
              position: 'relative',
              overflow: 'visible',
              flex: 1,
            }}>
              {/* Progress bar */}
              <div
                ref={progressBarRef}
                className="progress-shimmer-bar"
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: progressGradient,
                  borderRadius: 3,
                  boxShadow: `0 0 8px ${eqGlow}`,
                  transition: isDragging ? 'none' : 'background 0.8s ease, box-shadow 0.8s ease',
                  willChange: 'width',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div className="progress-shimmer-overlay" style={{ animationPlayState: isPlaying ? 'running' : 'paused' }} />
              </div>

              {/* Glowing tip knob handle */}
              <div
                ref={knobRef}
                style={{
                  position: 'absolute',
                  left: `calc(${pct}% + ${(0.5 - pct / 100) * 8}px)`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: isDragging ? 11 : 8,
                  height: isDragging ? 11 : 8,
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: `0 0 6px #ffffff, 0 0 10px ${eqColor}`,
                  pointerEvents: 'none',
                  zIndex: 5,
                  opacity: pct > 0.5 ? 1 : 0,
                  transition: isDragging ? 'width 0.12s ease, height 0.12s ease' : 'opacity 0.2s ease, width 0.12s ease, height 0.12s ease',
                }}
              />
            </div>
          </div>

          <div className="widget-subtitle" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 2, fontWeight: 600 }}>
            <span ref={currentTimeTextRef}>{fmt(activeDisplayMs)}</span>
            <span>{durationMs > 0 ? fmt(durationMs) : '--:--'}</span>
          </div>
        </div>

        {/* ── 3. Bottom Row: Spaced Transport Controls (Comfortable Breathing Room) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 6px', marginTop: 2 }}>
          <SystemVolumeControl />

          <button
            className="icon-only tactile-skip-prev tactile-btn"
            onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, color: '#ffffff', display: 'flex', alignItems: 'center' }}
          >
            <SkipBack size={19} fill="currentColor" color="currentColor" />
          </button>

          <button
            className="tactile-play-btn"
            onClick={(e) => { e.stopPropagation(); onTogglePlay?.(); }}
            style={{
              width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: eqColor,
              boxShadow: `0 0 14px ${eqGlow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Pause Icon Wrapper */}
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.26s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1)',
                opacity: isPlaying ? 1 : 0,
                transform: isPlaying ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(35deg)',
                pointerEvents: 'none',
              }}
            >
              <Pause size={17} fill={playIconColor} color={playIconColor} />
            </div>

            {/* Play Icon Wrapper */}
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.26s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1)',
                opacity: isPlaying ? 0 : 1,
                transform: isPlaying ? 'scale(0.5) rotate(-35deg)' : 'scale(1) rotate(0deg)',
                pointerEvents: 'none',
              }}
            >
              <Play size={17} fill={playIconColor} color={playIconColor} style={{ marginLeft: 2 }} />
            </div>
          </button>

          <button
            className="icon-only tactile-skip-next tactile-btn"
            onClick={(e) => { e.stopPropagation(); onNext?.(); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, color: '#ffffff', display: 'flex', alignItems: 'center' }}
          >
            <SkipForward size={19} fill="currentColor" color="currentColor" />
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleLyrics?.();
            }}
            title="Synced Lyrics"
            className="tactile-btn"
            style={{
              background: isLyricsView ? 'rgba(255, 255, 255, 0.15)' : 'none',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              padding: 5,
              color: isLyricsView ? eqColor : 'rgba(255, 255, 255, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              filter: isLyricsView ? `drop-shadow(0 0 6px ${eqGlow})` : 'none',
            }}
          >
            <StraightMicIcon size={17} color={isLyricsView ? eqColor : 'rgba(255, 255, 255, 0.85)'} />
          </button>
        </div>

      </div>
    </div>
  );
}
