/**
 * Season2EventCard - Teaser card for RUNSTR Season III
 *
 * Displays a coming soon card for Season III competition.
 * Tapping shows a toast instead of navigating.
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
import Toast from 'react-native-toast-message';

// RUNSTR logo image for Season III card (orange ostrich on black)
const RUNSTR_LOGO = require('../../../assets/images/icon.png');
import { theme } from '../../styles/theme';
interface Season2EventCardProps {
  onPress?: () => void;
}

export const Season2EventCard: React.FC<Season2EventCardProps> = ({ onPress }) => {
  const getStatusText = () => 'COMING SOON';

  const getStatusStyles = () => ({
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: theme.colors.textMuted,
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress ?? (() => Toast.show({ type: 'success', text1: 'Coming Soon', text2: 'RUNSTR Season III is on the way', visibilityTime: 1500 }))}
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
      <View style={[styles.statusBadge, getStatusStyles()]}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          RUNSTR Season III
        </Text>

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {/* Activity Types */}
          <View style={styles.tag}>
            <Ionicons name="walk-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Running</Text>
          </View>

          <View style={styles.tag}>
            <Ionicons name="walk-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Walking</Text>
          </View>

          <View style={styles.tag}>
            <Ionicons name="bicycle-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Cycling</Text>
          </View>

          {/* BTC Prizes */}
          <View style={styles.tag}>
            <Ionicons name="trophy" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>BTC Prizes</Text>
          </View>

          {/* Charity */}
          <View style={styles.tag}>
            <Ionicons name="heart" size={12} color={theme.colors.textMuted} />
            <Text style={styles.tagText}>Charity</Text>
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

export default Season2EventCard;
