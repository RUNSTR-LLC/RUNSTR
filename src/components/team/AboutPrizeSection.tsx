import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../ui/Button';
import { CaptainDashboardButton } from './CaptainDashboardButton';
import { theme } from '../../styles/theme';

interface AboutPrizeSectionProps {
  description: string;
  prizePool: number;
  onCaptainDashboard: () => void;
  onJoinTeam?: () => void;
  isCaptain: boolean;
  isMember: boolean;
  captainLoading?: boolean;
}

export const AboutPrizeSection: React.FC<AboutPrizeSectionProps> = ({
  description,
  prizePool,
  onCaptainDashboard,
  onJoinTeam,
  isCaptain,
  isMember,
  captainLoading = false,
}) => {
  // Debug logging for captain button rendering
  console.log('🎖️ AboutPrizeSection: Render props debug:', {
    isCaptain,
    isMember,
    captainLoading,
    hasOnCaptainDashboard: !!onCaptainDashboard,
    hasOnJoinTeam: !!onJoinTeam,
  });
  const formatPrizePool = (amount: number): string => {
    return amount.toLocaleString();
  };

  return (
    <View style={styles.topSection}>
      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>About</Text>
        <Text style={styles.aboutText}>{description}</Text>
      </View>
      <View style={styles.prizeSection}>
        <View style={styles.prizeAmount}>
          <Text style={styles.prizeNumber}>{formatPrizePool(prizePool)}</Text>
          <Text style={styles.prizeCurrency}>League prize pool</Text>
        </View>
        <View style={styles.buttonContainer}>
          {/* Membership Status Button - Always show for members or join button for non-members */}
          {isMember ? (
            <Button
              title="Joined"
              variant="outline"
              size="medium"
              style={[styles.actionButton, styles.joinedButton]}
              disabled={true}
            />
          ) : (
            onJoinTeam && (
              <Button
                title="Join Team"
                variant="primary"
                size="medium"
                onPress={onJoinTeam}
                style={styles.actionButton}
              />
            )
          )}
          
          {/* Captain Dashboard Button - Always show, validate on click */}
          <CaptainDashboardButton
            onPress={() => {
              console.log('🎖️ Captain Dashboard button clicked!');
              onCaptainDashboard();
            }}
            isLoading={captainLoading}
            variant="outline"
            size="medium"
            style={styles.actionButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topSection: {
    flexDirection: 'row',
    gap: 12,
    flexShrink: 0,
  },
  aboutSection: {
    flex: 1,
  },
  aboutTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  aboutText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    lineHeight: 18,
  },
  prizeSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  prizeAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  prizeNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  prizeCurrency: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 8,
    alignItems: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    minWidth: 120,
  },
  joinedButton: {
    opacity: 0.7,
  },
});
