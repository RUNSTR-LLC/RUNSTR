/**
 * TopBar — shared top bar for the three main tabs (Dashboard, Social,
 * Leaderboard). Workout-history (clock) on the left, Settings (hamburger) on
 * the right. Kept identical across tabs so global nav feels consistent.
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { createNavigationHandlers } from '../../navigation/navigationHandlers';

interface TopBarProps {
  /**
   * Override the menu (Settings) action. Defaults to opening Settings with the
   * standard support / sign-out handlers. The Dashboard passes its own richer
   * handler; Social/Leaderboard use the default.
   */
  onMenuPress?: () => void;
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export const TopBar: React.FC<TopBarProps> = ({ onMenuPress }) => {
  const navigation = useNavigation<any>();

  const handleHistoryPress = useCallback(async () => {
    const npub = (await AsyncStorage.getItem('@runstr:npub')) ?? '';
    navigation.navigate('WorkoutHistory', { userId: npub, pubkey: npub });
  }, [navigation]);

  const handleMenuPress = useCallback(() => {
    if (onMenuPress) {
      onMenuPress();
      return;
    }
    const handlers = createNavigationHandlers();
    navigation.navigate('Settings', {
      onHelp: () => handlers.handleHelp(navigation),
      onContactSupport: () => handlers.handleContactSupport(navigation),
      onPrivacyPolicy: () => handlers.handlePrivacyPolicy(navigation),
      onSignOut: () => handlers.handleSignOut(navigation),
    });
  }, [navigation, onMenuPress]);

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleHistoryPress}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Workout history"
      >
        <Ionicons name="time-outline" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleMenuPress}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Ionicons name="menu-outline" size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    zIndex: 10,
  },
  button: { padding: 4 },
});

export default TopBar;
