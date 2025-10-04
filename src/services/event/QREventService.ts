/**
 * QR Event Service
 * Manages creation and encoding of QR-based event entry codes
 * Enables captains to display event QR codes for easy participant joining/payment
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NostrEventDefinition } from '../../types/nostrCompetition';

const QR_EVENTS_STORAGE_KEY = '@runstr:qr_events';
const QR_EVENT_EXPIRY_DAYS = 90; // QR events expire after 90 days

export interface QREventData {
  type: 'paid_event' | 'free_event';
  event_id: string;
  team_id: string;
  team_name?: string;
  event_name: string;
  event_date: string;
  activity_type: string;
  entry_fee: number; // 0 = free
  captain_pubkey: string;
  description?: string;
  max_participants?: number;
  created_at: number;
}

/**
 * QR Event Management Service
 * Handles QR event code generation, encoding, and local storage
 */
export class QREventService {
  private static instance: QREventService;

  private constructor() {}

  public static getInstance(): QREventService {
    if (!QREventService.instance) {
      QREventService.instance = new QREventService();
    }
    return QREventService.instance;
  }

  /**
   * Create QR event data structure from event definition
   */
  public async createQREvent(
    event: NostrEventDefinition,
    teamName?: string
  ): Promise<QREventData> {
    const eventData: QREventData = {
      type: event.entryFeesSats > 0 ? 'paid_event' : 'free_event',
      event_id: event.id,
      team_id: event.teamId,
      team_name: teamName,
      event_name: event.name,
      event_date: event.eventDate,
      activity_type: event.activityType,
      entry_fee: event.entryFeesSats,
      captain_pubkey: event.captainPubkey,
      description: event.description,
      max_participants: event.maxParticipants,
      created_at: Math.floor(Date.now() / 1000),
    };

    // Save to local storage for history
    await this.saveQREvent(eventData);

    return eventData;
  }

  /**
   * Convert QR event data to base64 JSON string for QR code
   */
  public toQRString(data: QREventData): string {
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString).toString('base64');
  }

  /**
   * Convert QR event to deep link URL
   * Format: runstr://event/join?data={base64_encoded_json}
   */
  public toDeepLink(data: QREventData): string {
    const qrString = this.toQRString(data);
    const encoded = encodeURIComponent(qrString);
    return `runstr://event/join?data=${encoded}`;
  }

  /**
   * Save QR event to local storage for history/tracking
   */
  private async saveQREvent(data: QREventData): Promise<void> {
    try {
      // Load existing events
      const existingEvents = await this.getStoredQREvents();

      // Add new event (or update if exists)
      const filtered = existingEvents.filter((e) => e.event_id !== data.event_id);
      filtered.push(data);

      // Save back to storage
      await AsyncStorage.setItem(
        QR_EVENTS_STORAGE_KEY,
        JSON.stringify(filtered)
      );

      console.log(`💾 Saved QR event: ${data.event_id}`);
    } catch (error) {
      console.error('Failed to save QR event:', error);
      // Don't throw - saving to history is not critical
    }
  }

  /**
   * Get all stored QR events
   */
  private async getStoredQREvents(): Promise<QREventData[]> {
    try {
      const stored = await AsyncStorage.getItem(QR_EVENTS_STORAGE_KEY);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load QR events:', error);
      return [];
    }
  }

  /**
   * Get QR events created by a specific captain
   * Also filters out expired events (>90 days old)
   */
  public async getCreatedQREvents(captainPubkey: string): Promise<QREventData[]> {
    try {
      const allEvents = await this.getStoredQREvents();
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const expirySeconds = QR_EVENT_EXPIRY_DAYS * 24 * 60 * 60;

      // Filter by captain and expiry
      const validEvents = allEvents.filter((event) => {
        const isCaptain = event.captain_pubkey === captainPubkey;
        const isNotExpired = (nowTimestamp - event.created_at) < expirySeconds;
        return isCaptain && isNotExpired;
      });

      return validEvents;
    } catch (error) {
      console.error('Failed to get created QR events:', error);
      return [];
    }
  }

  /**
   * Get a specific QR event by ID
   */
  public async getQREventById(eventId: string): Promise<QREventData | null> {
    try {
      const events = await this.getStoredQREvents();
      return events.find((e) => e.event_id === eventId) || null;
    } catch (error) {
      console.error('Failed to get QR event:', error);
      return null;
    }
  }

  /**
   * Check if an event QR already exists in storage
   */
  public async eventQRExists(eventId: string): Promise<boolean> {
    try {
      const events = await this.getStoredQREvents();
      return events.some((e) => e.event_id === eventId);
    } catch (error) {
      console.error('Failed to check event QR existence:', error);
      return false;
    }
  }

  /**
   * Clear old/expired QR events from storage
   * Call periodically to prevent storage bloat
   */
  public async cleanupExpiredEvents(): Promise<void> {
    try {
      const allEvents = await this.getStoredQREvents();
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const expirySeconds = QR_EVENT_EXPIRY_DAYS * 24 * 60 * 60;

      // Keep only non-expired events
      const validEvents = allEvents.filter((event) => {
        return (nowTimestamp - event.created_at) < expirySeconds;
      });

      // Save filtered list
      await AsyncStorage.setItem(
        QR_EVENTS_STORAGE_KEY,
        JSON.stringify(validEvents)
      );

      const removed = allEvents.length - validEvents.length;
      if (removed > 0) {
        console.log(`🧹 Cleaned up ${removed} expired QR events`);
      }
    } catch (error) {
      console.error('Failed to cleanup expired events:', error);
    }
  }

  /**
   * Delete a specific QR event by ID
   */
  public async deleteQREvent(eventId: string): Promise<boolean> {
    try {
      const events = await this.getStoredQREvents();
      const filtered = events.filter((e) => e.event_id !== eventId);

      if (filtered.length === events.length) {
        // Event not found
        return false;
      }

      await AsyncStorage.setItem(
        QR_EVENTS_STORAGE_KEY,
        JSON.stringify(filtered)
      );

      console.log(`🗑️ Deleted QR event: ${eventId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete QR event:', error);
      return false;
    }
  }
}

// Export singleton instance
export const qrEventService = QREventService.getInstance();
