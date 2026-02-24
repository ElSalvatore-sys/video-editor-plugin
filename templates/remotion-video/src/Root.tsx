import React from 'react';
import { Composition } from 'remotion';
import { TitleCard, type TitleCardProps } from './components/TitleCard';
import { LowerThird, type LowerThirdProps } from './components/LowerThird';
import { EndCard, type EndCardProps } from './components/EndCard';
import { Teaser, type TeaserProps } from './components/Teaser';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition<TitleCardProps>
        id="TitleCard"
        component={TitleCard}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          text: 'Title Card',
          subtitle: undefined,
          bg: '#09090B',
          fg: '#FFFFFF',
          accent: '#7C3AED',
          animation: 'fade',
          logo: undefined,
        }}
      />
      <Composition<LowerThirdProps>
        id="LowerThird"
        component={LowerThird}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          name: 'Name',
          title: 'Title',
          accent: '#7C3AED',
          style: 'modern',
          position: 'bottom-left',
        }}
      />
      <Composition<EndCardProps>
        id="EndCard"
        component={EndCard}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          text: 'Thanks for Watching',
          subtitle: undefined,
          url: undefined,
          social: undefined,
          logo: undefined,
          bg: '#09090B',
          fg: '#FFFFFF',
          accent: '#7C3AED',
        }}
      />
      <Composition<TeaserProps>
        id="Teaser"
        component={Teaser}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Teaser',
          clips: [],
          transitions: 'fade',
          theme: {
            primary: '#7C3AED',
            bg: '#09090B',
            accent: '#EC4899',
            fg: '#FFFFFF',
          },
          showEndCard: false,
          endCardText: undefined,
        }}
      />
    </>
  );
};
