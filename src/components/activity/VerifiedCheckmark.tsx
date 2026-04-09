// src/components/activity/VerifiedCheckmark.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface VerifiedCheckmarkProps {
  size?: number;
}

export const VerifiedCheckmark: React.FC<VerifiedCheckmarkProps> = ({
  size = 14,
}) => (
  <View style={styles.container}>
    <Ionicons name="checkmark-circle" size={size} color={theme.colors.accent} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
  },
});
