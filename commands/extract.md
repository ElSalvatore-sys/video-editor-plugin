---
description: Extract audio or subtitle tracks from a video — usage: /extract <file> <audio|subtitles> [--format <fmt>] [--output <path>]
---

# /extract

Pull audio or subtitle tracks from a video file.

**Usage:** `/extract <file> <audio|subtitles> [--format <fmt>] [--output <path>]`

**Flags:**
| Flag | Description |
|------|-------------|
| `--format <fmt>` | Audio output format: `mp3` (default), `wav`, `aac`, `flac` |
| `--output <path>` | Custom output file path |

**Examples:**
- `/extract interview.mp4 audio`
- `/extract movie.mkv subtitles`
- `/extract podcast.mp4 audio --format wav`
- `/extract lecture.mp4 audio --format flac --output lecture_audio.flac`

## Steps

1. Parse `file`, `type` (audio or subtitles), and optional flags (`--format`, `--output`). Ask if required args are missing.

2. Validate ffmpeg and ffprobe, check file exists:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   which ffprobe || echo "ffprobe not found. Install: brew install ffmpeg"
   ```
   If the file does not exist, report the error and stop.

3. Inspect streams:
   ```bash
   ffprobe -v quiet -show_entries stream=index,codec_type,codec_name,channels,sample_rate -of csv=p=0 "<file>"
   ```
   - If the requested stream type is not found, tell the user and stop:
     - No audio: `"No audio stream found in <file>. This file may be video-only."`
     - No subtitles: `"No subtitle stream found in <file>. You can generate subtitles with: /transcribe <file>"`
   - For subtitles with multiple tracks: list them all with their index and language (if available), and ask which one to extract:
     ```bash
     ffprobe -v quiet -show_entries stream=index,codec_type,codec_name -show_entries stream_tags=language -of csv=p=0 "<file>" | grep subtitle
     ```

4. Determine output format and codec:

   **Audio extraction:**
   | Format | Extension | Codec | Flags |
   |--------|-----------|-------|-------|
   | `mp3` | `.mp3` | `libmp3lame` | `-q:a 2` (VBR ~190kbps) |
   | `wav` | `.wav` | `pcm_s16le` | (uncompressed) |
   | `aac` | `.m4a` | `aac` | `-b:a 192k` |
   | `flac` | `.flac` | `flac` | (lossless compressed) |

   Default format is `mp3` if `--format` is not specified.

   **Subtitle extraction:**
   Output is always `.srt` format.

5. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise:
     - Audio: `audio_<source-basename>.<format-ext>`
     - Subtitles: `subtitles_<source-basename>.srt`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc.:
     ```bash
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="<prefix>_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

6. Announce:
   - Audio: `"Extracting audio from <file> -> <output> (<format>)"`
   - Subtitles: `"Extracting subtitle track <index> from <file> -> <output>"`

7. Run:

   **Audio:**
   ```bash
   # MP3
   ffmpeg -n -i "<file>" -vn -c:a libmp3lame -q:a 2 "<output>"

   # WAV
   ffmpeg -n -i "<file>" -vn -c:a pcm_s16le "<output>"

   # AAC
   ffmpeg -n -i "<file>" -vn -c:a aac -b:a 192k "<output>"

   # FLAC
   ffmpeg -n -i "<file>" -vn -c:a flac "<output>"
   ```

   **Subtitles:**
   ```bash
   ffmpeg -n -i "<file>" -map 0:s:<index> "<output>"
   ```

8. Check exit code:
   ```bash
   if [ $? -ne 0 ]; then
     echo "Extraction failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Check that the stream exists: ffprobe \"<file>\""
     echo "  - For audio: try a different format (--format wav)"
     echo "  - For subtitles: some subtitle codecs may not convert to SRT directly"
     echo "    Try extracting as .ass instead, then convert"
   fi
   ```

9. Report output path and size:
   ```bash
   ls -lh "<output>"
   ```
   For audio, also report duration:
   ```bash
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<output>"
   ```

10. Suggest next steps:

    **After audio extraction:**
    > "Audio extracted! Here are some things you can do next:
    > - Transcribe it: `/transcribe <output>`
    > - Use it as background music in a teaser: `/teaser clip1.mp4 --music <output>`
    > - Compress the original video without audio: the audio track is now separate"

    **After subtitle extraction:**
    > "Subtitles extracted! Here are some things you can do next:
    > - Burn them into a different video: `/add-captions other_video.mp4 <output>`
    > - Edit the SRT file to fix timing or text, then re-burn:
    >   `/add-captions <file> <output> --style tiktok`"
