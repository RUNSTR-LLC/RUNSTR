/**
 * RewardEarnedModal - Display when user completes workout and reward is queued
 * Uses CustomAlert-style black/orange theme matching app style
 * Shows amount queued with optional breakdown (user/charity/pledge)
 * Indicates rewards are sent daily ~10pm EST via batch payout
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type {
  DonationSplit,
  PledgeInfo,
} from '../../services/rewards/RewardNotificationManager';

interface RewardEarnedModalProps {
  visible: boolean;
  amount: number;
  donationSplit?: DonationSplit;
  pledgeInfo?: PledgeInfo;
  onClose: () => void;
}

export const RewardEarnedModal: React.FC<RewardEarnedModalProps> = ({
  visible,
  amount,
  donationSplit,
  pledgeInfo,
  onClose,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  // Determine if this is a pledge notification
  const isPledgeReward = !!pledgeInfo;

  // Determine if we should show a split breakdown
  const hasCharitySplit = donationSplit && donationSplit.charityAmount > 0;

  // Render the appropriate content
  const renderContent = () => {
    // Pledge/commitment reward notification
    if (isPledgeReward) {
      const progressText = `${pledgeInfo.completedWorkouts}/${pledgeInfo.totalWorkouts}`;
      return (
        <>
          <Text style={styles.title}>
            {pledgeInfo.isComplete ? 'Commitment Complete!' : 'Daily Reward Committed'}
          </Text>
          <Text style={styles.message}>
            {amount} sats sent to {pledgeInfo.recipientName}
          </Text>
          <Text style={styles.eventName}>{pledgeInfo.eventName}</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {pledgeInfo.isComplete
                ? 'All workouts complete!'
                : `Progress: ${progressText} days`}
            </Text>
          </View>
        </>
      );
    }

    // Normal reward with charity split
    if (hasCharitySplit) {
      return (
        <>
          <Text style={styles.title}>Reward Queued</Text>
          <Text style={styles.message}>{amount} sats queued for payout!</Text>
          <View style={styles.splitContainer}>
            <View style={styles.splitRow}>
              <Text style={styles.splitLine}>{'├─'}</Text>
              <Text style={styles.splitText}>
                {donationSplit.userAmount} sats to your wallet
              </Text>
            </View>
            <View style={styles.splitRow}>
              <Text style={styles.splitLine}>{'└─'}</Text>
              <Text style={styles.splitText}>
                {donationSplit.charityAmount} sats to {donationSplit.charityName}
              </Text>
            </View>
          </View>
          <Text style={styles.deliveryInfo}>Rewards sent daily ~10pm EST</Text>
        </>
      );
    }

    // Normal reward without split
    return (
      <>
        <Text style={styles.title}>Reward Queued</Text>
        <Text style={styles.message}>{amount} sats queued for payout!</Text>
        <Text style={styles.deliveryInfo}>Rewards sent daily ~10pm EST</Text>
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.alertBox, { opacity: fadeAnim }]}>
          {/* Lightning bolt icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={isPledgeReward ? 'flag' : 'flash'}
              size={48}
              color={theme.colors.orangeBright}
            />
          </View>

          {/* Dynamic content */}
          {renderContent()}

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.button}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {isPledgeReward && pledgeInfo?.isComplete ? 'Awesome!' : 'Got it'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.orangeDeep,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: theme.colors.orangeDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  // Charity split breakdown
  splitContainer: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  splitLine: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
    marginRight: 6,
  },
  splitText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  // Pledge-specific styles
  eventName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressRow: {
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: theme.colors.orangeBright,
    fontWeight: theme.typography.weights.semiBold,
    textAlign: 'center',
  },
  deliveryInfo: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: theme.colors.orangeDeep,
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
});
