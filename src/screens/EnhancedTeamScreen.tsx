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
import { useUserStore } from '../store/userStore';
import { isTeamMember, isTeamCaptain } from '../utils/teamUtils';

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
  userIsMemberProp?: boolean;
  currentUserNpub?: string; // Passed from navigation to avoid AsyncStorage corruption
  userIsCaptain?: boolean; // Passed from navigation to avoid recalculation
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
  userIsMemberProp = true,
  currentUserNpub, // Working npub from navigation to avoid AsyncStorage corruption
  userIsCaptain: passedUserIsCaptain = false, // Correctly calculated captain status from navigation
}) => {
  const { team, leaderboard, events, challenges } = data;
  
  // Debug team data received
  console.log('🔍 EnhancedTeamScreen: Team data received:', {
    id: team?.id,
    name: team?.name,
    captain: team?.captain ? team.captain.slice(0, 10) + '...' : 'missing',
    captainId: team?.captainId ? team.captainId.slice(0, 10) + '...' : 'missing',
    captainNpub: team?.captainNpub ? team.captainNpub.slice(0, 20) + '...' : 'missing',
    fullTeamKeys: team ? Object.keys(team) : 'no team object',
  });
  
  // Use captain detection hook for this specific team
  const {
    isCaptain,
    isLoading: captainLoading,
    error: captainError,
    checkCaptainStatus,
    refreshCaptainStatus,
    isCaptainOfThisTeam,
  } = useTeamCaptainDetection(team.id);

  // Use working currentUserNpub from navigation instead of corrupted store  
  const { user } = useUserStore(); // Keep for compatibility but prefer navigation parameter
  const workingUserNpub = currentUserNpub || user?.npub; // Use navigation param first, fallback to store

  // Calculate membership status using utility functions
  const calculatedUserIsMember = isTeamMember(workingUserNpub, team);
  // Use passed captain status from navigation instead of recalculating
  const userIsCaptain = passedUserIsCaptain;
  
  // Debug logging for captain detection values
  console.log('🎖️ EnhancedTeamScreen: Captain detection values:', {
    navigationNpub: currentUserNpub ? currentUserNpub.slice(0, 12) + '...' : 'not passed',
    storeNpub: user?.npub ? user.npub.slice(0, 12) + '...' : 'corrupted/missing',
    workingUserNpub: workingUserNpub ? workingUserNpub.slice(0, 12) + '...' : 'missing',
    teamCaptainId: 'captainId' in team ? team.captainId?.slice(0, 12) + '...' : 'N/A',
    teamCaptainNpub: 'captainNpub' in team ? team.captainNpub?.slice(0, 12) + '...' : 'N/A',
    passedUserIsCaptain,
    userIsCaptain, // This should now be the same as passedUserIsCaptain
    calculatedUserIsMember,
    hookIsCaptain: isCaptain,
  });

  // Debug logging for captain detection
  useEffect(() => {
    console.log('🐛 EnhancedTeamScreen Debug:', {
      teamName: team.name,
      teamId: team.id,
      workingUserNpub: workingUserNpub?.slice(0, 8) + '...',
      teamCaptainId: 'captainId' in team ? team.captainId?.slice(0, 8) + '...' : 'N/A',
      teamCaptainNpub: 'captainNpub' in team ? team.captainNpub?.slice(0, 8) + '...' : 'N/A',
      userIsCaptain,
      calculatedUserIsMember,
      hookIsCaptain: isCaptain,
    });
  }, [workingUserNpub, team.id, userIsCaptain, calculatedUserIsMember, isCaptain]);

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
        onLeaveTeam={calculatedUserIsMember ? onLeaveTeam : undefined}
        onJoinTeam={showJoinButton ? onJoinTeam : undefined}
        onTeamDiscovery={onTeamDiscovery}
        userIsMember={calculatedUserIsMember}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentInner}>
          <AboutPrizeSection
            description={team.description}
            prizePool={team.prizePool}
            onCaptainDashboard={handleCaptainDashboard}
            onJoinTeam={onJoinTeam}
            isCaptain={userIsCaptain}
            isMember={calculatedUserIsMember || userIsCaptain || isCaptain}
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