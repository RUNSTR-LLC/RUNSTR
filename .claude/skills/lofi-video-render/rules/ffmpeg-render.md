# FFmpeg Video Render - Night Grind Radio

## Why ffmpeg instead of Remotion

Remotion uses headless Chromium + webpack bundling, consuming 3-5GB of temp disk space for a 79-minute video. On a disk-constrained machine this fails with ENOSPC repeatedly.

Direct ffmpeg streams the encode with near-zero temp usage. Only the output MP4 grows (~1-1.5GB for 79 min).

## The Render Command

```bash
ffmpeg -y \
  -loop 1 -i "<ARTWORK_PATH>" \
  -i "<MIX_MP3_PATH>" \
  -filter_complex "[0:v]scale=3840:2160,zoompan=z='1+0.0003*in':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,format=yuv420p[v]" \
  -map "[v]" -map 1:a \
  -c:v libx264 -preset medium -b:v 2M -maxrate 2.5M -bufsize 4M \
  -c:a aac -b:a 320k \
  -t <TOTAL_DURATION_SECONDS> \
  -movflags +faststart \
  -shortest \
  "<OUTPUT_MP4_PATH>"
```

## What each part does

### Input
- `-loop 1 -i artwork.jpg` -- Loop the single artwork image as video input
- `-i mix.mp3` -- The combined audio mix

### Video Filter Chain
- `scale=3840:2160` -- Upscale artwork to 4K so the Ken Burns zoom has room to crop
- `zoompan=z='1+0.0003*in'` -- Slow zoom from 100% to ~115% over the full duration (Ken Burns effect)
- `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'` -- Keep zoom centered
- `d=1` -- Each zoompan frame = 1 output frame (continuous motion)
- `s=1920x1080:fps=30` -- Output at 1080p, 30fps
- `format=yuv420p` -- Standard pixel format for compatibility

### Encoding
- `libx264 -preset medium` -- Good quality/speed balance
- `-b:v 2M -maxrate 2.5M -bufsize 4M` -- Target 2Mbps video (keeps file size ~1GB for 79 min)
- `-c:a aac -b:a 320k` -- High quality audio (matches source)
- `-movflags +faststart` -- Move moov atom to start for fast YouTube processing
- `-shortest` -- End when shortest input ends (the audio)

### Duration
- `-t <seconds>` -- Total duration from tracklist JSON's `totalDurationSeconds`

## Output Size Estimates

| Duration | Approx Size |
|----------|-------------|
| 45 min   | ~700 MB     |
| 60 min   | ~950 MB     |
| 79 min   | ~1.3 GB     |
| 90 min   | ~1.4 GB     |

## Encode Speed

On Apple Silicon (M-series), expect ~2.5-3.5x realtime:
- 45 min video = ~15 min encode
- 79 min video = ~25 min encode

## Text Overlays (Track Titles)

The default macOS ffmpeg (Homebrew) does NOT include `drawtext` filter (requires `--enable-libfreetype`).

**Options if text overlays are needed:**
1. Install ffmpeg with freetype: `brew install ffmpeg --with-freetype` (or build from source)
2. Use ASS subtitles: Create `.ass` file and use `-vf ass=subtitles.ass`
3. Skip overlays -- track titles go in YouTube description timestamps instead (current approach)

**Current approach: No text overlays.** Track titles are in the YouTube description as clickable timestamps. This is standard for lo-fi YouTube channels.

## Disk Space Requirements

- **Minimum free space needed**: Output size + 500MB buffer
- For 79 min video: ~2GB free recommended
- No temp files created (unlike Remotion which needs 3-5GB of temps)
- Check before rendering: `df -h /`

## Example (Video 2)

```bash
ffmpeg -y \
  -loop 1 -i "artwork/generated/artwork-1770069920936.jpg" \
  -i "mixes/mix-20260202-22tracks.mp3" \
  -filter_complex "[0:v]scale=3840:2160,zoompan=z='1+0.0003*in':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,format=yuv420p[v]" \
  -map "[v]" -map 1:a \
  -c:v libx264 -preset medium -b:v 2M -maxrate 2.5M -bufsize 4M \
  -c:a aac -b:a 320k \
  -t 4760.88 \
  -movflags +faststart \
  -shortest \
  "out/videos/mix-20260202-22tracks.mp4"
```
