/**
 * TimelineEntryCard - Renders journal entries and habit check-ins
 * in the unified Health Timeline alongside workout cards.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../styles/theme';
import type { JournalEntry } from '../../../types/journal';
import { getMoodOption, getEnergyOption } from '../../../types/journal';
import type { Habit } from '../../../services/habits/HabitTrackerService';

interface JournalCardProps {
  type: 'journal';
  entry: JournalEntry;
  onPress: (entry: JournalEntry) => void;
}

interface HabitCardProps {
  type: 'habit';
  habit: Habit;
  date: string;
}

type TimelineEntryCardProps = JournalCardProps | HabitCardProps;

export const TimelineEntryCard: React.FC<TimelineEntryCardProps> = React.memo(
  (props) => {
    if (props.type === 'journal') {
      return <JournalTimelineCard entry={props.entry} onPress={props.onPress} />;
    }
    return <HabitTimelineCard habit={props.habit} date={props.date} />;
  }
);

// ============================================================================
// Journal Card Variant
// ============================================================================

const JournalTimelineCard: React.FC<{
  entry: JournalEntry;
  onPress: (entry: JournalEntry) => void;
}> = ({ entry, onPress }) => {
  const moodOption = entry.mood ? getMoodOption(entry.mood) : null;
  const energyOption = entry.energy ? getEnergyOption(entry.energy) : null;

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      style={styles.journalCard}
      onPress={() => onPress(entry)}
      activeOpacity={0.7}
    >
      <View style={styles.journalHeader}>
        <View style={styles.journalTypeLabel}>
          <Ionicons name="journal-outline" size={14} color="#8B7355" />
          <Text style={styles.typeLabelText}>Journal</Text>
        </View>
        <View style={styles.journalIndicators}>
          {moodOption && (
            <Ionicons
              name={moodOption.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={moodOption.color}
            />
          )}
          {energyOption && (
            <Ionicons
              name={energyOption.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={theme.colors.orangeBright}
            />
          )}
        </View>
      </View>

      <Text style={styles.journalDate}>{formatDate(entry.date)}</Text>

      <Text style={styles.journalContent} numberOfLines={2}>
        {entry.content}
      </Text>

      {entry.tags && entry.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {entry.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
          {entry.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{entry.tags.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// Habit Check-in Card Variant
// ============================================================================

const HabitTimelineCard: React.FC<{
  habit: Habit;
  date: string;
}> = ({ habit, date }) => {
  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.habitCard}>
      <View style={styles.habitRow}>
        <View style={[styles.habitDot, { backgroundColor: habit.color }]} />
        <Ionicons
          name={habit.icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={habit.color}
        />
        <View style={styles.habitInfo}>
          <Text style={styles.habitName}>{habit.name}</Text>
          <Text style={styles.habitDate}>{formatDate(date)}</Text>
        </View>
        {habit.currentStreak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color="#FF9D42" />
            <Text style={styles.streakText}>{habit.currentStreak}d</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Journal card styles
  journalCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#8B7355',
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  journalTypeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeLabelText: {
    color: '#8B7355',
    fontSize: 12,
    fontWeight: '600',
  },
  journalIndicators: {
    flexDirection: 'row',
    gap: 8,
  },
  journalDate: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  journalContent: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  moreTagsText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    alignSelf: 'center',
  },

  // Habit card styles
  habitCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  habitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  habitDate: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  streakText: {
    color: '#FF9D42',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TimelineEntryCard;
