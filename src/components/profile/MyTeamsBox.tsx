/**
 * MyTeamsBox Component
 * Simple navigation box for Profile screen - shows "My Teams"
 */

import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';

export const MyTeamsBox: React.FC = () => {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    // Navigate to MyTeams screen
    navigation.navigate('MyTeams' as any);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>My Teams</Text>
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
