# Video Editor Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Claude Code plugin combining ffmpeg (editing) and Remotion (creation) with one AI skill and eight slash commands covering trim, compress, merge/transitions, extract, transcribe, captions, title cards, and teaser creation.

**Architecture:** Skills + commands plugin. ffmpeg handles all existing footage operations. Remotion handles programmatic creation (title cards, teasers). Whisper handles transcription for auto-captions. Claude orchestrates via built-in Bash tool.

**Tech Stack:** ffmpeg, ffprobe, Node.js, Remotion, openai-whisper (optional)

---

## Plugin Root

All files at: `/Users/eldiaploo/Developer/claude-plugins/video-editor/`

---

### Task 1: Plugin Manifests

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`

**Step 1: Create `.claude-plugin/plugin.json`**

```json
{
  "name": "video-editor",
  "version": "1.0.0",
  "description": "AI-assisted video editing and creation — ffmpeg for editing, Remotion for title cards and teasers, Whisper for captions",
  "author": {
    "name": "eldiaploo"
  },
  "keywords": ["video", "ffmpeg", "remotion", "editing", "media", "captions", "teaser"]
}
```

**Step 2: Create `.claude-plugin/marketplace.json`**

```json
{
  "name": "video-editor-dev",
  "description": "Development marketplace for video-editor plugin",
  "owner": {
    "name": "eldiaploo"
  },
  "plugins": [
    {
      "name": "video-editor",
      "description": "AI-assisted video editing and creation using ffmpeg and Remotion",
      "version": "1.0.0",
      "source": "./",
      "author": {
        "name": "eldiaploo"
      }
    }
  ]
}
```

**Step 3: Verify structure**

```bash
ls /Users/eldiaploo/Developer/claude-plugins/video-editor/.claude-plugin/
```
Expected: `marketplace.json  plugin.json`

**Step 4: Commit**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git add .claude-plugin/
git commit -m "feat: add plugin manifests"
```

---

### Task 2: Unified Video Editor Skill

**Files:**
- Create: `skills/video-editor/SKILL.md`

**Step 1: Create directory**

```bash
mkdir -p /Users/eldiaploo/Developer/claude-plugins/video-editor/skills/video-editor
```

**Step 2: Create `skills/video-editor/SKILL.md`**

```markdown
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
```

**Step 3: Commit**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git add skills/
git commit -m "feat: add unified video-editor skill"
```

---

### Task 3: /trim Command

**Files:**
- Create: `commands/trim.md`

**Step 1: Create `commands/trim.md`**

```markdown
---
description: Trim a video to a specific time range — usage: /trim <file> <start> <end>
---

# /trim

Trim a video between two timestamps using ffmpeg stream copy (fast, lossless — no re-encode).

**Usage:** `/trim <file> <start> <end>`
**Timestamps:** `HH:MM:SS` or `MM:SS`

**Examples:**
- `/trim video.mp4 00:01:30 00:02:45`
- `/trim recording.mov 0:05 1:20:00`

## Steps

1. Parse the three arguments. Ask for any that are missing.

2. Validate:
   ```bash
   which ffmpeg || echo "Install: brew install ffmpeg"
   ```
   Check the file exists.

3. Announce:
   > "Trimming `<file>` from `<start>` to `<end>` → `trimmed_<filename>`"

4. Run:
   ```bash
   ffmpeg -ss <start> -to <end> -i "<file>" -c copy "trimmed_<filename>"
   ```

5. Report output path and file size. On error show ffmpeg stderr.
```

**Step 2: Commit**

```bash
git add commands/trim.md && git commit -m "feat: add /trim command"
```

---

### Task 4: /compress Command

**Files:**
- Create: `commands/compress.md`

**Step 1: Create `commands/compress.md`**

```markdown
---
description: Compress or re-encode a video with quality presets or a target file size — usage: /compress <file> <preset|size>
---

# /compress

Re-encode a video to reduce file size.

**Usage:** `/compress <file> <preset|size>`

**Presets:**
| Preset | CRF | Audio | Best for |
|--------|-----|-------|----------|
| `web` | 23 | 128k | Streaming, social |
| `mobile` | 28 | 96k | Small file |
| `storage` | 18 | 192k | High quality archive |

**Target size:** e.g. `50MB`, `10MB` — triggers two-pass encoding.

## Steps

1. Parse `file` and `preset` or `size`. Ask if missing.

2. Validate ffmpeg, check file exists.

3. Get duration (needed for two-pass):
   ```bash
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<file>"
   ```

4. Announce: "Compressing `<file>` with `<preset>` preset → `compressed_<filename>`"

5. Run:

   **Preset:**
   ```bash
   ffmpeg -i "<file>" -c:v libx264 -crf <crf> -preset medium -c:a aac -b:a <abitrate> "compressed_<filename>"
   ```
   CRF: web→23, mobile→28, storage→18 | Audio: web→128k, mobile→96k, storage→192k

   **Target size (two-pass):**
   ```bash
   # video_bitrate_kbps = (target_bytes * 8 / duration_secs / 1000) - 128
   ffmpeg -i "<file>" -c:v libx264 -b:v <vbitrate>k -pass 1 -an -f null /dev/null
   ffmpeg -i "<file>" -c:v libx264 -b:v <vbitrate>k -pass 2 -c:a aac -b:a 128k "compressed_<filename>"
   ```

6. Report output path, new size, and compression ratio.
```

**Step 2: Commit**

```bash
git add commands/compress.md && git commit -m "feat: add /compress command"
```

---

### Task 5: /merge Command (with transitions)

**Files:**
- Create: `commands/merge.md`

**Step 1: Create `commands/merge.md`**

```markdown
---
description: Merge video clips with optional transitions — usage: /merge <file1> <file2> [...] [--transition fade|dissolve|wipe|slide]
---

# /merge

Concatenate two or more video clips, optionally with transitions between them.

**Usage:** `/merge <file1> <file2> [file3 ...] [--transition <type>]`

**Transition types:** `fade`, `dissolve`, `wipe`, `slide` (default: cut — no transition)

**Examples:**
- `/merge clip1.mp4 clip2.mp4 clip3.mp4`
- `/merge intro.mp4 main.mp4 outro.mp4 --transition fade`

## Steps

1. Parse file list and optional `--transition` flag. Require at least 2 files.

2. Validate ffmpeg, verify all files exist.

3. Check stream compatibility with ffprobe:
   ```bash
   ffprobe -v quiet -show_entries stream=codec_name,width,height,r_frame_rate -of csv=p=0 "<file>"
   ```
   Warn if different resolutions/codecs — re-encoding will be required.

4. Announce: "Merging N clips → `merged_output.<ext>`" (with transition type if specified)

5. Run:

   **No transition (fast concat):**
   ```bash
   # Write /tmp/video_editor_filelist.txt with absolute paths:
   # file '/abs/path/clip1.mp4'
   # file '/abs/path/clip2.mp4'
   ffmpeg -f concat -safe 0 -i /tmp/video_editor_filelist.txt -c copy "merged_output.mp4"
   ```

   **With transition (xfade filter — requires re-encode):**
   For N clips, chain xfade filters. Example for 3 clips with 1s fade:
   ```bash
   # Get durations first with ffprobe
   # offset1 = duration(clip1) - 1
   # offset2 = offset1 + duration(clip2) - 1
   ffmpeg -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 \
     -filter_complex "[0][1]xfade=transition=fade:duration=1:offset=<offset1>[v01]; \
                      [v01][2]xfade=transition=fade:duration=1:offset=<offset2>[v]" \
     -map "[v]" "merged_output.mp4"
   ```

   xfade transition map: fade→fade, dissolve→dissolve, wipe→wipeleft, slide→slideleft

6. Clean up: `rm /tmp/video_editor_filelist.txt`

7. Report output path and file size.
```

**Step 2: Commit**

```bash
git add commands/merge.md && git commit -m "feat: add /merge command with transitions"
```

---

### Task 6: /extract Command

**Files:**
- Create: `commands/extract.md`

**Step 1: Create `commands/extract.md`**

```markdown
---
description: Extract audio or subtitle tracks from a video — usage: /extract <file> <audio|subtitles>
---

# /extract

Pull audio or subtitle tracks from a video file.

**Usage:** `/extract <file> <audio|subtitles>`

**Examples:**
- `/extract interview.mp4 audio`
- `/extract movie.mkv subtitles`

## Steps

1. Parse `file` and `type`. Ask if missing.

2. Validate ffmpeg, check file exists.

3. Inspect streams:
   ```bash
   ffprobe -v quiet -show_entries stream=index,codec_type,codec_name -of csv=p=0 "<file>"
   ```
   If requested stream type not found, tell the user and stop.
   For subtitles with multiple tracks: list them and ask which one.

4. Announce output filename:
   - Audio → `<name>.mp3`
   - Subtitles → `<name>.srt`

5. Run:

   **Audio:**
   ```bash
   ffmpeg -i "<file>" -vn -c:a libmp3lame -q:a 2 "<name>.mp3"
   ```

   **Subtitles:**
   ```bash
   ffmpeg -i "<file>" -map 0:s:<index> "<name>.srt"
   ```

6. Report output path and size.
```

**Step 2: Commit**

```bash
git add commands/extract.md && git commit -m "feat: add /extract command"
```

---

### Task 7: /transcribe Command

**Files:**
- Create: `commands/transcribe.md`

**Step 1: Create `commands/transcribe.md`**

```markdown
---
description: Transcribe a video or audio file to an SRT subtitle file using Whisper — usage: /transcribe <file> [--language en]
---

# /transcribe

Transcribe speech in a video or audio file to an `.srt` subtitle file using OpenAI Whisper.

**Usage:** `/transcribe <file> [--language <code>]`

**Examples:**
- `/transcribe interview.mp4`
- `/transcribe talk.mp4 --language de`

## Steps

1. Parse `file` and optional `--language` (default: auto-detect).

2. Check Whisper is installed:
   ```bash
   which whisper || python3 -m whisper --help 2>/dev/null
   ```
   If not found:
   > "Whisper is not installed. Install it with: `pip install openai-whisper`
   > Then re-run /transcribe."
   Stop.

3. Check ffmpeg is installed (Whisper uses it internally).

4. Announce: "Transcribing `<file>` → `<name>.srt`"

5. Run:
   ```bash
   whisper "<file>" --model medium --output_format srt --output_dir "$(dirname '<file>')" [--language <code>]
   ```
   The `medium` model balances speed and accuracy. For long files suggest `--model large` for better quality.

6. Report the output .srt file path.

7. Offer next step:
   > "Transcription complete. Want me to burn these captions into the video? Run:
   > `/add-captions <file> <name>.srt`"
```

**Step 2: Commit**

```bash
git add commands/transcribe.md && git commit -m "feat: add /transcribe command"
```

---

### Task 8: /add-captions Command

**Files:**
- Create: `commands/add-captions.md`

**Step 1: Create `commands/add-captions.md`**

```markdown
---
description: Burn captions/subtitles into a video — usage: /add-captions <file> <srt-file|auto>
---

# /add-captions

Burn an SRT subtitle file into a video as hard-coded captions.

**Usage:** `/add-captions <file> <srt-file|auto>`

- Provide an `.srt` file path, or use `auto` to transcribe first with Whisper then burn.

**Examples:**
- `/add-captions video.mp4 captions.srt`
- `/add-captions interview.mp4 auto`

## Steps

1. Parse `file` and `srt` argument. Ask if missing.

2. Validate ffmpeg, check files exist.

3. **If `auto` was specified:**
   - Run Whisper transcription (same as /transcribe):
     ```bash
     whisper "<file>" --model medium --output_format srt --output_dir /tmp
     ```
   - Use the resulting `/tmp/<name>.srt` as the subtitle file.

4. Announce: "Burning captions from `<srt>` into `<file>` → `captioned_<filename>`"

5. Run:
   ```bash
   ffmpeg -i "<file>" -vf "subtitles='<srt-file>'" "captioned_<filename>"
   ```
   Note: on macOS the path in `subtitles=` filter must use forward slashes and may need escaping for spaces.

6. Report output path and file size.
```

**Step 2: Commit**

```bash
git add commands/add-captions.md && git commit -m "feat: add /add-captions command"
```

---

### Task 9: /title-card Command (Remotion)

**Files:**
- Create: `commands/title-card.md`

**Step 1: Create `commands/title-card.md`**

```markdown
---
description: Create an animated title card video using Remotion — usage: /title-card "<text>" [--bg #000000] [--fg #ffffff] [--duration 3]
---

# /title-card

Generate an animated title card as an MP4 using Remotion (React-based rendering).

**Usage:** `/title-card "<text>" [--bg <hex>] [--fg <hex>] [--duration <seconds>]`

**Defaults:** black background, white text, 3 seconds, 1080×1080, 30fps

**Examples:**
- `/title-card "Chapter 1"`
- `/title-card "The Beginning" --bg "#1a1a2e" --fg "#e0aaff" --duration 5`

## Steps

1. Parse the title text and optional flags. Ask for text if not provided.

2. Check Node.js:
   ```bash
   node --version
   ```
   If missing: "Install Node.js from https://nodejs.org or `brew install node`"

3. Create a temp Remotion project:
   ```bash
   TMPDIR=/tmp/remotion-titlecard-$(date +%s)
   mkdir -p $TMPDIR/src
   cd $TMPDIR
   npm init -y --silent
   npm install --silent remotion @remotion/cli react react-dom typescript
   ```

4. Write `src/TitleCard.tsx`:
   ```tsx
   import React from 'react';
   import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

   interface Props { text: string; bg: string; fg: string; }

   export const TitleCard: React.FC<Props> = ({ text, bg, fg }) => {
     const frame = useCurrentFrame();
     const { fps } = useVideoConfig();
     const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
     const translateY = spring({ frame, fps, from: 40, to: 0, config: { damping: 100 } });
     return (
       <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
         <h1 style={{
           color: fg,
           fontSize: 96,
           fontFamily: 'sans-serif',
           fontWeight: 800,
           opacity,
           transform: `translateY(${translateY}px)`,
           textAlign: 'center',
           padding: '0 60px',
         }}>
           {text}
         </h1>
       </AbsoluteFill>
     );
   };
   ```

5. Write `src/Root.tsx`:
   ```tsx
   import React from 'react';
   import { Composition } from 'remotion';
   import { TitleCard } from './TitleCard';

   export const RemotionRoot: React.FC = () => (
     <Composition
       id="TitleCard"
       component={TitleCard}
       durationInFrames={<fps * duration>}
       fps={30}
       width={1920}
       height={1080}
       defaultProps={{ text: '<text>', bg: '<bg>', fg: '<fg>' }}
     />
   );
   ```

6. Write `src/index.ts`:
   ```ts
   import { registerRoot } from 'remotion';
   import { RemotionRoot } from './Root';
   registerRoot(RemotionRoot);
   ```

7. Write `tsconfig.json`:
   ```json
   { "compilerOptions": { "jsx": "react", "esModuleInterop": true, "module": "commonjs" } }
   ```

8. Render:
   ```bash
   npx remotion render src/index.ts TitleCard title_card_output.mp4
   ```

9. Move output to user's current directory:
   ```bash
   mv $TMPDIR/title_card_output.mp4 ./title_card_output.mp4
   ```

10. Offer to merge with another video:
    > "Title card saved to `title_card_output.mp4`. Want to prepend it to another video? Use:
    > `/merge title_card_output.mp4 your_video.mp4 --transition fade`"
```

**Step 2: Commit**

```bash
git add commands/title-card.md && git commit -m "feat: add /title-card command (Remotion)"
```

---

### Task 10: /teaser Command (Remotion + ffmpeg)

**Files:**
- Create: `commands/teaser.md`

**Step 1: Create `commands/teaser.md`**

```markdown
---
description: Create a teaser/trailer from video clips with animated title, transitions, and music — usage: /teaser <clip1> [clip2 ...] [--title "..."] [--music <audio-file>]
---

# /teaser

Create a teaser or trailer by combining video clips with an animated title card and transitions.

**Usage:** `/teaser <clip1> [clip2 ...] [--title "<text>"] [--music <audio-file>]`

**Examples:**
- `/teaser scene1.mp4 scene2.mp4 scene3.mp4 --title "My Film"`
- `/teaser clip1.mp4 clip2.mp4 --title "Coming Soon" --music background.mp3`

## Steps

1. Parse clips, optional `--title`, optional `--music`. Ask for clips if none provided.

2. Validate ffmpeg and Node.js. Check all files exist.

3. **Inspect all clips** with ffprobe:
   ```bash
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<clip>"
   ```
   Note durations.

4. **Create animated title card** (if --title provided):
   Use Remotion to render a 3-second title card (same approach as /title-card).
   Output: `/tmp/teaser_title.mp4`

5. **Write a Remotion teaser composition** (multi-sequence):
   Create a temp Remotion project with a `Teaser` composition:
   ```tsx
   import { Sequence, Video, staticFile } from 'remotion';

   // Each clip appears in sequence with a 0.5s fade overlap
   export const Teaser: React.FC = () => (
     <AbsoluteFill>
       {title && (
         <Sequence from={0} durationInFrames={90}>
           <TitleCard text={title} bg="#000" fg="#fff" />
         </Sequence>
       )}
       {clips.map((clip, i) => (
         <Sequence key={i} from={90 + i * clipDuration} durationInFrames={clipDuration}>
           <Video src={staticFile(clip)} />
         </Sequence>
       ))}
     </AbsoluteFill>
   );
   ```
   Render: `npx remotion render src/index.ts Teaser teaser_output.mp4`

6. **Add music** (if --music provided):
   ```bash
   ffmpeg -i teaser_output.mp4 -i "<music>" \
     -filter_complex "[1:a]volume=0.4,afade=t=out:st=<end-2>:d=2[a]" \
     -map 0:v -map "[a]" -shortest teaser_with_music.mp4
   ```
   Music volume at 40%, fades out 2s before end.

7. Move final output to user's directory.

8. Report: output path, duration, file size. Show a brief summary of what was assembled.
```

**Step 2: Commit**

```bash
git add commands/teaser.md && git commit -m "feat: add /teaser command (Remotion + ffmpeg)"
```

---

### Task 11: README

**Files:**
- Create: `README.md`

**Step 1: Create `README.md`**

````markdown
# video-editor

A Claude Code plugin for AI-assisted video editing and creation.

**Two engines:**
- 🎬 **ffmpeg** — edit and process existing video footage
- ⚛️ **Remotion** — create programmatic video content (title cards, teasers, animations)

## Requirements

| Tool | Install |
|------|---------|
| ffmpeg | `brew install ffmpeg` |
| Node.js | `brew install node` or https://nodejs.org |
| Whisper (optional, for captions) | `pip install openai-whisper` |

## Installation

```bash
# 1. Add the dev marketplace
/plugin marketplace add /Users/eldiaploo/Developer/claude-plugins/video-editor

# 2. Install the plugin
/plugin install video-editor@video-editor-dev

# 3. Restart Claude Code
```

## Natural Language Usage

Just describe what you want:

> "Make `conference.mp4` smaller for email"
> "Cut `interview.mov` from 2:30 to 15:00"
> "Add captions to `talk.mp4` automatically"
> "Create a title card that says 'Chapter 1'"
> "Make a teaser from these three clips with the title 'My Film'"

## Slash Commands

| Command | Usage |
|---------|-------|
| `/trim` | `/trim video.mp4 00:01:30 00:02:45` |
| `/compress` | `/compress video.mp4 web` or `/compress video.mp4 50MB` |
| `/merge` | `/merge clip1.mp4 clip2.mp4 --transition fade` |
| `/extract` | `/extract video.mp4 audio` |
| `/transcribe` | `/transcribe talk.mp4 --language en` |
| `/add-captions` | `/add-captions video.mp4 auto` |
| `/title-card` | `/title-card "Chapter 1" --bg "#1a1a2e"` |
| `/teaser` | `/teaser clip1.mp4 clip2.mp4 --title "My Film"` |

**Compress presets:** `web` (CRF 23) · `mobile` (CRF 28) · `storage` (CRF 18)
**Transitions:** `fade` · `dissolve` · `wipe` · `slide`

## Safety

Output files always use new filenames — source files are never overwritten unless explicitly asked. Claude confirms the operation and output filename before executing.
````

**Step 2: Commit**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git add README.md
git commit -m "docs: add README"
```

---

### Task 12: Install and Verify

**Step 1: Add the dev marketplace in Claude Code**

```
/plugin marketplace add /Users/eldiaploo/Developer/claude-plugins/video-editor
```

**Step 2: Install the plugin**

```
/plugin install video-editor@video-editor-dev
```

**Step 3: Restart Claude Code**

Quit and reopen. Plugin activates on restart.

**Step 4: Test skill trigger**

In a new session:
> "I want to trim my video to keep only the first 30 seconds"

Expected: Claude asks for file, shows ffmpeg command, asks for confirmation.

**Step 5: Test slash command**

```
/trim /tmp/test.mp4 00:00:00 00:00:30
```
Expected: Announces trim, runs ffmpeg, reports output.

**Step 6: Test Remotion command**

```
/title-card "Hello World"
```
Expected: Claude scaffolds Remotion project, renders, reports `title_card_output.mp4`.

**Step 7: Tag release**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git tag v1.0.0
```
