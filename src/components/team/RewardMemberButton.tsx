/**
 * RewardMemberButton - Quick reward button for team members
 * Allows captains to send NutZaps directly from personal wallet
 * Replaces complex team wallet distribution system
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNutzap } from '../../hooks/useNutzap';

interface RewardMemberButtonProps {
  memberPubkey: string;
  memberName: string;
  defaultAmount?: number;
  memo?: string;
  onSuccess?: (amount: number) => void;
  variant?: 'primary' | 'secondary' | 'compact';
}

export const RewardMemberButton: React.FC<RewardMemberButtonProps> = ({
  memberPubkey,
  memberName,
  defaultAmount = 100,
  memo,
  onSuccess,
  variant = 'primary',
}) => {
  const { balance, sendNutzap } = useNutzap();
  const [isSending, setIsSending] = useState(false);

  const handleReward = async () => {
    if (balance < defaultAmount) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${defaultAmount} sats but only have ${balance} sats available.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Send Reward',
      `Send ${defaultAmount} sats to ${memberName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: async () => {
            setIsSending(true);
            try {
              const rewardMemo = memo || `Team reward for ${memberName}`;
              const success = await sendNutzap(memberPubkey, defaultAmount, rewardMemo);

              if (success) {
                Alert.alert(
                  'Reward Sent!',
                  `Successfully sent ${defaultAmount} sats to ${memberName}`,
                  [{ text: 'OK' }]
                );
                onSuccess?.(defaultAmount);
              } else {
                Alert.alert(
                  'Send Failed',
                  'Unable to send reward. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              Alert.alert(
                'Error',
                'An unexpected error occurred. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsSending(false);
            }
          },
        },
      ]
    );
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return [styles.button, styles.secondaryButton];
      case 'compact':
        return [styles.button, styles.compactButton];
      default:
        return [styles.button, styles.primaryButton];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryText;
      case 'compact':
        return styles.compactText;
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), isSending && styles.buttonDisabled]}
      onPress={handleReward}
      disabled={isSending}
    >
      {isSending ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? theme.colors.accent : theme.colors.accentText}
        />
      ) : (
        <>
          <Ionicons
            name="gift"
            size={variant === 'compact' ? 16 : 20}
            color={variant === 'secondary' ? theme.colors.accent : theme.colors.accentText}
          />
          <Text style={getTextStyle()}>
            {variant === 'compact' ? `${defaultAmount}` : `Reward ${defaultAmount} sats`}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: theme.borderRadius.medium,
  },

  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  compactButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  primaryText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  secondaryText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },

  compactText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});