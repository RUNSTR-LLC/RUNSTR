/**
 * ClubChatService - Club chat messaging via Supabase
 *
 * Manages the club_messages table for real-time club chat.
 * Uses Supabase Realtime (postgres_changes) for live message delivery.
 * Follows the static class pattern from UserTeamService.
 *
 * Rate limiting: 5 messages per 60 seconds (client-side).
 * Cache: AsyncStorage with 5-minute TTL, max 50 messages per club.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { ClubMembershipService } from './ClubMembershipService';
import type { ClubMessage } from '../../types/club';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Cache configuration
const CACHE_KEY_PREFIX = '@runstr:club_chat:';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHED_MESSAGES = 50;

// Rate limiting: 5 messages per 60 seconds
const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds
const RATE_LIMIT_MAX = 5;
const sentTimestamps: number[] = [];

// Content limits
const MIN_CONTENT_LENGTH = 1;
const MAX_CONTENT_LENGTH = 1000;

// Send timeout
const SEND_TIMEOUT_MS = 10_000;

interface CachedChat {
  messages: ClubMessage[];
  timestamp: number;
}

export class ClubChatService {
  // Active Realtime subscription
  private static activeChannel: RealtimeChannel | null = null;
  private static activeClubId: string | null = null;

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Fetch messages for a club, paginated and cache-first.
   * Returns newest messages first (descending created_at).
   */
  static async getMessages(
    clubId: string,
    limit: number = 20,
    beforeTimestamp?: string
  ): Promise<ClubMessage[]> {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubChatService] Supabase not configured');
      return [];
    }

    // Cache-first: return cached data if fresh and no pagination cursor
    if (!beforeTimestamp) {
      const cached = await ClubChatService.getCachedMessages(clubId);
      if (cached.length > 0) {
        console.log(`[ClubChatService] Returning ${cached.length} cached messages for ${clubId}`);
        return cached;
      }
    }

    try {
      let query = supabase!
        .from('club_messages')
        .select('*')
        .eq('club_id', clubId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (beforeTimestamp) {
        query = query.lt('created_at', beforeTimestamp);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ClubChatService] getMessages error:', error);
        return [];
      }

      const messages = (data || []) as ClubMessage[];
      console.log(
        `[ClubChatService] Fetched ${messages.length} messages for club ${clubId}`
      );

      // Cache only the first page (no beforeTimestamp)
      if (!beforeTimestamp && messages.length > 0) {
        await ClubChatService.setCachedMessages(clubId, messages);
      }

      return messages;
    } catch (err) {
      console.error('[ClubChatService] getMessages exception:', err);
      return [];
    }
  }

  /**
   * Send a message to a club chat.
   * Validates content, checks rate limit, and inserts into Supabase with a timeout.
   */
  static async sendMessage(
    clubId: string,
    senderNpub: string,
    content: string
  ): Promise<ClubMessage | null> {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubChatService] Supabase not configured');
      return null;
    }

    // Validate content
    const trimmed = content.trim();
    if (trimmed.length < MIN_CONTENT_LENGTH) {
      console.warn('[ClubChatService] Message too short');
      return null;
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      console.warn('[ClubChatService] Message exceeds 1000 characters');
      return null;
    }

    // Rate limit check
    if (!ClubChatService.canSendMessage()) {
      console.warn(
        `[ClubChatService] Rate limited. Reset in ${ClubChatService.getRateLimitResetSeconds()}s`
      );
      return null;
    }

    // Membership check: only club members can send messages
    const isMember = await ClubMembershipService.isMember(clubId, senderNpub);
    if (!isMember) {
      console.warn(`[ClubChatService] ${senderNpub.slice(0, 12)}... is not a member of club ${clubId}`);
      return null;
    }

    try {
      // Insert with timeout
      const insertPromise = supabase!
        .from('club_messages')
        .insert({
          club_id: clubId,
          sender_npub: senderNpub,
          content: trimmed,
        })
        .select()
        .single();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Send timeout')), SEND_TIMEOUT_MS)
      );

      const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

      if (error) {
        console.error('[ClubChatService] sendMessage error:', error);
        return null;
      }

      const message = data as ClubMessage;
      console.log(`[ClubChatService] Message sent: ${message.id}`);

      // Record timestamp for rate limiting
      sentTimestamps.push(Date.now());

      // Append to cache
      await ClubChatService.appendToCache(clubId, message);

      return message;
    } catch (err) {
      console.error('[ClubChatService] sendMessage exception:', err);
      return null;
    }
  }

  /**
   * Soft-delete a message (sender or captain moderation).
   * Sets deleted_at = NOW() rather than removing the row.
   * Only the message sender or the club captain may delete a message.
   */
  static async deleteMessage(messageId: string, callerNpub: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubChatService] Supabase not configured');
      return false;
    }

    try {
      // Fetch the message to verify ownership and get club_id
      const { data: message, error: fetchError } = await supabase!
        .from('club_messages')
        .select('sender_npub, club_id')
        .eq('id', messageId)
        .single();

      if (fetchError || !message) {
        console.error('[ClubChatService] deleteMessage: message not found', fetchError);
        return false;
      }

      const isSender = message.sender_npub === callerNpub;

      // Check if caller is the captain of the club
      let isCaptain = false;
      if (!isSender) {
        const { data: membership } = await supabase!
          .from('club_memberships')
          .select('role')
          .eq('club_id', message.club_id)
          .eq('member_npub', callerNpub)
          .single();

        isCaptain = membership?.role === 'captain';
      }

      if (!isSender && !isCaptain) {
        console.warn(
          `[ClubChatService] deleteMessage unauthorized: ${callerNpub.slice(0, 12)}... is not sender or captain`
        );
        return false;
      }

      const { error } = await supabase!
        .from('club_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) {
        console.error('[ClubChatService] deleteMessage error:', error);
        return false;
      }

      console.log(`[ClubChatService] Message soft-deleted: ${messageId}`);
      return true;
    } catch (err) {
      console.error('[ClubChatService] deleteMessage exception:', err);
      return false;
    }
  }

  /**
   * Subscribe to new messages for a club via Supabase Realtime.
   * Cleans up any existing subscription for a different club.
   * Returns an unsubscribe function.
   */
  static subscribeToMessages(
    clubId: string,
    onNewMessage: (message: ClubMessage) => void
  ): () => void {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubChatService] Supabase not configured');
      return () => {};
    }

    // If already subscribed to a different club, clean up first
    if (ClubChatService.activeClubId && ClubChatService.activeClubId !== clubId) {
      console.log(
        `[ClubChatService] Switching subscription from ${ClubChatService.activeClubId} to ${clubId}`
      );
      ClubChatService.unsubscribe();
    }

    // If already subscribed to this club, don't duplicate
    if (ClubChatService.activeClubId === clubId && ClubChatService.activeChannel) {
      console.log(`[ClubChatService] Already subscribed to ${clubId}`);
      return () => ClubChatService.unsubscribe();
    }

    console.log(`[ClubChatService] Subscribing to club_chat:${clubId}`);

    const channel = supabase!
      .channel(`club_chat:${clubId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'club_messages',
          filter: `club_id=eq.${clubId}`,
        },
        (payload) => {
          const newMessage = payload.new as ClubMessage;

          // Ignore soft-deleted messages
          if (newMessage.deleted_at) return;

          console.log(
            `[ClubChatService] Realtime message received: ${newMessage.id}`
          );

          // Append to cache in background
          ClubChatService.appendToCache(clubId, newMessage).catch(() => {});

          onNewMessage(newMessage);
        }
      )
      .subscribe((status) => {
        console.log(`[ClubChatService] Realtime subscription status: ${status}`);
      });

    ClubChatService.activeChannel = channel;
    ClubChatService.activeClubId = clubId;

    return () => ClubChatService.unsubscribe();
  }

  /**
   * Remove the active Realtime channel subscription.
   */
  static unsubscribe(): void {
    if (ClubChatService.activeChannel) {
      console.log(
        `[ClubChatService] Unsubscribing from club_chat:${ClubChatService.activeClubId}`
      );
      supabase?.removeChannel(ClubChatService.activeChannel);
      ClubChatService.activeChannel = null;
      ClubChatService.activeClubId = null;
    }
  }

  // --------------------------------------------------------------------------
  // Rate Limiting
  // --------------------------------------------------------------------------

  /**
   * Check if the user can send a message (within rate limit).
   */
  static canSendMessage(): boolean {
    ClubChatService.pruneExpiredTimestamps();
    return sentTimestamps.length < RATE_LIMIT_MAX;
  }

  /**
   * Returns seconds until the rate limit window resets (oldest message expires).
   * Returns 0 if not rate limited.
   */
  static getRateLimitResetSeconds(): number {
    ClubChatService.pruneExpiredTimestamps();
    if (sentTimestamps.length < RATE_LIMIT_MAX) return 0;

    const oldest = sentTimestamps[0];
    const expiresAt = oldest + RATE_LIMIT_WINDOW;
    const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
    return Math.max(0, remaining);
  }

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  /**
   * Read cached messages for a club from AsyncStorage.
   * Returns empty array if cache is missing or expired.
   */
  static async getCachedMessages(clubId: string): Promise<ClubMessage[]> {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${clubId}`);
      if (!raw) return [];

      const cached: CachedChat = JSON.parse(raw);
      if (Date.now() - cached.timestamp > CACHE_TTL) {
        return []; // Expired
      }

      return cached.messages;
    } catch {
      return [];
    }
  }

  /**
   * Append a single message to the cache, dedup by ID, cap at MAX_CACHED_MESSAGES.
   */
  static async appendToCache(
    clubId: string,
    message: ClubMessage
  ): Promise<void> {
    try {
      const existing = await ClubChatService.getCachedMessages(clubId);

      // Dedup: skip if message ID already present
      if (existing.some((m) => m.id === message.id)) return;

      // Prepend new message (newest first), cap at limit
      const updated = [message, ...existing].slice(0, MAX_CACHED_MESSAGES);

      const cached: CachedChat = {
        messages: updated,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        `${CACHE_KEY_PREFIX}${clubId}`,
        JSON.stringify(cached)
      );
    } catch {
      // Cache write failed, non-critical
    }
  }

  /**
   * Remove the cache entry for a club.
   */
  static async clearCache(clubId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${clubId}`);
      console.log(`[ClubChatService] Cache cleared for ${clubId}`);
    } catch {
      // Non-critical
    }
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  /**
   * Remove timestamps older than the rate limit window.
   */
  private static pruneExpiredTimestamps(): void {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW;
    while (sentTimestamps.length > 0 && sentTimestamps[0] < cutoff) {
      sentTimestamps.shift();
    }
  }

  /**
   * Write a full set of messages to cache (used after initial fetch).
   */
  private static async setCachedMessages(
    clubId: string,
    messages: ClubMessage[]
  ): Promise<void> {
    try {
      const cached: CachedChat = {
        messages: messages.slice(0, MAX_CACHED_MESSAGES),
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        `${CACHE_KEY_PREFIX}${clubId}`,
        JSON.stringify(cached)
      );
    } catch {
      // Cache write failed, non-critical
    }
  }
}

export default ClubChatService;
