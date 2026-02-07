/**
 * FitnessHistoryBox Component
 * Simple navigation box for Profile screen - shows "FITNESS HISTORY"
 * Navigates to WorkoutHistoryScreen for workout history and stats
 */

import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';

export const FitnessHistoryBox: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('profile');

  const handlePress = () => {
    // Navigate to WorkoutHistory screen (workout history/stats)
    // Use parent navigator since WorkoutHistory is in the stack, not the tab navigator
    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.navigate('WorkoutHistory');
    } else {
      navigation.navigate('WorkoutHistory');
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>{t('viewHistory')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
});
