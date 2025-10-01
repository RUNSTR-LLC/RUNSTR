/**
 * YourWorkoutsBox Component
 * Shows user's workout summary on the Profile screen
 * Navigates to dedicated workout history screen on tap
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WorkoutCacheService } from '../../services/cache/WorkoutCacheService';
import type { UnifiedWorkout } from '../../services/fitness/workoutMergeService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const YourWorkoutsBox: React.FC = () => {
  const navigation = useNavigation<any>();
  const [workoutCount, setWorkoutCount] = useState(0);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkoutStats();
  }, []);

  const loadWorkoutStats = async () => {
    try {
      setLoading(true);

      // Get user identifiers
      const userPubkey = await AsyncStorage.getItem('@runstr:npub');
      const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey || !hexPubkey) {
        console.log('No user authenticated');
        return;
      }

      // Use WorkoutCacheService to read from startup prefetch cache
      // This reads from cache (instant) instead of querying Nostr again
      const cacheService = WorkoutCacheService.getInstance();
      const mergedResult = await cacheService.getMergedWorkouts(hexPubkey, userPubkey);
      const uniqueWorkouts = mergedResult.allWorkouts || [];

      console.log(`📊 YourWorkoutsBox: Loaded ${uniqueWorkouts.length} workouts from cache (fromCache: ${mergedResult.fromCache})`);

      setWorkoutCount(uniqueWorkouts.length);

      // Calculate weekly workouts
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const weeklyWorkouts = uniqueWorkouts.filter((w: UnifiedWorkout) => {
        const workoutDate = new Date(w.startTime).getTime();
        return workoutDate > oneWeekAgo;
      });
      setWeeklyCount(weeklyWorkouts.length);
    } catch (error) {
      console.error('Error loading workout stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <View style={styles.header}>
        <Text style={styles.title}>YOUR WORKOUTS</Text>
        {loading && (
          <ActivityIndicator size="small" color="#999" />
        )}
      </View>

      {!loading && (
        <>
          <Text style={styles.workoutCount}>
            {workoutCount} Total
          </Text>

          {workoutCount === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No workouts recorded</Text>
              <Text style={styles.emptySubtext}>
                Import from Apple Health or record your first workout
              </Text>
            </View>
          ) : (
            <View style={styles.statsContainer}>
              <Text style={styles.statText}>
                {weeklyCount} this week
              </Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    height: 90, // Compact height
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    backgroundColor: '#fff',
    color: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  workoutCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  emptyState: {
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#666',
  },
  statsContainer: {
    paddingVertical: 0,
  },
  statText: {
    fontSize: 13,
    color: '#999',
  },
});