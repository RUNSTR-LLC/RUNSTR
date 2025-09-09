/**
 * CaptainHeader Component
 * Header component for captain dashboard with badge and settings button
 * Exact match to HTML mockup styling
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface CaptainHeaderProps {
  title?: string;
  onSettingsPress: () => void;
  showCaptainBadge?: boolean;
}

export const CaptainHeader: React.FC<CaptainHeaderProps> = ({
  title = 'Dashboard',
  onSettingsPress,
  showCaptainBadge = true,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {showCaptainBadge && (
          <View style={styles.captainBadge}>
            <Text style={styles.captainBadgeText}>CAPTAIN</Text>
          </View>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={onSettingsPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Header container - exact match to mockup
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
  },

  // Left side content container
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexDirection: 'row',
  },

  // Captain badge - exact styling from mockup
  captainBadge: {
    backgroundColor: theme.colors.accent, // #fff
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  // Captain badge text - exact styling from mockup
  captainBadgeText: {
    color: theme.colors.accentText, // #000
    fontSize: 10,
    fontWeight: theme.typography.weights.bold, // 700
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Header title - exact styling from mockup
  headerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold, // 700
    letterSpacing: -0.5,
    color: theme.colors.text, // #fff
  },

  // Settings button - exact styling from mockup
  settingsBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.gray, // #333
    color: theme.colors.text, // #fff
    padding: 6,
    borderRadius: 6,
    fontSize: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },

  // Settings icon - exact styling from mockup
  settingsIcon: {
    fontSize: 16,
    color: theme.colors.text, // #fff
  },
});

// Additional utility component for custom captain badges
interface CaptainBadgeProps {
  text?: string;
  variant?: 'default' | 'admin' | 'owner';
}

export const CaptainBadge: React.FC<CaptainBadgeProps> = ({
  text = 'CAPTAIN',
  variant = 'default',
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'admin':
        return {
          backgroundColor: '#ff6b35', // Orange for admin
          color: '#fff',
        };
      case 'owner':
        return {
          backgroundColor: '#4CAF50', // Green for owner
          color: '#fff',
        };
      default:
        return {
          backgroundColor: theme.colors.accent,
          color: theme.colors.accentText,
        };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <View
      style={[
        styles.captainBadge,
        { backgroundColor: badgeStyle.backgroundColor },
      ]}
    >
      <Text style={[styles.captainBadgeText, { color: badgeStyle.color }]}>
        {text}
      </Text>
    </View>
  );
};

// Header variant for different contexts
interface CaptainHeaderVariantProps extends CaptainHeaderProps {
  variant?: 'dashboard' | 'team' | 'settings';
  leftAction?: {
    icon: string;
    onPress: () => void;
    accessibilityLabel?: string;
  };
}

export const CaptainHeaderVariant: React.FC<CaptainHeaderVariantProps> = ({
  title,
  onSettingsPress,
  showCaptainBadge = true,
  variant = 'dashboard',
  leftAction,
}) => {
  const getTitle = () => {
    if (title) return title;
    switch (variant) {
      case 'team':
        return 'Team Management';
      case 'settings':
        return 'Team Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {leftAction ? (
          <TouchableOpacity
            style={additionalStyles.leftActionBtn}
            onPress={leftAction.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={leftAction.accessibilityLabel || 'Back'}
          >
            <Text style={additionalStyles.leftActionIcon}>
              {leftAction.icon}
            </Text>
          </TouchableOpacity>
        ) : showCaptainBadge ? (
          <CaptainBadge />
        ) : null}
        <Text style={styles.headerTitle}>{getTitle()}</Text>
      </View>
      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={onSettingsPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>
    </View>
  );
};

// Additional styles for variant components
const additionalStyles = StyleSheet.create({
  leftActionBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.gray,
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },

  leftActionIcon: {
    fontSize: 16,
    color: theme.colors.text,
  },
});

// Merge additional styles
Object.assign(styles, additionalStyles);
