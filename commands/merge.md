---
description: Merge video clips with optional transitions — usage: /merge <file1> <file2> [...] [--transition fade|dissolve|wipe|slide]
---

# /merge

Concatenate two or more video clips, optionally with transitions between them.

**Usage:** `/merge <file1> <file2> [file3 ...] [--transition <type>]`

**Transition types:** `fade`, `dissolve`, `wipe`, `slide` (default: cut — no transition)

**Examples:**
- `/merge clip1.mp4 clip2.mp4 clip3.mp4`
- `/merge intro.mp4 main.mp4 outro.mp4 --transition fade`

## Steps

1. Parse file list and optional `--transition` flag. Require at least 2 files.

2. Validate ffmpeg, verify all files exist.

3. Check stream compatibility with ffprobe:
   ```bash
   ffprobe -v quiet -show_entries stream=codec_name,width,height,r_frame_rate -of csv=p=0 "<file>"
   ```
   Warn if different resolutions/codecs — re-encoding will be required.

4. Announce: "Merging N clips → `merged_output.<ext>`" (with transition type if specified)

5. Run:

   **No transition (fast concat):**
   ```bash
   # Write /tmp/video_editor_filelist.txt with absolute paths:
   # file '/abs/path/clip1.mp4'
   # file '/abs/path/clip2.mp4'
   ffmpeg -f concat -safe 0 -i /tmp/video_editor_filelist.txt -c copy "merged_output.mp4"
   ```

   **With transition (xfade filter — requires re-encode):**
   For N clips, chain xfade filters. Example for 3 clips with 1s fade:
   ```bash
   # Get durations first with ffprobe
   # offset1 = duration(clip1) - 1
   # offset2 = offset1 + duration(clip2) - 1
   ffmpeg -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 \
     -filter_complex "[0][1]xfade=transition=fade:duration=1:offset=<offset1>[v01]; \
                      [v01][2]xfade=transition=fade:duration=1:offset=<offset2>[v]" \
     -map "[v]" "merged_output.mp4"
   ```

   xfade transition map: fade→fade, dissolve→dissolve, wipe→wipeleft, slide→slideleft

6. Clean up: `rm /tmp/video_editor_filelist.txt`

7. Report output path and file size.
