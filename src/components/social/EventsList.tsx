import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { shouldShowEinundzwanzig } from '../../constants/einundzwanzig';
import { useDynamicCompetitions } from '../../hooks/useDynamicCompetitions';

interface EventsListProps {
  onLeaderboardPress: () => void;
  onEinundzwanzigPress: () => void;
  onDynamicEventPress: (eventId: string) => void;
}

interface EventRowProps {
  label: string;
  onPress: () => void;
}

const EventRow: React.FC<EventRowProps> = ({ label, onPress }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
    <Text style={styles.rowLabel} numberOfLines={1}>
      {label}
    </Text>
    <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
  </TouchableOpacity>
);

const MAX_VISIBLE_ROWS = 3;

export const EventsList: React.FC<EventsListProps> = ({
  onLeaderboardPress,
  onEinundzwanzigPress,
  onDynamicEventPress,
}) => {
  const { competitions, isLoading } = useDynamicCompetitions();
  const showEinundzwanzig = shouldShowEinundzwanzig();

  // Cap total visible rows. Daily Leaderboards is always first, then
  // Einundzwanzig (if active), then dynamic competitions filling remaining slots.
  const fixedCount = 1 + (showEinundzwanzig ? 1 : 0);
  const dynamicSlots = Math.max(0, MAX_VISIBLE_ROWS - fixedCount);
  const visibleCompetitions = competitions.slice(0, dynamicSlots);

  return (
    <View style={styles.container}>
      <EventRow label="Daily Leaderboards" onPress={onLeaderboardPress} />

      {showEinundzwanzig && (
        <EventRow label="Einundzwanzig Fitness" onPress={onEinundzwanzigPress} />
      )}

      {isLoading && competitions.length === 0 && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
        </View>
      )}

      {visibleCompetitions.map((comp) => (
        <EventRow
          key={comp.id}
          label={comp.name}
          onPress={() => onDynamicEventPress(comp.id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.regular,
    marginRight: 12,
  },
  loader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
