import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from './Avatar';
import type { EventParticipant } from '../../types';

interface ParticipantListProps {
  participants: EventParticipant[];
  participantsCount?: number;
  style?: ViewStyle;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  participantsCount,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Participants</Text>
        {participantsCount && (
          <Text style={styles.count}>{participantsCount} joined</Text>
        )}
      </View>
      <View style={styles.participantGrid}>
        {participants.map((participant) => (
          <ParticipantItem key={participant.id} participant={participant} />
        ))}
      </View>
    </View>
  );
};

interface ParticipantItemProps {
  participant: EventParticipant;
  style?: ViewStyle;
}

export const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  style,
}) => {
  const isCompleted = participant.status === 'completed';

  return (
    <View style={[styles.participantItem, style]}>
      <Avatar
        name={participant.name}
        size={28}
        style={styles.participantAvatar}
      />
      <Text style={styles.participantName} numberOfLines={1}>
        {participant.name}
      </Text>
      <View
        style={[
          styles.participantStatus,
          isCompleted && styles.participantStatusCompleted,
        ]}
      />
    </View>
  );
};

interface ParticipantGridProps {
  participants: EventParticipant[];
  maxVisible?: number;
  style?: ViewStyle;
}

export const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  participants,
  maxVisible = 6,
  style,
}) => {
  const visibleParticipants = participants.slice(0, maxVisible);

  return (
    <View style={[styles.participantGrid, style]}>
      {visibleParticipants.map((participant) => (
        <ParticipantItem key={participant.id} participant={participant} />
      ))}
    </View>
  );
};

interface ParticipantsHeaderProps {
  title?: string;
  count?: number;
  style?: ViewStyle;
}

export const ParticipantsHeader: React.FC<ParticipantsHeaderProps> = ({
  title = 'Participants',
  count,
  style,
}) => {
  return (
    <View style={[styles.header, style]}>
      <Text style={styles.title}>{title}</Text>
      {count && <Text style={styles.count}>{count} joined</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xxxl,
  },

  // Section header (matches HTML mockup .section-header)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },

  // Section title (matches HTML mockup .section-title)
  title: {
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // Participants count (matches HTML mockup .participants-count)
  count: {
    fontSize: theme.typography.prizeCurrency,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.small,
  },

  // Participants grid (matches HTML mockup .participants-list)
  participantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xl,
  },

  // Individual participant item (matches HTML mockup .participant-item)
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    // flex-basis: calc(50% - 6px) equivalent
    width: '47%', // Roughly 50% minus gap
  },

  // Participant avatar (matches HTML mockup .participant-avatar)
  participantAvatar: {
    width: 28,
    height: 28,
    backgroundColor: theme.colors.syncBackground,
    borderRadius: 14,
  },

  // Participant name (matches HTML mockup .participant-name)
  participantName: {
    fontSize: theme.typography.eventName,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
  },

  // Status indicator (matches HTML mockup .participant-status)
  participantStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.syncBackground,
  },

  // Completed status (matches HTML mockup .participant-status.completed)
  participantStatusCompleted: {
    backgroundColor: theme.colors.accent,
  },
});
