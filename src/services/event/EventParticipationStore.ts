/**
 * Event Participation Store
 * Local-first storage for user's joined events
 * Provides instant UX while Nostr sync happens in background
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EventParticipation {
  eventId: string;
  eventName: string;
  teamId: string;
  activityType: string;
  eventDate: string;
  entryFeePaid: number;
  paymentMethod: 'nutzap' | 'lightning';
  paidAt: number; // Unix timestamp
  status: 'pending_approval' | 'approved' | 'rejected';
  localOnly: boolean; // true until on kind 30000 list
}

export class EventParticipationStore {
  private static STORAGE_KEY = '@runstr:event_participations';

  /**
   * Add event participation (after payment)
   */
  static async addParticipation(
    participation: EventParticipation
  ): Promise<void> {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) throw new Error('User not authenticated');

      const key = `${this.STORAGE_KEY}:${userPubkey}`;
      const existingStr = await AsyncStorage.getItem(key);
      const existing: EventParticipation[] = existingStr ? JSON.parse(existingStr) : [];

      // Check if already joined
      const alreadyJoined = existing.some(p => p.eventId === participation.eventId);
      if (alreadyJoined) {
        console.log('[EventParticipation] Already joined:', participation.eventId);
        return;
      }

      // Add new participation
      existing.push(participation);
      await AsyncStorage.setItem(key, JSON.stringify(existing));

      console.log('[EventParticipation] Added:', participation.eventName);
    } catch (error) {
      console.error('[EventParticipation] Failed to add:', error);
      throw error;
    }
  }

  /**
   * Get all user's event participations
   */
  static async getParticipations(): Promise<EventParticipation[]> {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) return [];

      const key = `${this.STORAGE_KEY}:${userPubkey}`;
      const str = await AsyncStorage.getItem(key);
      return str ? JSON.parse(str) : [];
    } catch (error) {
      console.error('[EventParticipation] Failed to load:', error);
      return [];
    }
  }

  /**
   * Get participation for specific event
   */
  static async getParticipationByEventId(
    eventId: string
  ): Promise<EventParticipation | null> {
    const all = await this.getParticipations();
    return all.find(p => p.eventId === eventId) || null;
  }

  /**
   * Check if current user has paid for a specific event
   * Used to include paid users in leaderboards before captain approval
   */
  static async hasUserPaidForEvent(eventId: string): Promise<boolean> {
    try {
      const participation = await this.getParticipationByEventId(eventId);

      // User must have paid (entry fee > 0) and not be rejected
      if (!participation) return false;
      if (participation.status === 'rejected') return false;
      if (participation.entryFeePaid === 0) return false; // Free events don't count

      return true;
    } catch (error) {
      console.error('[EventParticipation] Failed to check payment status:', error);
      return false;
    }
  }

  /**
   * Update participation status (when captain approves)
   */
  static async updateStatus(
    eventId: string,
    status: 'approved' | 'rejected'
  ): Promise<void> {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) return;

      const key = `${this.STORAGE_KEY}:${userPubkey}`;
      const str = await AsyncStorage.getItem(key);
      const participations: EventParticipation[] = str ? JSON.parse(str) : [];

      const updated = participations.map(p =>
        p.eventId === eventId ? { ...p, status, localOnly: false } : p
      );

      await AsyncStorage.setItem(key, JSON.stringify(updated));
      console.log('[EventParticipation] Updated status:', eventId, status);
    } catch (error) {
      console.error('[EventParticipation] Failed to update status:', error);
    }
  }

  /**
   * Clear all participations (for logout)
   */
  static async clearAll(): Promise<void> {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) return;

      const key = `${this.STORAGE_KEY}:${userPubkey}`;
      await AsyncStorage.removeItem(key);
      console.log('[EventParticipation] Cleared all');
    } catch (error) {
      console.error('[EventParticipation] Failed to clear:', error);
    }
  }
}
