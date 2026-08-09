import React, { useState, useEffect } from 'react';
import { Trophy, Flame, ChevronRight, Activity, Clock, Zap } from 'lucide-react';

const MAC_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

const DEFAULT_GAMES = [
  {
    id: 'nba-1',
    league: 'NBA',
    leagueColor: '#F58426',
    status: 'LIVE • 4th Qtr 2:14',
    home: { name: 'LAL', fullName: 'Lakers', score: 108, color: '#552583', badge: '🏀' },
    away: { name: 'BOS', fullName: 'Celtics', score: 104, color: '#007A33', badge: '☘️' },
    periodProgress: 88,
    highlight: 'LeBron James 3-pointer from deep!',
  },
  {
    id: 'uefa-1',
    league: 'UEFA Champions League',
    leagueColor: '#0E1E5B',
    status: 'LIVE • 84\'',
    home: { name: 'RMA', fullName: 'Real Madrid', score: 2, color: '#FEBE10', badge: '👑' },
    away: { name: 'MCI', fullName: 'Man City', score: 1, color: '#6CABDD', badge: '⚽' },
    periodProgress: 92,
    highlight: 'Vinícius Jr. fast break shot saved!',
  },
  {
    id: 'f1-1',
    league: 'Formula 1',
    leagueColor: '#E10600',
    status: 'LIVE • Lap 48/57',
    home: { name: 'VER', fullName: 'Verstappen', score: 'P1', color: '#0600EF', badge: '🏎️' },
    away: { name: 'NOR', fullName: 'Norris', score: '+1.42s', color: '#FF8000', badge: '🏎️' },
    periodProgress: 84,
    highlight: 'Norris closing in DRS zone (+0.4s gap)',
  },
];

export default function LiveActivitiesWidget({
  isCompact = false,
  isSplit = false,
  onExpand,
}) {
  const [activeGameIdx, setActiveGameIdx] = useState(0);
  const [gameData, setGameData] = useState(DEFAULT_GAMES);
  const [pulseScore, setPulseScore] = useState(false);

  const currentGame = gameData[activeGameIdx] || gameData[0];

  // Micro pulse simulator for live feel
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScore(true);
      setTimeout(() => setPulseScore(false), 800);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  /* ─── SPLIT PILL (Secondary Left Component) ─── */
  if (isSplit) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px', fontFamily: MAC_FONT }}>
        <span style={{ fontSize: 13 }}>{currentGame.home.badge}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
          {currentGame.home.score} - {currentGame.away.score}
        </span>
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
          padding: '0 14px', cursor: 'pointer', fontFamily: MAC_FONT,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 10,
            background: currentGame.leagueColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: '#fff',
          }}>
            {currentGame.league.slice(0, 3)}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
            {currentGame.home.name} <span style={{ color: pulseScore ? '#34D399' : '#fff', transition: 'color 0.3s ease' }}>{currentGame.home.score}</span> - <span style={{ color: pulseScore ? '#34D399' : '#fff', transition: 'color 0.3s ease' }}>{currentGame.away.score}</span> {currentGame.away.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: '#ef4444', boxShadow: '0 0 6px #ef4444', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{currentGame.status.split('•')[1] || 'LIVE'}</span>
        </div>
      </div>
    );
  }

  /* ─── EXPANDED LIVE ACTIVITY VIEW ─── */
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '14px 18px', boxSizing: 'border-box', fontFamily: MAC_FONT, color: '#fff',
    }}>
      {/* ── Top Header Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={14} color="#34D399" />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#34D399' }}>
            Live Activity
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>• {currentGame.league}</span>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4 }}>
          {gameData.map((g, idx) => (
            <button
              key={g.id}
              onClick={(e) => { e.stopPropagation(); setActiveGameIdx(idx); }}
              style={{
                width: 7, height: 7, borderRadius: 3.5, border: 'none', padding: 0,
                background: idx === activeGameIdx ? '#ffffff' : 'rgba(255,255,255,0.25)',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Main Score Section ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0' }}>
        {/* Home Team */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 90 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: `radial-gradient(circle, ${currentGame.home.color}44 0%, rgba(255,255,255,0.06) 100%)`,
            border: `1.5px solid ${currentGame.home.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: `0 0 16px ${currentGame.home.color}33`,
          }}>
            {currentGame.home.badge}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{currentGame.home.name}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{currentGame.home.fullName}</span>
        </div>

        {/* Center Score */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
            transform: pulseScore ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.2s ease',
          }}>
            {currentGame.home.score} <span style={{ opacity: 0.3, fontWeight: 400 }}>:</span> {currentGame.away.score}
          </div>
          <div style={{
            marginTop: 4, padding: '2px 8px', borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: 2.5, background: '#ef4444' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#f87171' }}>{currentGame.status}</span>
          </div>
        </div>

        {/* Away Team */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 90 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: `radial-gradient(circle, ${currentGame.away.color}44 0%, rgba(255,255,255,0.06) 100%)`,
            border: `1.5px solid ${currentGame.away.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: `0 0 16px ${currentGame.away.color}33`,
          }}>
            {currentGame.away.badge}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{currentGame.away.name}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{currentGame.away.fullName}</span>
        </div>
      </div>

      {/* ── Period Progress & Highlight ── */}
      <div style={{ width: '100%' }}>
        <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div style={{
            width: `${currentGame.periodProgress}%`, height: '100%',
            background: 'linear-gradient(90deg, #34D399, #10B981)',
            borderRadius: 2, transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{
          marginTop: 6, fontSize: 10.5, color: 'rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <Zap size={11} color="#F59E0B" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentGame.highlight}</span>
        </div>
      </div>
    </div>
  );
}
