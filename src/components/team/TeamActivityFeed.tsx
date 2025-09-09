/**
 * TeamActivityFeed - Recent activity bullet points for team discovery cards
 * Simple list displaying team events, challenges, and announcements
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TeamActivity } from '../../types';

interface TeamActivityFeedProps {
  activities: TeamActivity[];
  maxItems?: number;
}

export const TeamActivityFeed: React.FC<TeamActivityFeedProps> = ({
  activities,
  maxItems = 3,
}) => {
  const displayActivities = activities.slice(0, maxItems);

  const formatActivityText = (activity: TeamActivity): string => {
    // Add bullet point prefix to match HTML mockup
    return `• ${activity.description}`;
  };

  if (displayActivities.length === 0) {
    return null; // Don't render if no activities
  }

  return (
    <View style={styles.activitySection}>
      <Text style={styles.activityTitle}>Recent Activity</Text>
      <View style={styles.activityItems}>
        {displayActivities.map((activity) => (
          <Text key={activity.id} style={styles.activityItem}>
            {formatActivityText(activity)}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activitySection: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 12,
  },

  activityTitle: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  activityItems: {
    gap: 4,
  },

  activityItem: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 12 * 1.2, // 14.4 for readability
  },
});
