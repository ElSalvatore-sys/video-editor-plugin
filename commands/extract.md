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
