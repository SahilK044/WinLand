import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const ConnectionAnimationWidget: React.FC = () => {
  const frame = useCurrentFrame(); // 0 to 120
  const { fps } = useVideoConfig();

  const isConnected = frame < 60;

  const cardSpring = spring({
    frame: isConnected ? frame : frame - 60,
    fps,
    config: { stiffness: 240, damping: 18 },
  });

  const statusColor = isConnected ? '#30D158' : '#FF453A';
  const statusText = isConnected ? 'Connected' : 'Disconnected';
  const subText = isConnected ? 'AirPods Max • Battery 95%' : 'Device Offline';

  const scale = interpolate(cardSpring, [0, 1], [0.8, 1.05]);
  const floatY = Math.sin(frame * 0.1) * 6;

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
      {/* Background Ambient Glow */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${statusColor}40 0%, rgba(0, 0, 0, 0) 70%)`,
          transform: `scale(${interpolate(cardSpring, [0, 1], [0.6, 1.2])})`,
          opacity: 0.7,
        }}
      />

      {/* Floating Dynamic Island Card */}
      <div
        style={{
          transform: `scale(${scale}) translateY(${floatY}px)`,
          width: 460,
          height: 90,
          borderRadius: 45,
          backgroundColor: 'rgba(12, 14, 20, 0.88)',
          backdropFilter: 'blur(30px) saturate(190%)',
          border: `1.5px solid ${statusColor}60`,
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px ${statusColor}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Left: Device 3D Icon & Pulsing LED */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${statusColor}30, ${statusColor}10)`,
                border: `1px solid ${statusColor}60`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              🎧
            </div>
            {/* Status LED Dot */}
            <div
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 10px ${statusColor}`,
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
              AirPods Max
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: statusColor, fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>
                {statusText}
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}>•</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12 }}>
                {subText}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Status Pill / Battery Badge */}
        {isConnected ? (
          <div
            style={{
              background: 'rgba(48, 209, 88, 0.18)',
              border: '1px solid rgba(48, 209, 88, 0.4)',
              padding: '6px 14px',
              borderRadius: 20,
              color: '#30D158',
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            ⚡ 95%
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(255, 69, 58, 0.18)',
              border: '1px solid rgba(255, 69, 58, 0.4)',
              padding: '6px 14px',
              borderRadius: 20,
              color: '#FF453A',
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            OFFLINE
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
          color: statusColor,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        {isConnected ? 'BLUETOOTH DEVICE CONNECTION ANIMATION' : 'INSTANT DEVICE DISCONNECTION NOTIFICATION'}
      </div>
    </div>
  );
};
