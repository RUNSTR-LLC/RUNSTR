/**
 * JanuaryWalkingEventCard - Event card for the January Walking Contest
 *
 * Displays the contest as a regular event card with banner image,
 * status badge, and metadata matching other events.
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
  JANUARY_WALKING_CONFIG,
  getJanuaryWalkingStatus,
  getDaysRemaining,
  getDaysUntilStart,
} from '../../constants/januaryWalking';
import {
  JanuaryWalkingService,
  JanuaryWalkingLeaderboard,
} from '../../services/challenge/JanuaryWalkingService';

interface JanuaryWalkingEventCardProps {
  onPress?: () => void;
}

type NavigationProp = {
  navigate: (screen: string) => void;
};

export const JanuaryWalkingEventCard: React.FC<JanuaryWalkingEventCardProps> = ({
  onPress,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [leaderboard, setLeaderboard] = useState<JanuaryWalkingLeaderboard | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load leaderboard data for participant count
  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await JanuaryWalkingService.getLeaderboard();
      setLeaderboard(data);
    } catch (e) {
      console.error('[JanuaryWalkingEventCard] Error loading leaderboard:', e);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('JanuaryWalkingDetail');
    }
  };

  const status = getJanuaryWalkingStatus();
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

  // Format date range (use UTC to avoid timezone shift)
  const formatDateRange = () => {
    const start = JANUARY_WALKING_CONFIG.startDate;
    const end = JANUARY_WALKING_CONFIG.endDate;
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const activeParticipants = leaderboard?.totalParticipants || 0;
  const totalSteps = leaderboard?.totalSteps || 0;

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      {/* Event Banner Image */}
      <View style={styles.imageContainer}>
        {!imageLoaded && (
          <View style={[styles.imagePlaceholder, styles.imagePlaceholderAbsolute]}>
            <Ionicons name="walk-outline" size={32} color={theme.colors.textMuted} />
          </View>
        )}
        <Image
          source={JANUARY_WALKING_CONFIG.bannerImage}
          style={[styles.image, !imageLoaded && styles.imageHidden]}
          resizeMode="cover"
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
          {JANUARY_WALKING_CONFIG.eventName}
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

        {/* Prize Row */}
        <View style={styles.metaRow}>
          <Ionicons name="trophy-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>
            Top {JANUARY_WALKING_CONFIG.prizeWinnerCount} win {JANUARY_WALKING_CONFIG.prizeAmountSats.toLocaleString()} sats each
          </Text>
        </View>

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {/* Activity Type Tag */}
          <View style={styles.tag}>
            <Ionicons name="walk" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Walking</Text>
          </View>

          {/* Participant Count */}
          {activeParticipants > 0 && (
            <View style={styles.tag}>
              <Ionicons name="people-outline" size={12} color={theme.colors.textMuted} />
              <Text style={styles.tagText}>{activeParticipants}</Text>
            </View>
          )}

          {/* Total Steps */}
          {totalSteps > 0 && (
            <View style={styles.tag}>
              <Ionicons name="footsteps-outline" size={12} color={theme.colors.textMuted} />
              <Text style={styles.tagText}>{(totalSteps / 1000).toFixed(0)}k steps</Text>
            </View>
          )}

          {/* Prize Info */}
          <View style={styles.tag}>
            <Ionicons name="flash" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>
              {(JANUARY_WALKING_CONFIG.prizeAmountSats * JANUARY_WALKING_CONFIG.prizeWinnerCount).toLocaleString()} sats total
            </Text>
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

export default JanuaryWalkingEventCard;
