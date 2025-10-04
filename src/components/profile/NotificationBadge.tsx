/**
 * NotificationBadge - Red badge showing unread notification count
 * Displayed in bottom-right of profile area, tappable to open notification modal
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { theme } from '../../styles/theme';
import { unifiedNotificationStore } from '../../services/notifications/UnifiedNotificationStore';

interface NotificationBadgeProps {
  onPress: () => void;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ onPress }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const scaleAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Subscribe to notification changes
    const unsubscribe = unifiedNotificationStore.subscribe((notifications, count) => {
      setUnreadCount(count);

      // Show/hide badge based on count
      const shouldBeVisible = count > 0;
      if (shouldBeVisible !== isVisible) {
        setIsVisible(shouldBeVisible);

        // Animate in/out
        Animated.spring(scaleAnim, {
          toValue: shouldBeVisible ? 1 : 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isVisible, scaleAnim]);

  // Don't render anything if no unread notifications
  if (unreadCount === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.badge}
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.badgeText}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 100,
  },
  badge: {
    backgroundColor: '#dc2626', // Red badge
    borderRadius: 20,
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for visibility
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badgeText: {
    color: theme.colors.textBright,
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
});
