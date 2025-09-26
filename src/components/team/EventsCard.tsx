import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import NostrCompetitionParticipantService from '../../services/nostr/NostrCompetitionParticipantService';

interface EventsCardProps {
  events: FormattedEvent[];
  onEventPress?: (eventId: string, event?: FormattedEvent) => void;
  onAddEvent?: () => void;
  isCaptain?: boolean;
}

interface EventStatus {
  isJoined: boolean;
  isActive: boolean;
  isCompleted: boolean;
}

export const EventsCard: React.FC<EventsCardProps> = ({
  events,
  onEventPress,
  onAddEvent,
  isCaptain = false,
}) => {
  const [eventStatuses, setEventStatuses] = useState<Record<string, EventStatus>>({});
  const [currentUserNpub, setCurrentUserNpub] = useState<string | null>(null);
  const participantService = NostrCompetitionParticipantService.getInstance();

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const npub = await AsyncStorage.getItem('@runstr:npub');
        if (npub) {
          setCurrentUserNpub(npub);
        }
      } catch (error) {
        console.log('Could not load current user npub');
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const checkEventStatuses = async () => {
      if (!currentUserNpub) return;

      const statuses: Record<string, EventStatus> = {};

      for (const event of events) {
        try {
          // Check if event is active (based on date)
          const now = new Date();
          const eventDate = new Date(event.startDate || event.date);
          const isActive = eventDate.toDateString() === now.toDateString();
          const isCompleted = eventDate < now;

          // Check if user has joined this event
          const participantList = await participantService.getParticipantList(event.id);
          const isJoined = participantList?.participants.some(
            p => p.npub === currentUserNpub || p.hexPubkey === currentUserNpub
          ) || false;

          statuses[event.id] = {
            isJoined,
            isActive,
            isCompleted
          };
        } catch (error) {
          console.log(`Could not check status for event ${event.id}`);
          statuses[event.id] = {
            isJoined: false,
            isActive: false,
            isCompleted: false
          };
        }
      }

      setEventStatuses(statuses);
    };

    checkEventStatuses();
  }, [events, currentUserNpub]);
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
              <View style={styles.eventTitleRow}>
                <Text style={styles.eventName}>{event.name}</Text>
                {eventStatuses[event.id] && (
                  <View style={styles.statusBadges}>
                    {eventStatuses[event.id].isJoined && (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Joined</Text>
                      </View>
                    )}
                    {eventStatuses[event.id].isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.statusText}>Active</Text>
                      </View>
                    )}
                    {eventStatuses[event.id].isCompleted && !eventStatuses[event.id].isJoined && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.statusText}>Past</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
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
    flexDirection: 'column',
    marginBottom: 3,
  },

  eventTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },

  statusBadges: {
    flexDirection: 'row',
    gap: 4,
  },

  statusBadge: {
    borderWidth: 1,
    borderColor: theme.colors.text + '60',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  activeBadge: {
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  completedBadge: {
    borderWidth: 1,
    borderColor: theme.colors.textMuted + '60',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  statusText: {
    fontSize: 9,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
