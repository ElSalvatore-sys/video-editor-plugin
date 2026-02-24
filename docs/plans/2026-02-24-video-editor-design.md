# Video Editor Plugin — Design Document (v2)

**Date:** 2026-02-24
**Status:** Approved (revised from v1)

---

## Overview

A Claude Code plugin that provides AI-assisted video editing and creation. Uses two complementary engines:

- **ffmpeg** — editing existing video footage (trim, compress, merge, transitions, captions, processing)
- **Remotion** — programmatic video creation from React components (title cards, teasers, animated intros/outros)

---

## Architecture

**Type:** Skills + commands plugin (no MCP server)
**Runtime dependencies:**
- `ffmpeg` + `ffprobe` (via Homebrew: `brew install ffmpeg`)
- Node.js + npm (for Remotion)
- Remotion (`npm install remotion @remotion/cli @remotion/player`)
- `whisper` CLI (optional, for transcription: `pip install openai-whisper`)

**Execution model:** Claude writes and executes shell commands via the built-in Bash tool. For Remotion, Claude scaffolds a minimal project, writes the React composition, and renders it via `npx remotion render`.

```
video-editor/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── skills/
│   └── video-editor/
│       └── SKILL.md          # Unified AI workflow for all editing + creation
├── commands/
│   ├── trim.md               # /trim <file> <start> <end>
│   ├── compress.md           # /compress <file> <preset|size>
│   ├── merge.md              # /merge <file1> <file2> [...] [--transition fade]
│   ├── extract.md            # /extract <file> <audio|subtitles>
│   ├── transcribe.md         # /transcribe <file>
│   ├── add-captions.md       # /add-captions <file> <srt-file|auto>
│   ├── title-card.md         # /title-card "<text>" [--duration 3s]
│   └── teaser.md             # /teaser <clip1> [clip2 ...] [--title "..."]
└── README.md
```

---

## Safety Rule

Every operation saves to a **new output file**. The source is never overwritten unless explicitly requested. Claude always announces the output filename and confirms before executing.

---

## Engine Responsibilities

### ffmpeg Engine

| Operation | Method |
|-----------|--------|
| Trim | `-ss`/`-to` with `-c copy` (lossless) |
| Compress | `libx264` CRF presets or two-pass for target size |
| Merge with transitions | `xfade` filter between clips |
| Extract audio | `-vn -c:a libmp3lame` |
| Extract subtitles | `-map 0:s:0` |
| Add captions | `subtitles=` filter or `-vf ass=` |
| Process (batch) | Shell loop over files |

### Remotion Engine

| Operation | Method |
|-----------|--------|
| Title card | Remotion `<Composition>` with `<AbsoluteFill>` + styled text |
| Teaser/trailer | Multi-`<Sequence>` composition with clips + animated overlays |
| Animated intro/outro | React animation with spring/interpolate |
| Lower thirds | Animated text overlay composition |

### Combined Workflows

| Workflow | Steps |
|----------|-------|
| Auto-caption video | `/transcribe` → Whisper → .srt → `/add-captions` → ffmpeg |
| Teaser with title | Remotion renders title card → ffmpeg merges with clips + transitions |
| Full trailer | Remotion for graphics + ffmpeg for clip selection, trimming, final merge |

---

## Components

### Skill: `video-editor`

One unified skill handles both editing and creation. Triggered by natural-language video requests.

**Workflow:**
1. Check tools (ffmpeg, Node.js, whisper)
2. Understand the goal — editing existing footage or creating new content?
3. For **editing**: inspect file with ffprobe, build ffmpeg pipeline, confirm, run, report
4. For **creation**: scaffold Remotion composition, write React code, render, report
5. For **combined workflows**: orchestrate multi-step pipeline

### Slash Commands

| Command | Usage | Engine |
|---------|-------|--------|
| `/trim` | `/trim <file> <start> <end>` | ffmpeg |
| `/compress` | `/compress <file> <web\|mobile\|storage\|50MB>` | ffmpeg |
| `/merge` | `/merge file1 file2 [...] [--transition fade\|dissolve\|wipe]` | ffmpeg |
| `/extract` | `/extract <file> <audio\|subtitles>` | ffmpeg |
| `/transcribe` | `/transcribe <file>` | Whisper |
| `/add-captions` | `/add-captions <file> <srt-file\|auto>` | ffmpeg |
| `/title-card` | `/title-card "<text>" [--bg #000] [--duration 3]` | Remotion |
| `/teaser` | `/teaser clip1.mp4 [clip2 ...] [--title "My Film"]` | Remotion + ffmpeg |

---

## Error Handling

- **ffmpeg not found:** friendly install message (`brew install ffmpeg`)
- **Node.js not found:** `brew install node` or point to nodejs.org
- **Whisper not found:** `pip install openai-whisper` — captions still work with manual .srt
- **Incompatible streams for merge:** ffprobe detects mismatch → warn user → use re-encoding path
- **Remotion render fails:** surface stderr, suggest checking Node version
- **File not found:** report path, ask user to verify

---

## Out of Scope (v1)

- Real-time preview
- Cloud upload or streaming
- GUI timeline
- Color grading / LUTs
- AI-generated video content (Sora, Runway, etc.)
- Audio mixing / multi-track
