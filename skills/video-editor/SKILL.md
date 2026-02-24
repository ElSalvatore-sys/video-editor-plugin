---
name: video-editor
description: Use when the user wants to edit, create, trim, compress, merge, resize, speed-change, stabilize, add transitions, transcribe, add captions, create title cards, lower thirds, end cards, make teasers, extract thumbnails, create GIFs, add watermarks, manipulate audio, or process video files in any way
---

# Video Editor

## Overview

AI-assisted video workflow powered by three engines:

- **ffmpeg** -- edit existing footage (trim, compress, merge, resize, speed, stabilize, watermark, audio, GIF, thumbnail, transitions, captions)
- **Remotion** -- create new video content (title cards, lower thirds, end cards, teasers, animated overlays)
- **Whisper** -- transcription and caption generation

Additional capabilities:
- **Hardware acceleration** on Apple Silicon via `h264_videotoolbox` / `hevc_videotoolbox`
- **Theme integration** with design assets from `~/design-assets/color-palettes/`
- **Platform presets** for YouTube, Instagram, TikTok, Twitter, and more
- **Workspace caching** for Remotion to avoid repeated `npm install`

---

## When to Use

Trigger on ANY of these user intents:

| Category | Keywords |
|----------|----------|
| Basic editing | trim, cut, clip, shorten, split |
| Compression | compress, reduce size, shrink, smaller, optimize |
| Merging | merge, combine, concatenate, join, stitch |
| Resizing | resize, scale, crop, pad, aspect ratio, portrait, landscape, square |
| Speed | speed up, slow down, slow motion, timelapse, fast forward, reverse |
| Stabilization | stabilize, shaky, smooth, fix shake |
| Transitions | fade, crossfade, dissolve, wipe, transition |
| Captions | caption, subtitle, SRT, transcribe, speech-to-text |
| Title cards | title card, intro, opening, animated text |
| Lower thirds | lower third, name tag, chyron, name bar |
| End cards | end card, outro, end screen, closing |
| Teasers | teaser, trailer, promo, highlight reel, montage |
| Thumbnails | thumbnail, poster, frame extract, screenshot |
| GIFs | GIF, animated image, loop, meme |
| Watermarks | watermark, logo overlay, branding |
| Audio | audio, volume, normalize, loudness, mute, fade in, fade out, mix, extract audio |
| Info | info, details, duration, resolution, codec, bitrate, metadata |
| Pipeline | pipeline, batch, workflow, multi-step |
| Platform | YouTube, Instagram, TikTok, Twitter, Reels, Shorts |

---

## Command Reference

### Editing Commands (ffmpeg)

| Command | Description | Example |
|---------|-------------|---------|
| `/trim` | Cut a segment from a video | "trim video.mp4 from 0:30 to 1:45" |
| `/compress` | Reduce file size with quality control | "compress to under 10MB" |
| `/merge` | Combine multiple clips into one | "merge clip1.mp4 and clip2.mp4 with fade" |
| `/resize` | Change dimensions, aspect ratio, crop, or pad | "resize to 1080x1080 square" |
| `/speed` | Speed up, slow down, or reverse | "2x speed" or "0.5x slow motion" |
| `/stabilize` | Remove camera shake (vidstab two-pass) | "stabilize shaky.mp4" |
| `/watermark` | Overlay image or text on video | "add logo.png bottom-right" |
| `/audio` | Volume, normalize, mix, fade, extract, mute | "normalize audio to -14 LUFS" |
| `/thumbnail` | Extract frame as image | "thumbnail at 0:15" |
| `/gif` | Create animated GIF from video segment | "GIF from 0:05 to 0:10 at 320px" |
| `/extract` | Extract audio or subtitle tracks | "extract audio as mp3" |
| `/info` | Show video metadata and stream details | "info video.mp4" |

### Creation Commands (Remotion)

| Command | Description | Example |
|---------|-------------|---------|
| `/title-card` | Animated title card with theme support | "title card: Coming Soon, wad theme, zoom animation" |
| `/lower-third` | Animated name/title overlay | "lower third: John Doe, CEO, modern style" |
| `/end-card` | Animated outro with CTA and socials | "end card: Subscribe!, @handle, ea theme" |
| `/teaser` | Multi-clip montage with transitions and titles | "teaser from clips/ folder, 30 seconds" |

### Transcription Commands (Whisper)

| Command | Description | Example |
|---------|-------------|---------|
| `/transcribe` | Generate SRT/VTT from speech | "transcribe interview.mp4" |
| `/add-captions` | Transcribe + burn captions onto video | "add captions to talk.mp4" |

### Orchestration

| Command | Description | Example |
|---------|-------------|---------|
| `/pipeline` | Multi-step processing chain | "trim, add title card, compress for Instagram" |

---

## Workflow

### Step 1: Check Available Tools

```bash
which ffmpeg ffprobe && echo "ffmpeg: ok"
node --version && echo "node: ok"
which whisper && echo "whisper: ok" || echo "whisper: not installed (captions need manual .srt)"
ffmpeg -encoders 2>/dev/null | grep videotoolbox && echo "hw accel: ok" || echo "hw accel: not available"
ffmpeg -filters 2>/dev/null | grep vidstab && echo "vidstab: ok" || echo "vidstab: not available (brew install ffmpeg with --with-libvidstab)"
```

If ffmpeg missing: "Install with `brew install ffmpeg`"
If Node.js missing: "Install from https://nodejs.org or `brew install node`"
If vidstab missing: "Reinstall ffmpeg with vidstab: `brew install ffmpeg --with-libvidstab`"

### Step 2: Classify Request

| User Intent | Engine | Path |
|-------------|--------|------|
| Editing existing footage | ffmpeg | Step 3a |
| Creating new video content | Remotion | Step 3b |
| Audio manipulation | ffmpeg audio filters | Step 3a |
| Information/inspection | ffprobe | Step 3a |
| Combined pipeline | orchestrate both | Step 3c |
| Platform publishing | resize + compress presets | Step 3a |
| Transcription | Whisper + ffmpeg | Step 3a |

### Step 3a: ffmpeg Path

1. Ask for input file(s) if not provided
2. Inspect with ffprobe:
   ```bash
   ffprobe -v quiet -print_format json -show_format -show_streams "<file>"
   ```
3. **Hardware acceleration detection** (macOS Apple Silicon):
   ```bash
   # Check for VideoToolbox support
   ffmpeg -encoders 2>/dev/null | grep h264_videotoolbox
   # If available, prefer: -c:v h264_videotoolbox -b:v 5M
   # Fallback: -c:v libx264 -crf 23 -preset medium
   ```
4. **Output collision handling**:
   ```bash
   # Before writing output, check if file exists
   # If "trimmed_video.mp4" exists, use "trimmed_video_2.mp4", "trimmed_video_3.mp4", etc.
   OUTPUT="trimmed_video.mp4"
   COUNTER=2
   while [ -f "$OUTPUT" ]; do
     OUTPUT="trimmed_video_${COUNTER}.mp4"
     COUNTER=$((COUNTER + 1))
   done
   ```
5. Build the ffmpeg command
6. Explain each flag in plain English
7. State output filename (never overwrite source)
8. Ask: "Shall I run this?"
9. Execute, then verify:
   ```bash
   # Check exit code
   if [ $? -eq 0 ]; then
     echo "Success"
     ffprobe -v quiet -print_format json -show_format "$OUTPUT" | grep -E '"duration"|"size"'
   else
     echo "Error — check ffmpeg output above"
   fi
   ```
10. Report output path + file size + duration

Output naming conventions:

| Command | Output Pattern |
|---------|---------------|
| Trim | `trimmed_<filename>` |
| Compress | `compressed_<filename>` |
| Merge | `merged_output.<ext>` |
| Resize | `resized_<filename>` |
| Speed | `speed_<factor>x_<filename>` |
| Stabilize | `stabilized_<filename>` |
| Watermark | `watermarked_<filename>` |
| Captions | `captioned_<filename>` |
| Audio extract | `<name>.mp3` |
| Audio modified | `audio_<filename>` |
| Subtitle extract | `<name>.srt` |
| Thumbnail | `thumb_<name>_<timecode>.jpg` |
| GIF | `<name>.gif` |

### Step 3b: Remotion Path

1. Check Node.js is installed
2. **Workspace caching** -- reuse existing workspace:
   ```bash
   WORKSPACE="/tmp/remotion-workspace"
   if [ -d "$WORKSPACE/node_modules" ]; then
     echo "Reusing cached Remotion workspace"
   else
     echo "Creating Remotion workspace (first run)..."
     mkdir -p "$WORKSPACE"
     cp -r ~/project-templates/remotion-video/* "$WORKSPACE/"
     cd "$WORKSPACE" && npm install
   fi
   ```
3. **Theme loading** from `~/design-assets/color-palettes/`:
   ```bash
   # If user specifies a theme (wad, bloghead, ea), load colors from JSON
   # Pass as inputProps to Remotion composition
   ```
4. Write or update the composition source files as needed
5. Available compositions:
   - `TitleCard` -- animated title with multiple animation presets
   - `LowerThird` -- name/title overlay with accent bar
   - `EndCard` -- outro with CTA, socials, logo
   - `Teaser` -- multi-clip montage with TransitionSeries
6. Render:
   ```bash
   cd "$WORKSPACE"
   npx remotion render src/index.ts <CompositionId> /path/to/output.mp4 \
     --props='{"text":"Title","bg":"#09090B","fg":"#FFFFFF","accent":"#7C3AED"}'
   ```
7. Copy output to user's working directory
8. Report output path + duration

### Step 3c: Combined Pipeline

For multi-step requests (e.g., "make a teaser with title card, clips, and end card"):

1. **Plan** -- describe each step to the user before executing
2. **Create** -- generate any Remotion content first (title cards, end cards)
3. **Process** -- trim/resize source clips with ffmpeg
4. **Assemble** -- merge all pieces with transitions using ffmpeg
5. **Finalize** -- compress for target platform if specified
6. Confirm between major phases (creation vs. editing vs. assembly)

---

## ffmpeg Quick Reference

### Trim (lossless)
```bash
ffmpeg -ss <start> -to <end> -i input.mp4 -c copy trimmed_input.mp4
```

### Compress -- web (CRF 23)
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k compressed_input.mp4
```

### Compress -- hardware accelerated (macOS)
```bash
ffmpeg -i input.mp4 -c:v h264_videotoolbox -b:v 5M -c:a aac -b:a 128k compressed_input.mp4
```

### Merge with fade transition
```bash
# Two clips with 1s crossfade at offset = duration_of_clip1 - 1
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "[0][1]xfade=transition=fade:duration=1:offset=<offset>,format=yuv420p[v];[0:a][1:a]acrossfade=d=1[a]" \
  -map "[v]" -map "[a]" merged_output.mp4
```

### Resize / Scale
```bash
# Scale to specific dimensions (maintain aspect ratio with -1)
ffmpeg -i input.mp4 -vf "scale=1920:1080" resized_input.mp4
ffmpeg -i input.mp4 -vf "scale=1080:-1" resized_input.mp4

# Crop to center square
ffmpeg -i input.mp4 -vf "crop=min(iw\,ih):min(iw\,ih)" cropped_input.mp4

# Pad to target aspect ratio (letterbox/pillarbox)
ffmpeg -i input.mp4 -vf "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black" padded_input.mp4
```

### Speed Change
```bash
# 2x speed (video + audio)
ffmpeg -i input.mp4 -vf "setpts=0.5*PTS" -af "atempo=2.0" speed_2x_input.mp4

# 0.5x slow motion
ffmpeg -i input.mp4 -vf "setpts=2.0*PTS" -af "atempo=0.5" speed_0.5x_input.mp4

# 4x speed (chain atempo for >2x audio: atempo max is 2.0)
ffmpeg -i input.mp4 -vf "setpts=0.25*PTS" -af "atempo=2.0,atempo=2.0" speed_4x_input.mp4

# Reverse
ffmpeg -i input.mp4 -vf "reverse" -af "areverse" reversed_input.mp4
```

### Watermark Overlay
```bash
# Bottom-right with padding
ffmpeg -i input.mp4 -i logo.png \
  -filter_complex "overlay=W-w-20:H-h-20" watermarked_input.mp4

# Top-left
ffmpeg -i input.mp4 -i logo.png \
  -filter_complex "overlay=20:20" watermarked_input.mp4

# Center with opacity
ffmpeg -i input.mp4 -i logo.png \
  -filter_complex "[1]format=rgba,colorchannelmixer=aa=0.3[wm];[0][wm]overlay=(W-w)/2:(H-h)/2" watermarked_input.mp4

# Text watermark
ffmpeg -i input.mp4 \
  -vf "drawtext=text='My Brand':fontsize=24:fontcolor=white@0.5:x=W-tw-20:y=H-th-20" watermarked_input.mp4
```

### Video Stabilization (vidstab two-pass)
```bash
# Pass 1: Analyze motion
ffmpeg -i shaky.mp4 -vf vidstabdetect=shakiness=10:accuracy=15 -f null -

# Pass 2: Apply stabilization
ffmpeg -i shaky.mp4 -vf vidstabtransform=smoothing=30:input=transforms.trf stabilized_shaky.mp4
```

### Audio Manipulation
```bash
# Adjust volume
ffmpeg -i input.mp4 -af "volume=1.5" audio_input.mp4

# Normalize loudness (broadcast standard -14 LUFS)
ffmpeg -i input.mp4 -af "loudnorm=I=-14:TP=-1:LRA=11" audio_input.mp4

# Mix two audio tracks
ffmpeg -i video.mp4 -i music.mp3 \
  -filter_complex "[0:a]volume=1.0[a1];[1:a]volume=0.3[a2];[a1][a2]amix=inputs=2:duration=first[a]" \
  -map 0:v -map "[a]" audio_input.mp4

# Fade in/out audio (3s fade in, 3s fade out)
ffmpeg -i input.mp4 -af "afade=t=in:ss=0:d=3,afade=t=out:st=<end-3>:d=3" audio_input.mp4

# Mute audio
ffmpeg -i input.mp4 -an muted_input.mp4

# Replace audio
ffmpeg -i input.mp4 -i newtrack.mp3 -c:v copy -map 0:v:0 -map 1:a:0 replaced_audio_input.mp4
```

### GIF Creation (two-pass palette for quality)
```bash
# Pass 1: Generate palette
ffmpeg -ss <start> -t <duration> -i input.mp4 \
  -vf "fps=15,scale=320:-1:flags=lanczos,palettegen" palette.png

# Pass 2: Create GIF using palette
ffmpeg -ss <start> -t <duration> -i input.mp4 -i palette.png \
  -filter_complex "[0:v]fps=15,scale=320:-1:flags=lanczos[v];[v][1:v]paletteuse" output.gif

# Cleanup
rm palette.png
```

### Thumbnail Extraction
```bash
# Single frame at timestamp
ffmpeg -ss <timestamp> -i input.mp4 -frames:v 1 -q:v 2 thumb_input_<timestamp>.jpg

# Grid of thumbnails (4x4)
ffmpeg -i input.mp4 -vf "fps=1/<interval>,scale=320:-1,tile=4x4" thumb_grid_input.jpg
```

### Burn .srt captions
```bash
ffmpeg -i input.mp4 -vf "subtitles=captions.srt:force_style='FontSize=24,PrimaryColour=&H00FFFFFF'" captioned_input.mp4
```

### Extract audio
```bash
ffmpeg -i input.mp4 -vn -c:a libmp3lame -q:a 2 output.mp3
```

### Video info
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

---

## Remotion Quick Reference

### Cached Workspace Setup
```bash
WORKSPACE="/tmp/remotion-workspace"
if [ ! -d "$WORKSPACE/node_modules" ]; then
  cp -r ~/project-templates/remotion-video/* "$WORKSPACE/"
  cd "$WORKSPACE" && npm install
fi
```

### TitleCard Composition
```tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, Img } from 'remotion';

type Animation = 'fade' | 'slide-up' | 'slide-down' | 'zoom' | 'typewriter' | 'glitch' | 'blur-in';

export const TitleCard: React.FC<{
  text: string;
  subtitle?: string;
  bg?: string;
  fg?: string;
  accent?: string;
  animation?: Animation;
  logo?: string;
}> = ({ text, subtitle, bg = '#09090B', fg = '#FFFFFF', accent = '#7C3AED', animation = 'fade', logo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
      {logo && <Img src={logo} style={{ width: 120, marginBottom: 24, opacity: progress }} />}
      <h1 style={{ color: fg, fontSize: 80, opacity: progress }}>{text}</h1>
      {subtitle && <p style={{ color: accent, fontSize: 36, opacity: progress }}>{subtitle}</p>}
    </AbsoluteFill>
  );
};
```

### LowerThird Composition
```tsx
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const LowerThird: React.FC<{
  name: string;
  title?: string;
  accent?: string;
  style?: 'modern' | 'minimal' | 'broadcast';
}> = ({ name, title, accent = '#7C3AED', style = 'modern' }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const slideIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const slideOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' });
  const opacity = Math.min(slideIn, slideOut);
  const translateX = interpolate(slideIn, [0, 1], [-300, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', padding: 60 }}>
      <div style={{
        transform: `translateX(${translateX}px)`,
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{ width: 4, height: 60, background: accent, borderRadius: 2 }} />
        <div>
          <div style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{name}</div>
          {title && <div style={{ color: '#ccc', fontSize: 22 }}>{title}</div>}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

### EndCard Composition
```tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, Img } from 'remotion';

export const EndCard: React.FC<{
  text: string;
  subtitle?: string;
  url?: string;
  social?: string;
  logo?: string;
  bg?: string;
  fg?: string;
  accent?: string;
}> = ({ text, subtitle, url, social, logo, bg = '#09090B', fg = '#FFFFFF', accent = '#7C3AED' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (delay: number) => spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${bg}, ${accent}22)`,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 20,
    }}>
      {logo && <Img src={logo} style={{ width: 80, transform: `scale(${s(0)})` }} />}
      <h1 style={{ color: fg, fontSize: 64, opacity: s(5) }}>{text}</h1>
      {subtitle && <p style={{ color: `${fg}CC`, fontSize: 28, opacity: s(10) }}>{subtitle}</p>}
      {url && <p style={{ color: accent, fontSize: 22, opacity: s(15) }}>{url}</p>}
      {social && <p style={{ color: `${fg}99`, fontSize: 20, opacity: s(20) }}>{social}</p>}
    </AbsoluteFill>
  );
};
```

### Teaser with TransitionSeries
```tsx
import { AbsoluteFill, Video, staticFile } from 'remotion';
import { TransitionSeries, linearTiming, fade } from '@remotion/transitions';

export const Teaser: React.FC<{
  title: string;
  clips: string[];
  theme?: { bg: string; fg: string; accent: string };
}> = ({ title, clips, theme }) => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={90}>
        <TitleCard text={title} bg={theme?.bg} fg={theme?.fg} accent={theme?.accent} />
      </TransitionSeries.Sequence>
      {clips.map((clip, i) => (
        <>
          <TransitionSeries.Transition
            presentation={fade()}
            timing={linearTiming({ durationInFrames: 15 })}
          />
          <TransitionSeries.Sequence durationInFrames={120}>
            <Video src={staticFile(clip)} />
          </TransitionSeries.Sequence>
        </>
      ))}
    </TransitionSeries>
  </AbsoluteFill>
);
```

### Theme Prop Pattern
```tsx
// Pass theme colors as inputProps during render:
// npx remotion render src/index.ts TitleCard output.mp4 --props='{"text":"Hello","bg":"#09090B","fg":"#FFFFFF","accent":"#7C3AED"}'

// Or load from theme files:
import { themes } from './utils/themes';
const t = themes['wad']; // { primary: '#7C3AED', bg: '#09090B', accent: '#EC4899' }
```

### Animation Presets
```tsx
// Available in TitleCard:
// 'fade'       - Simple opacity spring
// 'slide-up'   - Slide from below with opacity
// 'slide-down' - Slide from above with opacity
// 'zoom'       - Scale from 0.5 to 1.0
// 'typewriter' - Character-by-character reveal
// 'glitch'     - Random offset flicker
// 'blur-in'    - Blur dissolve to sharp
```

---

## Theme System

Themes are loaded from `~/design-assets/color-palettes/` JSON files and passed as props to Remotion compositions.

### Available Themes

| Theme | ID | Primary | Background | Accent | Source File |
|-------|----|---------|------------|--------|-------------|
| WiesbadenAfterDark | `wad` | `#7C3AED` | `#09090B` | `#EC4899` | `wad-dark-theme.json` |
| Bloghead | `bloghead` | `#3B82F6` | `#0F172A` | `#F59E0B` | `bloghead-theme.json` |
| EA Solutions | `ea` | `#8B5CF6` | `#0A0A1A` | `#EC4899` | `ea-solutions-theme.json` |

### Theme Usage

When user specifies a theme name:
1. Load the corresponding JSON from `~/design-assets/color-palettes/`
2. Extract `colors.brand.primary`, `colors.background.primary` (or `.dark`), `colors.brand.secondary` as accent
3. Pass as `bg`, `fg`, `accent` props to Remotion compositions
4. If no theme specified, default to WAD dark theme

---

## Platform Presets Reference

| Platform | Dimensions | Aspect Ratio | Max Duration | Codec | Bitrate | Notes |
|----------|-----------|--------------|-------------|-------|---------|-------|
| YouTube | 1920x1080 | 16:9 | unlimited | H.264 | 8-12 Mbps | CRF 18-23 |
| YouTube Shorts | 1080x1920 | 9:16 | 60s | H.264 | 5-8 Mbps | Vertical |
| Instagram Feed | 1080x1080 | 1:1 | 60s | H.264 | 3.5 Mbps | Square |
| Instagram Reels | 1080x1920 | 9:16 | 90s | H.264 | 5-8 Mbps | Vertical |
| Instagram Story | 1080x1920 | 9:16 | 15s | H.264 | 5 Mbps | Vertical |
| TikTok | 1080x1920 | 9:16 | 10m | H.264 | 5-8 Mbps | Vertical |
| Twitter/X | 1280x720 | 16:9 | 140s | H.264 | 5 Mbps | Max 512MB |
| LinkedIn | 1920x1080 | 16:9 | 10m | H.264 | 5-8 Mbps | Professional |
| Facebook Feed | 1280x720 | 16:9 | 240m | H.264 | 4-8 Mbps | Wide support |
| Facebook Reels | 1080x1920 | 9:16 | 90s | H.264 | 5-8 Mbps | Vertical |
| Web/General | 1920x1080 | 16:9 | unlimited | H.264 | CRF 23 | Good balance |
| Web/Small | 1280x720 | 16:9 | unlimited | H.264 | CRF 28 | Smaller files |

### Platform Preset Commands
```bash
# YouTube optimized
ffmpeg -i input.mp4 -c:v libx264 -crf 20 -preset slow -c:a aac -b:a 192k -movflags +faststart youtube_input.mp4

# Instagram Square (crop center + compress)
ffmpeg -i input.mp4 -vf "crop=min(iw\,ih):min(iw\,ih),scale=1080:1080" -c:v libx264 -crf 23 -c:a aac -b:a 128k instagram_input.mp4

# Instagram/TikTok Vertical (pad if needed)
ffmpeg -i input.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -crf 23 -c:a aac -b:a 128k vertical_input.mp4

# Twitter optimized (max 512MB, 140s)
ffmpeg -i input.mp4 -vf "scale=1280:720" -c:v libx264 -crf 24 -preset medium -c:a aac -b:a 128k -t 140 twitter_input.mp4

# Web optimized (fast start for streaming)
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -movflags +faststart web_input.mp4
```

---

## Integration Notes

| MCP / Skill | Integration |
|-------------|-------------|
| **Blender MCP** | Generate 3D animated intros, logos, or visual effects to composite into videos |
| **Playwright MCP** | Capture browser screenshots or screen recordings for app demo videos |
| **Gemini MCP** | Analyze long video transcripts for smart editing suggestions (scene detection, highlights) |
| **Social Media skill** | Generate social media posts and descriptions for published videos |
| **Storyboard Manager skill** | Plan video sequences and shot lists before editing |
| **Web Asset Generator skill** | Create thumbnails, social cards, and promotional graphics for videos |

---

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `No such file or directory` | Input file path wrong | Verify path with `ls` |
| `Invalid data found` | Corrupt or unsupported format | Try `ffprobe` to inspect, re-encode with `-c:v libx264` |
| `Encoder not found` | Missing codec (e.g., `h264_videotoolbox`) | Fall back to `libx264` |
| `Filter vidstabdetect not found` | vidstab not compiled in | `brew reinstall ffmpeg` with vidstab support |
| `Output file already exists` | Name collision | Use collision handling (append counter) |
| Remotion render OOM | Video too long or high-res | Reduce resolution or split into segments |
| Whisper model download fails | Network issue | Retry or use `--model tiny` for smaller download |
