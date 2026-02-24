---
description: Transcribe a video or audio file to an SRT subtitle file using Whisper — usage: /transcribe <file> [--language en] [--model medium] [--output <path>]
---

# /transcribe

Transcribe speech in a video or audio file to an `.srt` subtitle file using OpenAI Whisper.

**Usage:** `/transcribe <file> [--language <code>] [--model <name>] [--output <path>]`

**Flags:**
| Flag | Description |
|------|-------------|
| `--language <code>` | Language code (e.g., `en`, `de`, `es`). Default: auto-detect |
| `--model <name>` | Whisper model to use (see table below). Default: `medium` |
| `--output <path>` | Custom output SRT file path |

**Whisper Model Reference:**
| Model | Parameters | Speed | Quality | VRAM | Best for |
|-------|-----------|-------|---------|------|----------|
| `tiny` | 39M | ~32x realtime | Low | ~1GB | Quick drafts, testing |
| `base` | 74M | ~16x realtime | Fair | ~1GB | Fast transcription, clear audio |
| `small` | 244M | ~6x realtime | Good | ~2GB | Good balance for short clips |
| `medium` | 769M | ~2x realtime | Great | ~5GB | **Default** -- best balance of speed/quality |
| `large-v3` | 1550M | ~1x realtime | Best | ~10GB | Maximum accuracy, multiple languages |
| `turbo` | 809M | ~8x realtime | Great | ~6GB | Fast + high quality (recommended if available) |

**Speed vs. Quality guide:**
- For a **5-minute video**: `tiny` ~10s, `base` ~20s, `small` ~50s, `medium` ~2.5min, `large-v3` ~5min
- For **non-English** content: use `medium` or `large-v3` for best results
- For **noisy audio**: use `medium` or `large-v3`
- For **quick previews**: use `tiny` or `base`
- `turbo` offers `large-v3` quality at ~8x speed -- use if your Whisper version supports it

**Examples:**
- `/transcribe interview.mp4`
- `/transcribe talk.mp4 --language de`
- `/transcribe podcast.mp3 --model large-v3`
- `/transcribe lecture.mp4 --model turbo --output lecture_subs.srt`

## Steps

1. Parse `file` and optional flags (`--language`, `--model`, `--output`). Default model is `medium`.

2. Check Whisper is installed:
   ```bash
   which whisper || python3 -m whisper --help 2>/dev/null
   ```
   If not found:
   > "Whisper is not installed. Install it with:
   > ```
   > pip install openai-whisper
   > ```
   > For the `turbo` model, make sure you have the latest version:
   > ```
   > pip install --upgrade openai-whisper
   > ```
   > Then re-run `/transcribe`."
   Stop.

3. Check ffmpeg is installed (Whisper uses it internally):
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   ```

4. Verify the input file exists. If not, report error and stop.

5. Determine output path:
   - If `--output <path>` was provided, use that path.
   - Otherwise, Whisper names the output using the input's basename without extension.
     Construct the expected path:
     ```bash
     SRT_FILE="$(dirname '<file>')/$(basename '<file>' | sed 's/\.[^.]*$//').srt"
     ```
   - **Collision handling:** If using `--output` and the file already exists, append `_2`, `_3`, etc.:
     ```bash
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="<basename>_${COUNTER}.srt"
       COUNTER=$((COUNTER + 1))
     done
     ```
   - When not using `--output`, Whisper controls the output name. If the file already exists, Whisper will overwrite it -- warn the user.

6. Announce:
   `"Transcribing <file> with Whisper (<model> model) -> <output>"`
   If using a large model, add: `"This may take a while for longer files."`

7. Run Whisper:

   **If `--output` is specified** (need to control output path):
   ```bash
   # Whisper outputs to a directory, so use a temp dir and move
   WHISPER_TMPDIR="/tmp/whisper_output_$$"
   mkdir -p "$WHISPER_TMPDIR"
   whisper "<file>" --model <model> --output_format srt --output_dir "$WHISPER_TMPDIR" [--language <code>]
   ```
   Then move the result:
   ```bash
   WHISPER_OUT="$WHISPER_TMPDIR/$(basename '<file>' | sed 's/\.[^.]*$//').srt"
   mv "$WHISPER_OUT" "<output>"
   rm -rf "$WHISPER_TMPDIR"
   ```

   **If `--output` is not specified:**
   ```bash
   whisper "<file>" --model <model> --output_format srt --output_dir "$(dirname '<file>')" [--language <code>]
   ```

8. Check exit code:
   ```bash
   if [ $? -ne 0 ]; then
     echo "Whisper transcription failed. Check the error output above."
     echo "Common fixes:"
     echo "  - If out of memory, try a smaller model: --model small or --model base"
     echo "  - If the model is not found, update Whisper: pip install --upgrade openai-whisper"
     echo "  - Check that the file has an audio track: ffprobe \"<file>\""
     echo "  - For very long files (>2hrs), consider splitting first: /trim <file> 0:00 1:00:00"
   fi
   ```

9. Verify the output SRT file was created:
   ```bash
   if [ ! -f "$SRT_FILE" ]; then
     echo "Error: Expected output file not found at $SRT_FILE"
     echo "Check Whisper output above for the actual output location."
   fi
   ```

10. Report the output SRT file path and a preview of the first few lines:
    ```bash
    echo "Transcription saved to: $SRT_FILE"
    echo "Preview (first 10 lines):"
    head -10 "$SRT_FILE"
    echo "..."
    wc -l "$SRT_FILE" | awk '{print $1 " total lines"}'
    ```

11. Suggest next steps:
    > "Transcription complete! Here are some things you can do next:
    > - Burn captions into the video: `/add-captions <file> <srt_file>`
    > - Burn with custom styling: `/add-captions <file> <srt_file> --style tiktok`
    > - Edit the SRT file to fix any errors, then burn:
    >   Open `<srt_file>` in a text editor, fix timestamps/text, then run `/add-captions`
    > - Extract just the audio: `/extract <file> audio`"
