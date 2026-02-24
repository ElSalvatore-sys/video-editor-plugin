import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type AnimationPreset =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'zoom'
  | 'typewriter'
  | 'glitch'
  | 'blur-in';

export interface TitleCardProps {
  text: string;
  subtitle?: string;
  bg?: string;
  fg?: string;
  accent?: string;
  animation?: AnimationPreset;
  logo?: string;
}

/**
 * Computes animation styles for the title text based on the selected preset.
 */
function useAnimationStyle(
  animation: AnimationPreset,
  frame: number,
  fps: number,
  durationInFrames: number,
  text: string,
): React.CSSProperties & { displayText?: string } {
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const entryProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  switch (animation) {
    case 'fade':
      return {
        opacity: progress,
      };

    case 'slide-up':
      return {
        opacity: progress,
        transform: `translateY(${interpolate(entryProgress, [0, 1], [80, 0])}px)`,
      };

    case 'slide-down':
      return {
        opacity: progress,
        transform: `translateY(${interpolate(entryProgress, [0, 1], [-80, 0])}px)`,
      };

    case 'zoom':
      return {
        opacity: progress,
        transform: `scale(${interpolate(entryProgress, [0, 1], [0.5, 1])})`,
      };

    case 'typewriter': {
      const charsVisible = Math.floor(
        interpolate(frame, [0, Math.min(text.length * 2, durationInFrames * 0.6)], [0, text.length], {
          extrapolateRight: 'clamp',
        }),
      );
      return {
        opacity: 1,
        displayText: text.slice(0, charsVisible),
      };
    }

    case 'glitch': {
      const glitchIntensity = interpolate(frame, [0, 20], [15, 0], {
        extrapolateRight: 'clamp',
      });
      const offsetX = frame < 20 ? Math.sin(frame * 7.3) * glitchIntensity : 0;
      const offsetY = frame < 20 ? Math.cos(frame * 5.1) * glitchIntensity * 0.5 : 0;
      const glitchOpacity = interpolate(frame, [0, 8], [0, 1], {
        extrapolateRight: 'clamp',
      });
      return {
        opacity: glitchOpacity,
        transform: `translate(${offsetX}px, ${offsetY}px)`,
      };
    }

    case 'blur-in': {
      const blurAmount = interpolate(frame, [0, 25], [20, 0], {
        extrapolateRight: 'clamp',
      });
      const blurOpacity = interpolate(frame, [0, 15], [0, 1], {
        extrapolateRight: 'clamp',
      });
      return {
        opacity: blurOpacity,
        filter: `blur(${blurAmount}px)`,
      };
    }

    default:
      return { opacity: progress };
  }
}

export const TitleCard: React.FC<TitleCardProps> = ({
  text,
  subtitle,
  bg = '#09090B',
  fg = '#FFFFFF',
  accent = '#7C3AED',
  animation = 'fade',
  logo,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const animStyle = useAnimationStyle(animation, frame, fps, durationInFrames, text);
  const displayText = animStyle.displayText ?? text;
  const { displayText: _, ...cssStyle } = animStyle;

  // Subtitle animation: delayed spring
  const subtitleProgress = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 200 },
  });

  // Logo animation: earliest spring
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  // Subtle gradient overlay
  const gradientOverlay: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(ellipse at center, ${accent}11 0%, transparent 70%)`,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Subtle radial gradient overlay */}
      <div style={gradientOverlay} />

      {/* Content container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          zIndex: 1,
          padding: '0 80px',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        {logo && (
          <Img
            src={logo}
            style={{
              width: 120,
              height: 120,
              objectFit: 'contain',
              marginBottom: 24,
              opacity: logoProgress,
              transform: `scale(${interpolate(logoProgress, [0, 1], [0.6, 1])})`,
            }}
          />
        )}

        {/* Title */}
        <h1
          style={{
            color: fg,
            fontSize: 80,
            fontWeight: 700,
            lineHeight: 1.1,
            margin: 0,
            letterSpacing: '-0.02em',
            ...cssStyle,
          }}
        >
          {displayText}
          {animation === 'typewriter' && frame % 16 < 8 && (
            <span style={{ color: accent }}>|</span>
          )}
        </h1>

        {/* Accent divider line */}
        {subtitle && (
          <div
            style={{
              width: interpolate(subtitleProgress, [0, 1], [0, 120]),
              height: 3,
              backgroundColor: accent,
              borderRadius: 2,
              marginTop: 8,
              marginBottom: 4,
            }}
          />
        )}

        {/* Subtitle */}
        {subtitle && (
          <p
            style={{
              color: `${fg}BB`,
              fontSize: 36,
              fontWeight: 400,
              margin: 0,
              opacity: subtitleProgress,
              transform: `translateY(${interpolate(subtitleProgress, [0, 1], [20, 0])}px)`,
              letterSpacing: '0.05em',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
