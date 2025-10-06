/**
 * WorkoutTabNavigator - Simple tab switcher between Public and Private workouts
 * Public: 1301 notes from Nostr (cache-first instant display)
 * Private: Local Activity Tracker workouts (zero loading time)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import { PublicWorkoutsTab } from './tabs/PublicWorkoutsTab';
import { PrivateWorkoutsTab } from './tabs/PrivateWorkoutsTab';
import type { LocalWorkout } from '../../services/fitness/LocalWorkoutStorageService';

export type WorkoutTabType = 'public' | 'private';

interface WorkoutTabNavigatorProps {
  userId: string;
  pubkey?: string;
  initialTab?: WorkoutTabType;
  onRefresh?: () => void;
  onPostToNostr?: (workout: LocalWorkout) => Promise<void>;
}

export const WorkoutTabNavigator: React.FC<WorkoutTabNavigatorProps> = ({
  userId,
  pubkey,
  initialTab = 'public',
  onRefresh,
  onPostToNostr,
}) => {
  const [activeTab, setActiveTab] = useState<WorkoutTabType>(initialTab);

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'public' && styles.tabActive]}
          onPress={() => setActiveTab('public')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'public' && styles.tabTextActive]}>
            Public
          </Text>
          {activeTab === 'public' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'private' && styles.tabActive]}
          onPress={() => setActiveTab('private')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'private' && styles.tabTextActive]}>
            Private
          </Text>
          {activeTab === 'private' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'public' ? (
          <PublicWorkoutsTab
            userId={userId}
            pubkey={pubkey}
            onRefresh={onRefresh}
          />
        ) : (
          <PrivateWorkoutsTab
            userId={userId}
            pubkey={pubkey}
            onRefresh={onRefresh}
            onPostToNostr={onPostToNostr}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  tabActive: {
    // Active tab styling handled by indicator
  },

  tabText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },

  tabTextActive: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
  },

  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.accent,
  },

  tabContent: {
    flex: 1,
  },
});
