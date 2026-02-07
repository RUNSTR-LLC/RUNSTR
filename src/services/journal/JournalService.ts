/**
 * JournalService
 *
 * CRUD operations for journal entries stored in AsyncStorage.
 * Provides methods for creating, reading, updating, and deleting
 * journal entries with streak tracking and statistics.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import type {
  JournalEntry,
  JournalStats,
  JournalMood,
  EnergyLevel,
  MOOD_TO_NUMBER,
} from '../../types/journal';

const STORAGE_KEY = '@runstr:journal_entries';

/**
 * Input for creating a new journal entry
 */
export interface CreateJournalEntryInput {
  content: string;
  mood?: JournalMood;
  energy?: EnergyLevel;
  tags?: string[];
  date?: string; // Optional override, defaults to today
}

/**
 * Input for updating an existing journal entry
 */
export interface UpdateJournalEntryInput {
  content?: string;
  mood?: JournalMood;
  energy?: EnergyLevel;
  tags?: string[];
}

class JournalServiceClass {
  private entriesCache: JournalEntry[] | null = null;
  private lastCacheDate: string | null = null;

  /**
   * Get all journal entries, sorted by date (newest first)
   */
  async getAllEntries(): Promise<JournalEntry[]> {
    // Invalidate cache if day has changed (ensures fresh data after midnight)
    const today = this.getDateString(new Date());
    if (this.lastCacheDate && this.lastCacheDate !== today) {
      this.entriesCache = null;
    }
    this.lastCacheDate = today;

    if (this.entriesCache) {
      return this.entriesCache;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const entries: JournalEntry[] = stored ? JSON.parse(stored) : [];

      // Sort by date descending (newest first)
      entries.sort((a, b) => b.date.localeCompare(a.date));

      this.entriesCache = entries;
      return entries;
    } catch (error) {
      console.error('[JournalService] Error getting entries:', error);
      return [];
    }
  }

  /**
   * Get a single entry by ID
   */
  async getEntry(id: string): Promise<JournalEntry | null> {
    const entries = await this.getAllEntries();
    return entries.find((e) => e.id === id) || null;
  }

  /**
   * Get entry for a specific date
   */
  async getEntryByDate(date: string): Promise<JournalEntry | null> {
    const entries = await this.getAllEntries();
    return entries.find((e) => e.date === date) || null;
  }

  /**
   * Get today's entry if it exists
   */
  async getTodayEntry(): Promise<JournalEntry | null> {
    const today = this.getDateString(new Date());
    return this.getEntryByDate(today);
  }

  /**
   * Get recent entries within a number of days
   */
  async getRecentEntries(days: number = 7): Promise<JournalEntry[]> {
    const entries = await this.getAllEntries();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffString = this.getDateString(cutoffDate);

    return entries.filter((e) => e.date >= cutoffString);
  }

  /**
   * Create a new journal entry
   * Note: Multiple entries per day are allowed
   */
  async createEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
    const entries = await this.getAllEntries();
    const now = new Date().toISOString();
    const date = input.date || this.getDateString(new Date());

    const newEntry: JournalEntry = {
      id: uuidv4(),
      date,
      createdAt: now,
      updatedAt: now,
      content: input.content,
      mood: input.mood,
      energy: input.energy,
      tags: input.tags,
    };

    entries.unshift(newEntry);
    await this.saveEntries(entries);

    return newEntry;
  }

  /**
   * Update an existing journal entry
   */
  async updateEntry(
    id: string,
    input: UpdateJournalEntryInput
  ): Promise<JournalEntry> {
    const entries = await this.getAllEntries();
    const index = entries.findIndex((e) => e.id === id);

    if (index === -1) {
      throw new Error(`Journal entry not found: ${id}`);
    }

    const updated: JournalEntry = {
      ...entries[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    entries[index] = updated;
    await this.saveEntries(entries);

    return updated;
  }

  /**
   * Delete a journal entry
   */
  async deleteEntry(id: string): Promise<void> {
    const entries = await this.getAllEntries();
    const filtered = entries.filter((e) => e.id !== id);

    if (filtered.length === entries.length) {
      throw new Error(`Journal entry not found: ${id}`);
    }

    await this.saveEntries(filtered);
  }

  /**
   * Get journal statistics
   */
  async getStats(): Promise<JournalStats> {
    const entries = await this.getAllEntries();

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        currentStreak: 0,
        longestStreak: 0,
        topTags: [],
      };
    }

    // Calculate streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(entries);

    // Calculate average mood
    const entriesWithMood = entries.filter((e) => e.mood);
    const moodToNumber: Record<JournalMood, number> = {
      great: 5,
      good: 4,
      neutral: 3,
      low: 2,
      bad: 1,
    };
    const averageMood =
      entriesWithMood.length > 0
        ? entriesWithMood.reduce(
            (sum, e) => sum + moodToNumber[e.mood!],
            0
          ) / entriesWithMood.length
        : undefined;

    // Calculate average energy
    const entriesWithEnergy = entries.filter((e) => e.energy);
    const averageEnergy =
      entriesWithEnergy.length > 0
        ? entriesWithEnergy.reduce((sum, e) => sum + e.energy!, 0) /
          entriesWithEnergy.length
        : undefined;

    // Get top tags
    const tagCounts: Record<string, number> = {};
    entries.forEach((e) => {
      e.tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    return {
      totalEntries: entries.length,
      currentStreak,
      longestStreak,
      averageMood,
      averageEnergy,
      topTags,
    };
  }

  /**
   * Clear the cache (useful after external updates)
   */
  clearCache(): void {
    this.entriesCache = null;
  }

  // Private helper methods

  private async saveEntries(entries: JournalEntry[]): Promise<void> {
    try {
      // Sort before saving
      entries.sort((a, b) => b.date.localeCompare(a.date));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      this.entriesCache = entries;
    } catch (error) {
      console.error('[JournalService] Error saving entries:', error);
      throw error;
    }
  }

  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private calculateStreaks(entries: JournalEntry[]): {
    currentStreak: number;
    longestStreak: number;
  } {
    if (entries.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Get unique dates sorted descending
    const dates = [...new Set(entries.map((e) => e.date))].sort((a, b) =>
      b.localeCompare(a)
    );

    const today = this.getDateString(new Date());
    const yesterday = this.getDateString(
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;

    // Calculate current streak (must include today or yesterday)
    if (dates[0] === today || dates[0] === yesterday) {
      let expectedDate = dates[0] === today ? today : yesterday;
      for (const date of dates) {
        if (date === expectedDate) {
          streak++;
          // Move to previous day
          const prevDate = new Date(expectedDate);
          prevDate.setDate(prevDate.getDate() - 1);
          expectedDate = this.getDateString(prevDate);
        } else {
          break;
        }
      }
      currentStreak = streak;
    }

    // Calculate longest streak
    streak = 1;
    longestStreak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const current = new Date(dates[i]);
      const next = new Date(dates[i + 1]);
      const diffDays = Math.round(
        (current.getTime() - next.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (diffDays === 1) {
        streak++;
        longestStreak = Math.max(longestStreak, streak);
      } else {
        streak = 1;
      }
    }

    return { currentStreak, longestStreak };
  }
}

// Export singleton instance
export const JournalService = new JournalServiceClass();
export default JournalService;
