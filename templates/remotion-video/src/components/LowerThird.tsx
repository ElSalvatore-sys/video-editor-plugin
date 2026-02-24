import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type LowerThirdStyle = 'modern' | 'minimal' | 'broadcast';
export type LowerThirdPosition = 'bottom-left' | 'bottom-right' | 'bottom-center';

export interface LowerThirdProps {
  name: string;
  title?: string;
  accent?: string;
  style?: LowerThirdStyle;
  position?: LowerThirdPosition;
}

/**
 * Returns positioning styles based on the chosen position variant.
 */
function getPositionStyles(position: LowerThirdPosition): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    bottom: 80,
  };

  switch (position) {
    case 'bottom-left':
      return { ...base, left: 60 };
    case 'bottom-right':
      return { ...base, right: 60, alignItems: 'flex-end' };
    case 'bottom-center':
      return { ...base, left: '50%', transform: 'translateX(-50%)' };
    default:
      return { ...base, left: 60 };
  }
}

/**
 * Modern style: accent bar on left, semi-transparent dark background, clean sans-serif text.
 */
const ModernLowerThird: React.FC<{
  name: string;
  title?: string;
  accent: string;
  progress: number;
  exitProgress: number;
}> = ({ name, title, accent, progress, exitProgress }) => {
  const slideX = interpolate(progress, [0, 1], [-400, 0]);
  const opacity = Math.min(progress, exitProgress);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        transform: `translateX(${slideX}px)`,
        opacity,
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          width: 5,
          backgroundColor: accent,
          borderRadius: '3px 0 0 3px',
          transform: `scaleY(${interpolate(progress, [0, 0.5, 1], [0, 0, 1], {
            extrapolateRight: 'clamp',
          })})`,
        }}
      />

      {/* Content panel */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          padding: '16px 28px',
          borderRadius: '0 6px 6px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minWidth: 240,
        }}
      >
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: 700,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          {name}
        </div>
        {title && (
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 20,
              fontWeight: 400,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Minimal style: no background, just text with a thin underline accent.
 */
const MinimalLowerThird: React.FC<{
  name: string;
  title?: string;
  accent: string;
  progress: number;
  exitProgress: number;
}> = ({ name, title, accent, progress, exitProgress }) => {
  const opacity = Math.min(
    interpolate(progress, [0, 1], [0, 1]),
    exitProgress,
  );
  const lineWidth = interpolate(progress, [0, 1], [0, 200]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity,
      }}
    >
      <div
        style={{
          color: '#FFFFFF',
          fontSize: 30,
          fontWeight: 600,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        {name}
      </div>
      {title && (
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: 18,
            fontWeight: 400,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          width: lineWidth,
          height: 2,
          backgroundColor: accent,
          borderRadius: 1,
          marginTop: 4,
        }}
      />
    </div>
  );
};

/**
 * Broadcast style: solid colored background strip, bold text, full-width feel.
 */
const BroadcastLowerThird: React.FC<{
  name: string;
  title?: string;
  accent: string;
  progress: number;
  exitProgress: number;
}> = ({ name, title, accent, progress, exitProgress }) => {
  const slideX = interpolate(progress, [0, 1], [-500, 0]);
  const opacity = Math.min(progress, exitProgress);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        transform: `translateX(${slideX}px)`,
        opacity,
      }}
    >
      {/* Name bar */}
      <div
        style={{
          backgroundColor: accent,
          padding: '12px 32px',
          display: 'inline-flex',
          alignSelf: 'flex-start',
        }}
      >
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 30,
            fontWeight: 700,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {name}
        </div>
      </div>

      {/* Title bar */}
      {title && (
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: '8px 32px',
            display: 'inline-flex',
            alignSelf: 'flex-start',
          }}
        >
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 20,
              fontWeight: 400,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
            }}
          >
            {title}
          </div>
        </div>
      )}
    </div>
  );
};

export const LowerThird: React.FC<LowerThirdProps> = ({
  name,
  title,
  accent = '#7C3AED',
  style: variant = 'modern',
  position = 'bottom-left',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Entry animation (spring-based slide in)
  const entryProgress = spring({
    frame,
    fps,
    config: {
      damping: 16,
      stiffness: 80,
      mass: 0.8,
    },
  });

  // Exit animation (fade out in the last 20 frames)
  const exitStart = durationInFrames - 20;
  const exitProgress = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const positionStyles = getPositionStyles(position);

  const styleComponents: Record<LowerThirdStyle, React.FC<{
    name: string;
    title?: string;
    accent: string;
    progress: number;
    exitProgress: number;
  }>> = {
    modern: ModernLowerThird,
    minimal: MinimalLowerThird,
    broadcast: BroadcastLowerThird,
  };

  const StyleComponent = styleComponents[variant] ?? ModernLowerThird;

  return (
    <AbsoluteFill>
      <div
        style={{
          ...positionStyles,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <StyleComponent
          name={name}
          title={title}
          accent={accent}
          progress={entryProgress}
          exitProgress={exitProgress}
        />
      </div>
    </AbsoluteFill>
  );
};
