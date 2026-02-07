/**
 * CharityRankings - Collapsible charity distance rankings
 * Shows charities ranked by total distance contributed by participants
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { CharityRanking } from '../../types/season2';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CharityRankingsProps {
  rankings: CharityRanking[];
  isLoading?: boolean;
}

export const CharityRankings: React.FC<CharityRankingsProps> = ({
  rankings,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  if (isLoading || rankings.length === 0) {
    return null; // Don't show section if no data
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionTitle}>CHARITY RANKINGS</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.textMuted}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.list}>
          {rankings.map((charity, index) => (
            <View
              key={charity.charityId}
              style={[styles.row, index === 0 && styles.firstRow]}
            >
              {/* Rank */}
              <View
                style={[
                  styles.rankContainer,
                  index === 0 && styles.firstPlaceRank,
                ]}
              >
                <Text
                  style={[styles.rankText, index === 0 && styles.firstPlaceText]}
                >
                  {charity.rank}
                </Text>
              </View>

              {/* Charity info */}
              <View style={styles.charityInfo}>
                <Text style={styles.charityName}>{charity.charityName}</Text>
                <Text style={styles.participantCount}>
                  {charity.participantCount} participant
                  {charity.participantCount !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Distance - already in km from backend */}
              <Text style={styles.distanceText}>
                {formatDistance(charity.totalDistance)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * Format distance in km for display
 */
function formatDistance(km: number): string {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}k km`;
  }
  if (km >= 100) {
    return `${km.toFixed(0)} km`;
  }
  return `${km.toFixed(1)} km`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    letterSpacing: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  firstRow: {
    borderTopWidth: 0,
  },
  rankContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  firstPlaceRank: {
    backgroundColor: theme.colors.orangeBright,
  },
  rankText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
  },
  firstPlaceText: {
    color: theme.colors.background,
  },
  charityInfo: {
    flex: 1,
  },
  charityName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
  participantCount: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  distanceText: {
    color: theme.colors.orangeBright,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
});

export default CharityRankings;
