/**
 * JournalEditorModal
 *
 * Full-screen modal for writing/editing journal entries.
 * Includes mood selector, energy selector, tags, and content editor.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../../styles/theme';
import {
  JournalEntry,
  JournalMood,
  EnergyLevel,
} from '../../types/journal';
import { JournalService } from '../../services/journal/JournalService';
import { MoodSelector } from './MoodSelector';
import { EnergySelector } from './EnergySelector';

interface JournalEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (entry: JournalEntry) => void;
  entry?: JournalEntry | null;
}

export const JournalEditorModal: React.FC<JournalEditorModalProps> = ({
  visible,
  onClose,
  onSave,
  entry,
}) => {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalMood | undefined>();
  const [energy, setEnergy] = useState<EnergyLevel | undefined>();
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!entry;

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setContent(entry.content);
      setMood(entry.mood);
      setEnergy(entry.energy);
      setTags(entry.tags || []);
    } else {
      // Reset for new entry
      setContent('');
      setMood(undefined);
      setEnergy(undefined);
      setTags([]);
    }
  }, [entry, visible]);

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
    }
    setTagInput('');
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      Alert.alert('Empty Entry', 'Please write something in your journal.');
      return;
    }

    setIsSaving(true);
    try {
      let savedEntry: JournalEntry;

      if (isEditing && entry) {
        savedEntry = await JournalService.updateEntry(entry.id, {
          content: content.trim(),
          mood,
          energy,
          tags: tags.length > 0 ? tags : undefined,
        });
      } else {
        savedEntry = await JournalService.createEntry({
          content: content.trim(),
          mood,
          energy,
          tags: tags.length > 0 ? tags : undefined,
        });
      }

      onSave(savedEntry);
      onClose();
    } catch (error) {
      console.error('[JournalEditor] Save error:', error);
      Alert.alert('Error', 'Failed to save journal entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [content, mood, energy, tags, isEditing, entry, onSave, onClose]);

  const handleDelete = useCallback(() => {
    if (!entry) return;

    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await JournalService.deleteEntry(entry.id);
            onClose();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete entry.');
          }
        },
      },
    ]);
  }, [entry, onClose]);

  const handleClose = useCallback(() => {
    // Check for unsaved changes
    const hasChanges = entry
      ? content !== entry.content ||
        mood !== entry.mood ||
        energy !== entry.energy
      : content.trim().length > 0;

    if (hasChanges) {
      Alert.alert('Discard Changes?', 'You have unsaved changes.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]);
    } else {
      onClose();
    }
  }, [content, mood, energy, entry, onClose]);

  // Get date label
  const dateLabel = entry
    ? new Date(entry.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Entry' : 'New Entry'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.headerButton, styles.saveButton]}
              disabled={isSaving}
            >
              <Text style={styles.saveText}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Date */}
            <Text style={styles.dateLabel}>{dateLabel}</Text>

            {/* Mood Selector */}
            <MoodSelector value={mood} onChange={setMood} />

            {/* Energy Selector */}
            <EnergySelector value={energy} onChange={setEnergy} />

            {/* Content Editor */}
            <View style={styles.editorContainer}>
              <Text style={styles.label}>Entry</Text>
              <TextInput
                style={styles.textInput}
                value={content}
                onChangeText={setContent}
                placeholder="Write about your day, thoughts, goals..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                textAlignVertical="top"
                autoFocus={!entry}
              />
            </View>

            {/* Tags */}
            <View style={styles.tagsSection}>
              <Text style={styles.label}>Tags (optional)</Text>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={styles.tagInput}
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="Add a tag..."
                  placeholderTextColor={theme.colors.textMuted}
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.addTagButton}
                  onPress={handleAddTag}
                >
                  <Text style={styles.addTagText}>Add</Text>
                </TouchableOpacity>
              </View>
              {tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {tags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.tag}
                      onPress={() => handleRemoveTag(tag)}
                    >
                      <Text style={styles.tagText}>#{tag}</Text>
                      <Text style={styles.tagRemove}>×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Delete button for editing */}
            {isEditing && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteText}>Delete Entry</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </SafeAreaProvider>
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
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    minWidth: 60,
  },
  saveButton: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
  },
  cancelText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
  },
  saveText: {
    color: theme.colors.orangeBright,
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.semiBold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xxl,
  },
  dateLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.leaderboardTitle,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: theme.spacing.xxxl,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.medium,
    marginBottom: theme.spacing.lg,
  },
  editorContainer: {
    marginBottom: theme.spacing.xxl,
  },
  textInput: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xxl,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    lineHeight: 22,
    minHeight: 200,
  },
  tagsSection: {
    marginBottom: theme.spacing.xxl,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  tagInput: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: theme.typography.body,
  },
  addTagButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.xxl,
    justifyContent: 'center',
  },
  addTagText: {
    color: theme.colors.orangeBright,
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.medium,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  tagText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  tagRemove: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
  },
  deleteText: {
    color: theme.colors.error,
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.medium,
  },
});

export default JournalEditorModal;
