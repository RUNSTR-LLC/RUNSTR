/**
 * CompeteScreen - Main Competitions/Events Screen
 *
 * Shows all competition events with cards for:
 * - Satlantis events
 * - Running Bitcoin Challenge
 * - Einundzwanzig Fitness
 * - Season II (navigates to Season2Screen)
 * - Leaderboards (navigates to LeaderboardsScreen)
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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { EventsContent } from '../components/compete';
import { HostEventModal } from '../components/events/HostEventModal';
import type { SatlantisEvent } from '../types/satlantis';

interface CompeteScreenProps {
  navigation?: any;
}

// ✅ PERFORMANCE: React.memo prevents re-renders when props haven't changed
const CompeteScreenComponent: React.FC<CompeteScreenProps> = ({ navigation: propNavigation }) => {
  const hookNavigation = useNavigation<any>();
  const navigation = propNavigation || hookNavigation;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);

  // Handle event press - navigate to event detail
  const handleEventPress = useCallback((event: SatlantisEvent) => {
    navigation.navigate('SatlantisEventDetail', {
      eventId: event.id,
      eventPubkey: event.pubkey,
    });
  }, [navigation]);

  // Handle Running Bitcoin event press
  const handleRunningBitcoinPress = useCallback(() => {
    navigation.navigate('RunningBitcoinDetail');
  }, [navigation]);

  // Handle Einundzwanzig event press
  const handleEinundzwanzigPress = useCallback(() => {
    navigation.navigate('EinundzwanzigDetail');
  }, [navigation]);

  // Handle January Walking event press
  const handleJanuaryWalkingPress = useCallback(() => {
    navigation.navigate('JanuaryWalkingDetail');
  }, [navigation]);

  // Handle Season II card press - navigate to Season2Screen
  const handleSeason2Press = useCallback(() => {
    navigation.navigate('Season2');
  }, [navigation]);

  // Handle Leaderboard card press - navigate to LeaderboardsScreen
  const handleLeaderboardPress = useCallback(() => {
    navigation.navigate('Leaderboards');
  }, [navigation]);

  // Handle dynamic event card press - navigate to DynamicEventDetailScreen
  const handleDynamicEventPress = useCallback((eventId: string) => {
    navigation.navigate('DynamicEventDetail', { eventId });
  }, [navigation]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Events list has its own refresh via useSatlantisEvents
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.hostButton}
          onPress={() => setShowHostModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.hostButtonText}>Host Virtual Event</Text>
        </TouchableOpacity>
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
          onEventPress={handleEventPress}
          onRunningBitcoinPress={handleRunningBitcoinPress}
          onEinundzwanzigPress={handleEinundzwanzigPress}
          onJanuaryWalkingPress={handleJanuaryWalkingPress}
          onSeason2Press={handleSeason2Press}
          onLeaderboardPress={handleLeaderboardPress}
          onDynamicEventPress={handleDynamicEventPress}
        />
      </ScrollView>

      {/* Host Event Modal */}
      <HostEventModal
        visible={showHostModal}
        onClose={() => setShowHostModal(false)}
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
  backButton: {
    padding: 4,
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
