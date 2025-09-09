/**
 * EventDetails Component - Event details table section
 * Matches HTML mockup: details-section, detail-item
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export interface EventDetail {
  label: string;
  value: string;
}

export interface EventDetailsProps {
  details?: EventDetail[];
  distance?: string;
  duration?: string;
  activityType?: string;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
}

export const EventDetails: React.FC<EventDetailsProps> = ({
  details,
  distance,
  duration,
  activityType,
  createdBy,
  startDate,
  endDate,
}) => {
  // Use individual props if provided, otherwise use details array
  const actualDetails = details || [
    ...(distance ? [{ label: 'Distance', value: distance }] : []),
    ...(duration ? [{ label: 'Duration', value: duration }] : []),
    ...(activityType ? [{ label: 'Activity Type', value: activityType }] : []),
    ...(createdBy ? [{ label: 'Created By', value: createdBy }] : []),
    ...(startDate ? [{ label: 'Start Date', value: startDate }] : []),
    ...(endDate ? [{ label: 'End Date', value: endDate }] : []),
  ];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Details</Text>
      {actualDetails.map((detail, index) => (
        <View
          key={detail.label}
          style={[
            styles.detailItem,
            index === actualDetails.length - 1 && styles.lastDetailItem,
          ]}
        >
          <Text style={styles.detailLabel}>{detail.label}</Text>
          <Text style={styles.detailValue}>{detail.value}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Container - exact CSS: background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px; margin-bottom: 20px;
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: 16,
    marginBottom: 20,
  },
  // Details title - exact CSS: font-size: 16px; font-weight: 600; margin-bottom: 12px;
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  // Detail item - exact CSS: display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #1a1a1a;
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  // Last detail item - exact CSS: border-bottom: none;
  lastDetailItem: {
    borderBottomWidth: 0,
  },
  // Detail label - exact CSS: font-size: 13px; color: #999;
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  // Detail value - exact CSS: font-size: 13px; font-weight: 500; color: #fff;
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
});
