/**
 * JournalEntryCard
 *
 * Display a journal entry with date, mood, energy, and content preview.
 * Tappable to open full entry view/editor.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { JournalEntry, getMoodOption, getEnergyOption } from '../../types/journal';

interface JournalEntryCardProps {
  entry: JournalEntry;
  onPress: (entry: JournalEntry) => void;
  compact?: boolean;
}

export const JournalEntryCard: React.FC<JournalEntryCardProps> = React.memo(
  ({ entry, onPress, compact = false }) => {
    const moodOption = entry.mood ? getMoodOption(entry.mood) : null;
    const energyOption = entry.energy ? getEnergyOption(entry.energy) : null;

    // Format date
    const date = new Date(entry.date);
    const isToday = entry.date === new Date().toISOString().split('T')[0];
    const isYesterday =
      entry.date ===
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dateLabel = isToday
      ? 'Today'
      : isYesterday
      ? 'Yesterday'
      : date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

    // Truncate content for preview
    const previewLength = compact ? 80 : 150;
    const contentPreview =
      entry.content.length > previewLength
        ? entry.content.substring(0, previewLength) + '...'
        : entry.content;

    if (compact) {
      return (
        <TouchableOpacity
          style={styles.compactContainer}
          onPress={() => onPress(entry)}
          activeOpacity={0.7}
        >
          <View style={styles.compactHeader}>
            {moodOption && (
              <Ionicons
                name={moodOption.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={theme.colors.orangeBright}
              />
            )}
            <Text style={styles.compactDate}>{dateLabel}</Text>
          </View>
          <Text style={styles.compactContent} numberOfLines={2}>
            {entry.content}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => onPress(entry)}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
            {(isToday || isYesterday) && (
              <Text style={styles.actualDate}>
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            )}
          </View>
          <View style={styles.indicators}>
            {moodOption && (
              <View style={[styles.indicator, { borderColor: theme.colors.orangeBright }]}>
                <Ionicons
                  name={moodOption.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={theme.colors.orangeBright}
                />
              </View>
            )}
            {energyOption && (
              <View style={styles.indicator}>
                <Ionicons
                  name={energyOption.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={theme.colors.orangeBright}
                />
              </View>
            )}
          </View>
        </View>

        <Text style={styles.content} numberOfLines={3}>
          {contentPreview}
        </Text>

        {entry.tags && entry.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {entry.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {entry.tags.length > 3 && (
              <Text style={styles.moreText}>+{entry.tags.length - 3} more</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  compactContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  dateRow: {
    flexDirection: 'column',
  },
  dateLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
  },
  actualDate: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  indicators: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  indicator: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  indicatorEmoji: {
    fontSize: 16,
  },
  content: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  tag: {
    backgroundColor: '#1a1a1a',
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  tagText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  moreText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    alignSelf: 'center',
  },
  // Compact styles
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  emoji: {
    fontSize: 16,
  },
  compactDate: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  compactContent: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default JournalEntryCard;
