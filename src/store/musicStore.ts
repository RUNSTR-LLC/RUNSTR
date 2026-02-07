/**
 * Music Store - Zustand store for music player state management
 * Manages playback state, queue, and UI state for Wavlake integration
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  MusicStore,
  PlaybackState,
  RepeatMode,
  AnyTrack,
} from '../types/music';
import type { BlossomTrack, BlossomServer } from '../types/blossom';
import {
  MUSIC_STORAGE_KEYS,
  DEFAULT_ZAP_AMOUNT,
  DEFAULT_VOLUME,
} from '../constants/music';
import { BLOSSOM_STORAGE_KEYS } from '../constants/blossom';

// Initial state
const initialState = {
  // Current playback
  currentTrack: null as AnyTrack | null,
  playbackState: 'idle' as PlaybackState,
  position: 0,
  duration: 0,
  volume: DEFAULT_VOLUME,
  isMuted: false,

  // Queue management
  queue: [] as AnyTrack[],
  queueIndex: 0,
  shuffleEnabled: false,
  repeatMode: 'off' as RepeatMode,

  // UI state
  isExpanded: false,
  isPlaylistBrowserOpen: false,
  isMiniPlayerVisible: false,

  // Settings
  isEnabled: true,
  defaultZapAmount: DEFAULT_ZAP_AMOUNT,

  // Blossom state
  blossomServers: [] as BlossomServer[],
  blossomTracks: [] as BlossomTrack[],
  blossomTracksByServer: {} as Record<string, BlossomTrack[]>, // Per-server tracks
  isBlossomLoading: false,
  blossomError: null as string | null,
};

export const useMusicStore = create<MusicStore>((set, get) => ({
  ...initialState,

  // Playback controls - actual audio is handled by MusicPlayerService
  play: async () => {
    const { currentTrack } = get();
    if (!currentTrack) {
      console.log('[MusicStore] No track to play');
      return;
    }
    set({ playbackState: 'loading' });
    // MusicPlayerService will call setPlaybackState('playing') when ready
  },

  pause: () => {
    set({ playbackState: 'paused' });
  },

  stop: () => {
    set({
      playbackState: 'idle',
      position: 0,
    });
  },

  seekTo: async (position: number) => {
    set({ position });
    // MusicPlayerService handles actual seeking
  },

  skipToNext: async () => {
    const { queue, queueIndex, repeatMode, shuffleEnabled } = get();
    if (queue.length === 0) return;

    let nextIndex: number;

    if (shuffleEnabled) {
      // Random next track (avoid current)
      nextIndex = Math.floor(Math.random() * queue.length);
      if (nextIndex === queueIndex && queue.length > 1) {
        nextIndex = (nextIndex + 1) % queue.length;
      }
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeatMode === 'all') {
      nextIndex = 0;
    } else {
      // End of queue, stop
      set({ playbackState: 'idle', position: 0 });
      return;
    }

    set({
      queueIndex: nextIndex,
      currentTrack: queue[nextIndex],
      position: 0,
      playbackState: 'loading',
    });
  },

  skipToPrevious: async () => {
    const { queue, queueIndex, position } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart current track
    if (position > 3) {
      set({ position: 0 });
      return;
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    set({
      queueIndex: prevIndex,
      currentTrack: queue[prevIndex],
      position: 0,
      playbackState: 'loading',
    });
  },

  // Queue management
  setQueue: async (tracks: AnyTrack[], startIndex = 0) => {
    if (tracks.length === 0) {
      set({
        queue: [],
        queueIndex: 0,
        currentTrack: null,
        isMiniPlayerVisible: false,
      });
      return;
    }

    const index = Math.min(startIndex, tracks.length - 1);
    set({
      queue: tracks,
      queueIndex: index,
      currentTrack: tracks[index],
      playbackState: 'loading',
      isMiniPlayerVisible: true,
    });

    // Persist queue to storage
    try {
      await AsyncStorage.setItem(
        MUSIC_STORAGE_KEYS.QUEUE,
        JSON.stringify({ tracks, index })
      );
    } catch (error) {
      console.warn('[MusicStore] Failed to persist queue:', error);
    }
  },

  addToQueue: (track: AnyTrack) => {
    set((state) => ({
      queue: [...state.queue, track],
    }));
  },

  removeFromQueue: (index: number) => {
    set((state) => {
      const newQueue = [...state.queue];
      newQueue.splice(index, 1);

      // Adjust current index if needed
      let newIndex = state.queueIndex;
      if (index < state.queueIndex) {
        newIndex = Math.max(0, newIndex - 1);
      } else if (index === state.queueIndex) {
        // Removed current track, play next if available
        newIndex = Math.min(newIndex, newQueue.length - 1);
      }

      return {
        queue: newQueue,
        queueIndex: Math.max(0, newIndex),
        currentTrack: newQueue[newIndex] || null,
      };
    });
  },

  clearQueue: () => {
    set({
      queue: [],
      queueIndex: 0,
      currentTrack: null,
      playbackState: 'idle',
      isMiniPlayerVisible: false,
    });
    AsyncStorage.removeItem(MUSIC_STORAGE_KEYS.QUEUE);
  },

  playTrack: async (track: AnyTrack) => {
    const { queue } = get();

    // Check if track is already in queue
    const existingIndex = queue.findIndex((t) => t.id === track.id);

    if (existingIndex >= 0) {
      // Track exists, just jump to it
      set({
        queueIndex: existingIndex,
        currentTrack: track,
        position: 0,
        playbackState: 'loading',
        isMiniPlayerVisible: true,
      });
    } else {
      // Add to queue and play
      const newQueue = [...queue, track];
      set({
        queue: newQueue,
        queueIndex: newQueue.length - 1,
        currentTrack: track,
        position: 0,
        playbackState: 'loading',
        isMiniPlayerVisible: true,
      });
    }
  },

  // Settings
  setShuffle: (enabled: boolean) => {
    set({ shuffleEnabled: enabled });
  },

  setRepeatMode: (mode: RepeatMode) => {
    set({ repeatMode: mode });
  },

  setVolume: async (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    set({ volume: clampedVolume, isMuted: false });
    try {
      await AsyncStorage.setItem(
        MUSIC_STORAGE_KEYS.VOLUME,
        clampedVolume.toString()
      );
    } catch (error) {
      console.warn('[MusicStore] Failed to persist volume:', error);
    }
  },

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  // UI state
  expandPlayer: () => {
    set({ isExpanded: true });
  },

  collapsePlayer: () => {
    set({ isExpanded: false });
  },

  openPlaylistBrowser: () => {
    set({ isPlaylistBrowserOpen: true });
  },

  closePlaylistBrowser: () => {
    set({ isPlaylistBrowserOpen: false });
  },

  showMiniPlayer: () => {
    set({ isMiniPlayerVisible: true });
  },

  hideMiniPlayer: () => {
    set({ isMiniPlayerVisible: false, isExpanded: false });
  },

  // Settings
  setEnabled: async (enabled: boolean) => {
    set({ isEnabled: enabled });
    try {
      await AsyncStorage.setItem(
        MUSIC_STORAGE_KEYS.ENABLED,
        enabled.toString()
      );
    } catch (error) {
      console.warn('[MusicStore] Failed to persist enabled state:', error);
    }
  },

  setDefaultZapAmount: async (amount: number) => {
    set({ defaultZapAmount: amount });
    try {
      await AsyncStorage.setItem(
        MUSIC_STORAGE_KEYS.DEFAULT_ZAP_AMOUNT,
        amount.toString()
      );
    } catch (error) {
      console.warn('[MusicStore] Failed to persist zap amount:', error);
    }
  },

  // Internal updates (called by MusicPlayerService)
  updatePosition: (position: number) => {
    set({ position });
  },

  updateDuration: (duration: number) => {
    set({ duration });
  },

  setPlaybackState: (state: PlaybackState) => {
    set({ playbackState: state });
  },

  reset: () => {
    set(initialState);
    AsyncStorage.multiRemove([
      MUSIC_STORAGE_KEYS.QUEUE,
      MUSIC_STORAGE_KEYS.LAST_TRACK,
    ]);
  },

  // Blossom actions
  setBlossomServers: (servers: BlossomServer[]) => {
    set({ blossomServers: servers });
  },

  setBlossomTracks: (tracks: BlossomTrack[]) => {
    set({ blossomTracks: tracks, isBlossomLoading: false, blossomError: null });
  },

  setBlossomTracksByServer: (tracksByServer: Record<string, BlossomTrack[]>) => {
    // Also flatten to blossomTracks for backward compatibility
    const allTracks: BlossomTrack[] = [];
    const seenHashes = new Set<string>();

    for (const tracks of Object.values(tracksByServer)) {
      for (const track of tracks) {
        if (!seenHashes.has(track.hash)) {
          seenHashes.add(track.hash);
          allTracks.push(track);
        }
      }
    }

    // Sort by upload date (newest first)
    allTracks.sort((a, b) => {
      const dateA = a.uploadedAt?.getTime() || 0;
      const dateB = b.uploadedAt?.getTime() || 0;
      return dateB - dateA;
    });

    set({
      blossomTracksByServer: tracksByServer,
      blossomTracks: allTracks,
      isBlossomLoading: false,
      blossomError: null,
    });
  },

  setBlossomLoading: (loading: boolean) => {
    set({ isBlossomLoading: loading });
  },

  setBlossomError: (error: string | null) => {
    set({ blossomError: error, isBlossomLoading: false });
  },
}));

/**
 * Initialize music store from persisted settings
 */
export async function initializeMusicStore(): Promise<void> {
  try {
    const [enabledStr, zapAmountStr, volumeStr, blossomServersStr] = await Promise.all([
      AsyncStorage.getItem(MUSIC_STORAGE_KEYS.ENABLED),
      AsyncStorage.getItem(MUSIC_STORAGE_KEYS.DEFAULT_ZAP_AMOUNT),
      AsyncStorage.getItem(MUSIC_STORAGE_KEYS.VOLUME),
      AsyncStorage.getItem(BLOSSOM_STORAGE_KEYS.SERVERS),
    ]);

    const updates: Partial<typeof initialState> = {};

    if (enabledStr !== null) {
      updates.isEnabled = enabledStr === 'true';
    }

    if (zapAmountStr !== null) {
      const amount = parseInt(zapAmountStr, 10);
      if (!isNaN(amount) && amount > 0) {
        updates.defaultZapAmount = amount;
      }
    }

    if (volumeStr !== null) {
      const volume = parseFloat(volumeStr);
      if (!isNaN(volume) && volume >= 0 && volume <= 1) {
        updates.volume = volume;
      }
    }

    // Load Blossom servers
    if (blossomServersStr !== null) {
      try {
        const servers = JSON.parse(blossomServersStr);
        if (Array.isArray(servers)) {
          updates.blossomServers = servers;
        }
      } catch (parseError) {
        console.warn('[MusicStore] Failed to parse Blossom servers:', parseError);
      }
    }

    if (Object.keys(updates).length > 0) {
      useMusicStore.setState(updates);
    }

    console.log('[MusicStore] Initialized from storage');
  } catch (error) {
    console.warn('[MusicStore] Failed to initialize from storage:', error);
  }
}
