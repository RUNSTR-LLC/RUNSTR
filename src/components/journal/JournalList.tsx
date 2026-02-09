/**
 * JournalList
 *
 * Scrollable list of journal entries with pull-to-refresh.
 * Groups entries by month/week for better organization.
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { JournalEntry } from '../../types/journal';
import { JournalService } from '../../services/journal/JournalService';
import { JournalEntryCard } from './JournalEntryCard';

interface JournalListProps {
  onEntryPress: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  refreshTrigger?: number;
}

interface GroupedEntries {
  title: string;
  data: JournalEntry[];
}

export const JournalList: React.FC<JournalListProps> = React.memo(
  ({ onEntryPress, onNewEntry, refreshTrigger }) => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [groupedEntries, setGroupedEntries] = useState<GroupedEntries[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadEntries = useCallback(async () => {
      try {
        const allEntries = await JournalService.getAllEntries();
        setEntries(allEntries);
        setGroupedEntries(groupEntriesByMonth(allEntries));
      } catch (error) {
        console.error('[JournalList] Error loading entries:', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }, []);

    useEffect(() => {
      loadEntries();
    }, [loadEntries, refreshTrigger]);

    const handleRefresh = useCallback(async () => {
      setIsRefreshing(true);
      JournalService.clearCache();
      await loadEntries();
    }, [loadEntries]);

    const groupEntriesByMonth = (
      entryList: JournalEntry[]
    ): GroupedEntries[] => {
      const groups: Record<string, JournalEntry[]> = {};

      entryList.forEach((entry) => {
        const date = new Date(entry.date);
        const monthKey = date.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });

        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        groups[monthKey].push(entry);
      });

      // Convert to array and sort by most recent month first
      return Object.entries(groups).map(([title, data]) => ({
        title,
        data,
      }));
    };

    const renderSectionHeader = (title: string) => (
      <Text style={styles.sectionHeader}>{title}</Text>
    );

    const renderEmptyState = () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="book-outline" size={32} color={theme.colors.textDark} />
        <Text style={styles.emptyTitle}>No entries yet</Text>
        <Text style={styles.emptyText}>
          Tap + to write your first entry.
        </Text>
      </View>
    );

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading journal...</Text>
        </View>
      );
    }

    if (entries.length === 0) {
      return renderEmptyState();
    }

    // Flatten for FlatList with section headers
    const flatData: (JournalEntry | { isHeader: true; title: string })[] = [];
    groupedEntries.forEach((group) => {
      flatData.push({ isHeader: true, title: group.title });
      flatData.push(...group.data);
    });

    return (
      <FlatList
        data={flatData}
        renderItem={({ item }) => {
          if ('isHeader' in item && item.isHeader) {
            return renderSectionHeader(item.title);
          }
          return (
            <JournalEntryCard
              entry={item as JournalEntry}
              onPress={onEntryPress}
            />
          );
        }}
        keyExtractor={(item) =>
          'isHeader' in item ? `header-${item.title}` : (item as JournalEntry).id
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
          />
        }
      />
    );
  }
);

const styles = StyleSheet.create({
  listContent: {
    padding: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.medium,
    marginTop: theme.spacing.xl,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.textDark,
    fontSize: 13,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});

export default JournalList;
