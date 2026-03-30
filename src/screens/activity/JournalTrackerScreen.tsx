/**
 * JournalTrackerScreen - Journal interface within the activity grid
 *
 * Non-scrollable layout so SwipeGridNavigator can handle vertical swipes.
 * Shows recent entries inline; tap to edit, + to create.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { JournalEditorModal } from '../../components/journal/JournalEditorModal';
import { JournalEntryCard } from '../../components/journal/JournalEntryCard';
import { JournalService } from '../../services/journal/JournalService';
import type { JournalEntry } from '../../types/journal';

const MAX_VISIBLE_ENTRIES = 4;

export const JournalTrackerScreen: React.FC = () => {
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await JournalService.getAllEntries();
        setEntries(all.slice(0, MAX_VISIBLE_ENTRIES));
      } catch (error) {
        console.error('[JournalTracker] Error loading entries:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshTrigger]);

  const handleNewEntry = useCallback(() => {
    setEditingEntry(null);
    setShowEditor(true);
  }, []);

  const handleEditEntry = useCallback((entry: JournalEntry) => {
    setEditingEntry(entry);
    setShowEditor(true);
  }, []);

  const handleSave = useCallback((_entry: JournalEntry) => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={32} color={theme.colors.textDark} />
          <Text style={styles.emptyTitle}>No entries yet</Text>
          <Text style={styles.emptyText}>Tap + to write your first entry.</Text>
        </View>
      ) : (
        <View style={styles.entriesContainer}>
          {entries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onPress={handleEditEntry}
              compact
            />
          ))}
        </View>
      )}

      {/* Floating new entry button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewEntry}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#000" />
      </TouchableOpacity>

      {/* Editor Modal */}
      <JournalEditorModal
        visible={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleSave}
        entry={editingEntry}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  entriesContainer: {
    padding: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.medium,
    marginTop: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.textDark,
    fontSize: 13,
    marginTop: theme.spacing.lg,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default JournalTrackerScreen;
