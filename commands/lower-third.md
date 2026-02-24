---
description: Create and burn an animated lower-third name/title overlay onto a video using Remotion + ffmpeg — usage: /lower-third <video> --name "<name>" --title "<title>" [--at HH:MM:SS] [--duration seconds] [--position bottom-left|bottom-right|bottom-center] [--theme wad|bloghead|ea] [--style modern|minimal|broadcast] [--output <path>]
---

# /lower-third

Create a professional animated lower-third overlay (name + title) and burn it onto a video. Uses Remotion for the motion graphics rendering and ffmpeg for compositing.

**Usage:** `/lower-third <video> --name "<name>" --title "<title>" [options]`

**Flags:**
| Flag | Description | Default |
|------|-------------|---------|
| `--name <text>` | Primary text (person's name) | **required** |
| `--title <text>` | Secondary text (role/organization) | **required** |
| `--at <timestamp>` | When the lower third appears | `00:00:02` |
| `--duration <seconds>` | How long it stays on screen | `5` |
| `--position <pos>` | `bottom-left`, `bottom-right`, `bottom-center` | `bottom-left` |
| `--theme <name>` | `wad`, `bloghead`, `ea` (loads from `~/design-assets/color-palettes/`) | `wad` |
| `--bg <color>` | Custom background color (overrides theme) | from theme |
| `--fg <color>` | Custom foreground/text color (overrides theme) | `#FFFFFF` |
| `--accent <color>` | Custom accent bar color (overrides theme) | from theme |
| `--style <style>` | `modern` (rounded pill + accent bar), `minimal` (text with shadow), `broadcast` (traditional news-style box) | `modern` |
| `--output <path>` | Custom output file path | `lt_<filename>` |

**Theme Color Reference:**
| Theme | Background | Primary | Accent |
|-------|------------|---------|--------|
| `wad` | `#09090B` | `#7C3AED` | `#EC4899` |
| `bloghead` | `#0F172A` | `#3B82F6` | `#F59E0B` |
| `ea` | `#0A0A1A` | `#8B5CF6` | `#EC4899` |

**Timestamps:** `HH:MM:SS`, `MM:SS`, or seconds (e.g., `90.5`)

**Examples:**
- `/lower-third interview.mp4 --name "Ali" --title "CEO, EA Solutions" --at 00:00:05 --duration 5`
- `/lower-third video.mp4 --name "Dr. Smith" --title "Lead Researcher" --at 00:01:00 --duration 7 --theme bloghead`
- `/lower-third panel.mp4 --name "Jane Doe" --title "CTO" --style broadcast --position bottom-center`
- `/lower-third talk.mp4 --name "Speaker" --title "Keynote" --bg "#1a1a2e" --accent "#e94560" --output speaker_intro.mp4`

## Steps

1. Parse the required arguments (`video`, `--name`, `--title`) and optional flags. Ask for any required arguments that are missing.

2. Validate tools:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   which ffprobe || echo "ffprobe not found. Install: brew install ffmpeg"
   which node || echo "Node.js not found. Install: brew install node"
   which npx || echo "npx not found. Install with Node.js: brew install node"
   ```
   Check the video file exists. If not, report the error and stop.

3. Load theme colors if `--theme` is specified:
   ```bash
   # Read from ~/design-assets/color-palettes/<theme>-theme.json or <theme>-dark-theme.json
   # Extract primary, background, accent values
   # Override with --bg, --fg, --accent if provided
   ```
   Map theme names to files:
   - `wad` -> `~/design-assets/color-palettes/wad-dark-theme.json`
   - `bloghead` -> `~/design-assets/color-palettes/bloghead-theme.json`
   - `ea` -> `~/design-assets/color-palettes/ea-solutions-theme.json`

4. Get video info for matching resolution and frame rate:
   ```bash
   ffprobe -v quiet -show_entries stream=width,height,r_frame_rate -of csv=p=0 "<video>" | head -1
   ```
   Store width (`VW`), height (`VH`), and frame rate (`FPS`).

5. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise: `lt_<source-basename>.<ext>`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc. before the extension until a free name is found:
     ```bash
     OUTPUT="lt_<basename>.<ext>"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="lt_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

6. Set up or reuse the Remotion workspace:
   ```bash
   WORKSPACE="/tmp/remotion-lower-third-workspace"
   if [ ! -d "$WORKSPACE/node_modules" ]; then
     mkdir -p "$WORKSPACE"
     cd "$WORKSPACE"
     npx create-video@latest --blank . 2>/dev/null || true
     npm install
   fi
   ```
   If the workspace already exists with `node_modules`, skip setup and reuse it.

7. Write the `LowerThird.tsx` Remotion component to `$WORKSPACE/src/LowerThird.tsx`:

   The component should implement:
   - **modern** style: Rounded pill container with a vertical accent-colored bar on the left edge. Semi-transparent dark background (`rgba` based on theme bg). Name in bold 32px, title in lighter 20px weight below. Spring animation sliding in from left on entry, fade-out on exit.
   - **minimal** style: Just the text with a text shadow for readability. No background box. Name in bold white, title in lighter weight. Fade-in on entry, fade-out on exit.
   - **broadcast** style: Full-width bar across the bottom. Solid background with accent-colored top border. Name and title side by side or stacked. Slides up from bottom on entry, slides down on exit.

   Component structure:
   ```tsx
   import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

   export const LowerThird: React.FC<{
     name: string;
     title: string;
     style: 'modern' | 'minimal' | 'broadcast';
     bgColor: string;
     fgColor: string;
     accentColor: string;
     position: 'bottom-left' | 'bottom-right' | 'bottom-center';
   }> = ({ name, title, style, bgColor, fgColor, accentColor, position }) => {
     const frame = useCurrentFrame();
     const { fps, durationInFrames } = useVideoConfig();

     // Entry animation: first 15 frames
     const entryProgress = spring({ frame, fps, config: { damping: 20, stiffness: 100 } });

     // Exit animation: last 15 frames
     const exitStart = durationInFrames - 15;
     const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
       extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
     });

     // Position mapping
     const positionStyles = {
       'bottom-left': { left: 48, bottom: 80 },
       'bottom-right': { right: 48, bottom: 80 },
       'bottom-center': { left: '50%', transform: 'translateX(-50%)', bottom: 80 },
     };

     // Render based on style prop (modern/minimal/broadcast)
     // ... full implementation with animations
   };
   ```

8. Write the Remotion composition registration in `$WORKSPACE/src/Root.tsx` to register a `LowerThird` composition with the video's resolution, frame rate, and duration in frames (`duration_seconds * fps`).

9. Render the lower-third as a transparent-background video:
   ```bash
   cd "$WORKSPACE"
   npx remotion render src/index.ts LowerThird /tmp/lower_third_overlay.webm \
     --codec=vp9 \
     --props='{"name":"<name>","title":"<title>","style":"<style>","bgColor":"<bg>","fgColor":"<fg>","accentColor":"<accent>","position":"<position>"}'
   ```
   Note: VP9/WebM supports alpha channel transparency. Alternatively, render as a PNG sequence:
   ```bash
   npx remotion render src/index.ts LowerThird /tmp/lt_frames/ --image-format=png --sequence
   ```

10. Composite the lower-third overlay onto the video using ffmpeg:

    Convert the `--at` timestamp to seconds for the `enable` expression. Calculate `END_SEC = AT_SEC + DURATION`.

    Determine overlay position:
    - `bottom-left`: `OVERLAY_X=48`, `OVERLAY_Y=H-h-80`
    - `bottom-right`: `OVERLAY_X=W-w-48`, `OVERLAY_Y=H-h-80`
    - `bottom-center`: `OVERLAY_X=(W-w)/2`, `OVERLAY_Y=H-h-80`

    ```bash
    ffmpeg -n -i "<video>" -i /tmp/lower_third_overlay.webm \
      -filter_complex "[1:v]setpts=PTS+<AT_SEC>/TB[lt]; \
                       [0:v][lt]overlay=<OVERLAY_X>:<OVERLAY_Y>:enable='between(t,<AT_SEC>,<END_SEC>)':eof_action=pass[v]" \
      -map "[v]" -map 0:a -c:a copy "<output>"
    ```

    If using PNG sequence instead:
    ```bash
    ffmpeg -n -i "<video>" -framerate <FPS> -i /tmp/lt_frames/%d.png \
      -filter_complex "[1:v]setpts=PTS+<AT_SEC>/TB[lt]; \
                       [0:v][lt]overlay=<OVERLAY_X>:<OVERLAY_Y>:enable='between(t,<AT_SEC>,<END_SEC>)':eof_action=pass[v]" \
      -map "[v]" -map 0:a -c:a copy "<output>"
    ```

    **Hardware acceleration note (macOS Apple Silicon):**
    ```bash
    [[ "$(uname -m)" == "arm64" && "$(uname)" == "Darwin" ]]
    ```
    If yes, add `-c:v h264_videotoolbox -q:v 50` for faster encoding.

11. Check exit code:
    ```bash
    if [ $? -ne 0 ]; then
      echo "ffmpeg compositing failed. Check the error output above."
      echo "Common fixes:"
      echo "  - Ensure the Remotion render succeeded (check /tmp/lower_third_overlay.webm exists)"
      echo "  - Check that --at timestamp is within the video duration"
      echo "  - Verify the video file: ffprobe \"<video>\""
      echo "  - If VP9/WebM alpha is not supported, try PNG sequence approach"
    fi
    ```

12. Clean up temporary files:
    ```bash
    rm -f /tmp/lower_third_overlay.webm
    rm -rf /tmp/lt_frames/
    ```

13. Report output path and file size:
    ```bash
    ls -lh "<output>"
    ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<output>"
    ```

14. Suggest next steps:
    > "Lower third applied! Here are some things you can do next:
    > - Add another lower third for a different speaker: `/lower-third <output> --name "Speaker 2" --title "Panelist" --at 00:02:00`
    > - Add captions: `/add-captions <output> auto`
    > - Compress for sharing: `/compress <output> youtube`
    > - Create an end card: `/end-card --text "Thanks for watching!" --theme wad`"
