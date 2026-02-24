# Video Editor Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Claude Code plugin with one natural-language skill and four slash commands that wrap ffmpeg for AI-assisted video editing.

**Architecture:** Pure skills+commands plugin (no MCP server, no hooks). Claude uses the built-in Bash tool to run `ffmpeg`/`ffprobe`. Each operation saves to a new file by default and confirms before executing.

**Tech Stack:** Claude Code plugin system (markdown manifests), ffmpeg, ffprobe

---

## Plugin Root

All files created at: `/Users/eldiaploo/Developer/claude-plugins/video-editor/`

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
  "description": "AI-assisted video editing using ffmpeg — natural language workflow plus slash commands for trim, compress, merge, and extract",
  "author": {
    "name": "eldiaploo"
  },
  "keywords": ["video", "ffmpeg", "editing", "media", "trim", "compress", "merge"]
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
      "description": "AI-assisted video editing using ffmpeg",
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

Run:
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

### Task 2: Video Editor Skill

**Files:**
- Create: `skills/video-editor/SKILL.md`

**Step 1: Create skill directory and file**

```bash
mkdir -p /Users/eldiaploo/Developer/claude-plugins/video-editor/skills/video-editor
```

Create `skills/video-editor/SKILL.md`:

```markdown
---
name: video-editor
description: Use when the user wants to edit, transform, compress, trim, merge, or extract from video files — guides through natural language to ffmpeg execution
---

# Video Editor

## Overview

Guides Claude through AI-assisted video editing via ffmpeg. Understands natural language requests, inspects files with ffprobe, builds the optimal ffmpeg command, explains it in plain English, confirms, then executes.

## When to Use

- User describes a video task in natural language ("make this smaller for Instagram", "cut out the first 30 seconds")
- User wants to edit a video without knowing ffmpeg syntax
- User says: "edit this video", "compress this", "cut this clip", "merge these", "extract the audio"

## Workflow

### 1. Check ffmpeg

```bash
which ffmpeg ffprobe
```

If not found, stop and tell the user:
> "ffmpeg is not installed. Install it with: `brew install ffmpeg`"

### 2. Get Input File

If the user hasn't mentioned a file path, ask:
> "What video file would you like to edit? (please provide the full path)"

### 3. Inspect the File

```bash
ffprobe -v quiet -print_format json -show_format -show_streams "<file>"
```

Extract and note: codec, resolution, duration, fps, audio streams, file size.

### 4. Reason About the Approach

Consider the user's goal and the file's current properties. Choose the most appropriate ffmpeg strategy. Plan the output filename — **never overwrite the source file**.

Default output naming:
- Trim → `trimmed_<original_filename>`
- Compress → `compressed_<original_filename>`
- Merge → `merged_output.<ext>`
- Extract audio → `<name_without_ext>.mp3`
- Extract subtitles → `<name_without_ext>.srt`

### 5. Present the Command

State what you'll run, show the full ffmpeg command, and explain each flag in plain English. Example:

> "Here's what I'll run:
> `ffmpeg -ss 00:01:30 -to 00:02:45 -i input.mp4 -c copy trimmed_input.mp4`
>
> `-ss 00:01:30` — start at 1 minute 30 seconds
> `-to 00:02:45` — end at 2 minutes 45 seconds
> `-c copy` — copy streams without re-encoding (fast, lossless)
> Output: `trimmed_input.mp4`"

### 6. Confirm

Ask: "Shall I run this?" — wait for the user's go-ahead.

### 7. Execute

Run the ffmpeg command via Bash.

### 8. Report Result

State the output file path and new file size. If there's an error, show the ffmpeg stderr so the user can understand what went wrong.

---

## ffmpeg Reference Patterns

**Trim (fast, no re-encode):**
```
ffmpeg -ss <start> -to <end> -i input.mp4 -c copy trimmed_input.mp4
```

**Compress — web preset (H.264 CRF 23, AAC 128k):**
```
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k compressed_input.mp4
```

**Compress — mobile preset (CRF 28, AAC 96k):**
```
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 96k compressed_input.mp4
```

**Compress — to target size (two-pass):**
```bash
# 1. Calculate video bitrate: (target_bytes * 8 / duration_secs) - audio_bitrate_bps
# 2. Pass 1:
ffmpeg -i input.mp4 -c:v libx264 -b:v <vbitrate>k -pass 1 -an -f null /dev/null
# 3. Pass 2:
ffmpeg -i input.mp4 -c:v libx264 -b:v <vbitrate>k -pass 2 -c:a aac -b:a 128k compressed_input.mp4
```

**Merge (concat demuxer — no re-encode if streams match):**
```bash
# filelist.txt contains: file '/abs/path/clip.mp4' (one per line)
ffmpeg -f concat -safe 0 -i /tmp/filelist.txt -c copy merged_output.mp4
```

**Extract audio:**
```
ffmpeg -i input.mp4 -vn -c:a libmp3lame -q:a 2 output.mp3
```

**Extract subtitles:**
```
ffmpeg -i input.mkv -map 0:s:0 output.srt
```
```

**Step 2: Verify**

```bash
cat /Users/eldiaploo/Developer/claude-plugins/video-editor/skills/video-editor/SKILL.md | head -5
```
Expected: YAML front matter with `name: video-editor`

**Step 3: Commit**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git add skills/
git commit -m "feat: add video-editor skill"
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

Trim a video between two timestamps using ffmpeg stream copy (fast, lossless).

**Usage:** `/trim <file> <start> <end>`

**Examples:**
- `/trim video.mp4 00:01:30 00:02:45`
- `/trim recording.mov 0:05 1:20:00`

## Steps

1. **Parse** the three arguments from the command: `file`, `start`, `end`.
   If any argument is missing, ask the user for it before continuing.

2. **Validate:**
   - Run `which ffmpeg` — if not found, tell user to install: `brew install ffmpeg`
   - Check the file exists

3. **Announce** before running:
   > "Trimming `<file>` from `<start>` to `<end>`
   > Output: `trimmed_<filename>`"

4. **Run:**
   ```bash
   ffmpeg -ss <start> -to <end> -i "<file>" -c copy "trimmed_<filename>"
   ```
   The `-c copy` flag copies streams without re-encoding — fast and lossless.

5. **Report** the output path and new file size. On error, show the ffmpeg stderr output.
```

**Step 2: Commit**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git add commands/trim.md
git commit -m "feat: add /trim command"
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

Re-encode a video to reduce file size using ffmpeg.

**Usage:** `/compress <file> <preset|size>`

**Presets:**
| Preset | CRF | Audio | Use for |
|--------|-----|-------|---------|
| `web` | 23 | AAC 128k | Streaming, social sharing |
| `mobile` | 28 | AAC 96k | Small file, lower quality |
| `storage` | 18 | AAC 192k | High quality archival |

**Target size:** e.g. `50MB`, `10MB`, `100MB` — triggers two-pass encoding.

## Steps

1. **Parse** `file` and `preset` or `size`. Ask if missing.

2. **Validate:** check ffmpeg, check file exists.

3. **Inspect** duration (needed for two-pass size targeting):
   ```bash
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<file>"
   ```

4. **Announce:** "Compressing `<file>` with `<preset>` preset → `compressed_<filename>`"

5. **Run:**

   For presets (`web` / `mobile` / `storage`):
   ```bash
   ffmpeg -i "<file>" -c:v libx264 -crf <crf> -preset medium -c:a aac -b:a <audio_bitrate> "compressed_<filename>"
   ```
   CRF map: web→23, mobile→28, storage→18
   Audio bitrate map: web→128k, mobile→96k, storage→192k

   For target size (two-pass):
   ```bash
   # Calculate video bitrate:
   # video_bitrate_kbps = (target_bytes * 8 / duration_secs / 1000) - 128
   ffmpeg -i "<file>" -c:v libx264 -b:v <vbitrate>k -pass 1 -an -f null /dev/null
   ffmpeg -i "<file>" -c:v libx264 -b:v <vbitrate>k -pass 2 -c:a aac -b:a 128k "compressed_<filename>"
   ```

6. **Report** output path, new file size, and compression ratio (e.g. "Reduced from 450MB → 48MB, 89% smaller").
```

**Step 2: Commit**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git add commands/compress.md
git commit -m "feat: add /compress command"
```

---

### Task 5: /merge Command

**Files:**
- Create: `commands/merge.md`

**Step 1: Create `commands/merge.md`**

```markdown
---
description: Merge (concatenate) multiple video clips into one file — usage: /merge <file1> <file2> [file3 ...]
---

# /merge

Concatenate two or more video clips into a single file using ffmpeg's concat demuxer.

**Usage:** `/merge <file1> <file2> [file3 ...]`

**Example:** `/merge intro.mp4 main.mp4 outro.mp4`

## Steps

1. **Parse** the list of input files (minimum 2). Ask if fewer than 2 provided.

2. **Validate:** check ffmpeg, check all files exist.

3. **Check stream compatibility** with ffprobe — warn if files have different codecs or resolutions:
   ```bash
   ffprobe -v quiet -show_entries stream=codec_name,width,height -of csv=p=0 "<file>"
   ```
   If incompatible: inform user that re-encoding will be used (slower, slight quality loss).

4. **Write a temp filelist** to `/tmp/video_editor_filelist.txt`:
   ```
   file '/absolute/path/to/clip1.mp4'
   file '/absolute/path/to/clip2.mp4'
   ```
   Use absolute paths.

5. **Announce:** "Merging N clips → `merged_output.<ext>`"

6. **Run:**

   If streams are compatible (same codec, resolution, fps):
   ```bash
   ffmpeg -f concat -safe 0 -i /tmp/video_editor_filelist.txt -c copy "merged_output.<ext>"
   ```

   If streams are incompatible:
   ```bash
   ffmpeg -f concat -safe 0 -i /tmp/video_editor_filelist.txt "merged_output.<ext>"
   ```

7. **Clean up** the temp file:
   ```bash
   rm /tmp/video_editor_filelist.txt
   ```

8. **Report** output path and final file size.
```

**Step 2: Commit**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git add commands/merge.md
git commit -m "feat: add /merge command"
```

---

### Task 6: /extract Command

**Files:**
- Create: `commands/extract.md`

**Step 1: Create `commands/extract.md`**

```markdown
---
description: Extract audio or subtitle tracks from a video file — usage: /extract <file> <audio|subtitles>
---

# /extract

Pull audio or subtitle tracks out of a video file using ffmpeg.

**Usage:** `/extract <file> <audio|subtitles>`

**Examples:**
- `/extract interview.mp4 audio`
- `/extract movie.mkv subtitles`

## Steps

1. **Parse** `file` and `type` (`audio` or `subtitles`). Ask if missing.

2. **Validate:** check ffmpeg, check file exists.

3. **Inspect streams** to confirm the requested track exists:
   ```bash
   ffprobe -v quiet -show_entries stream=index,codec_type,codec_name -of csv=p=0 "<file>"
   ```
   If the requested stream type is not found, tell the user and stop.

4. **For subtitles:** if multiple subtitle tracks exist, list them with their index and ask which one to extract.

5. **Announce** the operation and output filename:
   - Audio → `<name_without_extension>.mp3`
   - Subtitles → `<name_without_extension>.srt`

6. **Run:**

   For audio:
   ```bash
   ffmpeg -i "<file>" -vn -c:a libmp3lame -q:a 2 "<name_without_ext>.mp3"
   ```
   `-vn` removes video, `-q:a 2` is VBR quality ~190kbps.

   For subtitles:
   ```bash
   ffmpeg -i "<file>" -map 0:s:<track_index> "<name_without_ext>.srt"
   ```

7. **Report** output path and file size.
```

**Step 2: Commit**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git add commands/extract.md
git commit -m "feat: add /extract command"
```

---

### Task 7: README

**Files:**
- Create: `README.md`

**Step 1: Create `README.md`**

```markdown
# video-editor

A Claude Code plugin for AI-assisted video editing using `ffmpeg`.

Describe what you want to do in plain English — Claude inspects your file, builds the right ffmpeg command, explains it, and runs it. Or use slash commands for quick one-liners.

## Requirements

- [ffmpeg](https://ffmpeg.org/) must be installed:
  ```bash
  brew install ffmpeg   # macOS
  ```

## Installation

```bash
# 1. Add development marketplace
/plugin marketplace add /Users/eldiaploo/Developer/claude-plugins/video-editor

# 2. Install the plugin
/plugin install video-editor@video-editor-dev

# 3. Restart Claude Code
```

## Usage

### Natural Language (Skill)

Just describe what you want:

- "Make `conference.mp4` smaller for email"
- "Cut `interview.mov` from 2:30 to 15:00"
- "Merge `intro.mp4`, `main.mp4`, and `outro.mp4`"
- "Extract the audio from `podcast_recording.mp4`"

### Slash Commands

| Command | Example |
|---------|---------|
| `/trim <file> <start> <end>` | `/trim video.mp4 00:01:30 00:02:45` |
| `/compress <file> <preset\|size>` | `/compress video.mp4 web` or `/compress video.mp4 50MB` |
| `/merge <file1> <file2> [...]` | `/merge clip1.mp4 clip2.mp4 clip3.mp4` |
| `/extract <file> <audio\|subtitles>` | `/extract movie.mkv audio` |

**Compress presets:** `web` (CRF 23), `mobile` (CRF 28), `storage` (CRF 18)

## Safety

Output files are always saved with a new name — the source file is never overwritten unless you explicitly ask. Claude confirms the operation and output filename before running anything.
```

**Step 2: Commit**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git add README.md
git commit -m "docs: add README"
```

---

### Task 8: Install and Verify

**Step 1: Add the dev marketplace in Claude Code**

Run in Claude Code chat:
```
/plugin marketplace add /Users/eldiaploo/Developer/claude-plugins/video-editor
```
Expected: confirmation that marketplace was added

**Step 2: Install the plugin**

```
/plugin install video-editor@video-editor-dev
```
Expected: success message

**Step 3: Restart Claude Code**

Quit and reopen Claude Code. The plugin is only active after restart.

**Step 4: Test the skill**

Open a new session and say:
> "I want to trim my video `/tmp/test.mp4` to keep only the first 30 seconds"

Expected: Claude asks to inspect file, shows a trim command, asks for confirmation.

**Step 5: Test a slash command**

```
/trim /tmp/test.mp4 00:00:00 00:00:30
```
Expected: Claude announces the trim, runs ffmpeg, reports output.

**Step 6: Tag the release**

```bash
cd /Users/eldiaploo/Developer/claude-plugins/video-editor
git tag v1.0.0
```
