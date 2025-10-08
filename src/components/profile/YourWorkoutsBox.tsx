/**
 * YourWorkoutsBox Component
 * Simple navigation box for Profile screen - shows "My Workouts"
 */

import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const YourWorkoutsBox: React.FC = () => {
  const navigation = useNavigation<any>();

  const handlePress = async () => {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:npub');
      const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');

      // Navigate to WorkoutHistory screen in parent stack
      const parentNav = navigation.getParent();
      if (parentNav) {
        parentNav.navigate('WorkoutHistory' as any, {
          userId: hexPubkey || userPubkey || '',
          pubkey: userPubkey || ''
        });
      } else {
        // Fallback: try direct navigation
        navigation.navigate('WorkoutHistory' as any, {
          userId: hexPubkey || userPubkey || '',
          pubkey: userPubkey || ''
        });
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="barbell-outline" size={24} color={theme.colors.text} />
      <Text style={styles.title}>MY WORKOUTS</Text>
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