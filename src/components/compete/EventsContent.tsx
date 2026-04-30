/**
 * EventsContent - Embeddable events feed for Compete screen toggle
 * Shows event cards for Season II, daily leaderboards, and dynamic Supabase events
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { EinundzwanzigEventCard } from '../events/EinundzwanzigEventCard';
import { Season2EventCard } from '../events/Season2EventCard';
import { LeaderboardEventCard } from '../events/LeaderboardEventCard';
import { DynamicEventCard } from '../events/DynamicEventCard';
import { shouldShowEinundzwanzig } from '../../constants/einundzwanzig';
import { useDynamicCompetitions } from '../../hooks/useDynamicCompetitions';

interface EventsContentProps {
  onCreateEvent?: () => void;
  onEinundzwanzigPress?: () => void;
  onSeason2Press?: () => void;
  onLeaderboardPress?: () => void;
  onDynamicEventPress?: (eventId: string) => void;
}

export const EventsContent: React.FC<EventsContentProps> = ({
  onCreateEvent,
  onEinundzwanzigPress,
  onSeason2Press,
  onLeaderboardPress,
  onDynamicEventPress,
}) => {
  const { t } = useTranslation('events');
  const { competitions: dynamicCompetitions, isLoading } = useDynamicCompetitions();
  return (
    <View style={styles.container}>
      {/* Create Event Banner */}
      {onCreateEvent && (
        <TouchableOpacity
          style={styles.createEventBanner}
          onPress={onCreateEvent}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.text} />
          <Text style={styles.createEventText}>{t('createEvent', { defaultValue: 'Create Event' })}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* 1. RUNSTR Season III — hidden until tournament is dry-run tested */}
      {/* TODO 2026-05-19: re-enable Season III card after generate_season3_bracket() and resolve-season3-matchup are end-to-end verified */}
      {/* <View style={styles.featuredEvent}>
        <Season2EventCard onPress={onSeason2Press} />
      </View> */}

      {/* 2. Daily Leaderboards */}
      <View style={styles.featuredEvent}>
        <LeaderboardEventCard onPress={onLeaderboardPress} />
      </View>

      {/* 3. Einundzwanzig Fitness Challenge - show during event + 7 days after for results */}
      {shouldShowEinundzwanzig() && (
        <View style={styles.featuredEvent}>
          <EinundzwanzigEventCard onPress={onEinundzwanzigPress} />
        </View>
      )}

      {/* Dynamic Supabase Events */}
      {isLoading && dynamicCompetitions.length === 0 && (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      )}
      {dynamicCompetitions.map((comp) => (
        <View key={comp.external_id} style={styles.featuredEvent}>
          <DynamicEventCard
            competition={comp}
            onPress={() => onDynamicEventPress?.(comp.external_id)}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  featuredEvent: {
    marginBottom: 16,
  },
  createEventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    gap: 12,
  },
  createEventText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
  },
});

export default EventsContent;
