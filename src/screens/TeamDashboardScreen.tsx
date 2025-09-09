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
import { LeaderboardCard } from '../components/team/LeaderboardCard';
import { EventsCard } from '../components/team/EventsCard';
import { ChallengesCard } from '../components/team/ChallengesCard';

// Services
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
import { CaptainDetectionService } from '../services/team/captainDetectionService';

// Types
import { DiscoveryTeam, User } from '../types';

interface TeamDashboardScreenProps {
  team: DiscoveryTeam;
  userIsMember: boolean;
  currentUser: User;
  onBack: () => void;
  onJoinTeam: () => void;
  onCaptainDashboard: () => void;
}

export const TeamDashboardScreen: React.FC<TeamDashboardScreenProps> = ({
  team,
  userIsMember,
  currentUser,
  onBack,
  onJoinTeam,
  onCaptainDashboard,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);

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

  // Mock data for League/Events/Challenges (to be replaced with real Nostr data)
  const mockLeaderboard = [
    { userId: '1', name: 'Runner A', rank: 1, avatar: 'R', isTopThree: true },
    { userId: '2', name: 'Runner B', rank: 2, avatar: 'R', isTopThree: true },
    { userId: '3', name: 'Runner C', rank: 3, avatar: 'R', isTopThree: true },
  ];

  const mockEvents = [
    {
      id: '1',
      name: 'Weekly Run',
      date: 'Dec 15',
      details: '5K group run this Saturday',
    },
  ];

  const mockChallenges = [
    {
      id: '1',
      name: 'Distance Challenge',
      date: 'Dec 20',
      details: 'Complete 10K this week',
      prize: '1,000 sats',
      participant1: 'Alice',
      participant2: 'Bob',
      type: 'p2p' as const,
    },
  ];

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

          {/* Leaderboard */}
          <LeaderboardCard leaderboard={mockLeaderboard} />

          {/* League/Events/Challenges Section */}
          <View style={styles.bottomSection}>
            <EventsCard 
              events={mockEvents} 
              onEventPress={(eventId) => console.log('Event pressed:', eventId)} 
            />

            <ChallengesCard
              challenges={mockChallenges}
              onAddChallenge={() => console.log('Add challenge pressed')}
              onChallengePress={(challengeId) => console.log('Challenge pressed:', challengeId)}
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
});