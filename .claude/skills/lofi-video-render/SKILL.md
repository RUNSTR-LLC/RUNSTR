---
name: lofi-video-render
description: Night Grind Radio - Lo-fi video production pipeline using direct ffmpeg (bypasses Remotion disk issues)
metadata:
  tags: ffmpeg, video, lofi, youtube, night-grind-radio, render
---

## When to use

Use this skill whenever producing a Night Grind Radio lo-fi video. This includes:
- Rendering artwork + audio into a YouTube-ready MP4
- The full production pipeline (combine beats, name tracks, generate artwork, render, upload)
- Any time the user says "render video", "make a video", "Video 2", "Video 3", etc.

## Why ffmpeg instead of Remotion

Remotion renders via headless Chromium, creating a webpack bundle (~200MB), Chromium profile, and temp frames that consume 3-5GB+ of disk for a 79-minute video. On a disk-constrained machine (228GB, ~95% full), this repeatedly fails with ENOSPC.

**Direct ffmpeg** streams the encode with near-zero temp disk usage. Only the growing output MP4 needs space (~1-1.5GB for 79 min at 2Mbps).

## How to use

Read the rule files for each step of the pipeline:

- [rules/pipeline-overview.md](rules/pipeline-overview.md) - Full production pipeline from beats to YouTube
- [rules/ffmpeg-render.md](rules/ffmpeg-render.md) - The ffmpeg render command (Ken Burns + audio mux)
- [rules/track-naming.md](rules/track-naming.md) - Track naming conventions and branding
- [rules/youtube-upload.md](rules/youtube-upload.md) - Upload settings, description format, SEO tags
