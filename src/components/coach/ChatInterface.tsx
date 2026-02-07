/**
 * ChatInterface
 *
 * Main chat view with message list, input, and quick prompts.
 * Manages conversation state with ChatCoachService.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import {
  ChatCoachService,
  ChatSession,
  ChatMessage,
  ChatFocus,
} from '../../services/ai/ChatCoachService';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { QuickPromptChips } from './QuickPromptChips';

interface ChatInterfaceProps {
  apiKey: string;
  focus?: ChatFocus;
  onCreditWarning?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  apiKey,
  focus,
  onCreditWarning,
}) => {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Initialize service and load/create session
  useEffect(() => {
    const init = async () => {
      ChatCoachService.initialize(apiKey);

      try {
        // Try to get active session
        let activeSession = await ChatCoachService.getActiveSession();

        // Create new session if none exists or focus changed
        if (!activeSession || activeSession.focus !== focus) {
          activeSession = await ChatCoachService.startConversation(focus);
        }

        setSession(activeSession);
      } catch (err) {
        console.error('[ChatInterface] Init error:', err);
        setError('Failed to start conversation');
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [apiKey, focus]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (session?.messages.length && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [session?.messages.length]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!session || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await ChatCoachService.sendMessage(session.id, message);
        setSession(result.session);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);

        // Check for credit-related errors
        if (errorMessage.includes('credit') || errorMessage.includes('402')) {
          onCreditWarning?.();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [session, isLoading, onCreditWarning]
  );

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      handleSendMessage(prompt);
    },
    [handleSendMessage]
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
    []
  );

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.orangeBright} />
        <Text style={styles.loadingText}>Starting conversation...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || 'Unable to start conversation'}
        </Text>
      </View>
    );
  }

  const showQuickPrompts =
    session.messages.length <= 2 && !isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={session.messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>RUNSTR AI is typing...</Text>
            </View>
          ) : null
        }
      />

      {/* Quick Prompts (shown at start of conversation) */}
      {showQuickPrompts && (
        <QuickPromptChips
          focus={focus}
          onSelect={handleQuickPrompt}
          disabled={isLoading}
        />
      )}

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          disabled={!ChatCoachService.isReady()}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    marginTop: theme.spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.body,
    textAlign: 'center',
  },
  messagesContent: {
    padding: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  typingIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  typingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.error,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
  },
  errorBannerText: {
    color: theme.colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  inputContainer: {
    padding: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});

export default ChatInterface;
