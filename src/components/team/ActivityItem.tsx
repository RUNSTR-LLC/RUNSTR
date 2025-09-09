/**
 * ActivityItem - Individual Activity Item for Captain Dashboard
 * Displays activity icon, message, and timestamp
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface Activity {
  id: string;
  type: 'join' | 'complete' | 'win' | 'fund' | 'announce';
  message: string;
  timestamp: string;
}

interface ActivityItemProps {
  activity: Activity;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getActivityIcon = (type: Activity['type']): string => {
    switch (type) {
      case 'join':
        return '+';
      case 'complete':
        return '🏃';
      case 'win':
        return '⚡';
      case 'fund':
        return '💰';
      case 'announce':
        return '📢';
      default:
        return '•';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      );

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60)
        );
        return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
      } else if (diffInHours < 48) {
        return '1 day ago';
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
      }
    } catch {
      // Fallback for invalid timestamps
      return timestamp;
    }
  };

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <Text style={styles.activityIconText}>
          {getActivityIcon(activity.type)}
        </Text>
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>{activity.message}</Text>
        <Text style={styles.activityTime}>
          {formatTimestamp(activity.timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },

  activityIcon: {
    width: 20,
    height: 20,
    backgroundColor: theme.colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  activityIconText: {
    fontSize: 10,
    color: theme.colors.text,
  },

  activityContent: {
    flex: 1,
  },

  activityText: {
    fontSize: 12,
    lineHeight: 1.3 * 12,
    color: theme.colors.text,
    marginBottom: 2,
  },

  activityTime: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
});
