/**
 * EventsContent - Embeddable events feed for Compete screen toggle
 * Shows hardcoded event cards (no Nostr fetch)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { RunningBitcoinEventCard } from '../events/RunningBitcoinEventCard';
import { EinundzwanzigEventCard } from '../events/EinundzwanzigEventCard';
import { JanuaryWalkingEventCard } from '../events/JanuaryWalkingEventCard';
import { Season2EventCard } from '../events/Season2EventCard';
import { LeaderboardEventCard } from '../events/LeaderboardEventCard';
import { DynamicEventCard } from '../events/DynamicEventCard';
import { shouldShowRunningBitcoin } from '../../constants/runningBitcoin';
import { shouldShowEinundzwanzig } from '../../constants/einundzwanzig';
import { shouldShowJanuaryWalking } from '../../constants/januaryWalking';
import { useDynamicCompetitions } from '../../hooks/useDynamicCompetitions';
import type { SatlantisEvent } from '../../types/satlantis';

interface EventsContentProps {
  onEventPress: (event: SatlantisEvent) => void;
  onCreateEvent?: () => void;
  onRunningBitcoinPress?: () => void;
  onEinundzwanzigPress?: () => void;
  onJanuaryWalkingPress?: () => void;
  onSeason2Press?: () => void;
  onLeaderboardPress?: () => void;
  onDynamicEventPress?: (eventId: string) => void;
}

export const EventsContent: React.FC<EventsContentProps> = ({
  onCreateEvent,
  onRunningBitcoinPress,
  onEinundzwanzigPress,
  onJanuaryWalkingPress,
  onSeason2Press,
  onLeaderboardPress,
  onDynamicEventPress,
}) => {
  const { t } = useTranslation('events');
  const { competitions: dynamicCompetitions } = useDynamicCompetitions();
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

      {/* 1. Running Bitcoin Challenge - show during event + 7 days after for results */}
      {shouldShowRunningBitcoin() && (
        <View style={styles.featuredEvent}>
          <RunningBitcoinEventCard onPress={onRunningBitcoinPress} />
        </View>
      )}

      {/* 2. RUNSTR Season II */}
      <View style={styles.featuredEvent}>
        <Season2EventCard onPress={onSeason2Press} />
      </View>

      {/* 3. Daily Leaderboards */}
      <View style={styles.featuredEvent}>
        <LeaderboardEventCard onPress={onLeaderboardPress} />
      </View>

      {/* 4. January Walking Contest - show during event + 7 days after for results */}
      {shouldShowJanuaryWalking() && (
        <View style={styles.featuredEvent}>
          <JanuaryWalkingEventCard onPress={onJanuaryWalkingPress} />
        </View>
      )}

      {/* 5. Einundzwanzig Fitness Challenge - show during event + 7 days after for results */}
      {shouldShowEinundzwanzig() && (
        <View style={styles.featuredEvent}>
          <EinundzwanzigEventCard onPress={onEinundzwanzigPress} />
        </View>
      )}

      {/* Dynamic Supabase Events */}
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
