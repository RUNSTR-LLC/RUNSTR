/**
 * Card Component - Exact match to HTML mockup card styling
 * Used for: main-leaderboard, events-card, challenges-card, etc.
 */

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    // Exact CSS: background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px;
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xxl,
  },
});
