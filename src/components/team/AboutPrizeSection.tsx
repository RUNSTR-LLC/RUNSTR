import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../ui/Button';
import { CaptainDashboardButton } from './CaptainDashboardButton';
import { theme } from '../../styles/theme';

interface AboutPrizeSectionProps {
  description: string;
  prizePool: number;
  onCaptainDashboard: () => void;
  isCaptain: boolean;
  captainLoading?: boolean;
}

export const AboutPrizeSection: React.FC<AboutPrizeSectionProps> = ({
  description,
  prizePool,
  onCaptainDashboard,
  isCaptain,
  captainLoading = false,
}) => {
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
          <Text style={styles.prizeCurrency}>sat prize pool</Text>
        </View>
        {isCaptain && (
          <CaptainDashboardButton
            onPress={onCaptainDashboard}
            isLoading={captainLoading}
            variant="outline"
            size="medium"
            style={styles.actionButton}
          />
        )}
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
  actionButton: {
    marginTop: 6,
  },
});
