/**
 * Event Snapshot Store
 * Local-first storage for complete event snapshots (data + participants + leaderboard)
 * Provides instant event detail display without Nostr queries
 *
 * Similar to LocalWorkoutStorageService but for events
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CompetitionEvent } from '../../types/competitionEvent';
import type { LeaderboardEntry } from '../competition/DailyLeaderboardService';

export interface EventSnapshot {
  // Core event data
  eventId: string;
  eventData: CompetitionEvent;
  participants: string[]; // Hex pubkeys
  leaderboard: LeaderboardEntry[]; // Pre-calculated rankings

  // Metadata
  lastUpdated: number; // Unix timestamp
  eventStatus: 'upcoming' | 'active' | 'completed';
  userIsParticipant: boolean;
  participantCount: number;

  // Cache control
  ttl: number; // Expiry timestamp (Unix ms)
}

export class EventSnapshotStore {
  private static STORAGE_KEY = '@runstr:event_snapshots';
  private static MAX_SNAPSHOTS = 50; // Keep storage lean

  /**
   * Get storage key for current user
   */
  private static async getStorageKey(): Promise<string> {
    const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
    if (!userPubkey) throw new Error('User not authenticated');
    return `${this.STORAGE_KEY}:${userPubkey}`;
  }

  /**
   * Calculate TTL (expiry timestamp) based on event status
   */
  private static calculateTTL(eventDate: string): number {
    const event = new Date(eventDate);
    const now = new Date();
    const daysSince = (now.getTime() - event.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince > 0) {
      // ANY past event: Cache indefinitely (final results won't change)
      return Infinity;
    } else if (daysSince < 0) {
      // Upcoming events: 5 minutes
      return Date.now() + 5 * 60 * 1000;
    } else {
      // Active events (today): 1 minute
      return Date.now() + 60 * 1000;
    }
  }

  /**
   * Check if snapshot is expired
   */
  public static isExpired(snapshot: EventSnapshot): boolean {
    if (snapshot.ttl === Infinity) return false; // Never expire completed events
    return Date.now() > snapshot.ttl;
  }

  /**
   * Determine event status based on date
   */
  private static getEventStatus(
    eventDate: string
  ): 'upcoming' | 'active' | 'completed' {
    const event = new Date(eventDate);
    const now = new Date();

    // Reset time portions for comparison
    event.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (event > now) return 'upcoming';
    if (event < now) return 'completed';
    return 'active';
  }

  /**
   * Save event snapshot to local storage
   */
  static async saveSnapshot(params: {
    eventId: string;
    eventData: CompetitionEvent;
    participants: string[];
    leaderboard: LeaderboardEntry[];
    userIsParticipant: boolean;
  }): Promise<void> {
    try {
      const key = await this.getStorageKey();
      const snapshots = await this.getAllSnapshots();

      // Remove old snapshot if exists
      const filtered = snapshots.filter((s) => s.eventId !== params.eventId);

      // Create new snapshot
      const snapshot: EventSnapshot = {
        eventId: params.eventId,
        eventData: params.eventData,
        participants: params.participants,
        leaderboard: params.leaderboard,
        lastUpdated: Date.now(),
        eventStatus: this.getEventStatus(params.eventData.eventDate),
        userIsParticipant: params.userIsParticipant,
        participantCount: params.participants.length,
        ttl: this.calculateTTL(params.eventData.eventDate),
      };

      // Add to collection
      filtered.push(snapshot);

      // Enforce max snapshots limit
      if (filtered.length > this.MAX_SNAPSHOTS) {
        // Sort by lastUpdated (oldest first)
        filtered.sort((a, b) => a.lastUpdated - b.lastUpdated);
        // Remove oldest non-completed events
        const toRemove = filtered.find((s) => s.eventStatus !== 'completed');
        if (toRemove) {
          const index = filtered.indexOf(toRemove);
          filtered.splice(index, 1);
        } else {
          // All are completed, remove oldest
          filtered.shift();
        }
      }

      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      console.log(
        `💾 Saved event snapshot: ${params.eventData.name} (${
          snapshot.eventStatus
        }, TTL: ${snapshot.ttl === Infinity ? 'never' : 'expires'})`
      );
    } catch (error) {
      console.error('❌ Failed to save event snapshot:', error);
      // Don't throw - snapshot is optional optimization
    }
  }

  /**
   * Get event snapshot by ID
   */
  static async getSnapshot(eventId: string): Promise<EventSnapshot | null> {
    try {
      const snapshots = await this.getAllSnapshots();
      const snapshot = snapshots.find((s) => s.eventId === eventId);

      if (!snapshot) {
        console.log(`📭 No snapshot found for event: ${eventId}`);
        return null;
      }

      // Check if expired
      if (this.isExpired(snapshot)) {
        console.log(`⏰ Snapshot expired for event: ${eventId}`);
        await this.deleteSnapshot(eventId); // Clean up
        return null;
      }

      console.log(
        `⚡ Retrieved snapshot for event: ${
          snapshot.eventData.name
        } (cached ${Math.floor(
          (Date.now() - snapshot.lastUpdated) / 1000
        )}s ago)`
      );
      return snapshot;
    } catch (error) {
      console.error('❌ Failed to get event snapshot:', error);
      return null;
    }
  }

  /**
   * Get all event snapshots for current user
   */
  static async getAllSnapshots(): Promise<EventSnapshot[]> {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) return [];

      const key = `${this.STORAGE_KEY}:${userPubkey}`;
      const data = await AsyncStorage.getItem(key);

      if (!data) return [];

      const snapshots: EventSnapshot[] = JSON.parse(data);

      // Auto-cleanup expired snapshots
      const valid = snapshots.filter((s) => !this.isExpired(s));

      if (valid.length !== snapshots.length) {
        // Some were expired - save cleaned list
        await AsyncStorage.setItem(key, JSON.stringify(valid));
        console.log(
          `🧹 Auto-cleaned ${snapshots.length - valid.length} expired snapshots`
        );
      }

      return valid;
    } catch (error) {
      console.error('❌ Failed to get all event snapshots:', error);
      return [];
    }
  }

  /**
   * Delete a specific event snapshot
   */
  static async deleteSnapshot(eventId: string): Promise<void> {
    try {
      const key = await this.getStorageKey();
      const snapshots = await this.getAllSnapshots();
      const filtered = snapshots.filter((s) => s.eventId !== eventId);

      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      console.log(`🗑️ Deleted snapshot for event: ${eventId}`);
    } catch (error) {
      console.error('❌ Failed to delete event snapshot:', error);
      // Don't throw - deletion is non-critical
    }
  }

  /**
   * Clean up expired snapshots
   * @returns Number of snapshots removed
   */
  static async cleanupExpired(): Promise<number> {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) return 0;

      const key = `${this.STORAGE_KEY}:${userPubkey}`;
      const snapshots = await this.getAllSnapshots(); // Already filters expired
      const originalCount = snapshots.length;

      // getAllSnapshots already cleaned up, just count difference
      const data = await AsyncStorage.getItem(key);
      if (!data) return 0;

      const allSnapshots: EventSnapshot[] = JSON.parse(data);
      const removedCount = allSnapshots.length - snapshots.length;

      if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} expired event snapshots`);
      }

      return removedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup expired snapshots:', error);
      return 0;
    }
  }

  /**
   * Clear all event snapshots (for logout)
   */
  static async clearAll(): Promise<void> {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) return;

      const key = `${this.STORAGE_KEY}:${userPubkey}`;
      await AsyncStorage.removeItem(key);
      console.log('🗑️ Cleared all event snapshots');
    } catch (error) {
      console.error('❌ Failed to clear event snapshots:', error);
    }
  }

  /**
   * Get storage statistics for debugging
   */
  static async getStats(): Promise<{
    total: number;
    completed: number;
    active: number;
    upcoming: number;
    storageKB: number;
  }> {
    try {
      const snapshots = await this.getAllSnapshots();
      const key = await this.getStorageKey();
      const data = await AsyncStorage.getItem(key);
      const storageBytes = data ? new Blob([data]).size : 0;

      return {
        total: snapshots.length,
        completed: snapshots.filter((s) => s.eventStatus === 'completed')
          .length,
        active: snapshots.filter((s) => s.eventStatus === 'active').length,
        upcoming: snapshots.filter((s) => s.eventStatus === 'upcoming').length,
        storageKB: Math.round(storageBytes / 1024),
      };
    } catch (error) {
      console.error('❌ Failed to get snapshot stats:', error);
      return { total: 0, completed: 0, active: 0, upcoming: 0, storageKB: 0 };
    }
  }
}
