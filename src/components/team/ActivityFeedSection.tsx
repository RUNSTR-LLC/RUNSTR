/**
 * ActivityFeedSection - Captain Dashboard Activity Feed
 * Displays recent team activity with icons, messages, and timestamps
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from '../../styles/theme';
import { ActivityItem } from './ActivityItem';

interface Activity {
  id: string;
  type: 'join' | 'complete' | 'win' | 'fund' | 'announce';
  message: string;
  timestamp: string;
}

interface ActivityFeedSectionProps {
  activities: Activity[];
  onViewAllActivity: () => void;
  maxItems?: number;
}

export const ActivityFeedSection: React.FC<ActivityFeedSectionProps> = ({
  activities,
  onViewAllActivity,
  maxItems = 5,
}) => {
  const displayActivities = activities ? activities.slice(0, maxItems) : [];

  return (
    <View style={styles.activitySection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={onViewAllActivity}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllBtnText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.activityList}
        showsVerticalScrollIndicator={false}
      >
        {displayActivities.length > 0 ? (
          displayActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        ) : (
          <Text style={styles.emptyText}>No recent activity</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  activitySection: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: 16,
    flex: 1,
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  viewAllBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.gray,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },

  viewAllBtnText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  activityList: {
    flex: 1,
    maxHeight: 150,
  },

  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
