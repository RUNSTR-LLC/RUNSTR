/**
 * EinundzwanzigEventCard - Event card for Einundzwanzig Fitness Challenge
 *
 * Displays the challenge as an event card with banner image,
 * status badge, and team-based charity stats.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  EINUNDZWANZIG_CONFIG,
  getEinundzwanzigStatus,
  getDaysRemaining,
  getDaysUntilStart,
} from '../../constants/einundzwanzig';
import {
  EinundzwanzigService,
  EinundzwanzigLeaderboard,
} from '../../services/challenge/EinundzwanzigService';

interface EinundzwanzigEventCardProps {
  onPress?: () => void;
}

type NavigationProp = {
  navigate: (screen: string) => void;
};

export const EinundzwanzigEventCard: React.FC<EinundzwanzigEventCardProps> = ({
  onPress,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [leaderboard, setLeaderboard] = useState<EinundzwanzigLeaderboard | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await EinundzwanzigService.getLeaderboard();
      setLeaderboard(data);
    } catch (e) {
      console.error('[EinundzwanzigEventCard] Error loading leaderboard:', e);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('EinundzwanzigDetail');
    }
  };

  const status = getEinundzwanzigStatus();
  const daysRemaining = getDaysRemaining();
  const daysUntilStart = getDaysUntilStart();

  const getStatusStyles = () => {
    switch (status) {
      case 'active':
        return { backgroundColor: '#111111', borderWidth: 1, borderColor: theme.colors.text };
      case 'upcoming':
        return { backgroundColor: '#111111', borderWidth: 1, borderColor: theme.colors.textMuted };
      case 'ended':
        return { backgroundColor: '#111111', borderWidth: 1, borderColor: '#333' };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return 'LIVE';
      case 'upcoming':
        return 'UPCOMING';
      case 'ended':
        return 'ENDED';
    }
  };

  const formatDateRange = () => {
    const start = EINUNDZWANZIG_CONFIG.startDate;
    const end = EINUNDZWANZIG_CONFIG.endDate;
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const activeCharities = leaderboard?.charityTeams.filter(
    (t) => t.totalDistanceKm > 0
  ).length || 0;
  const totalParticipants = leaderboard?.totalParticipants || 0;
  const totalDistance = leaderboard?.totalDistanceKm || 0;
  const totalSats = leaderboard?.totalEstimatedSats || 0;

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      {/* Event Banner Image */}
      <View style={styles.imageContainer}>
        {!imageLoaded && (
          <View style={[styles.imagePlaceholder, styles.imagePlaceholderAbsolute]}>
            <Ionicons name="people-outline" size={32} color={theme.colors.textMuted} />
          </View>
        )}
        <Image
          source={EINUNDZWANZIG_CONFIG.bannerImage}
          style={[styles.image, !imageLoaded && styles.imageHidden]}
          resizeMode="contain"
          onLoad={() => setImageLoaded(true)}
        />
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, getStatusStyles()]}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {EINUNDZWANZIG_CONFIG.eventName}
        </Text>

        {/* Date Row */}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>
            {formatDateRange()}
            {status === 'active' && daysRemaining > 0 && ` (${daysRemaining}d left)`}
            {status === 'upcoming' && daysUntilStart > 0 && ` (starts in ${daysUntilStart}d)`}
          </Text>
        </View>

        {/* Community Row */}
        <View style={styles.metaRow}>
          <Ionicons name="globe-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>Einundzwanzig Community</Text>
        </View>

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {/* Sport Type Tag */}
          <View style={styles.tag}>
            <Text style={styles.tagText}>Running + Walking</Text>
          </View>

          {/* Charity Fundraiser Tag */}
          <View style={styles.tag}>
            <Ionicons name="heart" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Charity Fundraiser</Text>
          </View>

          {/* Participant Count */}
          {totalParticipants > 0 && (
            <View style={styles.tag}>
              <Ionicons name="people-outline" size={12} color={theme.colors.textMuted} />
              <Text style={styles.tagText}>{totalParticipants}</Text>
            </View>
          )}

          {/* Active Charities */}
          {activeCharities > 0 && (
            <View style={styles.tag}>
              <Ionicons name="heart-outline" size={12} color={theme.colors.textMuted} />
              <Text style={styles.tagText}>
                {activeCharities} {activeCharities === 1 ? 'Charity' : 'Charities'}
              </Text>
            </View>
          )}

          {/* Total Distance */}
          {totalDistance > 0 && (
            <View style={styles.tag}>
              <Ionicons name="walk-outline" size={12} color={theme.colors.textMuted} />
              <Text style={styles.tagText}>{totalDistance.toFixed(1)} km</Text>
            </View>
          )}

          {/* Estimated Sats */}
          {totalSats > 0 && (
            <View style={styles.tag}>
              <Ionicons name="flash" size={12} color={theme.colors.textMuted} />
              <Text style={styles.tagText}>
                {totalSats.toLocaleString()} sats
              </Text>
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
    backgroundColor: theme.colors.border,
  },
  imageHidden: {
    opacity: 0,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 150,
    zIndex: 1,
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
