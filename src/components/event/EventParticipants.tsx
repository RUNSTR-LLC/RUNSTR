/**
 * EventParticipants Component - Event participants list section
 * Matches HTML mockup: participants-section, participant-item, participant-avatar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export interface EventParticipant {
  id: string;
  name: string;
  avatar: string; // Single letter
  isCompleted?: boolean;
}

export interface EventParticipantsProps {
  participants: EventParticipant[];
  totalCount: number;
}

export const EventParticipants: React.FC<EventParticipantsProps> = ({
  participants,
  totalCount,
}) => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Participants</Text>
        <View style={styles.participantCount}>
          <Text style={styles.countText}>{totalCount} joined</Text>
        </View>
      </View>

      {/* Participants List */}
      <View style={styles.participantsList}>
        {participants.map((participant) => (
          <View key={participant.id} style={styles.participantItem}>
            <View style={styles.participantAvatar}>
              <Text style={styles.avatarText}>{participant.avatar}</Text>
            </View>
            <Text style={styles.participantName}>{participant.name}</Text>
            <View
              style={[
                styles.participantStatus,
                participant.isCompleted && styles.participantStatusCompleted,
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  // Section header - exact CSS: display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  // Section title - exact CSS: font-size: 16px; font-weight: 600;
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  // Participants count badge - exact CSS: font-size: 12px; color: #666; background: #1a1a1a; padding: 4px 8px; border-radius: 6px;
  participantCount: {
    backgroundColor: theme.colors.border,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.small,
  },
  countText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  // Participants list - exact CSS: display: flex; flex-wrap: wrap; gap: 12px;
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // Participant item - exact CSS: display: flex; align-items: center; gap: 8px; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px; padding: 8px 12px; flex-basis: calc(50% - 6px);
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '47%', // Equivalent to flex-basis: calc(50% - 6px) with gap
  },
  // Participant avatar - exact CSS: width: 28px; height: 28px; background: #333; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;
  participantAvatar: {
    width: 28,
    height: 28,
    backgroundColor: theme.colors.syncBackground,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  // Participant name - exact CSS: font-size: 13px; font-weight: 500; flex: 1;
  participantName: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  // Participant status indicator - exact CSS: width: 6px; height: 6px; border-radius: 50%; background: #333;
  participantStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.syncBackground,
  },
  // Completed status - exact CSS: background: #fff;
  participantStatusCompleted: {
    backgroundColor: theme.colors.text,
  },
});
