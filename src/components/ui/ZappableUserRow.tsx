/**
 * ZappableUserRow Component
 * Reusable component for displaying users with profile resolution and P2P zapping
 * Used across league rankings, team member lists, and competition displays
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from './Avatar';
import { NutzapLightningButton } from '../nutzap/NutzapLightningButton';
import { ChallengeIconButton } from './ChallengeIconButton';
import { QuickChallengeWizard } from '../wizards/QuickChallengeWizard';
import { useNostrProfile } from '../../hooks/useCachedData';

interface ZappableUserRowProps {
  npub: string;
  fallbackName?: string;
  additionalContent?: React.ReactNode;
  showQuickZap?: boolean;
  showChallengeButton?: boolean;
  zapAmount?: number;
  onZapSuccess?: () => void;
  style?: any;
  disabled?: boolean;
  hideActionsForCurrentUser?: boolean; // Hide challenge/zap for current user
}

export const ZappableUserRow: React.FC<ZappableUserRowProps> = ({
  npub,
  fallbackName,
  additionalContent,
  showQuickZap = true,
  showChallengeButton = true,
  zapAmount = 21,
  onZapSuccess,
  style,
  disabled = false,
  hideActionsForCurrentUser = false,
}) => {
  const { profile } = useNostrProfile(npub);
  const [challengeWizardVisible, setChallengeWizardVisible] = useState(false);

  // Resolve display name with fallback chain
  const displayName = profile?.name ||
                     profile?.display_name ||
                     fallbackName ||
                     `${npub.slice(0, 8)}...`;

  const avatarUrl = profile?.picture;

  const handleChallengePress = () => {
    setChallengeWizardVisible(true);
  };

  return (
    <>
      <View style={[styles.container, style]}>
        <View style={styles.userSection}>
          {/* Avatar with profile picture or fallback */}
          <Avatar
            name={displayName}
            size={36}
            imageUrl={avatarUrl}
            style={styles.avatar}
          />

          {/* User name with action buttons */}
          <View style={styles.contentSection}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>

              {/* Challenge & Zap buttons next to name */}
              {!hideActionsForCurrentUser && (
                <View style={styles.actionButtons}>
                  {showChallengeButton && (
                    <ChallengeIconButton
                      userPubkey={npub}
                      userName={displayName}
                      disabled={disabled}
                      onPress={handleChallengePress}
                    />
                  )}
                  {showQuickZap && (
                    <NutzapLightningButton
                      recipientNpub={npub}
                      recipientName={displayName}
                      size="small"
                      disabled={disabled}
                      onZapSuccess={onZapSuccess}
                      style={styles.zapButton}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Additional content (stats, etc) on the right */}
        {additionalContent && (
          <View style={styles.additionalContent}>
            {additionalContent}
          </View>
        )}
      </View>

      {/* Challenge Wizard Modal */}
      <Modal
        visible={challengeWizardVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <QuickChallengeWizard
          opponent={{
            pubkey: npub,
            name: displayName,
            picture: avatarUrl,
          }}
          onComplete={() => setChallengeWizardVisible(false)}
          onCancel={() => setChallengeWizardVisible(false)}
        />
      </Modal>
    </>
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
    marginRight: 8,
  },

  contentSection: {
    flex: 1,
    justifyContent: 'center',
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  userName: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  additionalContent: {
    marginTop: 2,
    flex: 0,
    minWidth: 90,
    paddingRight: 12,
  },

  zapButton: {
    // Gap handled by actionButtons
  },
});