# Video Creation & AI Enhancement

## Remotion (Video Framework)

**ALWAYS use Remotion for video creation. NEVER use InVideo or other video generation services.**

Remotion is a React-based video framework. The demo video project lives at:
- **Project:** `/Users/dakotabrown/runstr-demo-video/`
- **Scenes:** `src/scenes/` (each scene is a React component)
- **Assets:** `public/` (screenshots, images, audio files)
- **Output:** `out/` (rendered MP4s)

**Commands:**
- `npm run studio` — Opens Remotion Studio at localhost:3000 for preview/editing
- `npm run render` — Renders final MP4 to `out/runstr-demo.mp4`

**Video specs:** 1080x1920 (vertical), 30fps, dark theme (#000000 bg, #FF7B1C deep orange, #FFB366 light orange)

**When user asks to create a video:**
1. Copy any new screenshots to `public/`
2. Create/update scene components in `src/scenes/`
3. Wire scenes together using `<TransitionSeries>` from `@remotion/transitions`
4. Use the app's theme colors (deep orange #FF7B1C, burnt orange #E65100, NOT bright orange)
5. Enhance with AI-generated assets via PPQ.ai (see below)
6. Start studio with `npm run studio` so user can preview
7. Render with `npm run render` when ready

**Key Remotion rules:**
- Use `<Img>` from remotion (never HTML `<img>`)
- Use `staticFile()` for assets in `public/`
- All animations driven by `useCurrentFrame()` — NO CSS animations
- Use `spring()` for natural motion, `interpolate()` for linear
- Use `<TransitionSeries>` with `fade()` or `slide()` for scene transitions
- Always `premountFor` on `<Sequence>` components

---

## AI Enhancement Layer (PPQ.ai)

PPQ.ai (PayPerQ) provides access to 500+ specialized AI models via an OpenAI-compatible API. Use it to enhance video creation, generate images, create music, and more.

**API Key:** Stored in `.env` as `CLAUDE_PPQ_API_KEY` (never hardcode in source files)
**Base URL:** `https://api.ppq.ai`
**Auth:** `Authorization: Bearer $CLAUDE_PPQ_API_KEY`

### Image Generation (Nano Banana)

**Model IDs:**
- `google/gemini-2.5-flash-image` — Nano Banana (fast, ~$0.001/image)
- `google/gemini-3-pro-image-preview` — Nano Banana Pro (highest quality, ~$0.005/image)
- `openai/gpt-5-image` — GPT-5 Image (~$0.025/image)
- `openai/gpt-5-image-mini` — GPT-5 Image Mini (~$0.006/image)

**Usage (via chat completions — images returned as base64 in response):**
```bash
curl -X POST https://api.ppq.ai/v1/chat/completions \
  -H "Authorization: Bearer $CLAUDE_PPQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-2.5-flash-image",
    "messages": [{"role": "user", "content": "Generate an image: dark fitness app background with deep burnt orange (#E65100) glow, abstract running figure silhouette, 1080x1920 vertical"}]
  }'
```

### Text-to-Speech (Voiceovers)

**Endpoint:** `POST /v1/audio/speech`
```bash
curl -X POST https://api.ppq.ai/v1/audio/speech \
  -H "Authorization: Bearer $CLAUDE_PPQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": "RUNSTR. Fitness rewards, your way.", "model": "deepgram_aura_2", "voice": "aura-2-apollo-en"}' \
  --output voiceover.mp3
```
Voices: `aura-2-arcas-en`, `aura-2-thalia-en`, `aura-2-andromeda-en`, `aura-2-helena-en`, `aura-2-apollo-en`, `aura-2-aries-en`

### Speech-to-Text (Subtitles)

**Endpoint:** `POST /v1/audio/transcriptions`
```bash
curl -X POST https://api.ppq.ai/v1/audio/transcriptions \
  -H "Authorization: Bearer $CLAUDE_PPQ_API_KEY" \
  -F file=@voiceover.mp3 \
  -F model=nova-3 \
  -F response_format=srt
```

### Recommended Models by Task

| Task | Model | Cost |
|------|-------|------|
| Background images | `google/gemini-2.5-flash-image` (Nano Banana) | ~$0.001/image |
| Hero/promo images | `google/gemini-3-pro-image-preview` (Nano Banana Pro) | ~$0.005/image |
| Voiceovers | `deepgram_aura_2` via `/v1/audio/speech` | fractions of a cent |
| Subtitles | `nova-3` via `/v1/audio/transcriptions` | fractions of a cent |
| Script writing | `claude-haiku-4.5` via `/v1/chat/completions` | ~$0.005/query |
| Background music | `elevenlabs/eleven_music` (test endpoint) | TBD |
