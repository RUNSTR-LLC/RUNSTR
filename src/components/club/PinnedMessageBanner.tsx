/**
 * PinnedMessageBanner - Shows the pinned message at the top of club chat
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface PinnedMessageBannerProps {
  content: string;
  senderName: string;
  onUnpin?: () => void;
  onPress?: () => void;
}

const PinnedMessageBannerComponent: React.FC<PinnedMessageBannerProps> = ({
  content,
  senderName,
  onUnpin,
  onPress,
}) => {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Ionicons name="pin" size={14} color={theme.colors.accent} style={styles.icon} />
      <View style={styles.content}>
        <Text style={styles.senderName} numberOfLines={1}>{senderName}</Text>
        <Text style={styles.messageText} numberOfLines={1}>{content}</Text>
      </View>
      {onUnpin && (
        <TouchableOpacity onPress={onUnpin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  icon: {
    marginRight: 8,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  senderName: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
    marginBottom: 1,
  },
  messageText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});

export const PinnedMessageBanner = React.memo(PinnedMessageBannerComponent);
export default PinnedMessageBanner;
