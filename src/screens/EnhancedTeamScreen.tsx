/**
 * EnhancedTeamScreen - Team screen with integrated captain detection
 * Integrates useCaptainDetection hook with existing team display logic
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity, Linking } from 'react-native';
import { getCharityById } from '../constants/charities';
import { NutzapLightningButton } from '../components/nutzap/NutzapLightningButton';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { TeamHeader } from '../components/team/TeamHeader';
import { AboutPrizeSection } from '../components/team/AboutPrizeSection';
import { LeaderboardCard } from '../components/team/LeaderboardCard';
import { LeagueRankingsSection } from '../components/team/LeagueRankingsSection';
import { EventsCard } from '../components/team/EventsCard';
// import { CompetitionWinnersCard, CompetitionWinner } from '../components/team/CompetitionWinnersCard';
// import competitionWinnersService from '../services/competitions/competitionWinnersService';
import { CompetitionTabs } from '../components/team/CompetitionTabs';
import { TeamScreenData } from '../types';
import { theme } from '../styles/theme';
import { useLeagueRankings } from '../hooks/useLeagueRankings';
import { useUserStore } from '../store/userStore';
import { isTeamMember } from '../utils/teamUtils';
import { getUserNostrIdentifiers } from '../utils/nostr';
import { NostrCompetitionService } from '../services/nostr/NostrCompetitionService';
import { CompetitionService } from '../services/competition/competitionService';
import type { Competition } from '../services/competition/competitionService';

interface EnhancedTeamScreenProps {
  data: TeamScreenData;
  onMenuPress: () => void;
  onCaptainDashboard: () => void;
  onAddChallenge: () => void;
  onEventPress?: (eventId: string, eventData?: any) => void;
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
    npub: entry.npub, // Pass through npub for zapping
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

  // Competition winners state - commented out for now
  // const [competitionWinners, setCompetitionWinners] = useState<CompetitionWinner[]>([]);
  // const [winnersLoading, setWinnersLoading] = useState(false);

  // Nostr competitions state
  const [nostrEvents, setNostrEvents] = useState<any[]>([]);
  const [nostrLeagues, setNostrLeagues] = useState<any[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [rawNostrEvents, setRawNostrEvents] = useState<any[]>([]); // Keep raw event data for navigation

  // Fetch competitions from Nostr
  useEffect(() => {
    const fetchTeamCompetitions = async () => {
      if (!team?.id) {
        setLoadingCompetitions(false);
        return;
      }

      try {
        console.log('🔍 Fetching competitions for team:', team.id);
        const service = NostrCompetitionService.getInstance();

        // Query all recent competitions then filter locally
        const now = Math.floor(Date.now() / 1000);
        const result = await service.queryCompetitions({
          kinds: [30100, 30101], // Both leagues and events
          since: now - (30 * 24 * 60 * 60), // Last 30 days
          limit: 200 // Get more to ensure we capture team's competitions
        });

        // Filter for this team's competitions locally
        const teamLeagues = result.leagues.filter(league => league.teamId === team.id);
        const teamEvents = result.events.filter(event => event.teamId === team.id);

        console.log('📊 Fetched competitions:', {
          totalLeagues: result.leagues.length,
          totalEvents: result.events.length,
          teamLeagues: teamLeagues.length,
          teamEvents: teamEvents.length,
          teamId: team.id
        });

        // Cache competitions in CompetitionService for navigation
        const competitionService = CompetitionService.getInstance();

        // Cache events
        teamEvents.forEach(event => {
          // Convert NostrEventDefinition to Competition format
          const competition: Competition = {
            id: event.id,
            name: event.name,
            description: event.description || '',
            type: 'event',
            teamId: event.teamId,
            captainPubkey: event.captainPubkey,
            startTime: Math.floor(new Date(event.eventDate).getTime() / 1000),
            endTime: Math.floor(new Date(event.eventDate).getTime() / 1000) + 86400, // Add 1 day
            activityType: event.activityType,
            competitionType: event.competitionType,
            goalType: 'distance', // Default, could be derived from competitionType
            goalValue: event.targetValue,
            goalUnit: event.targetUnit,
            entryFeesSats: event.entryFeesSats || 0,
            maxParticipants: event.maxParticipants || 100,
            requireApproval: event.requireApproval || false,
            createdAt: Math.floor(Date.now() / 1000),
            isActive: true,
            participantCount: 0,
            nostrEvent: {} as any, // We don't have the full Nostr event here
          };
          competitionService.addCompetitionToCache(competition);
        });

        // Cache leagues
        teamLeagues.forEach(league => {
          const competition: Competition = {
            id: league.id,
            name: league.name,
            description: league.description || '',
            type: 'league',
            teamId: league.teamId,
            captainPubkey: league.captainPubkey,
            startTime: Math.floor(new Date(league.startDate).getTime() / 1000),
            endTime: Math.floor(new Date(league.endDate).getTime() / 1000),
            activityType: league.activityType,
            competitionType: league.competitionType,
            goalType: 'consistency', // Default for leagues
            goalValue: undefined,
            goalUnit: undefined,
            entryFeesSats: league.entryFeesSats || 0,
            maxParticipants: league.maxParticipants || 100,
            requireApproval: league.requireApproval || false,
            scoringFrequency: league.scoringFrequency,
            allowLateJoining: league.allowLateJoining,
            createdAt: Math.floor(Date.now() / 1000),
            isActive: true,
            participantCount: 0,
            nostrEvent: {} as any,
          };
          competitionService.addCompetitionToCache(competition);
        });

        // Format events for display
        const formattedNostrEvents = teamEvents.map(event => ({
          id: event.id,
          name: event.name,
          date: new Date(event.eventDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          details: event.description || 'No description',
          startDate: event.eventDate, // Keep original for sorting
          prizePoolSats: event.prizePoolSats, // Include prize pool if available
        }));

        setNostrEvents(formattedNostrEvents);
        setNostrLeagues(teamLeagues);
        setRawNostrEvents(teamEvents); // Store raw event data
      } catch (error) {
        console.error('❌ Failed to fetch team competitions:', error);
      } finally {
        setLoadingCompetitions(false);
      }
    };

    fetchTeamCompetitions();
  }, [team?.id]);

  // Fetch competition winners - commented out for now
  // useEffect(() => {
  //   const fetchWinners = async () => {
  //     if (data.team?.id) {
  //       setWinnersLoading(true);
  //       try {
  //         const winners = await competitionWinnersService.fetchTeamCompetitionWinners(
  //           data.team.id
  //         );
  //         setCompetitionWinners(winners);
  //       } catch (error) {
  //         console.error('Failed to fetch competition winners:', error);
  //       } finally {
  //         setWinnersLoading(false);
  //       }
  //     }
  //   };

  //   fetchWinners();
  // }, [data.team?.id]);

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
        bannerImage={team.bannerImage}
        team={team} // Pass full team object for fallback extraction
        onMenuPress={onMenuPress}
        onLeaveTeam={calculatedUserIsMember ? onLeaveTeam : undefined}
        onJoinTeam={showJoinButton ? onJoinTeam : undefined}
        onTeamDiscovery={onTeamDiscovery}
        userIsMember={calculatedUserIsMember}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentInner}>
          {/* Team Name Section */}
          <View style={styles.teamNameSection}>
            <Text style={styles.teamNameText}>{team.name}</Text>
          </View>
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

          {/* About Section with Charity Support */}
          <View style={{ padding: 16, backgroundColor: theme.colors.cardBackground, borderRadius: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 }}>About</Text>
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 }}>
              {team.description || 'No description available'}
            </Text>

            {/* Charity Section - Shows button or message */}
            {(() => {
              if (team.charityId && getCharityById(team.charityId)) {
                // Team has a charity selected - show zap button
                return (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 }}>Supporting</Text>
                    <Text style={{ fontSize: 14, color: theme.colors.text, fontWeight: '600', marginBottom: 4 }}>
                      {getCharityById(team.charityId)?.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textTertiary, marginBottom: 12, fontStyle: 'italic' }}>
                      {getCharityById(team.charityId)?.description}
                    </Text>
                    <NutzapLightningButton
                      recipientNpub={getCharityById(team.charityId)?.lightningAddress || ''}
                      recipientName={getCharityById(team.charityId)?.displayName || ''}
                      size="rectangular"
                      customLabel={`Zap ${getCharityById(team.charityId)?.displayName}`}
                    />
                  </View>
                );
              } else if (userIsCaptain) {
                // Captain viewing team without charity - show prompt
                return (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 }}>Supporting</Text>
                    <Text style={{ fontSize: 14, color: theme.colors.textTertiary, fontStyle: 'italic' }}>
                      No charity selected yet. Add one in Captain Dashboard to enable charity zaps.
                    </Text>
                  </View>
                );
              } else {
                // Regular member viewing team without charity
                return (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 }}>Supporting</Text>
                    <Text style={{ fontSize: 14, color: theme.colors.textTertiary, fontStyle: 'italic' }}>
                      This team hasn't selected a charity to support yet.
                    </Text>
                  </View>
                );
              }
            })()}

            {/* Action Buttons - Responsive Layout */}
            <View style={{ flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {/* Captain Dashboard Button - Full width when present */}
              {userIsCaptain && (
                <TouchableOpacity
                  onPress={handleCaptainDashboard}
                  style={{
                    width: '100%',
                    backgroundColor: theme.colors.accent,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 48,
                  }}
                  disabled={captainLoading}
                >
                  <Text
                    style={{
                      color: theme.colors.accentText,
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.85}
                  >
                    Captain Dashboard
                  </Text>
                </TouchableOpacity>
              )}

              {/* Team Shop and Subscribe Buttons Row */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* Team Shop Button */}
                <TouchableOpacity
                  onPress={() => {
                    if (team.shopUrl) {
                      Linking.openURL(team.shopUrl).catch(err => {
                        console.error('Failed to open shop URL:', err);
                        Alert.alert('Error', 'Unable to open shop. Please try again.');
                      });
                    }
                  }}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    backgroundColor: team.shopUrl ? theme.colors.primary : theme.colors.border,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: team.shopUrl ? 1 : 0.5,
                    minHeight: 48,
                  }}
                  disabled={!team.shopUrl}
                >
                  <Text
                    style={{
                      color: team.shopUrl ? theme.colors.primaryText : theme.colors.textTertiary,
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.85}
                  >
                    Team Shop
                  </Text>
                </TouchableOpacity>

                {/* Flash Subscription Button */}
                <TouchableOpacity
                  onPress={() => {
                    if (team.flashUrl) {
                      Linking.openURL(team.flashUrl).catch(err => {
                        console.error('Failed to open Flash URL:', err);
                        Alert.alert('Error', 'Unable to open subscription page. Please try again.');
                      });
                    }
                  }}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    backgroundColor: team.flashUrl ? '#FF9500' : theme.colors.border,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: team.flashUrl ? 1 : 0.5,
                    minHeight: 48,
                  }}
                  disabled={!team.flashUrl}
                >
                  <Text
                    style={{
                      color: team.flashUrl ? '#FFFFFF' : theme.colors.textTertiary,
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.85}
                  >
                    Subscribe
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Competition Tabs - Tournament and Events */}
          <View style={{ flex: 1, marginTop: 16 }}>
            <CompetitionTabs
              tournamentContent={
                <View style={{ flex: 1 }}>
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
                    captainPubkey={team.captainId} // Pass the team's captain ID
                    isDefaultLeague={!hasActiveLeague}
                  />
                </View>
              }
              eventsContent={
                <View style={{ flex: 1 }}>
                  <EventsCard
                    events={nostrEvents.length > 0 ? nostrEvents : formattedEvents}
                    onEventPress={(eventId, formattedEvent) => {
                      // Find the raw Nostr event data if available
                      const rawEvent = rawNostrEvents.find(e => e.id === eventId);
                      onEventPress?.(eventId, rawEvent || formattedEvent);
                    }}
                    isCaptain={userIsCaptain}
                  />
                </View>
              }
            />
          </View>

          {/* Competition Winners - Hidden for now */}
          {/* <CompetitionWinnersCard
            teamId={data.team?.id || ''}
            winners={competitionWinners}
            loading={winnersLoading}
          /> */}
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
  teamNameSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  teamNameText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: theme.colors.text,
    textAlign: 'center',
  },
  // bottomSection removed - no longer needed with tabs
});

export default EnhancedTeamScreen;