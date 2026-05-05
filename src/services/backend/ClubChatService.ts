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
import { callEdgeFunction } from '../../utils/edgeFunctions';
import type { ClubMessage, ClubMessageType, WorkoutMessageMetadata } from '../../types/club';


// Cache configuration
const CACHE_KEY_PREFIX = '@runstr:club_chat:';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHED_MESSAGES = 50;

// Per-club last-seen timestamp for unread-badge accounting
const LAST_SEEN_KEY_PREFIX = '@runstr:club_chat_last_seen:';

// Rate limiting: 5 messages per 60 seconds
const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds
const RATE_LIMIT_MAX = 5;
const sentTimestamps: number[] = [];

// Content limits
const MIN_CONTENT_LENGTH = 1;
const MAX_CONTENT_LENGTH = 1000;

// Send timeout
const SEND_TIMEOUT_MS = 10_000;

export interface SendMessageOptions {
  replyToId?: string;
  messageType?: ClubMessageType;
  metadata?: WorkoutMessageMetadata;
}

interface CachedChat {
  messages: ClubMessage[];
  timestamp: number;
}

// Monotonic counter for unique channel names per subscriber
let channelCounter = 0;

export class ClubChatService {

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
   * Send a message to a club chat via Edge Function.
   * Client-side rate limit kept as UX guard; server enforces the real limit.
   */
  static async sendMessage(
    clubId: string,
    senderNpub: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<ClubMessage | null> {
    // Validate content (client-side for instant feedback)
    const trimmed = content.trim();
    if (trimmed.length < MIN_CONTENT_LENGTH) {
      console.warn('[ClubChatService] Message too short');
      return null;
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      console.warn('[ClubChatService] Message exceeds 1000 characters');
      return null;
    }

    // Client-side rate limit (UX guard) — skip for workout messages
    if (options?.messageType !== 'workout' && !ClubChatService.canSendMessage()) {
      console.warn(
        `[ClubChatService] Rate limited. Reset in ${ClubChatService.getRateLimitResetSeconds()}s`
      );
      return null;
    }

    const body: Record<string, unknown> = {
      action: 'send',
      club_id: clubId,
      sender_npub: senderNpub,
      content: trimmed,
    };
    if (options?.replyToId) body.reply_to_id = options.replyToId;
    if (options?.messageType) body.message_type = options.messageType;
    if (options?.metadata) body.metadata = options.metadata;

    const result = await callEdgeFunction<{ message?: ClubMessage }>(
      'manage-club-chat',
      body,
      SEND_TIMEOUT_MS,
    );

    if (!result.success || !result.data) {
      console.error('[ClubChatService] sendMessage error:', result.error);
      return null;
    }

    const message = (result.data as any).message ?? result.data as unknown as ClubMessage;
    console.log(`[ClubChatService] Message sent: ${message.id}`);

    // Record timestamp for rate limiting (skip for workout)
    if (options?.messageType !== 'workout') {
      sentTimestamps.push(Date.now());
    }

    // Append to cache
    await ClubChatService.appendToCache(clubId, message);

    return message;
  }

  /**
   * Soft-delete a message via Edge Function.
   * Server verifies caller is sender or captain.
   */
  static async deleteMessage(messageId: string, callerNpub: string): Promise<boolean> {
    const result = await callEdgeFunction('manage-club-chat', {
      action: 'delete',
      message_id: messageId,
      caller_npub: callerNpub,
    });

    if (!result.success) {
      console.error('[ClubChatService] deleteMessage error:', result.error);
      return false;
    }

    console.log(`[ClubChatService] Message soft-deleted: ${messageId}`);
    return true;
  }

  /**
   * Toggle an emoji reaction on a message via Edge Function.
   */
  static async toggleReaction(
    messageId: string,
    callerNpub: string,
    emoji: string
  ): Promise<ClubMessage | null> {
    const result = await callEdgeFunction<ClubMessage>('manage-club-chat', {
      action: 'react',
      message_id: messageId,
      caller_npub: callerNpub,
      emoji,
    });

    if (!result.success || !result.data) {
      console.error('[ClubChatService] toggleReaction error:', result.error);
      return null;
    }

    const updated = (result.data as any).message ?? result.data as unknown as ClubMessage;
    console.log(`[ClubChatService] Reaction toggled: ${emoji} on ${messageId}`);
    return updated;
  }

  /**
   * Pin a message in a club (captain only).
   */
  static async pinMessage(clubId: string, messageId: string, callerNpub: string): Promise<boolean> {
    const result = await callEdgeFunction('manage-club-chat', {
      action: 'pin',
      club_id: clubId,
      message_id: messageId,
      caller_npub: callerNpub,
    });

    if (!result.success) {
      console.error('[ClubChatService] pinMessage error:', result.error);
      return false;
    }

    console.log(`[ClubChatService] Message pinned: ${messageId}`);
    return true;
  }

  /**
   * Unpin the pinned message in a club (captain only).
   */
  static async unpinMessage(clubId: string, callerNpub: string): Promise<boolean> {
    const result = await callEdgeFunction('manage-club-chat', {
      action: 'unpin',
      club_id: clubId,
      caller_npub: callerNpub,
    });

    if (!result.success) {
      console.error('[ClubChatService] unpinMessage error:', result.error);
      return false;
    }

    console.log(`[ClubChatService] Message unpinned in club ${clubId}`);
    return true;
  }

  /**
   * Subscribe to new messages for a club via Supabase Realtime.
   * Each call creates an independent channel so multiple components
   * (e.g. embedded chat + full-screen chat) can coexist without
   * one unmount destroying the other's subscription.
   * Returns an unsubscribe function that only removes THIS channel.
   */
  static subscribeToMessages(
    clubId: string,
    onNewMessage: (message: ClubMessage) => void,
    onMessageUpdated?: (message: ClubMessage) => void
  ): () => void {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubChatService] Supabase not configured');
      return () => {};
    }

    const channelId = ++channelCounter;
    const channelName = `club_chat:${clubId}:${channelId}`;
    console.log(`[ClubChatService] Subscribing to ${channelName}`);

    const channel = supabase!
      .channel(channelName)
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
          if (newMessage.deleted_at) return;

          console.log(`[ClubChatService] Realtime message received (${channelName}): ${newMessage.id}`);
          ClubChatService.appendToCache(clubId, newMessage).catch(() => {});
          onNewMessage(newMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'club_messages',
          filter: `club_id=eq.${clubId}`,
        },
        (payload) => {
          if (!onMessageUpdated) return;
          const updatedMessage = payload.new as ClubMessage;
          if (updatedMessage.deleted_at) return;

          console.log(`[ClubChatService] Realtime message updated (${channelName}): ${updatedMessage.id}`);
          onMessageUpdated(updatedMessage);
        }
      )
      .subscribe((status) => {
        console.log(`[ClubChatService] Realtime ${channelName} status: ${status}`);
      });

    return () => {
      console.log(`[ClubChatService] Unsubscribing from ${channelName}`);
      supabase?.removeChannel(channel);
    };
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
   * Get the count of cached chat messages newer than the user's last
   * `markChatAsSeen` for this club. Reads from cache (no network).
   * Capped at 99 so the badge can render a 2-digit max.
   */
  static async getUnreadCount(clubId: string): Promise<number> {
    if (!clubId) return 0;
    try {
      const lastSeenStr = await AsyncStorage.getItem(`${LAST_SEEN_KEY_PREFIX}${clubId}`);
      const lastSeenMs = lastSeenStr ? Number(lastSeenStr) : 0;
      const cached = await ClubChatService.getCachedMessages(clubId);
      let count = 0;
      for (const msg of cached) {
        const createdMs = new Date(msg.created_at).getTime();
        if (createdMs > lastSeenMs) {
          count += 1;
          if (count >= 99) return 99;
        }
      }
      return count;
    } catch (err) {
      console.warn('[ClubChatService] getUnreadCount failed:', err);
      return 0;
    }
  }

  /**
   * Record the current timestamp as the user's last-seen point for this
   * club's chat. Subsequent `getUnreadCount` calls return 0 until new
   * messages arrive.
   */
  static async markChatAsSeen(clubId: string): Promise<void> {
    if (!clubId) return;
    try {
      await AsyncStorage.setItem(
        `${LAST_SEEN_KEY_PREFIX}${clubId}`,
        String(Date.now()),
      );
    } catch (err) {
      console.warn('[ClubChatService] markChatAsSeen failed:', err);
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
