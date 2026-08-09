import React from 'react';
import { Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const DynamicIslandWidget: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Expansion Spring (Frames 0 - 105)
  const expandSpring = spring({
    frame: frame - 10,
    fps,
    config: { stiffness: 220, damping: 18, mass: 0.9 },
  });

  // 2.5D Camera Movements & Floating Motion
  const scale = interpolate(expandSpring, [0, 1], [0.7, 1.05]);
  const floatY = Math.sin(frame * 0.08) * 8;
  const rotX = interpolate(frame, [0, 225], [6, -4]);
  const rotY = interpolate(frame, [0, 225], [-5, 5]);

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
      {/* Background Emerald Ambient Radial Glow */}
      <div
        style={{
          position: 'absolute',
          width: 550,
          height: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29, 185, 84, 0.35) 0%, rgba(0, 0, 0, 0) 70%)',
          transform: `scale(${interpolate(expandSpring, [0, 1], [0.5, 1.25])})`,
          opacity: interpolate(expandSpring, [0, 1], [0.2, 0.7]),
        }}
      />

      {/* Floating 2.5D Container holding REAL Transparent WinLand Dynamic Island Texture */}
      <div
        style={{
          transform: `scale(${scale}) translateY(${floatY}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transformStyle: 'preserve-3d',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: 'drop-shadow(0 25px 45px rgba(0,0,0,0.85)) drop-shadow(0 0 35px rgba(29,185,84,0.4))',
        }}
      >
        {/* REAL Captured Transparent WinLand Expanded Island Screenshot */}
        <Img
          src={staticFile('textures/live/island_expanded.png')}
          style={{
            maxWidth: 1300,
            maxHeight: 700,
            objectFit: 'contain',
          }}
        />
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
          color: '#34D399',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        FLUID WINLAND DYNAMIC ISLAND & MEDIA CONTROLS
      </div>
    </div>
  );
};
