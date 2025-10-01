/**
 * WorkoutsTab Component - Tab-Based Workout Display
 * Shows separate tabs for different workout sources (Nostr, Apple Health, Garmin, Google)
 * Eliminates complex merge logic for simplicity and scalability
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import { SyncSource, Workout } from '../../types';
import { NostrWorkoutsTab } from './tabs/NostrWorkoutsTab';
import { AppleHealthTab } from './tabs/AppleHealthTab';
import { GarminTab } from './tabs/GarminTab';
import { GoogleFitTab } from './tabs/GoogleFitTab';
import { WorkoutPublishingService } from '../../services/nostr/workoutPublishingService';
import { getNsecFromStorage } from '../../utils/nostr';

interface WorkoutsTabProps {
  syncSources: SyncSource[];
  recentWorkouts: Workout[]; // Legacy prop - ignored in new architecture
  currentUserId: string;
  currentUserPubkey?: string;
  currentUserTeamId?: string;
  onSyncSourcePress: (provider: string) => void;
  onWorkoutsSynced?: () => void;
}

type SourceTab = 'nostr' | 'apple' | 'garmin' | 'google';

export const WorkoutsTab: React.FC<WorkoutsTabProps> = ({
  syncSources,
  recentWorkouts, // Ignored in new architecture
  currentUserId,
  currentUserPubkey,
  currentUserTeamId,
  onSyncSourcePress,
  onWorkoutsSynced,
}) => {
  const [activeTab, setActiveTab] = useState<SourceTab>('nostr');
  const [nsecKey, setNsecKey] = useState<string | null>(null);

  const publishingService = WorkoutPublishingService.getInstance();

  useEffect(() => {
    loadNsecKey();
  }, []);

  const loadNsecKey = async () => {
    try {
      const nsec = await getNsecFromStorage(currentUserId);
      setNsecKey(nsec);
    } catch (error) {
      console.error('Failed to load nsec key:', error);
    }
  };

  const handlePostToNostr = async (workout: Workout) => {
    if (!nsecKey) {
      Alert.alert(
        'Authentication Required',
        'Please log in with your Nostr key to post workouts.'
      );
      return;
    }

    try {
      console.log('📤 Posting workout to Nostr...');
      const result = await publishingService.saveWorkoutToNostr(
        workout,
        nsecKey,
        currentUserId
      );

      if (result.success) {
        Alert.alert('Success', 'Workout posted to Nostr successfully!');
        onWorkoutsSynced?.();
      } else {
        throw new Error(result.error || 'Failed to post workout');
      }
    } catch (error) {
      console.error('❌ Post to Nostr failed:', error);
      Alert.alert('Error', 'Failed to post workout to Nostr');
    }
  };

  const renderTabButton = (tab: SourceTab, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        activeTab === tab && styles.tabButtonActive,
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text
        style={[
          styles.tabButtonText,
          activeTab === tab && styles.tabButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'nostr':
        return (
          <NostrWorkoutsTab
            userId={currentUserId}
            pubkey={currentUserPubkey}
            onRefresh={onWorkoutsSynced}
          />
        );
      case 'apple':
        return (
          <AppleHealthTab
            userId={currentUserId}
            onPostToNostr={handlePostToNostr}
          />
        );
      case 'garmin':
        return <GarminTab />;
      case 'google':
        return <GoogleFitTab />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {renderTabButton('nostr', 'Public')}
          {renderTabButton('apple', 'Apple')}
          {renderTabButton('garmin', 'Garmin')}
          {renderTabButton('google', 'Google')}
        </ScrollView>
      </View>

      {/* Active Tab Content */}
      <View style={styles.tabContent}>
        {renderActiveTab()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabScroll: {
    paddingHorizontal: 16,
  },
  tabButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  tabButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: theme.colors.accentText,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
});