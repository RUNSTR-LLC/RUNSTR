/**
 * TabNavigation Component - Three-tab switcher for profile screen
 * Matches .tab-nav from HTML mockup exactly
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import { ProfileTab } from '../../types';

interface TabNavigationProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'workouts', label: 'Workouts' },
  { key: 'account', label: 'Account' },
  { key: 'notifications', label: 'Notifications' },
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => onTabChange(tab.key)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // CSS: margin: 0 20px 16px; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 4px; display: flex;
  container: {
    marginHorizontal: theme.spacing.xxxl, // 20px
    marginBottom: theme.spacing.xxl, // 16px
    backgroundColor: theme.colors.cardBackground, // #0a0a0a
    borderWidth: 1,
    borderColor: theme.colors.border, // #1a1a1a
    borderRadius: theme.borderRadius.large, // 12px
    padding: theme.spacing.sm, // 4px
    flexDirection: 'row',
  },

  // CSS: flex: 1; background: transparent; color: #666; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 600;
  tab: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.xl, // 12px
    paddingHorizontal: theme.spacing.xl, // 12px
    borderRadius: theme.borderRadius.medium, // 8px
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CSS: .tab-btn.active { background: #1a1a1a; color: #fff; }
  activeTab: {
    backgroundColor: theme.colors.buttonHover, // #1a1a1a
  },

  tabText: {
    fontSize: 14, // Exact from CSS
    fontWeight: theme.typography.weights.semiBold, // 600
    color: theme.colors.textMuted, // #666
  },

  activeTabText: {
    color: theme.colors.text, // #fff
  },
});
