/**
 * TrackRow - Individual track display component
 * Shows track artwork, title, artist, and duration
 *
 * FIXED: Image fallback using onError handler instead of defaultSource
 *
 * NOTE: Like button removed - Wavlake library API not publicly available yet
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { WavlakeTrack, AnyTrack } from '../../types/music';
import { isBlossomTrack } from '../../types/music';
import type { BlossomTrack } from '../../types/blossom';
import { BlossomPlaceholder } from './BlossomPlaceholder';

interface TrackRowProps {
  track: AnyTrack;
  onPress: () => void;
  isPlaying?: boolean;
  isCurrentTrack?: boolean;
  showIndex?: number;
  onOptionsPress?: () => void;
  onEditPress?: (track: BlossomTrack) => void; // Edit callback for Blossom tracks
}

export const TrackRow: React.FC<TrackRowProps> = React.memo(({
  track,
  onPress,
  isPlaying = false,
  isCurrentTrack = false,
  showIndex,
  onOptionsPress,
  onEditPress,
}) => {
  // State for image fallback
  const [imageError, setImageError] = useState(false);

  // Check if track is from Blossom (no artwork)
  const isBlossom = isBlossomTrack(track);
  const hasArtwork = !isBlossom && 'artworkUrl' in track && track.artworkUrl;

  /**
   * Format duration from seconds to mm:ss
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, isCurrentTrack && styles.currentTrack]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Index or playing indicator */}
      {showIndex !== undefined ? (
        <View style={styles.indexContainer}>
          {isPlaying ? (
            <Ionicons name="musical-notes" size={16} color={theme.colors.accent} />
          ) : (
            <Text style={styles.indexText}>{showIndex + 1}</Text>
          )}
        </View>
      ) : null}

      {/* Artwork - Handle Blossom tracks with pink flower placeholder */}
      {hasArtwork && !imageError ? (
        <Image
          source={{ uri: (track as WavlakeTrack).artworkUrl }}
          style={styles.artwork}
          onError={() => setImageError(true)}
        />
      ) : isBlossom ? (
        // Check for custom artwork on Blossom tracks first
        (track as BlossomTrack).customArtworkUrl ? (
          <Image
            source={{ uri: (track as BlossomTrack).customArtworkUrl }}
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
            size={24}
            color={theme.colors.textMuted}
          />
        </View>
      )}

      {/* Track info - Show custom metadata for Blossom tracks if available */}
      <View style={styles.info}>
        <Text
          style={[styles.title, isCurrentTrack && styles.currentTitle]}
          numberOfLines={1}
        >
          {isBlossom && (track as BlossomTrack).customTitle
            ? (track as BlossomTrack).customTitle
            : track.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {isBlossom && (track as BlossomTrack).customArtist
            ? (track as BlossomTrack).customArtist
            : track.artist.name}
          {track.artist.verified && (
            <Text style={styles.verifiedBadge}> ✓</Text>
          )}
        </Text>
      </View>

      {/* Duration */}
      <Text style={styles.duration}>{formatDuration(track.duration)}</Text>

      {/* Edit button for Blossom tracks */}
      {isBlossom && onEditPress && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEditPress(track as BlossomTrack)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="pencil"
            size={16}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      )}

      {/* Options button */}
      {onOptionsPress && (
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={onOptionsPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  currentTrack: {
    backgroundColor: 'rgba(255, 123, 28, 0.1)',
    borderRadius: 8,
  },
  indexContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: theme.colors.cardBackground,
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
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  currentTitle: {
    color: theme.colors.accent,
  },
  artist: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  verifiedBadge: {
    color: theme.colors.accent,
    fontSize: 12,
  },
  duration: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginRight: 4,
  },
  editButton: {
    padding: 6,
    marginRight: 4,
  },
  optionsButton: {
    padding: 4,
  },
});

export default TrackRow;
