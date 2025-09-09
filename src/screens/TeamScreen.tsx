import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { TeamHeader } from '../components/team/TeamHeader';
import { AboutPrizeSection } from '../components/team/AboutPrizeSection';
import { LeaderboardCard } from '../components/team/LeaderboardCard';
import { EventsCard } from '../components/team/EventsCard';
import { ChallengesCard } from '../components/team/ChallengesCard';
import { TeamScreenData } from '../types';
import { theme } from '../styles/theme';

interface TeamScreenProps {
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
  isCaptain: boolean;
  showJoinButton?: boolean;
  userIsMember?: boolean;
}

export const TeamScreen: React.FC<TeamScreenProps> = ({
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
  isCaptain,
  showJoinButton = false,
  userIsMember = true,
}) => {
  const { team, leaderboard, events, challenges } = data;

  // Format data for display components
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
            onCaptainDashboard={onCaptainDashboard}
            isCaptain={isCaptain}
          />

          <LeaderboardCard leaderboard={formattedLeaderboard} />

          <View style={styles.bottomSection}>
            <EventsCard events={formattedEvents} onEventPress={onEventPress} />

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
