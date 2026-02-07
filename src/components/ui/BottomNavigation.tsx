/**
 * BottomNavigation Component - Exact match to HTML mockup bottom navigation
 * Shared between Team and Profile screens
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useTranslation } from 'react-i18next';

type ScreenType = 'team' | 'profile';

interface BottomNavigationProps {
  activeScreen: ScreenType;
  onNavigateToTeam: () => void;
  onNavigateToProfile: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeScreen,
  onNavigateToTeam,
  onNavigateToProfile,
}) => {
  const { t } = useTranslation('profile');

  return (
    <View style={styles.bottomNav}>
      {/* Discover Navigation Item */}
      <TouchableOpacity
        style={[
          styles.navItem,
          activeScreen === 'team' && styles.navItemActive,
        ]}
        onPress={onNavigateToTeam}
        activeOpacity={0.7}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={
            activeScreen === 'team'
              ? theme.colors.orangeBright
              : theme.colors.textMuted
          }
        />
        <Text
          style={[
            styles.navLabel,
            activeScreen === 'team' && styles.navLabelActive,
          ]}
        >
          {t('discover')}
        </Text>
      </TouchableOpacity>

      {/* Profile Navigation Item */}
      <TouchableOpacity
        style={[
          styles.navItem,
          activeScreen === 'profile' && styles.navItemActive,
        ]}
        onPress={onNavigateToProfile}
        activeOpacity={0.7}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        <Ionicons
          name="person-outline"
          size={20}
          color={
            activeScreen === 'profile'
              ? theme.colors.orangeBright
              : theme.colors.textMuted
          }
        />
        <Text
          style={[
            styles.navLabel,
            activeScreen === 'profile' && styles.navLabelActive,
          ]}
        >
          {t('title')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // CSS: height: 50px; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; display: flex; padding: 8px; margin: 12px 20px 10px;
  bottomNav: {
    height: theme.layout.bottomNavHeight, // 50px
    backgroundColor: theme.colors.navBackground, // #0a0a0a
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep, // Orange border
    borderRadius: theme.borderRadius.large, // 12px
    flexDirection: 'row',
    padding: theme.spacing.lg, // 8px
    marginHorizontal: theme.spacing.xxxl, // 20px
    marginTop: theme.spacing.xl, // 12px
    marginBottom: 10,
  },

  // CSS: flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: transparent; color: #666; border-radius: 8px; padding: 4px;
  navItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs, // 2px
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.medium, // 8px
    paddingVertical: theme.spacing.sm, // 4px
  },

  // CSS: .nav-item.active { color: #fff; background: #1a1a1a; }
  navItemActive: {
    backgroundColor: theme.colors.buttonHover, // #1a1a1a
  },

  // CSS: font-size: 16px; color: inherit;
  navIcon: {
    fontSize: 16,
    color: theme.colors.textMuted, // #666
  },

  navIconActive: {
    color: theme.colors.text, // #fff
  },

  // CSS: font-size: 10px; font-weight: 500;
  navLabel: {
    fontSize: theme.typography.navLabel, // 10px
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted, // #666
  },

  navLabelActive: {
    color: theme.colors.orangeBright, // Bright orange for active tab
  },
});
