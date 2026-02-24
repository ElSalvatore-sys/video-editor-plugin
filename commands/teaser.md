---
description: Create a teaser/trailer from video clips with animated title, transitions, and optional music — usage: /teaser <clip1> [clip2 ...] [--title "..."] [--music <audio-file>]
---

# /teaser

Create a teaser or trailer by combining video clips with an animated Remotion title card, transitions, and optional background music.

**Usage:** `/teaser <clip1> [clip2 ...] [--title "<text>"] [--music <audio-file>]`

**Examples:**
- `/teaser scene1.mp4 scene2.mp4 scene3.mp4 --title "My Film"`
- `/teaser clip1.mp4 clip2.mp4 --title "Coming Soon" --music background.mp3`

## Steps

1. Parse clips list, optional `--title`, optional `--music`. Ask for at least one clip if none provided.

2. Validate: check ffmpeg (`which ffmpeg`), check Node.js (`node --version`). Verify all files exist.

3. **Inspect all clips** with ffprobe to get durations:
   ```bash
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<clip>"
   ```

4. **Create title card** (if `--title` was specified):
   Use Remotion to render a 3-second title card (same approach as /title-card command).
   Save to: `/tmp/teaser_title_<timestamp>.mp4`

5. **Build the teaser with Remotion** (multi-sequence composition):

   Create a temp Remotion project at `/tmp/remotion-teaser-<timestamp>/`.
   Copy all clip files into `$RENDER_DIR/public/` so Remotion can serve them:
   ```bash
   mkdir -p $RENDER_DIR/public
   for clip in <clips>; do cp "$clip" "$RENDER_DIR/public/"; done
   ```
   Use only the **basename** of each clip in the Remotion composition (Remotion's `staticFile()` resolves relative to `public/`).
   Write `src/Teaser.tsx` combining title + clips in sequence:

   ```tsx
   import React from 'react';
   import { AbsoluteFill, Sequence, Video, staticFile, spring, useCurrentFrame, useVideoConfig } from 'remotion';

   const TitleCard: React.FC<{ text: string }> = ({ text }) => {
     const frame = useCurrentFrame();
     const { fps } = useVideoConfig();
     const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
     return (
       <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center' }}>
         <h1 style={{ color: '#fff', fontSize: 96, fontFamily: 'sans-serif', opacity }}>{text}</h1>
       </AbsoluteFill>
     );
   };

   export const Teaser: React.FC<{ title?: string; clips: string[]; fps: number; clipDuration: number }> = ({
     title, clips, fps, clipDuration,
   }) => {
     const titleDuration = title ? fps * 3 : 0; // 3s title card
     return (
       <AbsoluteFill style={{ background: '#000' }}>
         {title && (
           <Sequence from={0} durationInFrames={titleDuration}>
             <TitleCard text={title} />
           </Sequence>
         )}
         {clips.map((clip, i) => (
           <Sequence key={i} from={titleDuration + i * clipDuration} durationInFrames={clipDuration}>
             <Video src={staticFile(basename(clip))} /> {/* basename only — files copied to public/ */}
           </Sequence>
         ))}
       </AbsoluteFill>
     );
   };
   ```

   Register and render:
   ```bash
   npx remotion render src/index.ts Teaser /tmp/teaser_raw.mp4
   ```

6. **Add music** (if `--music` was specified):
   Get teaser duration with ffprobe, then:
   ```bash
   ffmpeg -i /tmp/teaser_raw.mp4 -i "<music>" \
     -filter_complex "[1:a]volume=0.4,afade=t=out:st=<duration-2>:d=2[a]" \
     -map 0:v -map "[a]" -shortest teaser_output.mp4
   ```
   Music volume at 40%, fades out 2 seconds before end.

   If no music: rename `/tmp/teaser_raw.mp4` to `teaser_output.mp4` in the user's directory.

7. Move final output to user's current directory.

8. Report: output path, total duration, file size, and a brief assembly summary (e.g., "Title card (3s) + 3 clips (5s each) = 18s teaser").
