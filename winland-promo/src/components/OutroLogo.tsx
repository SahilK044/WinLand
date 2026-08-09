import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const OutroLogo: React.FC = () => {
  const frame = useCurrentFrame(); // Inside <Sequence from={345}>, frame is local (0 to 105)
  const { fps } = useVideoConfig();

  const stampSpring = spring({
    frame: frame - 15, // Slam impact at frame 15 of sequence (global 360)
    fps,
    config: { stiffness: 320, damping: 14, mass: 0.8 },
  });

  const scale = interpolate(stampSpring, [0, 1], [3.5, 1.0]);
  const opacity = interpolate(stampSpring, [0, 0.2, 1], [0, 1, 1]);
  const glowBlur = interpolate(stampSpring, [0, 1], [40, 20]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Background Emerald Wave Ripple */}
      {frame >= 15 && (
        <div
          style={{
            position: 'absolute',
            width: 450,
            height: 450,
            borderRadius: '50%',
            border: '2px solid rgba(29, 185, 84, 0.6)',
            boxShadow: '0 0 60px rgba(29, 185, 84, 0.6), inset 0 0 40px rgba(29, 185, 84, 0.3)',
            transform: `scale(${interpolate(frame - 15, [0, 45], [0.6, 2.2])})`,
            opacity: interpolate(frame - 15, [0, 45], [1, 0]),
          }}
        />
      )}

      {/* Main Logo Card */}
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          zIndex: 10,
        }}
      >
        {/* App Icon Badge */}
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: 30,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            boxShadow: `0 0 ${glowBlur}px #10B981`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 54,
            border: '2px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          🏝️
        </div>

        {/* Title & Tagline */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              margin: 0,
              textShadow: '0 0 30px rgba(29, 185, 84, 0.6)',
            }}
          >
            WinLand
          </h1>
          <p
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.85)',
              margin: '8px 0 0 0',
              letterSpacing: '-0.01em',
            }}
          >
            Fluid Dynamic Island & 3D Control Center
          </p>
        </div>

        {/* Call to Action Badge */}
        <div
          style={{
            marginTop: 16,
            background: 'linear-gradient(90deg, #1DB954, #10B981)',
            padding: '12px 32px',
            borderRadius: 30,
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: '0 10px 30px rgba(29, 185, 84, 0.5)',
          }}
        >
          AVAILABLE NOW FOR WINDOWS 10 / 11
        </div>
      </div>
    </div>
  );
};
