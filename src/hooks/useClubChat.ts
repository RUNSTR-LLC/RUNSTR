/**
 * useClubChat - React hook for club chat messaging
 *
 * Wraps ClubChatService with React state management, optimistic updates,
 * Supabase Realtime subscription, pagination, and rate limit tracking.
 *
 * Usage:
 *   const { messages, sendMessage, loadMore, ... } = useClubChat(clubId, npub);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ClubChatService } from '../services/backend/ClubChatService';
import type { SendMessageOptions } from '../services/backend/ClubChatService';
import type { ClubMessage } from '../types/club';

const PAGE_SIZE = 20;
const RATE_CHECK_INTERVAL = 5_000; // 5 seconds

interface UseClubChatReturn {
  messages: ClubMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  canSend: boolean;
  hasMore: boolean;
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<boolean>;
  loadMore: () => Promise<void>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useClubChat(
  clubId: string | null,
  senderNpub: string | null
): UseClubChatReturn {
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSend, setCanSend] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const isMounted = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ------------------------------------------------------------------
  // Initial load: cache -> show -> fetch fresh -> update
  // ------------------------------------------------------------------
  useEffect(() => {
    isMounted.current = true;

    if (!clubId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Show cached messages immediately
        const cached = await ClubChatService.getCachedMessages(clubId);
        if (cached.length > 0 && isMounted.current) {
          setMessages(cached);
        }

        // Step 2: Clear cache so getMessages hits Supabase for fresh data
        await ClubChatService.clearCache(clubId);
        const fresh = await ClubChatService.getMessages(clubId, PAGE_SIZE);
        if (isMounted.current) {
          setMessages(fresh);
          setHasMore(fresh.length >= PAGE_SIZE);
        }
      } catch (err) {
        console.error('[useClubChat] Initial load error:', err);
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Failed to load messages');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted.current = false;
    };
  }, [clubId]);

  // ------------------------------------------------------------------
  // Realtime subscription
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!clubId) return;

    // Subscribe to new messages and updates (reactions)
    const unsub = ClubChatService.subscribeToMessages(
      clubId,
      (newMessage) => {
        if (!isMounted.current) return;

        setMessages((prev) => {
          // Dedup: the optimistic insert may already have this message
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          // Prepend (newest first)
          return [newMessage, ...prev];
        });
      },
      (updatedMessage) => {
        if (!isMounted.current) return;

        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
        );
      }
    );

    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [clubId]);

  // ------------------------------------------------------------------
  // Rate limit check interval
  // ------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted.current) {
        setCanSend(ClubChatService.canSendMessage());
      }
    }, RATE_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // ------------------------------------------------------------------
  // Send message (optimistic)
  // ------------------------------------------------------------------
  const sendMessage = useCallback(
    async (content: string, options?: SendMessageOptions): Promise<boolean> => {
      if (!clubId || !senderNpub) return false;

      const trimmed = content.trim();
      if (trimmed.length === 0 || trimmed.length > 1000) return false;

      if (options?.messageType !== 'workout' && !ClubChatService.canSendMessage()) {
        setCanSend(false);
        return false;
      }

      setIsSending(true);
      setError(null);

      // Optimistic insert with a temporary ID
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: ClubMessage = {
        id: optimisticId,
        club_id: clubId,
        sender_npub: senderNpub,
        content: trimmed,
        created_at: new Date().toISOString(),
        deleted_at: null,
        reply_to_id: options?.replyToId ?? null,
        message_type: options?.messageType ?? 'message',
        metadata: options?.metadata ?? null,
        reactions: {},
      };

      setMessages((prev) => [optimisticMessage, ...prev]);

      try {
        const sent = await ClubChatService.sendMessage(clubId, senderNpub, trimmed, options);

        if (sent && isMounted.current) {
          // Replace optimistic message with real one from Supabase
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticId ? sent : m))
          );
          setCanSend(ClubChatService.canSendMessage());
          return true;
        }

        // Send failed -- remove optimistic message
        if (isMounted.current) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          setError('Failed to send message');
        }
        return false;
      } catch (err) {
        console.error('[useClubChat] sendMessage error:', err);
        if (isMounted.current) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          setError(err instanceof Error ? err.message : 'Send failed');
        }
        return false;
      } finally {
        if (isMounted.current) {
          setIsSending(false);
        }
      }
    },
    [clubId, senderNpub]
  );

  // ------------------------------------------------------------------
  // Load more (pagination)
  // ------------------------------------------------------------------
  const loadMore = useCallback(async () => {
    if (!clubId || !hasMore || isLoading) return;

    // Find oldest message timestamp for cursor
    const oldest = messages[messages.length - 1];
    if (!oldest) return;

    try {
      const older = await ClubChatService.getMessages(
        clubId,
        PAGE_SIZE,
        oldest.created_at
      );

      if (isMounted.current) {
        if (older.length < PAGE_SIZE) {
          setHasMore(false);
        }

        // Append older messages, dedup by ID
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newOnes = older.filter((m) => !existingIds.has(m.id));
          return [...prev, ...newOnes];
        });
      }
    } catch (err) {
      console.error('[useClubChat] loadMore error:', err);
    }
  }, [clubId, hasMore, isLoading, messages]);

  // ------------------------------------------------------------------
  // Delete message (optimistic)
  // ------------------------------------------------------------------
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!senderNpub) return false;

      // Optimistic remove
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      const success = await ClubChatService.deleteMessage(messageId, senderNpub);

      if (!success && isMounted.current) {
        // Revert: re-fetch to restore state
        if (clubId) {
          const fresh = await ClubChatService.getMessages(clubId, PAGE_SIZE);
          setMessages(fresh);
        }
      }

      return success;
    },
    [clubId, senderNpub]
  );

  // ------------------------------------------------------------------
  // Toggle reaction (optimistic)
  // ------------------------------------------------------------------
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string): Promise<void> => {
      if (!senderNpub) return;

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...m.reactions };
          const users = [...(reactions[emoji] || [])];
          const index = users.indexOf(senderNpub);
          if (index === -1) {
            users.push(senderNpub);
          } else {
            users.splice(index, 1);
          }
          if (users.length > 0) {
            reactions[emoji] = users;
          } else {
            delete reactions[emoji];
          }
          return { ...m, reactions };
        })
      );

      const updated = await ClubChatService.toggleReaction(messageId, senderNpub, emoji);

      if (!updated && isMounted.current) {
        // Revert: re-fetch to restore state
        if (clubId) {
          const fresh = await ClubChatService.getMessages(clubId, PAGE_SIZE);
          setMessages(fresh);
        }
      }
    },
    [clubId, senderNpub]
  );

  // ------------------------------------------------------------------
  // Refresh (full reload)
  // ------------------------------------------------------------------
  const refresh = useCallback(async () => {
    if (!clubId) return;

    setIsLoading(true);
    setError(null);

    try {
      await ClubChatService.clearCache(clubId);
      const fresh = await ClubChatService.getMessages(clubId, PAGE_SIZE);
      if (isMounted.current) {
        setMessages(fresh);
        setHasMore(fresh.length >= PAGE_SIZE);
      }
    } catch (err) {
      console.error('[useClubChat] refresh error:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Refresh failed');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [clubId]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    canSend,
    hasMore,
    sendMessage,
    loadMore,
    deleteMessage,
    toggleReaction,
    refresh,
  };
}

export default useClubChat;
