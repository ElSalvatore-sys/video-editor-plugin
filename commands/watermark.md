---
description: Overlay an image (logo/watermark) onto a video — usage: /watermark <video> <image> [--position top-left|top-right|bottom-left|bottom-right|center] [--opacity 0.0-1.0] [--margin px] [--scale ratio] [--fade-in seconds] [--from HH:MM:SS] [--to HH:MM:SS] [--output <path>]
---

# /watermark

Overlay a logo or watermark image onto a video. Supports positioning, opacity control, scaling relative to video width, fade-in animation, and time-range limiting.

**Usage:** `/watermark <video> <image> [options]`

**Flags:**
| Flag | Description | Default |
|------|-------------|---------|
| `--position <pos>` | `top-left`, `top-right`, `bottom-left`, `bottom-right`, `center` | `bottom-right` |
| `--opacity <float>` | Watermark opacity from 0.0 (invisible) to 1.0 (fully opaque) | `0.7` |
| `--margin <px>` | Pixels from the edge of the frame | `20` |
| `--scale <float>` | Scale watermark width relative to video width (0.15 = 15%) | `0.15` |
| `--fade-in <seconds>` | Fade the watermark in over N seconds | none |
| `--from <timestamp>` | Only show watermark starting at this time | start of video |
| `--to <timestamp>` | Only show watermark until this time | end of video |
| `--output <path>` | Custom output file path | `watermarked_<filename>` |

**Timestamps:** `HH:MM:SS`, `MM:SS`, or seconds (e.g., `90.5`)

**Examples:**
- `/watermark video.mp4 logo.png --position bottom-right`
- `/watermark video.mp4 logo.png --position top-left --opacity 0.5 --margin 20`
- `/watermark video.mp4 logo.png --position center --scale 0.3`
- `/watermark video.mp4 logo.png --fade-in 2 --from 00:00:05 --to 00:01:00`
- `/watermark video.mp4 logo.png --position top-right --opacity 0.3 --output branded.mp4`

## Position Reference

| Position | Overlay coordinates |
|----------|-------------------|
| `top-left` | `x=<margin>:y=<margin>` |
| `top-right` | `x=W-w-<margin>:y=<margin>` |
| `bottom-left` | `x=<margin>:y=H-h-<margin>` |
| `bottom-right` | `x=W-w-<margin>:y=H-h-<margin>` |
| `center` | `x=(W-w)/2:y=(H-h)/2` |

## Steps

1. Parse the two required arguments (`video`, `image`) and optional flags (`--position`, `--opacity`, `--margin`, `--scale`, `--fade-in`, `--from`, `--to`, `--output`). Ask for any required arguments that are missing.

2. Validate tools and inputs:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   which ffprobe || echo "ffprobe not found. Install: brew install ffmpeg"
   ```
   Check both the video file and the image file exist. If either is missing, report the error and stop.

3. Inspect the video dimensions with ffprobe:
   ```bash
   ffprobe -v quiet -show_entries stream=width,height -of csv=p=0:s=x "<video>" | head -1
   ```
   Store the video width (`VW`) and height (`VH`).

4. Calculate the watermark scale dimensions. The watermark width should be `VW * <scale>` pixels, preserving aspect ratio:
   ```bash
   SCALED_W=$(echo "<VW> * <scale>" | bc | cut -d. -f1)
   # Height is auto-calculated by ffmpeg with -1
   ```

5. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise: `watermarked_<source-basename>.<ext>`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc. before the extension until a free name is found:
     ```bash
     OUTPUT="watermarked_<basename>.<ext>"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="watermarked_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

6. Announce: `"Applying watermark <image> to <video> at <position> (opacity: <opacity>, scale: <scale>) -> <output>"`

7. Build the overlay position string based on `--position` and `--margin`:
   - `top-left`: `OVERLAY_POS="x=<margin>:y=<margin>"`
   - `top-right`: `OVERLAY_POS="x=W-w-<margin>:y=<margin>"`
   - `bottom-left`: `OVERLAY_POS="x=<margin>:y=H-h-<margin>"`
   - `bottom-right`: `OVERLAY_POS="x=W-w-<margin>:y=H-h-<margin>"`
   - `center`: `OVERLAY_POS="x=(W-w)/2:y=(H-h)/2"`

8. Build the filter_complex string. The base filter has three stages:
   - Scale the watermark to the target width
   - Apply opacity via colorchannelmixer
   - Overlay onto the video at the calculated position

   **Basic (no fade-in, no time range):**
   ```bash
   ffmpeg -n -i "<video>" -i "<image>" \
     -filter_complex "[1:v]scale=<SCALED_W>:-1,format=rgba,colorchannelmixer=aa=<opacity>[wm]; \
                      [0:v][wm]overlay=<OVERLAY_POS>[v]" \
     -map "[v]" -map 0:a -c:a copy "<output>"
   ```

   **With `--fade-in` (fade watermark opacity from 0 to target over N seconds):**
   Replace the `colorchannelmixer` with a dynamic opacity expression using the `geq` or `fade` filter on the watermark:
   ```bash
   ffmpeg -n -i "<video>" -i "<image>" \
     -filter_complex "[1:v]scale=<SCALED_W>:-1,format=rgba,colorchannelmixer=aa=<opacity>,fade=in:st=0:d=<fade_in>:alpha=1[wm]; \
                      [0:v][wm]overlay=<OVERLAY_POS>[v]" \
     -map "[v]" -map 0:a -c:a copy "<output>"
   ```

   **With `--from` and/or `--to` (time-limited watermark):**
   Add the `enable` expression to the overlay filter:
   ```bash
   # Convert timestamps to seconds for the enable expression
   ffmpeg -n -i "<video>" -i "<image>" \
     -filter_complex "[1:v]scale=<SCALED_W>:-1,format=rgba,colorchannelmixer=aa=<opacity>[wm]; \
                      [0:v][wm]overlay=<OVERLAY_POS>:enable='between(t,<from_sec>,<to_sec>)'[v]" \
     -map "[v]" -map 0:a -c:a copy "<output>"
   ```

   **With both `--fade-in` and time range:** Combine the fade and enable filters:
   ```bash
   ffmpeg -n -i "<video>" -i "<image>" \
     -filter_complex "[1:v]scale=<SCALED_W>:-1,format=rgba,colorchannelmixer=aa=<opacity>,fade=in:st=0:d=<fade_in>:alpha=1[wm]; \
                      [0:v][wm]overlay=<OVERLAY_POS>:enable='between(t,<from_sec>,<to_sec>)'[v]" \
     -map "[v]" -map 0:a -c:a copy "<output>"
   ```

   **Hardware acceleration note (macOS Apple Silicon):**
   Check if running on Apple Silicon:
   ```bash
   [[ "$(uname -m)" == "arm64" && "$(uname)" == "Darwin" ]]
   ```
   If yes, you can add `-c:v h264_videotoolbox -q:v 50` for faster encoding. Mention this to the user as an option.

9. Check exit code:
   ```bash
   if [ $? -ne 0 ]; then
     echo "ffmpeg failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Ensure the image file is a valid format (PNG with transparency works best)"
     echo "  - Check that the video file is not corrupted: ffprobe \"<video>\""
     echo "  - If the image is too large, try a smaller --scale value"
     echo "  - For SVG logos, convert to PNG first: convert logo.svg logo.png"
   fi
   ```

10. Report output path and file size:
    ```bash
    ls -lh "<output>"
    ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<output>"
    ```

11. Suggest next steps:
    > "Watermark applied! Here are some things you can do next:
    > - Compress for sharing: `/compress <output> web`
    > - Add captions: `/add-captions <output> auto`
    > - Trim a section: `/trim <output> 00:00 01:00`
    > - Create an end card: `/end-card --logo logo.png --theme wad`"
