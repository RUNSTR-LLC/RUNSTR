/**
 * DynamicEventCard - Event card driven by Competition data
 *
 * Displays a Supabase-driven competition as a card with template-based
 * visual banners (5K/10K/Half/Steps) or a fallback icon.
 * Uses dark theme — no bright orange.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import type { DynamicCompetition, CompetitionStatus } from '../../hooks/useDynamicCompetitions';

// ---------------------------------------------------------------------------
// Template banner config
// ---------------------------------------------------------------------------

interface BannerConfig {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  gradientColors: [string, string];
}

const TEMPLATE_BANNERS: Record<string, BannerConfig> = {
  '5k_race': {
    icon: 'fitness-outline',
    label: '5K',
    gradientColors: ['#1a1a1a', '#0a0a0a'],
  },
  '10k_race': {
    icon: 'fitness-outline',
    label: '10K',
    gradientColors: ['#1a1a1a', '#0a0a0a'],
  },
  half_marathon: {
    icon: 'fitness-outline',
    label: '21.1K',
    gradientColors: ['#1a1a1a', '#0a0a0a'],
  },
  step_challenge: {
    icon: 'walk-outline',
    label: 'STEPS',
    gradientColors: ['#1a1a1a', '#0a0a0a'],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTIVITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  running: 'fitness-outline',
  walking: 'walk-outline',
  cycling: 'bicycle-outline',
  hiking: 'trail-sign-outline',
};

function getStatusLabel(status: CompetitionStatus, t: (key: string, opts?: Record<string, string>) => string): string {
  switch (status) {
    case 'active': return t('live', { defaultValue: 'LIVE' });
    case 'upcoming': return t('upcoming', { defaultValue: 'UPCOMING' });
    case 'ended': return t('ended', { defaultValue: 'ENDED' });
  }
}

function getStatusStyle(status: CompetitionStatus) {
  switch (status) {
    case 'active':
      return { backgroundColor: '#222222', borderColor: theme.colors.text };
    case 'upcoming':
      return { backgroundColor: '#222222', borderColor: theme.colors.textMuted };
    case 'ended':
      return { backgroundColor: '#111111', borderColor: '#333333' };
  }
}

function getStatusTextColor(status: CompetitionStatus): string {
  switch (status) {
    case 'active': return theme.colors.text;
    case 'upcoming': return theme.colors.textMuted;
    case 'ended': return '#666666';
  }
}

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  const s = new Date(start).toLocaleDateString(undefined, opts);
  const e = new Date(end).toLocaleDateString(undefined, opts);
  return `${s} — ${e}`;
}

function getDaysInfo(comp: DynamicCompetition, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = Date.now();
  if (comp.status === 'active') {
    const daysLeft = Math.ceil((new Date(comp.end_date).getTime() - now) / 86400000);
    return daysLeft > 0 ? ` (${t('daysLeft', { days: daysLeft, defaultValue: '{{days}}d left' })})` : '';
  }
  if (comp.status === 'upcoming') {
    const daysUntil = Math.ceil((new Date(comp.start_date).getTime() - now) / 86400000);
    return daysUntil > 0 ? ` (${t('startsIn', { days: daysUntil, defaultValue: 'starts in {{days}}d' })})` : '';
  }
  return '';
}

function getScoringLabel(method: string, t: (key: string, opts?: Record<string, string>) => string): string {
  switch (method) {
    case 'fastest_time': return t('fastestTime', { defaultValue: 'Fastest Time' });
    case 'total_distance': return t('longestDistance', { defaultValue: 'Longest Distance' });
    case 'total_steps': return t('mostSteps', { defaultValue: 'Most Steps' });
    case 'total_duration': return t('longestDuration', { defaultValue: 'Longest Duration' });
    case 'workout_count': return t('mostWorkouts', { defaultValue: 'Most Workouts' });
    default: return '';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DynamicEventCardProps {
  competition: DynamicCompetition;
  onPress: () => void;
}

export const DynamicEventCard: React.FC<DynamicEventCardProps> = ({
  competition,
  onPress,
}) => {
  const { t } = useTranslation('events');
  const [imageError, setImageError] = useState(false);
  const config = competition.config || {};
  const activityTypes: string[] = (config as any).activity_types || [competition.activity_type];
  const template = competition.template;
  const banner = template ? TEMPLATE_BANNERS[template] : null;
  const scoringMethod = (config as any).scoring_method || competition.scoring_method || '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Banner */}
      <View style={styles.bannerContainer}>
        {competition.image_url && !imageError ? (
          <Image
            source={{ uri: competition.image_url }}
            style={styles.bannerImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : banner ? (
          <LinearGradient
            colors={banner.gradientColors}
            style={styles.bannerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={banner.icon} size={44} color="#333333" />
            <Text style={styles.bannerLabel}>{banner.label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.bannerFallback}>
            <Ionicons name="trophy-outline" size={36} color="#333333" />
          </View>
        )}

        {/* Status Badge */}
        <View style={[styles.statusBadge, getStatusStyle(competition.status)]}>
          <Text style={[styles.statusText, { color: getStatusTextColor(competition.status) }]}>
            {getStatusLabel(competition.status, t)}
          </Text>
        </View>

        {/* Club Badge */}
        {competition.club_id && (
          <View style={styles.clubBadge}>
            <Ionicons name="people" size={10} color={theme.colors.textMuted} />
            <Text style={styles.clubBadgeText}>{t('club', { defaultValue: 'Club' })}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {competition.name}
        </Text>

        {/* Date Row */}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textDark} />
          <Text style={styles.metaText}>
            {formatDateRange(competition.start_date, competition.end_date)}
            {getDaysInfo(competition, t)}
          </Text>
        </View>

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {activityTypes.map((type: string) => (
            <View key={type} style={styles.tag}>
              <Ionicons
                name={ACTIVITY_ICONS[type] || 'barbell-outline'}
                size={12}
                color={theme.colors.textMuted}
              />
              <Text style={styles.tagText}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </View>
          ))}

          {scoringMethod ? (
            <View style={styles.tag}>
              <Ionicons name="podium-outline" size={12} color={theme.colors.textMuted} />
              <Text style={styles.tagText}>{getScoringLabel(scoringMethod, t)}</Text>
            </View>
          ) : null}
        </View>

        {/* Ticket Pledge Badge */}
        {(config as any).ticket_pledge_days > 0 && (
          <View style={[styles.ticketBadge, { backgroundColor: theme.colors.accent + '20' }]}>
            <Text style={[styles.ticketBadgeText, { color: theme.colors.accent }]}>
              {(config as any).ticket_pledge_days}-day pledge to enter
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Styles — dark theme, no bright orange
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  bannerContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  bannerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bannerLabel: {
    fontSize: 40,
    fontWeight: theme.typography.weights.bold,
    color: '#333333',
    letterSpacing: 2,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.5,
  },
  clubBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
  },
  clubBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 6,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  ticketBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  ticketBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default DynamicEventCard;
