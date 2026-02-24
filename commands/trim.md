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
