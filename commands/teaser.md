---
description: Create a teaser/trailer from video clips with animated title, transitions, music, and end card — usage: /teaser <clip1> [clip2 ...] [--title "..."] [--music <audio>] [--theme wad|bloghead|ea] [--transition fade|slide|wipe] [--clip-duration <s>] [--total-duration <s>] [--end-card "..."] [--output <path>]
---

# /teaser

Create a teaser or trailer by combining video clips with an animated Remotion title card, transitions between clips, optional background music, and an end card.

**Usage:** `/teaser <clip1> [clip2 ...] [options]`

**Flags:**
| Flag | Description |
|------|-------------|
| `--title "<text>"` | Animated title card at the beginning |
| `--music <audio-file>` | Background music track (volume 40%, fades out) |
| `--theme <name>` | Color theme for title/end cards: `wad`, `bloghead`, `ea` |
| `--transition <type>` | Transition between clips: `fade`, `slide`, `wipe` (uses Remotion TransitionSeries) |
| `--clip-duration <seconds>` | Cap each clip at N seconds |
| `--total-duration <seconds>` | Auto-calculate clip lengths to fit target total duration |
| `--end-card "<text>"` | Closing card with custom text (e.g., "Subscribe!", "Coming Soon") |
| `--output <path>` | Custom output file path |

**Theme Presets** (loaded from `~/design-assets/color-palettes/`):
| Theme | BG Color | FG (Primary) | Accent | Source File |
|-------|----------|-------------|--------|-------------|
| `wad` | #09090B | #7C3AED | #EC4899 | `wad-dark-theme.json` |
| `bloghead` | #0F172A | #3B82F6 | #F59E0B | `bloghead-theme.json` |
| `ea` | #0A0A1A | #8B5CF6 | #EC4899 | `ea-solutions-theme.json` |

**Transition Presets:**
| Type | Effect |
|------|--------|
| `fade` | Cross-fade between clips |
| `slide` | Slide left transition |
| `wipe` | Wipe left transition |

When `--transition` is not specified, clips are placed sequentially with hard cuts (Sequence).
When `--transition` is specified, clips use Remotion's `@remotion/transitions` TransitionSeries for smooth transitions.

**Examples:**
- `/teaser scene1.mp4 scene2.mp4 scene3.mp4 --title "My Film"`
- `/teaser clip1.mp4 clip2.mp4 --title "Coming Soon" --music bg.mp3`
- `/teaser a.mp4 b.mp4 c.mp4 --theme wad --transition fade --title "WiesbadenAfterDark"`
- `/teaser clip1.mp4 clip2.mp4 --clip-duration 5 --total-duration 30 --end-card "Subscribe!"`
- `/teaser s1.mp4 s2.mp4 s3.mp4 --theme bloghead --transition slide --end-card "Coming 2025" --output trailer.mp4`

## Steps

1. Parse clips list and all optional flags. Ask for at least one clip if none provided.

2. Validate tools:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   which ffprobe || echo "ffprobe not found. Install: brew install ffmpeg"
   node --version || echo "Node.js not found. Install: brew install node"
   ```
   Verify all clip files exist. If `--music` specified, verify that file exists too. If `--theme` specified, verify the theme JSON file exists in `~/design-assets/color-palettes/`.

3. **Resolve theme colors** (if `--theme` is specified):
   Read the theme JSON from `~/design-assets/color-palettes/`:
   - `wad` -> read `~/design-assets/color-palettes/wad-dark-theme.json`
   - `bloghead` -> read `~/design-assets/color-palettes/bloghead-theme.json`
   - `ea` -> read `~/design-assets/color-palettes/ea-solutions-theme.json`

   Extract colors:
   - `bg` = background color from theme (default: `#000000`)
   - `fg` = primary color from theme (default: `#ffffff`)
   - `accent` = accent color from theme (default: `#ffffff`)

4. **Inspect all clips** with ffprobe to get actual durations:
   ```bash
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<clip>"
   ```
   Store each clip's duration in an array.

5. **Calculate clip durations for the composition:**

   - **Default (no `--clip-duration`, no `--total-duration`):** Use each clip's actual full duration.
   - **`--clip-duration <N>` only:** Cap each clip at N seconds. If a clip is shorter than N, use its actual duration.
   - **`--total-duration <T>` only:** Calculate how much time is available for clips after subtracting title card (3s if `--title`) and end card (3s if `--end-card`). Divide remaining time equally among clips. Cap each clip at this calculated duration.
   - **Both `--clip-duration` and `--total-duration`:** Use `--clip-duration` as the cap per clip, but warn if total exceeds `--total-duration`.

   ```bash
   TITLE_DUR=0  # 3 if --title is specified
   END_DUR=0    # 3 if --end-card is specified
   CLIP_COUNT=<number of clips>

   if [ -n "$TOTAL_DURATION" ]; then
     AVAILABLE=$((TOTAL_DURATION - TITLE_DUR - END_DUR))
     PER_CLIP=$(echo "$AVAILABLE / $CLIP_COUNT" | bc -l)
   fi
   ```

   For each clip, the effective duration is:
   ```
   effective_dur[i] = min(actual_dur[i], clip_duration_cap, per_clip_from_total)
   ```

6. **Remotion workspace caching** -- check for existing workspace:
   ```bash
   WORKSPACE="/tmp/remotion-workspace"
   if [ -d "$WORKSPACE/node_modules/remotion" ]; then
     echo "Reusing cached Remotion workspace at $WORKSPACE"
     RENDER_DIR="$WORKSPACE"
   else
     echo "Creating fresh Remotion workspace..."
     rm -rf "$WORKSPACE"
     mkdir -p "$WORKSPACE/src" "$WORKSPACE/public"
     cd "$WORKSPACE"
     npm init -y --silent
     npm install --silent remotion @remotion/cli @remotion/transitions react react-dom typescript @types/react
     RENDER_DIR="$WORKSPACE"
   fi
   ```
   Ensure `@remotion/transitions` is installed (needed for `--transition`):
   ```bash
   if [ ! -d "$WORKSPACE/node_modules/@remotion/transitions" ]; then
     cd "$WORKSPACE" && npm install --silent @remotion/transitions
   fi
   ```
   Always recreate the `src/` and `public/` directories for the current render:
   ```bash
   rm -rf "$RENDER_DIR/src" "$RENDER_DIR/public"
   mkdir -p "$RENDER_DIR/src" "$RENDER_DIR/public"
   ```

7. **Copy all clip files** into `$RENDER_DIR/public/` so Remotion can serve them:
   ```bash
   for clip in <clips>; do
     cp "$clip" "$RENDER_DIR/public/"
   done
   ```
   Use only the **basename** of each clip in the Remotion composition (`staticFile()` resolves relative to `public/`).

8. Write `$RENDER_DIR/src/Teaser.tsx`:

   **Without transitions (hard cuts using Sequence):**
   ```tsx
   import React from 'react';
   import {
     AbsoluteFill,
     Sequence,
     Video,
     staticFile,
     spring,
     useCurrentFrame,
     useVideoConfig,
     interpolate,
   } from 'remotion';

   interface ClipInfo {
     filename: string;
     durationInFrames: number;
   }

   interface Props {
     title?: string;
     clips: ClipInfo[];
     bg: string;
     fg: string;
     accent: string;
     endCard?: string;
     titleDurationFrames: number;
     endCardDurationFrames: number;
   }

   const TitleCard: React.FC<{ text: string; bg: string; fg: string; accent: string }> = ({
     text, bg, fg, accent,
   }) => {
     const frame = useCurrentFrame();
     const { fps, durationInFrames } = useVideoConfig();
     const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
     const translateY = spring({ frame, fps, from: 40, to: 0, config: { damping: 100 } });
     const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
       extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
     });
     return (
       <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
         <h1 style={{
           color: fg, fontSize: 96, fontFamily: 'sans-serif', fontWeight: 800,
           opacity: opacity * fadeOut, transform: `translateY(${translateY}px)`,
           textAlign: 'center', padding: '0 60px',
         }}>{text}</h1>
       </AbsoluteFill>
     );
   };

   const EndCard: React.FC<{ text: string; bg: string; fg: string; accent: string }> = ({
     text, bg, fg, accent,
   }) => {
     const frame = useCurrentFrame();
     const { fps, durationInFrames } = useVideoConfig();
     const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
     const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
       extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
     });
     return (
       <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
         <h1 style={{
           color: accent, fontSize: 72, fontFamily: 'sans-serif', fontWeight: 700,
           opacity: opacity * fadeOut, textAlign: 'center', padding: '0 80px',
         }}>{text}</h1>
       </AbsoluteFill>
     );
   };

   export const Teaser: React.FC<Props> = ({
     title, clips, bg, fg, accent, endCard,
     titleDurationFrames, endCardDurationFrames,
   }) => {
     let offset = 0;
     return (
       <AbsoluteFill style={{ background: bg }}>
         {title && (
           <Sequence from={0} durationInFrames={titleDurationFrames}>
             <TitleCard text={title} bg={bg} fg={fg} accent={accent} />
           </Sequence>
         )}
         {(() => {
           const seqs: React.ReactNode[] = [];
           let currentOffset = titleDurationFrames;
           clips.forEach((clip, i) => {
             seqs.push(
               <Sequence key={i} from={currentOffset} durationInFrames={clip.durationInFrames}>
                 <Video src={staticFile(clip.filename)} />
               </Sequence>
             );
             currentOffset += clip.durationInFrames;
           });
           if (endCard) {
             seqs.push(
               <Sequence key="endcard" from={currentOffset} durationInFrames={endCardDurationFrames}>
                 <EndCard text={endCard} bg={bg} fg={fg} accent={accent} />
               </Sequence>
             );
           }
           return seqs;
         })()}
       </AbsoluteFill>
     );
   };
   ```

   **With transitions (using @remotion/transitions TransitionSeries):**
   ```tsx
   import React from 'react';
   import {
     AbsoluteFill,
     Video,
     staticFile,
     spring,
     useCurrentFrame,
     useVideoConfig,
     interpolate,
   } from 'remotion';
   import { TransitionSeries, linearTiming } from '@remotion/transitions';
   import { fade } from '@remotion/transitions/fade';
   import { slide } from '@remotion/transitions/slide';
   import { wipe } from '@remotion/transitions/wipe';

   interface ClipInfo {
     filename: string;
     durationInFrames: number;
   }

   interface Props {
     title?: string;
     clips: ClipInfo[];
     bg: string;
     fg: string;
     accent: string;
     endCard?: string;
     titleDurationFrames: number;
     endCardDurationFrames: number;
     transitionType: string;
     transitionDurationFrames: number;
   }

   const TitleCard: React.FC<{ text: string; bg: string; fg: string }> = ({ text, bg, fg }) => {
     const frame = useCurrentFrame();
     const { fps } = useVideoConfig();
     const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
     const translateY = spring({ frame, fps, from: 40, to: 0, config: { damping: 100 } });
     return (
       <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
         <h1 style={{
           color: fg, fontSize: 96, fontFamily: 'sans-serif', fontWeight: 800,
           opacity, transform: `translateY(${translateY}px)`, textAlign: 'center', padding: '0 60px',
         }}>{text}</h1>
       </AbsoluteFill>
     );
   };

   const EndCard: React.FC<{ text: string; bg: string; accent: string }> = ({ text, bg, accent }) => {
     const frame = useCurrentFrame();
     const { fps } = useVideoConfig();
     const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
     return (
       <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
         <h1 style={{
           color: accent, fontSize: 72, fontFamily: 'sans-serif', fontWeight: 700,
           opacity, textAlign: 'center', padding: '0 80px',
         }}>{text}</h1>
       </AbsoluteFill>
     );
   };

   const getTransition = (type: string) => {
     switch (type) {
       case 'slide': return slide({ direction: 'from-right' });
       case 'wipe': return wipe({ direction: 'from-left' });
       case 'fade':
       default: return fade();
     }
   };

   export const Teaser: React.FC<Props> = ({
     title, clips, bg, fg, accent, endCard,
     titleDurationFrames, endCardDurationFrames,
     transitionType, transitionDurationFrames,
   }) => {
     const presentation = getTransition(transitionType);
     return (
       <TransitionSeries>
         {title && (
           <>
             <TransitionSeries.Sequence durationInFrames={titleDurationFrames}>
               <TitleCard text={title} bg={bg} fg={fg} />
             </TransitionSeries.Sequence>
             <TransitionSeries.Transition
               presentation={presentation}
               timing={linearTiming({ durationInFrames: transitionDurationFrames })}
             />
           </>
         )}
         {clips.map((clip, i) => (
           <React.Fragment key={i}>
             <TransitionSeries.Sequence durationInFrames={clip.durationInFrames}>
               <AbsoluteFill style={{ background: bg }}>
                 <Video src={staticFile(clip.filename)} />
               </AbsoluteFill>
             </TransitionSeries.Sequence>
             {(i < clips.length - 1 || endCard) && (
               <TransitionSeries.Transition
                 presentation={presentation}
                 timing={linearTiming({ durationInFrames: transitionDurationFrames })}
               />
             )}
           </React.Fragment>
         ))}
         {endCard && (
           <TransitionSeries.Sequence durationInFrames={endCardDurationFrames}>
             <EndCard text={endCard} bg={bg} accent={accent} />
           </TransitionSeries.Sequence>
         )}
       </TransitionSeries>
     );
   };
   ```

   Choose the version based on whether `--transition` was specified.

9. Write `$RENDER_DIR/src/Root.tsx`:

   Calculate total frames:
   ```
   titleFrames = (title ? 3 * 30 : 0)
   clipFrames = sum of each clip's effectiveDuration * 30
   endCardFrames = (endCard ? 3 * 30 : 0)
   transitionFrames = (transition ? transitionDuration * 30 * numberOfTransitions : 0)
   totalFrames = titleFrames + clipFrames + endCardFrames - transitionFrames
   ```
   Note: With TransitionSeries, transitions overlap adjacent sequences, so we subtract transition duration for each transition.

   Number of transitions:
   - Between title and first clip: 1 (if title exists)
   - Between clips: (clipCount - 1)
   - Between last clip and end card: 1 (if end card exists)
   - Total: (title ? 1 : 0) + (clipCount - 1) + (endCard ? 1 : 0)

   Without transitions, totalFrames = titleFrames + clipFrames + endCardFrames (no overlap).

   ```tsx
   import React from 'react';
   import { Composition } from 'remotion';
   import { Teaser } from './Teaser';

   export const RemotionRoot: React.FC = () => (
     <Composition
       id="Teaser"
       component={Teaser}
       durationInFrames={<totalFrames>}
       fps={30}
       width={1920}
       height={1080}
       defaultProps={{
         title: <title or undefined>,
         clips: [
           { filename: '<clip1-basename>', durationInFrames: <frames1> },
           { filename: '<clip2-basename>', durationInFrames: <frames2> },
           // ...
         ],
         bg: '<bg>',
         fg: '<fg>',
         accent: '<accent>',
         endCard: <endCard text or undefined>,
         titleDurationFrames: <titleFrames>,
         endCardDurationFrames: <endCardFrames>,
         transitionType: '<fade|slide|wipe>',             // only if --transition
         transitionDurationFrames: <transitionFrames>,     // only if --transition
       }}
     />
   );
   ```
   Replace all `<placeholders>` with actual computed values.

10. Write `$RENDER_DIR/src/index.ts`:
    ```ts
    import { registerRoot } from 'remotion';
    import { RemotionRoot } from './Root';
    registerRoot(RemotionRoot);
    ```

11. Write `$RENDER_DIR/tsconfig.json`:
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

12. Determine output filename:
    - If `--output <path>` was provided, use that path (resolve to absolute).
    - Otherwise: `teaser_output.mp4`
    - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc.:
      ```bash
      OUTPUT="teaser_output.mp4"
      COUNTER=2
      while [ -f "$OUTPUT" ]; do
        OUTPUT="teaser_output_${COUNTER}.mp4"
        COUNTER=$((COUNTER + 1))
      done
      ```

13. Render:
    ```bash
    cd "$RENDER_DIR"
    npx remotion render src/index.ts Teaser "$RENDER_DIR/teaser_render.mp4"
    ```

14. Check exit code:
    ```bash
    if [ $? -ne 0 ]; then
      echo "Remotion render failed. Check the error output above."
      echo "Common fixes:"
      echo "  - Check Node.js version (need 16+): node --version"
      echo "  - Try clearing the workspace: rm -rf /tmp/remotion-workspace && re-run"
      echo "  - If @remotion/transitions import fails, ensure it was installed"
      echo "  - Check that all clip files exist and are valid video files"
      echo "  - For large clips, ensure sufficient disk space in /tmp"
    fi
    ```

15. **Add music** (if `--music` was specified):
    Get the rendered teaser duration:
    ```bash
    TEASER_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$RENDER_DIR/teaser_render.mp4")
    FADE_START=$(echo "$TEASER_DUR - 2" | bc)
    ```
    Mix music:
    ```bash
    ffmpeg -n -i "$RENDER_DIR/teaser_render.mp4" -i "<music>" \
      -filter_complex "[1:a]volume=0.4,afade=t=out:st=${FADE_START}:d=2[bgm]; \
                       [0:a][bgm]amix=inputs=2:duration=shortest[a]" \
      -map 0:v -map "[a]" "<output>"
    ```
    If the teaser has no original audio, use music directly:
    ```bash
    ffmpeg -n -i "$RENDER_DIR/teaser_render.mp4" -i "<music>" \
      -filter_complex "[1:a]volume=0.4,afade=t=out:st=${FADE_START}:d=2[a]" \
      -map 0:v -map "[a]" -shortest "<output>"
    ```

    Check exit code:
    ```bash
    if [ $? -ne 0 ]; then
      echo "Music mixing failed. Check the error output above."
      echo "Common fixes:"
      echo "  - Check the music file format: ffprobe \"<music>\""
      echo "  - Try converting music to AAC first: ffmpeg -i music.mp3 -c:a aac music.m4a"
    fi
    ```

    If no music: move the rendered file directly:
    ```bash
    mv "$RENDER_DIR/teaser_render.mp4" "<output>"
    ```

16. Report: output path, total duration, file size, and a breakdown summary:
    ```
    Teaser assembly:
    - Title card: 3s (if present)
    - Clip 1 (scene1.mp4): 5.2s
    - Clip 2 (scene2.mp4): 3.8s
    - Clip 3 (scene3.mp4): 7.1s
    - End card: 3s (if present)
    - Transitions: 4x 1s fade (overlapping)
    - Background music: background.mp3 at 40% volume (if present)
    - Total: 18.1s
    ```

17. Suggest next steps:
    > "Teaser complete! Here are some things you can do next:
    > - Compress for a platform: `/compress <output> youtube` or `/compress <output> instagram`
    > - Add captions: `/add-captions <output> auto --style tiktok`
    > - Trim to a shorter version: `/trim <output> 00:00 00:15`
    > - Extract the audio track: `/extract <output> audio`
    > - Create a different title card: `/title-card "New Title" --theme wad --animation glitch`"
