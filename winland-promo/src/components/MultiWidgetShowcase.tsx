import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const MultiWidgetShowcase: React.FC = () => {
  const frame = useCurrentFrame(); // 0 to 120
  const { fps } = useVideoConfig();

  // Phase selection: 0-40 (System Monitor), 40-80 (AirDrop), 80-120 (Call)
  const phase = frame < 40 ? 1 : frame < 80 ? 2 : 3;

  const cardSpring = spring({
    frame: frame % 40,
    fps,
    config: { stiffness: 220, damping: 18 },
  });

  const scale = interpolate(cardSpring, [0, 1], [0.82, 1.05]);
  const floatY = Math.sin(frame * 0.09) * 7;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: 1200,
        position: 'relative',
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          width: 550,
          height: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 242, 254, 0.3) 0%, rgba(0, 0, 0, 0) 70%)',
          transform: `scale(${interpolate(cardSpring, [0, 1], [0.6, 1.2])})`,
          opacity: 0.75,
        }}
      />

      {/* Floating Dynamic Island Container */}
      <div
        style={{
          transform: `scale(${scale}) translateY(${floatY}px)`,
          width: phase === 1 ? 400 : phase === 2 ? 370 : 410,
          height: phase === 1 ? 165 : 145,
          borderRadius: 36,
          backgroundColor: 'rgba(12, 14, 20, 0.88)',
          backdropFilter: 'blur(30px) saturate(190%)',
          border: '1.5px solid rgba(0, 242, 254, 0.4)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 242, 254, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 20,
          boxSizing: 'border-box',
          position: 'relative',
          transition: 'all 0.2s ease',
        }}
      >
        {/* PHASE 1: System Monitor */}
        {phase === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-around' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#FFF', fontWeight: 700, fontSize: 15 }}>System Performance</span>
              <span style={{ color: '#00F2FE', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em' }}>LIVE MONITORS</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#00F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#FFF' }}>
                  34%
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>CPU</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#FFF' }}>
                  62%
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>RAM</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#FFB800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#FFF' }}>
                  48%
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>GPU</span>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: AirDrop Transfer */}
        {phase === 2 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: 16, background: 'rgba(0,242,254,0.18)', border: '1.5px solid #00F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                📡
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ color: '#FFF', fontWeight: 700, fontSize: 15 }}>AirDrop Transfer</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Receiving 4K Video File...</span>
              </div>
            </div>
            <div style={{ color: '#00F2FE', fontWeight: 800, fontSize: 16 }}>88%</div>
          </div>
        )}

        {/* PHASE 3: Incoming Call */}
        {phase === 3 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, #34D399, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                📞
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ color: '#FFF', fontWeight: 700, fontSize: 16 }}>Incoming Call</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Sarah Jenkins</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 15 }}>
                ✕
              </div>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 15 }}>
                ✓
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screen Subtitle Caption Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          background: 'rgba(0, 0, 0, 0.75)',
          padding: '10px 28px',
          borderRadius: 30,
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(14px)',
          color: '#00F2FE',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        {phase === 1 && 'HARDWARE SYSTEM MONITORING (CPU, RAM, GPU)'}
        {phase === 2 && 'SEAMLESS AIRDROP FILE TRANSFER & TIMERS'}
        {phase === 3 && 'FLUID CALL & MEDIA WIDGET INTEGRATION'}
      </div>
    </div>
  );
};
