/**
 * Captain Event Store
 * Local-first storage for captain-created events
 * Enables captains to re-announce events from their dashboard
 *
 * Similar to EventSnapshotStore but specifically for events created by the captain
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CompetitionEvent } from '../../types/competitionEvent';

export interface CaptainEventRecord {
  eventId: string;
  eventData: CompetitionEvent;
  createdAt: number; // Unix timestamp
}

export class CaptainEventStore {
  private static STORAGE_KEY = '@runstr:captain_events';
  private static MAX_EVENTS = 100; // Keep storage reasonable

  /**
   * Get storage key for current user
   */
  private static async getStorageKey(): Promise<string> {
    const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
    if (!userPubkey) throw new Error('User not authenticated');
    return `${this.STORAGE_KEY}:${userPubkey}`;
  }

  /**
   * Save a newly created event
   */
  static async saveCreatedEvent(
    eventId: string,
    eventData: CompetitionEvent
  ): Promise<void> {
    try {
      const key = await this.getStorageKey();
      const events = await this.getMyEvents();

      // Remove old record if exists (update case)
      const filtered = events.filter((e) => e.eventId !== eventId);

      // Create new record
      const record: CaptainEventRecord = {
        eventId,
        eventData,
        createdAt: Date.now(),
      };

      // Add to beginning (newest first)
      filtered.unshift(record);

      // Enforce max events limit
      if (filtered.length > this.MAX_EVENTS) {
        filtered.splice(this.MAX_EVENTS); // Remove oldest events
      }

      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      console.log(
        `💾 Saved captain event: ${eventData.name} (total: ${filtered.length})`
      );
    } catch (error) {
      console.error('❌ Failed to save captain event:', error);
      // Don't throw - storage is optional enhancement
    }
  }

  /**
   * Get all events created by the captain
   * @returns Events sorted by creation date (newest first)
   */
  static async getMyEvents(): Promise<CaptainEventRecord[]> {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) return [];

      const key = `${this.STORAGE_KEY}:${userPubkey}`;
      const data = await AsyncStorage.getItem(key);

      if (!data) return [];

      const events: CaptainEventRecord[] = JSON.parse(data);

      console.log(`📋 Retrieved ${events.length} captain-created events`);
      return events;
    } catch (error) {
      console.error('❌ Failed to get captain events:', error);
      return [];
    }
  }

  /**
   * Get events for a specific team
   */
  static async getTeamEvents(teamId: string): Promise<CaptainEventRecord[]> {
    try {
      const allEvents = await this.getMyEvents();
      const teamEvents = allEvents.filter((e) => e.eventData.teamId === teamId);

      console.log(
        `📋 Found ${teamEvents.length} captain events for team: ${teamId}`
      );
      return teamEvents;
    } catch (error) {
      console.error('❌ Failed to get team events:', error);
      return [];
    }
  }

  /**
   * Get a specific event by ID
   */
  static async getEventById(
    eventId: string
  ): Promise<CaptainEventRecord | null> {
    try {
      const events = await this.getMyEvents();
      const event = events.find((e) => e.eventId === eventId);

      if (event) {
        console.log(`✅ Found captain event: ${event.eventData.name}`);
      }

      return event || null;
    } catch (error) {
      console.error('❌ Failed to get event by ID:', error);
      return null;
    }
  }

  /**
   * Delete a specific event
   */
  static async deleteEvent(eventId: string): Promise<void> {
    try {
      const key = await this.getStorageKey();
      const events = await this.getMyEvents();
      const filtered = events.filter((e) => e.eventId !== eventId);

      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      console.log(`🗑️ Deleted captain event: ${eventId}`);
    } catch (error) {
      console.error('❌ Failed to delete captain event:', error);
      // Don't throw - deletion is non-critical
    }
  }

  /**
   * Clear all captain events (for logout)
   */
  static async clearAll(): Promise<void> {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) return;

      const key = `${this.STORAGE_KEY}:${userPubkey}`;
      await AsyncStorage.removeItem(key);
      console.log('🗑️ Cleared all captain events');
    } catch (error) {
      console.error('❌ Failed to clear captain events:', error);
    }
  }

  /**
   * Get storage statistics for debugging
   */
  static async getStats(): Promise<{
    total: number;
    upcoming: number;
    active: number;
    completed: number;
    storageKB: number;
  }> {
    try {
      const events = await this.getMyEvents();
      const key = await this.getStorageKey();
      const data = await AsyncStorage.getItem(key);
      const storageBytes = data ? new Blob([data]).size : 0;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      return {
        total: events.length,
        upcoming: events.filter((e) => {
          const eventDate = new Date(e.eventData.eventDate);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate > now;
        }).length,
        active: events.filter((e) => {
          const eventDate = new Date(e.eventData.eventDate);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === now.getTime();
        }).length,
        completed: events.filter((e) => {
          const eventDate = new Date(e.eventData.eventDate);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate < now;
        }).length,
        storageKB: Math.round(storageBytes / 1024),
      };
    } catch (error) {
      console.error('❌ Failed to get captain event stats:', error);
      return { total: 0, upcoming: 0, active: 0, completed: 0, storageKB: 0 };
    }
  }
}
