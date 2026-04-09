/**
 * MiniMusicPlayer - Collapsed music player bar above bottom tabs
 * Shows current track, progress, and basic controls
 *
 * FIXED: React hooks violation - early returns must come AFTER all hooks
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useMusicStore } from '../../store/musicStore';
import { MusicPlayerService } from '../../services/music/MusicPlayerService';
import { MINI_PLAYER_HEIGHT, BOTTOM_TAB_HEIGHT } from '../../constants/music';
import { BlossomPlaceholder } from './BlossomPlaceholder';
import { isBlossomTrack } from '../../types/music';
import type { WavlakeTrack } from '../../types/music';
import type { BlossomTrack } from '../../types/blossom';

export const MiniMusicPlayer: React.FC = React.memo(() => {
  const {
    currentTrack,
    playbackState,
    position,
    duration,
    isMiniPlayerVisible,
    expandPlayer,
  } = useMusicStore();

  // State for image fallback
  const [imageError, setImageError] = useState(false);

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading';
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  /**
   * Handle play/pause toggle
   */
  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await MusicPlayerService.pause();
    } else {
      await MusicPlayerService.play();
    }
  }, [isPlaying]);

  /**
   * Handle skip to next track
   */
  const handleSkipNext = useCallback(async () => {
    const store = useMusicStore.getState();
    await store.skipToNext();

    // Load the new track
    const newState = useMusicStore.getState();
    if (newState.currentTrack) {
      await MusicPlayerService.loadTrack(newState.currentTrack);
    }
  }, []);

  // FIXED: Early return AFTER all hooks to prevent "Rendered more hooks" error
  if (!currentTrack || !isMiniPlayerVisible) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={expandPlayer}
      activeOpacity={0.95}
    >
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Track artwork - Pink flower placeholder for Blossom tracks */}
        {!isBlossomTrack(currentTrack) && (currentTrack as WavlakeTrack).artworkUrl && !imageError ? (
          <Image
            source={{ uri: (currentTrack as WavlakeTrack).artworkUrl }}
            style={styles.artwork}
            onError={() => setImageError(true)}
          />
        ) : isBlossomTrack(currentTrack) ? (
          // Check for custom artwork on Blossom tracks
          (currentTrack as BlossomTrack).customArtworkUrl ? (
            <Image
              source={{ uri: (currentTrack as BlossomTrack).customArtworkUrl }}
              style={styles.artwork}
              onError={() => setImageError(true)}
            />
          ) : (
            <BlossomPlaceholder size="medium" style={styles.artwork} />
          )
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Ionicons
              name="musical-note"
              size={20}
              color={theme.colors.textMuted}
            />
          </View>
        )}

        {/* Track info - Show custom metadata for Blossom tracks if available */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {isBlossomTrack(currentTrack) && (currentTrack as BlossomTrack).customTitle
              ? (currentTrack as BlossomTrack).customTitle
              : currentTrack.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {isBlossomTrack(currentTrack) && (currentTrack as BlossomTrack).customArtist
              ? (currentTrack as BlossomTrack).customArtist
              : currentTrack.artist.name}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Play/Pause button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <Ionicons
                name="hourglass-outline"
                size={28}
                color={theme.colors.text}
              />
            ) : isPlaying ? (
              <Ionicons name="pause" size={28} color={theme.colors.text} />
            ) : (
              <Ionicons name="play" size={28} color={theme.colors.text} />
            )}
          </TouchableOpacity>

          {/* Skip next button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleSkipNext}
          >
            <Ionicons
              name="play-skip-forward"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: BOTTOM_TAB_HEIGHT,
    left: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: theme.colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.border,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.text,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 2, // Account for progress bar
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: theme.colors.background,
  },
  artworkPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: 8,
  },
});

export default MiniMusicPlayer;
