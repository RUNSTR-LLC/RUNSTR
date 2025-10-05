/**
 * CreateChatButton Component - Captain's button to initialize team chat
 * Shows description, public message warning, and create button
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import { chatService } from '../../services/chat/ChatService';

interface CreateChatButtonProps {
  teamId: string;
  teamName: string;
  captainPubkey: string;
  onCreated: (channelId: string) => void;
}

export const CreateChatButton: React.FC<CreateChatButtonProps> = ({
  teamId,
  teamName,
  captainPubkey,
  onCreated
}) => {
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);

    try {
      const event = await chatService.createTeamChannel(
        teamId,
        teamName,
        captainPubkey
      );

      // Notify parent with NDK-generated channel ID
      onCreated(event.id!);
    } catch (error) {
      console.error('Failed to create chat:', error);
      Alert.alert('Error', 'Failed to create team chat. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Chat</Text>
      <Text style={styles.description}>
        Enable team chat to communicate with your team members in real-time.
      </Text>

      <Text style={styles.warning}>
        ⚠️ Note: Messages will be public on the Nostr network
      </Text>

      <TouchableOpacity
        style={[styles.button, creating && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={creating}
      >
        <Text style={styles.buttonText}>
          {creating ? 'Creating Chat...' : 'Create Team Chat'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xxxl,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.leaderboardTitle,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  description: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
    lineHeight: 20,
  },
  warning: {
    fontSize: theme.typography.eventDetails,
    color: theme.colors.orangeBright,
    textAlign: 'center',
    marginBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xxl,
  },
  button: {
    backgroundColor: theme.colors.orangeDeep,
    paddingHorizontal: theme.spacing.xxxl,
    paddingVertical: theme.spacing.xl,
    borderRadius: theme.borderRadius.medium,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.accentText, // Black text on orange
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
  },
});
