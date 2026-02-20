/**
 * SatlantisEventCard - Card component for event discovery feed
 * Displays event preview with image, status badge, and metadata
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { SatlantisEvent, SatlantisEventStatus } from '../../types/satlantis';
import { getEventStatus, formatEventDate } from '../../types/satlantis';

interface SatlantisEventCardProps {
  event: SatlantisEvent;
  onPress: () => void;
  participantCount?: number;
}

export const SatlantisEventCard: React.FC<SatlantisEventCardProps> = ({
  event,
  onPress,
  participantCount,
}) => {
  // Track if the event image has loaded - prevents showing wrong cached image
  const [imageLoaded, setImageLoaded] = useState(false);
  const status = getEventStatus(event);

  const getStatusStyles = (s: SatlantisEventStatus) => {
    switch (s) {
      case 'live':
        return { backgroundColor: theme.colors.text };
      case 'upcoming':
        return { backgroundColor: theme.colors.text };
      case 'ended':
        return { backgroundColor: theme.colors.textMuted };
    }
  };

  const getStatusText = (s: SatlantisEventStatus) => {
    switch (s) {
      case 'live':
        return 'LIVE';
      case 'upcoming':
        return 'UPCOMING';
      case 'ended':
        return 'ENDED';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Event Image - show placeholder until image fully loads to prevent cache collision */}
      {event.image ? (
        <View style={styles.imageContainer}>
          {/* Placeholder shown until image loads */}
          {!imageLoaded && (
            <View style={[styles.imagePlaceholder, styles.imagePlaceholderAbsolute]}>
              <Ionicons name="trophy-outline" size={32} color={theme.colors.textMuted} />
            </View>
          )}
          <Image
            key={`event-banner-${event.id}`}
            source={{ uri: event.image }}
            style={[styles.image, !imageLoaded && styles.imageHidden]}
            fadeDuration={0}
            onLoad={() => {
              console.log(`[EventCard] Image LOADED: ${event.id}`);
              setImageLoaded(true);
            }}
            onError={(e) => console.log(`[EventCard] Image ERROR: ${event.id}`, e.nativeEvent.error)}
          />
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="trophy-outline" size={32} color={theme.colors.textMuted} />
        </View>
      )}

      {/* Status Badge */}
      <View style={[styles.statusBadge, getStatusStyles(status)]}>
        <Text style={styles.statusText}>{getStatusText(status)}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>{formatEventDate(event.startTime)}</Text>
        </View>

        {event.location && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}

        <View style={styles.tagsRow}>
          {event.distance && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {event.distance}
                {event.distanceUnit === 'miles' ? 'mi' : 'km'}
              </Text>
            </View>
          )}
          <View style={styles.tag}>
            <Text style={styles.tagText}>{event.sportType}</Text>
          </View>
          {(participantCount !== undefined || event.participantCount !== undefined) && (
            <View style={styles.tag}>
              <Ionicons name="people-outline" size={12} color={theme.colors.accent} />
              <Text style={styles.tagText}>
                {participantCount ?? event.participantCount}
              </Text>
            </View>
          )}
          {/* Prize Pool - shown if > 0 */}
          {event.prizePoolSats && event.prizePoolSats > 0 && (
            <View style={styles.tag}>
              <Ionicons name="flash" size={12} color={theme.colors.accent} />
              <Text style={styles.tagText}>
                {event.prizePoolSats.toLocaleString()} sats
              </Text>
            </View>
          )}
          {/* Charity Badge - shown if supporting charity */}
          {event.pledgeDestination === 'charity' && event.pledgeCharityName && (
            <View style={styles.tag}>
              <Ionicons name="heart" size={12} color={theme.colors.accent} />
              <Text style={styles.tagText}>
                {event.pledgeCharityName}
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
    backgroundColor: '#111111',
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

export default SatlantisEventCard;
