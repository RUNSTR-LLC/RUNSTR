# Music Services

Services for Wavlake music streaming integration in RUNSTR.

## Files

- **WavlakeService.ts** - API integration for Wavlake music streaming. Handles fetching tracks, playlists, stream URLs, and LNURL for zapping.

- **MusicPlayerService.ts** - Audio playback service using expo-av. Manages actual audio playback, background mode, and audio ducking for TTS announcements.

- **WavlakeZapService.ts** - Lightning zapping service for Wavlake artists. Uses LNURL from Wavlake API and NWC wallet for payment.

## Architecture

```
User Action
    ↓
useMusicStore (state)
    ↓
MusicPlayerService (expo-av)
    ↓
WavlakeService (API)
```

## Usage

```typescript
import { useWavlakePlayer } from '../hooks/useWavlakePlayer';

const { playTop40, currentTrack, isPlaying } = useWavlakePlayer();

// Play Top 40 tracks
await playTop40();
```

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /content/rankings` | Top tracks by sats |
| `GET /content/playlist/{id}` | Specific playlist |
| `GET /stream/track/{id}` | Audio stream URL |
| `GET /lnurl?contentId={id}` | LNURL for zapping |
