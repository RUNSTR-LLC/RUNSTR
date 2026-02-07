/**
 * MusicPlayerService - Audio playback service using expo-av
 * Handles actual audio playback, background mode, and audio ducking
 */

import { Audio, AVPlaybackStatus, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useMusicStore } from '../../store/musicStore';
import { WavlakeService } from './WavlakeService';
import type { WavlakeTrack } from '../../types/music';
import { isBlossomTrack } from '../../types/music';
import type { BlossomTrack } from '../../types/blossom';

class MusicPlayerServiceClass {
  private sound: Audio.Sound | null = null;
  private isInitialized = false;
  private isDucked = false;
  private previousVolume = 1;
  private positionUpdateInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize audio session for background playback
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[MusicPlayer] Initializing audio session...');

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        allowsRecordingIOS: false,

        // iOS: Mix with other audio by default
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,

        // Android: Mix with other audio
        shouldDuckAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,

        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
      console.log('[MusicPlayer] Audio session initialized');
    } catch (error) {
      console.error('[MusicPlayer] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Load and play a track (supports both Wavlake and Blossom tracks)
   */
  async loadTrack(track: WavlakeTrack | BlossomTrack): Promise<void> {
    const store = useMusicStore.getState();

    try {
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Unload current sound if exists
      await this.unloadSound();

      store.setPlaybackState('loading');

      // Get stream URL based on track source
      let streamUrl: string;

      if (isBlossomTrack(track)) {
        // Blossom: Use direct URL (no stream wrapping needed)
        streamUrl = track.mediaUrl;
        console.log('[MusicPlayer] Using direct Blossom URL:', streamUrl);
      } else {
        // Wavlake: Fetch stream URL if not present
        streamUrl = track.streamUrl || '';
        if (!streamUrl) {
          console.log('[MusicPlayer] Fetching stream URL for:', track.id);
          streamUrl = await WavlakeService.getStreamUrl(track.id);
        }
      }

      console.log('[MusicPlayer] Loading track:', track.title);

      // Create and load sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        {
          shouldPlay: true,
          volume: this.isDucked ? 0.2 : store.volume,
          progressUpdateIntervalMillis: 500,
        },
        this.onPlaybackStatusUpdate
      );

      this.sound = sound;
      console.log('[MusicPlayer] Track loaded and playing');
    } catch (error) {
      console.error('[MusicPlayer] Failed to load track:', error);
      store.setPlaybackState('error');
      throw error;
    }
  }

  /**
   * Playback status update handler
   */
  private onPlaybackStatusUpdate = (status: AVPlaybackStatus): void => {
    const store = useMusicStore.getState();

    if (!status.isLoaded) {
      if (status.error) {
        console.error('[MusicPlayer] Playback error:', status.error);
        store.setPlaybackState('error');
      }
      return;
    }

    // Update position
    if (status.positionMillis !== undefined) {
      store.updatePosition(Math.floor(status.positionMillis / 1000));
    }

    // Update duration
    if (status.durationMillis !== undefined) {
      store.updateDuration(Math.floor(status.durationMillis / 1000));
    }

    // Update playback state
    if (status.isPlaying) {
      store.setPlaybackState('playing');
    } else if (status.isBuffering) {
      store.setPlaybackState('loading');
    } else {
      store.setPlaybackState('paused');
    }

    // Handle track completion
    if (status.didJustFinish && !status.isLooping) {
      console.log('[MusicPlayer] Track finished, playing next');
      this.handleTrackEnd();
    }
  };

  /**
   * Handle track end - play next or stop
   */
  private async handleTrackEnd(): Promise<void> {
    const store = useMusicStore.getState();
    const { repeatMode } = store;

    if (repeatMode === 'one') {
      // Repeat current track
      await this.seekTo(0);
      await this.play();
      return;
    }

    // Try to play next track
    await store.skipToNext();

    // Check if we moved to a new track
    const newState = useMusicStore.getState();
    if (newState.currentTrack && newState.currentTrack.id !== store.currentTrack?.id) {
      await this.loadTrack(newState.currentTrack);
    }
  }

  /**
   * Play current track
   */
  async play(): Promise<void> {
    if (!this.sound) {
      console.warn('[MusicPlayer] No sound loaded');
      return;
    }

    try {
      await this.sound.playAsync();
      console.log('[MusicPlayer] Playing');
    } catch (error) {
      console.error('[MusicPlayer] Play failed:', error);
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (!this.sound) return;

    try {
      await this.sound.pauseAsync();
      console.log('[MusicPlayer] Paused');
    } catch (error) {
      console.error('[MusicPlayer] Pause failed:', error);
    }
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    if (!this.sound) return;

    try {
      await this.sound.stopAsync();
      useMusicStore.getState().stop();
      console.log('[MusicPlayer] Stopped');
    } catch (error) {
      console.error('[MusicPlayer] Stop failed:', error);
    }
  }

  /**
   * Seek to position (in seconds)
   */
  async seekTo(positionSeconds: number): Promise<void> {
    if (!this.sound) return;

    try {
      await this.sound.setPositionAsync(positionSeconds * 1000);
      useMusicStore.getState().updatePosition(positionSeconds);
    } catch (error) {
      console.error('[MusicPlayer] Seek failed:', error);
    }
  }

  /**
   * Set volume (0-1)
   */
  async setVolume(volume: number): Promise<void> {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (this.sound) {
      try {
        await this.sound.setVolumeAsync(this.isDucked ? clampedVolume * 0.2 : clampedVolume);
      } catch (error) {
        console.error('[MusicPlayer] Set volume failed:', error);
      }
    }
  }

  /**
   * Duck audio for TTS announcements
   * Reduces volume temporarily
   */
  async duckAudio(): Promise<void> {
    if (this.isDucked) return;

    const store = useMusicStore.getState();
    this.previousVolume = store.volume;
    this.isDucked = true;

    if (this.sound) {
      try {
        // Lower volume to 20%
        await this.sound.setVolumeAsync(store.volume * 0.2);
        console.log('[MusicPlayer] Audio ducked for TTS');
      } catch (error) {
        console.error('[MusicPlayer] Duck failed:', error);
      }
    }
  }

  /**
   * Restore audio after TTS announcement
   */
  async restoreAudio(): Promise<void> {
    if (!this.isDucked) return;

    this.isDucked = false;

    if (this.sound) {
      try {
        // Restore previous volume
        await this.sound.setVolumeAsync(this.previousVolume);
        console.log('[MusicPlayer] Audio restored after TTS');
      } catch (error) {
        console.error('[MusicPlayer] Restore failed:', error);
      }
    }
  }

  /**
   * Unload current sound
   */
  private async unloadSound(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
        this.sound = null;
        console.log('[MusicPlayer] Sound unloaded');
      } catch (error) {
        console.error('[MusicPlayer] Unload failed:', error);
      }
    }
  }

  /**
   * Get current playback status
   */
  async getStatus(): Promise<AVPlaybackStatus | null> {
    if (!this.sound) return null;

    try {
      return await this.sound.getStatusAsync();
    } catch (error) {
      console.error('[MusicPlayer] Get status failed:', error);
      return null;
    }
  }

  /**
   * Cleanup service
   */
  async cleanup(): Promise<void> {
    await this.unloadSound();

    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }

    this.isInitialized = false;
    console.log('[MusicPlayer] Cleanup complete');
  }

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return useMusicStore.getState().playbackState === 'playing';
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton
export const MusicPlayerService = new MusicPlayerServiceClass();
export default MusicPlayerService;
