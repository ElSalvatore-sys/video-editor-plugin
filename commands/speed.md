---
description: Change video playback speed (speed up or slow motion) — usage: /speed <file> <multiplier> [--keep-pitch] [--output <path>]
---

# /speed

Change the playback speed of a video. Speed up, slow down, or create slow-motion effects. Handles both video and audio tempo adjustments.

**Usage:** `/speed <file> <multiplier> [--keep-pitch] [--output <path>]`

**Multiplier formats:** `2x`, `2.0x`, `2`, `200%` (all equivalent)

**Flags:**
| Flag | Description |
|------|-------------|
| `--keep-pitch` | Preserve original audio pitch when changing speed (uses rubberband or asetrate filter) |
| `--output <path>` | Custom output file path |

**Examples:**
- `/speed video.mp4 2x` — Double speed
- `/speed video.mp4 0.5x` — Half speed (slow motion)
- `/speed video.mp4 1.5x --keep-pitch` — 1.5x speed, preserve audio pitch
- `/speed video.mp4 0.25x` — Quarter speed (extreme slow-mo, drops audio)
- `/speed recording.mov 3x --output fast_version.mp4`
- `/speed clip.mp4 150%` — 1.5x speed using percentage format

**Speed reference:**
| Multiplier | Effect | Duration Change | Audio Note |
|-----------|--------|----------------|------------|
| `0.25x` | Extreme slow-mo | 4x longer | Audio dropped (too slow) |
| `0.5x` | Slow motion | 2x longer | Pitched down (or use --keep-pitch) |
| `0.75x` | Slightly slow | 1.33x longer | Slight pitch shift |
| `1x` | Normal | No change | No change |
| `1.5x` | Slightly fast | 1.5x shorter | Slight pitch shift |
| `2x` | Double speed | 2x shorter | Pitched up (or use --keep-pitch) |
| `4x` | Timelapse | 4x shorter | Audio may degrade |
| `10x+` | Extreme timelapse | 10x+ shorter | Audio dropped |

## Steps

1. Parse the required arguments (`file`, `multiplier`) and optional flags (`--keep-pitch`, `--output`). Ask for any that are missing.

2. Normalize the multiplier to a float:
   - `2x` or `2.0x` -> `2.0`
   - `200%` -> `2.0`
   - `2` -> `2.0`
   - `0.5x` -> `0.5`
   - `50%` -> `0.5`

3. Validate:
   - Multiplier must be between `0.1` and `100.0`. If outside this range, report error and stop.
   - Check ffmpeg is installed:
     ```bash
     which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
     ```
   - Check the file exists. If not, report the error and stop.

4. Get source info:
   ```bash
   ffprobe -v quiet -show_entries format=duration -show_entries stream=codec_type,sample_rate -of json "<file>"
   ```
   Note the duration and audio sample rate (needed for pitch preservation).

5. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise, use the pattern: `speed_<multiplier>x_<source-basename>.<ext>`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc. before the extension until a free name is found:
     ```bash
     OUTPUT="speed_<multiplier>x_<basename>.<ext>"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="speed_<multiplier>x_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

6. Build the ffmpeg filter:

   **Video filter (always applied):**
   ```
   setpts=PTS/<multiplier>
   ```
   For 2x speed: `setpts=PTS/2.0` (halves timestamps, doubling speed).
   For 0.5x speed: `setpts=PTS/0.5` (doubles timestamps, halving speed).

   **Audio filter — Standard (pitch changes with speed):**
   The `atempo` filter only accepts values between `0.5` and `100.0`. For values outside this range, chain multiple `atempo` filters:
   - `2x` -> `atempo=2.0`
   - `4x` -> `atempo=2.0,atempo=2.0`
   - `0.5x` -> `atempo=0.5`
   - `0.25x` -> `atempo=0.5,atempo=0.5`
   - `0.125x` -> `atempo=0.5,atempo=0.5,atempo=0.5`

   General rule: decompose the multiplier into a chain of factors, each between 0.5 and 2.0.

   **Audio filter — With `--keep-pitch`:**
   Use the `asetrate` and `aresample` approach to change speed without changing pitch:
   ```
   asetrate=<original_samplerate>*<multiplier>,aresample=<original_samplerate>,atempo=1
   ```
   Or if the `rubberband` filter is available (check with `ffmpeg -filters | grep rubberband`):
   ```
   rubberband=tempo=<multiplier>
   ```
   Prefer `rubberband` if available as it produces higher quality results.

   **Audio handling edge cases:**
   - If multiplier <= `0.1`: drop audio entirely (`-an`), warn the user: "Audio dropped at this speed — it would be unintelligible."
   - If multiplier > `10.0`: drop audio entirely (`-an`), warn: "Audio dropped for extreme timelapse speeds."
   - If multiplier < `0.5` or > `2.0` without `--keep-pitch`: warn "Audio quality may degrade at this speed. Consider using `--keep-pitch` for better results."

7. Announce the operation:
   > "Changing speed of `<file>` to <multiplier>x -> `<output>`"
   > "Original duration: X:XX -> New duration: ~Y:YY"

8. Run ffmpeg:

   **With audio:**
   ```bash
   ffmpeg -n -i "<file>" -filter_complex "[0:v]setpts=PTS/<mult>[v];[0:a]<atempo_chain>[a]" -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k "<output>"
   ```

   **Without audio (extreme speeds or no audio track):**
   ```bash
   ffmpeg -n -i "<file>" -vf "setpts=PTS/<mult>" -an -c:v libx264 -crf 18 -preset medium "<output>"
   ```

   **Hardware acceleration note (macOS Apple Silicon):**
   Check if running on Apple Silicon:
   ```bash
   [[ "$(uname -m)" == "arm64" && "$(uname)" == "Darwin" ]]
   ```
   If yes, you can offer `h264_videotoolbox` for faster encoding:
   ```bash
   ffmpeg -n -i "<file>" -filter_complex "[0:v]setpts=PTS/<mult>[v];[0:a]<atempo_chain>[a]" -map "[v]" -map "[a]" -c:v h264_videotoolbox -q:v 50 -c:a aac -b:a 192k "<output>"
   ```
   Mention this as an option: "Detected Apple Silicon. Want to use hardware acceleration for faster encoding? (Slightly larger file size but ~5-10x faster.)"

9. Check exit code:
   ```bash
   if [ $? -ne 0 ]; then
     echo "ffmpeg failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Verify the file is a valid video: ffprobe \"<file>\""
     echo "  - If audio filter fails, try without --keep-pitch"
     echo "  - For extreme speeds, audio is automatically dropped"
     echo "  - Check that the multiplier is between 0.1x and 100x"
   fi
   ```

10. Report results:
    ```bash
    ls -lh "<output>"
    ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<output>"
    ```
    Display: output path, original duration vs new duration, file size.

11. Suggest next steps:
    > "Speed change complete! Here are some things you can do next:
    > - Trim a section: `/trim <output> <start> <end>`
    > - Compress for sharing: `/compress <output> web`
    > - Resize for a platform: `/resize <output> --platform tiktok`
    > - Extract a thumbnail: `/thumbnail <output> --best`
    > - Get file info: `/info <output>`"
