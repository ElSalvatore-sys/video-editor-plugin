---
description: Trim a video to a specific time range — usage: /trim <file> <start> <end> [--precise] [--output <path>]
---

# /trim

Trim a video between two timestamps. By default uses ffmpeg stream copy (fast, lossless — no re-encode). Use `--precise` for frame-accurate trimming.

**Usage:** `/trim <file> <start> <end> [--precise] [--output <path>]`

**Timestamps:** `HH:MM:SS`, `MM:SS`, or seconds (e.g., `90.5`)

**Flags:**
| Flag | Description |
|------|-------------|
| `--precise` | Frame-accurate trim (re-encodes; slower but exact) |
| `--output <path>` | Custom output file path |

**Examples:**
- `/trim video.mp4 00:01:30 00:02:45`
- `/trim recording.mov 0:05 1:20:00 --precise`
- `/trim interview.mp4 00:10:00 00:15:00 --output highlight.mp4`

## Keyframe Seek Tradeoff

| Mode | Speed | Accuracy | How it works |
|------|-------|----------|--------------|
| Default (`-c copy`) | Very fast (seconds) | Approximate — starts at nearest keyframe before `<start>` | Input seeking, stream copy |
| `--precise` | Slower (re-encodes) | Frame-accurate — starts exactly at `<start>` | Output seeking with re-encode |

**When to use `--precise`:** When you need the trim to start/end on an exact frame (e.g., cutting dialogue mid-sentence). Without it, the start point may be up to a few seconds early depending on keyframe interval.

## Steps

1. Parse the three required arguments (`file`, `start`, `end`) and optional flags (`--precise`, `--output`). Ask for any that are missing.

2. Validate tools and input:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   ```
   Check the file exists. If not, report the error and stop.

3. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise, use the pattern: `trimmed_<source-basename>.<ext>`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc. before the extension until a free name is found:
     ```bash
     OUTPUT="trimmed_<basename>.<ext>"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="trimmed_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

4. Announce:
   - Default: `"Trimming <file> from <start> to <end> (fast copy) -> <output>"`
   - With `--precise`: `"Trimming <file> from <start> to <end> (frame-accurate re-encode) -> <output>"`

5. Run ffmpeg:

   **Default (fast, keyframe-approximate):**
   ```bash
   ffmpeg -n -ss <start> -to <end> -i "<file>" -c copy "<output>"
   ```
   Note: `-ss` before `-i` enables fast input seeking. The trim may start slightly before `<start>` at the nearest keyframe.

   **With `--precise` (frame-accurate, re-encodes):**
   ```bash
   ffmpeg -n -i "<file>" -ss <start> -to <end> -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k "<output>"
   ```
   Note: `-ss` after `-i` enables output seeking for frame-accurate cuts. CRF 18 preserves near-lossless quality.

   **Hardware acceleration note (macOS Apple Silicon):**
   Check if running on Apple Silicon:
   ```bash
   [[ "$(uname -m)" == "arm64" && "$(uname)" == "Darwin" ]]
   ```
   If yes, and `--precise` is used, you can offer `h264_videotoolbox` for ~5-10x faster encoding:
   ```bash
   ffmpeg -n -i "<file>" -ss <start> -to <end> -c:v h264_videotoolbox -q:v 50 -c:a aac -b:a 192k "<output>"
   ```
   Mention this as an option to the user: "Detected Apple Silicon. Want to use hardware acceleration for faster encoding? (Slightly larger file size but ~5-10x faster.)"

6. Check exit code:
   ```bash
   if [ $? -ne 0 ]; then
     echo "ffmpeg failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Verify timestamps are within the video duration"
     echo "  - Check that the file is not corrupted: ffprobe \"<file>\""
     echo "  - Try with --precise if the default mode fails on this container format"
   fi
   ```

7. Report output path, file size, and duration of the trimmed clip:
   ```bash
   ls -lh "<output>"
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<output>"
   ```

8. Suggest next steps:
   > "Trim complete! Here are some things you can do next:
   > - Compress it: `/compress <output> web`
   > - Add captions: `/add-captions <output> auto`
   > - Merge with other clips: `/merge <output> other_clip.mp4`
   > - Extract audio: `/extract <output> audio`"
