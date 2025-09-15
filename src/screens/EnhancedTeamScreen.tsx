/**
 * EnhancedTeamScreen - Team screen with integrated captain detection
 * Integrates useCaptainDetection hook with existing team display logic
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity } from 'react-native';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { TeamHeader } from '../components/team/TeamHeader';
import { AboutPrizeSection } from '../components/team/AboutPrizeSection';
import { LeaderboardCard } from '../components/team/LeaderboardCard';
import { LeagueRankingsSection } from '../components/team/LeagueRankingsSection';
import { EventsCard } from '../components/team/EventsCard';
import { CompetitionWinnersCard, CompetitionWinner } from '../components/team/CompetitionWinnersCard';
import competitionWinnersService from '../services/competitions/competitionWinnersService';
import { TeamScreenData } from '../types';
import { theme } from '../styles/theme';
import { useLeagueRankings } from '../hooks/useLeagueRankings';
import { useUserStore } from '../store/userStore';
import { isTeamMember } from '../utils/teamUtils';
import { getUserNostrIdentifiers } from '../utils/nostr';

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

  // Debug props received
  console.log('🔥 EnhancedTeamScreen: Props received:', {
    passedUserIsCaptain,
    currentUserNpub: currentUserNpub?.slice(0, 20) + '...',
    userIsMemberProp,
    showJoinButton,
  });

  // Debug team data received
  console.log('🔍 EnhancedTeamScreen: Team data received:', {
    id: team?.id,
    name: team?.name,
    captainId: team?.captainId ? team.captainId.slice(0, 10) + '...' : 'missing',
    fullTeamKeys: team ? Object.keys(team) : 'no team object',
  });
  
  // We're not using the hook anymore - we trust the cached value
  const captainLoading = false; // Not loading since we already have the value

  // Use working currentUserNpub from navigation instead of corrupted store
  const { user } = useUserStore(); // Keep for compatibility but prefer navigation parameter
  const workingUserNpub = currentUserNpub || user?.npub; // Use navigation param first, fallback to store

  // Get user identifiers with hex support for enhanced captain detection
  const [userIdentifiers, setUserIdentifiers] = React.useState<{ npub: string | null; hexPubkey: string | null } | null>(null);

  React.useEffect(() => {
    getUserNostrIdentifiers().then(setUserIdentifiers);
  }, []);

  // Calculate membership status using utility functions
  const calculatedUserIsMember = isTeamMember(workingUserNpub, team);

  // Debug: Log the exact team object structure
  console.log('🔥 TEAM OBJECT STRUCTURE:', {
    teamId: team?.id,
    teamName: team?.name,
    hasCaptainId: 'captainId' in team,
    captainId: team?.captainId,
    workingUserNpub: workingUserNpub?.slice(0, 20) + '...',
    userHexPubkey: userIdentifiers?.hexPubkey?.slice(0, 20) + '...',
  });

  // TRUST the captain status passed from navigation - it comes from cache
  // This was already determined correctly in TeamCard and cached
  const userIsCaptain = passedUserIsCaptain;

  console.log(`🎯 EnhancedTeamScreen: Using captain status from navigation params: ${userIsCaptain}`);

  // Debug logging for captain detection values
  console.log('🎖️ EnhancedTeamScreen: Captain detection values:', {
    navigationNpub: currentUserNpub ? currentUserNpub.slice(0, 12) + '...' : 'not passed',
    storeNpub: user?.npub ? user.npub.slice(0, 12) + '...' : 'corrupted/missing',
    workingUserNpub: workingUserNpub ? workingUserNpub.slice(0, 12) + '...' : 'missing',
    teamCaptainId: 'captainId' in team ? team.captainId?.slice(0, 12) + '...' : 'N/A',
    passedUserIsCaptain,
    userIsCaptain, // This should now be the same as passedUserIsCaptain
    calculatedUserIsMember,
  });

  console.log('🔴 CRITICAL: Captain status being passed to AboutPrizeSection:', {
    userIsCaptain,
    passedUserIsCaptain,
    willShowButton: userIsCaptain === true
  });

  // Debug logging for captain detection
  useEffect(() => {
    console.log('🐛 EnhancedTeamScreen Debug:', {
      teamName: team.name,
      teamId: team.id,
      workingUserNpub: workingUserNpub?.slice(0, 8) + '...',
      teamCaptainId: 'captainId' in team ? team.captainId?.slice(0, 8) + '...' : 'N/A',
      userIsCaptain,
      calculatedUserIsMember,
    });
  }, [workingUserNpub, team.id, userIsCaptain, calculatedUserIsMember]);

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


  // Enhanced captain dashboard handler - simplified now that navigation handles auth
  const handleCaptainDashboard = () => {
    console.log('🎖️ EnhancedTeamScreen: Captain Dashboard button pressed');
    console.log('🎖️ Captain status:', userIsCaptain);
    console.log('🎖️ Team:', team?.name, '(', team?.id, ')');
    console.log('🎖️ About to call onCaptainDashboard prop...');

    // Just call the navigation handler - it will handle all captain verification
    try {
      onCaptainDashboard();
      console.log('✅ EnhancedTeamScreen: onCaptainDashboard prop called successfully');
    } catch (error) {
      console.error('❌ EnhancedTeamScreen: Error calling onCaptainDashboard:', error);
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

  // Competition winners state
  const [competitionWinners, setCompetitionWinners] = useState<CompetitionWinner[]>([]);
  const [winnersLoading, setWinnersLoading] = useState(false);

  // Fetch competition winners
  useEffect(() => {
    const fetchWinners = async () => {
      if (data.team?.id) {
        setWinnersLoading(true);
        try {
          const winners = await competitionWinnersService.fetchTeamCompetitionWinners(
            data.team.id
          );
          setCompetitionWinners(winners);
        } catch (error) {
          console.error('Failed to fetch competition winners:', error);
        } finally {
          setWinnersLoading(false);
        }
      }
    };

    fetchWinners();
  }, [data.team?.id]);

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
    console.log(`🎖️ EnhancedTeamScreen: Captain status update - isCaptain: ${userIsCaptain}, isLoading: ${captainLoading}`);
  }, [userIsCaptain, captainLoading]);

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
          {/* Prize Section - Hidden for now */}
          {/* <AboutPrizeSection
            description={team.description}
            prizePool={team.prizePool}
            onCaptainDashboard={handleCaptainDashboard}
            onJoinTeam={onJoinTeam}
            isCaptain={userIsCaptain}
            isMember={calculatedUserIsMember || userIsCaptain}
            captainLoading={captainLoading}
          /> */}

          {/* Temporary About Section without prize pool */}
          <View style={{ padding: 16, backgroundColor: theme.colors.cardBackground, borderRadius: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 }}>About</Text>
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 }}>
              {team.description || 'No description available'}
            </Text>

            {/* Captain Dashboard Button */}
            {userIsCaptain && (
              <TouchableOpacity
                onPress={handleCaptainDashboard}
                style={{
                  backgroundColor: theme.colors.accent,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 16,
                }}
                disabled={captainLoading}
              >
                <Text style={{ color: theme.colors.accentText, fontSize: 16, fontWeight: '600' }}>
                  Captain Dashboard
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Always show League Rankings - with default 30-day streak if no active league */}
          <View style={{ marginVertical: 12 }}>
            <LeagueRankingsSection
              competitionId={activeLeague?.competitionId || `${team.id}-default-streak`}
              participants={activeLeague?.participants || []}
              parameters={activeLeague?.parameters || {
                activityType: 'Any' as any,
                competitionType: 'Most Consistent' as any,
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString(),
                scoringFrequency: 'daily' as const,
              }}
              onMemberPress={(npub) => {
                console.log(`👤 Member pressed: ${npub.slice(0, 8)}...`);
                // Could navigate to member profile
              }}
              onViewFullLeaderboard={() => {
                console.log('📊 View full leaderboard pressed');
                // Could navigate to full leaderboard screen
              }}
              maxDisplayed={10}
              teamId={team.id}
              isDefaultLeague={!hasActiveLeague}
            />
          </View>

          <View style={styles.bottomSection}>
            <EventsCard
              events={formattedEvents}
              onEventPress={onEventPress}
              isCaptain={userIsCaptain}
            />

            <CompetitionWinnersCard
              teamId={data.team?.id || ''}
              winners={competitionWinners}
              loading={winnersLoading}
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