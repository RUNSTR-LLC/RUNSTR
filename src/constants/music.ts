/**
 * Music Constants - Configuration for Wavlake integration
 */

// Wavlake API endpoints
export const WAVLAKE_API_BASE = 'https://wavlake.com/api/v1';
export const WAVLAKE_CATALOG_BASE = 'https://catalog.wavlake.com/v1';

// App identification for Wavlake API
export const WAVLAKE_APP_ID = 'runstr2025';

// RUNSTR official music npub (for curated playlists)
export const RUNSTR_MUSIC_NPUB =
  'npub1vygzr642y6f8gxcjx6auaf2vd25lyzarpjkwx9kr4y752zy6058s8jvy4e';
export const RUNSTR_MUSIC_HEX =
  '611021eaaa2692741b1236bbcea54c6aa9f20ba30cace316c3a93d45089a7d0f';

// Default settings
export const DEFAULT_ZAP_AMOUNT = 100; // sats
export const DEFAULT_VOLUME = 0.8; // 80%

// Mini player dimensions
export const MINI_PLAYER_HEIGHT = 56;
export const BOTTOM_TAB_HEIGHT = 85; // Height of bottom tab navigator

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  RANKINGS: 5 * 60 * 1000, // 5 minutes for Top 40
  PLAYLIST: 10 * 60 * 1000, // 10 minutes for playlists
  USER_PLAYLISTS: 30 * 60 * 1000, // 30 minutes for user playlists
  STREAM_URL: 60 * 60 * 1000, // 1 hour for stream URLs
  LIKED_SONGS: 10 * 60 * 1000, // 10 minutes for liked songs
};

// AsyncStorage keys
export const MUSIC_STORAGE_KEYS = {
  ENABLED: '@runstr:music_enabled',
  DEFAULT_ZAP_AMOUNT: '@runstr:music_default_zap',
  VOLUME: '@runstr:music_volume',
  LAST_TRACK: '@runstr:music_last_track',
  QUEUE: '@runstr:music_queue',
};

// Predefined RUNSTR workout playlists (curated for fitness)
export const RUNSTR_PLAYLISTS = {
  WORKOUT_ENERGY: {
    id: 'runstr-workout-energy',
    title: 'Workout Energy',
    description: 'High-energy tracks to fuel your workout',
  },
  RUNNING_BEATS: {
    id: 'runstr-running-beats',
    title: 'Running Beats',
    description: 'Steady tempo tracks for running',
  },
  COOL_DOWN: {
    id: 'runstr-cool-down',
    title: 'Cool Down',
    description: 'Relaxing tracks for post-workout recovery',
  },
};

// Available genres for browsing
export const WAVLAKE_GENRES = [
  { id: 'rock', label: 'Rock' },
  { id: 'electronic', label: 'Electronic' },
  { id: 'hip-hop', label: 'Hip-Hop' },
  { id: 'pop', label: 'Pop' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'folk', label: 'Folk' },
  { id: 'country', label: 'Country' },
  { id: 'metal', label: 'Metal' },
  { id: 'reggae', label: 'Reggae' },
] as const;

// API request limits
export const API_LIMITS = {
  TOP_TRACKS: 40, // Top 40 tracks
  GENRE_TRACKS: 20, // Tracks per genre
  USER_PLAYLISTS: 50, // Max user playlists to fetch
  SEARCH_RESULTS: 30, // Search result limit
};
