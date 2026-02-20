/**
 * RunningBitcoinEventCard - Event card matching Satlantis style
 *
 * Displays the Running Bitcoin Challenge as a regular event card
 * with banner image, status badge, and metadata matching other events.
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
  RUNNING_BITCOIN_CONFIG,
  getRunningBitcoinStatus,
  getDaysRemaining,
} from '../../constants/runningBitcoin';
import {
  RunningBitcoinService,
  RunningBitcoinLeaderboard,
} from '../../services/challenge/RunningBitcoinService';

interface RunningBitcoinEventCardProps {
  onPress?: () => void;
}

type NavigationProp = {
  navigate: (screen: string) => void;
};

export const RunningBitcoinEventCard: React.FC<RunningBitcoinEventCardProps> = ({
  onPress,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [leaderboard, setLeaderboard] = useState<RunningBitcoinLeaderboard | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load leaderboard data for participant count
  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await RunningBitcoinService.getLeaderboard();
      setLeaderboard(data);
    } catch (e) {
      console.error('[RunningBitcoinEventCard] Error loading leaderboard:', e);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to Running Bitcoin detail screen
      navigation.navigate('RunningBitcoinDetail');
    }
  };

  const status = getRunningBitcoinStatus();
  const daysRemaining = getDaysRemaining();

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
    const start = RUNNING_BITCOIN_CONFIG.startDate;
    const end = RUNNING_BITCOIN_CONFIG.endDate;
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const activeParticipants = leaderboard?.participants.filter(p => p.workoutCount > 0).length || 0;
  const finisherCount = leaderboard?.finishers.length || 0;

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      {/* Event Banner Image */}
      <View style={styles.imageContainer}>
        {!imageLoaded && (
          <View style={[styles.imagePlaceholder, styles.imagePlaceholderAbsolute]}>
            <Ionicons name="trophy-outline" size={32} color={theme.colors.textMuted} />
          </View>
        )}
        <Image
          source={RUNNING_BITCOIN_CONFIG.bannerImage}
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
          {RUNNING_BITCOIN_CONFIG.eventName}
        </Text>

        {/* Date Row */}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>
            {formatDateRange()}
            {status === 'active' && daysRemaining > 0 && ` (${daysRemaining}d left)`}
          </Text>
        </View>

        {/* Goal Row */}
        <View style={styles.metaRow}>
          <Ionicons name="flag-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>
            {RUNNING_BITCOIN_CONFIG.goalDistanceKm}km Goal • Honoring Hal Finney
          </Text>
        </View>

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {/* Distance Tag */}
          <View style={styles.tag}>
            <Text style={styles.tagText}>{RUNNING_BITCOIN_CONFIG.goalDistanceKm}km</Text>
          </View>

          {/* Sport Type Tag */}
          <View style={styles.tag}>
            <Text style={styles.tagText}>Running + Walking</Text>
          </View>

          {/* Participant Count */}
          {activeParticipants > 0 && (
            <View style={styles.tag}>
              <Ionicons name="people-outline" size={12} color={theme.colors.textMuted} />
              <Text style={styles.tagText}>{activeParticipants}</Text>
            </View>
          )}

          {/* Finisher Count */}
          {finisherCount > 0 && (
            <View style={styles.tag}>
              <Ionicons name="trophy" size={12} color={theme.colors.textMuted} />
              <Text style={styles.tagText}>
                {finisherCount} Finisher{finisherCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Reward Info */}
          <View style={styles.tag}>
            <Ionicons name="flash" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>
              {RUNNING_BITCOIN_CONFIG.finisherRewardSats.toLocaleString()} sats/finisher
            </Text>
          </View>

          {/* Charity Tag */}
          <View style={styles.tag}>
            <Ionicons name="heart" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>ALS Network</Text>
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
