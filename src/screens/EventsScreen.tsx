/**
 * EventsScreen - RUNSTR Season 1 Competition Display
 * Shows real-time leaderboards for the ongoing Season 1 competition
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';

// Components
import { Season1Header } from '../components/events/Season1Header';
import { ActivityTypeSelector } from '../components/events/ActivityTypeSelector';
import { Season1LeaderboardComponent } from '../components/events/Season1Leaderboard';

// Services and types
import { season1Service } from '../services/season/Season1Service';
import type { Season1Leaderboard, SeasonActivityType } from '../types/season';

export const EventsScreen: React.FC = () => {
  const [selectedActivity, setSelectedActivity] = useState<SeasonActivityType>('running');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Season1Leaderboard | null>(null);

  // Load leaderboard data
  const loadLeaderboard = async (activityType: SeasonActivityType) => {
    try {
      setIsLoading(true);
      const data = await season1Service.fetchLeaderboard(activityType);
      setLeaderboard(data);
    } catch (error) {
      console.error('[EventsScreen] Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadLeaderboard(selectedActivity);
  }, [selectedActivity]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await season1Service.clearCache();
    await loadLeaderboard(selectedActivity);
    setRefreshing(false);
  };

  if (isLoading && !leaderboard) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
          <Text style={styles.loadingText}>Loading Season 1...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Season 1 Header */}
        <Season1Header />

        {/* Activity Type Selector */}
        <ActivityTypeSelector
          selectedType={selectedActivity}
          onTypeSelect={setSelectedActivity}
        />

        {/* Leaderboard */}
        <Season1LeaderboardComponent
          leaderboard={leaderboard}
          activityType={selectedActivity}
          isLoading={isLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: theme.colors.text,
    fontSize: 16,
    marginTop: 12,
  },
});