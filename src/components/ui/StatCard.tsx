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
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { theme } from '../../styles/theme';

interface StatCardProps {
  number: number | string;
  label: string;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'highlighted' | 'minimal';
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
      case 'highlighted':
        return styles.cardHighlighted;
      case 'minimal':
        return styles.cardMinimal;
      default:
        return styles.card;
    }
  };

  const getNumberStyle = () => {
    switch (variant) {
      case 'highlighted':
        return styles.statNumberHighlighted;
      case 'minimal':
        return styles.statNumberMinimal;
      default:
        return styles.statNumber;
    }
  };

  const getLabelStyle = () => {
    switch (variant) {
      case 'highlighted':
        return styles.statLabelHighlighted;
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
      <TouchableOpacity
        style={[cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${number}`}
      >
        {renderContent()}
      </TouchableOpacity>
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
  // Default card style - exact match to mockup
  card: {
    backgroundColor: theme.colors.cardBackground, // #0a0a0a
    borderWidth: 1,
    borderColor: theme.colors.border, // #1a1a1a
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },

  // Highlighted card variant
  cardHighlighted: {
    backgroundColor: theme.colors.accent, // #fff
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
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

  // Stat number styles - exact match to mockup
  statNumber: {
    fontSize: 18,
    fontWeight: theme.typography.weights.extraBold, // 800
    color: theme.colors.text, // #fff
    marginBottom: 2,
    textAlign: 'center',
  },

  // Highlighted stat number
  statNumberHighlighted: {
    fontSize: 18,
    fontWeight: theme.typography.weights.extraBold,
    color: theme.colors.accentText, // #000
    marginBottom: 2,
    textAlign: 'center',
  },

  // Minimal stat number
  statNumberMinimal: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
    textAlign: 'center',
  },

  // Stat label styles - exact match to mockup
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted, // #666
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontWeight: theme.typography.weights.regular,
  },

  // Highlighted stat label
  statLabelHighlighted: {
    fontSize: 10,
    color: theme.colors.accentText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontWeight: theme.typography.weights.medium,
  },

  // Minimal stat label
  statLabelMinimal: {
    fontSize: 9,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontWeight: theme.typography.weights.regular,
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
        return { label: 'Prize Pool', suffix: ' sats', prefix: undefined };
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
