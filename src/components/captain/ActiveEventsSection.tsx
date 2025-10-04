/**
 * Active Events Section
 * Displays team's active events with QR code display options for captains
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface ActiveEvent {
  id: string;
  name: string;
  eventDate: string;
  activityType: string;
  entryFeesSats: number;
  participantCount?: number;
}

interface ActiveEventsSectionProps {
  events: ActiveEvent[];
  onShowQR: (event: ActiveEvent) => void;
}

export const ActiveEventsSection: React.FC<ActiveEventsSectionProps> = ({
  events,
  onShowQR,
}) => {
  if (events.length === 0) {
    return null; // Don't show section if no active events
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getActivityIcon = (activityType: string) => {
    const icons: Record<string, string> = {
      running: '🏃',
      walking: '🚶',
      cycling: '🚴',
      hiking: '🥾',
      swimming: '🏊',
      rowing: '🚣',
      workout: '💪',
    };
    return icons[activityType.toLowerCase()] || '🏃';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Active Events</Text>

      {events.map((event) => (
        <View key={event.id} style={styles.eventCard}>
          <View style={styles.eventInfo}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventIcon}>
                {getActivityIcon(event.activityType)}
              </Text>
              <View style={styles.eventDetails}>
                <Text style={styles.eventName} numberOfLines={1}>
                  {event.name}
                </Text>
                <Text style={styles.eventMeta}>
                  {formatEventDate(event.eventDate)}
                  {event.entryFeesSats > 0 &&
                    ` • ⚡ ${event.entryFeesSats.toLocaleString()} sats`
                  }
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => onShowQR(event)}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={18} color={theme.colors.text} />
            <Text style={styles.qrButtonText}>QR</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  eventCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  eventInfo: {
    flex: 1,
    marginRight: 12,
  },

  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  eventIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  eventDetails: {
    flex: 1,
  },

  eventName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  eventMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    borderRadius: theme.borderRadius.small,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },

  qrButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
});
