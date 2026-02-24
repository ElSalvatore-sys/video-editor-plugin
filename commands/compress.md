---
description: Compress or re-encode a video with quality presets, platform targets, or a target file size — usage: /compress <file> <preset|platform|size> [--output <path>]
---

# /compress

Re-encode a video to reduce file size. Supports quality presets, platform-specific presets with automatic resizing, and target file size with two-pass encoding.

**Usage:** `/compress <file> <preset|platform|size> [--output <path>]`

**Quality Presets:**
| Preset | CRF | Audio | Best for |
|--------|-----|-------|----------|
| `web` | 23 | 128k | Streaming, general web |
| `mobile` | 28 | 96k | Small file, mobile viewing |
| `storage` | 18 | 192k | High quality archive |

**Platform Presets (auto-resizes to platform specs):**
| Platform | Resolution | CRF | Audio | Notes |
|----------|-----------|-----|-------|-------|
| `youtube` | 1920x1080 | 18 | AAC 192k | Landscape, high quality |
| `instagram` | 1080x1920 | 23 | AAC 128k | Vertical (9:16), Stories/Reels |
| `tiktok` | 1080x1920 | 23 | AAC 128k | Vertical (9:16) |
| `twitter` | 1280x720 | 23 | AAC 128k | Max 512MB file size |
| `email` | 1280x720 | 28 | AAC 96k | Target ~25MB, lower quality |

**Target size:** e.g. `50MB`, `10MB` -- triggers two-pass encoding.

**Flags:**
| Flag | Description |
|------|-------------|
| `--output <path>` | Custom output file path |

**Examples:**
- `/compress video.mp4 web`
- `/compress recording.mov youtube`
- `/compress interview.mp4 instagram --output reel.mp4`
- `/compress lecture.mp4 50MB`
- `/compress vlog.mp4 email`

## Steps

1. Parse `file` and `preset`/`platform`/`size`, and optional `--output`. Ask if missing.

2. Validate ffmpeg and ffprobe, check file exists:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   which ffprobe || echo "ffprobe not found. Install: brew install ffmpeg"
   ```
   If the file does not exist, report the error and stop.

3. Get source video info:
   ```bash
   ffprobe -v quiet -show_entries format=duration,size -show_entries stream=width,height,codec_name -of json "<file>"
   ```
   Extract duration (for two-pass), and width/height (for scale decisions).

4. Determine output filename:
   - If `--output <path>` was provided, use that path.
   - Otherwise: `compressed_<source-basename>.<ext>`
   - **Collision handling:** Check if the output file already exists. If it does, append `_2`, `_3`, etc.:
     ```bash
     OUTPUT="compressed_<basename>.<ext>"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="compressed_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```

5. Announce: `"Compressing <file> with <preset/platform/size> -> <output>"`

6. Detect Apple Silicon for hardware acceleration:
   ```bash
   HW_ACCEL=false
   if [[ "$(uname -m)" == "arm64" && "$(uname)" == "Darwin" ]]; then
     HW_ACCEL=true
   fi
   ```
   If Apple Silicon detected, inform the user:
   > "Detected Apple Silicon. Using `h264_videotoolbox` for ~5-10x faster encoding. To force software encoding, let me know."

7. Run the appropriate encoding:

   **Quality Preset (web/mobile/storage):**
   ```bash
   # Software encoding (default)
   ffmpeg -n -i "<file>" -c:v libx264 -crf <crf> -preset medium -c:a aac -b:a <abitrate> "<output>"

   # Hardware accelerated (Apple Silicon)
   ffmpeg -n -i "<file>" -c:v h264_videotoolbox -q:v <vtq> -c:a aac -b:a <abitrate> "<output>"
   ```
   VideoToolbox quality mapping: web -> `-q:v 60`, mobile -> `-q:v 75`, storage -> `-q:v 40`

   **Platform Preset (youtube/instagram/tiktok/twitter/email):**

   Determine the scale filter based on source vs. target resolution. Only scale if the source is different from the target. Use `scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2` to handle aspect ratio correctly.

   ```bash
   # YouTube (1920x1080)
   ffmpeg -n -i "<file>" \
     -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" \
     -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k "<output>"

   # Instagram / TikTok (1080x1920 vertical)
   ffmpeg -n -i "<file>" \
     -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" \
     -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k "<output>"

   # Twitter (1280x720)
   ffmpeg -n -i "<file>" \
     -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black" \
     -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k "<output>"

   # Email (1280x720, aggressive compression)
   ffmpeg -n -i "<file>" \
     -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black" \
     -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 96k "<output>"
   ```

   For hardware acceleration on platform presets, replace `-c:v libx264 -crf <crf> -preset medium` with `-c:v h264_videotoolbox -q:v <vtq>` using the quality mapping above.

   For Twitter: after encoding, check file size. If >512MB, warn the user and suggest a higher CRF or smaller resolution.
   For Email: after encoding, check file size. If >25MB, warn the user and suggest increasing CRF or reducing resolution further.

   **Target size (two-pass):**
   ```bash
   # Calculate video bitrate
   DURATION=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<file>")
   TARGET_BYTES=$((target_mb * 1024 * 1024))
   AUDIO_BITRATE=128  # kbps
   VIDEO_BITRATE=$(( (TARGET_BYTES * 8 / DURATION_INT / 1000) - AUDIO_BITRATE ))

   # Ensure video bitrate is positive
   if [ "$VIDEO_BITRATE" -le 0 ]; then
     echo "Error: Target size is too small for the video duration. Need at least $((AUDIO_BITRATE * DURATION_INT / 8 / 1024))MB for audio alone."
     exit 1
   fi

   # Pass 1
   ffmpeg -y -i "<file>" -c:v libx264 -b:v ${VIDEO_BITRATE}k -pass 1 -an -f null /dev/null

   # Pass 2
   ffmpeg -n -i "<file>" -c:v libx264 -b:v ${VIDEO_BITRATE}k -pass 2 -c:a aac -b:a ${AUDIO_BITRATE}k "<output>"

   # Clean up two-pass log files
   rm -f ffmpeg2pass-0.log ffmpeg2pass-0.log.mbtree
   ```

8. Check exit code after each ffmpeg command:
   ```bash
   if [ $? -ne 0 ]; then
     echo "ffmpeg encoding failed. Check the error output above."
     echo "Common fixes:"
     echo "  - Try a different preset or higher CRF value"
     echo "  - Check source file integrity: ffprobe \"<file>\""
     echo "  - For target size: try a larger target (current may be too small for duration)"
     # Clean up two-pass logs if they exist
     rm -f ffmpeg2pass-0.log ffmpeg2pass-0.log.mbtree
   fi
   ```

9. Report output path, new file size, original size, and compression ratio:
   ```bash
   ORIG_SIZE=$(stat -f%z "<file>" 2>/dev/null || stat -c%s "<file>")
   NEW_SIZE=$(stat -f%z "<output>" 2>/dev/null || stat -c%s "<output>")
   RATIO=$(echo "scale=1; $ORIG_SIZE / $NEW_SIZE" | bc)
   echo "Compressed: $(numfmt --to=iec $ORIG_SIZE) -> $(numfmt --to=iec $NEW_SIZE) (${RATIO}x smaller)"
   ```

10. Suggest next steps:
    > "Compression complete! Here are some things you can do next:
    > - Add captions: `/add-captions <output> auto`
    > - Trim a section: `/trim <output> 00:00 01:00`
    > - Create a title card: `/title-card "My Video"`
    > - Merge with other clips: `/merge intro.mp4 <output>`"
