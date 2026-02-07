/**
 * CreatePlaylistModal - Modal for creating a new Wavlake playlist
 *
 * Allows users to create a new playlist with a title and optional description.
 * Uses NIP-98 authentication to create the playlist on Wavlake.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { WavlakeService } from '../../services/music/WavlakeService';

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  visible,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reset form state
   */
  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setIsPublic(true);
    setError(null);
  }, []);

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  /**
   * Create the playlist
   */
  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a playlist name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await WavlakeService.createPlaylist(
        title.trim(),
        description.trim() || undefined,
        isPublic
      );

      if (result.success) {
        console.log('[CreatePlaylistModal] Playlist created:', result.playlist?.id);
        resetForm();
        onCreated();
      } else {
        setError(result.error || 'Failed to create playlist');
      }
    } catch (err) {
      console.error('[CreatePlaylistModal] Error creating playlist:', err);
      setError('Failed to create playlist. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [title, description, isPublic, resetForm, onCreated]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Playlist</Text>
            <TouchableOpacity
              onPress={handleCreate}
              style={[styles.createButton, !title.trim() && styles.createButtonDisabled]}
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text
                  style={[
                    styles.createButtonText,
                    !title.trim() && styles.createButtonTextDisabled,
                  ]}
                >
                  Create
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Playlist icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconPlaceholder}>
                <Ionicons name="musical-notes" size={48} color={theme.colors.textMuted} />
              </View>
            </View>

            {/* Title input */}
            <TextInput
              style={styles.titleInput}
              placeholder="Give your playlist a name"
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
              maxLength={100}
            />

            {/* Description input */}
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add an optional description"
              placeholderTextColor={theme.colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={300}
            />

            {/* Public toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Public playlist</Text>
                <Text style={styles.toggleDescription}>
                  Anyone can see this playlist
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.accent,
                }}
                thumbColor="#fff"
              />
            </View>

            {/* Error message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  createButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  form: {
    flex: 1,
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  descriptionInput: {
    color: theme.colors.text,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    minHeight: 60,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  toggleDescription: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});

export default CreatePlaylistModal;
