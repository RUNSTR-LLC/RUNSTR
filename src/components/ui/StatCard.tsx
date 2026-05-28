/**
 * StatCard Component
 * Displays statistical information in a card format
 * Used in captain dashboard stats overview section
 * Exact match to HTML mockup styling
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../styles/theme';
import { PressableScale } from './PressableScale';

interface StatCardProps {
  number: number | string;
  label: string;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'minimal';
  isLoading?: boolean;
  suffix?: string; // For units like "sats", "%", etc.
  prefix?: string; // For currency symbols, etc.
}

export const StatCard: React.FC<StatCardProps> = ({
  number,
  label,
  style,
  onPress,
  variant = 'default',
  isLoading = false,
  suffix,
  prefix,
}) => {
  const formatNumber = (num: number | string): string => {
    if (typeof num === 'string') return num;
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getCardStyle = () => {
    switch (variant) {
      case 'minimal':
        return styles.cardMinimal;
      default:
        return styles.card;
    }
  };

  const getNumberStyle = () => {
    switch (variant) {
      case 'minimal':
        return styles.statNumberMinimal;
      default:
        return styles.statNumber;
    }
  };

  const getLabelStyle = () => {
    switch (variant) {
      case 'minimal':
        return styles.statLabelMinimal;
      default:
        return styles.statLabel;
    }
  };

  const cardStyle = getCardStyle();
  const numberStyle = getNumberStyle();
  const labelStyle = getLabelStyle();

  const renderContent = () => (
    <>
      {isLoading ? (
        <View style={styles.loadingNumber}>
          <Text style={styles.loadingText}>--</Text>
        </View>
      ) : (
        <Text style={numberStyle}>
          {prefix && <Text style={styles.prefix}>{prefix}</Text>}
          {formatNumber(number)}
          {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        </Text>
      )}
      <Text style={labelStyle}>{label.toUpperCase()}</Text>
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        style={[cardStyle, style]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${number}`}
      >
        {renderContent()}
      </PressableScale>
    );
  }

  return (
    <View style={[cardStyle, style]} accessibilityLabel={`${label}: ${number}`}>
      {renderContent()}
    </View>
  );
};

// Grid container component for multiple stat cards
interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: number;
  style?: ViewStyle;
}

export const StatCardGrid: React.FC<StatCardGridProps> = ({
  children,
  columns = 3,
  gap = 8,
  style,
}) => {
  return (
    <View style={[styles.grid, { gap }, style]}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={[styles.gridItem, { flex: 1 / columns }]}>
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Default card style
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },

  // Minimal card variant
  cardMinimal: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },

  // Stat number - moment of pride
  statNumber: {
    fontSize: theme.typography.size.xl, // 32
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  // Minimal stat number
  statNumberMinimal: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  // Stat label - eyebrow above the number
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
    fontWeight: theme.typography.weights.semiBold,
  },

  // Minimal stat label
  statLabelMinimal: {
    fontSize: 9,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    textAlign: 'center',
    fontWeight: theme.typography.weights.semiBold,
  },

  // Prefix and suffix styles
  prefix: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    opacity: 0.8,
  },

  suffix: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    opacity: 0.8,
  },

  // Loading state
  loadingNumber: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  loadingText: {
    fontSize: 18,
    fontWeight: theme.typography.weights.extraBold,
    color: theme.colors.textMuted,
    opacity: 0.5,
  },

  // Grid layout styles
  grid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  gridItem: {
    flexDirection: 'column',
  },
});

// Utility component for specific stat types
interface TeamStatCardProps {
  type: 'members' | 'events' | 'challenges' | 'sats' | 'rank';
  value: number;
  onPress?: () => void;
}

export const TeamStatCard: React.FC<TeamStatCardProps> = ({
  type,
  value,
  onPress,
}) => {
  const getStatConfig = () => {
    switch (type) {
      case 'members':
        return { label: 'Members', suffix: undefined, prefix: undefined };
      case 'events':
        return { label: 'Active Events', suffix: undefined, prefix: undefined };
      case 'challenges':
        return { label: 'Challenges', suffix: undefined, prefix: undefined };
      case 'sats':
        return { label: 'Prize Pool', suffix: ' rewards', prefix: undefined };
      case 'rank':
        return { label: 'Team Rank', suffix: undefined, prefix: '#' };
      default:
        return {
          label: String(type).toUpperCase(),
          suffix: undefined,
          prefix: undefined,
        };
    }
  };

  const config = getStatConfig();

  return (
    <StatCard
      number={value}
      label={config.label}
      suffix={config.suffix}
      prefix={config.prefix}
      onPress={onPress}
    />
  );
};
