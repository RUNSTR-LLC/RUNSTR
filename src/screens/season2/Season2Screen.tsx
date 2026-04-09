/**
 * Season2Screen - RUNSTR Season 2 Competition Screen
 *
 * Dedicated screen for Season 2 content:
 * - Info card (dates, prizes)
 * - 3 activity tabs (Running, Walking, Cycling)
 * - User leaderboard (NOW POWERED BY SUPABASE)
 * - Charity rankings (collapsible)
 * - Signup section
 *
 * SUPABASE MIGRATION: Leaderboards now fetch from database instead of Nostr.
 * Benefits: ~200ms response vs 3-5 seconds, workout verification built-in.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  Season2InfoCard,
  Season2Leaderboard,
  CharityRankings,
  Season2ExplainerModal,
  Season2SignupSection,
} from '../../components/season2';
import { ToggleButtons } from '../../components/ui/ToggleButtons';
import { useSeason2Registration } from '../../hooks/useSeason2';
import { useSupabaseLeaderboard } from '../../hooks/useSupabaseLeaderboard';
import { Season2PayoutService } from '../../services/season/Season2PayoutService';
import { getSeason2Status, SEASON_2_PARTICIPANTS } from '../../constants/season2';
import type { Season2ActivityType, Season2Participant } from '../../types/season2';

// Create lookup map from npub to hex pubkey for avatar resolution
const NPUB_TO_HEX_MAP = new Map(
  SEASON_2_PARTICIPANTS.map((p) => [p.npub, p.pubkey])
);

const TABS = [
  { key: 'running', label: 'Running' },
  { key: 'walking', label: 'Walking' },
  { key: 'cycling', label: 'Cycling' },
];

interface Season2ScreenProps {
  navigation?: any;
}

export const Season2Screen: React.FC<Season2ScreenProps> = ({ navigation: propNavigation }) => {
  const hookNavigation = useNavigation<any>();
  const navigation = propNavigation || hookNavigation;

  // Season II activity tab state (Running / Walking / Cycling)
  const [activeTab, setActiveTab] = useState<Season2ActivityType>('running');
  const [showExplainer, setShowExplainer] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // =========================================================================
  // SUPABASE LEADERBOARDS - Fast database queries instead of Nostr
  // =========================================================================
  const {
    leaderboard: runningLeaderboard,
    charityRankings: runningCharityRankings,
    isLoading: runningLoading,
    hasRealData: runningHasRealData,
    refresh: refreshRunning,
    currentUserPubkey,
  } = useSupabaseLeaderboard('season2-running');

  const {
    leaderboard: walkingLeaderboard,
    charityRankings: walkingCharityRankings,
    isLoading: walkingLoading,
    hasRealData: walkingHasRealData,
    refresh: refreshWalking,
  } = useSupabaseLeaderboard('season2-walking');

  const {
    leaderboard: cyclingLeaderboard,
    charityRankings: cyclingCharityRankings,
    isLoading: cyclingLoading,
    hasRealData: cyclingHasRealData,
    refresh: refreshCycling,
  } = useSupabaseLeaderboard('season2-cycling');

  const { isRegistered } = useSeason2Registration();

  // Eager prefetch all activity types on mount
  // Ensures cache is warm for tab switching even if AppInit prefetch missed
  useEffect(() => {
    refreshRunning();
    refreshWalking();
    refreshCycling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Transform Supabase data to Season2Participant format
  const transformToParticipants = useCallback(
    (leaderboard: typeof runningLeaderboard): Season2Participant[] => {
      return leaderboard.map((entry) => ({
        // IMPORTANT: Use hex pubkey for bundled avatar lookup (getSeason2Avatar expects hex)
        pubkey: NPUB_TO_HEX_MAP.get(entry.npub) || entry.npub,
        npub: entry.npub,
        name: entry.name,
        picture: entry.picture,
        totalDistance: entry.score, // Score already in km from SupabaseCompetitionService
        workoutCount: entry.workout_count || 0,
        isLocalJoin: false,
        isPrivateCompetitor: false,
        // Charity from user's most recent workout
        charityId: entry.charityId,
        charityName: entry.charityName,
      }));
    },
    []
  );

  // Memoized participants for each activity
  const participants = useMemo(
    () => ({
      running: transformToParticipants(runningLeaderboard),
      walking: transformToParticipants(walkingLeaderboard),
      cycling: transformToParticipants(cyclingLeaderboard),
    }),
    [runningLeaderboard, walkingLeaderboard, cyclingLeaderboard, transformToParticipants]
  );

  // Get current leaderboard based on active tab
  const currentParticipants = participants[activeTab];
  const isLoading = activeTab === 'running' ? runningLoading : activeTab === 'walking' ? walkingLoading : cyclingLoading;
  const hasRealData = activeTab === 'running' ? runningHasRealData : activeTab === 'walking' ? walkingHasRealData : cyclingHasRealData;

  // Get current charity rankings based on active tab
  const currentCharityRankings = useMemo(() => {
    switch (activeTab) {
      case 'running':
        return runningCharityRankings;
      case 'walking':
        return walkingCharityRankings;
      case 'cycling':
        return cyclingCharityRankings;
      default:
        return [];
    }
  }, [activeTab, runningCharityRankings, walkingCharityRankings, cyclingCharityRankings]);

  console.log(`[Season2Screen] Supabase leaderboard: ${activeTab} has ${currentParticipants.length} participants`);

  // Trigger automatic payouts when season ends
  useEffect(() => {
    const checkAndExecutePayouts = async () => {
      const status = getSeason2Status();
      if (status === 'ended') {
        const results = await Season2PayoutService.executePayouts();
        if (results) {
          console.log('[Season2Screen] Payout results:', {
            bonusSuccess: results.bonusWinner?.success,
            charitySuccessCount: results.charityPayouts.filter(p => p.success).length,
            totalSuccess: results.totalSuccess,
          });
        }
      }
    };

    checkAndExecutePayouts();
  }, []);

  // Refresh handler - now uses fast Supabase queries
  const handleRefresh = useCallback(async () => {
    console.log(`[Season2Screen] Pull-to-refresh: refreshing all leaderboards from Supabase`);
    setIsRefreshing(true);

    try {
      // Refresh all three leaderboards in parallel
      await Promise.all([refreshRunning(), refreshWalking(), refreshCycling()]);
      console.log(`[Season2Screen] Refresh complete`);
    } catch (err) {
      console.error(`[Season2Screen] Refresh error:`, err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshRunning, refreshWalking, refreshCycling]);

  const handleTabChange = (tab: Season2ActivityType) => {
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Season II</Text>
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
        {/* Info Card */}
        <Season2InfoCard onPress={() => setShowExplainer(true)} />

        {/* Activity Tab Bar */}
        <View style={styles.tabBarContainer}>
          <ToggleButtons
            options={TABS}
            activeKey={activeTab}
            onSelect={(key) => handleTabChange(key as Season2ActivityType)}
          />
        </View>

        {/* Leaderboard - Now powered by Supabase */}
        <Season2Leaderboard
          participants={currentParticipants}
          isLoading={!hasRealData}
          emptyMessage={`No ${activeTab} workouts yet`}
          currentUserPubkey={currentUserPubkey}
          activityType={activeTab}
          isBaselineOnly={false} // Supabase has real-time data
          baselineDate={undefined}
        />

        {/* Charity Rankings - Now powered by Supabase */}
        <CharityRankings
          rankings={currentCharityRankings}
          isLoading={isLoading || isRefreshing}
        />

        {/* Registration Closed / Registered Status */}
        {isRegistered ? (
          <View style={styles.registeredInfo}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.success}
            />
            <Text style={styles.registeredText}>
              You're competing in SEASON II
            </Text>
          </View>
        ) : (
          <Season2SignupSection />
        )}
      </ScrollView>

      {/* Explainer Modal */}
      <Season2ExplainerModal
        visible={showExplainer}
        onClose={() => setShowExplainer(false)}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabBarContainer: {
    marginBottom: 16,
  },
  registeredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  registeredText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 32,
  },
});

export default Season2Screen;
