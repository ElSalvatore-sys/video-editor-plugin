import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  Video,
  staticFile,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  TransitionSeries,
  linearTiming,
} from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { TitleCard } from './TitleCard';
import { EndCard } from './EndCard';

export type TransitionType = 'fade' | 'slide' | 'wipe' | 'none';

export interface TeaserClip {
  src: string;
  durationInFrames?: number;
  label?: string;
}

export interface TeaserTheme {
  primary: string;
  bg: string;
  accent: string;
  fg: string;
}

export interface TeaserProps {
  title: string;
  clips: TeaserClip[] | string[];
  transitions?: TransitionType;
  theme?: TeaserTheme;
  showEndCard?: boolean;
  endCardText?: string;
}

/** Default frames per clip if not specified */
const DEFAULT_CLIP_DURATION = 120; // 4 seconds at 30fps

/** Transition duration in frames */
const TRANSITION_DURATION = 15; // 0.5 seconds at 30fps

/** Title card duration */
const TITLE_DURATION = 90; // 3 seconds at 30fps

/** End card duration */
const END_CARD_DURATION = 120; // 4 seconds at 30fps

/**
 * Normalizes clip input. Accepts either an array of strings (file paths)
 * or an array of TeaserClip objects.
 */
function normalizeClips(clips: TeaserClip[] | string[]): TeaserClip[] {
  return clips.map((clip) => {
    if (typeof clip === 'string') {
      return {
        src: clip,
        durationInFrames: DEFAULT_CLIP_DURATION,
      };
    }
    return {
      ...clip,
      durationInFrames: clip.durationInFrames ?? DEFAULT_CLIP_DURATION,
    };
  });
}

/**
 * Returns the Remotion transition presentation based on the type string.
 */
function getTransitionPresentation(type: TransitionType) {
  switch (type) {
    case 'fade':
      return fade();
    case 'slide':
      return slide({ direction: 'from-right' });
    case 'wipe':
      return wipe({ direction: 'from-left' });
    case 'none':
    default:
      return fade();
  }
}

/**
 * A simple flash/beat overlay that briefly brightens between clips.
 * Purely decorative, adds energy to the teaser.
 */
const BeatFlash: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 4, 8], [0, 0.3, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * Clip label overlay shown at the bottom of individual clips.
 */
const ClipLabel: React.FC<{ label: string; fg: string }> = ({ label, fg }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [10, 20, 80, 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: 60,
        right: 60,
        opacity,
        zIndex: 2,
      }}
    >
      <div
        style={{
          color: fg,
          fontSize: 28,
          fontWeight: 600,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
          textShadow: '0 2px 12px rgba(0,0,0,0.7)',
        }}
      >
        {label}
      </div>
    </div>
  );
};

/**
 * Individual clip wrapper with optional label and vignette.
 */
const ClipSequence: React.FC<{
  clip: TeaserClip;
  fg: string;
}> = ({ clip, fg }) => {
  return (
    <AbsoluteFill>
      <Video
        src={staticFile(clip.src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Vignette overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Optional label */}
      {clip.label && <ClipLabel label={clip.label} fg={fg} />}
    </AbsoluteFill>
  );
};

export const Teaser: React.FC<TeaserProps> = ({
  title,
  clips: rawClips,
  transitions = 'fade',
  theme,
  showEndCard = false,
  endCardText,
}) => {
  const defaultTheme: TeaserTheme = {
    primary: '#7C3AED',
    bg: '#09090B',
    accent: '#EC4899',
    fg: '#FFFFFF',
  };

  const t = theme ?? defaultTheme;
  const clips = normalizeClips(rawClips);
  const transitionType = transitions === 'none' ? 'none' : transitions;
  const useTransitions = transitionType !== 'none';

  // If no clips provided, render just the title card
  if (clips.length === 0) {
    return (
      <AbsoluteFill>
        <TitleCard
          text={title}
          bg={t.bg}
          fg={t.fg}
          accent={t.accent}
          animation="zoom"
        />
      </AbsoluteFill>
    );
  }

  // With TransitionSeries for smooth clip-to-clip transitions
  if (useTransitions) {
    return (
      <AbsoluteFill style={{ backgroundColor: t.bg }}>
        <TransitionSeries>
          {/* Title card */}
          <TransitionSeries.Sequence durationInFrames={TITLE_DURATION}>
            <TitleCard
              text={title}
              bg={t.bg}
              fg={t.fg}
              accent={t.accent}
              animation="zoom"
            />
          </TransitionSeries.Sequence>

          {/* Clips with transitions */}
          {clips.map((clip, index) => (
            <React.Fragment key={`clip-${index}`}>
              <TransitionSeries.Transition
                presentation={getTransitionPresentation(transitionType)}
                timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
              />
              <TransitionSeries.Sequence
                durationInFrames={clip.durationInFrames!}
              >
                <ClipSequence clip={clip} fg={t.fg} />
              </TransitionSeries.Sequence>
            </React.Fragment>
          ))}

          {/* Optional end card */}
          {showEndCard && (
            <>
              <TransitionSeries.Transition
                presentation={getTransitionPresentation('fade')}
                timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
              />
              <TransitionSeries.Sequence durationInFrames={END_CARD_DURATION}>
                <EndCard
                  text={endCardText ?? title}
                  bg={t.bg}
                  fg={t.fg}
                  accent={t.accent}
                />
              </TransitionSeries.Sequence>
            </>
          )}
        </TransitionSeries>
      </AbsoluteFill>
    );
  }

  // Without transitions: use plain Sequences
  let currentFrame = 0;

  const sequences: Array<{
    from: number;
    duration: number;
    content: React.ReactNode;
  }> = [];

  // Title card
  sequences.push({
    from: currentFrame,
    duration: TITLE_DURATION,
    content: (
      <TitleCard
        text={title}
        bg={t.bg}
        fg={t.fg}
        accent={t.accent}
        animation="zoom"
      />
    ),
  });
  currentFrame += TITLE_DURATION;

  // Clips
  for (const clip of clips) {
    const dur = clip.durationInFrames!;
    sequences.push({
      from: currentFrame,
      duration: dur,
      content: <ClipSequence clip={clip} fg={t.fg} />,
    });
    currentFrame += dur;
  }

  // Optional end card
  if (showEndCard) {
    sequences.push({
      from: currentFrame,
      duration: END_CARD_DURATION,
      content: (
        <EndCard
          text={endCardText ?? title}
          bg={t.bg}
          fg={t.fg}
          accent={t.accent}
        />
      ),
    });
  }

  return (
    <AbsoluteFill style={{ backgroundColor: t.bg }}>
      {sequences.map((seq, i) => (
        <Sequence
          key={`seq-${i}`}
          from={seq.from}
          durationInFrames={seq.duration}
        >
          {seq.content}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
