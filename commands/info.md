---
description: Inspect a video file and display human-readable metadata — usage: /info <file>
---

# /info

Inspect a video file and display a clean, human-readable summary of all its metadata (video, audio, subtitles, chapters).

**Usage:** `/info <file>`

**Examples:**
- `/info video.mp4`
- `/info recording.mov`
- `/info ~/Downloads/interview.mkv`

## Steps

1. Parse the required argument (`file`). Ask if missing.

2. Validate tools and input:
   ```bash
   which ffprobe || echo "ffprobe not found. Install: brew install ffmpeg"
   ```
   Check the file exists. If not, report the error and stop.

3. Run ffprobe with JSON output to gather all stream and format information:
   ```bash
   ffprobe -v quiet -print_format json -show_format -show_streams -show_chapters "<file>"
   ```

4. Check exit code:
   ```bash
   if [ $? -ne 0 ]; then
     echo "ffprobe failed. The file may be corrupted or not a valid media file."
     echo "Common fixes:"
     echo "  - Verify the file path is correct"
     echo "  - Check that the file is not truncated or partially downloaded"
     echo "  - Try: file \"<file>\" to check MIME type"
   fi
   ```

5. Parse the JSON output and present a clean summary in this format:

   ```
   === File Info ===
   File:       video.mp4
   Size:       142.5 MB
   Duration:   00:12:34.56
   Container:  mov,mp4,m4a,3gp,3g2,mj2

   === Video ===
   Codec:      h264 (High)
   Resolution: 1920x1080
   Frame Rate: 29.97 fps
   Bitrate:    8,234 kbps
   Pixel Fmt:  yuv420p
   Duration:   00:12:34.56

   === Audio ===
   Codec:      aac (LC)
   Channels:   stereo (2 channels)
   Sample Rate:44100 Hz
   Bitrate:    128 kbps

   === Subtitles ===
   Track 1:    srt (English)
   Track 2:    srt (Spanish)

   === Chapters ===
   1. 00:00:00 - Introduction
   2. 00:03:15 - Main Topic
   3. 00:08:40 - Conclusion
   ```

   **Formatting rules:**
   - File size: convert bytes to human-readable (KB, MB, GB) — e.g., `148,234,567 bytes` becomes `141.4 MB`
   - Duration: format as `HH:MM:SS.ms`
   - Channels: map number to label — 1=mono, 2=stereo, 6=5.1 surround, 8=7.1 surround
   - If no audio streams found, display: `Audio: None`
   - If no subtitle tracks found, display: `Subtitles: None`
   - If no chapters found, display: `Chapters: None`
   - If multiple video or audio streams exist, list each one separately

6. Suggest next actions based on the file's characteristics:

   **Large file (>500MB):**
   > "This is a large file. Want to compress it? `/compress <file> web`"

   **High resolution (>1080p):**
   > "This is a high-res video. Want to resize for a specific platform? `/resize <file> --platform youtube`"

   **Long duration (>5min):**
   > "Want to trim a specific section? `/trim <file> <start> <end>`"

   **No audio:**
   > "This video has no audio track. Want to add audio? You can merge it with an audio file."

   **Has subtitles:**
   > "This video has subtitle tracks. Want to extract them? `/extract <file> subtitles`"

   **General suggestions:**
   > "Other options:
   > - Extract a thumbnail: `/thumbnail <file> --best`
   > - Convert to GIF: `/gif <file> 00:00 00:05`
   > - Change speed: `/speed <file> 2x`"
