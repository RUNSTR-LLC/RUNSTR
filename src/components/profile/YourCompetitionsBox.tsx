/**
 * YourCompetitionsBox Component
 * Simple navigation box for Profile screen - shows "My Competitions"
 */

import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../styles/theme';

type RootStackParamList = {
  CompetitionsList: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const YourCompetitionsBox: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handlePress = () => {
    // @ts-ignore - CompetitionsList is in the navigation stack
    navigation.navigate('CompetitionsList');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>My Competitions</Text>
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