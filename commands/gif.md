---
description: Convert a video clip to an optimized animated GIF — usage: /gif <file> [start] [end] [options] [--output <path>]
---

# /gif

Convert a video (or a section of it) into an optimized animated GIF using two-pass palette generation for maximum quality at small file sizes.

**Usage:** `/gif <file> [start] [end] [options]`

**Timestamps:** `HH:MM:SS`, `MM:SS`, or seconds (e.g., `5.0`). If omitted, converts the full video.

**Options:**
| Option | Default | Description |
|--------|---------|-------------|
| `--fps <n>` | 15 | Frame rate (lower = smaller file) |
| `--width <px>` | 480 | Output width in pixels (height auto-calculated to preserve aspect ratio) |
| `--colors <n>` | 256 | Max colors in palette (lower = smaller file, min 2, max 256) |
| `--loop <n>` | 0 | Loop count (0 = infinite loop) |
| `--output <path>` | -- | Custom output file path |

**Examples:**
- `/gif video.mp4` — Full video to GIF
- `/gif video.mp4 00:05 00:10` — 5-second GIF from 0:05 to 0:10
- `/gif video.mp4 00:05 00:10 --fps 15 --width 480` — Custom framerate and width
- `/gif video.mp4 --width 320 --fps 10` — Small, fast-loading GIF
- `/gif recording.mov 00:00 00:03 --colors 128 --output reaction.gif`
- `/gif clip.mp4 1:00 1:05 --loop 1` — Play once, no loop

**Quality vs size guide:**
| Setting | Small/Fast | Balanced | High Quality |
|---------|-----------|----------|-------------|
| `--fps` | 10 | 15 | 24 |
| `--width` | 320 | 480 | 640+ |
| `--colors` | 64 | 128 | 256 |
| Typical size | 1-3 MB | 3-8 MB | 8-20 MB |

## Steps

1. Parse the required argument (`file`) and optional arguments (`start`, `end`, `--fps`, `--width`, `--colors`, `--loop`, `--output`). Apply defaults for any unspecified options.

2. Validate tools and input:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   ```
   Check the file exists. If not, report the error and stop.

3. Get video info:
   ```bash
   ffprobe -v quiet -show_entries format=duration -show_entries stream=width,height -of json -select_streams v:0 "<file>"
   ```
   - If `start` and `end` are provided, validate they are within the video duration.
   - If only `start` is provided without `end`, treat `end` as the video end.
   - If neither is provided, convert the full video. Warn if duration > 15 seconds:
     > "Warning: Full video is X seconds. GIF files get very large for long clips. Consider specifying a range: `/gif <file> 00:00 00:10`"

4. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise, use the pattern: `<source-basename>.gif`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc. before the extension until a free name is found:
     ```bash
     OUTPUT="<basename>.gif"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="<basename>_${COUNTER}.gif"
       COUNTER=$((COUNTER + 1))
     done
     ```

5. Announce the operation:
   > "Converting `<file>` to GIF (fps=<fps>, width=<width>, colors=<colors>) -> `<output>`"

6. Build timestamp arguments for ffmpeg:
   ```bash
   # If start/end specified:
   TIME_ARGS="-ss <start> -to <end>"
   # If full video:
   TIME_ARGS=""
   ```

7. Run two-pass GIF creation:

   **Pass 1 — Generate optimized palette:**
   ```bash
   ffmpeg ${TIME_ARGS} -i "<file>" \
     -vf "fps=<fps>,scale=<width>:-1:flags=lanczos,palettegen=max_colors=<colors>:stats_mode=diff" \
     -y /tmp/gif_palette_$$.png
   ```
   Note: `stats_mode=diff` optimizes the palette for animation (changing pixels), producing better results than the default `full` mode for most video content.

   Check exit code after pass 1:
   ```bash
   if [ $? -ne 0 ]; then
     echo "Palette generation failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Verify timestamps are within the video duration"
     echo "  - Check that the file is a valid video: ffprobe \"<file>\""
     echo "  - Try reducing --width or --fps"
     rm -f /tmp/gif_palette_$$.png
   fi
   ```

   **Pass 2 — Create GIF using palette:**
   ```bash
   ffmpeg ${TIME_ARGS} -i "<file>" -i /tmp/gif_palette_$$.png \
     -filter_complex "fps=<fps>,scale=<width>:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" \
     -loop <loop> -n "<output>"
   ```

   Check exit code after pass 2:
   ```bash
   if [ $? -ne 0 ]; then
     echo "GIF creation failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Try reducing --width (e.g., --width 320)"
     echo "  - Try reducing --fps (e.g., --fps 10)"
     echo "  - Try reducing --colors (e.g., --colors 128)"
     echo "  - Check available disk space"
   fi
   ```

8. Clean up temporary palette file:
   ```bash
   rm -f /tmp/gif_palette_$$.png
   ```

9. Report results:
   ```bash
   ls -lh "<output>"
   ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 "<output>"
   ```
   Display:
   - Output path
   - File size (human-readable)
   - Dimensions (width x height)
   - Duration of the GIF
   - Approximate frame count (duration * fps)
   - Settings used (fps, colors, loop)

10. If GIF is very large, suggest optimizations:
    - **> 10 MB:** "The GIF is quite large (>10 MB). To reduce size, try:"
      - "Lower frame rate: `/gif <file> <start> <end> --fps 10`"
      - "Reduce width: `/gif <file> <start> <end> --width 320`"
      - "Fewer colors: `/gif <file> <start> <end> --colors 128`"
      - "Shorter clip: reduce the time range"
    - **> 20 MB:** "This GIF is very large (>20 MB). Consider using a video format instead for better quality at smaller size: `/compress <file> web`"

11. Suggest next steps:
    > "GIF created! Here are some things you can do next:
    > - Extract a still thumbnail instead: `/thumbnail <file> <timestamp>`
    > - Resize the source video: `/resize <file> --platform twitter`
    > - Trim the source first: `/trim <file> <start> <end>`
    > - Get source file info: `/info <file>`
    > - Want to add this to a README or social post?"
