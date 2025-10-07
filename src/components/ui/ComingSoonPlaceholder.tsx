/**
 * ComingSoonPlaceholder - Simple placeholder for features not yet implemented
 * Used to maintain UI consistency while indicating planned features
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface ComingSoonPlaceholderProps {
  featureName?: string;
  description?: string;
  icon?: React.ReactNode;
}

export const ComingSoonPlaceholder: React.FC<ComingSoonPlaceholderProps> = ({
  featureName = 'This Feature',
  description = 'We\'re working hard to bring this feature to you soon!',
  icon,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {icon || <Text style={styles.iconText}>🚀</Text>}
      </View>

      <Text style={styles.title}>Coming Soon</Text>

      <Text style={styles.featureName}>{featureName}</Text>

      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    marginBottom: 24,
    opacity: 0.6,
  },
  iconText: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
