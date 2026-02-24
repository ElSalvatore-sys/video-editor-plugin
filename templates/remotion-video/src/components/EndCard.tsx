import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface EndCardProps {
  text: string;
  subtitle?: string;
  url?: string;
  social?: string;
  logo?: string;
  bg?: string;
  fg?: string;
  accent?: string;
}

/**
 * Creates a staggered spring animation factory.
 * Each call returns a spring value delayed by the specified frame offset.
 */
function useStaggeredSpring(frame: number, fps: number) {
  return (delayFrames: number) =>
    spring({
      frame: Math.max(0, frame - delayFrames),
      fps,
      config: {
        damping: 12,
        stiffness: 80,
        mass: 0.8,
      },
    });
}

export const EndCard: React.FC<EndCardProps> = ({
  text,
  subtitle,
  url,
  social,
  logo,
  bg = '#09090B',
  fg = '#FFFFFF',
  accent = '#7C3AED',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const stagger = useStaggeredSpring(frame, fps);

  // Background gradient animation
  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Subtle pulse on the accent gradient
  const pulseScale = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [0.95, 1.05],
  );

  // Exit fade
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Animated gradient background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: bgOpacity * 0.4,
          background: `
            radial-gradient(ellipse at 30% 40%, ${accent}33 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, ${accent}22 0%, transparent 50%)
          `,
          transform: `scale(${pulseScale})`,
        }}
      />

      {/* Grid pattern overlay for texture */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: `
            linear-gradient(${fg} 1px, transparent 1px),
            linear-gradient(90deg, ${fg} 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 20,
          padding: '0 100px',
          textAlign: 'center',
          opacity: exitOpacity,
        }}
      >
        {/* Logo with spring scale animation */}
        {logo && (
          <div
            style={{
              marginBottom: 16,
              transform: `scale(${stagger(0)})`,
              opacity: stagger(0),
            }}
          >
            <Img
              src={logo}
              style={{
                width: 96,
                height: 96,
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* Main CTA text */}
        <h1
          style={{
            color: fg,
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            margin: 0,
            letterSpacing: '-0.02em',
            opacity: stagger(5),
            transform: `translateY(${interpolate(stagger(5), [0, 1], [30, 0])}px)`,
          }}
        >
          {text}
        </h1>

        {/* Accent underline */}
        <div
          style={{
            width: interpolate(stagger(10), [0, 1], [0, 160]),
            height: 4,
            backgroundColor: accent,
            borderRadius: 2,
          }}
        />

        {/* Subtitle */}
        {subtitle && (
          <p
            style={{
              color: `${fg}BB`,
              fontSize: 30,
              fontWeight: 400,
              margin: 0,
              opacity: stagger(12),
              transform: `translateY(${interpolate(stagger(12), [0, 1], [20, 0])}px)`,
            }}
          >
            {subtitle}
          </p>
        )}

        {/* URL */}
        {url && (
          <p
            style={{
              color: accent,
              fontSize: 24,
              fontWeight: 500,
              margin: 0,
              marginTop: 8,
              opacity: stagger(18),
              transform: `translateY(${interpolate(stagger(18), [0, 1], [15, 0])}px)`,
              letterSpacing: '0.03em',
            }}
          >
            {url}
          </p>
        )}

        {/* Social handle */}
        {social && (
          <p
            style={{
              color: `${fg}88`,
              fontSize: 22,
              fontWeight: 400,
              margin: 0,
              opacity: stagger(24),
              transform: `translateY(${interpolate(stagger(24), [0, 1], [15, 0])}px)`,
              letterSpacing: '0.02em',
            }}
          >
            {social}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
