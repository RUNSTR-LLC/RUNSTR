/**
 * ChatHeader Component - Chat channel metadata and public message warning
 * Displays team name, member count, and dismissible privacy disclaimer
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from '../../styles/theme';

interface ChatHeaderProps {
  teamName: string;
  memberCount: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  teamName,
  memberCount
}) => {
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.teamName}>{teamName} Chat</Text>
        <Text style={styles.memberCount}>
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </Text>
      </View>

      {showDisclaimer && (
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️ Messages are public on the Nostr network
          </Text>
          <TouchableOpacity
            style={styles.disclaimerClose}
            onPress={() => setShowDisclaimer(false)}
          >
            <Text style={styles.disclaimerCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  info: {
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
  },
  teamName: {
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  memberCount: {
    fontSize: theme.typography.eventDetails,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  disclaimer: {
    backgroundColor: '#2a1a00', // Dark brown background for warning
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#3a2a10',
  },
  disclaimerText: {
    flex: 1,
    fontSize: theme.typography.eventDetails,
    color: theme.colors.orangeBright,
  },
  disclaimerClose: {
    paddingHorizontal: theme.spacing.lg,
  },
  disclaimerCloseText: {
    fontSize: 20,
    color: theme.colors.orangeBright,
    fontWeight: theme.typography.weights.bold,
  },
});
