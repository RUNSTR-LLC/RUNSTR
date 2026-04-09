/**
 * Season3Screen — Main Season III Club Battles screen
 *
 * Three phases: Registration, Tournament (live bracket), Completed.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useSeason3 } from '../../hooks/useSeason3';
import { MatchupCard } from '../../components/season3/MatchupCard';
import { BracketView } from '../../components/season3/BracketView';
import { QualifiedClubsList } from '../../components/season3/QualifiedClubsList';
import { SEASON_3_CONFIG } from '../../constants/season3';

export const Season3Screen: React.FC = () => {
  const navigation = useNavigation();
  const {
    bracket,
    todaysMatchup,
    liveScores,
    qualifiedClubs,
    notQualifiedClubs,
    config,
    champion,
    runnerUp,
    tournamentPhase,
    isLoading,
    refresh,
  } = useSeason3();

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  // Countdown text
  const countdownText = useMemo(() => {
    const deadline = new Date(SEASON_3_CONFIG.registrationDeadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? 's' : ''} until bracket reveal`;
  }, []);

  // Upcoming schedule (next 5 matches)
  const upcomingMatches = useMemo(() => {
    return bracket
      .filter(m => m.status === 'scheduled' || m.status === 'pending')
      .filter(m => m.club_a_id || m.club_b_id)
      .slice(0, 5);
  }, [bracket]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons
          name="chevron-back"
          size={24}
          color={theme.colors.text}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>SEASON III</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* How It Works — collapsible */}
        <TouchableOpacity
          style={styles.howItWorksHeader}
          onPress={() => setHowItWorksOpen(!howItWorksOpen)}
          activeOpacity={0.7}
        >
          <Text style={styles.howItWorksTitle}>HOW IT WORKS</Text>
          <Ionicons
            name={howItWorksOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>

        {howItWorksOpen && (
          <View style={styles.howItWorksContent}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Create or join a Fitness Club</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Get 4+ members by May 15</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Bracket randomly drawn. One matchup per day.</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>4</Text>
              <Text style={styles.stepText}>Top 4 steppers from each club count. Lose twice, you're out.</Text>
            </View>
            <View style={styles.prizeLine}>
              <Ionicons name="trophy-outline" size={14} color={theme.colors.accent} />
              <Text style={styles.prizeText}>100K rewards for 1st place, 50K for 2nd</Text>
            </View>
          </View>
        )}

        {/* ── Registration Phase ── */}
        {(tournamentPhase === 'registration' || tournamentPhase === 'bracket_set') && (
          <>
            {countdownText && (
              <View style={styles.countdown}>
                <Ionicons name="time-outline" size={16} color={theme.colors.accent} />
                <Text style={styles.countdownText}>{countdownText}</Text>
              </View>
            )}

            <View style={styles.section}>
              <QualifiedClubsList
                qualified={qualifiedClubs}
                notQualified={notQualifiedClubs}
                maxClubs={config?.max_clubs ?? 16}
              />
            </View>

            {/* Empty bracket preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BRACKET</Text>
              <BracketView matchups={bracket} />
            </View>
          </>
        )}

        {/* ── Tournament Phase ── */}
        {tournamentPhase === 'active' && (
          <>
            {/* Today's Matchup */}
            {todaysMatchup && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TODAY'S BATTLE</Text>
                <MatchupCard
                  matchup={todaysMatchup}
                  liveScores={liveScores}
                  isHero
                />
              </View>
            )}

            {!todaysMatchup && (
              <View style={styles.section}>
                <Text style={styles.noMatchText}>No battle today. Next match coming soon.</Text>
              </View>
            )}

            {/* Bracket */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BRACKET</Text>
              <BracketView matchups={bracket} />
            </View>

            {/* Upcoming Schedule */}
            {upcomingMatches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>UPCOMING</Text>
                {upcomingMatches.map((m) => (
                  <View key={m.id} style={styles.scheduleRow}>
                    <Text style={styles.scheduleDate}>{m.match_date ?? 'TBD'}</Text>
                    <Text style={styles.scheduleTeams}>
                      {m.club_a_name ?? 'TBD'} vs {m.club_b_name ?? 'TBD'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Completed Phase ── */}
        {tournamentPhase === 'completed' && (
          <>
            {champion && (
              <View style={styles.championBanner}>
                <Ionicons name="trophy" size={32} color={theme.colors.accent} />
                <Text style={styles.championTitle}>CHAMPION</Text>
                <Text style={styles.championName}>
                  {bracket.find(m => m.club_a_id === champion)?.club_a_name
                    ?? bracket.find(m => m.club_b_id === champion)?.club_b_name
                    ?? 'Unknown'}
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FINAL BRACKET</Text>
              <BracketView matchups={bracket} />
            </View>
          </>
        )}
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
  headerTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 2,
  },
  scrollView: {
    flex: 1,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  howItWorksTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  howItWorksContent: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  stepText: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },
  prizeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  prizeText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  noMatchText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  scheduleDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    width: 80,
  },
  scheduleTeams: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
  },
  championBanner: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  championTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 2,
    marginTop: 8,
  },
  championName: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 4,
  },
});

export default Season3Screen;
