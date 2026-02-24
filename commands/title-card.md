---
description: Create an animated title card video using Remotion — usage: /title-card "<text>" [--bg #000] [--fg #fff] [--duration 3] [--theme wad|bloghead|ea] [--animation fade|slide-up|zoom|typewriter|glitch|blur-in] [--subtitle "..."] [--logo <path>] [--resolution 1080p|720p|4k|square|vertical] [--output <path>]
---

# /title-card

Generate an animated title card as an MP4 using Remotion (React-based rendering).

**Usage:** `/title-card "<text>" [options]`

**Defaults:** black background (`#000000`), white text (`#ffffff`), 3 seconds, 1920x1080, 30fps, fade animation

**Flags:**
| Flag | Description |
|------|-------------|
| `--bg <hex>` | Background color |
| `--fg <hex>` | Text color |
| `--duration <seconds>` | Duration in seconds (default: 3) |
| `--theme <name>` | Load colors from a design asset palette (overrides --bg/--fg) |
| `--animation <type>` | Animation preset |
| `--subtitle "<text>"` | Second line of smaller text below the title |
| `--logo <path>` | Image file to include above or below the title |
| `--resolution <preset>` | Output resolution |
| `--output <path>` | Custom output file path |

**Theme Presets** (loaded from `~/design-assets/color-palettes/`):
| Theme | BG Color | FG (Primary) | Accent | Source File |
|-------|----------|-------------|--------|-------------|
| `wad` | #09090B | #7C3AED | #EC4899 | `wad-dark-theme.json` |
| `bloghead` | #0F172A | #3B82F6 | #F59E0B | `bloghead-theme.json` |
| `ea` | #0A0A1A | #8B5CF6 | #EC4899 | `ea-solutions-theme.json` |

When a theme is used: `bg` = theme background, `fg` = theme primary, subtitle/accent elements use theme accent color.

**Animation Presets:**
| Animation | Description |
|-----------|-------------|
| `fade` | Fade in with gentle upward drift (default) |
| `slide-up` | Slide up from below the frame |
| `slide-down` | Slide down from above the frame |
| `zoom` | Zoom in from small to full size |
| `typewriter` | Characters appear one at a time |
| `glitch` | RGB split + shake effect on reveal |
| `blur-in` | Start blurred, sharpen into focus |

**Resolution Presets:**
| Preset | Width | Height | Aspect |
|--------|-------|--------|--------|
| `1080p` | 1920 | 1080 | 16:9 (default) |
| `720p` | 1280 | 720 | 16:9 |
| `4k` | 3840 | 2160 | 16:9 |
| `square` | 1080 | 1080 | 1:1 |
| `vertical` | 1080 | 1920 | 9:16 |

**Examples:**
- `/title-card "Chapter 1"`
- `/title-card "The Beginning" --bg "#1a1a2e" --fg "#e0aaff" --duration 5`
- `/title-card "WiesbadenAfterDark" --theme wad --animation glitch`
- `/title-card "My Blog" --theme bloghead --subtitle "Episode 12" --animation typewriter`
- `/title-card "EA Solutions" --theme ea --logo ~/design-assets/logo.png --resolution vertical`

## Steps

1. Parse the title text and all optional flags. Ask for text if not provided.

2. **Resolve theme colors** (if `--theme` is specified):
   Read the theme JSON from `~/design-assets/color-palettes/`:
   - `wad` -> read `~/design-assets/color-palettes/wad-dark-theme.json`
   - `bloghead` -> read `~/design-assets/color-palettes/bloghead-theme.json`
   - `ea` -> read `~/design-assets/color-palettes/ea-solutions-theme.json`

   Extract `primary`, `background`, and `accent` colors from the JSON. Map them:
   - `bg` = background color from theme
   - `fg` = primary color from theme
   - `accent` = accent color from theme (used for subtitle text)

   If `--bg` or `--fg` are also specified, they override the theme values.

3. **Resolve resolution:**
   - `1080p` -> width=1920, height=1080
   - `720p` -> width=1280, height=720
   - `4k` -> width=3840, height=2160
   - `square` -> width=1080, height=1080
   - `vertical` -> width=1080, height=1920
   Default: 1080p

4. Check Node.js:
   ```bash
   node --version
   ```
   If missing: "Install Node.js from https://nodejs.org or `brew install node`"

5. **Remotion workspace caching** -- check for existing workspace:
   ```bash
   WORKSPACE="/tmp/remotion-workspace"
   if [ -d "$WORKSPACE/node_modules/remotion" ]; then
     echo "Reusing cached Remotion workspace at $WORKSPACE"
     RENDER_DIR="$WORKSPACE"
   else
     echo "Creating fresh Remotion workspace..."
     rm -rf "$WORKSPACE"
     mkdir -p "$WORKSPACE/src"
     cd "$WORKSPACE"
     npm init -y --silent
     npm install --silent remotion @remotion/cli react react-dom typescript @types/react
     RENDER_DIR="$WORKSPACE"
   fi
   ```
   Always recreate the `src/` directory for the current render (but keep `node_modules`):
   ```bash
   rm -rf "$RENDER_DIR/src"
   mkdir -p "$RENDER_DIR/src"
   ```

6. If `--logo` was specified, copy the logo image into the workspace:
   ```bash
   mkdir -p "$RENDER_DIR/public"
   cp "<logo-path>" "$RENDER_DIR/public/logo.png"
   ```

7. Write `$RENDER_DIR/src/TitleCard.tsx`:

   ```tsx
   import React from 'react';
   import {
     AbsoluteFill,
     spring,
     useCurrentFrame,
     useVideoConfig,
     Img,
     staticFile,
     interpolate,
   } from 'remotion';

   interface Props {
     text: string;
     bg: string;
     fg: string;
     accent: string;
     subtitle?: string;
     hasLogo: boolean;
     animation: string;
   }

   export const TitleCard: React.FC<Props> = ({
     text,
     bg,
     fg,
     accent,
     subtitle,
     hasLogo,
     animation,
   }) => {
     const frame = useCurrentFrame();
     const { fps, durationInFrames } = useVideoConfig();

     // Fade out in last 15 frames
     const fadeOut = interpolate(
       frame,
       [durationInFrames - 15, durationInFrames],
       [1, 0],
       { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
     );

     // Animation calculations
     let titleStyle: React.CSSProperties = {};
     let containerOpacity = fadeOut;

     if (animation === 'fade') {
       const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
       const translateY = spring({ frame, fps, from: 40, to: 0, config: { damping: 100 } });
       titleStyle = { opacity: opacity * fadeOut, transform: `translateY(${translateY}px)` };
     } else if (animation === 'slide-up') {
       const translateY = spring({ frame, fps, from: 300, to: 0, config: { damping: 80, stiffness: 100 } });
       const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
       titleStyle = { opacity: opacity * fadeOut, transform: `translateY(${translateY}px)` };
     } else if (animation === 'slide-down') {
       const translateY = spring({ frame, fps, from: -300, to: 0, config: { damping: 80, stiffness: 100 } });
       const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
       titleStyle = { opacity: opacity * fadeOut, transform: `translateY(${translateY}px)` };
     } else if (animation === 'zoom') {
       const scale = spring({ frame, fps, from: 0.3, to: 1, config: { damping: 80, stiffness: 120 } });
       const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
       titleStyle = { opacity: opacity * fadeOut, transform: `scale(${scale})` };
     } else if (animation === 'typewriter') {
       const charsToShow = Math.floor(interpolate(frame, [0, Math.min(fps * 1.5, durationInFrames * 0.6)], [0, text.length], { extrapolateRight: 'clamp' }));
       const displayText = text.slice(0, charsToShow);
       const cursorVisible = frame % 15 < 10 && charsToShow < text.length;
       titleStyle = { opacity: fadeOut };
       // Override text rendering in JSX below
       (titleStyle as any).__typewriterText = displayText;
       (titleStyle as any).__cursorVisible = cursorVisible;
     } else if (animation === 'glitch') {
       const reveal = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
       const glitchIntensity = frame < fps * 0.5 ? Math.sin(frame * 3) * 5 : 0;
       const rgbShift = frame < fps * 0.5 ? Math.sin(frame * 5) * 3 : 0;
       titleStyle = {
         opacity: reveal * fadeOut,
         transform: `translateX(${glitchIntensity}px)`,
         textShadow: `${rgbShift}px 0 rgba(255,0,0,0.7), ${-rgbShift}px 0 rgba(0,255,255,0.7)`,
       };
     } else if (animation === 'blur-in') {
       const blur = interpolate(frame, [0, fps * 0.8], [20, 0], { extrapolateRight: 'clamp' });
       const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
       titleStyle = { opacity: opacity * fadeOut, filter: `blur(${blur}px)` };
     }

     const isTypewriter = animation === 'typewriter';
     const displayText = isTypewriter ? (titleStyle as any).__typewriterText || '' : text;
     const cursorVisible = isTypewriter ? (titleStyle as any).__cursorVisible || false : false;

     // Clean up internal properties
     if (isTypewriter) {
       delete (titleStyle as any).__typewriterText;
       delete (titleStyle as any).__cursorVisible;
     }

     const subtitleSpring = spring({ frame, fps, from: 0, to: 1, durationInFrames: fps, delay: Math.floor(fps * 0.5), config: { damping: 200 } });

     return (
       <AbsoluteFill
         style={{
           background: bg,
           justifyContent: 'center',
           alignItems: 'center',
           opacity: containerOpacity,
         }}
       >
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
           {hasLogo && (
             <Img
               src={staticFile('logo.png')}
               style={{
                 width: 120,
                 height: 120,
                 objectFit: 'contain',
                 marginBottom: 20,
                 opacity: spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } }) * fadeOut,
               }}
             />
           )}
           <h1
             style={{
               color: fg,
               fontSize: 96,
               fontFamily: 'sans-serif',
               fontWeight: 800,
               textAlign: 'center',
               padding: '0 60px',
               margin: 0,
               lineHeight: 1.1,
               ...titleStyle,
             }}
           >
             {displayText}{cursorVisible ? '|' : ''}
           </h1>
           {subtitle && (
             <p
               style={{
                 color: accent,
                 fontSize: 42,
                 fontFamily: 'sans-serif',
                 fontWeight: 400,
                 textAlign: 'center',
                 padding: '0 80px',
                 margin: 0,
                 opacity: subtitleSpring * fadeOut,
               }}
             >
               {subtitle}
             </p>
           )}
         </div>
       </AbsoluteFill>
     );
   };
   ```

8. Write `$RENDER_DIR/src/Root.tsx`:
   ```tsx
   import React from 'react';
   import { Composition } from 'remotion';
   import { TitleCard } from './TitleCard';

   export const RemotionRoot: React.FC = () => (
     <Composition
       id="TitleCard"
       component={TitleCard}
       durationInFrames={30 * <duration>}
       fps={30}
       width={<width>}
       height={<height>}
       defaultProps={{
         text: '<text>',
         bg: '<bg>',
         fg: '<fg>',
         accent: '<accent>',
         subtitle: '<subtitle>' || undefined,
         hasLogo: <true|false>,
         animation: '<animation>',
       }}
     />
   );
   ```
   Replace all `<placeholders>` with actual values.

9. Write `$RENDER_DIR/src/index.ts`:
   ```ts
   import { registerRoot } from 'remotion';
   import { RemotionRoot } from './Root';
   registerRoot(RemotionRoot);
   ```

10. Write `$RENDER_DIR/tsconfig.json`:
    ```json
    {
      "compilerOptions": {
        "jsx": "react-jsx",
        "esModuleInterop": true,
        "module": "commonjs",
        "target": "es2018",
        "strict": false,
        "moduleResolution": "node"
      }
    }
    ```

11. Determine output filename:
    - If `--output <path>` was provided, use that path (resolve to absolute).
    - Otherwise: `titlecard_<sanitized-text>.<ext>` (sanitize text: lowercase, replace spaces with underscores, remove special chars, max 30 chars). E.g., `titlecard_chapter_1.mp4`
    - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc.:
      ```bash
      COUNTER=2
      while [ -f "$OUTPUT" ]; do
        OUTPUT="titlecard_<name>_${COUNTER}.mp4"
        COUNTER=$((COUNTER + 1))
      done
      ```

12. Render:
    ```bash
    cd "$RENDER_DIR"
    npx remotion render src/index.ts TitleCard "$RENDER_DIR/title_card_render.mp4"
    ```

13. Check exit code:
    ```bash
    if [ $? -ne 0 ]; then
      echo "Remotion render failed. Check the error output above."
      echo "Common fixes:"
      echo "  - Check Node.js version (need 16+): node --version"
      echo "  - Try clearing the workspace: rm -rf /tmp/remotion-workspace && re-run"
      echo "  - Check for TypeScript errors in the generated code"
      echo "  - Ensure sufficient disk space in /tmp"
    fi
    ```

14. Move output to the user's target location:
    ```bash
    mv "$RENDER_DIR/title_card_render.mp4" "<output>"
    ```

15. Report: output path, file size, duration, and resolution.

16. Suggest next steps:
    > "Title card saved to `<output>`. Here are some things you can do next:
    > - Prepend it to a video: `/merge <output> your_video.mp4 --transition fade`
    > - Create a full teaser: `/teaser clip1.mp4 clip2.mp4 --title "Your Title"`
    > - Compress for sharing: `/compress <output> youtube`
    > - Make another title card with different animation: `/title-card "Text" --animation glitch`"
