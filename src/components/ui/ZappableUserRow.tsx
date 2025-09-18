/**
 * ZappableUserRow Component
 * Reusable component for displaying users with profile resolution and P2P zapping
 * Used across league rankings, team member lists, and competition displays
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Avatar } from './Avatar';
import { ZapModal } from './ZapModal';
import { useNostrProfile } from '../../hooks/useCachedData';

interface ZappableUserRowProps {
  npub: string;
  fallbackName?: string;
  additionalContent?: React.ReactNode;
  showQuickZap?: boolean;
  zapAmount?: number;
  onZapSuccess?: () => void;
  style?: any;
  disabled?: boolean;
}

export const ZappableUserRow: React.FC<ZappableUserRowProps> = ({
  npub,
  fallbackName,
  additionalContent,
  showQuickZap = true,
  zapAmount = 21,
  onZapSuccess,
  style,
  disabled = false,
}) => {
  const [zapModalVisible, setZapModalVisible] = useState(false);
  const { profile, loading } = useNostrProfile(npub);

  // Resolve display name with fallback chain
  const displayName = profile?.name ||
                     profile?.display_name ||
                     fallbackName ||
                     `${npub.slice(0, 8)}...`;

  const avatarUrl = profile?.picture;

  const handleZapPress = () => {
    if (!disabled) {
      setZapModalVisible(true);
    }
  };

  const handleZapModalClose = () => {
    setZapModalVisible(false);
  };

  const handleZapSuccess = () => {
    setZapModalVisible(false);
    onZapSuccess?.();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.userSection}>
        {/* Avatar with profile picture or fallback */}
        <Avatar
          name={displayName}
          size={36}
          imageUrl={avatarUrl}
          style={styles.avatar}
        />

        {/* User name and any additional content */}
        <View style={styles.contentSection}>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          {additionalContent && (
            <View style={styles.additionalContent}>
              {additionalContent}
            </View>
          )}
        </View>
      </View>

      {/* Zap button with lightning icon */}
      {showQuickZap && (
        <TouchableOpacity
          style={[styles.zapButton, disabled && styles.zapButtonDisabled]}
          onPress={handleZapPress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons
              name="flash"
              size={20}
              color={disabled ? theme.colors.textSecondary : theme.colors.primary}
            />
          )}
        </TouchableOpacity>
      )}

      {/* Zap Modal */}
      <ZapModal
        visible={zapModalVisible}
        onClose={handleZapModalClose}
        recipientNpub={npub}
        recipientName={displayName}
        suggestedAmount={zapAmount}
        onZapSuccess={handleZapSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 52,
  },

  userSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    marginRight: 12,
  },

  contentSection: {
    flex: 1,
    justifyContent: 'center',
  },

  userName: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  additionalContent: {
    marginTop: 2,
  },

  zapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  zapButtonDisabled: {
    opacity: 0.5,
  },
});