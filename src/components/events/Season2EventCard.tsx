/**
 * Season2EventCard - Card for RUNSTR Season III Club Battles
 *
 * Navigates to Season3Screen when tapped.
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

const RUNSTR_LOGO = require('../../../assets/images/icon.png');
import { theme } from '../../styles/theme';

interface Season2EventCardProps {
  onPress?: () => void;
}

export const Season2EventCard: React.FC<Season2EventCardProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Event Banner Image */}
      <View style={styles.imageContainer}>
        <Image
          source={RUNSTR_LOGO}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Status Badge */}
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>MAY 2026</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          Season III: Club Battles
        </Text>
        <Text style={styles.subtitle}>
          16 clubs. Double elimination. Daily step battles.
        </Text>

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          <View style={styles.tag}>
            <Ionicons name="people-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Team Competition</Text>
          </View>

          <View style={styles.tag}>
            <Ionicons name="footsteps-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Steps</Text>
          </View>

          <View style={styles.tag}>
            <Ionicons name="trophy-outline" size={12} color={theme.colors.accent} />
            <Text style={styles.tagText}>Rewards</Text>
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
    borderColor: theme.colors.accent,
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 4,
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

export default Season2EventCard;
