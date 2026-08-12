/**
 * Season2Banner - Header banner for Profile screen
 * Small tappable banner that navigates to Season 2 screen
 * Styled to match profile boxes (STATS, LEADERBOARDS, HISTORY)
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';

export const Season2Banner: React.FC = () => {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    navigation.navigate('Season2');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>RUNSTR SEASON II</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  text: {
    color: theme.colors.orangeBright,
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.5,
  },
});

export default Season2Banner;
