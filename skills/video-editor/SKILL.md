---
name: video-editor
description: Use when the user wants to edit, create, trim, compress, merge, add transitions, transcribe, add captions, create title cards, make teasers, or process video files
---

# Video Editor

## Overview

AI-assisted video workflow using two engines:
- **ffmpeg** — edit existing footage (trim, compress, merge, transitions, captions, extract)
- **Remotion** — create new video content (title cards, teasers, animated overlays)

## When to Use

- Any natural language video request: "make this smaller", "cut this clip", "add captions", "make a teaser"
- User wants to edit, process, or create video without knowing ffmpeg/Remotion syntax
- Transcription, caption burning, title card creation, trailer assembly

## Workflow

### Step 1: Check Available Tools

```bash
which ffmpeg ffprobe && echo "ffmpeg: ok"
node --version && echo "node: ok"
which whisper && echo "whisper: ok" || echo "whisper: not installed (captions need manual .srt)"
```

If ffmpeg missing: "Install with `brew install ffmpeg`"
If Node.js missing: "Install from https://nodejs.org or `brew install node`"

### Step 2: Understand the Goal

Classify the request:

**Editing existing footage** → use ffmpeg path
- Trim, compress, merge, add transitions, extract audio/subtitles, burn captions, batch process

**Creating new video content** → use Remotion path
- Title cards, animated intros/outros, teaser/trailer assembly with graphics

**Combined pipeline** → orchestrate both
- e.g., "make a teaser" = select clips (ffmpeg) + title card (Remotion) + merge with transitions (ffmpeg)

### Step 3a: ffmpeg Path

1. Ask for input file(s) if not provided
2. Inspect with ffprobe:
   ```bash
   ffprobe -v quiet -print_format json -show_format -show_streams "<file>"
   ```
3. Build the ffmpeg command
4. Explain each flag in plain English
5. State output filename (never overwrite source)
6. Ask: "Shall I run this?"
7. Execute, then report output path + file size

Output naming conventions:
- Trim → `trimmed_<filename>`
- Compress → `compressed_<filename>`
- Merge → `merged_output.<ext>`
- Captions → `captioned_<filename>`
- Extract audio → `<name>.mp3`
- Extract subtitles → `<name>.srt`

### Step 3b: Remotion Path

1. Check Node.js is installed
2. Create a temp Remotion project:
   ```bash
   mkdir -p /tmp/remotion-render-<timestamp>
   cd /tmp/remotion-render-<timestamp>
   npm init -y
   npm install remotion @remotion/cli
   ```
3. Write the composition (React + TypeScript):
   - Create `src/Root.tsx` with the `<Composition>` component
   - Create `src/index.ts` as the entry point
   - Create `remotion.config.ts`
4. Render:
   ```bash
   npx remotion render src/index.ts <CompositionId> output.mp4
   ```
5. Report output path

### Step 3c: Combined Pipeline

Describe each step to the user before executing. Execute step-by-step, confirming between major phases (creation vs. editing).

---

## ffmpeg Quick Reference

**Trim (lossless):**
```
ffmpeg -ss <start> -to <end> -i input.mp4 -c copy trimmed_input.mp4
```

**Compress — web (CRF 23):**
```
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k compressed_input.mp4
```

**Merge with fade transition:**
```bash
# Two clips with 1s crossfade at offset = duration_of_clip1 - 1
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "xfade=transition=fade:duration=1:offset=<offset>,format=yuv420p" \
  merged_output.mp4
```

**Burn .srt captions:**
```
ffmpeg -i input.mp4 -vf "subtitles=captions.srt" captioned_input.mp4
```

**Extract audio:**
```
ffmpeg -i input.mp4 -vn -c:a libmp3lame -q:a 2 output.mp3
```

---

## Remotion Quick Reference

**Title card composition:**
```tsx
// src/TitleCard.tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const TitleCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ color: '#fff', fontSize: 80, opacity }}>{text}</h1>
    </AbsoluteFill>
  );
};
```

**Teaser with multiple sequences:**
```tsx
import { Sequence, Video } from 'remotion';

export const Teaser: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={90}>
      <TitleCard text="Coming Soon" />
    </Sequence>
    <Sequence from={90} durationInFrames={150}>
      <Video src={staticFile('clip1.mp4')} />
    </Sequence>
  </AbsoluteFill>
);
```
