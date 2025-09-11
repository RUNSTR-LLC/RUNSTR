/**
 * EnhancedTeamScreen - Team screen with integrated captain detection
 * Integrates useCaptainDetection hook with existing team display logic
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { TeamHeader } from '../components/team/TeamHeader';
import { AboutPrizeSection } from '../components/team/AboutPrizeSection';
import { LeaderboardCard } from '../components/team/LeaderboardCard';
import { LeagueRankingsSection } from '../components/team/LeagueRankingsSection';
import { EventsCard } from '../components/team/EventsCard';
import { ChallengesCard } from '../components/team/ChallengesCard';
import { TeamScreenData } from '../types';
import { theme } from '../styles/theme';
import { useCaptainDetection, useTeamCaptainDetection } from '../hooks/useCaptainDetection';
import { useLeagueRankings } from '../hooks/useLeagueRankings';

interface EnhancedTeamScreenProps {
  data: TeamScreenData;
  onMenuPress: () => void;
  onCaptainDashboard: () => void;
  onAddChallenge: () => void;
  onEventPress?: (eventId: string) => void;
  onChallengePress?: (challengeId: string) => void;
  onNavigateToProfile: () => void;
  onLeaveTeam: () => void;
  onTeamDiscovery: () => void;
  onJoinTeam?: () => void;
  showJoinButton?: boolean;
  userIsMember?: boolean;
}

export const EnhancedTeamScreen: React.FC<EnhancedTeamScreenProps> = ({
  data,
  onMenuPress,
  onCaptainDashboard,
  onAddChallenge,
  onEventPress,
  onChallengePress,
  onNavigateToProfile,
  onLeaveTeam,
  onTeamDiscovery,
  onJoinTeam,
  showJoinButton = false,
  userIsMember = true,
}) => {
  const { team, leaderboard, events, challenges } = data;
  
  // Use captain detection hook for this specific team
  const {
    isCaptain,
    isLoading: captainLoading,
    error: captainError,
    checkCaptainStatus,
    refreshCaptainStatus,
    isCaptainOfThisTeam,
  } = useTeamCaptainDetection(team.id);

  // Use league rankings hook to check for active competitions
  const {
    rankings,
    activeLeague,
    loading: rankingsLoading,
    error: rankingsError,
    refresh: refreshRankings,
    hasActiveLeague,
  } = useLeagueRankings({
    teamId: team.id,
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute
  });

  // Refresh captain status when team changes
  useEffect(() => {
    if (team.id) {
      console.log(`🎖️ EnhancedTeamScreen: Checking captain status for team ${team.id.slice(0, 8)}...`);
      checkCaptainStatus();
    }
  }, [team.id, checkCaptainStatus]);

  // Enhanced captain dashboard handler with loading state
  const handleCaptainDashboard = async () => {
    console.log('🎖️ EnhancedTeamScreen: Captain dashboard pressed, checking fresh status...');
    
    try {
      // Refresh captain status to ensure we have the latest data
      await refreshCaptainStatus();
      
      if (isCaptain) {
        console.log('✅ EnhancedTeamScreen: Captain status confirmed, opening dashboard');
        onCaptainDashboard();
      } else {
        console.warn('❌ EnhancedTeamScreen: Captain status check failed, access denied');
        // The hook will handle error display
      }
    } catch (error) {
      console.error('❌ EnhancedTeamScreen: Captain dashboard access error:', error);
    }
  };

  // Format data for display components (same as original TeamScreen)
  const formattedLeaderboard = leaderboard.map((entry) => ({
    userId: entry.userId,
    name: entry.userName,
    rank: entry.rank,
    avatar: entry.userName.charAt(0).toUpperCase(),
    isTopThree: entry.rank <= 3,
  }));

  const formattedEvents = events.map((event) => ({
    id: event.id,
    name: event.name,
    date: new Date(event.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    details: event.description,
  }));

  const formattedChallenges = challenges.map((challenge) => ({
    id: challenge.id,
    name: challenge.name,
    date: new Date(challenge.deadline).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    details: challenge.description,
    prize: `${challenge.prizePool.toLocaleString()} sats`,
    participant1: 'Alice',
    participant2: 'Bob',
    type: 'p2p' as const,
  }));

  // Debug logging for captain status
  useEffect(() => {
    console.log(`🎖️ EnhancedTeamScreen: Captain status update - isCaptain: ${isCaptain}, isLoading: ${captainLoading}, error: ${captainError}`);
  }, [isCaptain, captainLoading, captainError]);

  // Debug logging for league rankings
  useEffect(() => {
    console.log(`🏆 EnhancedTeamScreen: League rankings update - hasActiveLeague: ${hasActiveLeague}, loading: ${rankingsLoading}, error: ${rankingsError}`);
    if (activeLeague) {
      console.log(`🎯 Active league: ${activeLeague.name} (${activeLeague.competitionId.slice(0, 8)}...)`);
      console.log(`📊 Competition: ${activeLeague.parameters.activityType} - ${activeLeague.parameters.competitionType}`);
      console.log(`👥 Participants: ${activeLeague.participants.length}`);
    }
  }, [hasActiveLeague, rankingsLoading, rankingsError, activeLeague]);

  return (
    <View style={styles.container}>
      <TeamHeader
        teamName={team.name}
        onMenuPress={onMenuPress}
        onLeaveTeam={userIsMember ? onLeaveTeam : undefined}
        onJoinTeam={showJoinButton ? onJoinTeam : undefined}
        onTeamDiscovery={onTeamDiscovery}
        userIsMember={userIsMember}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentInner}>
          <AboutPrizeSection
            description={team.description}
            prizePool={team.prizePool}
            onCaptainDashboard={handleCaptainDashboard}
            isCaptain={isCaptain}
            captainLoading={captainLoading}
          />

          {/* Dynamic League Rankings or Static Leaderboard */}
          {hasActiveLeague && activeLeague ? (
            <LeagueRankingsSection
              competitionId={activeLeague.competitionId}
              participants={activeLeague.participants}
              parameters={activeLeague.parameters}
              onMemberPress={(npub) => {
                console.log(`👤 Member pressed: ${npub.slice(0, 8)}...`);
                // Could navigate to member profile
              }}
              onViewFullLeaderboard={() => {
                console.log('📊 View full leaderboard pressed');
                // Could navigate to full leaderboard screen
              }}
              maxDisplayed={5}
            />
          ) : (
            <LeaderboardCard leaderboard={formattedLeaderboard} />
          )}

          <View style={styles.bottomSection}>
            <EventsCard 
              events={formattedEvents} 
              onEventPress={onEventPress}
              isCaptain={isCaptain}
            />

            <ChallengesCard
              challenges={formattedChallenges}
              onAddChallenge={onAddChallenge}
              onChallengePress={onChallengePress}
            />
          </View>
        </View>
      </ScrollView>

      <BottomNavigation
        activeScreen="team"
        onNavigateToTeam={() => {}}
        onNavigateToProfile={onNavigateToProfile}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    paddingBottom: 0,
    gap: 12,
  },
  bottomSection: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    minHeight: 300,
  },
});

export default EnhancedTeamScreen;