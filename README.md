# video-editor v2

A Claude Code skill for AI-assisted video editing and creation. 19 slash commands powered by three engines.

| Engine | Purpose |
|--------|---------|
| **ffmpeg** | Edit and process existing footage — trim, compress, merge, resize, stabilize, speed, watermark, audio, GIFs, thumbnails |
| **Remotion** | Create programmatic video content — title cards, lower thirds, end cards, teasers with animations and transitions |
| **Whisper** | Speech-to-text transcription and auto-captioning |

## Requirements

| Tool | Install | Required |
|------|---------|----------|
| ffmpeg | `brew install ffmpeg` | Yes |
| Node.js | `brew install node` | Yes (for Remotion commands) |
| Whisper | `pip install openai-whisper` | Optional (for `/transcribe`, `/add-captions auto`) |

Hardware acceleration is automatically detected on **Apple Silicon** Macs (`h264_videotoolbox` for 5-10x faster encoding).

## Installation

```bash
# Copy the skill
mkdir -p ~/.claude/skills/video-editor
cp skills/video-editor/SKILL.md ~/.claude/skills/video-editor/

# Copy all slash commands
cp commands/*.md ~/.claude/commands/

# Copy the Remotion template (for faster renders)
cp -r templates/remotion-video ~/project-templates/remotion-video

# Restart Claude Code
```

## Natural Language Usage

Just describe what you want — Claude figures out the right tool:

> "Make `conference.mp4` smaller for email"
> "Cut `interview.mov` from 2:30 to 15:00"
> "Resize this for Instagram Reels"
> "Stabilize my shaky handheld footage"
> "Add captions to `talk.mp4` automatically"
> "Create a title card that says 'Chapter 1' with the WAD theme"
> "Make a teaser from these clips with transitions and music"
> "Speed this up 2x and make a GIF"
> "Add my logo as a watermark in the bottom-right"
> "Normalize the audio to streaming levels"
> "Trim, compress for YouTube, and add captions — all in one go"

## Slash Commands

### Editing

| Command | Description | Example |
|---------|-------------|---------|
| `/trim` | Cut a clip to a time range | `/trim video.mp4 00:01:30 00:02:45` |
| `/trim` | Frame-accurate cut (re-encodes) | `/trim video.mp4 00:01:30 00:02:45 --precise` |
| `/compress` | Shrink with quality presets | `/compress video.mp4 web` |
| `/compress` | Target a specific file size | `/compress video.mp4 50MB` |
| `/compress` | Platform-optimized export | `/compress video.mp4 youtube` |
| `/merge` | Concatenate clips with transitions | `/merge clip1.mp4 clip2.mp4 --transition fade` |
| `/resize` | Scale, crop, or pad video | `/resize video.mp4 --platform instagram-reel` |
| `/speed` | Speed up or slow motion | `/speed video.mp4 2x --keep-pitch` |
| `/stabilize` | Fix shaky footage (two-pass) | `/stabilize shaky.mp4 --strength high` |
| `/watermark` | Overlay a logo/image | `/watermark video.mp4 logo.png --position bottom-right` |

### Audio

| Command | Description | Example |
|---------|-------------|---------|
| `/audio` | Adjust volume | `/audio video.mp4 volume 2.0` |
| `/audio` | Normalize to -14 LUFS | `/audio video.mp4 normalize` |
| `/audio` | Replace audio track | `/audio video.mp4 replace voiceover.mp3` |
| `/audio` | Mix in background music | `/audio video.mp4 mix music.mp3 --volume 0.3` |
| `/audio` | Fade in/out | `/audio video.mp4 fade-in 2` |
| `/audio` | Strip all audio | `/audio video.mp4 remove` |
| `/extract` | Extract audio or subtitles | `/extract video.mp4 audio --format wav` |

### Transcription & Captions

| Command | Description | Example |
|---------|-------------|---------|
| `/transcribe` | Speech-to-text with Whisper | `/transcribe talk.mp4 --model large-v3` |
| `/add-captions` | Burn captions into video | `/add-captions video.mp4 auto --style tiktok` |

### Creation (Remotion)

| Command | Description | Example |
|---------|-------------|---------|
| `/title-card` | Animated title card | `/title-card "Chapter 1" --theme wad --animation typewriter` |
| `/lower-third` | Name/title overlay | `/lower-third video.mp4 --name "Ali" --title "CEO" --at 00:00:05` |
| `/end-card` | CTA / outro card | `/end-card --text "Subscribe" --url "easolutions.com" --theme ea` |
| `/teaser` | Teaser/trailer with title + clips | `/teaser clip1.mp4 clip2.mp4 --title "My Film" --transition fade --music bg.mp3` |

### Utilities

| Command | Description | Example |
|---------|-------------|---------|
| `/info` | Inspect video metadata | `/info video.mp4` |
| `/thumbnail` | Extract frames as images | `/thumbnail video.mp4 --grid 3x3` |
| `/gif` | Convert clip to animated GIF | `/gif video.mp4 00:05 00:10 --width 480` |
| `/pipeline` | Chain multiple operations | `/pipeline raw.mp4 trim:00:01:00-00:05:00 resize:instagram-reel compress:mobile` |

## Presets

### Compress Quality Presets

| Preset | CRF | Audio | Use Case |
|--------|-----|-------|----------|
| `web` | 23 | 128k | Streaming, social media |
| `mobile` | 28 | 96k | Small files, messaging |
| `storage` | 18 | 192k | High quality archive |

### Platform Presets (compress + resize)

| Platform | Resolution | Aspect | Max Duration |
|----------|-----------|--------|-------------|
| `youtube` | 1920x1080 | 16:9 | -- |
| `youtube-short` | 1080x1920 | 9:16 | 60s |
| `instagram-reel` | 1080x1920 | 9:16 | 90s |
| `instagram-feed` | 1080x1080 | 1:1 | 60s |
| `instagram-story` | 1080x1920 | 9:16 | 15s |
| `tiktok` | 1080x1920 | 9:16 | 10min |
| `twitter` | 1280x720 | 16:9 | 140s |
| `linkedin` | 1920x1080 | 16:9 | 10min |
| `email` | 1280x720 | 16:9 | -- (target 25MB) |

### Merge Transitions

`fade` · `dissolve` · `wipe` · `slide`

### Title Card Animations

`fade` · `slide-up` · `slide-down` · `zoom` · `typewriter` · `glitch` · `blur-in`

### Lower Third Styles

`modern` (accent bar + translucent bg) · `minimal` (text + shadow) · `broadcast` (news-style box)

### Caption Styles

`default` · `large` · `top` · `center` · `bold` · `minimal` · `tiktok`

## Theme System

Remotion commands (`/title-card`, `/lower-third`, `/end-card`, `/teaser`) accept a `--theme` flag that loads colors from `~/design-assets/color-palettes/`:

| Theme | Primary | Background | Accent |
|-------|---------|------------|--------|
| `wad` | #7C3AED | #09090B | #EC4899 |
| `bloghead` | #3B82F6 | #0F172A | #F59E0B |
| `ea` | #8B5CF6 | #0A0A1A | #EC4899 |

Or use custom colors: `--bg "#1a1a2e" --fg "#ffffff" --accent "#e0aaff"`

## Remotion Template

A pre-built Remotion workspace lives in `templates/remotion-video/` with 4 reusable compositions. Commands that use Remotion cache this workspace at `/tmp/remotion-workspace/` to skip npm install on subsequent renders.

Components:
- **TitleCard.tsx** — 7 animation presets, subtitle, logo, theme support
- **LowerThird.tsx** — 3 styles, animated entry/exit, position variants
- **EndCard.tsx** — gradient backgrounds, staggered animations, CTA elements
- **Teaser.tsx** — TransitionSeries for smooth clip transitions, clip labels, vignettes

## Safety

- Source files are **never overwritten** — output always goes to new filenames
- Output collision handling — if `trimmed_video.mp4` exists, uses `trimmed_video_2.mp4`
- Every operation is **explained and confirmed** before execution
- All ffmpeg commands include error handling with clear fix suggestions
- `--output` flag available on every command for custom filenames

## What Changed in v2

| Area | v1 | v2 |
|------|----|----|
| Commands | 8 | **19** |
| SKILL.md | ~120 lines | **624 lines** |
| Platform presets | 0 | **12** |
| Animation presets | 1 | **7** |
| Theme support | None | **3 built-in themes** |
| Hardware accel | None | **Apple Silicon VideoToolbox** |
| Audio commands | Extract only | **7 audio actions** |
| Remotion components | Inline | **4 reusable, cached** |
| Error handling | None | **Exit code checks + suggestions** |
| Bug: merge audio | Silent with transitions | **Fixed (acrossfade)** |
| Bug: trim accuracy | Could be off by seconds | **Fixed (--precise flag)** |
| Bug: output collision | ffmpeg hangs | **Fixed (auto-increment)** |

## Known Limitations

- No GUI or timeline — all operations are command-line
- Remotion renders require Node.js (~5s startup with cached workspace)
- Whisper required for auto-captions
- Video stabilization requires vidstab filters (included in Homebrew ffmpeg)
- Pipeline command supports 13 step types (not all commands are pipelineable yet)
