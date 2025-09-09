/**
 * ChallengeHeader Component - Challenge detail screen header section
 * Matches HTML mockup: challenge-header, challenge-title, challenge-meta, challenge-prize
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export interface ChallengeHeaderProps {
  title: string;
  endDate: string;
  prizeAmount: string;
  description: string;
}

export const ChallengeHeader: React.FC<ChallengeHeaderProps> = ({
  title,
  endDate,
  prizeAmount,
  description,
}) => {
  return (
    <View style={styles.container}>
      {/* Challenge Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Challenge Meta */}
      <View style={styles.meta}>
        <Text style={styles.date}>Ends {endDate}</Text>
        <View style={styles.prizeBadge}>
          <Text style={styles.prizeText}>{prizeAmount}</Text>
        </View>
      </View>

      {/* Challenge Description */}
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  // Challenge title - exact CSS: font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; line-height: 1.2;
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: theme.colors.text,
    marginBottom: 8,
    lineHeight: 28.8, // 24 * 1.2 = 28.8
  },
  // Challenge meta - exact CSS: display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  // Challenge date - exact CSS: font-size: 14px; color: #ccc; font-weight: 500;
  date: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  // Challenge prize badge - exact CSS: background: #fff; color: #000; padding: 6px 12px; border-radius: 8px; font-size: 14px; font-weight: 700;
  prizeBadge: {
    backgroundColor: theme.colors.text,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  prizeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accentText,
  },
  // Challenge description - exact CSS: font-size: 15px; color: #ccc; line-height: 1.4;
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 21, // 15 * 1.4 = 21
  },
});
