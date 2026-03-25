// src/components/activity/ActivityDropdown.tsx

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';
import { ActivityPill } from './ActivityPill';
import type { CategoryConfig } from '../../types/activityMenu';

const DROPDOWN_HEIGHT = 80;

interface ActivityDropdownProps {
  category: CategoryConfig;
  activeActivityKey: string;
  isOpen: boolean;
  onSelectActivity: (activityKey: string) => void;
}

export const ActivityDropdown: React.FC<ActivityDropdownProps> = ({
  category,
  activeActivityKey,
  isOpen,
  onSelectActivity,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isOpen ? 1 : 0, {
        duration: isOpen ? 200 : 150,
        easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      }),
      transform: [
        {
          translateY: withTiming(isOpen ? 0 : -DROPDOWN_HEIGHT, {
            duration: isOpen ? 200 : 150,
            easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
          }),
        },
      ],
    };
  });

  return (
    <View style={styles.clipContainer} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Animated.View style={[styles.dropdown, animatedStyle]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {category.activities.map((activity) => (
            <ActivityPill
              key={activity.key}
              activity={activity}
              isActive={activity.key === activeActivityKey}
              onPress={() => onSelectActivity(activity.key)}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  clipContainer: {
    height: DROPDOWN_HEIGHT,
    overflow: 'hidden',
  },
  dropdown: {
    height: DROPDOWN_HEIGHT,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    justifyContent: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 8,
    flexGrow: 1,
  },
});
