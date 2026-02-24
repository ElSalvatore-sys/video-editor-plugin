---
description: Transcribe a video or audio file to an SRT subtitle file using Whisper — usage: /transcribe <file> [--language en]
---

# /transcribe

Transcribe speech in a video or audio file to an `.srt` subtitle file using OpenAI Whisper.

**Usage:** `/transcribe <file> [--language <code>]`

**Examples:**
- `/transcribe interview.mp4`
- `/transcribe talk.mp4 --language de`

## Steps

1. Parse `file` and optional `--language` (default: auto-detect).

2. Check Whisper is installed:
   ```bash
   which whisper || python3 -m whisper --help 2>/dev/null
   ```
   If not found:
   > "Whisper is not installed. Install it with: `pip install openai-whisper`
   > Then re-run /transcribe."
   Stop.

3. Check ffmpeg is installed (Whisper uses it internally).

4. Announce: "Transcribing `<file>` → `<name>.srt`"

5. Run:
   ```bash
   whisper "<file>" --model medium --output_format srt --output_dir "$(dirname '<file>')" [--language <code>]
   ```
   The `medium` model balances speed and accuracy. For long files suggest `--model large` for better quality.
   Whisper names the output using the input's basename without extension (e.g., `interview.mp4` → `interview.srt`).
   Construct the expected path as:
   ```bash
   SRT_FILE="$(dirname '<file>')/$(basename '<file>' | sed 's/\.[^.]*$//' ).srt"
   ```

6. Report the output .srt file path (`$SRT_FILE`).

7. Offer next step:
   > "Transcription complete. Want me to burn these captions into the video? Run:
   > `/add-captions <file> <name>.srt`"
