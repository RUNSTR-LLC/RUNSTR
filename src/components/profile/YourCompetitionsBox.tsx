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
import { Ionicons } from '@expo/vector-icons';
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
      <Ionicons name="trophy-outline" size={24} color={theme.colors.text} />
      <Text style={styles.title}>MY COMPETITIONS</Text>
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
});