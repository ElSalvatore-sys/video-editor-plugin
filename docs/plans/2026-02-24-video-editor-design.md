# Video Editor Plugin — Design Document

**Date:** 2026-02-24
**Status:** Approved

---

## Overview

A Claude Code plugin that provides AI-assisted video editing via `ffmpeg`. The plugin adds a natural-language skill and four slash commands, letting Claude plan, explain, and execute video transformations on the user's machine.

---

## Architecture

**Type:** Pure skills + commands plugin (no MCP server, no hooks)
**Runtime dependency:** `ffmpeg` and `ffprobe` (installed via Homebrew or system package manager)
**Execution model:** Claude generates ffmpeg commands, explains them in plain English, confirms with the user, then executes via the built-in Bash tool.

```
video-editor/
├── .claude-plugin/
│   ├── plugin.json          # plugin manifest
│   └── marketplace.json     # dev marketplace for local testing
├── skills/
│   └── video-editor.md      # AI-assisted workflow skill
├── commands/
│   ├── trim.md              # /trim command
│   ├── compress.md          # /compress command
│   ├── merge.md             # /merge command
│   └── extract.md           # /extract command
└── README.md
```

---

## Safety Rule

Every operation saves to a **new output file** by default (e.g. `output_video.mp4`). The source file is never overwritten unless the user explicitly requests it. Before executing, Claude always states what it will do and what the output filename will be.

---

## Components

### Skill: `video-editor`

**Trigger:** Any natural-language video editing request.

**Workflow:**
1. If no input file is mentioned, ask for the file path
2. Run `ffprobe` to inspect the file (codec, resolution, duration, audio streams)
3. Reason about the best ffmpeg strategy for the request
4. Present the ffmpeg command with a plain-English explanation
5. Confirm with the user before executing
6. Execute, then report the output file path and new file size

**Example triggers:**
- "make this smaller for Instagram"
- "remove the first 10 seconds"
- "pull out just the audio track"
- "combine these three clips in order"

---

### Slash Commands

| Command | Signature | Description |
|---------|-----------|-------------|
| `/trim` | `/trim <file> <start> <end>` | Cut clip between two timestamps (HH:MM:SS) |
| `/compress` | `/compress <file> <preset\|size>` | Re-encode with preset (`web`, `mobile`, `storage`) or target size (`50MB`) |
| `/merge` | `/merge <file1> <file2> [file3...]` | Concatenate clips in the given order |
| `/extract` | `/extract <file> <audio\|subtitles>` | Extract audio (mp3/aac) or subtitle track (srt) |

Each command:
- Validates `ffmpeg` is installed
- Announces the output filename before running
- Reports success + file size on completion

---

## Error Handling

- Missing `ffmpeg`: surface a friendly message with install instructions (`brew install ffmpeg`)
- File not found: report the path and ask the user to verify
- ffmpeg error: surface the stderr output so the user can understand what went wrong
- Codec incompatibility on merge: detect mismatched streams with ffprobe and warn before attempting

---

## Out of Scope (v1)

- GUI or interactive timeline
- Cloud upload or streaming
- Real-time preview
- Subtitle generation (transcription)
- Color grading / LUTs
