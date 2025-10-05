/**
 * EventHeader Component - Event detail screen header section
 * Matches HTML mockup: event-header, event-title, event-meta, event-description
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export interface EventHeaderProps {
  title: string;
  startDate: string;
  endDate: string;
  type: string;
  description: string;
  daysRemaining: number;
  progressPercentage: number;
}

export const EventHeader: React.FC<EventHeaderProps> = ({
  title,
  startDate,
  endDate,
  type,
  description,
  daysRemaining,
  progressPercentage,
}) => {
  // Guard against null/undefined/NaN values
  const safeTitle = title || 'Event';
  const safeStartDate = startDate || '';
  const safeType = type || 'Event';
  const safeDescription = description || '';
  const safeDaysRemaining = Math.max(0, Math.floor(daysRemaining || 0));
  const safeProgressPercentage = Math.max(0, Math.min(100, progressPercentage || 0));

  return (
    <View style={styles.container}>
      {/* Event Title */}
      <Text style={styles.title}>{safeTitle}</Text>

      {/* Event Meta */}
      <View style={styles.meta}>
        <Text style={styles.date}>
          {safeStartDate}
        </Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{safeType}</Text>
        </View>
      </View>

      {/* Event Description */}
      <Text style={styles.description}>{safeDescription}</Text>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${safeProgressPercentage}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {safeDaysRemaining} day{safeDaysRemaining !== 1 ? 's' : ''} remaining
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  // Event title - exact CSS: font-size: 28px; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px;
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    color: theme.colors.text,
    marginBottom: 8,
  },
  // Event meta container - exact CSS: display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  // Event date - exact CSS: font-size: 14px; color: #ccc; font-weight: 500;
  date: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  // Event type badge - exact CSS: background: #1a1a1a; padding: 4px 8px; border-radius: 6px;
  typeBadge: {
    backgroundColor: theme.colors.border,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.small,
  },
  // Event type text - exact CSS: font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Event description - exact CSS: font-size: 15px; color: #ccc; line-height: 1.4;
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 21, // 15 * 1.4 = 21
  },
  // Progress section - exact CSS: margin: 16px 0;
  progressSection: {
    marginVertical: 16,
  },
  // Progress bar container - exact CSS: width: 100%; height: 4px; background: #1a1a1a; border-radius: 2px;
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  // Progress fill - exact CSS: height: 100%; background: #fff; width: 68%; transition: width 0.3s ease;
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.text,
  },
  // Progress text - exact CSS: font-size: 11px; color: #666; margin-top: 4px; text-align: center;
  progressText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
