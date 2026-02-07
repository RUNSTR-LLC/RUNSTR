/**
 * BlossomTrackEditModal - Edit track metadata (title, artist, artwork)
 *
 * Allows users to customize Blossom track information:
 * - Edit song title
 * - Edit artist name
 * - Upload custom artwork from phone gallery
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../styles/theme';
import { BlossomMetadataService } from '../../services/music/BlossomMetadataService';
import { BlossomPlaceholder } from './BlossomPlaceholder';
import type { BlossomTrack } from '../../types/blossom';

interface BlossomTrackEditModalProps {
  visible: boolean;
  onClose: () => void;
  track: BlossomTrack | null;
  onSave?: (track: BlossomTrack) => void;
}

export const BlossomTrackEditModal: React.FC<BlossomTrackEditModalProps> = React.memo(
  ({ visible, onClose, track, onSave }) => {
    // Form state
    const [customTitle, setCustomTitle] = useState('');
    const [customArtist, setCustomArtist] = useState('');
    const [customArtworkUri, setCustomArtworkUri] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form when track changes
    useEffect(() => {
      if (track) {
        setCustomTitle(track.customTitle || track.title);
        setCustomArtist(track.customArtist || track.artist.name);
        setCustomArtworkUri(track.customArtworkUrl || null);
        setError(null);
      }
    }, [track]);

    /**
     * Handle picking artwork from phone gallery
     */
    const handlePickArtwork = useCallback(async () => {
      try {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access photos was denied');
          return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          setCustomArtworkUri(result.assets[0].uri);
        }
      } catch (err) {
        console.error('[BlossomTrackEditModal] Image picker error:', err);
        setError('Failed to select image. Please try again.');
      }
    }, []);

    /**
     * Handle save - persist metadata and notify parent
     */
    const handleSave = useCallback(async () => {
      if (!track) return;

      setIsSaving(true);
      setError(null);

      try {
        // Only save if values differ from original
        const titleChanged = customTitle !== track.title;
        const artistChanged = customArtist !== track.artist.name;
        const artworkChanged = customArtworkUri !== track.customArtworkUrl;

        if (
          !titleChanged &&
          !artistChanged &&
          !artworkChanged &&
          !track.customTitle &&
          !track.customArtist &&
          !track.customArtworkUrl
        ) {
          // Nothing changed
          onClose();
          return;
        }

        // Save metadata
        await BlossomMetadataService.saveMetadata(track.id, {
          customTitle: titleChanged || track.customTitle ? customTitle : undefined,
          customArtist: artistChanged || track.customArtist ? customArtist : undefined,
          customArtworkUrl: artworkChanged || track.customArtworkUrl ? customArtworkUri || undefined : undefined,
        });

        // Create updated track for parent callback
        const updatedTrack: BlossomTrack = {
          ...track,
          customTitle: titleChanged || track.customTitle ? customTitle : undefined,
          customArtist: artistChanged || track.customArtist ? customArtist : undefined,
          customArtworkUrl: artworkChanged || track.customArtworkUrl ? customArtworkUri || undefined : undefined,
        };

        onSave?.(updatedTrack);
        onClose();
      } catch (err) {
        console.error('[BlossomTrackEditModal] Save error:', err);
        setError('Failed to save changes. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }, [track, customTitle, customArtist, customArtworkUri, onSave, onClose]);

    /**
     * Reset to original values
     */
    const handleReset = useCallback(async () => {
      if (!track) return;

      setIsSaving(true);
      setError(null);

      try {
        // Delete saved metadata
        await BlossomMetadataService.deleteMetadata(track.id);

        // Reset form to original values
        setCustomTitle(track.title);
        setCustomArtist(track.artist.name);
        setCustomArtworkUri(null);

        // Notify parent with cleared customizations
        const resetTrack: BlossomTrack = {
          ...track,
          customTitle: undefined,
          customArtist: undefined,
          customArtworkUrl: undefined,
        };

        onSave?.(resetTrack);
        onClose();
      } catch (err) {
        console.error('[BlossomTrackEditModal] Reset error:', err);
        setError('Failed to reset. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }, [track, onSave, onClose]);

    if (!track) return null;

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Track</Text>
              <TouchableOpacity
                onPress={handleSave}
                style={styles.headerButton}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {/* Track artwork preview with picker */}
              <View style={styles.artworkContainer}>
                <TouchableOpacity onPress={handlePickArtwork} style={styles.artworkTouchable}>
                  {customArtworkUri ? (
                    <Image source={{ uri: customArtworkUri }} style={styles.artwork} />
                  ) : (
                    <BlossomPlaceholder size="large" style={styles.artwork} />
                  )}
                  <View style={styles.artworkOverlay}>
                    <Ionicons name="camera" size={24} color="#fff" />
                    <Text style={styles.artworkOverlayText}>Change</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Title input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="Enter track title"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Artist input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Artist</Text>
                <TextInput
                  style={styles.input}
                  value={customArtist}
                  onChangeText={setCustomArtist}
                  placeholder="Enter artist name"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>

              {/* Error message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={theme.colors.error}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Reset button - only show if track has customizations */}
              {(track.customTitle || track.customArtist || track.customArtworkUrl) && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleReset}
                  disabled={isSaving}
                >
                  <Ionicons
                    name="refresh"
                    size={18}
                    color={theme.colors.textMuted}
                  />
                  <Text style={styles.resetText}>Reset to Original</Text>
                </TouchableOpacity>
              )}

              {/* Info text */}
              <Text style={styles.infoText}>
                Changes are saved locally and will appear across the app.
              </Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
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
    minWidth: 60,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  cancelText: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
  saveText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  artworkContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  artworkTouchable: {
    position: 'relative',
  },
  artwork: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  artworkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  artworkOverlayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
  },
  resetText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    marginLeft: 8,
  },
  infoText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
  },
});

export default BlossomTrackEditModal;
