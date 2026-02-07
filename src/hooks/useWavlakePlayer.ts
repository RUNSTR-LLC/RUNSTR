/**
 * useWavlakePlayer - Hook for Wavlake music player controls
 * Provides easy access to player state and controls
 */

import { useCallback, useEffect, useState } from 'react';
import { useMusicStore, initializeMusicStore } from '../store/musicStore';
import { MusicPlayerService } from '../services/music/MusicPlayerService';
import { WavlakeService } from '../services/music/WavlakeService';
import type { WavlakeTrack, WavlakePlaylist, AnyTrack } from '../types/music';

interface UseWavlakePlayerReturn {
  // State
  currentTrack: AnyTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  progress: number; // 0-100
  queue: AnyTrack[];
  queueIndex: number;
  isExpanded: boolean;
  isPlaylistBrowserOpen: boolean;
  isMiniPlayerVisible: boolean;
  isEnabled: boolean;
  shuffleEnabled: boolean;
  repeatMode: 'off' | 'all' | 'one';

  // Controls
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;

  // Queue management
  playTrack: (track: WavlakeTrack) => Promise<void>;
  playPlaylist: (playlist: WavlakePlaylist, startIndex?: number) => Promise<void>;
  playTop40: () => Promise<void>;
  addToQueue: (track: WavlakeTrack) => void;
  clearQueue: () => void;

  // UI controls
  expandPlayer: () => void;
  collapsePlayer: () => void;
  openPlaylistBrowser: () => void;
  closePlaylistBrowser: () => void;
  hidePlayer: () => void;
}

export function useWavlakePlayer(): UseWavlakePlayerReturn {
  const store = useMusicStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize on first use
  useEffect(() => {
    if (!isInitialized) {
      initializeMusicStore().then(() => {
        setIsInitialized(true);
      });
    }
  }, [isInitialized]);

  // Calculate progress percentage
  const progress = store.duration > 0 ? (store.position / store.duration) * 100 : 0;

  // Play
  const play = useCallback(async () => {
    await MusicPlayerService.play();
  }, []);

  // Pause
  const pause = useCallback(async () => {
    await MusicPlayerService.pause();
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (store.playbackState === 'playing') {
      await MusicPlayerService.pause();
    } else {
      await MusicPlayerService.play();
    }
  }, [store.playbackState]);

  // Skip to next track
  const skipNext = useCallback(async () => {
    await store.skipToNext();
    const newState = useMusicStore.getState();
    if (newState.currentTrack) {
      await MusicPlayerService.loadTrack(newState.currentTrack);
    }
  }, [store.skipToNext]);

  // Skip to previous track
  const skipPrevious = useCallback(async () => {
    await store.skipToPrevious();
    const newState = useMusicStore.getState();
    if (newState.currentTrack && store.position < 3) {
      await MusicPlayerService.loadTrack(newState.currentTrack);
    } else {
      await MusicPlayerService.seekTo(0);
    }
  }, [store.skipToPrevious, store.position]);

  // Seek to position
  const seekTo = useCallback(async (position: number) => {
    await MusicPlayerService.seekTo(position);
  }, []);

  // Set volume
  const setVolume = useCallback(async (volume: number) => {
    store.setVolume(volume);
    await MusicPlayerService.setVolume(volume);
  }, [store.setVolume]);

  // Toggle shuffle
  const toggleShuffle = useCallback(() => {
    store.setShuffle(!store.shuffleEnabled);
  }, [store.setShuffle, store.shuffleEnabled]);

  // Toggle repeat mode
  const toggleRepeat = useCallback(() => {
    const modes = ['off', 'all', 'one'] as const;
    const currentIndex = modes.indexOf(store.repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    store.setRepeatMode(nextMode);
  }, [store.setRepeatMode, store.repeatMode]);

  // Play a single track
  const playTrack = useCallback(async (track: WavlakeTrack) => {
    await store.playTrack(track);
    await MusicPlayerService.loadTrack(track);
  }, [store.playTrack]);

  // Play a playlist
  const playPlaylist = useCallback(
    async (playlist: WavlakePlaylist, startIndex = 0) => {
      let tracks = playlist.tracks;

      // Fetch tracks if not included
      if (!tracks || tracks.length === 0) {
        const fullPlaylist = await WavlakeService.getPlaylist(playlist.id);
        tracks = fullPlaylist.tracks;
      }

      if (tracks && tracks.length > 0) {
        await store.setQueue(tracks, startIndex);
        await MusicPlayerService.loadTrack(tracks[startIndex]);
      }
    },
    [store.setQueue]
  );

  // Play Top 40
  const playTop40 = useCallback(async () => {
    const tracks = await WavlakeService.getTopTracks();
    if (tracks.length > 0) {
      await store.setQueue(tracks, 0);
      await MusicPlayerService.loadTrack(tracks[0]);
    }
  }, [store.setQueue]);

  // Add track to queue
  const addToQueue = useCallback(
    (track: WavlakeTrack) => {
      store.addToQueue(track);
    },
    [store.addToQueue]
  );

  // Clear queue
  const clearQueue = useCallback(() => {
    MusicPlayerService.stop();
    store.clearQueue();
  }, [store.clearQueue]);

  // Hide player
  const hidePlayer = useCallback(() => {
    MusicPlayerService.stop();
    store.hideMiniPlayer();
  }, [store.hideMiniPlayer]);

  return {
    // State
    currentTrack: store.currentTrack,
    isPlaying: store.playbackState === 'playing',
    isLoading: store.playbackState === 'loading',
    position: store.position,
    duration: store.duration,
    progress,
    queue: store.queue,
    queueIndex: store.queueIndex,
    isExpanded: store.isExpanded,
    isPlaylistBrowserOpen: store.isPlaylistBrowserOpen,
    isMiniPlayerVisible: store.isMiniPlayerVisible,
    isEnabled: store.isEnabled,
    shuffleEnabled: store.shuffleEnabled,
    repeatMode: store.repeatMode,

    // Controls
    play,
    pause,
    togglePlayPause,
    skipNext,
    skipPrevious,
    seekTo,
    setVolume,
    toggleShuffle,
    toggleRepeat,

    // Queue management
    playTrack,
    playPlaylist,
    playTop40,
    addToQueue,
    clearQueue,

    // UI controls
    expandPlayer: store.expandPlayer,
    collapsePlayer: store.collapsePlayer,
    openPlaylistBrowser: store.openPlaylistBrowser,
    closePlaylistBrowser: store.closePlaylistBrowser,
    hidePlayer,
  };
}

export default useWavlakePlayer;
