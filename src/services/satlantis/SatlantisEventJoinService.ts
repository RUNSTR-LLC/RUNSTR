/**
 * SatlantisEventJoinService - Handle event joining with optional donation
 *
 * Coordinates the flow of joining RUNSTR events:
 * - Free events: Direct RSVP publish
 * - Donation events: Show donation modal → User donates (optional) → RSVP
 *
 * Key changes (Apple compliance):
 * - Donations are soft requirements (users can join without donating)
 * - No NWC required for joining - uses ExternalZapModal pattern
 * - "Suggested donation" instead of "entry fee"
 *
 * Usage:
 * ```typescript
 * // Free event
 * await SatlantisEventJoinService.joinEvent(event);
 *
 * // Donation event (after user donates or skips)
 * await SatlantisEventJoinService.joinEvent(event, true); // donated
 * await SatlantisEventJoinService.joinEvent(event, false); // skipped donation
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { SatlantisRSVPService } from './SatlantisRSVPService';
import UnifiedSigningService from '../auth/UnifiedSigningService';
import { UnifiedCacheService } from '../cache/UnifiedCacheService';
import { PledgeService } from '../pledge/PledgeService';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import type { NDKKind } from '@nostr-dev-kit/ndk';
import type { SatlantisEvent } from '../../types/satlantis';

// NIP-52 Calendar RSVP kind
const KIND_CALENDAR_RSVP = 31925 as NDKKind;

// Storage key for local join backup (in case Nostr RSVP query fails)
const LOCAL_JOINS_KEY = '@runstr:local_event_joins';

// Storage key for RSVP event IDs (for direct lookup)
const RSVP_EVENT_IDS_KEY = '@runstr:rsvp_event_ids';

// Storage key for joined events (for workout tagging)
const JOINED_EVENTS_KEY = '@runstr:joined_events';

// Interface for local join storage - supports multiple users per event
interface LocalJoinRecord {
  userPubkeys: string[]; // Array of user pubkeys who joined
  timestamps: Record<string, number>; // pubkey → timestamp mapping
}

// Interface for joined event context (for workout tagging)
export interface JoinedEventRecord {
  eventId: string; // Calendar event d-tag
  eventPubkey: string; // Event creator's pubkey
  title: string; // Event title for display
  startTime: number; // Unix timestamp (seconds)
  endTime: number; // Unix timestamp (seconds)
  joinedAt: number; // When user joined (Unix ms)
  activityType?: string; // For filtering workouts
  pledgeCreated?: boolean; // Whether a pledge was created for this event
}

// Legacy format (single user) - for migration
interface LegacyLocalJoinRecord {
  userPubkey: string;
  timestamp: number;
}

export interface JoinEventResult {
  success: boolean;
  error?: string;
  rsvpEventId?: string;
}

export interface PaymentVerificationResult {
  isPaid: boolean;
  error?: string;
}

// Pending join - payment made but RSVP failed
export interface PendingJoin {
  eventId: string;
  eventPubkey: string;
  paymentProof: string;
  amountSats: number;
  timestamp: number;
}

export interface InvoiceResult {
  success: boolean;
  invoice?: string;
  paymentHash?: string;
  amountSats?: number;
  error?: string;
}

class SatlantisEventJoinServiceClass {
  private static instance: SatlantisEventJoinServiceClass;

  static getInstance(): SatlantisEventJoinServiceClass {
    if (!this.instance) {
      this.instance = new SatlantisEventJoinServiceClass();
    }
    return this.instance;
  }

  /**
   * Join an event - publishes kind 31925 RSVP
   * @param event - The event to join
   * @param donationMade - Whether user made a donation (for tracking purposes)
   */
  async joinEvent(
    event: SatlantisEvent,
    donationMade?: boolean
  ): Promise<JoinEventResult> {
    try {
      console.log(`[EventJoin] Joining event: ${event.title}`, { donationMade });

      // Get signer
      const signingService = UnifiedSigningService.getInstance();
      const signer = await signingService.getSigner();

      if (!signer) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      // Build RSVP event
      const ndk = await GlobalNDKService.getInstance();
      const eventRef = `31923:${event.pubkey}:${event.id}`;

      const tags: string[][] = [
        ['a', eventRef],
        ['status', 'accepted'],
        ['d', `rsvp-${event.id}`],
      ];

      // Add donation tag if user donated (for analytics, not verification)
      if (donationMade) {
        tags.push(['donated', 'true']);
        const donationAmount = event.suggestedDonationSats || event.entryFeeSats;
        if (donationAmount) {
          tags.push(['donation_amount', donationAmount.toString()]);
        }
      }

      // Debug logging
      console.log('[EventJoin] 📝 Building RSVP event:', {
        eventRef,
        tags: tags.map(t => t.join(':')),
      });

      const rsvpEvent = new NDKEvent(ndk, {
        kind: KIND_CALENDAR_RSVP,
        content: '',
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      // Sign
      await rsvpEvent.sign(signer);
      console.log('[EventJoin] ✅ RSVP signed, event ID:', rsvpEvent.id);

      // Publish with timeout
      console.log('[EventJoin] Publishing RSVP...');
      const publishPromise = rsvpEvent.publish();
      const timeoutPromise = new Promise<Set<any>>((resolve) =>
        setTimeout(() => resolve(new Set()), 10000)
      );

      const relaySet = await Promise.race([publishPromise, timeoutPromise]);
      const publishedCount = relaySet.size;

      if (publishedCount > 0) {
        // Log which relays accepted the RSVP
        const relayUrls = Array.from(relaySet).map((r: any) => r.url || r);
        console.log(`[EventJoin] 🎉 RSVP published to ${publishedCount} relays:`, relayUrls);

        // Get current user pubkey for local storage
        const userPubkey = await signingService.getUserPubkey();

        // Save RSVP event ID for direct lookup (most reliable method)
        if (rsvpEvent.id) {
          await this.saveRsvpEventId(event.pubkey, event.id, rsvpEvent.id, userPubkey || '');
          console.log(`[EventJoin] 💾 Saved RSVP event ID: ${rsvpEvent.id.slice(0, 16)}...`);
        }

        // Save join locally as backup (in case Nostr query doesn't find it)
        if (userPubkey) {
          await this.saveLocalJoin(event.id, event.pubkey, userPubkey);

          // NEW: Store event context for workout tagging
          await this.saveJoinedEvent(event);
          console.log(`[EventJoin] 📝 Saved joined event context for workout tagging`);

          // NEW: Create pledge if event has pledge cost
          if (event.pledgeCost && event.pledgeCost > 0) {
            const destination = {
              type: event.pledgeDestination || 'captain',
              lightningAddress:
                event.pledgeDestination === 'charity'
                  ? event.pledgeCharityAddress
                  : event.captainLightningAddress,
              name:
                event.pledgeDestination === 'charity'
                  ? event.pledgeCharityName
                  : event.creatorProfile?.name || 'Event Captain',
            };

            // Only create pledge if we have a valid destination address
            if (destination.lightningAddress) {
              const pledge = await PledgeService.createPledge({
                eventId: event.id,
                eventName: event.title,
                totalWorkouts: event.pledgeCost,
                destination: {
                  type: destination.type as 'captain' | 'charity',
                  lightningAddress: destination.lightningAddress || '',
                  name: destination.name || '',
                },
                userPubkey,
              });

              if (pledge) {
                console.log(`[EventJoin] 💰 Created pledge: ${pledge.id} (${event.pledgeCost} workouts)`);
              } else {
                console.log(`[EventJoin] ⚠️ Could not create pledge (user may already have active pledge)`);
              }
            } else {
              console.log(`[EventJoin] ⚠️ No lightning address for pledge destination`);
            }
          }
        }

        // Invalidate cache so participant list updates
        await this.invalidateEventCache(event.pubkey, event.id);

        return {
          success: true,
          rsvpEventId: rsvpEvent.id,
        };
      } else {
        console.log('[EventJoin] ❌ RSVP publish failed - 0 relays accepted');
        return {
          success: false,
          error: 'Failed to publish RSVP. Please try again.',
        };
      }
    } catch (error) {
      console.error('[EventJoin] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * @deprecated - No longer used. Donations use ExternalZapModal pattern.
   * Kept for backward compatibility but will be removed in future version.
   */
  async generateEntryInvoice(event: SatlantisEvent): Promise<InvoiceResult> {
    console.warn('[EventJoin] generateEntryInvoice is deprecated. Use ExternalZapModal instead.');
    return {
      success: false,
      error: 'This method is deprecated. Donations now use ExternalZapModal.',
    };
  }

  /**
   * Check if current user has joined an event
   */
  async hasUserJoined(event: SatlantisEvent): Promise<boolean> {
    try {
      const signingService = UnifiedSigningService.getInstance();
      const hexPubkey = await signingService.getUserPubkey();

      if (!hexPubkey) {
        return false;
      }

      return await SatlantisRSVPService.hasUserRSVPd(
        event.pubkey,
        event.id,
        hexPubkey
      );
    } catch (error) {
      console.error('[EventJoin] Error checking join status:', error);
      return false;
    }
  }

  /**
   * Get event join requirements
   */
  getJoinRequirements(event: SatlantisEvent): {
    hasDonation: boolean;
    suggestedDonation: number;
    canJoin: boolean;
    reason?: string;
  } {
    const now = Math.floor(Date.now() / 1000);

    // Check if event has ended
    if (now > event.endTime) {
      return {
        hasDonation: false,
        suggestedDonation: 0,
        canJoin: false,
        reason: 'Event has ended',
      };
    }

    // Check join method - both 'paid' (legacy) and 'donation' show donation modal
    const donationAmount = event.suggestedDonationSats || event.entryFeeSats || 0;
    const hasDonation =
      (event.joinMethod === 'donation' || event.joinMethod === 'paid') && donationAmount > 0;

    return {
      hasDonation,
      suggestedDonation: donationAmount,
      canJoin: true,
    };
  }

  /**
   * @deprecated - No longer used. Payment verification removed in favor of trust-based donations.
   */
  async verifyPayment(_invoice: string): Promise<PaymentVerificationResult> {
    console.warn('[EventJoin] verifyPayment is deprecated. Donations use honor system.');
    return { isPaid: false, error: 'Method deprecated' };
  }

  /**
   * @deprecated - Pending joins no longer needed with simplified donation flow.
   */
  async getPendingJoinForEvent(_eventId: string): Promise<PendingJoin | null> {
    return null;
  }

  /**
   * Invalidate RSVP cache to refresh participant list
   * Note: Parent component should call refresh() after join to update UI
   */
  private async invalidateEventCache(
    eventPubkey: string,
    eventDTag: string
  ): Promise<void> {
    try {
      // ✅ FIX: Use same cache key format as SatlantisRSVPService (eventDTag only)
      const cacheKey = `satlantis_rsvps_${eventDTag}`;

      // Also invalidate leaderboard cache so it refreshes
      const leaderboardCacheKey = `satlantis_leaderboard_${eventDTag}`;

      // Actually clear the cache so fresh query happens
      await UnifiedCacheService.invalidate(cacheKey);
      await UnifiedCacheService.invalidate(leaderboardCacheKey);
      console.log('[EventJoin] 🗑️ Cleared RSVP cache:', cacheKey);
      console.log('[EventJoin] 🗑️ Cleared leaderboard cache:', leaderboardCacheKey);
    } catch (error) {
      console.warn('[EventJoin] Cache clear error:', error);
    }
  }

  // ============================================================================
  // Local Join Storage (Backup Persistence)
  // ============================================================================

  /**
   * Save join locally as backup (in case Nostr RSVP query fails)
   * Now supports multiple users per event
   */
  async saveLocalJoin(
    eventId: string,
    eventPubkey: string,
    userPubkey: string
  ): Promise<void> {
    try {
      const key = `${eventPubkey}:${eventId}`;
      const joins = await this.getLocalJoins();

      // Get existing record or create new one
      let record = joins[key];
      if (!record) {
        record = { userPubkeys: [], timestamps: {} };
      }

      // Add user if not already present
      if (!record.userPubkeys.includes(userPubkey)) {
        record.userPubkeys.push(userPubkey);
        record.timestamps[userPubkey] = Date.now();
        joins[key] = record;
        await AsyncStorage.setItem(LOCAL_JOINS_KEY, JSON.stringify(joins));
        console.log('[EventJoin] 💾 Saved join locally:', key, '- Total users:', record.userPubkeys.length);
      } else {
        console.log('[EventJoin] 📝 User already in local joins:', key);
      }
    } catch (error) {
      console.error('[EventJoin] Error saving local join:', error);
    }
  }

  /**
   * Check if user has a local join record for an event
   * Handles both new (multi-user) and legacy (single-user) formats
   */
  async hasLocalJoin(
    eventPubkey: string,
    eventId: string,
    userPubkey: string
  ): Promise<boolean> {
    try {
      const key = `${eventPubkey}:${eventId}`;
      const joins = await this.getLocalJoins();
      const record = joins[key];

      if (!record) return false;

      // Check new format (array of pubkeys)
      if (record.userPubkeys && record.userPubkeys.includes(userPubkey)) {
        console.log('[EventJoin] 📍 Found local join backup for:', key);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[EventJoin] Error checking local join:', error);
      return false;
    }
  }

  /**
   * Get all local joins - migrates legacy single-user format to multi-user
   */
  private async getLocalJoins(): Promise<Record<string, LocalJoinRecord>> {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_JOINS_KEY);
      if (!stored) return {};

      const parsed = JSON.parse(stored);
      let needsMigration = false;

      // Migrate legacy records (single userPubkey) to new format (userPubkeys array)
      for (const key of Object.keys(parsed)) {
        const record = parsed[key];
        // Check if this is legacy format (has userPubkey but no userPubkeys array)
        if (record.userPubkey && !record.userPubkeys) {
          console.log('[EventJoin] 🔄 Migrating legacy join record:', key);
          parsed[key] = {
            userPubkeys: [record.userPubkey],
            timestamps: { [record.userPubkey]: record.timestamp || Date.now() },
          };
          needsMigration = true;
        }
      }

      // Save migrated data
      if (needsMigration) {
        await AsyncStorage.setItem(LOCAL_JOINS_KEY, JSON.stringify(parsed));
        console.log('[EventJoin] ✅ Migration complete');
      }

      return parsed;
    } catch (error) {
      console.error('[EventJoin] Error getting local joins:', error);
      return {};
    }
  }

  /**
   * Remove a local join (when we confirm it's on Nostr)
   */
  async removeLocalJoin(eventPubkey: string, eventId: string): Promise<void> {
    try {
      const key = `${eventPubkey}:${eventId}`;
      const joins = await this.getLocalJoins();
      delete joins[key];
      await AsyncStorage.setItem(LOCAL_JOINS_KEY, JSON.stringify(joins));
      console.log('[EventJoin] 🗑️ Removed local join:', key);
    } catch (error) {
      console.error('[EventJoin] Error removing local join:', error);
    }
  }

  /**
   * Get local joins for a specific event (returns array of user pubkeys)
   * Used to include locally-joined users in participant list when Nostr RSVP query fails
   */
  async getLocalJoinsForEvent(
    eventPubkey: string,
    eventId: string
  ): Promise<string[]> {
    try {
      const key = `${eventPubkey}:${eventId}`;
      const joins = await this.getLocalJoins();
      const record = joins[key];

      if (record && record.userPubkeys && record.userPubkeys.length > 0) {
        console.log('[EventJoin] 📍 Found', record.userPubkeys.length, 'local joins for event:', key);
        return record.userPubkeys;
      }
      return [];
    } catch (error) {
      console.error('[EventJoin] Error getting local joins for event:', error);
      return [];
    }
  }

  // ============================================================================
  // Debug Methods (for troubleshooting RSVP issues)
  // ============================================================================

  /**
   * DEBUG: Clear local join for a specific event (allows re-testing join flow)
   */
  async debugClearLocalJoin(
    eventPubkey: string,
    eventId: string
  ): Promise<void> {
    try {
      const key = `${eventPubkey}:${eventId}`;
      const joins = await this.getLocalJoins();

      if (joins[key]) {
        console.log('[EventJoin] 🧹 DEBUG: Clearing local join for:', key);
        delete joins[key];
        await AsyncStorage.setItem(LOCAL_JOINS_KEY, JSON.stringify(joins));
        console.log('[EventJoin] ✅ DEBUG: Local join cleared');
      } else {
        console.log('[EventJoin] ℹ️ DEBUG: No local join found for:', key);
      }

      // Also clear RSVP cache
      const eventRef = `31923:${eventPubkey}:${eventId}`;
      const cacheKey = `satlantis_rsvps_${eventRef}`;
      await UnifiedCacheService.invalidate(cacheKey);
      console.log('[EventJoin] 🗑️ DEBUG: RSVP cache also cleared');
    } catch (error) {
      console.error('[EventJoin] DEBUG: Error clearing local join:', error);
    }
  }

  /**
   * DEBUG: Get all stored local joins (for inspection)
   */
  async debugGetAllLocalJoins(): Promise<Record<string, LocalJoinRecord>> {
    const joins = await this.getLocalJoins();
    console.log('[EventJoin] 🔍 DEBUG: All local joins:', JSON.stringify(joins, null, 2));
    return joins;
  }

  /**
   * DEBUG: Force add a user to local joins (for testing without publishing RSVP)
   */
  async debugForceLocalJoin(
    eventPubkey: string,
    eventId: string,
    userPubkey: string
  ): Promise<void> {
    console.log('[EventJoin] 🔧 DEBUG: Force adding local join...');
    await this.saveLocalJoin(eventId, eventPubkey, userPubkey);
    console.log('[EventJoin] ✅ DEBUG: Force join complete');
  }

  /**
   * DEBUG: Clear ALL local join data (nuclear option)
   */
  async debugClearAllLocalJoins(): Promise<void> {
    console.log('[EventJoin] 💥 DEBUG: Clearing ALL local joins...');
    await AsyncStorage.removeItem(LOCAL_JOINS_KEY);
    console.log('[EventJoin] ✅ DEBUG: All local joins cleared');
  }

  // ============================================================================
  // RSVP Event ID Storage (Direct Lookup - Most Reliable Method)
  // ============================================================================

  /**
   * Storage structure for RSVP event IDs:
   * { "eventPubkey:eventId": { "userPubkey": "rsvpEventId", ... }, ... }
   * This allows direct lookup of RSVPs by event ID instead of unreliable tag queries
   */

  /**
   * Save RSVP event ID for direct lookup
   * This is the most reliable way to find RSVPs since relay tag indexing is unreliable
   */
  async saveRsvpEventId(
    eventPubkey: string,
    eventId: string,
    rsvpEventId: string,
    userPubkey: string
  ): Promise<void> {
    try {
      const key = `${eventPubkey}:${eventId}`;
      const allRsvps = await this.getRsvpEventIds();

      // Get or create record for this event
      if (!allRsvps[key]) {
        allRsvps[key] = {};
      }

      // Store the RSVP event ID for this user
      allRsvps[key][userPubkey] = rsvpEventId;

      await AsyncStorage.setItem(RSVP_EVENT_IDS_KEY, JSON.stringify(allRsvps));
      console.log(`[EventJoin] 💾 Saved RSVP event ID for direct lookup: ${rsvpEventId.slice(0, 16)}...`);
    } catch (error) {
      console.error('[EventJoin] Error saving RSVP event ID:', error);
    }
  }

  /**
   * Get all stored RSVP event IDs
   */
  private async getRsvpEventIds(): Promise<Record<string, Record<string, string>>> {
    try {
      const stored = await AsyncStorage.getItem(RSVP_EVENT_IDS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[EventJoin] Error getting RSVP event IDs:', error);
      return {};
    }
  }

  /**
   * Get RSVP event IDs for a specific calendar event
   * Returns array of { userPubkey, rsvpEventId } for direct Nostr lookup
   */
  async getRsvpEventIdsForEvent(
    eventPubkey: string,
    eventId: string
  ): Promise<Array<{ userPubkey: string; rsvpEventId: string }>> {
    try {
      const key = `${eventPubkey}:${eventId}`;
      const allRsvps = await this.getRsvpEventIds();
      const eventRsvps = allRsvps[key];

      if (!eventRsvps) {
        return [];
      }

      const result = Object.entries(eventRsvps).map(([userPubkey, rsvpEventId]) => ({
        userPubkey,
        rsvpEventId,
      }));

      console.log(`[EventJoin] 📖 Found ${result.length} stored RSVP event IDs for: ${eventId}`);
      return result;
    } catch (error) {
      console.error('[EventJoin] Error getting RSVP event IDs for event:', error);
      return [];
    }
  }

  /**
   * Get RSVP event ID for a specific user on a specific event
   */
  async getUserRsvpEventId(
    eventPubkey: string,
    eventId: string,
    userPubkey: string
  ): Promise<string | null> {
    try {
      const key = `${eventPubkey}:${eventId}`;
      const allRsvps = await this.getRsvpEventIds();
      const eventRsvps = allRsvps[key];

      if (eventRsvps && eventRsvps[userPubkey]) {
        return eventRsvps[userPubkey];
      }
      return null;
    } catch (error) {
      console.error('[EventJoin] Error getting user RSVP event ID:', error);
      return null;
    }
  }

  /**
   * DEBUG: Clear RSVP event IDs for a specific event
   */
  async debugClearRsvpEventIds(
    eventPubkey: string,
    eventId: string
  ): Promise<void> {
    try {
      const key = `${eventPubkey}:${eventId}`;
      const allRsvps = await this.getRsvpEventIds();

      if (allRsvps[key]) {
        console.log('[EventJoin] 🧹 DEBUG: Clearing RSVP event IDs for:', key);
        delete allRsvps[key];
        await AsyncStorage.setItem(RSVP_EVENT_IDS_KEY, JSON.stringify(allRsvps));
        console.log('[EventJoin] ✅ DEBUG: RSVP event IDs cleared');
      } else {
        console.log('[EventJoin] ℹ️ DEBUG: No RSVP event IDs found for:', key);
      }
    } catch (error) {
      console.error('[EventJoin] DEBUG: Error clearing RSVP event IDs:', error);
    }
  }

  /**
   * DEBUG: Get all stored RSVP event IDs (for inspection)
   */
  async debugGetAllRsvpEventIds(): Promise<Record<string, Record<string, string>>> {
    const rsvps = await this.getRsvpEventIds();
    console.log('[EventJoin] 🔍 DEBUG: All RSVP event IDs:', JSON.stringify(rsvps, null, 2));
    return rsvps;
  }

  // ============================================================================
  // Joined Events Storage (for Workout Tagging)
  // ============================================================================

  /**
   * Save joined event context for workout tagging
   * Workouts published during active events will include the event's #e tag
   */
  async saveJoinedEvent(event: SatlantisEvent): Promise<void> {
    try {
      const joinedEvents = await this.getJoinedEvents();

      // Check if already joined (don't duplicate)
      const existingIndex = joinedEvents.findIndex(
        (e) => e.eventId === event.id && e.eventPubkey === event.pubkey
      );

      const record: JoinedEventRecord = {
        eventId: event.id,
        eventPubkey: event.pubkey,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        joinedAt: Date.now(),
        activityType: event.activityType || event.sportType,
        pledgeCreated: (event.pledgeCost || 0) > 0,
      };

      if (existingIndex >= 0) {
        // Update existing record
        joinedEvents[existingIndex] = record;
      } else {
        // Add new record
        joinedEvents.push(record);
      }

      await AsyncStorage.setItem(JOINED_EVENTS_KEY, JSON.stringify(joinedEvents));
      console.log(`[EventJoin] 💾 Saved joined event: ${event.title} (${event.id})`);
    } catch (error) {
      console.error('[EventJoin] Error saving joined event:', error);
    }
  }

  /**
   * Get all joined events (for debugging/display)
   */
  async getJoinedEvents(): Promise<JoinedEventRecord[]> {
    try {
      const stored = await AsyncStorage.getItem(JOINED_EVENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[EventJoin] Error getting joined events:', error);
      return [];
    }
  }

  /**
   * Get currently active joined events (for workout tagging)
   * Returns events where current time is between start and end
   */
  async getActiveJoinedEvents(): Promise<JoinedEventRecord[]> {
    try {
      const joinedEvents = await this.getJoinedEvents();
      const now = Math.floor(Date.now() / 1000); // Unix seconds

      const activeEvents = joinedEvents.filter(
        (e) => now >= e.startTime && now <= e.endTime
      );

      if (activeEvents.length > 0) {
        console.log(
          `[EventJoin] 📋 Active joined events: ${activeEvents.length}`,
          activeEvents.map((e) => e.title)
        );
      }

      return activeEvents;
    } catch (error) {
      console.error('[EventJoin] Error getting active joined events:', error);
      return [];
    }
  }

  /**
   * Get active event IDs for workout tagging
   * Returns array of event IDs to add as #e tags to published workouts
   */
  async getActiveEventIds(): Promise<string[]> {
    const activeEvents = await this.getActiveJoinedEvents();
    return activeEvents.map((e) => e.eventId);
  }

  /**
   * Remove a joined event (when user leaves/unjoins)
   */
  async removeJoinedEvent(eventId: string, eventPubkey: string): Promise<void> {
    try {
      const joinedEvents = await this.getJoinedEvents();
      const filtered = joinedEvents.filter(
        (e) => !(e.eventId === eventId && e.eventPubkey === eventPubkey)
      );
      await AsyncStorage.setItem(JOINED_EVENTS_KEY, JSON.stringify(filtered));
      console.log(`[EventJoin] 🗑️ Removed joined event: ${eventId}`);
    } catch (error) {
      console.error('[EventJoin] Error removing joined event:', error);
    }
  }

  /**
   * Clean up expired joined events (ended more than 7 days ago)
   */
  async cleanupExpiredEvents(): Promise<void> {
    try {
      const joinedEvents = await this.getJoinedEvents();
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysAgo = now - 7 * 24 * 60 * 60;

      const active = joinedEvents.filter((e) => e.endTime > sevenDaysAgo);
      const removed = joinedEvents.length - active.length;

      if (removed > 0) {
        await AsyncStorage.setItem(JOINED_EVENTS_KEY, JSON.stringify(active));
        console.log(`[EventJoin] 🧹 Cleaned up ${removed} expired joined events`);
      }
    } catch (error) {
      console.error('[EventJoin] Error cleaning up expired events:', error);
    }
  }

  /**
   * DEBUG: Clear all joined events
   */
  async debugClearJoinedEvents(): Promise<void> {
    await AsyncStorage.removeItem(JOINED_EVENTS_KEY);
    console.log('[EventJoin] 💥 DEBUG: Cleared all joined events');
  }
}

export const SatlantisEventJoinService =
  SatlantisEventJoinServiceClass.getInstance();
export default SatlantisEventJoinService;
