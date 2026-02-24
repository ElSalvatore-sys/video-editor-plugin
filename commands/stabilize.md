---
description: Stabilize shaky video using vidstab (two-pass) — usage: /stabilize <file> [--strength low|medium|high] [--zoom N] [--crop keep|fill] [--output <path>]
---

# /stabilize

Stabilize shaky handheld video using ffmpeg's vidstab filters. This is a two-pass process: first analyzing motion, then applying correction.

**Usage:** `/stabilize <file> [options]`

**Flags:**
| Flag | Description | Default |
|------|-------------|---------|
| `--strength <level>` | `low` (subtle, smoothing=5), `medium` (smoothing=15), `high` (aggressive, smoothing=30) | `medium` |
| `--zoom <percent>` | Percentage to zoom in to hide black borders (0-20) | auto (5-10%) |
| `--crop <mode>` | `keep` (keep original borders, may show black edges) or `fill` (zoom to fill frame) | `fill` |
| `--output <path>` | Custom output file path | `stabilized_<filename>` |

**Strength Reference:**
| Level | Smoothing | Best for |
|-------|-----------|----------|
| `low` | 5 | Slight handheld shake, vlog-style |
| `medium` | 15 | General handheld footage |
| `high` | 30 | Very shaky footage, walking/running |

**Examples:**
- `/stabilize shaky_video.mp4`
- `/stabilize handheld.mp4 --strength high --zoom 5`
- `/stabilize walking.mov --strength low --crop keep`
- `/stabilize interview.mp4 --strength medium --output stable_interview.mp4`

## Steps

1. Parse the required argument (`file`) and optional flags (`--strength`, `--zoom`, `--crop`, `--output`). Ask for the file if missing. Apply defaults: strength=medium, crop=fill.

2. Validate ffmpeg and check file exists:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   ```
   If the file does not exist, report the error and stop.

3. Check that vidstab is available:
   ```bash
   ffmpeg -filters 2>/dev/null | grep vidstab
   ```
   If vidstab is not found:
   > "vidstab filter not found. Install ffmpeg with vidstab support:
   > - macOS: `brew install ffmpeg` (Homebrew's build includes vidstab)
   > - Linux: `sudo apt install ffmpeg libvidstab-dev` or build from source with `--enable-libvidstab`"

   Stop execution if vidstab is unavailable.

4. Map strength to smoothing value:
   - `low` -> `SMOOTHING=5`
   - `medium` -> `SMOOTHING=15`
   - `high` -> `SMOOTHING=30`

5. Determine zoom value:
   - If `--zoom` was provided, use that value.
   - If `--crop fill`, default to `ZOOM=5` (5% zoom to hide borders).
   - If `--crop keep`, default to `ZOOM=0`.

6. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise: `stabilized_<source-basename>.<ext>`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc. before the extension until a free name is found:
     ```bash
     OUTPUT="stabilized_<basename>.<ext>"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="stabilized_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

7. Create a unique transform file to avoid collisions:
   ```bash
   TRANSFORMS="/tmp/vidstab_transforms_$$.trf"
   ```

8. Announce: `"Stabilizing <file> (strength: <strength>, zoom: <zoom>%) — this is a two-pass process..."`

9. **Pass 1 — Analyze motion:**
   ```bash
   echo "Pass 1/2: Analyzing motion..."
   ffmpeg -i "<file>" -vf vidstabdetect=shakiness=10:accuracy=15:result="$TRANSFORMS" -f null -
   ```
   Check exit code:
   ```bash
   if [ $? -ne 0 ]; then
     echo "Pass 1 (motion analysis) failed."
     echo "Common fixes:"
     echo "  - Check that the file is not corrupted: ffprobe \"<file>\""
     echo "  - Ensure vidstab is properly installed: ffmpeg -filters | grep vidstab"
     rm -f "$TRANSFORMS"
     exit 1
   fi
   ```

10. **Pass 2 — Apply stabilization:**
    ```bash
    echo "Pass 2/2: Applying stabilization..."
    ffmpeg -n -i "<file>" \
      -vf "vidstabtransform=input=$TRANSFORMS:smoothing=<SMOOTHING>:zoom=<ZOOM>:interpol=bicubic,unsharp=5:5:0.8:3:3:0.4" \
      -c:v libx264 -crf 18 -preset medium -c:a copy "<output>"
    ```

    **Hardware acceleration note (macOS Apple Silicon):**
    Check if running on Apple Silicon:
    ```bash
    [[ "$(uname -m)" == "arm64" && "$(uname)" == "Darwin" ]]
    ```
    If yes, you can replace `-c:v libx264 -crf 18 -preset medium` with `-c:v h264_videotoolbox -q:v 50` for ~5-10x faster encoding. Mention this to the user:
    > "Detected Apple Silicon. Want to use hardware acceleration for faster encoding? (Slightly larger file size but ~5-10x faster.)"

    Check exit code:
    ```bash
    if [ $? -ne 0 ]; then
      echo "Pass 2 (stabilization) failed. Check the error output above."
      echo "Common fixes:"
      echo "  - Try a lower --strength value"
      echo "  - Try increasing --zoom to handle large motion correction"
      echo "  - Check source file: ffprobe \"<file>\""
      rm -f "$TRANSFORMS"
      exit 1
    fi
    ```

11. Clean up the transform file:
    ```bash
    rm -f "$TRANSFORMS"
    ```

12. Report output path and file size:
    ```bash
    ls -lh "<output>"
    ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<output>"
    ```

13. Suggest next steps:
    > "Stabilization complete! Here are some things you can do next:
    > - Compress for sharing: `/compress <output> web`
    > - Trim to the best section: `/trim <output> 00:00 01:00`
    > - Add captions: `/add-captions <output> auto`
    > - Apply a watermark: `/watermark <output> logo.png`"
