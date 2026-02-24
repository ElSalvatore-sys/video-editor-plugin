---
description: Merge video clips with optional transitions — usage: /merge <file1> <file2> [...] [--transition fade|dissolve|wipe|slide] [--duration <seconds>] [--output <path>]
---

# /merge

Concatenate two or more video clips, optionally with cross-fade transitions between them (both video AND audio).

**Usage:** `/merge <file1> <file2> [file3 ...] [--transition <type>] [--duration <seconds>] [--output <path>]`

**Transition types:** `fade`, `dissolve`, `wipe`, `slide` (default: cut -- no transition)

**Flags:**
| Flag | Description |
|------|-------------|
| `--transition <type>` | Transition effect between clips |
| `--duration <seconds>` | Transition duration in seconds (default: 1) |
| `--output <path>` | Custom output file path |

**Examples:**
- `/merge clip1.mp4 clip2.mp4 clip3.mp4`
- `/merge intro.mp4 main.mp4 outro.mp4 --transition fade`
- `/merge a.mp4 b.mp4 --transition dissolve --duration 2`
- `/merge clip1.mp4 clip2.mp4 --transition wipe --output final.mp4`

## Steps

1. Parse file list and optional `--transition`, `--duration`, `--output` flags. Require at least 2 files. Ask if fewer than 2 provided.

2. Validate ffmpeg and ffprobe, verify all files exist:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   ```
   If any file is missing, list which files were not found and stop.

3. Check stream compatibility with ffprobe for each file:
   ```bash
   ffprobe -v quiet -show_entries stream=codec_name,width,height,r_frame_rate,codec_type -of csv=p=0 "<file>"
   ```
   Warn if different resolutions, codecs, or frame rates. Note that:
   - No-transition concat with `-c copy` requires matching codecs/resolution.
   - Transition mode always re-encodes, so mismatches are handled automatically.

4. Get duration of each clip:
   ```bash
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<clip>"
   ```
   Store durations as an array for offset calculations.

5. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise: `merged_<first-basename>.<ext>`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc.:
     ```bash
     OUTPUT="merged_<basename>.<ext>"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="merged_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

6. Announce: `"Merging N clips -> <output>"` (with transition type and duration if specified).

7. Run:

   **No transition (fast concat):**
   ```bash
   # Write file list with absolute paths
   FILELIST="/tmp/video_editor_filelist_$$.txt"
   for f in <files>; do
     echo "file '$(cd "$(dirname "$f")" && pwd)/$(basename "$f")'" >> "$FILELIST"
   done

   ffmpeg -n -f concat -safe 0 -i "$FILELIST" -c copy "<output>"

   # Check exit code
   if [ $? -ne 0 ]; then
     echo "Concat failed. This usually means the clips have different codecs or resolutions."
     echo "Fix: Re-encode all clips to the same format first, or use --transition which handles this automatically."
   fi

   rm -f "$FILELIST"
   ```

   **With transition (xfade + acrossfade -- BOTH video AND audio):**

   Set transition duration `TDUR` from `--duration` flag (default: 1).

   xfade transition name mapping:
   - `fade` -> `fade`
   - `dissolve` -> `dissolve`
   - `wipe` -> `wipeleft`
   - `slide` -> `slideleft`

   **For 2 clips:**
   ```bash
   # offset = duration(clip1) - TDUR
   OFFSET=$(echo "<dur1> - <TDUR>" | bc)

   ffmpeg -n -i "<clip1>" -i "<clip2>" \
     -filter_complex "[0][1]xfade=transition=<xfade_name>:duration=<TDUR>:offset=${OFFSET}[v]; \
                      [0:a][1:a]acrossfade=d=<TDUR>[a]" \
     -map "[v]" -map "[a]" "<output>"
   ```

   **For 3 clips:**
   ```bash
   # offset1 = duration(clip1) - TDUR
   # offset2 = offset1 + duration(clip2) - TDUR
   OFFSET1=$(echo "<dur1> - <TDUR>" | bc)
   OFFSET2=$(echo "$OFFSET1 + <dur2> - <TDUR>" | bc)

   ffmpeg -n -i "<clip1>" -i "<clip2>" -i "<clip3>" \
     -filter_complex \
       "[0][1]xfade=transition=<xfade_name>:duration=<TDUR>:offset=${OFFSET1}[v01]; \
        [v01][2]xfade=transition=<xfade_name>:duration=<TDUR>:offset=${OFFSET2}[v]; \
        [0:a][1:a]acrossfade=d=<TDUR>[a01]; \
        [a01][2:a]acrossfade=d=<TDUR>[a]" \
     -map "[v]" -map "[a]" "<output>"
   ```

   **For N clips (general pattern):**
   Build the filter graph programmatically. For N clips:

   Video chain:
   ```
   [0][1]xfade=transition=<type>:duration=<TDUR>:offset=<offset1>[v01];
   [v01][2]xfade=transition=<type>:duration=<TDUR>:offset=<offset2>[v02];
   ...
   [v{N-3}{N-2}][{N-1}]xfade=transition=<type>:duration=<TDUR>:offset=<offset{N-1}>[v]
   ```

   Audio chain:
   ```
   [0:a][1:a]acrossfade=d=<TDUR>[a01];
   [a01][2:a]acrossfade=d=<TDUR>[a02];
   ...
   [a{N-3}{N-2}][{N-1}:a]acrossfade=d=<TDUR>[a]
   ```

   Offset calculation:
   - `offset[i]` = cumulative duration of clips 0..i minus `TDUR * i`
   - In other words: `offset[i] = sum(dur[0]..dur[i]) - TDUR * i`

   The final video label is `[v]` and the final audio label is `[a]`. Map both:
   ```bash
   ffmpeg -n -i clip1 -i clip2 ... -i clipN \
     -filter_complex "<full_filter_graph>" \
     -map "[v]" -map "[a]" "<output>"
   ```

   **Hardware acceleration note (macOS Apple Silicon):**
   When using transitions (which require re-encoding), check for Apple Silicon:
   ```bash
   [[ "$(uname -m)" == "arm64" && "$(uname)" == "Darwin" ]]
   ```
   If detected, you can add `-c:v h264_videotoolbox -q:v 50` after the map flags for ~5-10x faster encoding. Mention this to the user as an option.

8. Check exit code:
   ```bash
   if [ $? -ne 0 ]; then
     echo "Merge failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Ensure all clips have audio tracks (acrossfade requires audio in every clip)"
     echo "  - If a clip has no audio, add a silent track first:"
     echo "    ffmpeg -i clip.mp4 -f lavfi -i anullsrc=r=44100:cl=stereo -shortest -c:v copy -c:a aac clip_with_audio.mp4"
     echo "  - Check that all clips are valid: ffprobe <clip>"
     echo "  - Try without --transition to test basic concat"
   fi
   ```

9. Clean up temp files:
   ```bash
   rm -f /tmp/video_editor_filelist_$$.txt
   ```

10. Report output path, file size, and total duration:
    ```bash
    ls -lh "<output>"
    ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<output>"
    ```

11. Suggest next steps:
    > "Merge complete! Here are some things you can do next:
    > - Add captions: `/add-captions <output> auto`
    > - Compress for sharing: `/compress <output> youtube`
    > - Add a title card: `/title-card "My Video" && /merge title_card_output.mp4 <output> --transition fade`
    > - Trim the result: `/trim <output> 00:00 02:00`"
