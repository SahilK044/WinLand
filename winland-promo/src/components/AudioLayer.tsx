import React from 'react';
import { Audio, staticFile, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

interface AudioLayerProps {
  bgm?: boolean;
}

export const AudioLayer: React.FC<AudioLayerProps> = ({ bgm = true }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // BGM Envelope: Smooth 1s fade-in, 1.8s fade-out
  const bgmVolume = interpolate(
    frame,
    [0, 30, durationInFrames - 54, durationInFrames],
    [0, 0.38, 0.38, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const sfxList = [
    { from: 0, src: 'audio/sfx/transition-soft.mp3', volume: 0.45 },
    { from: 25, src: 'audio/sfx/whoosh-big.mp3', volume: 0.5 },
    { from: 120, src: 'audio/sfx/click-camera.mp3', volume: 0.55 },
    { from: 180, src: 'audio/sfx/swoosh-quick.mp3', volume: 0.45 },
    { from: 240, src: 'audio/sfx/whoosh-fast.mp3', volume: 0.45 },
    { from: 300, src: 'audio/sfx/click-camera.mp3', volume: 0.5 },
    { from: 360, src: 'audio/sfx/whoosh-big.mp3', volume: 0.5 },
    { from: 420, src: 'audio/sfx/sparkle.mp3', volume: 0.4 },
    { from: 480, src: 'audio/sfx/riser-cine.mp3', volume: 0.45 },
    { from: 525, src: 'audio/sfx/impact-deep-whoosh.mp3', volume: 0.65 },
    { from: 545, src: 'audio/sfx/sparkle.mp3', volume: 0.45 },
  ];

  return (
    <>
      {bgm !== false && (
        <Audio
          src={staticFile('audio/bgm/tonight-hiphop.mp3')}
          volume={bgmVolume}
        />
      )}

      {sfxList.map((sfx, i) => {
        if (frame >= sfx.from) {
          return (
            <React.Fragment key={i}>
              {frame === sfx.from && (
                <Audio
                  src={staticFile(sfx.src)}
                  volume={sfx.volume}
                />
              )}
            </React.Fragment>
          );
        }
        return null;
      })}
    </>
  );
};
