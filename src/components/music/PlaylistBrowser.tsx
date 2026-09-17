/**
 * PlaylistBrowser - Modal for browsing music playlists
 * Shows Top 40, Rock, and Hip-Hop playlists from Wavlake
 * Displays playlist cards in browse view, track list when selected
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useMusicStore } from '../../store/musicStore';
import { WavlakeService } from '../../services/music/WavlakeService';
import { MusicPlayerService } from '../../services/music/MusicPlayerService';
import { BlossomService } from '../../services/music/BlossomService';
import { BlossomAuthService } from '../../services/music/BlossomAuthService';
import { BlossomMetadataService } from '../../services/music/BlossomMetadataService';
import { BlossomPlaylistMetadataService } from '../../services/music/BlossomPlaylistMetadataService';
import { TrackRow } from './TrackRow';
import { BlossomServerManager } from './BlossomServerManager';
import { BlossomPlaceholder } from './BlossomPlaceholder';
import { BlossomTrackEditModal } from './BlossomTrackEditModal';
import { BlossomPlaylistEditModal } from './BlossomPlaylistEditModal';
import type { WavlakeTrack, AnyTrack } from '../../types/music';
import { isBlossomTrack } from '../../types/music';
import type { BlossomTrack, BlossomPlaylistMetadata } from '../../types/blossom';

// Playlist identifiers - now includes dynamic 'blossom-{serverUrl}' for per-server playlists
type PlaylistId = 'top40' | 'hiphop' | 'rock' | string | null;

interface PlaylistData {
  id: PlaylistId;
  title: string;
  tracks: AnyTrack[];
  serverUrl?: string; // For Blossom playlists
  serverName?: string; // Original server name (for edit modal)
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

/**
 * PlaylistCard - Shows a playlist with single cover image
 * Blossom playlists show custom cover or first track artwork or 🌸 placeholder
 * Wavlake playlists show 2x2 grid
 */
const PlaylistCard: React.FC<{
  playlist: PlaylistData;
  playlistMetadata?: BlossomPlaylistMetadata | null;
  onPress: () => void;
  onEdit?: () => void;
}> = React.memo(({ playlist, playlistMetadata, onPress, onEdit }) => {
  // Check if this is a Blossom playlist (starts with blossom-)
  const isBlossom = playlist.id?.toString().startsWith('blossom');

  // Determine cover source for Blossom playlists
  const blossomCoverSource = useMemo(() => {
    if (!isBlossom) return null;

    // Priority: custom cover > first track's custom artwork > null (use placeholder)
    if (playlistMetadata?.coverImageUri) {
      return { uri: playlistMetadata.coverImageUri };
    }

    const firstTrack = playlist.tracks[0];
    if (firstTrack && isBlossomTrack(firstTrack)) {
      const blossomTrack = firstTrack as BlossomTrack;
      if (blossomTrack.customArtworkUrl) {
        return { uri: blossomTrack.customArtworkUrl };
      }
    }

    return null;
  }, [isBlossom, playlistMetadata, playlist.tracks]);

  // Get first 4 tracks for Wavlake artwork grid
  const wavlakeArtworkData = useMemo(() => {
    if (isBlossom) return [];
    return playlist.tracks.slice(0, 4).map((t) => ({
      url: (t as WavlakeTrack).artworkUrl,
    }));
  }, [isBlossom, playlist.tracks]);

  // Display title: use custom name for Blossom playlists
  const displayTitle = useMemo(() => {
    if (isBlossom && playlistMetadata?.customName) {
      return `🌸 ${playlistMetadata.customName}`;
    }
    return playlist.title;
  }, [isBlossom, playlistMetadata, playlist.title]);

  if (playlist.tracks.length === 0) return null;

  return (
    <TouchableOpacity style={styles.playlistCard} onPress={onPress}>
      {/* Blossom playlists: single cover image */}
      {isBlossom ? (
        <View style={styles.singleCoverContainer}>
          {blossomCoverSource ? (
            <Image source={blossomCoverSource} style={styles.singleCoverImage} />
          ) : (
            <View style={styles.blossomCoverPlaceholder}>
              <BlossomPlaceholder size="large" style={styles.blossomLarge} />
            </View>
          )}
          {/* Edit button overlay */}
          {onEdit && (
            <TouchableOpacity
              style={styles.editOverlay}
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Ionicons name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* Wavlake playlists: 2x2 artwork grid */
        <View style={styles.artworkGrid}>
          {wavlakeArtworkData.map((item, index) => (
            <View key={index} style={styles.artworkCell}>
              {item.url ? (
                <Image source={{ uri: item.url }} style={styles.artworkImage} />
              ) : (
                <View style={styles.artworkPlaceholder}>
                  <Ionicons
                    name="musical-note"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </View>
              )}
            </View>
          ))}
          {/* Fill remaining cells if less than 4 tracks */}
          {Array.from({ length: Math.max(0, 4 - wavlakeArtworkData.length) }).map(
            (_, index) => (
              <View key={`empty-${index}`} style={styles.artworkCell}>
                <View style={styles.artworkPlaceholder}>
                  <Ionicons
                    name="musical-note"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </View>
              </View>
            )
          )}
        </View>
      )}
      <Text style={styles.playlistTitle} numberOfLines={1}>
        {displayTitle}
      </Text>
      <Text style={styles.playlistCount}>
        {playlist.tracks.length} tracks
      </Text>
    </TouchableOpacity>
  );
});

export const PlaylistBrowser: React.FC = React.memo(() => {
  const {
    isPlaylistBrowserOpen,
    closePlaylistBrowser,
    currentTrack,
    setQueue,
    playbackState,
    blossomTracksByServer,
    blossomServers,
    setBlossomTracksByServer,
    setBlossomLoading,
  } = useMusicStore();

  // Playlist data state
  const [top40Tracks, setTop40Tracks] = useState<WavlakeTrack[]>([]);
  const [hiphopTracks, setHiphopTracks] = useState<WavlakeTrack[]>([]);
  const [rockTracks, setRockTracks] = useState<WavlakeTrack[]>([]);

  // Blossom state
  const [isServerManagerOpen, setIsServerManagerOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<BlossomTrack | null>(null);
  const [playlistMetadata, setPlaylistMetadata] = useState<Record<string, BlossomPlaylistMetadata>>({});
  const [editingPlaylist, setEditingPlaylist] = useState<{
    serverUrl: string;
    serverName: string;
  } | null>(null);

  // UI state
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistId>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load playlist metadata from storage
   */
  const loadPlaylistMetadata = useCallback(async () => {
    try {
      const metadata = await BlossomPlaylistMetadataService.getAllMetadata();
      setPlaylistMetadata(metadata);
      console.log('[PlaylistBrowser] Loaded playlist metadata:', Object.keys(metadata).length);
    } catch (error) {
      console.error('[PlaylistBrowser] Failed to load playlist metadata:', error);
    }
  }, []);

  /**
   * Load Blossom tracks if authenticated - grouped by server for per-server playlists
   */
  const loadBlossomTracks = useCallback(async () => {
    try {
      const canAuth = await BlossomAuthService.canAuthenticate();
      if (!canAuth) {
        console.log('[PlaylistBrowser] Not authenticated for Blossom');
        return;
      }

      setBlossomLoading(true);
      const pubkey = await BlossomAuthService.getUserPubkeyHex();
      if (!pubkey) {
        console.log('[PlaylistBrowser] Could not get pubkey for Blossom');
        return;
      }

      // Fetch tracks grouped by server for per-server playlists
      const tracksByServer = await BlossomService.getTracksByServer(pubkey);

      // Apply saved metadata to tracks (custom titles, artists, artwork)
      const tracksWithMetadata = await BlossomMetadataService.applyMetadataToTracksByServer(
        tracksByServer
      );

      setBlossomTracksByServer(tracksWithMetadata);

      const totalTracks = Object.values(tracksWithMetadata).reduce(
        (sum, tracks) => sum + tracks.length,
        0
      );
      console.log('[PlaylistBrowser] Loaded Blossom tracks:', totalTracks, 'from', Object.keys(tracksWithMetadata).length, 'servers');
    } catch (err) {
      console.error('[PlaylistBrowser] Failed to load Blossom tracks:', err);
    } finally {
      setBlossomLoading(false);
    }
  }, [setBlossomTracksByServer, setBlossomLoading]);

  /**
   * Load all playlists in parallel
   */
  const loadAllPlaylists = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Use lowercase genres as required by Wavlake API
      // Ref: https://github.com/SamSamskies/wavlake-playlist-party
      const [top40, hiphop, rock] = await Promise.all([
        WavlakeService.getTopTracks(),
        WavlakeService.getTracksByGenre('hip-hop'),
        WavlakeService.getTracksByGenre('rock'),
      ]);

      setTop40Tracks(top40);
      setHiphopTracks(hiphop);
      setRockTracks(rock);

      console.log('[PlaylistBrowser] Loaded playlists:', {
        top40: top40.length,
        hiphop: hiphop.length,
        rock: rock.length,
      });

      // Load Blossom tracks and playlist metadata in the background
      loadBlossomTracks();
      loadPlaylistMetadata();
    } catch (err) {
      console.error('[PlaylistBrowser] Failed to load playlists:', err);
      setError('Failed to load playlists. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [loadBlossomTracks, loadPlaylistMetadata]);

  /**
   * Load playlists when modal opens
   */
  useEffect(() => {
    if (isPlaylistBrowserOpen) {
      loadAllPlaylists();
    }
  }, [isPlaylistBrowserOpen]);

  /**
   * Reset selected playlist when modal closes
   */
  useEffect(() => {
    if (!isPlaylistBrowserOpen) {
      setSelectedPlaylist(null);
    }
  }, [isPlaylistBrowserOpen]);

  /**
   * Build playlist data objects - now with per-server Blossom playlists
   */
  const playlists: PlaylistData[] = useMemo(() => {
    const allPlaylists: PlaylistData[] = [];

    // Add per-server Blossom playlists first
    Object.entries(blossomTracksByServer).forEach(([serverUrl, tracks]) => {
      if (tracks.length > 0) {
        // Find server name from blossomServers or extract from URL
        const normalizedUrl = serverUrl.replace(/\/+$/, '');
        const serverInfo = blossomServers.find(
          (s) => s.url.replace(/\/+$/, '') === normalizedUrl
        );
        const serverName = serverInfo?.name || new URL(serverUrl).hostname;

        // Get custom name from metadata if available
        const metadata = playlistMetadata[normalizedUrl];
        const displayName = metadata?.customName || serverName;

        allPlaylists.push({
          id: `blossom-${serverUrl}`,
          title: `🌸 ${displayName}`,
          tracks,
          serverUrl: normalizedUrl,
          serverName,
        });
      }
    });

    // Add Wavlake playlists
    allPlaylists.push(
      { id: 'top40', title: 'Top 40 This Week', tracks: top40Tracks },
      { id: 'rock', title: 'Rock', tracks: rockTracks },
      { id: 'hiphop', title: 'Hip-Hop', tracks: hiphopTracks }
    );

    // Filter out empty playlists
    return allPlaylists.filter((p) => p.tracks.length > 0);
  }, [top40Tracks, rockTracks, hiphopTracks, blossomTracksByServer, blossomServers, playlistMetadata]);

  /**
   * Get currently selected playlist tracks
   */
  const selectedPlaylistData = useMemo(() => {
    return playlists.find((p) => p.id === selectedPlaylist);
  }, [playlists, selectedPlaylist]);

  /**
   * Get all tracks across all playlists (deduplicated)
   */
  const getAllTracks = useCallback(() => {
    const allTracks = [...top40Tracks, ...rockTracks, ...hiphopTracks];
    // Deduplicate by track ID
    const seen = new Set<string>();
    return allTracks.filter((track) => {
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });
  }, [top40Tracks, rockTracks, hiphopTracks]);

  /**
   * Play a track from the selected playlist
   */
  const playTrack = useCallback(
    async (track: AnyTrack, index: number) => {
      if (!selectedPlaylistData) return;
      await setQueue(selectedPlaylistData.tracks, index);
      await MusicPlayerService.loadTrack(track);
    },
    [selectedPlaylistData, setQueue]
  );

  /**
   * Shuffle play all tracks across all playlists
   */
  const playAllShuffled = useCallback(async () => {
    const allTracks = getAllTracks();
    if (allTracks.length === 0) return;

    const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
    await setQueue(shuffled, 0);
    await MusicPlayerService.loadTrack(shuffled[0]);
    useMusicStore.getState().setShuffle(true);
  }, [getAllTracks, setQueue]);

  /**
   * Shuffle play tracks from selected playlist
   */
  const playPlaylistShuffled = useCallback(async () => {
    if (!selectedPlaylistData || selectedPlaylistData.tracks.length === 0) return;

    const shuffled = [...selectedPlaylistData.tracks].sort(() => Math.random() - 0.5);
    await setQueue(shuffled, 0);
    await MusicPlayerService.loadTrack(shuffled[0]);
    useMusicStore.getState().setShuffle(true);
  }, [selectedPlaylistData, setQueue]);

  /**
   * Handle editing a Blossom track
   */
  const handleEditTrack = useCallback((track: BlossomTrack) => {
    setEditingTrack(track);
  }, []);

  /**
   * Handle saving edited track metadata
   */
  const handleSaveTrackEdit = useCallback((_updatedTrack: BlossomTrack) => {
    // Refresh Blossom tracks to pick up the metadata changes
    loadBlossomTracks();
  }, [loadBlossomTracks]);

  /**
   * Handle editing a Blossom playlist
   */
  const handleEditPlaylist = useCallback((serverUrl: string, serverName: string) => {
    setEditingPlaylist({ serverUrl, serverName });
  }, []);

  /**
   * Handle saving edited playlist metadata
   */
  const handleSavePlaylistEdit = useCallback((_metadata: BlossomPlaylistMetadata) => {
    // Refresh playlist metadata to pick up the changes
    loadPlaylistMetadata();
  }, [loadPlaylistMetadata]);

  /**
   * Refresh playlists
   */
  const onRefresh = useCallback(() => {
    loadAllPlaylists(true);
  }, [loadAllPlaylists]);

  /**
   * Navigate back to browse view
   */
  const goBackToBrowse = useCallback(() => {
    setSelectedPlaylist(null);
  }, []);

  /**
   * Render Your Library section
   * NOTE: Disabled - Wavlake library API (/v1/library/tracks) not publicly available yet
   * Will be enabled when Wavlake opens the API
   */
  const renderLibrarySection = () => {
    // Library features disabled - API returns 404
    // Uncomment when Wavlake makes library API public
    return null;
  };

  /**
   * Render browse view with playlist cards
   */
  const renderBrowseView = () => (
    <>
      {/* Your Library section */}
      {renderLibrarySection()}

      {/* Shuffle all button */}
      {playlists.length > 0 && (
        <TouchableOpacity style={styles.playAllButton} onPress={playAllShuffled}>
          <Ionicons name="shuffle" size={20} color={theme.colors.text} />
          <Text style={styles.playAllText}>Shuffle Play All</Text>
        </TouchableOpacity>
      )}

      {/* Section title */}
      <Text style={styles.sectionTitle}>Trending</Text>

      {/* Playlist cards grid */}
      <View style={styles.playlistGrid}>
        {playlists.map((playlist) => {
          const isBlossom = playlist.id?.toString().startsWith('blossom');
          const normalizedUrl = playlist.serverUrl?.replace(/\/+$/, '');
          const metadata = normalizedUrl ? playlistMetadata[normalizedUrl] : null;

          return (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              playlistMetadata={metadata}
              onPress={() => setSelectedPlaylist(playlist.id)}
              onEdit={
                isBlossom && playlist.serverUrl && playlist.serverName
                  ? () => handleEditPlaylist(playlist.serverUrl!, playlist.serverName!)
                  : undefined
              }
            />
          );
        })}
      </View>
    </>
  );

  /**
   * Render track list view for selected playlist
   */
  const renderTrackListView = () => {
    if (!selectedPlaylistData) return null;

    return (
      <>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={goBackToBrowse}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Shuffle button */}
        <TouchableOpacity style={styles.playAllButton} onPress={playPlaylistShuffled}>
          <Ionicons name="shuffle" size={20} color={theme.colors.text} />
          <Text style={styles.playAllText}>Shuffle Play</Text>
        </TouchableOpacity>

        {/* Section title */}
        <Text style={styles.sectionTitle}>{selectedPlaylistData.title}</Text>

        {/* Track list */}
        {selectedPlaylistData.tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            onPress={() => playTrack(track, index)}
            showIndex={index}
            isCurrentTrack={currentTrack?.id === track.id}
            isPlaying={
              currentTrack?.id === track.id && playbackState === 'playing'
            }
            onEditPress={isBlossomTrack(track) ? handleEditTrack : undefined}
          />
        ))}
      </>
    );
  };

  return (
    <Modal
      visible={isPlaylistBrowserOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closePlaylistBrowser}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={closePlaylistBrowser}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Browse Music</Text>
          <TouchableOpacity
            onPress={() => setIsServerManagerOpen(true)}
            style={styles.settingsButton}
          >
            <Ionicons name="cloud-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.text}
            />
          }
        >
          {/* Loading state */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.text} />
              <Text style={styles.loadingText}>Loading playlists...</Text>
            </View>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle"
                size={48}
                color={theme.colors.error}
              />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main content - switch between browse and track list views */}
          {!isLoading && !error && (
            <>
              {selectedPlaylist === null
                ? renderBrowseView()
                : renderTrackListView()}
            </>
          )}

          {/* Empty state */}
          {!isLoading && !error && playlists.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="musical-notes"
                size={48}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyText}>No playlists available</Text>
            </View>
          )}
        </ScrollView>

        {/* NOTE: Library modals disabled - Wavlake library API not publicly available yet */}

        {/* Blossom Server Manager Modal */}
        <BlossomServerManager
          visible={isServerManagerOpen}
          onClose={() => setIsServerManagerOpen(false)}
          onSync={loadBlossomTracks}
        />

        {/* Blossom Track Edit Modal */}
        <BlossomTrackEditModal
          visible={editingTrack !== null}
          onClose={() => setEditingTrack(null)}
          track={editingTrack}
          onSave={handleSaveTrackEdit}
        />

        {/* Blossom Playlist Edit Modal */}
        <BlossomPlaylistEditModal
          visible={editingPlaylist !== null}
          onClose={() => setEditingPlaylist(null)}
          serverUrl={editingPlaylist?.serverUrl || null}
          serverName={editingPlaylist?.serverName || ''}
          existingMetadata={
            editingPlaylist?.serverUrl
              ? playlistMetadata[editingPlaylist.serverUrl.replace(/\/+$/, '')] || null
              : null
          }
          onSave={handleSavePlaylistEdit}
        />
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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    padding: 4,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  errorText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  retryText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playAllText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: {
    color: theme.colors.text,
    fontSize: 16,
    marginLeft: 4,
  },
  // Playlist card styles
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
  },
  playlistCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 8,
    marginBottom: 8,
  },
  artworkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    aspectRatio: 1,
    marginBottom: 8,
  },
  artworkCell: {
    width: '49%',
    aspectRatio: 1,
    borderRadius: 4,
    overflow: 'hidden',
    margin: '0.5%',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blossomPlaceholderCell: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 157, 66, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blossomSmall: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  // Single cover styles for Blossom playlists
  singleCoverContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  singleCoverImage: {
    width: '100%',
    height: '100%',
  },
  blossomCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 157, 66, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blossomLarge: {
    width: '60%',
    height: '60%',
  },
  editOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 6,
  },
  playlistTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  playlistCount: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  // NOTE: Library section styles removed - Wavlake library API not publicly available yet
});

export default PlaylistBrowser;
