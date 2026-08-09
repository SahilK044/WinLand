import React from 'react';
import { Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const DeviceCatalog3D: React.FC = () => {
  const frame = useCurrentFrame(); // Inside <Sequence from={225}>, frame is local (0 to 120)
  const { fps } = useVideoConfig();

  const cardSpring = spring({
    frame,
    fps,
    config: { stiffness: 180, damping: 16 },
  });

  const rotY = interpolate(frame, [0, 120], [-12, 12]);
  const rotX = interpolate(frame, [0, 120], [6, -4]);
  const scale = interpolate(cardSpring, [0, 1], [0.85, 1.05]);

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
      {/* 2.5D Orbit Container holding REAL WinLand 3D WebGL Settings Screenshot */}
      <div
        style={{
          transform: `scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transformStyle: 'preserve-3d',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: 'drop-shadow(0 30px 60px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 35px rgba(56, 189, 248, 0.35))',
        }}
      >
        {/* REAL Captured WinLand 3D Catalog WebGL Window */}
        <Img
          src={staticFile('textures/live/settings_3d_catalog.png')}
          style={{
            width: 1550,
            height: 'auto',
            borderRadius: 24,
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
          color: '#38BDF8',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        REAL 3D WEBGL INTERACTIVE DEVICE CATALOG & HARDWARE CONTROLS
      </div>
    </div>
  );
};
