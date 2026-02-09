/**
 * DynamicEventCard - Generic event card driven entirely by Competition data
 *
 * Displays a Supabase-driven competition as a card matching the existing
 * event card pattern (see JanuaryWalkingEventCard for reference).
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
import type { DynamicCompetition, CompetitionStatus } from '../../hooks/useDynamicCompetitions';

const RUNSTR_LOGO = require('../../../assets/images/icon.png');

interface DynamicEventCardProps {
  competition: DynamicCompetition;
  onPress: () => void;
}

const ACTIVITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  running: 'fitness-outline',
  walking: 'walk-outline',
  cycling: 'bicycle-outline',
  hiking: 'trail-sign-outline',
};

function getStatusBadgeStyle(status: CompetitionStatus) {
  switch (status) {
    case 'active':
      return { backgroundColor: theme.colors.accent };
    case 'upcoming':
      return { backgroundColor: theme.colors.accent };
    case 'ended':
      return { backgroundColor: theme.colors.textMuted };
  }
}

function getStatusLabel(status: CompetitionStatus): string {
  switch (status) {
    case 'active': return 'LIVE';
    case 'upcoming': return 'UPCOMING';
    case 'ended': return 'ENDED';
  }
}

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  const s = new Date(start).toLocaleDateString('en-US', opts);
  const e = new Date(end).toLocaleDateString('en-US', opts);
  return `${s} - ${e}`;
}

function getDaysInfo(comp: DynamicCompetition): string {
  const now = Date.now();
  if (comp.status === 'active') {
    const daysLeft = Math.ceil((new Date(comp.end_date).getTime() - now) / 86400000);
    return daysLeft > 0 ? ` (${daysLeft}d left)` : '';
  }
  if (comp.status === 'upcoming') {
    const daysUntil = Math.ceil((new Date(comp.start_date).getTime() - now) / 86400000);
    return daysUntil > 0 ? ` (starts in ${daysUntil}d)` : '';
  }
  return '';
}

export const DynamicEventCard: React.FC<DynamicEventCardProps> = ({
  competition,
  onPress,
}) => {
  const config = competition.config || {};
  const activityTypes = config.activity_types || [competition.activity_type];
  const prizePool = competition.prize_pool_sats || 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Banner Image / Placeholder */}
      <View style={styles.imageContainer}>
        {competition.image_url ? (
          <Image
            source={{ uri: competition.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={RUNSTR_LOGO}
            style={styles.image}
            resizeMode="contain"
          />
        )}
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, getStatusBadgeStyle(competition.status)]}>
        <Text style={styles.statusText}>{getStatusLabel(competition.status)}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {competition.name}
        </Text>

        {/* Date Row */}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>
            {formatDateRange(competition.start_date, competition.end_date)}
            {getDaysInfo(competition)}
          </Text>
        </View>

        {/* Prize Row */}
        {prizePool > 0 && (
          <View style={styles.metaRow}>
            <Ionicons name="trophy-outline" size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>
              {prizePool.toLocaleString()} sats prize pool
            </Text>
          </View>
        )}

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {activityTypes.map((type) => (
            <View key={type} style={styles.tag}>
              <Ionicons
                name={ACTIVITY_ICONS[type] || 'barbell-outline'}
                size={12}
                color={theme.colors.accent}
              />
              <Text style={styles.tagText}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </View>
          ))}

          {prizePool > 0 && (
            <View style={styles.tag}>
              <Ionicons name="flash" size={12} color={theme.colors.accent} />
              <Text style={styles.tagText}>{prizePool.toLocaleString()} sats</Text>
            </View>
          )}
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
  },
  statusText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
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
    backgroundColor: `${theme.colors.accent}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },
});

export default DynamicEventCard;
