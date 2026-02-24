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
