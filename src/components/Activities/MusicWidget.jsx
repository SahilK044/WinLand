import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, RefreshCw, Volume1, Volume2, VolumeX } from 'lucide-react';

const MAC_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

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


const SyncedLyricsView = ({ title, artist, coverUrl, progressMs, isPlaying = false, onSeek, onClose, eqColor, eqGlow }) => {
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
    const updateLoop = () => {
      const delta = performance.now() - syncRef.current.baseTime;
      setSmoothMs(syncRef.current.baseMs + delta);
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
          const res = await fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`, { signal });
          if (isStale()) return;
          if (res.ok) {
            const data = await res.json();
            if (isStale()) return;
            if (data.syncedLyrics) { setLyrics(parseLrc(data.syncedLyrics)); setLoading(false); return; }
            if (data.plainLyrics) { setPlainLyrics(data.plainLyrics); setLoading(false); return; }
          }
        }
      } catch (e) {}
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
      } catch (e) {}
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
      } catch (e) {}
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
      } catch (e) {}
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
      } catch (e) {}
      if (isStale()) return;

      setLoading(false);
    };

    attemptFetch();
    return () => controller.abort();
  }, [title, artist]);

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
        maskImage: shouldScroll ? 'linear-gradient(90deg, #000 82%, transparent 98%)' : 'none',
        WebkitMaskImage: shouldScroll ? 'linear-gradient(90deg, #000 82%, transparent 98%)' : 'none',
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
const AlbumArt = ({ coverUrl, title, size = 28, r = 7, onClick }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [coverUrl]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    } else if (window.electronAPI?.launchApp) {
      window.electronAPI?.launchApp?.('spotify');
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
      key={coverUrl || title}
      onClick={handleClick}
      title="Open Spotify"
      className="interactive-child"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: r,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        transition: 'transform 0.15s ease',
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
  );
};

// System-wide Windows Master Volume Control (Lower Left Side - Zero Overlap / Zero Popups)
const SystemVolumeControl = ({ eqColor, eqGlow }) => {
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
    <>
      <button
        onClick={toggleMute}
        onWheel={handleWheel}
        onMouseEnter={() => setShowBadge(true)}
        onMouseLeave={() => setShowBadge(false)}
        style={{
          position: 'absolute',
          left: 22,
          background: showBadge ? 'rgba(255, 255, 255, 0.15)' : 'none',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          padding: 6,
          color: 'rgba(255, 255, 255, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s ease',
          zIndex: 20,
        }}
      >
        <VolumeIcon size={18} color="rgba(255, 255, 255, 0.85)" />
      </button>

      {/* Floating percentage badge above volume icon (Zero layout shifting, zero button crowding) */}
      <div
        style={{
          position: 'absolute',
          left: 14,
          bottom: 35,
          background: 'rgba(20, 20, 22, 0.92)',
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
          transform: showBadge ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.9)',
          pointerEvents: 'none',
          transition: 'opacity 0.2s cubic-bezier(0.32, 0.72, 0, 1), transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
          whiteSpace: 'nowrap',
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          zIndex: 25,
        }}
      >
        {volume}%
      </div>
    </>
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
  isExpanded,
  isSplit,
  isLyricsView,
  isDndActive = false,
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgressMs, setDragProgressMs] = useState(0);
  const [dragPosX, setDragPosX] = useState(0);
  const scrubberRef = useRef(null);

  // ── 60 FPS Sub-millisecond Smooth Real-time Progress Tracking ─────────────
  const [realtimeMs, setRealtimeMs] = useState(progressMs);
  const syncRef = useRef({ baseMs: progressMs, baseTime: performance.now() });
  const lastTitleRef = useRef(title);
  const [visualizerOpacity, setVisualizerOpacity] = useState(1);

  useEffect(() => {
    if (lastTitleRef.current === title) return;
    lastTitleRef.current = title;
    setVisualizerOpacity(0.18);
    const fadeTimer = setTimeout(() => setVisualizerOpacity(1), 170);
    return () => clearTimeout(fadeTimer);
  }, [title]);

  useEffect(() => {
    const drift = Math.abs(progressMs - realtimeMs);
    if (drift > 1000 || !isPlaying) {
      syncRef.current = { baseMs: progressMs, baseTime: performance.now() };
      setRealtimeMs(progressMs);
    }
  }, [progressMs, isPlaying, title]);

  useEffect(() => {
    if (!isPlaying || durationMs <= 0) return;
    let rafId;
    let lastUpdate = performance.now();
    const updateLoop = () => {
      const now = performance.now();
      if (now - lastUpdate > 100) {
        const delta = now - syncRef.current.baseTime;
        const current = syncRef.current.baseMs + delta;
        setRealtimeMs(Math.min(current, durationMs));
        lastUpdate = now;
      }
      rafId = requestAnimationFrame(updateLoop);
    };
    rafId = requestAnimationFrame(updateLoop);
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
    const ratio = clickX / rect.width;
    setDragPosX(clickX);
    return Math.round(ratio * durationMs);
  }, [durationMs]);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    const targetMs = calcMsFromEvent(e);
    setDragProgressMs(targetMs);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => {
      e.preventDefault();
      const targetMs = calcMsFromEvent(e);
      setDragProgressMs(targetMs);
    };
    const onUp = (e) => {
      setIsDragging(false);
      const targetMs = calcMsFromEvent(e);
      onSeek?.(targetMs);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
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
        <AlbumArt coverUrl={coverUrl} title={title} size={28} r={7} />
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
        <AlbumArt coverUrl={coverUrl} title={title} size={28} r={7} />
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

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px 18px', boxSizing: 'border-box', fontFamily: MAC_FONT }}>

      {/* ── Top Row: Album Art | Track Info | Equalizer ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AlbumArt coverUrl={coverUrl} title={title} size={52} r={12} />

        <div className="track-change-wrapper" key={title} style={{ flex: 1, minWidth: 0, overflow: 'hidden', paddingRight: isDndActive ? 122 : 0, transition: 'padding-right 0.28s cubic-bezier(0.32, 1.25, 0.36, 1)' }}>
          <MarqueeText style={{ fontSize: 14, fontWeight: 700, color: 'inherit', lineHeight: '18px', letterSpacing: '-0.2px' }}>
            {title}
          </MarqueeText>
          {artist && (
            <MarqueeText className="widget-subtitle" style={{ fontSize: 12, fontWeight: 500, marginTop: 2, lineHeight: '16px' }}>
              {artist}
            </MarqueeText>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3, color: eqColor, transition: 'color 0.8s ease' }}>
            {isPlaying ? 'Media • Active' : 'Media • Paused'}
          </div>
        </div>

        <EqBars h={20} visualizerOpacity={visualizerOpacity} barHeights={barHeights} eqColor={eqColor} eqGlow={eqGlow} />
      </div>

      {/* ── Middle Row: Scrubber / Progress Bar & Timers ── */}
      <div style={{ marginTop: 6, marginBottom: 2, position: 'relative' }}>
        {/* Floating Apple Scrubber Tooltip */}
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
          onMouseDown={handleMouseDown}
          style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.14)', borderRadius: 4, cursor: 'pointer', position: 'relative', overflow: 'visible' }}
        >
          {/* Filled Progress Bar — strict overflow: hidden so shimmer is 100% contained */}
          <div
            className="progress-shimmer-bar"
            style={{
              width: `${pct}%`,
              height: '100%',
              background: progressGradient,
              borderRadius: 4,
              boxShadow: `0 0 10px ${eqGlow}, 0 0 20px ${eqGlow}`,
              transition: isDragging ? 'none' : 'background 0.9s cubic-bezier(0.2, 0.9, 0.2, 1), box-shadow 0.9s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.36s ease',
              opacity: visualizerOpacity,
              willChange: 'width',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shimmer overlay effect */}
            <div
              className="progress-shimmer-overlay"
              style={{
                animationPlayState: isPlaying ? 'running' : 'paused',
              }}
            />
          </div>

          {/* Glowing tip knob handle — positioned at exact tip of progress */}
          {pct > 0.5 && (
            <div
              style={{
                position: 'absolute',
                left: `calc(${pct}% + ${(0.5 - pct / 100) * 8}px)`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: `0 0 8px #ffffff, 0 0 14px ${eqColor}`,
                pointerEvents: 'none',
                zIndex: 5,
              }}
            />
          )}
        </div>
        <div className="widget-subtitle" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4, fontWeight: 600 }}>
          <span>{fmt(activeDisplayMs)}</span>
          <span>{durationMs > 0 ? fmt(durationMs) : '--:--'}</span>
        </div>
      </div>

      {/* ── Bottom Row: Apple Transport Controls (Smooth Spring Morphing) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginTop: 4, position: 'relative' }}>
        <SystemVolumeControl eqColor={eqColor} eqGlow={eqGlow} />

        <button
          className="icon-only"
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          style={{ background: 'transparent', border: 'none', boxShadow: 'none', cursor: 'pointer', padding: 6, color: 'inherit', display: 'flex', alignItems: 'center', transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <SkipBack size={22} fill="currentColor" color="currentColor" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay?.(); }}
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: eqColor,
            boxShadow: `0 0 18px ${eqGlow}`,
            transition: 'background 0.8s ease, box-shadow 0.8s ease, transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
              transition: 'opacity 0.22s ease-out, transform 0.22s ease-out, visibility 0.22s ease-out',
              opacity: isPlaying ? 1 : 0,
              visibility: isPlaying ? 'visible' : 'hidden',
              transform: isPlaying ? 'scale(1) rotate(0deg)' : 'scale(0.6) rotate(-45deg)',
              pointerEvents: 'none',
            }}
          >
            <Pause size={20} fill="#ffffff" color="#ffffff" />
          </div>

          {/* Play Icon Wrapper */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.22s ease-out, transform 0.22s ease-out, visibility 0.22s ease-out',
              opacity: isPlaying ? 0 : 1,
              visibility: isPlaying ? 'hidden' : 'visible',
              transform: isPlaying ? 'scale(0.6) rotate(45deg)' : 'scale(1) rotate(0deg)',
              pointerEvents: 'none',
            }}
          >
            <Play size={20} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
          </div>
        </button>

        <button
          className="icon-only"
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          style={{ background: 'transparent', border: 'none', boxShadow: 'none', cursor: 'pointer', padding: 6, color: 'inherit', display: 'flex', alignItems: 'center', transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <SkipForward size={22} fill="currentColor" color="currentColor" />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleLyrics?.();
          }}
          title="Synced Lyrics"
          style={{
            position: 'absolute',
            right: 22,
            background: isLyricsView ? 'rgba(255, 255, 255, 0.15)' : 'none',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            padding: 6,
            color: isLyricsView ? eqColor : 'rgba(255, 255, 255, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            filter: isLyricsView ? `drop-shadow(0 0 6px ${eqGlow})` : 'none',
          }}
        >
          <StraightMicIcon size={18} color={isLyricsView ? eqColor : 'rgba(255, 255, 255, 0.85)'} />
        </button>
      </div>

    </div>
  );
}
