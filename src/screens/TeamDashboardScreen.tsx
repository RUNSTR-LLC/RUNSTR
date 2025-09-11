/**
 * TeamDashboardScreen - Individual team dashboard accessed from team cards
 * Shows team info, League/Events/Challenges, and join/captain functionality
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

// Components
import { AboutPrizeSection } from '../components/team/AboutPrizeSection';
import { TeamMembersSection } from '../components/team/TeamMembersSection';
import { EventsCard } from '../components/team/EventsCard';
import { ChallengesCard } from '../components/team/ChallengesCard';

// Services
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
import { CaptainDetectionService } from '../services/team/captainDetectionService';
import { NostrCompetitionLeaderboardService } from '../services/competition/nostrCompetitionLeaderboardService';
import { CompetitionService } from '../services/competition/competitionService';

// Types
import { DiscoveryTeam, User } from '../types';
import { TeamMember } from '../components/team/TeamMemberItem';

interface TeamDashboardScreenProps {
  team: DiscoveryTeam;
  userIsMember: boolean;
  currentUser: User;
  onBack: () => void;
  onJoinTeam: () => void;
  onCaptainDashboard: () => void;
  navigation?: any; // Navigation for event/challenge detail screens
}

export const TeamDashboardScreen: React.FC<TeamDashboardScreenProps> = ({
  team,
  userIsMember,
  currentUser,
  onBack,
  onJoinTeam,
  onCaptainDashboard,
  navigation,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [leagueData, setLeagueData] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [challengesData, setChallengesData] = useState<any[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);

  // Check if current user is captain of this team
  useEffect(() => {
    const checkCaptainStatus = async () => {
      try {
        if (!currentUser?.npub) return;
        
        const captainDetection = CaptainDetectionService.getInstance();
        
        // Check if user's npub matches the team captain
        const userIsCaptain = team.captainId === currentUser.npub || 
                             team.captainId === currentUser.id;
        
        setIsCaptain(userIsCaptain);
        
        if (userIsCaptain) {
          console.log(`👑 User is captain of team: ${team.name}`);
        }
      } catch (error) {
        console.error('Failed to check captain status:', error);
      }
    };

    checkCaptainStatus();
  }, [team.captainId, currentUser]);

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setMembersLoading(true);
        const nostrTeamService = getNostrTeamService();
        const cachedTeams = nostrTeamService.getCachedTeams();
        const nostrTeam = cachedTeams.find((t) => t.id === team.id);
        
        if (nostrTeam) {
          const memberIds = await nostrTeamService.getTeamMembers(nostrTeam);
          
          // Convert member IDs to TeamMember objects
          const members: TeamMember[] = memberIds.map((memberId, index) => ({
            id: memberId,
            name: `Member ${index + 1}`, // TODO: Get actual names from Nostr profiles
            status: 'active' as const,
            activityCount: Math.floor(Math.random() * 10), // TODO: Get real activity data
            imageUrl: undefined,
          }));
          
          setTeamMembers(members);
        }
      } catch (error) {
        console.error('Failed to fetch team members:', error);
        setTeamMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchTeamMembers();
  }, [team.id]);

  // Fetch competitions data (leagues, events, challenges)
  useEffect(() => {
    const fetchCompetitionsData = async () => {
      try {
        setCompetitionsLoading(true);
        const nostrTeamService = getNostrTeamService();
        const cachedTeams = nostrTeamService.getCachedTeams();
        const nostrTeam = cachedTeams.find((t) => t.id === team.id);
        
        if (nostrTeam) {
          const competitionService = CompetitionService.getInstance();
          const leaderboardService = NostrCompetitionLeaderboardService.getInstance();
          
          // Fetch team competitions
          const competitions = await competitionService.getTeamCompetitions(nostrTeam);
          
          // Separate into events and leagues
          const events = competitions.filter(c => c.type === 'event');
          const leagues = competitions.filter(c => c.type === 'league');
          
          setEventsData(events);
          
          // For league data, fetch the actual leaderboard
          const leagueWithLeaderboards = await Promise.all(
            leagues.map(async (league) => {
              try {
                const leaderboard = await leaderboardService.computeLeagueLeaderboard(
                  nostrTeam,
                  league,
                  currentUser?.id || 'current_user_id'
                );
                return {
                  ...league,
                  leaderboard,
                  participants: leaderboard.participants.map(p => ({
                    id: p.pubkey,
                    name: p.name || `User ${p.pubkey.substring(0, 8)}`,
                    score: p.score,
                    position: p.position,
                    totalDistance: p.totalDistance,
                    totalDuration: p.totalDuration,
                    workoutCount: p.workoutCount,
                  })),
                };
              } catch (error) {
                console.error(`Failed to load leaderboard for league ${league.id}:`, error);
                return league;
              }
            })
          );
          
          setLeagueData(leagueWithLeaderboards);
          
          // For now, mock some challenges since they're not stored in competitions
          const mockChallenges = [
            {
              id: 'challenge-1',
              name: '5K Challenge',
              description: 'Run 5km in under 30 minutes',
              status: 'active',
              deadline: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
              participants: 2,
              prize: 500,
            },
            {
              id: 'challenge-2', 
              name: 'Weekly Distance',
              description: 'Complete 25km this week',
              status: 'pending',
              deadline: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
              participants: 3,
              prize: 1000,
            }
          ];
          
          setChallengesData(mockChallenges);
        }
      } catch (error) {
        console.error('Failed to fetch competitions data:', error);
        setLeagueData([]);
        setEventsData([]);
        setChallengesData([]);
      } finally {
        setCompetitionsLoading(false);
      }
    };

    fetchCompetitionsData();
  }, [team.id, currentUser?.id]);

  const handleJoinTeam = async () => {
    try {
      setIsLoading(true);
      
      Alert.alert(
        'Join Team',
        `Are you sure you want to join ${team.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join',
            onPress: async () => {
              try {
                // Use NostrTeamService for pure Nostr joining
                const nostrTeamService = getNostrTeamService();
                const cachedTeams = nostrTeamService.getCachedTeams();
                const nostrTeam = cachedTeams.find((t) => t.id === team.id);

                if (nostrTeam) {
                  const joinResult = await nostrTeamService.joinTeam(nostrTeam);

                  if (joinResult.success) {
                    Alert.alert(
                      'Success!',
                      `Welcome to ${team.name}! Start earning Bitcoin through fitness challenges.`,
                      [{ text: 'OK', onPress: onJoinTeam }]
                    );
                  } else {
                    throw new Error(joinResult.error || 'Failed to join team');
                  }
                } else {
                  throw new Error('Team not found');
                }
              } catch (error) {
                console.error('Failed to join team:', error);
                Alert.alert(
                  'Join Failed',
                  error instanceof Error ? error.message : 'Unable to join team. Please try again.'
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleJoinTeam:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Real data - fetched from Nostr competitions and leaderboard service

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button and team name */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {team.name}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentInner}>
          {/* Team Info and Join/Captain Buttons */}
          <View style={styles.teamInfoSection}>
            <AboutPrizeSection
              description={team.description}
              prizePool={team.prizePool}
              onCaptainDashboard={isCaptain ? onCaptainDashboard : () => {}}
              isCaptain={isCaptain}
            />

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {!userIsMember && (
                <TouchableOpacity
                  style={[styles.joinButton, isLoading && styles.joinButtonDisabled]}
                  onPress={handleJoinTeam}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.joinButtonText}>
                    {isLoading ? 'Joining...' : 'Join Team'}
                  </Text>
                </TouchableOpacity>
              )}

              {isCaptain && (
                <TouchableOpacity
                  style={styles.captainButton}
                  onPress={onCaptainDashboard}
                  activeOpacity={0.8}
                >
                  <Text style={styles.captainButtonText}>Captain Dashboard</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Team Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Team Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{team.memberCount}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{team.stats.avgPace}</Text>
                <Text style={styles.statLabel}>Avg Pace</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{team.stats.activeEvents}</Text>
                <Text style={styles.statLabel}>Events</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{team.stats.activeChallenges}</Text>
                <Text style={styles.statLabel}>Challenges</Text>
              </View>
            </View>
          </View>

          {/* Team Members */}
          <TeamMembersSection 
            members={teamMembers}
            onInvite={() => console.log('Invite member pressed')}
            onEditMember={(memberId) => console.log('Edit member:', memberId)}
            onKickMember={(memberId) => console.log('Kick member:', memberId)}
          />

          {/* League Leaderboards */}
          {leagueData.length > 0 && (
            <View style={styles.leagueSection}>
              <Text style={styles.sectionTitle}>Active Leagues</Text>
              {leagueData.map((league, index) => (
                <View key={league.id || index} style={styles.leagueCard}>
                  <View style={styles.leagueHeader}>
                    <Text style={styles.leagueName}>{league.name}</Text>
                    <Text style={styles.leagueType}>
                      {league.scoringMethod || 'Distance Competition'}
                    </Text>
                  </View>
                  
                  {league.participants && league.participants.length > 0 && (
                    <View style={styles.leaderboardPreview}>
                      <Text style={styles.leaderboardTitle}>Current Standings:</Text>
                      {league.participants.slice(0, 3).map((participant: any, idx: number) => (
                        <View key={participant.id} style={styles.participantRow}>
                          <Text style={styles.participantPosition}>#{participant.position}</Text>
                          <Text style={styles.participantName}>{participant.name}</Text>
                          <Text style={styles.participantScore}>
                            {Math.round(participant.score)} pts
                          </Text>
                        </View>
                      ))}
                      {league.participants.length > 3 && (
                        <Text style={styles.moreParticipants}>
                          +{league.participants.length - 3} more participants
                        </Text>
                      )}
                    </View>
                  )}
                  
                  {(!league.participants || league.participants.length === 0) && (
                    <Text style={styles.noDataText}>No workout data yet</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Events/Challenges Section */}
          <View style={styles.bottomSection}>
            <EventsCard 
              events={eventsData} 
              onEventPress={(eventId) => {
                if (navigation) {
                  // EventDetailScreen now uses NostrCompetitionLeaderboardService for real data
                  navigation.navigate('EventDetail', { eventId });
                } else {
                  console.log('Event pressed but no navigation available:', eventId);
                }
              }}
              onAddEvent={() => console.log('Add event pressed')}
              isCaptain={isCaptain}
            />

            <ChallengesCard
              challenges={challengesData}
              onAddChallenge={() => console.log('Add challenge pressed')}
              onChallengePress={(challengeId) => {
                if (navigation) {
                  // ChallengeDetailScreen now uses NostrCompetitionLeaderboardService for real data  
                  navigation.navigate('ChallengeDetail', { challengeId });
                } else {
                  console.log('Challenge pressed but no navigation available:', challengeId);
                }
              }}
            />
          </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginHorizontal: 16,
  },

  headerRight: {
    width: 40, // Spacer to balance the back button
  },

  content: {
    flex: 1,
  },

  contentInner: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },

  teamInfoSection: {
    gap: 16,
  },

  actionButtons: {
    gap: 12,
  },

  joinButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  joinButtonDisabled: {
    opacity: 0.6,
  },

  joinButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  captainButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  captainButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  statsSection: {
    gap: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statValue: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  bottomSection: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 300,
  },

  // League leaderboard styles
  leagueSection: {
    gap: 12,
  },

  leagueCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  leagueHeader: {
    marginBottom: 12,
  },

  leagueName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  leagueType: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  leaderboardPreview: {
    gap: 8,
  },

  leaderboardTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 4,
  },

  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },

  participantPosition: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    width: 30,
  },

  participantName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 8,
  },

  participantScore: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  moreParticipants: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 4,
    fontStyle: 'italic',
  },

  noDataText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
});