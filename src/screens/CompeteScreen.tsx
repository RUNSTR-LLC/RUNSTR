/**
 * CompeteScreen - Main Competitions/Events Screen
 *
 * Shows all competition events with cards for:
 * - Einundzwanzig Fitness
 * - Season II (navigates to Season2Screen)
 * - Leaderboards (navigates to LeaderboardsScreen)
 * - Dynamic Supabase events
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { EventsContent } from '../components/compete';
import { SimpleEventCreationModal } from '../components/creation/SimpleEventCreationModal';
import { SupabaseCompetitionService } from '../services/backend/SupabaseCompetitionService';

interface CompeteScreenProps {
  navigation?: any;
}

// ✅ PERFORMANCE: React.memo prevents re-renders when props haven't changed
const CompeteScreenComponent: React.FC<CompeteScreenProps> = ({ navigation: propNavigation }) => {
  const hookNavigation = useNavigation<any>();
  const navigation = propNavigation || hookNavigation;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // Handle Einundzwanzig event press
  const handleEinundzwanzigPress = useCallback(() => {
    navigation.navigate('EinundzwanzigDetail');
  }, [navigation]);

  // Handle Season III card press - navigate to Season3Screen
  const handleSeason3Press = useCallback(() => {
    navigation.navigate('Season3');
  }, [navigation]);

  // Handle Leaderboard card press - navigate to LeaderboardsScreen
  const handleLeaderboardPress = useCallback(() => {
    navigation.navigate('Leaderboards');
  }, [navigation]);

  // Handle dynamic event card press - navigate to DynamicEventDetailScreen
  const handleDynamicEventPress = useCallback((eventId: string) => {
    navigation.navigate('DynamicEventDetail', { eventId });
  }, [navigation]);

  // Handle event created - clear cache and navigate to the new event
  const handleEventCreated = useCallback(async (eventId: string) => {
    setShowCreateEvent(false);
    await SupabaseCompetitionService.clearDynamicCompetitionsCache();
    navigation.navigate('DynamicEventDetail', { eventId });
  }, [navigation]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await SupabaseCompetitionService.clearDynamicCompetitionsCache();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.orangeBright}
          />
        }
      >
        <EventsContent
          onEinundzwanzigPress={handleEinundzwanzigPress}
          onSeason2Press={handleSeason3Press}
          onLeaderboardPress={handleLeaderboardPress}
          onDynamicEventPress={handleDynamicEventPress}
        />
      </ScrollView>

      {/* Event Creation Modal */}
      <SimpleEventCreationModal
        visible={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onEventCreated={handleEventCreated}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  hostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  hostButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});

// ✅ PERFORMANCE: React.memo prevents re-renders when props haven't changed
export const CompeteScreen = React.memo(CompeteScreenComponent);
export default CompeteScreen;
