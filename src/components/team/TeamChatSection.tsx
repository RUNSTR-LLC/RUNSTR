/**
 * TeamChatSection Component - Main team chat interface
 * Handles message display, real-time subscriptions, and access control
 * React 18 strict mode safe with proper subscription cleanup
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import { theme } from '../../styles/theme';
import { chatService } from '../../services/chat/ChatService';
import { TeamMemberCache } from '../../services/team/TeamMemberCache';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface TeamChatSectionProps {
  teamId: string;
  teamName: string;
  userPubkey: string;
  captainPubkey: string;
  isCaptain: boolean;
}

export const TeamChatSection: React.FC<TeamChatSectionProps> = ({
  teamId,
  teamName,
  userPubkey,
  captainPubkey,
  isCaptain
}) => {
  const flatListRef = useRef<FlatList>(null);
  const subscriptionRef = useRef<NDKSubscription | null>(null);

  const [messages, setMessages] = useState<NDKEvent[]>([]);
  const [messageIds, setMessageIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [autoCreating, setAutoCreating] = useState(false);

  // Check access control on mount
  useEffect(() => {
    checkAccess();
  }, [teamId, userPubkey]);

  const checkAccess = async () => {
    try {
      const teamMemberCache = TeamMemberCache.getInstance();
      const members = await teamMemberCache.getTeamMembers(teamId, captainPubkey);
      const isMember = members.includes(userPubkey) || isCaptain;

      setHasAccess(isMember);
      setMemberCount(members.length);
    } catch (error) {
      console.error('Failed to check access:', error);
      setHasAccess(false);
    }
  };

  // Load channel on mount
  useEffect(() => {
    loadChannel();
  }, [teamId, captainPubkey]);

  const loadChannel = async () => {
    try {
      const channel = await chatService.getTeamChannel(teamId, captainPubkey);

      if (channel) {
        setChannelId(channel.id!);
      } else if (isCaptain) {
        // Auto-create chat for captain if it doesn't exist (handles existing teams)
        console.log('No chat found, auto-creating for captain...');
        setAutoCreating(true);

        try {
          const newChannel = await chatService.createTeamChannel(
            teamId,
            teamName,
            captainPubkey
          );
          setChannelId(newChannel.id!);
          console.log('Chat auto-created successfully');
        } catch (createError) {
          console.error('Failed to auto-create chat:', createError);
          // Channel stays null, will show error state
        } finally {
          setAutoCreating(false);
        }
      }
    } catch (error) {
      console.error('Failed to load channel:', error);
    }
  };

  // Load messages and subscribe (React 18 strict mode safe)
  useEffect(() => {
    let cancelled = false;

    const initializeChat = async () => {
      if (!channelId || !hasAccess) return;

      setLoading(true);

      try {
        // Fetch initial messages
        const initialMessages = await chatService.fetchMessages(channelId, 50);

        if (cancelled) return;

        setMessages(initialMessages);
        setMessageIds(new Set(initialMessages.map(m => m.id!)));

        // Subscribe to real-time updates
        subscriptionRef.current = chatService.subscribeToChannel(
          channelId,
          (event: NDKEvent) => {
            if (cancelled) return;

            // Efficient deduplication with Set
            setMessageIds(prev => {
              if (prev.has(event.id!)) return prev;

              const newSet = new Set(prev);
              newSet.add(event.id!);
              return newSet;
            });

            setMessages(prev => {
              if (prev.some(m => m.id === event.id)) return prev;
              return [...prev, event].sort((a, b) => a.created_at! - b.created_at!);
            });

            // Auto-scroll to bottom for new messages
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          },
          () => {
            if (!cancelled) {
              setLoading(false);
            }
          }
        );
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeChat();

    // Cleanup on unmount (React 18 safe)
    return () => {
      cancelled = true;
      if (subscriptionRef.current && channelId) {
        chatService.unsubscribe(channelId);
        subscriptionRef.current = null;
      }
    };
  }, [channelId, hasAccess]);

  // Handle send message
  const handleSend = async (content: string) => {
    if (!channelId || !content.trim()) return;

    setSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      kind: 42,
      content,
      pubkey: userPubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['e', channelId, '', 'root']]
    } as NDKEvent;

    setMessages(prev => [...prev, tempMessage]);
    setMessageIds(prev => new Set(prev).add(tempId));

    try {
      const event = await chatService.sendMessage(channelId, content, teamId);

      // Replace temp with real event
      setMessages(prev =>
        prev.map(msg => msg.id === tempId ? event : msg)
      );

      setMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        newSet.add(event.id!);
        return newSet;
      });

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);

      // Rollback optimistic update
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });

      Alert.alert('Send Failed', 'Message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Load older messages (pagination)
  const loadOlderMessages = async () => {
    if (loadingOlder || messages.length === 0 || !channelId) return;

    setLoadingOlder(true);

    try {
      const oldestTimestamp = messages[0].created_at!;
      const olderMessages = await chatService.fetchMessages(
        channelId,
        50,
        oldestTimestamp
      );

      // Filter out duplicates
      const newMessages = olderMessages.filter(
        msg => !messageIds.has(msg.id!)
      );

      if (newMessages.length > 0) {
        setMessages(prev => [...newMessages, ...prev]);
        setMessageIds(prev => {
          const newSet = new Set(prev);
          newMessages.forEach(msg => newSet.add(msg.id!));
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Handle zap action
  const handleZap = (pubkey: string) => {
    // TODO: Integrate with existing zap functionality
    console.log('Zap user:', pubkey);
  };

  // Handle challenge action
  const handleChallenge = (pubkey: string) => {
    // TODO: Integrate with existing challenge functionality
    console.log('Challenge user:', pubkey);
  };

  // Render message
  const renderMessage = ({ item }: { item: NDKEvent }) => {
    const isOwnMessage = item.pubkey === userPubkey;

    return (
      <ChatMessage
        event={item}
        isOwnMessage={isOwnMessage}
        onZap={handleZap}
        onChallenge={handleChallenge}
      />
    );
  };

  // Auto-creating chat (captain only)
  if (autoCreating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.orangeDeep} />
        <Text style={styles.loadingText}>Setting up team chat...</Text>
      </View>
    );
  }

  // No channel - show message for members (captain auto-creates, so this means it failed)
  if (!channelId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {isCaptain ? 'Chat Unavailable' : 'No Team Chat'}
        </Text>
        <Text style={styles.emptySubtext}>
          {isCaptain
            ? 'Unable to create team chat. Please try again later.'
            : 'Team chat has not been set up yet'}
        </Text>
      </View>
    );
  }

  // No access
  if (!hasAccess) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No access</Text>
        <Text style={styles.emptySubtext}>
          You must be a team member to view this chat
        </Text>
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.orangeDeep} />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  // Chat interface
  return (
    <View style={styles.container}>
      <ChatHeader
        teamName={teamName}
        memberCount={memberCount}
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.messageList}
        onEndReached={loadOlderMessages}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          loadingOlder ? (
            <ActivityIndicator size="small" color={theme.colors.orangeDeep} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyMessagesContainer}>
            <Text style={styles.emptyMessagesText}>No messages yet</Text>
            <Text style={styles.emptyMessagesSubtext}>
              Be the first to send a message!
            </Text>
          </View>
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={21}
        initialNumToRender={20}
      />

      <ChatInput onSend={handleSend} loading={sending} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  emptySubtext: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.xl,
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  messageList: {
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    flexGrow: 1,
  },
  emptyMessagesContainer: {
    paddingTop: theme.spacing.xxxl * 2,
    alignItems: 'center',
  },
  emptyMessagesText: {
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  emptyMessagesSubtext: {
    fontSize: theme.typography.eventDetails,
    color: theme.colors.textTertiary,
  },
});
