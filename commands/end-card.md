---
description: Create an animated end card / call-to-action video using Remotion — usage: /end-card [--text "<text>"] [--subtitle "<text>"] [--url "<url>"] [--social "<handle>"] [--logo <image>] [--theme wad|bloghead|ea] [--duration seconds] [--resolution 1080p|720p|4k|square|vertical] [--animation fade|slide-up|zoom] [--output <path>]
---

# /end-card

Generate a standalone animated end card video with call-to-action text, logo, and social links. Uses Remotion to render a polished motion graphics clip that can be appended to any video.

**Usage:** `/end-card [options]`

**Flags:**
| Flag | Description | Default |
|------|-------------|---------|
| `--text <text>` | Main CTA text | `"Thanks for watching!"` |
| `--subtitle <text>` | Secondary text below main | none |
| `--url <url>` | Website URL to display | none |
| `--social <handle>` | Social media handle to display | none |
| `--logo <image>` | Logo image file to include | none |
| `--theme <name>` | `wad`, `bloghead`, `ea` (loads from `~/design-assets/color-palettes/`) | `wad` |
| `--bg <color>` | Custom background color (overrides theme) | from theme |
| `--fg <color>` | Custom foreground/text color (overrides theme) | `#FFFFFF` |
| `--accent <color>` | Custom accent color (overrides theme) | from theme |
| `--duration <seconds>` | Length of end card in seconds | `5` |
| `--resolution <preset>` | `1080p` (1920x1080), `720p` (1280x720), `4k` (3840x2160), `square` (1080x1080), `vertical` (1080x1920) | `1080p` |
| `--animation <type>` | `fade`, `slide-up`, `zoom` | `fade` |
| `--output <path>` | Custom output file path | `end_card_output.mp4` |

**Theme Color Reference:**
| Theme | Background | Primary | Accent |
|-------|------------|---------|--------|
| `wad` | `#09090B` | `#7C3AED` | `#EC4899` |
| `bloghead` | `#0F172A` | `#3B82F6` | `#F59E0B` |
| `ea` | `#0A0A1A` | `#8B5CF6` | `#EC4899` |

**Resolution Reference:**
| Preset | Width | Height | Aspect | Use for |
|--------|-------|--------|--------|---------|
| `1080p` | 1920 | 1080 | 16:9 | YouTube, general |
| `720p` | 1280 | 720 | 16:9 | Twitter, email |
| `4k` | 3840 | 2160 | 16:9 | High-end production |
| `square` | 1080 | 1080 | 1:1 | Instagram posts |
| `vertical` | 1080 | 1920 | 9:16 | TikTok, Reels, Stories |

**Examples:**
- `/end-card --text "Thanks for watching!" --url "easolutions.com"`
- `/end-card --text "Subscribe" --logo logo.png --theme wad --duration 5`
- `/end-card --text "Follow us" --social "@easolutions" --theme ea`
- `/end-card --text "See you next time!" --subtitle "Like & Subscribe" --animation slide-up --resolution vertical`
- `/end-card --text "Visit us" --url "example.com" --bg "#1a1a2e" --accent "#e94560" --output outro.mp4`

## Steps

1. Parse all optional flags. Apply defaults: text="Thanks for watching!", theme=wad, duration=5, resolution=1080p, animation=fade.

2. Validate tools:
   ```bash
   which node || echo "Node.js not found. Install: brew install node"
   which npx || echo "npx not found. Install with Node.js: brew install node"
   ```
   If `--logo` is provided, check the logo file exists. If not, report the error and stop.

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

4. Map resolution preset to pixel dimensions:
   - `1080p` -> `WIDTH=1920, HEIGHT=1080`
   - `720p` -> `WIDTH=1280, HEIGHT=720`
   - `4k` -> `WIDTH=3840, HEIGHT=2160`
   - `square` -> `WIDTH=1080, HEIGHT=1080`
   - `vertical` -> `WIDTH=1080, HEIGHT=1920`

5. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise: `end_card_output.mp4`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc. before the extension until a free name is found:
     ```bash
     OUTPUT="end_card_output.mp4"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="end_card_output_${COUNTER}.mp4"
       COUNTER=$((COUNTER + 1))
     done
     ```

6. Set up or reuse the Remotion workspace:
   ```bash
   WORKSPACE="/tmp/remotion-end-card-workspace"
   if [ ! -d "$WORKSPACE/node_modules" ]; then
     mkdir -p "$WORKSPACE"
     cd "$WORKSPACE"
     npx create-video@latest --blank . 2>/dev/null || true
     npm install
   fi
   ```
   If the workspace already exists with `node_modules`, skip setup and reuse it.

7. If `--logo` is provided, copy the logo file into the workspace's `public/` directory:
   ```bash
   cp "<logo_path>" "$WORKSPACE/public/logo_asset.png"
   ```

8. Write the `EndCard.tsx` Remotion component to `$WORKSPACE/src/EndCard.tsx`:

   The component should implement:
   - **Background:** Full-frame gradient using theme colors. Radial gradient from primary color (center, dimmed) to background color (edges). Subtle animated grain or shimmer effect for visual interest.
   - **Logo** (if provided): Centered above the text. Spring scale animation from 0 to 1 starting at frame 5.
   - **Main text:** Large bold text (48-64px depending on resolution). Centered horizontally.
   - **Subtitle:** Smaller text (24-32px) below main text, lighter opacity.
   - **URL:** Displayed below subtitle with accent color underline. Slightly smaller font.
   - **Social handle:** Displayed below URL or subtitle. Accent-colored.
   - **Staggered animations:** Each element appears 5-10 frames after the previous one.

   Animation types:
   - **fade:** Each element fades in from opacity 0 to 1 with spring timing.
   - **slide-up:** Each element slides up from 30px below + fades in.
   - **zoom:** Each element scales from 0.8 to 1.0 + fades in.

   Component structure:
   ```tsx
   import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';

   export const EndCard: React.FC<{
     text: string;
     subtitle?: string;
     url?: string;
     social?: string;
     hasLogo: boolean;
     bgColor: string;
     fgColor: string;
     primaryColor: string;
     accentColor: string;
     animation: 'fade' | 'slide-up' | 'zoom';
   }> = (props) => {
     const frame = useCurrentFrame();
     const { fps, durationInFrames } = useVideoConfig();

     // Staggered entry for each element
     const logoEntry = spring({ frame, fps, delay: 5, config: { damping: 15 } });
     const textEntry = spring({ frame, fps, delay: 15, config: { damping: 15 } });
     const subtitleEntry = spring({ frame, fps, delay: 25, config: { damping: 15 } });
     const urlEntry = spring({ frame, fps, delay: 35, config: { damping: 15 } });
     const socialEntry = spring({ frame, fps, delay: 40, config: { damping: 15 } });

     // Global fade-out in last 15 frames
     const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
       extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
     });

     // Apply animation type to get transform + opacity per element
     // ... full implementation
   };
   ```

9. Write the Remotion composition registration in `$WORKSPACE/src/Root.tsx`:
   ```tsx
   import { Composition } from 'remotion';
   import { EndCard } from './EndCard';

   export const RemotionRoot: React.FC = () => {
     return (
       <Composition
         id="EndCard"
         component={EndCard}
         durationInFrames={<duration> * 30}
         fps={30}
         width={<WIDTH>}
         height={<HEIGHT>}
         defaultProps={{
           text: "<text>",
           subtitle: "<subtitle>",
           url: "<url>",
           social: "<social>",
           hasLogo: <true|false>,
           bgColor: "<bg>",
           fgColor: "<fg>",
           primaryColor: "<primary>",
           accentColor: "<accent>",
           animation: "<animation>",
         }}
       />
     );
   };
   ```

10. Render the end card video:
    ```bash
    cd "$WORKSPACE"
    npx remotion render src/index.ts EndCard /tmp/end_card_render.mp4 \
      --codec=h264 \
      --props='{"text":"<text>","subtitle":"<subtitle>","url":"<url>","social":"<social>","hasLogo":<bool>,"bgColor":"<bg>","fgColor":"<fg>","primaryColor":"<primary>","accentColor":"<accent>","animation":"<animation>"}'
    ```

    Check exit code:
    ```bash
    if [ $? -ne 0 ]; then
      echo "Remotion render failed. Check the error output above."
      echo "Common fixes:"
      echo "  - Ensure Node.js >= 18: node --version"
      echo "  - Clear the workspace and retry: rm -rf $WORKSPACE"
      echo "  - Check that the logo file is a valid image format"
    fi
    ```

11. Move the rendered file to the output path:
    ```bash
    mv /tmp/end_card_render.mp4 "<output>"
    ```

12. Report output path and file size:
    ```bash
    ls -lh "<output>"
    ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<output>"
    ```

13. Suggest next steps:
    > "End card created! Here are some things you can do next:
    > - Append to your video: `/merge your_video.mp4 <output> --transition fade`
    > - Create a title card for the intro: `/title-card "My Video" --theme <theme>`
    > - Compress the final result: `/compress merged_output.mp4 youtube`
    > - Build a full pipeline: `/pipeline your_video.mp4 trim:00:00-05:00 compress:web`"
