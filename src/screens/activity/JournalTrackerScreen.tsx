/**
 * JournalTrackerScreen - Journal interface within the activity grid
 *
 * Minimal layout: new entry button + entry list.
 * Mood/energy selection happens inside the editor modal.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { JournalEditorModal } from '../../components/journal/JournalEditorModal';
import { JournalList } from '../../components/journal/JournalList';
import type { JournalEntry } from '../../types/journal';

export const JournalTrackerScreen: React.FC = () => {
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      {/* Entry list */}
      <View style={styles.listContainer}>
        <JournalList
          onEntryPress={handleEditEntry}
          onNewEntry={handleNewEntry}
          refreshTrigger={refreshTrigger}
        />
      </View>

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
  listContainer: {
    flex: 1,
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
