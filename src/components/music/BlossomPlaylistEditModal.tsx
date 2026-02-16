/**
 * BlossomPlaylistEditModal - Edit playlist metadata (name, cover image)
 *
 * Allows users to customize Blossom playlist information:
 * - Edit playlist name (displayed as "🌸 {name}")
 * - Upload custom cover image from phone gallery
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
import { BlossomPlaylistMetadataService } from '../../services/music/BlossomPlaylistMetadataService';
import { BlossomPlaceholder } from './BlossomPlaceholder';
import type { BlossomPlaylistMetadata } from '../../types/blossom';

interface BlossomPlaylistEditModalProps {
  visible: boolean;
  onClose: () => void;
  serverUrl: string | null;
  serverName: string;
  existingMetadata: BlossomPlaylistMetadata | null;
  onSave?: (metadata: BlossomPlaylistMetadata) => void;
}

export const BlossomPlaylistEditModal: React.FC<BlossomPlaylistEditModalProps> = React.memo(
  ({ visible, onClose, serverUrl, serverName, existingMetadata, onSave }) => {
    // Form state
    const [customName, setCustomName] = useState('');
    const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form when modal opens or metadata changes
    useEffect(() => {
      if (visible && serverUrl) {
        setCustomName(existingMetadata?.customName || serverName);
        setCoverImageUri(existingMetadata?.coverImageUri || null);
        setError(null);
      }
    }, [visible, serverUrl, serverName, existingMetadata]);

    /**
     * Handle picking cover image from phone gallery
     */
    const handlePickCover = useCallback(async () => {
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
          setCoverImageUri(result.assets[0].uri);
        }
      } catch (err) {
        console.error('[BlossomPlaylistEditModal] Image picker error:', err);
        setError('Failed to select image. Please try again.');
      }
    }, []);

    /**
     * Handle save - persist metadata and notify parent
     */
    const handleSave = useCallback(async () => {
      if (!serverUrl) return;

      setIsSaving(true);
      setError(null);

      try {
        // Check if anything changed
        const nameChanged = customName !== serverName;
        const coverChanged = coverImageUri !== existingMetadata?.coverImageUri;

        if (
          !nameChanged &&
          !coverChanged &&
          !existingMetadata?.customName &&
          !existingMetadata?.coverImageUri
        ) {
          // Nothing changed
          onClose();
          return;
        }

        // Build metadata to save
        const metadata: BlossomPlaylistMetadata = {
          customName: nameChanged || existingMetadata?.customName ? customName : undefined,
          coverImageUri: coverChanged || existingMetadata?.coverImageUri ? coverImageUri || undefined : undefined,
          updatedAt: Date.now(),
        };

        // Save metadata
        await BlossomPlaylistMetadataService.saveMetadata(serverUrl, metadata);

        onSave?.(metadata);
        onClose();
      } catch (err) {
        console.error('[BlossomPlaylistEditModal] Save error:', err);
        setError('Failed to save changes. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }, [serverUrl, customName, coverImageUri, serverName, existingMetadata, onSave, onClose]);

    /**
     * Reset to original values
     */
    const handleReset = useCallback(async () => {
      if (!serverUrl) return;

      setIsSaving(true);
      setError(null);

      try {
        // Delete saved metadata
        await BlossomPlaylistMetadataService.deleteMetadata(serverUrl);

        // Reset form to original values
        setCustomName(serverName);
        setCoverImageUri(null);

        // Notify parent with cleared customizations
        const resetMetadata: BlossomPlaylistMetadata = {
          customName: undefined,
          coverImageUri: undefined,
          updatedAt: Date.now(),
        };

        onSave?.(resetMetadata);
        onClose();
      } catch (err) {
        console.error('[BlossomPlaylistEditModal] Reset error:', err);
        setError('Failed to reset. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }, [serverUrl, serverName, onSave, onClose]);

    if (!serverUrl) return null;

    const hasCustomizations = existingMetadata?.customName || existingMetadata?.coverImageUri;

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
              <Text style={styles.headerTitle}>Edit Playlist</Text>
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
              {/* Cover image picker */}
              <View style={styles.coverContainer}>
                <TouchableOpacity onPress={handlePickCover} style={styles.coverTouchable}>
                  {coverImageUri ? (
                    <Image source={{ uri: coverImageUri }} style={styles.coverImage} />
                  ) : (
                    <BlossomPlaceholder size="large" style={styles.coverImage} />
                  )}
                  <View style={styles.coverOverlay}>
                    <Ionicons name="camera" size={24} color="#fff" />
                    <Text style={styles.coverOverlayText}>Change Cover</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Playlist name input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Playlist Name</Text>
                <View style={styles.nameInputContainer}>
                  <Text style={styles.blossomPrefix}>🌸</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder="Enter playlist name"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </View>
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

              {/* Reset button - only show if playlist has customizations */}
              {hasCustomizations && (
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
  coverContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  coverTouchable: {
    position: 'relative',
  },
  coverImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  coverOverlayText: {
    color: '#fff',
    fontSize: 14,
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
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  blossomPrefix: {
    fontSize: 18,
    marginRight: 8,
  },
  nameInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
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

export default BlossomPlaylistEditModal;
