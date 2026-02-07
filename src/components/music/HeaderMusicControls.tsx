/**
 * HeaderMusicControls - Redesigned compact music player for Profile header
 * Features: Progress bar at top, album art, track info, playback controls
 * Design: Option C - Full-Width Progress Bar Style
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useMusicStore } from '../../store/musicStore';
import { MusicPlayerService } from '../../services/music/MusicPlayerService';
import { isBlossomTrack } from '../../types/music';
import type { WavlakeTrack } from '../../types/music';

interface HeaderMusicControlsProps {
  onSettingsPress: () => void;
}

/**
 * Format seconds to M:SS or H:MM:SS format
 */
const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const HeaderMusicControls: React.FC<HeaderMusicControlsProps> = ({
  onSettingsPress,
}) => {
  const {
    currentTrack,
    playbackState,
    position,
    duration,
    expandPlayer,
    openPlaylistBrowser,
  } = useMusicStore();

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading';
  const hasTrack = currentTrack !== null;

  // Calculate progress percentage (0-100)
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  /**
   * Handle play/pause toggle
   */
  const handlePlayPause = async () => {
    if (isPlaying) {
      await MusicPlayerService.pause();
    } else if (currentTrack) {
      await MusicPlayerService.play();
    }
  };

  /**
   * Handle skip to next track - also loads the track audio
   */
  const handleSkipNext = async () => {
    const store = useMusicStore.getState();
    await store.skipToNext();
    const newState = useMusicStore.getState();
    if (newState.currentTrack) {
      await MusicPlayerService.loadTrack(newState.currentTrack);
    }
  };

  /**
   * Handle skip to previous track - also loads the track audio
   */
  const handleSkipPrevious = async () => {
    const store = useMusicStore.getState();
    await store.skipToPrevious();
    const newState = useMusicStore.getState();
    if (newState.currentTrack) {
      await MusicPlayerService.loadTrack(newState.currentTrack);
    }
  };

  /**
   * Handle artwork tap - expand to full player
   */
  const handleArtworkTap = () => {
    if (hasTrack) {
      expandPlayer();
    } else {
      openPlaylistBrowser();
    }
  };

  /**
   * Handle progress bar tap - expand to full player for seeking
   */
  const handleProgressTap = () => {
    if (hasTrack) {
      expandPlayer();
    }
  };

  /**
   * Handle browse music tap (when no track is playing)
   */
  const handleBrowseMusic = () => {
    openPlaylistBrowser();
  };

  // No track loaded - show compact browse music bar
  if (!hasTrack) {
    return (
      <View style={styles.emptyContainer}>
        <TouchableOpacity
          style={styles.browseRow}
          onPress={handleBrowseMusic}
          activeOpacity={0.7}
        >
          <Ionicons name="musical-notes" size={20} color={theme.colors.accent} />
          <Text style={styles.browseText}>Browse Music</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onSettingsPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu-outline" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  }

  // Track loaded - show full player controls
  return (
    <View style={styles.container}>
      {/* Progress Bar - Full Width at Top */}
      <TouchableOpacity
        style={styles.progressContainer}
        onPress={handleProgressTap}
        activeOpacity={0.8}
      >
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </TouchableOpacity>

      {/* Content Row: Art + Track Info + Controls + Menu */}
      <View style={styles.contentRow}>
        {/* Album Artwork - Tappable to expand player */}
        <TouchableOpacity onPress={handleArtworkTap} activeOpacity={0.8}>
          {!isBlossomTrack(currentTrack) && (currentTrack as WavlakeTrack).artworkUrl ? (
            <Image source={{ uri: (currentTrack as WavlakeTrack).artworkUrl }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.placeholderArtwork]}>
              <Ionicons
                name={isBlossomTrack(currentTrack) ? 'cloud' : 'musical-note'}
                size={22}
                color={theme.colors.textMuted}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Track Info */}
        <TouchableOpacity
          style={styles.trackInfo}
          onPress={handleArtworkTap}
          activeOpacity={0.8}
        >
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTrack.title || 'Unknown Track'}
          </Text>
          <Text style={styles.trackSubtitle} numberOfLines={1}>
            {currentTrack.artist?.name || 'Unknown Artist'} • {formatTime(position)} / {formatTime(duration)}
          </Text>
        </TouchableOpacity>

        {/* Playback Controls */}
        <View style={styles.controls}>
          {/* Previous */}
          <TouchableOpacity
            onPress={handleSkipPrevious}
            style={styles.controlButton}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Ionicons name="play-skip-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity
            onPress={handlePlayPause}
            style={styles.playButton}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color={theme.colors.text}
              />
            )}
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity
            onPress={handleSkipNext}
            style={styles.controlButton}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Ionicons name="play-skip-forward" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onSettingsPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu-outline" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main container with track loaded
  container: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Progress bar at top
  progressContainer: {
    width: '100%',
    paddingVertical: 2,
  },
  progressBackground: {
    height: 4,
    backgroundColor: theme.colors.border,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },

  // Content row
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Album artwork
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: theme.colors.border,
  },
  placeholderArtwork: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Track info
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  trackSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  // Playback controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlButton: {
    padding: 6,
  },
  playButton: {
    padding: 6,
    marginHorizontal: 2,
  },

  // Menu button
  menuButton: {
    padding: 6,
    marginLeft: 8,
  },

  // Empty state (no track)
  emptyContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  browseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  browseText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
});

export default HeaderMusicControls;
