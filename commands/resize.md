---
description: Crop, scale, pad, or convert aspect ratio of a video — usage: /resize <file> <mode> [options]
---

# /resize

Crop, scale, pad, or convert aspect ratio of a video. Includes platform presets for social media export.

**Usage:** `/resize <file> <mode> [options]`

**Modes:**
| Mode | Description |
|------|-------------|
| `--size 1920x1080` | Scale to exact dimensions (may distort if aspect ratio differs) |
| `--fit 1920x1080` | Scale to fit within dimensions (preserves aspect ratio, adds letterbox/pillarbox bars) |
| `--crop 16:9` | Crop to aspect ratio (center crop, removes edges) |
| `--pad 1:1 --bg black` | Pad to aspect ratio with colored bars |
| `--platform <name>` | Apply a platform preset (resize + quality in one step) |
| `--output <path>` | Custom output file path |

**Platform Presets:**
| Platform | Resolution | Aspect | Max Duration | Notes |
|----------|-----------|--------|-------------|-------|
| `instagram-reel` | 1080x1920 | 9:16 | 90s | Vertical, CRF 23 |
| `instagram-feed` | 1080x1080 | 1:1 | 60s | Square, CRF 23 |
| `instagram-story` | 1080x1920 | 9:16 | 15s | Vertical, CRF 23 |
| `tiktok` | 1080x1920 | 9:16 | 10min | Vertical, CRF 23 |
| `youtube` | 1920x1080 | 16:9 | -- | Landscape, CRF 18 |
| `youtube-short` | 1080x1920 | 9:16 | 60s | Vertical, CRF 20 |
| `twitter` | 1280x720 | 16:9 | 140s | Landscape, CRF 23 |
| `linkedin` | 1920x1080 | 16:9 | 10min | Landscape, CRF 23 |

**Examples:**
- `/resize video.mp4 --size 1280x720`
- `/resize video.mp4 --fit 1920x1080`
- `/resize video.mp4 --crop 1:1`
- `/resize video.mp4 --pad 16:9 --bg black`
- `/resize video.mp4 --platform instagram-reel`
- `/resize video.mp4 --platform tiktok --output my_tiktok.mp4`

## Steps

1. Parse the required arguments (`file`, `mode`) and optional flags (`--bg`, `--platform`, `--output`). Ask for any that are missing.

2. Validate tools and input:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   ```
   Check the file exists. If not, report the error and stop.

3. Inspect source with ffprobe to get current resolution, aspect ratio, duration, and codec:
   ```bash
   ffprobe -v quiet -show_entries stream=width,height,display_aspect_ratio,codec_name,r_frame_rate -show_entries format=duration -of json -select_streams v:0 "<file>"
   ```

4. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise, use the pattern: `resized_<source-basename>.<ext>`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc. before the extension until a free name is found:
     ```bash
     OUTPUT="resized_<basename>.<ext>"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="resized_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

5. Calculate the ffmpeg filter based on mode:

   **`--size WxH` (exact scale, may distort):**
   ```bash
   -vf "scale=W:H"
   ```

   **`--fit WxH` (fit within, preserves aspect ratio, pads with black):**
   ```bash
   -vf "scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2:color=black"
   ```

   **`--crop RATIO` (center crop to aspect ratio):**
   Parse the ratio (e.g., `16:9` becomes 16/9 = 1.778). Compare to source aspect ratio to determine whether to crop width or height:
   ```bash
   # If source is wider than target ratio, crop width:
   -vf "crop=ih*TARGET_W/TARGET_H:ih"
   # If source is taller than target ratio, crop height:
   -vf "crop=iw:iw*TARGET_H/TARGET_W"
   ```

   **`--pad RATIO --bg COLOR` (pad to aspect ratio):**
   Parse the ratio. Calculate the required output dimensions to achieve the target ratio while fitting the source:
   ```bash
   # If source is wider than target ratio, pad height:
   -vf "pad=iw:iw*TARGET_H/TARGET_W:(ow-iw)/2:(oh-ih)/2:color=<bg>"
   # If source is taller than target ratio, pad width:
   -vf "pad=ih*TARGET_W/TARGET_H:ih:(ow-iw)/2:(oh-ih)/2:color=<bg>"
   ```
   Default `--bg` color is `black`.

   **`--platform <name>` (preset):**
   Look up the platform preset from the table above. Apply the following:
   - Use `--fit` logic to scale to the preset resolution
   - Apply the preset CRF value
   - Check if video duration exceeds the platform max duration. If it does, warn the user:
     > "Warning: Video is X:XX long but <platform> max is Ys. Consider trimming first: `/trim <file> 00:00 <max_duration>`"

6. Announce the operation:
   > "Resizing `<file>` from <old_W>x<old_H> to <new_W>x<new_H> (<mode>) -> `<output>`"

7. Run ffmpeg:

   **Standard resize (non-platform):**
   ```bash
   ffmpeg -n -i "<file>" -vf "<filter>" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k "<output>"
   ```

   **Platform preset:**
   ```bash
   ffmpeg -n -i "<file>" -vf "<filter>" -c:v libx264 -crf <preset_crf> -preset medium -c:a aac -b:a 128k "<output>"
   ```

   **Hardware acceleration note (macOS Apple Silicon):**
   Check if running on Apple Silicon:
   ```bash
   [[ "$(uname -m)" == "arm64" && "$(uname)" == "Darwin" ]]
   ```
   If yes, you can offer `h264_videotoolbox` for faster encoding:
   ```bash
   ffmpeg -n -i "<file>" -vf "<filter>" -c:v h264_videotoolbox -q:v 50 -c:a aac -b:a 192k "<output>"
   ```
   Mention this as an option: "Detected Apple Silicon. Want to use hardware acceleration for faster encoding? (Slightly larger file size but ~5-10x faster.)"

8. Check exit code:
   ```bash
   if [ $? -ne 0 ]; then
     echo "ffmpeg failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Verify dimensions are even numbers (ffmpeg requires this for H.264)"
     echo "  - Check that the aspect ratio values are valid (e.g., 16:9, 1:1, 9:16)"
     echo "  - Try a different mode (--fit is safest if unsure)"
     echo "  - Check the file: ffprobe \"<file>\""
   fi
   ```

9. Report results:
   ```bash
   ls -lh "<output>"
   ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 -select_streams v:0 "<output>"
   ```
   Display: output path, old dimensions vs new dimensions, old file size vs new file size.

10. Suggest next steps:
    > "Resize complete! Here are some things you can do next:
    > - Compress further: `/compress <output> web`
    > - Trim to length: `/trim <output> 00:00 00:30`
    > - Change speed: `/speed <output> 1.5x`
    > - Add captions: `/add-captions <output> auto`
    > - Get file info: `/info <output>`"
