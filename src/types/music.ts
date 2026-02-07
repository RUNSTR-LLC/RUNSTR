/**
 * Music Types - TypeScript interfaces for Wavlake and Blossom integration
 * Defines track, playlist, and player state types
 */

import type { BlossomTrack, BlossomServer } from './blossom';

/**
 * Track source discriminator
 */
export type TrackSource = 'wavlake' | 'blossom';

/**
 * Unified track type for player compatibility
 * Allows playing both Wavlake and Blossom tracks
 */
export type AnyTrack = WavlakeTrack | BlossomTrack;

/**
 * Type guard to check if a track is from Blossom
 */
export function isBlossomTrack(track: AnyTrack): track is BlossomTrack {
  return 'source' in track && track.source === 'blossom';
}

/**
 * Type guard to check if a track is from Wavlake
 */
export function isWavlakeTrack(track: AnyTrack): track is WavlakeTrack {
  return !('source' in track) || !track.source;
}

/**
 * Artist information from Wavlake
 */
export interface WavlakeArtist {
  id: string;
  name: string;
  artworkUrl?: string;
  npub?: string;
  lightningAddress?: string;
  verified: boolean;
}

/**
 * Single track from Wavlake
 */
export interface WavlakeTrack {
  id: string;
  title: string;
  artist: WavlakeArtist;
  albumTitle?: string;
  artworkUrl: string;
  duration: number; // in seconds
  streamUrl?: string; // fetched on demand
  lnurl?: string; // for zapping
  msatTotal?: number; // total sats received
  playCount?: number;
  isExplicit?: boolean;
}

/**
 * Playlist from Wavlake
 */
export interface WavlakePlaylist {
  id: string;
  title: string;
  description?: string;
  artworkUrl?: string;
  trackCount: number;
  tracks?: WavlakeTrack[];
  creatorNpub?: string;
  isPublic: boolean;
}

/**
 * Playback state for the music player
 */
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/**
 * Repeat mode options
 */
export type RepeatMode = 'off' | 'all' | 'one';

/**
 * Player state managed by Zustand store
 */
export interface MusicPlayerState {
  // Current playback
  currentTrack: AnyTrack | null;
  playbackState: PlaybackState;
  position: number; // current position in seconds
  duration: number; // total duration in seconds
  volume: number; // 0-1
  isMuted: boolean;

  // Queue management
  queue: AnyTrack[];
  queueIndex: number;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;

  // UI state
  isExpanded: boolean;
  isPlaylistBrowserOpen: boolean;
  isMiniPlayerVisible: boolean;

  // Settings
  isEnabled: boolean; // master toggle from settings
  defaultZapAmount: number; // default sats to zap artists

  // Blossom state
  blossomServers: BlossomServer[];
  blossomTracks: BlossomTrack[];
  blossomTracksByServer: Record<string, BlossomTrack[]>; // Per-server tracks
  isBlossomLoading: boolean;
  blossomError: string | null;
}

/**
 * Music store actions
 */
export interface MusicPlayerActions {
  // Playback controls
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seekTo: (position: number) => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;

  // Queue management
  setQueue: (tracks: AnyTrack[], startIndex?: number) => Promise<void>;
  addToQueue: (track: AnyTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playTrack: (track: AnyTrack) => Promise<void>;

  // Blossom actions
  setBlossomServers: (servers: BlossomServer[]) => void;
  setBlossomTracks: (tracks: BlossomTrack[]) => void;
  setBlossomTracksByServer: (tracksByServer: Record<string, BlossomTrack[]>) => void;
  setBlossomLoading: (loading: boolean) => void;
  setBlossomError: (error: string | null) => void;

  // Settings
  setShuffle: (enabled: boolean) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // UI state
  expandPlayer: () => void;
  collapsePlayer: () => void;
  openPlaylistBrowser: () => void;
  closePlaylistBrowser: () => void;
  showMiniPlayer: () => void;
  hideMiniPlayer: () => void;

  // Settings
  setEnabled: (enabled: boolean) => void;
  setDefaultZapAmount: (amount: number) => void;

  // Internal updates
  updatePosition: (position: number) => void;
  updateDuration: (duration: number) => void;
  setPlaybackState: (state: PlaybackState) => void;
  reset: () => void;
}

/**
 * Combined store type
 */
export type MusicStore = MusicPlayerState & MusicPlayerActions;

/**
 * Wavlake API response for track rankings
 */
export interface WavlakeRankingsResponse {
  data: Array<{
    id: string;
    title: string;
    artist: string;
    artistId: string;
    artistAvatarUrl?: string;
    artistVerified?: boolean;
    albumTitle?: string;
    artworkUrl: string;
    duration: number;
    msatTotal: number;
    playCount: number;
  }>;
}

/**
 * Wavlake API response for playlist
 */
export interface WavlakePlaylistResponse {
  id: string;
  title: string;
  description?: string;
  artworkUrl?: string;
  userId?: string;
  isPublic: boolean;
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
    artistId: string;
    artworkUrl: string;
    duration: number;
  }>;
}

/**
 * Genre options for filtering
 * IMPORTANT: Wavlake API requires lowercase genre strings
 * Ref: https://github.com/SamSamskies/wavlake-playlist-party
 */
export type WavlakeGenre =
  | 'rock'
  | 'electronic'
  | 'hip-hop'
  | 'pop'
  | 'jazz'
  | 'classical'
  | 'folk'
  | 'country'
  | 'metal'
  | 'reggae'
  | 'soundtrack';

/**
 * Zap result from artist zapping
 */
export interface ZapResult {
  success: boolean;
  preimage?: string;
  error?: string;
  amountSats: number;
  trackId: string;
  artistName: string;
}

/**
 * User's playlist from Wavlake (created by the user)
 * Different from WavlakePlaylist which can be any playlist
 */
export interface UserPlaylist {
  id: string;
  title: string;
  description?: string;
  trackCount: number;
  artworkUrl?: string;
  isPublic: boolean;
  tracks?: WavlakeTrack[];
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Like status for a track
 */
export interface LikeStatus {
  trackId: string;
  isLiked: boolean;
  likedAt?: number;
}

/**
 * Response from like/unlike operations
 */
export interface LikeResponse {
  success: boolean;
  trackId: string;
  isLiked: boolean;
  error?: string;
}

/**
 * Response from playlist operations
 */
export interface PlaylistResponse {
  success: boolean;
  playlist?: UserPlaylist;
  error?: string;
}

/**
 * Library section types for playlist browser
 */
export type LibrarySectionType = 'liked' | 'playlists' | 'recent';
