/**
 * ExpandedMusicPlayer - Full screen music player modal
 * Shows album art, full controls, queue, and zap button
 *
 * FIXED: React hooks violation - all hooks must be called before early returns
 * FIXED: Image fallback using onError handler instead of defaultSource
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useMusicStore } from '../../store/musicStore';
import { MusicPlayerService } from '../../services/music/MusicPlayerService';
import { TrackRow } from './TrackRow';
import { ExternalZapModal } from '../nutzap/ExternalZapModal';
import { BlossomPlaceholder } from './BlossomPlaceholder';
import { isBlossomTrack } from '../../types/music';
import type { WavlakeTrack } from '../../types/music';
import type { BlossomTrack } from '../../types/blossom';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH - 80;

export const ExpandedMusicPlayer: React.FC = React.memo(() => {
  const {
    currentTrack,
    playbackState,
    position,
    duration,
    isExpanded,
    queue,
    queueIndex,
    shuffleEnabled,
    repeatMode,
    collapsePlayer,
    openPlaylistBrowser,
    setShuffle,
    setRepeatMode,
  } = useMusicStore();

  // State for image fallback - MUST be before any early returns
  const [imageError, setImageError] = useState(false);

  // State for zap modal
  const [showZapModal, setShowZapModal] = useState(false);

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading';

  // Check if artist has a valid zap destination (only for Wavlake tracks)
  const isBlossom = currentTrack ? isBlossomTrack(currentTrack) : false;
  const wavlakeTrack = !isBlossom && currentTrack ? currentTrack as WavlakeTrack : null;
  const artistZapAddress = wavlakeTrack?.artist?.lightningAddress || wavlakeTrack?.artist?.npub || '';
  const canZapArtist = artistZapAddress.length > 0;

  /**
   * Format time from seconds to mm:ss
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    const newState = useMusicStore.getState();
    if (newState.currentTrack) {
      await MusicPlayerService.loadTrack(newState.currentTrack);
    }
  }, []);

  /**
   * Handle skip to previous track
   */
  const handleSkipPrevious = useCallback(async () => {
    const store = useMusicStore.getState();
    await store.skipToPrevious();
    const newState = useMusicStore.getState();
    if (newState.currentTrack && position < 3) {
      await MusicPlayerService.loadTrack(newState.currentTrack);
    } else {
      await MusicPlayerService.seekTo(0);
    }
  }, [position]);

  /**
   * Handle seek on progress bar
   */
  const handleSeek = useCallback(
    async (event: any) => {
      if (!duration) return;
      const { locationX } = event.nativeEvent;
      const progressWidth = SCREEN_WIDTH - 48;
      const seekPosition = (locationX / progressWidth) * duration;
      await MusicPlayerService.seekTo(Math.max(0, seekPosition));
    },
    [duration]
  );

  /**
   * Toggle shuffle mode
   */
  const toggleShuffle = useCallback(() => {
    setShuffle(!shuffleEnabled);
  }, [shuffleEnabled, setShuffle]);

  /**
   * Cycle repeat mode
   */
  const cycleRepeatMode = useCallback(() => {
    const modes = ['off', 'all', 'one'] as const;
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
  }, [repeatMode, setRepeatMode]);

  /**
   * Play a track from queue
   */
  const playFromQueue = useCallback(async (index: number) => {
    const store = useMusicStore.getState();
    const track = store.queue[index];
    if (track) {
      useMusicStore.setState({
        queueIndex: index,
        currentTrack: track,
        position: 0,
      });
      await MusicPlayerService.loadTrack(track);
    }
  }, []);

  /**
   * Handle opening playlist browser
   * FIXED: Must collapse player first to avoid modal nesting conflict
   * Two modals can't render on top of each other properly
   */
  const handleOpenBrowser = useCallback(() => {
    collapsePlayer();
    // Small delay to let the collapse animation complete before opening browser
    setTimeout(() => {
      openPlaylistBrowser();
    }, 100);
  }, [collapsePlayer, openPlaylistBrowser]);

  // Get upcoming tracks in queue
  const upNextTracks = queue.slice(queueIndex + 1, queueIndex + 6);

  if (!currentTrack) {
    return null;
  }

  return (
    <Modal
      visible={isExpanded}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={collapsePlayer}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={collapsePlayer}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-down" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <TouchableOpacity
            onPress={handleOpenBrowser}
            style={styles.headerButton}
          >
            <Ionicons name="list" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Album artwork - Pink flower placeholder for Blossom tracks */}
          <View style={styles.artworkContainer}>
            {!isBlossom && wavlakeTrack?.artworkUrl && !imageError ? (
              <Image
                source={{ uri: wavlakeTrack.artworkUrl }}
                style={styles.artwork}
                onError={() => setImageError(true)}
              />
            ) : isBlossom ? (
              // Check for custom artwork on Blossom tracks
              (currentTrack as BlossomTrack).customArtworkUrl ? (
                <Image
                  source={{ uri: (currentTrack as BlossomTrack).customArtworkUrl }}
                  style={styles.artwork}
                  onError={() => setImageError(true)}
                />
              ) : (
                <BlossomPlaceholder size="large" style={styles.artwork} />
              )
            ) : (
              <View style={[styles.artwork, styles.artworkPlaceholder]}>
                <Ionicons
                  name="musical-notes"
                  size={80}
                  color={theme.colors.textMuted}
                />
              </View>
            )}
          </View>

          {/* Track info - Show custom metadata for Blossom tracks if available */}
          <View style={styles.trackInfo}>
            <Text style={styles.title} numberOfLines={2}>
              {isBlossom && (currentTrack as BlossomTrack).customTitle
                ? (currentTrack as BlossomTrack).customTitle
                : currentTrack.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {isBlossom && (currentTrack as BlossomTrack).customArtist
                ? (currentTrack as BlossomTrack).customArtist
                : currentTrack.artist.name}
              {currentTrack.artist.verified && ' ✓'}
            </Text>
          </View>

          {/* Zap artist button - only show if artist has lightning address */}
          {canZapArtist ? (
            <View style={styles.zapContainer}>
              <TouchableOpacity
                style={styles.zapButton}
                onPress={() => setShowZapModal(true)}
              >
                <Ionicons name="flash" size={20} color={theme.colors.text} />
                <Text style={styles.zapButtonText}>Zap Artist</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.zapContainer}>
              <View style={styles.zapButtonDisabled}>
                <Ionicons
                  name="flash-outline"
                  size={20}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.zapButtonTextDisabled}>
                  Zap unavailable
                </Text>
              </View>
            </View>
          )}

          {/* External Zap Modal */}
          {canZapArtist && (
            <ExternalZapModal
              visible={showZapModal}
              onClose={() => setShowZapModal(false)}
              recipientName={currentTrack.artist.name}
              recipientNpub={artistZapAddress}
            />
          )}

          {/* Progress bar */}
          <TouchableOpacity
            style={styles.progressContainer}
            onPress={handleSeek}
            activeOpacity={0.9}
          >
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </TouchableOpacity>

          {/* Main controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={toggleShuffle}
              style={styles.secondaryControl}
            >
              <Ionicons
                name="shuffle"
                size={24}
                color={
                  shuffleEnabled ? theme.colors.accent : theme.colors.textMuted
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkipPrevious}
              style={styles.controlButton}
            >
              <Ionicons
                name="play-skip-back"
                size={32}
                color={theme.colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePlayPause}
              style={styles.playButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <Ionicons name="hourglass" size={36} color="#000" />
              ) : isPlaying ? (
                <Ionicons name="pause" size={36} color="#000" />
              ) : (
                <Ionicons name="play" size={36} color="#000" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkipNext}
              style={styles.controlButton}
            >
              <Ionicons
                name="play-skip-forward"
                size={32}
                color={theme.colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={cycleRepeatMode}
              style={styles.secondaryControl}
            >
              <Ionicons
                name={repeatMode === 'one' ? 'repeat' : 'repeat'}
                size={24}
                color={
                  repeatMode !== 'off'
                    ? theme.colors.accent
                    : theme.colors.textMuted
                }
              />
              {repeatMode === 'one' && (
                <Text style={styles.repeatOneIndicator}>1</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Up next section */}
          {upNextTracks.length > 0 && (
            <View style={styles.upNextSection}>
              <Text style={styles.sectionTitle}>Up Next</Text>
              {upNextTracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  onPress={() => playFromQueue(queueIndex + 1 + index)}
                  showIndex={queueIndex + 1 + index}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  artworkContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 12,
    backgroundColor: theme.colors.cardBackground,
  },
  artworkPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  zapContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  zapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  zapButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  zapButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    opacity: 0.5,
  },
  zapButtonTextDisabled: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  artist: {
    color: theme.colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBackground: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.textMuted,
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  secondaryControl: {
    padding: 12,
    position: 'relative',
  },
  repeatOneIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },
  controlButton: {
    padding: 16,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  upNextSection: {
    marginTop: 16,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
});

export default ExpandedMusicPlayer;
