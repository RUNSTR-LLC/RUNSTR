/**
 * ReviewConfirmStep - Fourth step of challenge creation wizard
 * Shows a summary of the challenge details for final confirmation
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../../styles/theme';
import { ChallengeCreationData, TeammateInfo } from '../../../types';

interface ReviewConfirmStepProps {
  challengeData: ChallengeCreationData;
  currentUserName?: string;
}

interface ReviewItemProps {
  label: string;
  children: React.ReactNode;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ label, children }) => (
  <View style={styles.reviewItem}>
    <Text style={styles.reviewLabel}>{label}</Text>
    {children}
  </View>
);

interface ParticipantsReviewProps {
  currentUserName: string;
  opponentInfo?: TeammateInfo;
}

const ParticipantsReview: React.FC<ParticipantsReviewProps> = ({
  currentUserName,
  opponentInfo,
}) => (
  <View style={styles.reviewParticipants}>
    <View style={styles.reviewAvatar}>
      <Text style={styles.reviewAvatarText}>
        {currentUserName.charAt(0).toUpperCase()}
      </Text>
    </View>
    <Text style={styles.reviewVs}>VS</Text>
    <View style={styles.reviewAvatar}>
      <Text style={styles.reviewAvatarText}>{opponentInfo?.avatar || '?'}</Text>
    </View>
  </View>
);

export const ReviewConfirmStep: React.FC<ReviewConfirmStepProps> = ({
  challengeData,
  currentUserName = 'Alex', // Default from mockup
}) => {
  const formatSats = (amount: number) => {
    return `${amount.toLocaleString()} sats`;
  };

  const formatExpirationDate = () => {
    if (!challengeData.expiresAt) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + challengeData.duration);
      return expirationDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }

    return new Date(challengeData.expiresAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getParticipantsSummary = () => {
    if (challengeData.opponentInfo) {
      return `${currentUserName} vs ${challengeData.opponentInfo.name}`;
    }
    return `${currentUserName} vs ...`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.reviewSection}
        showsVerticalScrollIndicator={false}
      >
        {/* Participants */}
        <ReviewItem label="PARTICIPANTS">
          <ParticipantsReview
            currentUserName={currentUserName}
            opponentInfo={challengeData.opponentInfo}
          />
          <Text style={styles.reviewChallengeDetails}>
            {getParticipantsSummary()}
          </Text>
        </ReviewItem>

        {/* Challenge Type */}
        <ReviewItem label="CHALLENGE TYPE">
          <Text style={styles.reviewValue}>
            {challengeData.challengeType?.name || '...'}
          </Text>
          <Text style={styles.reviewChallengeDetails}>
            {challengeData.challengeType?.description || '...'}
          </Text>
        </ReviewItem>

        {/* Prize Amount */}
        <ReviewItem label="PRIZE AMOUNT">
          <Text style={styles.reviewValue}>
            {formatSats(challengeData.wagerAmount)}
          </Text>
          <Text style={styles.reviewChallengeDetails}>Winner takes all</Text>
        </ReviewItem>

        {/* Duration */}
        <ReviewItem label="DURATION">
          <Text style={styles.reviewValue}>{challengeData.duration} days</Text>
          <Text style={styles.reviewChallengeDetails}>
            Expires {formatExpirationDate()} at 11:59 PM
          </Text>
        </ReviewItem>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  reviewSection: {
    flex: 1,
  },
  reviewItem: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reviewChallengeDetails: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  reviewParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reviewVs: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
});
