---
description: Chain multiple video operations in sequence — usage: /pipeline <file> <step1> [step2] [step3] ... [--output <path>] — steps use command:args syntax
---

# /pipeline

Chain multiple video editing operations into a single sequential pipeline. Each step's output feeds into the next step's input automatically. Intermediate files are cleaned up after completion.

**Usage:** `/pipeline <file> <step1> [step2] [step3] ... [--output <path>]`

**Step syntax:** `<command>:<args>` where arguments use `-` instead of spaces within the args portion.

**Flags:**
| Flag | Description |
|------|-------------|
| `--output <path>` | Custom output file path for the final result |

**Available pipeline steps:**
| Step | Syntax | Maps to |
|------|--------|---------|
| `trim` | `trim:HH:MM:SS-HH:MM:SS` | `/trim <file> <start> <end>` |
| `trim-precise` | `trim-precise:HH:MM:SS-HH:MM:SS` | `/trim <file> <start> <end> --precise` |
| `compress` | `compress:<preset>` | `/compress <file> <preset>` |
| `resize` | `resize:<platform>` | `/compress <file> <platform>` (platform preset) |
| `stabilize` | `stabilize` or `stabilize:<strength>` | `/stabilize <file> [--strength <s>]` |
| `speed` | `speed:<multiplier>` | Speed change (e.g., `speed:1.5x`, `speed:0.5x`) |
| `watermark` | `watermark:<image>` or `watermark:<image>-<position>` | `/watermark <file> <image> [--position <pos>]` |
| `audio-volume` | `audio-volume:<level>` | `/audio <file> volume <level>` |
| `audio-normalize` | `audio-normalize` | `/audio <file> normalize` |
| `audio-remove` | `audio-remove` | `/audio <file> remove` |
| `audio-fadein` | `audio-fadein:<seconds>` | `/audio <file> fade-in <seconds>` |
| `audio-fadeout` | `audio-fadeout:<seconds>` | `/audio <file> fade-out <seconds>` |
| `add-captions` | `add-captions:auto` | `/add-captions <file> auto` |

**Examples:**
- `/pipeline video.mp4 trim:00:01:00-00:05:00 compress:web`
- `/pipeline raw.mp4 trim:00:00:30-00:02:00 resize:instagram-reel speed:1.5x compress:mobile`
- `/pipeline interview.mp4 stabilize trim:00:05:00-00:30:00 add-captions:auto compress:youtube`
- `/pipeline vlog.mp4 stabilize:high audio-normalize compress:web watermark:logo.png`
- `/pipeline lecture.mp4 trim:00:10:00-00:45:00 audio-normalize compress:youtube --output final_lecture.mp4`
- `/pipeline clip.mp4 speed:2x audio-remove compress:mobile`

## Steps

1. Parse the required argument (`file`) and the list of pipeline steps. Parse optional `--output` flag. Require at least 1 step. Ask if the file or steps are missing.

2. Validate ffmpeg and ffprobe:
   ```bash
   which ffmpeg || echo "ffmpeg not found. Install: brew install ffmpeg"
   which ffprobe || echo "ffprobe not found. Install: brew install ffmpeg"
   ```
   Check the source file exists. If not, report the error and stop.

3. Validate all steps are recognized commands. For each step, parse the `command:args` format and verify the command name is in the list of available pipeline steps. If any step is unrecognized, report which step is invalid and list the available steps. Stop execution.

4. For steps that reference external files (e.g., `watermark:<image>`), verify those files exist before starting the pipeline. Stop if any are missing.

5. Display the pipeline plan to the user in a clear numbered format:
   ```
   Pipeline for raw.mp4:
     1. Trim      -> 00:00:30 to 00:02:00
     2. Resize    -> instagram (1080x1920)
     3. Speed     -> 1.5x
     4. Compress  -> mobile preset

   Estimated steps: 4
   ```

6. Ask: `"Shall I run this pipeline? (4 steps)"`

7. Record the pipeline start time for total elapsed reporting.

8. Execute each step sequentially. For each step N:

   a. Determine the input file:
      - Step 1 uses the original source file.
      - Steps 2+ use the output of the previous step.

   b. Determine the intermediate output file:
      - For all steps except the last: `/tmp/pipeline_step_<N>_<basename>.mp4`
      - For the last step: use the final output filename.

   c. Announce: `"Step <N>/<total>: <command> ..."`

   d. Run the appropriate ffmpeg command for the step:

   **trim / trim-precise:**
   Parse `HH:MM:SS-HH:MM:SS` into start and end timestamps (split on `-` between two timestamp patterns).
   ```bash
   # Default (fast copy)
   ffmpeg -n -ss <start> -to <end> -i "<input>" -c copy "<step_output>"

   # With precise
   ffmpeg -n -i "<input>" -ss <start> -to <end> -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k "<step_output>"
   ```

   **compress / resize:**
   Map the preset to ffmpeg encoding settings per the `/compress` command spec:
   - `web`: `-c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k`
   - `mobile`: `-c:v libx264 -crf 28 -preset medium -c:a aac -b:a 96k`
   - `storage`: `-c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k`
   - `youtube`: scale to 1920x1080, `-c:v libx264 -crf 18 -c:a aac -b:a 192k`
   - `instagram` / `instagram-reel`: scale to 1080x1920, `-c:v libx264 -crf 23 -c:a aac -b:a 128k`
   - `tiktok`: scale to 1080x1920, `-c:v libx264 -crf 23 -c:a aac -b:a 128k`
   - `twitter`: scale to 1280x720, `-c:v libx264 -crf 23 -c:a aac -b:a 128k`
   - `email`: scale to 1280x720, `-c:v libx264 -crf 28 -c:a aac -b:a 96k`

   **stabilize:**
   Two-pass vidstab process. Map optional strength arg (`low`=5, `medium`=15, `high`=30, default=15):
   ```bash
   TRANSFORMS="/tmp/pipeline_transforms_<N>_$$.trf"
   ffmpeg -i "<input>" -vf vidstabdetect=shakiness=10:accuracy=15:result="$TRANSFORMS" -f null -
   ffmpeg -n -i "<input>" -vf "vidstabtransform=input=$TRANSFORMS:smoothing=<val>:zoom=5:interpol=bicubic,unsharp=5:5:0.8:3:3:0.4" -c:v libx264 -crf 18 -c:a copy "<step_output>"
   rm -f "$TRANSFORMS"
   ```

   **speed:**
   Parse the multiplier (e.g., `1.5x` -> 1.5, `2x` -> 2, `0.5x` -> 0.5). Compute the PTS divisor and audio tempo:
   ```bash
   # Video: setpts=PTS/<speed> (e.g., 1.5x -> PTS/1.5)
   # Audio: atempo=<speed> (atempo supports 0.5-2.0; chain multiple for extremes)
   ffmpeg -n -i "<input>" \
     -filter_complex "[0:v]setpts=PTS/<speed>[v];[0:a]atempo=<speed>[a]" \
     -map "[v]" -map "[a]" "<step_output>"
   ```
   For speed > 2.0, chain atempo filters: `atempo=2.0,atempo=<remaining>`.
   For speed < 0.5, chain atempo filters: `atempo=0.5,atempo=<remaining>`.

   **watermark:**
   Parse `watermark:<image>` or `watermark:<image>-<position>`:
   ```bash
   ffmpeg -n -i "<input>" -i "<image>" \
     -filter_complex "[1:v]scale=iw*0.15:-1,format=rgba,colorchannelmixer=aa=0.7[wm];[0:v][wm]overlay=W-w-20:H-h-20[v]" \
     -map "[v]" -map 0:a -c:a copy "<step_output>"
   ```

   **audio-volume:**
   ```bash
   ffmpeg -n -i "<input>" -filter:a "volume=<level>" -c:v copy "<step_output>"
   ```

   **audio-normalize:**
   Two-pass loudnorm:
   ```bash
   STATS=$(ffmpeg -i "<input>" -af "loudnorm=I=-14:TP=-1:LRA=11:print_format=json" -f null - 2>&1)
   # Extract measured values, then apply
   ffmpeg -n -i "<input>" -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=...:measured_TP=...:measured_LRA=...:measured_thresh=...:linear=true" -c:v copy "<step_output>"
   ```

   **audio-remove:**
   ```bash
   ffmpeg -n -i "<input>" -an -c:v copy "<step_output>"
   ```

   **audio-fadein:**
   ```bash
   ffmpeg -n -i "<input>" -af "afade=t=in:st=0:d=<seconds>" -c:v copy "<step_output>"
   ```

   **audio-fadeout:**
   ```bash
   TOTAL_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<input>")
   FADE_START=$(echo "$TOTAL_DUR - <seconds>" | bc)
   ffmpeg -n -i "<input>" -af "afade=t=out:st=${FADE_START}:d=<seconds>" -c:v copy "<step_output>"
   ```

   **add-captions:**
   Delegates to the `/add-captions` command logic with the current input file.

   e. **Check exit code after each step:**
   ```bash
   if [ $? -ne 0 ]; then
     echo "Pipeline FAILED at step <N>/<total>: <command>"
     echo "The last successful output is: <previous_step_output or original file>"
     echo ""
     echo "You can resume from the last successful output:"
     echo "  /pipeline <last_output> <remaining_steps>"
     # Do NOT clean up — keep intermediate files for recovery
     exit 1
   fi
   ```
   If any step fails, stop the pipeline immediately. Report which step failed, preserve the last successful output, and suggest how to resume.

   f. Report step completion: `"Step <N>/<total> complete (<elapsed>s)"`

9. Determine the final output filename:
   - If `--output <path>` was provided, rename the last step's output to that path.
   - Otherwise: `pipeline_<source-basename>.<ext>`
   - **Collision handling:**
     ```bash
     OUTPUT="pipeline_<basename>.<ext>"
     COUNTER=2
     while [ -f "$OUTPUT" ]; do
       OUTPUT="pipeline_<basename>_${COUNTER}.<ext>"
       COUNTER=$((COUNTER + 1))
     done
     ```
   - Move the last intermediate file to the final output path:
     ```bash
     mv "<last_step_output>" "<final_output>"
     ```

10. Clean up all intermediate files:
    ```bash
    rm -f /tmp/pipeline_step_*_<basename>.mp4
    rm -f /tmp/pipeline_transforms_*_$$.trf
    ```

11. Report final results:
    ```bash
    ORIG_SIZE=$(stat -f%z "<original_file>" 2>/dev/null || stat -c%s "<original_file>")
    FINAL_SIZE=$(stat -f%z "<final_output>" 2>/dev/null || stat -c%s "<final_output>")
    FINAL_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "<final_output>")
    ```

    Display a summary:
    ```
    Pipeline complete! (N steps in <total_elapsed>s)

    Original:  <original_file> (<orig_size>)
    Output:    <final_output> (<final_size>)
    Duration:  <final_duration>s
    Size change: <orig_size> -> <final_size>

    Steps executed:
      1. Trim       00:00:30-00:02:00  (2.1s)
      2. Resize     instagram           (8.4s)
      3. Speed      1.5x                (3.2s)
      4. Compress   mobile              (5.7s)
    ```

12. Suggest next steps:
    > "Pipeline complete! Here are some things you can do next:
    > - Add a title card: `/title-card "My Video" && /merge title_card_output.mp4 <output> --transition fade`
    > - Add an end card: `/end-card --text "Subscribe!" --theme wad && /merge <output> end_card_output.mp4 --transition fade`
    > - Apply a watermark: `/watermark <output> logo.png`
    > - Get video info: `/info <output>`"
