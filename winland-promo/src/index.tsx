import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { WinLandPromo } from './WinLandPromo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WinLandPromo"
        component={WinLandPromo}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          bgm: true,
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
