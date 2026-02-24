---
description: Manipulate audio tracks in a video file — usage: /audio <file> <action> [args] [--output <path>] — actions: volume, normalize, replace, mix, fade-in, fade-out, remove
---

# /audio

Manipulate audio tracks in a video file. Supports volume adjustment, loudness normalization, track replacement, mixing, fading, and removal.

**Usage:** `/audio <file> <action> [args] [--output <path>]`

**Actions:**
| Action | Syntax | Description |
|--------|--------|-------------|
| `volume` | `/audio video.mp4 volume 2.0` | Set volume (1.0 = original, 2.0 = double, 0.5 = half) |
| `normalize` | `/audio video.mp4 normalize` | Normalize to -14 LUFS (streaming standard) using `loudnorm` |
| `replace` | `/audio video.mp4 replace track.mp3` | Replace audio track entirely |
| `mix` | `/audio video.mp4 mix track.mp3 --volume 0.3` | Mix in additional audio at specified volume |
| `fade-in` | `/audio video.mp4 fade-in 2` | Fade audio in over N seconds |
| `fade-out` | `/audio video.mp4 fade-out 3` | Fade audio out over last N seconds |
| `remove` | `/audio video.mp4 remove` | Strip all audio (mute) |

**Flags:**
| Flag | Description |
|------|-------------|
| `--output <path>` | Custom output file path |
| `--volume <float>` | Volume level for the `mix` action (0.0-1.0, default: 0.3) |

**Examples:**
- `/audio video.mp4 volume 1.5`
- `/audio video.mp4 normalize`
- `/audio video.mp4 replace narration.mp3`
- `/audio video.mp4 mix background_music.mp3 --volume 0.2`
- `/audio video.mp4 fade-in 3`
- `/audio video.mp4 fade-out 2 --output final.mp4`
- `/audio video.mp4 remove`

## LUFS Normalization Reference

| Platform | Target LUFS | True Peak |
|----------|------------|-----------|
| YouTube | -14 LUFS | -1 dBTP |
| Spotify | -14 LUFS | -1 dBTP |
| Apple Music | -16 LUFS | -1 dBTP |
| Podcast | -16 LUFS | -1 dBTP |
| Broadcast TV | -24 LUFS | -2 dBTP |

The default normalization target is -14 LUFS (streaming standard for YouTube, Spotify).

## Steps

1. Parse the required arguments (`file`, `action`) and action-specific arguments. Ask for missing required arguments.

2. Validate ffmpeg and ffprobe, check file exists:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   which ffprobe || echo "ffprobe not found. Install: brew install ffmpeg"
   ```
   If the file does not exist, report the error and stop.

3. For actions that need it (`replace`, `mix`), check the secondary audio file exists.

4. Determine the output filename prefix based on the action:
   - `volume` -> `volume_<basename>.<ext>`
   - `normalize` -> `normalized_<basename>.<ext>`
   - `replace` -> `replaced_<basename>.<ext>`
   - `mix` -> `mixed_<basename>.<ext>`
   - `fade-in` -> `fadein_<basename>.<ext>`
   - `fade-out` -> `fadeout_<basename>.<ext>`
   - `remove` -> `muted_<basename>.<ext>`

5. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise, use the prefix pattern from step 4.
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc. before the extension until a free name is found:
     ```bash
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="<prefix>_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

6. Announce: `"Applying audio <action> to <file> -> <output>"`

7. Execute the action:

   **volume:**
   ```bash
   ffmpeg -n -i "<file>" -filter:a "volume=<level>" -c:v copy "<output>"
   ```
   Validate the volume level is a positive number. Warn if >3.0 (may cause clipping/distortion).

   **normalize (two-pass loudnorm):**
   ```bash
   # Pass 1: Measure current loudness
   echo "Pass 1/2: Measuring loudness..."
   LOUDNORM_STATS=$(ffmpeg -i "<file>" -af "loudnorm=I=-14:TP=-1:LRA=11:print_format=json" -f null - 2>&1)

   # Extract measured values from JSON output
   MEASURED_I=$(echo "$LOUDNORM_STATS" | grep -A1 '"input_i"' | tail -1 | tr -d ' ",' | cut -d: -f2)
   MEASURED_TP=$(echo "$LOUDNORM_STATS" | grep -A1 '"input_tp"' | tail -1 | tr -d ' ",' | cut -d: -f2)
   MEASURED_LRA=$(echo "$LOUDNORM_STATS" | grep -A1 '"input_lra"' | tail -1 | tr -d ' ",' | cut -d: -f2)
   MEASURED_THRESH=$(echo "$LOUDNORM_STATS" | grep -A1 '"input_thresh"' | tail -1 | tr -d ' ",' | cut -d: -f2)

   # Pass 2: Apply normalization with measured values
   echo "Pass 2/2: Applying normalization to -14 LUFS..."
   ffmpeg -n -i "<file>" \
     -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=${MEASURED_I}:measured_TP=${MEASURED_TP}:measured_LRA=${MEASURED_LRA}:measured_thresh=${MEASURED_THRESH}:linear=true" \
     -c:v copy "<output>"
   ```
   Report the loudness change: `"Normalized from <MEASURED_I> LUFS to -14 LUFS"`

   **replace:**
   ```bash
   ffmpeg -n -i "<file>" -i "<track>" -map 0:v -map 1:a -c:v copy -shortest "<output>"
   ```
   Note: `-shortest` ensures the output matches the shorter of the video or audio track. Warn the user if the audio track is shorter than the video (video will be truncated) or longer (audio will be truncated).

   **mix:**
   ```bash
   # Default mix volume is 0.3 if --volume not specified
   ffmpeg -n -i "<file>" -i "<track>" \
     -filter_complex "[1:a]volume=<mix_volume>[bg];[0:a][bg]amix=inputs=2:duration=first[a]" \
     -map 0:v -map "[a]" -c:v copy "<output>"
   ```
   `duration=first` ensures the mixed output matches the original video duration.

   **fade-in:**
   ```bash
   ffmpeg -n -i "<file>" -af "afade=t=in:st=0:d=<duration>" -c:v copy "<output>"
   ```
   Validate the fade duration is less than the video duration.

   **fade-out:**
   First, get the video duration:
   ```bash
   TOTAL_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<file>")
   FADE_START=$(echo "$TOTAL_DUR - <fade_duration>" | bc)
   ```
   Then apply the fade:
   ```bash
   ffmpeg -n -i "<file>" -af "afade=t=out:st=${FADE_START}:d=<fade_duration>" -c:v copy "<output>"
   ```
   Validate the fade duration is less than the total video duration.

   **remove:**
   ```bash
   ffmpeg -n -i "<file>" -an -c:v copy "<output>"
   ```

8. Check exit code after each ffmpeg command:
   ```bash
   if [ $? -ne 0 ]; then
     echo "ffmpeg audio processing failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Verify the file has an audio track: ffprobe \"<file>\""
     echo "  - For 'replace'/'mix': ensure the audio file format is supported (MP3, AAC, WAV, FLAC)"
     echo "  - For 'volume': ensure the value is a positive number"
     echo "  - Check file integrity: ffprobe \"<file>\""
   fi
   ```

9. Report output path, file size, and duration:
   ```bash
   ls -lh "<output>"
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<output>"
   ```

   For `normalize`, also report the final loudness:
   ```bash
   echo "Final loudness:"
   ffmpeg -i "<output>" -af "loudnorm=I=-14:TP=-1:print_format=summary" -f null - 2>&1 | tail -5
   ```

10. Suggest next steps:
    > "Audio processing complete! Here are some things you can do next:
    > - Compress for sharing: `/compress <output> web`
    > - Add captions: `/add-captions <output> auto`
    > - Trim a section: `/trim <output> 00:00 01:00`
    > - Apply another audio effect: `/audio <output> fade-out 3`
    > - Build a pipeline: `/pipeline <output> compress:youtube`"
