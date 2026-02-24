---
description: Compress or re-encode a video with quality presets or a target file size — usage: /compress <file> <preset|size>
---

# /compress

Re-encode a video to reduce file size.

**Usage:** `/compress <file> <preset|size>`

**Presets:**
| Preset | CRF | Audio | Best for |
|--------|-----|-------|----------|
| `web` | 23 | 128k | Streaming, social |
| `mobile` | 28 | 96k | Small file |
| `storage` | 18 | 192k | High quality archive |

**Target size:** e.g. `50MB`, `10MB` — triggers two-pass encoding.

## Steps

1. Parse `file` and `preset` or `size`. Ask if missing.

2. Validate ffmpeg, check file exists.

3. Get duration (needed for two-pass):
   ```bash
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<file>"
   ```

4. Announce: "Compressing `<file>` with `<preset>` preset → `compressed_<filename>`"

5. Run:

   **Preset:**
   ```bash
   ffmpeg -i "<file>" -c:v libx264 -crf <crf> -preset medium -c:a aac -b:a <abitrate> "compressed_<filename>"
   ```
   CRF: web→23, mobile→28, storage→18 | Audio: web→128k, mobile→96k, storage→192k

   **Target size (two-pass):**
   ```bash
   # video_bitrate_kbps = (target_bytes * 8 / duration_secs / 1000) - 128
   ffmpeg -i "<file>" -c:v libx264 -b:v <vbitrate>k -pass 1 -an -f null /dev/null
   ffmpeg -i "<file>" -c:v libx264 -b:v <vbitrate>k -pass 2 -c:a aac -b:a 128k "compressed_<filename>"
   ```

6. Report output path, new size, and compression ratio.
