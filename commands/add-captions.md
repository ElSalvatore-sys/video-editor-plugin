---
description: Burn captions/subtitles into a video — usage: /add-captions <file> <srt-file|auto> [--style <preset>] [--output <path>]
---

# /add-captions

Burn an SRT subtitle file into a video as hard-coded captions, with customizable styling.

**Usage:** `/add-captions <file> <srt-file|auto> [--style <preset>] [--output <path>]`

- Provide an `.srt` file path, or use `auto` to transcribe first with Whisper then burn.

**Flags:**
| Flag | Description |
|------|-------------|
| `--style <preset>` | Caption appearance preset (see table below) |
| `--output <path>` | Custom output file path |

**Style Presets:**
| Preset | Font Size | Color | Position | Background |
|--------|-----------|-------|----------|------------|
| `default` | 24 | White | Bottom | Semi-transparent black |
| `large` | 36 | White | Bottom | Semi-transparent black |
| `top` | 24 | White | Top | Semi-transparent black |
| `center` | 28 | White | Center | Semi-transparent black |
| `bold` | 28 | Yellow (#FFD700) | Bottom | Black box |
| `minimal` | 20 | White | Bottom | None (shadow only) |
| `tiktok` | 32 | White | Center | Black rounded box, bold |

**Examples:**
- `/add-captions video.mp4 captions.srt`
- `/add-captions interview.mp4 auto`
- `/add-captions vlog.mp4 auto --style tiktok`
- `/add-captions lecture.mp4 subs.srt --style large --output captioned_lecture.mp4`

## Steps

1. Parse `file`, `srt` argument, and optional flags (`--style`, `--output`). Ask if required args are missing.

2. Validate ffmpeg and check the video file exists:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   ```
   If the file does not exist, report error and stop.

3. **If `auto` was specified:**
   - Check Whisper is installed:
     ```bash
     which whisper || python3 -m whisper --help 2>/dev/null
     ```
     If not found:
     > "Whisper is not installed. Install it with: `pip install openai-whisper`
     > Then re-run this command."
     Stop.
   - Run Whisper transcription:
     ```bash
     whisper "<file>" --model medium --output_format srt --output_dir /tmp
     ```
   - Check exit code. If Whisper failed, report the error and stop.
   - Construct the SRT path:
     ```bash
     SRT_FILE="/tmp/$(basename '<file>' | sed 's/\.[^.]*$//').srt"
     ```
   - Verify the SRT file was created. If not, report error and stop.

4. **If an SRT file was provided**, verify it exists.

5. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise: `captioned_<source-basename>.<ext>`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc.:
     ```bash
     OUTPUT="captioned_<basename>.<ext>"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="captioned_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

6. **Escape the SRT path for the subtitles filter.**
   The `subtitles=` filter uses libass, which has its own path parser. Colons, single quotes, backslashes, and certain special characters must be escaped:
   ```bash
   SRT_ESCAPED=$(echo "$SRT_FILE" | sed "s/\\\\/\\\\\\\\\\\\\\\\/g; s/'/\\\\\\\\'/g; s/:/\\\\\\\\:/g")
   ```
   This ensures paths like `/Users/name/My Project: Final/captions.srt` are handled correctly.

7. Build the subtitle filter string based on `--style`:

   ```bash
   # Default style
   STYLE_OPTS="FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BackColour=&H80000000,Outline=1,Shadow=0,MarginV=30,Alignment=2"

   # Large
   STYLE_OPTS="FontSize=36,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BackColour=&H80000000,Outline=1,Shadow=0,MarginV=30,Alignment=2"

   # Top
   STYLE_OPTS="FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BackColour=&H80000000,Outline=1,Shadow=0,MarginV=30,Alignment=6"

   # Center
   STYLE_OPTS="FontSize=28,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BackColour=&H80000000,Outline=1,Shadow=0,Alignment=5"

   # Bold (yellow text with black box)
   STYLE_OPTS="FontSize=28,PrimaryColour=&H0000D7FF,OutlineColour=&HFF000000,BackColour=&HFF000000,Bold=1,Outline=1,Shadow=0,BorderStyle=3,MarginV=30,Alignment=2"

   # Minimal (shadow only, no background)
   STYLE_OPTS="FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H00000000,Outline=0,Shadow=2,MarginV=30,Alignment=2"

   # TikTok (bold, center, rounded black box)
   STYLE_OPTS="FontSize=32,PrimaryColour=&H00FFFFFF,OutlineColour=&HFF000000,BackColour=&HC0000000,Bold=1,Outline=1,Shadow=0,BorderStyle=3,Alignment=5"
   ```

   Note: ASS color format is `&HAABBGGRR` (alpha, blue, green, red). `&H00FFFFFF` = white, `&H0000D7FF` = yellow (#FFD700).

8. Announce: `"Burning captions from <srt> into <file> -> <output>"`

9. Run ffmpeg:
   ```bash
   ffmpeg -n -i "<file>" -vf "subtitles='${SRT_ESCAPED}':force_style='${STYLE_OPTS}'" -c:a copy "<output>"
   ```

   **Hardware acceleration note (macOS Apple Silicon):**
   Check for Apple Silicon:
   ```bash
   [[ "$(uname -m)" == "arm64" && "$(uname)" == "Darwin" ]]
   ```
   If detected, you can offer hardware-accelerated encoding:
   ```bash
   ffmpeg -n -i "<file>" -vf "subtitles='${SRT_ESCAPED}':force_style='${STYLE_OPTS}'" -c:v h264_videotoolbox -q:v 50 -c:a copy "<output>"
   ```
   Mention this as an option: "Detected Apple Silicon. Want to use hardware acceleration for faster encoding?"

10. Check exit code:
    ```bash
    if [ $? -ne 0 ]; then
      echo "Caption burn failed. Check the error output above."
      echo "Common fixes:"
      echo "  - Verify the SRT file is valid and UTF-8 encoded"
      echo "  - Try escaping the SRT path manually if it contains special characters"
      echo "  - Check the video file is not corrupted: ffprobe \"<file>\""
      echo "  - If the subtitles filter fails, try converting the SRT to ASS first:"
      echo "    ffmpeg -i captions.srt captions.ass"
    fi
    ```

11. Report output path and file size:
    ```bash
    ls -lh "<output>"
    ```

12. Suggest next steps:
    > "Captions burned successfully! Here are some things you can do next:
    > - Compress for sharing: `/compress <output> youtube`
    > - Trim to a specific section: `/trim <output> 00:01:00 00:02:00`
    > - Create a teaser: `/teaser <output> --title "My Video"`
    > - Merge with other clips: `/merge intro.mp4 <output>`"
