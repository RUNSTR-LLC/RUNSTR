/**
 * Season3EventCard — Featured card on the Compete tab
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface Season3EventCardProps {
  onPress?: () => void;
}

export const Season3EventCard: React.FC<Season3EventCardProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>SEASON III</Text>
      <Text style={styles.subtitle}>CLUB BATTLES</Text>
      <Text style={styles.description}>
        16 clubs. Double elimination. Daily step battles.
      </Text>

      <View style={styles.tags}>
        <View style={styles.tag}>
          <Ionicons name="people-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.tagText}>Team Competition</Text>
        </View>
        <View style={styles.tag}>
          <Ionicons name="footsteps-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.tagText}>Steps</Text>
        </View>
        <View style={styles.tag}>
          <Ionicons name="trophy-outline" size={14} color={theme.colors.accent} />
          <Text style={styles.tagText}>Rewards</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    gap: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
