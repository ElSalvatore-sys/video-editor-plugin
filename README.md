# video-editor

A Claude Code plugin for AI-assisted video editing and creation.

**Two engines:**
- **ffmpeg** — edit and process existing video footage
- **Remotion** — create programmatic video content (title cards, teasers, animations)

## Requirements

| Tool | Install |
|------|---------|
| ffmpeg | `brew install ffmpeg` |
| Node.js | `brew install node` or https://nodejs.org |
| Whisper (optional, for auto-captions) | `pip install openai-whisper` |

## Installation

```bash
# 1. Add the dev marketplace
/plugin marketplace add /Users/eldiaploo/Developer/claude-plugins/video-editor

# 2. Install the plugin
/plugin install video-editor@video-editor-dev

# 3. Restart Claude Code
```

## Natural Language Usage

Just describe what you want:

> "Make `conference.mp4` smaller for email"
> "Cut `interview.mov` from 2:30 to 15:00"
> "Add captions to `talk.mp4` automatically"
> "Create a title card that says 'Chapter 1'"
> "Make a teaser from these three clips with the title 'My Film'"

Claude will inspect your files, build the right command, explain it, confirm, and execute.

## Slash Commands

| Command | Usage |
|---------|-------|
| `/trim` | `/trim video.mp4 00:01:30 00:02:45` |
| `/compress` | `/compress video.mp4 web` or `/compress video.mp4 50MB` |
| `/merge` | `/merge clip1.mp4 clip2.mp4 --transition fade` |
| `/extract` | `/extract video.mp4 audio` |
| `/transcribe` | `/transcribe talk.mp4 --language en` |
| `/add-captions` | `/add-captions video.mp4 auto` |
| `/title-card` | `/title-card "Chapter 1" --bg "#1a1a2e"` |
| `/teaser` | `/teaser clip1.mp4 clip2.mp4 --title "My Film" --music bg.mp3` |

**Compress presets:** `web` (CRF 23) · `mobile` (CRF 28) · `storage` (CRF 18)
**Merge transitions:** `fade` · `dissolve` · `wipe` · `slide`

## Safety

Output files always use new filenames — source files are never overwritten unless explicitly requested. Claude states the output filename and confirms the operation before running anything.

## v1 Limitations

- No GUI or timeline
- Teaser uses uniform clip duration (all clips same length in Remotion composition)
- Whisper required for auto-captions (`/add-captions auto`)
- Remotion render requires Node.js and ~30s for npm install on first run
