/**
 * LeaderboardEventCard - Event card for Daily Leaderboards
 *
 * Displays the leaderboards section as an event card with banner image,
 * status badge, and metadata. Clicking navigates to the Leaderboards tab.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

// RUNSTR logo image for Leaderboard card (orange ostrich on black)
const RUNSTR_LOGO = require('../../../assets/images/icon.png');

interface LeaderboardEventCardProps {
  onPress?: () => void;
}

export const LeaderboardEventCard: React.FC<LeaderboardEventCardProps> = ({
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Event Banner Image */}
      <View style={styles.imageContainer}>
        <Image
          source={RUNSTR_LOGO}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Status Badge - Always LIVE */}
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>LIVE</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          Daily Leaderboards
        </Text>

        {/* Description Row */}
        <View style={styles.metaRow}>
          <Ionicons name="stats-chart-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>See top performers today</Text>
        </View>

        {/* Update Row */}
        <View style={styles.metaRow}>
          <Ionicons name="refresh-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>Updates in real-time</Text>
        </View>

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {/* Metrics */}
          <View style={styles.tag}>
            <Ionicons name="trending-up-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Distance</Text>
          </View>

          <View style={styles.tag}>
            <Ionicons name="speedometer-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Pace</Text>
          </View>

          <View style={styles.tag}>
            <Ionicons name="calendar-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Consistency</Text>
          </View>

          {/* Activity Types */}
          <View style={styles.tag}>
            <Ionicons name="walk-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>All Activities</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: '#000000',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: theme.colors.text,
  },
  statusText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginLeft: 6,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
});

export default LeaderboardEventCard;
