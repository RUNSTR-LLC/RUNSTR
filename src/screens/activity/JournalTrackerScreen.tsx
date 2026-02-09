/**
 * JournalTrackerScreen - Journal entry interface within the activity grid
 *
 * Renders mood/energy selectors, today's entry preview, and recent entries list.
 * Accessed via Mindfulness row in the swipe grid.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { MoodSelector } from '../../components/journal/MoodSelector';
import { EnergySelector } from '../../components/journal/EnergySelector';
import { JournalEditorModal } from '../../components/journal/JournalEditorModal';
import { JournalEntryCard } from '../../components/journal/JournalEntryCard';
import { JournalList } from '../../components/journal/JournalList';
import { JournalService } from '../../services/journal/JournalService';
import type { JournalEntry, JournalMood, EnergyLevel } from '../../types/journal';

export const JournalTrackerScreen: React.FC = () => {
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [quickMood, setQuickMood] = useState<JournalMood | undefined>();
  const [quickEnergy, setQuickEnergy] = useState<EnergyLevel | undefined>();

  // Load today's entry on mount
  React.useEffect(() => {
    loadTodayEntry();
  }, [refreshTrigger]);

  const loadTodayEntry = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const entries = await JournalService.getAllEntries();
      const found = entries.find((e) => e.date === today);
      setTodayEntry(found || null);
      if (found) {
        setQuickMood(found.mood);
        setQuickEnergy(found.energy);
      }
    } catch (error) {
      console.error('[JournalTracker] Error loading today entry:', error);
    }
  };

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
      {/* Quick Check-in Header */}
      <View style={styles.header}>
        <MoodSelector value={quickMood} onChange={setQuickMood} />
        <EnergySelector value={quickEnergy} onChange={setQuickEnergy} />
      </View>

      {/* Today's Entry Preview or Write Button */}
      <View style={styles.todaySection}>
        {todayEntry ? (
          <View>
            <Text style={styles.sectionLabel}>Today's Entry</Text>
            <JournalEntryCard
              entry={todayEntry}
              onPress={handleEditEntry}
              compact
            />
          </View>
        ) : (
          <TouchableOpacity style={styles.writeButton} onPress={handleNewEntry}>
            <Ionicons name="create-outline" size={20} color="#000" />
            <Text style={styles.writeButtonText}>Write Entry</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Entries */}
      <View style={styles.listContainer}>
        <JournalList
          onEntryPress={handleEditEntry}
          onNewEntry={handleNewEntry}
          refreshTrigger={refreshTrigger}
        />
      </View>

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
  header: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
  },
  todaySection: {
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xl,
  },
  writeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.orangeDeep,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.xl,
  },
  writeButtonText: {
    color: '#000',
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.semiBold,
  },
  listContainer: {
    flex: 1,
  },
});

export default JournalTrackerScreen;
