# Night Grind Radio - Full Production Pipeline

## Project Location
`/Users/dakotabrown/Desktop/lofi-channel/`

## Pipeline Steps (in order)

### 1. Move beats into project
```bash
mv ~/Downloads/*.mp3 ~/Desktop/lofi-channel/beats/
```

### 2. Combine beats into mix
```bash
cd ~/Desktop/lofi-channel && npm run combine
```
- Crossfades tracks, normalizes LUFS, adds vinyl crackle
- Outputs: `mixes/mix-YYYYMMDD-NNtracks.mp3` + `.json` tracklist

### 3. Name tracks
- Edit the tracklist JSON (`mixes/mix-*.json`)
- Replace auto-generated titles with edgy, on-brand names
- Style: "Escape the Fiat Matrix", "Grind in the Dark", "Stack Sats in Silence", "No Days Off"
- Artist: **DarkMolty** for all tracks
- Get user approval before proceeding

### 4. Generate tracklist text file
Create `mixes/mix-*-tracklist.txt` with YouTube timestamp format:
```
0:00 No Days Off - DarkMolty
3:38 Dead Channel Protocol - DarkMolty
6:23 Echoes From the Vault - DarkMolty
```

### 5. Generate artwork via PPQ.ai

**CRITICAL: Artwork must be 16:9 aspect ratio (1920x1080 or similar)**

Square artwork (1024x1024) causes letterboxing (white/black bars) in the 1920x1080 video.

**Prompt must include:**
- "16:9 wide landscape format" or "1920x1080 aspect ratio"
- "fill entire frame, no borders"
- Different subject than previous videos

**Style options:**
1. **Anime/Illustrated (highest engagement):** "Anime girl studying at desk by window, lo-fi aesthetic, cozy room, warm lighting, rain on window, 16:9 wide landscape"
2. **Dark Classical (our brand):** "Caravaggio chiaroscuro painting, [subject] by candlelight, dramatic shadows, 16:9 wide landscape, fill entire frame"

**Subject rotation (don't repeat):**
- Scholar reading by candlelight
- Monk writing in monastery
- Artist painting in dim studio
- Philosopher at window
- Alchemist by lamplight
- Writer with quill and candle

Save to `artwork/generated/`

### 6. Generate thumbnail
```bash
npm run thumbnail
```
- Branded 1280x720 thumbnail with EB Garamond text
- Saves to `thumbnails/`

### 7. Render video with ffmpeg (NOT Remotion)
See [ffmpeg-render.md](ffmpeg-render.md) for the exact command.

### 8. Upload to YouTube
```bash
npm run upload "Video Title Here"
```
See [youtube-upload.md](youtube-upload.md) for description format and SEO.

## Key Files
| File | Purpose |
|------|---------|
| `src/scripts/combine-beats.ts` | Audio pipeline (crossfade + normalize + crackle) |
| `src/scripts/generate-artwork.ts` | PPQ.ai artwork generation |
| `src/scripts/generate-thumbnail.ts` | Branded thumbnail (node-canvas) |
| `src/scripts/render-video.ts` | Remotion render (DO NOT USE - disk issues) |
| `src/scripts/upload-youtube.ts` | YouTube Data API v3 upload |
| `src/utils/ppq-client.ts` | PPQ.ai API wrapper |
| `src/utils/youtube-client.ts` | YouTube OAuth + upload |
| `src/config/branding.ts` | Channel branding (colors, fonts, artwork styles) |

## Prerequisites
- ffmpeg installed (`brew install ffmpeg`)
- YouTube OAuth token cached in `tokens/oauth-token.json`
- PPQ.ai API key in `.env` as `CLAUDE_PPQ_API_KEY`
- At least 3GB free disk space for the output MP4
