import React from 'react';
import { Sequence, AbsoluteFill } from 'remotion';
import { WinLandPromoProps } from './types';
import { AudioLayer } from './components/AudioLayer';
import { MusicPlayerWidget } from './components/MusicPlayerWidget';
import { ConnectionAnimationWidget } from './components/ConnectionAnimationWidget';
import { MultiWidgetShowcase } from './components/MultiWidgetShowcase';
import { DeviceCatalog3D } from './components/DeviceCatalog3D';
import { OutroLogo } from './components/OutroLogo';

export const WinLandPromo: React.FC<WinLandPromoProps> = ({ bgm = true }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0B0E14',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        color: '#FFFFFF',
      }}
    >
      {/* High-Tech Background Ambient Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 50% 30%, rgba(29, 185, 84, 0.15), transparent 70%),
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        }}
      />

      {/* Audio Layer */}
      <AudioLayer bgm={bgm} />

      {/* Shot 1: Music Player & 42-Bar Visualizer (Frames 0 - 120) */}
      <Sequence from={0} durationInFrames={120}>
        <MusicPlayerWidget />
      </Sequence>

      {/* Shot 2: Bluetooth Device Connection & Disconnection Anims (Frames 120 - 240) */}
      <Sequence from={120} durationInFrames={120}>
        <ConnectionAnimationWidget />
      </Sequence>

      {/* Shot 3: Multi-Widget Hardware Controls & System Monitor (Frames 240 - 360) */}
      <Sequence from={240} durationInFrames={120}>
        <MultiWidgetShowcase />
      </Sequence>

      {/* Shot 4: 3D Interactive WebGL Device Catalog Showcase (Frames 360 - 480) */}
      <Sequence from={360} durationInFrames={120}>
        <DeviceCatalog3D />
      </Sequence>

      {/* Shot 5: Outro Logo Stamp & CTA (Frames 480 - 600) */}
      <Sequence from={480} durationInFrames={120}>
        <OutroLogo />
      </Sequence>
    </AbsoluteFill>
  );
};
