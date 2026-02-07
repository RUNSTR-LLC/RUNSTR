/**
 * JournalHistoryScreen - Full Journal Entry History View
 *
 * Displays all past journal entries grouped by month.
 * Uses the existing JournalList component.
 * Tap an entry to edit it in the JournalEditorModal.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

// Journal components
import { JournalList } from '../components/journal/JournalList';
import { JournalEditorModal } from '../components/journal/JournalEditorModal';
import type { JournalEntry } from '../types/journal';

export const JournalHistoryScreen: React.FC = () => {
  const navigation = useNavigation();

  // State for editing entries
  const [journalEditorVisible, setJournalEditorVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleEntryPress = useCallback((entry: JournalEntry) => {
    setEditingEntry(entry);
    setJournalEditorVisible(true);
  }, []);

  const handleNewEntry = useCallback(() => {
    setEditingEntry(null);
    setJournalEditorVisible(true);
  }, []);

  const handleEditorClose = useCallback(() => {
    setJournalEditorVisible(false);
    setEditingEntry(null);
  }, []);

  const handleEntrySave = useCallback(() => {
    // Trigger refresh of the list
    setRefreshTrigger((prev) => prev + 1);
    setJournalEditorVisible(false);
    setEditingEntry(null);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons
            name="book-outline"
            size={20}
            color={theme.colors.orangeBright}
            style={styles.headerIcon}
          />
        </View>
        <TouchableOpacity onPress={handleNewEntry} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.colors.orangeBright} />
        </TouchableOpacity>
      </View>

      {/* Journal List */}
      <JournalList
        onEntryPress={handleEntryPress}
        onNewEntry={handleNewEntry}
        refreshTrigger={refreshTrigger}
      />

      {/* Journal Editor Modal */}
      <JournalEditorModal
        visible={journalEditorVisible}
        onClose={handleEditorClose}
        onSave={handleEntrySave}
        entry={editingEntry}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  backButton: {
    padding: theme.spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: theme.spacing.lg,
  },
  addButton: {
    padding: theme.spacing.sm,
  },
});

export default JournalHistoryScreen;
