import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { FormattedEvent } from '../../types';
import { theme } from '../../styles/theme';

interface EventsCardProps {
  events: FormattedEvent[];
  onEventPress?: (eventId: string, event?: FormattedEvent) => void;
  onAddEvent?: () => void;
  isCaptain?: boolean;
}

export const EventsCard: React.FC<EventsCardProps> = ({
  events,
  onEventPress,
  onAddEvent,
  isCaptain = false,
}) => {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        {isCaptain && onAddEvent && (
          <TouchableOpacity onPress={onAddEvent} style={styles.addButton}>
            <Ionicons name="add" size={16} color={theme.colors.background} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollableList}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
      >
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventItem}
            onPress={() => onEventPress?.(event.id, event)}
            activeOpacity={0.7}
          >
            <View style={styles.eventHeader}>
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventDate}>{event.date}</Text>
            </View>
            <Text style={styles.eventDetails}>{event.details}</Text>
            {event.prizePoolSats !== undefined && (
              <Text style={styles.prizePool}>
                Prize Pool: {event.prizePoolSats === 0 ? 'N/A' : `${event.prizePoolSats.toLocaleString()} sats`}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollableList: {
    flex: 1,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  eventItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  eventName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 16,
    flex: 1,
    marginRight: 8,
  },
  eventDate: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    flexShrink: 0,
  },
  eventDetails: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 14,
  },
  prizePool: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 4,
  },
});
