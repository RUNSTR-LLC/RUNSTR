/**
 * EventCard - Component to display competition events in discovery feed
 * Shows event details like name, type, date, participants, and prize pool
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { EventRewardsModal } from '../event/EventRewardsModal';
import type {
  NostrLeagueDefinition,
  NostrEventDefinition,
} from '../../types/nostrCompetition';

interface EventCardProps {
  event: NostrLeagueDefinition | NostrEventDefinition;
  onPress: (event: NostrLeagueDefinition | NostrEventDefinition) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const isLeague = 'duration' in event;
  const eventType = isLeague ? 'League' : 'Event';

  // Format date display
  const getDateDisplay = () => {
    if (isLeague) {
      const league = event as NostrLeagueDefinition;
      const startDate = new Date(league.startDate);
      const endDate = new Date(league.endDate);
      return `${startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${endDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`;
    } else {
      const singleEvent = event as NostrEventDefinition;
      const eventDate = new Date(singleEvent.eventDate);
      return eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  // Get status badge color
  const getStatusColor = () => {
    const now = new Date();
    if (isLeague) {
      const league = event as NostrLeagueDefinition;
      const startDate = new Date(league.startDate);
      const endDate = new Date(league.endDate);
      if (now < startDate) return theme.colors.accent; // Upcoming
      if (now <= endDate) return theme.colors.success; // Active
      return theme.colors.textMuted; // Completed
    } else {
      const singleEvent = event as NostrEventDefinition;
      const eventDate = new Date(singleEvent.eventDate);
      const eventStart = new Date(eventDate);
      eventStart.setHours(0, 0, 0, 0);
      const eventEnd = new Date(eventDate);
      eventEnd.setHours(23, 59, 59, 999);
      if (now < eventStart) return theme.colors.accent; // Upcoming
      if (now <= eventEnd) return theme.colors.success; // Active
      return theme.colors.textMuted; // Completed
    }
  };

  // Get status text
  const getStatusText = () => {
    const now = new Date();
    if (isLeague) {
      const league = event as NostrLeagueDefinition;
      const startDate = new Date(league.startDate);
      const endDate = new Date(league.endDate);
      if (now < startDate) return 'Upcoming';
      if (now <= endDate) return 'Active';
      return 'Completed';
    } else {
      const singleEvent = event as NostrEventDefinition;
      const eventDate = new Date(singleEvent.eventDate);
      const eventStart = new Date(eventDate);
      eventStart.setHours(0, 0, 0, 0);
      if (now < eventStart) return 'Upcoming';
      const eventEnd = new Date(eventDate);
      eventEnd.setHours(23, 59, 59, 999);
      if (now <= eventEnd) return 'Today';
      return 'Completed';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      {/* Prize Pool Badge - Top Left */}
      {event.prizePoolSats && event.prizePoolSats > 0 && (
        <TouchableOpacity
          style={styles.prizePoolBadge}
          activeOpacity={0.7}
          onPress={(e) => {
            e.stopPropagation();
            setShowRewardsModal(true);
          }}
        >
          <Text style={styles.badgeText}>
            {event.prizePoolSats.toLocaleString()} rewards
          </Text>
        </TouchableOpacity>
      )}

      {/* Entry Fee Badge - Top Right */}
      {event.entryFeesSats > 0 && (
        <TouchableOpacity
          style={styles.entryFeeBadge}
          activeOpacity={0.7}
          onPress={(e) => {
            e.stopPropagation();
            if (event.prizePoolSats && event.prizePoolSats > 0) {
              setShowRewardsModal(true);
            }
          }}
        >
          <Text style={styles.badgeTextOrange}>
            {event.entryFeesSats.toLocaleString()} rewards
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.eventName}>{event.name}</Text>
          <View style={styles.typeRow}>
            <Text style={styles.eventType}>{eventType}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.activityType}>{event.activityType}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.competitionType}>{event.competitionType}</Text>
          </View>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}
        >
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{getDateDisplay()}</Text>
        </View>

        {event.entryFeesSats === 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Entry:</Text>
            <Text style={styles.detailValue}>Free</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Max:</Text>
          <Text style={styles.detailValue}>
            {event.maxParticipants === 0 ? 'Unlimited' : event.maxParticipants}{' '}
            participants
          </Text>
        </View>
      </View>

      {event.description && (
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>
      )}

      <TouchableOpacity style={styles.joinButton} activeOpacity={0.7}>
        <Text style={styles.joinButtonText}>View Details</Text>
      </TouchableOpacity>

      {/* Rewards Distribution Modal */}
      {event.prizePoolSats && event.prizePoolSats > 0 && (
        <EventRewardsModal
          visible={showRewardsModal}
          onClose={() => setShowRewardsModal(false)}
          prizePoolSats={event.prizePoolSats}
          entryFeesSats={event.entryFeesSats}
          participantCount={event.maxParticipants || 0}
          paymentDestination={
            'paymentDestination' in event ? event.paymentDestination : undefined
          }
          paymentRecipientName={
            'paymentRecipientName' in event
              ? event.paymentRecipientName
              : undefined
          }
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },

  // Badge overlays
  prizePoolBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 10,
  },

  entryFeeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: theme.colors.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  badgeTextOrange: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background, // Black text on orange badge
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventType: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  activityType: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  competitionType: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  separator: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginHorizontal: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    marginRight: 8,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
  },
  prizeValue: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.semiBold,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  joinButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  joinButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
});
