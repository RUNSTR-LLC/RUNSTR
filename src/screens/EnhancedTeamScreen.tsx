/**
 * EnhancedTeamScreen - Team screen with integrated captain detection
 * Integrates useCaptainDetection hook with existing team display logic
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCharityById } from '../constants/charities';
import { NutzapLightningButton } from '../components/nutzap/NutzapLightningButton';
import { TeamHeader } from '../components/team/TeamHeader';
import { AboutPrizeSection } from '../components/team/AboutPrizeSection';
import { LeaderboardCard } from '../components/team/LeaderboardCard';
import { SimpleLeagueDisplay } from '../components/team/SimpleLeagueDisplay';
import { LeaguesCard } from '../components/team/LeaguesCard';
import { EventsCard } from '../components/team/EventsCard';
// import { CompetitionWinnersCard, CompetitionWinner } from '../components/team/CompetitionWinnersCard';
// import competitionWinnersService from '../services/competitions/competitionWinnersService';
import { CompetitionTabs } from '../components/team/CompetitionTabs';
import { TeamChatSection } from '../components/team/TeamChatSection';
import { TeamScreenData } from '../types';
import { theme } from '../styles/theme';
import { useUserStore } from '../store/userStore';
import { isTeamMember } from '../utils/teamUtils';
import { getUserNostrIdentifiers } from '../utils/nostr';

interface EnhancedTeamScreenProps {
  data: TeamScreenData;
  onBack: () => void;
  onCaptainDashboard: () => void;
  onAddChallenge: () => void;
  onAddEvent?: () => void;
  onEventPress?: (eventId: string, eventData?: any) => void;
  onLeaguePress?: (leagueId: string, leagueData?: any) => void;
  onChallengePress?: (challengeId: string) => void;
  showJoinButton?: boolean;
  userIsMemberProp?: boolean;
  currentUserNpub?: string; // Passed from navigation to avoid AsyncStorage corruption
  userIsCaptain?: boolean; // Passed from navigation to avoid recalculation
}

export const EnhancedTeamScreen: React.FC<EnhancedTeamScreenProps> = ({
  data,
  onBack,
  onCaptainDashboard,
  onAddChallenge,
  onAddEvent,
  onEventPress,
  onLeaguePress,
  onChallengePress,
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

  // Simple state for team members and leagues
  const [teamMembers, setTeamMembers] = React.useState<string[]>([]);
  const [allLeagues, setAllLeagues] = React.useState<any[]>([]);
  const [loadingLeagues, setLoadingLeagues] = React.useState(true);

  // Memoized fetch function to prevent re-render cascades
  const fetchTeamMembers = useCallback(async () => {
    if (!team.id || !team.captainId) {
      console.warn(`⚠️ Cannot fetch team members: ${!team.id ? 'missing teamId' : ''} ${!team.captainId ? 'missing captainId' : ''}`);
      return;
    }

    try {
      console.log(`🔍 Fetching team members for ${team.name}`);
      const memberCache = (await import('../services/team/TeamMemberCache')).TeamMemberCache.getInstance();
      const members = await memberCache.getTeamMembers(team.id, team.captainId);
      setTeamMembers(members);
      console.log(`✅ Loaded ${members.length} team members`);
    } catch (error) {
      console.error('❌ Failed to load team members:', error);
      setTeamMembers([]);
    }
  }, [team.id, team.captainId, team.name]);

  // Fetch team members (only after relays are ready)
  React.useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Memoized leagues fetching function to prevent re-render cascades
  const fetchAllLeagues = useCallback(async () => {
    if (!team.id) {
      setLoadingLeagues(false);
      return;
    }

    setLoadingLeagues(true);

    try {
      console.log('📋 Fetching all leagues for team:', team.name);

      const SimpleCompetitionService = (await import('../services/competition/SimpleCompetitionService')).default;
      const leagues = await SimpleCompetitionService.getTeamLeagues(team.id);

      console.log(`✅ Found ${leagues.length} leagues for ${team.name}`);
      setAllLeagues(leagues);
    } catch (error) {
      console.error('❌ Failed to fetch leagues:', error);
      setAllLeagues([]);
    } finally {
      setLoadingLeagues(false);
    }
  }, [team.id, team.name]);

  // Fetch all leagues on mount
  React.useEffect(() => {
    fetchAllLeagues();
  }, [fetchAllLeagues]);


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

  // Competition winners state - commented out for now
  // const [competitionWinners, setCompetitionWinners] = useState<CompetitionWinner[]>([]);
  // const [winnersLoading, setWinnersLoading] = useState(false);

  // Events state
  const [nostrEvents, setNostrEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Memoized events fetching function to prevent re-render cascades
  const fetchTeamEvents = useCallback(async () => {
    if (!team?.id) {
      setLoadingEvents(false);
      return;
    }

    setLoadingEvents(true);

    try {
      console.log('🔍 Fetching events for team:', team.name);

      // Use simple service
      const SimpleCompetitionService = (await import('../services/competition/SimpleCompetitionService')).default;
      const events = await SimpleCompetitionService.getTeamEvents(team.id);

      console.log(`✅ Found ${events.length} events`);

      // Format for display
      const formattedEvents = events.map(event => ({
        ...event,
        date: new Date(event.eventDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        details: event.description || 'No description',
      }));

      setNostrEvents(formattedEvents);
    } catch (error) {
      console.error('❌ Failed to fetch events:', error);
      setNostrEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [team?.id, team?.name]);

  // Fetch events from Nostr (only after relays are ready)
  useEffect(() => {
    fetchTeamEvents();
  }, [fetchTeamEvents]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TeamHeader
        teamName={team.name}
        bannerImage={team.bannerImage}
        team={team} // Pass full team object for fallback extraction
        onBack={onBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentInner}>
          {/* Team Name Section */}
          <View style={styles.teamNameSection}>
            <Text style={styles.sectionLabel}>Team</Text>
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
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 44,
                  }}
                  disabled={captainLoading}
                >
                  <Text
                    style={{
                      color: theme.colors.accentText,
                      fontSize: 15,
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

              {/* Team Shop and Subscribe Buttons Row - HIDDEN FOR NOW */}
              {/* <View style={{ flexDirection: 'row', gap: 8 }}>
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
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: team.shopUrl ? 1 : 0.5,
                    minHeight: 36,
                  }}
                  disabled={!team.shopUrl}
                >
                  <Text
                    style={{
                      color: team.shopUrl ? theme.colors.primaryText : theme.colors.textTertiary,
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.85}
                  >
                    Team Shop
                  </Text>
                </TouchableOpacity>

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
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: team.flashUrl ? 1 : 0.5,
                    minHeight: 36,
                  }}
                  disabled={!team.flashUrl}
                >
                  <Text
                    style={{
                      color: team.flashUrl ? '#FFFFFF' : theme.colors.textTertiary,
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.85}
                  >
                    Subscribe
                  </Text>
                </TouchableOpacity>
              </View> */}
            </View>
          </View>

          {/* Competition Tabs - League, Events, and Chat */}
          <View style={{ flex: 1, marginTop: 16, minHeight: 500 }}>
            <CompetitionTabs
              leagueContent={
                <View style={{ flex: 1, minHeight: 450 }}>
                  <LeaguesCard
                    leagues={allLeagues}
                    onLeaguePress={(leagueId, leagueData) => {
                      console.log('📋 League pressed:', leagueId);
                      onLeaguePress?.(leagueId, leagueData);
                    }}
                    isCaptain={userIsCaptain}
                    onAddLeague={userIsCaptain ? () => {
                      // TODO: Add league creation handler
                      console.log('➕ Add league pressed');
                    } : undefined}
                  />
                </View>
              }
              eventsContent={
                <View style={{ flex: 1, minHeight: 450 }}>
                  <EventsCard
                    events={nostrEvents}
                    onEventPress={(eventId, eventData) => {
                      // Event data already has all needed fields from SimpleCompetitionService
                      onEventPress?.(eventId, eventData);
                    }}
                    isCaptain={userIsCaptain}
                    onAddEvent={userIsCaptain ? onAddEvent : undefined}
                  />
                </View>
              }
              chatContent={
                <View style={{ flex: 1, minHeight: 450 }}>
                  <TeamChatSection
                    teamId={team.id}
                    teamName={team.name}
                    userPubkey={userIdentifiers?.hexPubkey || workingUserNpub || ''}
                    captainPubkey={team.captainId}
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
    </SafeAreaView>
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
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  teamNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  // bottomSection removed - no longer needed with tabs
});

export default EnhancedTeamScreen;