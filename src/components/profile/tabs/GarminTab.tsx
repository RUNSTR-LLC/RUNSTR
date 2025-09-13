/**
 * GarminTab - Placeholder for Garmin Connect integration
 * Shows "Coming Soon" message with integration preview
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';

export const GarminTab: React.FC = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.comingSoonCard}>
        <Text style={styles.title}>Garmin Connect</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
        <Text style={styles.description}>
          Connect your Garmin devices to view and share your workouts.
          We'll support all Garmin fitness devices including:
        </Text>
        
        <View style={styles.featureList}>
          <Text style={styles.feature}>• Forerunner, Fenix, Venu series</Text>
          <Text style={styles.feature}>• Running, cycling, swimming workouts</Text>
          <Text style={styles.feature}>• Advanced metrics (VO2, Training Effect)</Text>
          <Text style={styles.feature}>• Post to Nostr with one tap</Text>
        </View>
        
        <View style={styles.badge}>
          <Text style={styles.badgeText}>In Development</Text>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
    justifyContent: 'center',
  },
  comingSoonCard: {
    padding: 32,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  feature: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    paddingLeft: 8,
  },
  badge: {
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
});