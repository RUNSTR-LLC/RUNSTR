/**
 * AddToPlaylistSheet - Bottom sheet for adding a track to a playlist
 *
 * Shows user's playlists and allows adding the selected track to any of them.
 * Also provides option to create a new playlist.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { WavlakeService } from '../../services/music/WavlakeService';
import type { WavlakeTrack, UserPlaylist } from '../../types/music';

interface AddToPlaylistSheetProps {
  visible: boolean;
  track: WavlakeTrack | null;
  playlists: UserPlaylist[];
  onClose: () => void;
  onCreateNew: () => void;
  onRefreshPlaylists: () => void;
}

export const AddToPlaylistSheet: React.FC<AddToPlaylistSheetProps> = ({
  visible,
  track,
  playlists,
  onClose,
  onCreateNew,
  onRefreshPlaylists,
}) => {
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(null);
  const [successPlaylistId, setSuccessPlaylistId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Add track to playlist
   */
  const handleAddToPlaylist = useCallback(
    async (playlist: UserPlaylist) => {
      if (!track || addingToPlaylistId) return;

      setAddingToPlaylistId(playlist.id);
      setError(null);

      try {
        const success = await WavlakeService.addToPlaylist(playlist.id, track.id);

        if (success) {
          setSuccessPlaylistId(playlist.id);
          console.log('[AddToPlaylistSheet] Track added to playlist:', playlist.title);

          // Refresh playlists to update track counts
          onRefreshPlaylists();

          // Auto-close after success
          setTimeout(() => {
            setSuccessPlaylistId(null);
            onClose();
          }, 1000);
        } else {
          setError('Failed to add track to playlist');
        }
      } catch (err) {
        console.error('[AddToPlaylistSheet] Error adding to playlist:', err);
        setError('Failed to add track to playlist');
      } finally {
        setAddingToPlaylistId(null);
      }
    },
    [track, addingToPlaylistId, onClose, onRefreshPlaylists]
  );

  /**
   * Handle create new playlist
   */
  const handleCreateNew = useCallback(() => {
    onClose();
    onCreateNew();
  }, [onClose, onCreateNew]);

  if (!visible || !track) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <SafeAreaView style={styles.safeArea}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Add to Playlist</Text>
            </View>

            {/* Track info */}
            <View style={styles.trackInfo}>
              <Image
                source={
                  track.artworkUrl
                    ? { uri: track.artworkUrl }
                    : require('../../../assets/images/icon.png')
                }
                style={styles.trackArtwork}
              />
              <View style={styles.trackDetails}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {track.artist.name}
                </Text>
              </View>
            </View>

            {/* Error message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Playlist list */}
            <ScrollView style={styles.playlistList}>
              {/* Create new playlist option */}
              <TouchableOpacity style={styles.playlistRow} onPress={handleCreateNew}>
                <View style={styles.createIcon}>
                  <Ionicons name="add" size={24} color={theme.colors.text} />
                </View>
                <Text style={styles.createText}>Create New Playlist</Text>
              </TouchableOpacity>

              {/* Existing playlists */}
              {playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.playlistRow}
                  onPress={() => handleAddToPlaylist(playlist)}
                  disabled={!!addingToPlaylistId}
                >
                  <View style={styles.playlistIcon}>
                    {playlist.artworkUrl ? (
                      <Image
                        source={{ uri: playlist.artworkUrl }}
                        style={styles.playlistImage}
                      />
                    ) : (
                      <Ionicons
                        name="musical-notes"
                        size={20}
                        color={theme.colors.textMuted}
                      />
                    )}
                  </View>
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistTitle} numberOfLines={1}>
                      {playlist.title}
                    </Text>
                    <Text style={styles.playlistCount}>
                      {playlist.trackCount} tracks
                    </Text>
                  </View>
                  <View style={styles.playlistAction}>
                    {addingToPlaylistId === playlist.id ? (
                      <ActivityIndicator size="small" color={theme.colors.accent} />
                    ) : successPlaylistId === playlist.id ? (
                      <Ionicons name="checkmark-circle" size={24} color="#2ecc71" />
                    ) : (
                      <Ionicons name="add-circle-outline" size={24} color={theme.colors.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Empty state */}
              {playlists.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No playlists yet</Text>
                  <Text style={styles.emptySubtext}>
                    Create your first playlist to get started
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Cancel button */}
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  safeArea: {
    paddingBottom: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
  },
  trackArtwork: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
  },
  trackDetails: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  trackArtist: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  playlistList: {
    maxHeight: 300,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  playlistIcon: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playlistImage: {
    width: '100%',
    height: '100%',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  playlistCount: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  playlistAction: {
    width: 32,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AddToPlaylistSheet;
