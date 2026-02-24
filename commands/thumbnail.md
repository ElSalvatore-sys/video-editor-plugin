---
description: Extract frame(s) from a video as images — usage: /thumbnail <file> [timestamp|options] [--output <path>]
---

# /thumbnail

Extract one or more frames from a video as PNG images. Supports single frame extraction, auto-best-frame detection, contact sheet grids, and batch extraction at intervals.

**Usage:** `/thumbnail <file> [timestamp|options] [--output <path>]`

**Modes:**
| Mode | Description |
|------|-------------|
| `<timestamp>` | Single frame at exact timestamp (e.g., `00:01:30`) |
| `--best` | Auto-detect the best thumbnail (highest visual complexity) |
| `--grid 3x3` | Contact sheet of evenly-spaced frames in a single image |
| `--interval 10` | One frame every N seconds, saved to a folder |
| `--count 5` | N evenly-spaced frames, saved to a folder |
| `--output <path>` | Custom output file or folder path |

**Examples:**
- `/thumbnail video.mp4 00:01:30` — Single frame at 1:30
- `/thumbnail video.mp4 --best` — Auto-select best frame
- `/thumbnail video.mp4 --grid 3x3` — 9-frame contact sheet
- `/thumbnail video.mp4 --grid 4x2` — 8-frame contact sheet
- `/thumbnail video.mp4 --interval 10` — One frame every 10 seconds
- `/thumbnail video.mp4 --count 5` — 5 evenly-spaced frames
- `/thumbnail video.mp4 00:00:45 --output cover.png`

## Steps

1. Parse the required argument (`file`) and mode/options. If no mode is specified, default to `--best`. Ask for the file if missing.

2. Validate tools and input:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   which ffprobe || echo "ffprobe not found. Install: brew install ffmpeg"
   ```
   Check the file exists. If not, report the error and stop.

3. Get video info:
   ```bash
   ffprobe -v quiet -show_entries format=duration -show_entries stream=width,height,r_frame_rate,nb_frames -of json -select_streams v:0 "<file>"
   ```
   Note the duration, resolution, and frame count.

4. Determine output path(s):
   - If `--output <path>` was provided, use that path.
   - Otherwise:
     - Single frame / best: `thumbnail_<basename>.png`
     - Grid: `grid_<basename>.png`
     - Interval / count: folder `thumbnails_<basename>/frame_0001.png`, `frame_0002.png`, etc.
   - **Collision handling:** Check if the output file/folder already exists. If it does, append `_2`, `_3`, etc. until a free name is found:
     ```bash
     OUTPUT="thumbnail_<basename>.png"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="thumbnail_<basename>_${COUNTER}.png"
       COUNTER=$((COUNTER + 1))
     done
     ```

5. Execute based on mode:

   **Single frame at timestamp:**
   ```bash
   ffmpeg -n -ss <timestamp> -i "<file>" -vframes 1 -q:v 2 "<output>.png"
   ```
   Validate that the timestamp is within the video duration. If not, report error and stop.

   **`--best` (auto-detect best thumbnail):**
   Extract 20 candidate frames evenly spaced across the video, then pick the one with the highest visual complexity (using scene score or file size as proxy for detail):
   ```bash
   # Calculate interval: duration / 20
   INTERVAL=$(echo "<duration> / 20" | bc -l)

   # Extract 20 candidates to a temp folder
   TMPDIR=$(mktemp -d)
   ffmpeg -i "<file>" -vf "fps=1/${INTERVAL}" -q:v 2 "${TMPDIR}/candidate_%04d.png"

   # Find the largest file (proxy for highest detail/complexity)
   BEST=$(ls -S "${TMPDIR}"/candidate_*.png | head -1)
   cp "$BEST" "<output>.png"
   rm -rf "$TMPDIR"
   ```
   Alternatively, use ffprobe scene detection to find high-complexity frames:
   ```bash
   ffprobe -v quiet -show_frames -select_streams v -show_entries frame=pts_time,pict_type -of csv=p=0 "<file>" | head -100
   ```
   Pick the I-frame with the highest scene change score.

   **`--grid COLSxROWS` (contact sheet):**
   Calculate total frames needed (COLS * ROWS) and the interval between them:
   ```bash
   TOTAL_FRAMES=$((COLS * ROWS))
   # Calculate select interval in frame numbers
   TOTAL_VIDEO_FRAMES=$(ffprobe -v quiet -count_frames -show_entries stream=nb_read_frames -of csv=p=0 -select_streams v:0 "<file>")
   SELECT_INTERVAL=$((TOTAL_VIDEO_FRAMES / TOTAL_FRAMES))

   ffmpeg -n -i "<file>" \
     -vf "select='not(mod(n\,${SELECT_INTERVAL}))',scale=320:-1,tile=${COLS}x${ROWS}" \
     -frames:v 1 -q:v 2 "<output>.png"
   ```

   **`--interval N` (one frame every N seconds):**
   ```bash
   mkdir -p "thumbnails_<basename>"
   ffmpeg -i "<file>" -vf "fps=1/<N>" -q:v 2 "thumbnails_<basename>/frame_%04d.png"
   ```

   **`--count N` (N evenly-spaced frames):**
   ```bash
   mkdir -p "thumbnails_<basename>"
   INTERVAL=$(echo "<duration> / <N>" | bc -l)
   ffmpeg -i "<file>" -vf "fps=1/${INTERVAL}" -q:v 2 "thumbnails_<basename>/frame_%04d.png"
   ```
   Note: This may produce slightly more or fewer frames than N due to rounding. Trim extra files if needed.

6. Check exit code:
   ```bash
   if [ $? -ne 0 ]; then
     echo "ffmpeg failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Verify the timestamp is within the video duration"
     echo "  - Check that the file is a valid video: ffprobe \"<file>\""
     echo "  - For grid mode, ensure COLSxROWS format is correct (e.g., 3x3, 4x2)"
     echo "  - Try a different timestamp or mode"
   fi
   ```

7. Report results:
   - **Single frame / best:**
     ```bash
     ls -lh "<output>.png"
     ```
     Display: output path, image dimensions, file size.

   - **Grid:**
     ```bash
     ls -lh "<output>.png"
     ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 "<output>.png"
     ```
     Display: output path, grid dimensions (e.g., "3x3 grid = 960x540"), file size.

   - **Interval / count:**
     ```bash
     ls "thumbnails_<basename>/" | wc -l
     ls -lh "thumbnails_<basename>/"
     ```
     Display: folder path, number of frames extracted, total size.

8. Suggest next steps:
   > "Thumbnail extraction complete! Here are some things you can do next:
   > - Convert a clip to GIF: `/gif <file> 00:00 00:05`
   > - Get full file info: `/info <file>`
   > - Trim the video: `/trim <file> <start> <end>`
   > - Resize for a platform: `/resize <file> --platform instagram-feed`"
