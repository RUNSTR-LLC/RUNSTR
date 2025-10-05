/**
 * SimpleNavigationBox Component
 * Consistent simple navigation box for Profile screen
 * Just shows title text - no stats, no loading
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { theme } from '../../styles/theme';

interface SimpleNavigationBoxProps {
  title: string;
  onPress: () => void;
}

export const SimpleNavigationBox: React.FC<SimpleNavigationBoxProps> = ({
  title,
  onPress
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
