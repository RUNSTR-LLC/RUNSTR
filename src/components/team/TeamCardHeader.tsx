/**
 * TeamCardHeader - Team name, description, and optional featured badge for discovery cards
 * Different from TeamHeader which is for main team screen with menu
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface TeamCardHeaderProps {
  name: string;
  about: string;
  isFeatured?: boolean;
}

export const TeamCardHeader: React.FC<TeamCardHeaderProps> = ({
  name,
  about,
  isFeatured = false,
}) => {
  return (
    <View style={styles.teamHeader}>
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{name}</Text>
        <Text style={styles.teamAbout}>{about}</Text>
      </View>
      {isFeatured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  teamInfo: {
    flex: 1,
    paddingRight: 12, // Space for featured badge
  },

  teamName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },

  teamAbout: {
    fontSize: 13,
    color: '#999',
    lineHeight: 13 * 1.3, // 16.9
  },

  featuredBadge: {
    backgroundColor: theme.colors.text,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  featuredText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.background,
  },
});
