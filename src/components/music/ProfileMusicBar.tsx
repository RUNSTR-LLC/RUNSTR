/**
 * ProfileMusicBar - Always-visible music bar at top of Profile screen
 *
 * Two states:
 * 1. Empty state: Shows "Browse Music" button that opens PlaylistBrowser
 * 2. Playing state: Shows track artwork, title, artist, play/pause button
 */

import React, { useState, useCallback } from 'react';
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
import { BlossomPlaceholder } from './BlossomPlaceholder';
import { isBlossomTrack } from '../../types/music';
import type { WavlakeTrack } from '../../types/music';
import type { BlossomTrack } from '../../types/blossom';

export const ProfileMusicBar: React.FC = React.memo(() => {
  const {
    currentTrack,
    playbackState,
    openPlaylistBrowser,
    expandPlayer,
  } = useMusicStore();

  // State for image fallback
  const [imageError, setImageError] = useState(false);

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading';

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
   * Handle bar press - opens expanded player if playing, playlist browser if not
   */
  const handleBarPress = useCallback(() => {
    if (currentTrack) {
      expandPlayer();
    } else {
      openPlaylistBrowser();
    }
  }, [currentTrack, expandPlayer, openPlaylistBrowser]);

  // Empty state - no music playing
  if (!currentTrack) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={openPlaylistBrowser}
        activeOpacity={0.7}
      >
        <View style={styles.emptyContent}>
          <Ionicons
            name="musical-notes"
            size={22}
            color={theme.colors.textMuted}
          />
          <Text style={styles.browseText}>Browse Music</Text>
        </View>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={openPlaylistBrowser}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // Playing state - show track info
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleBarPress}
      activeOpacity={0.7}
    >
      <View style={styles.playingContent}>
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

        {/* Play/Pause button */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          disabled={isLoading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isLoading ? (
            <Ionicons
              name="hourglass-outline"
              size={24}
              color={theme.colors.text}
            />
          ) : isPlaying ? (
            <Ionicons name="pause" size={24} color={theme.colors.text} />
          ) : (
            <Ionicons name="play" size={24} color={theme.colors.text} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  browseText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
  },
  browseButton: {
    padding: 4,
  },
  playingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  artwork: {
    width: 40,
    height: 40,
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
  playButton: {
    padding: 8,
  },
});

export default ProfileMusicBar;
