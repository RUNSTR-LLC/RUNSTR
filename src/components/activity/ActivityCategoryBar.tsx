import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import { ActivityDropdown } from './ActivityDropdown';
import { CATEGORY_MENU } from '../../types/activityMenu';
import { GridPosition } from '../../services/activity/ActivityGridService';

export type { GridPosition };

interface ActivityCategoryBarProps {
  gridPosition: GridPosition;
  onActivitySelect: (row: number, column: number) => void;
  isWorkoutActive: boolean;
}

export const ActivityCategoryBar: React.FC<ActivityCategoryBarProps> = ({
  gridPosition,
  onActivitySelect,
  isWorkoutActive,
}) => {
  // Which category's dropdown is currently visible (null = collapsed)
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(null);

  const activeCategoryIndex = gridPosition.row;
  const activeCategory = CATEGORY_MENU[activeCategoryIndex];
  const activeActivity = activeCategory?.activities[gridPosition.column];
  const activeActivityKey = activeActivity?.key || '';
  const activeActivityLabel = activeActivity?.label || '';

  const isOpen = openCategoryIndex !== null;

  const handleToggle = useCallback(() => {
    if (isWorkoutActive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenCategoryIndex((prev) => (prev === null ? activeCategoryIndex : null));
  }, [isWorkoutActive, activeCategoryIndex]);

  const handleCategoryPress = useCallback((index: number) => {
    if (isWorkoutActive) return;
    Haptics.selectionAsync();
    setOpenCategoryIndex(index);
  }, [isWorkoutActive]);

  const handleActivitySelect = useCallback((activityKey: string) => {
    if (openCategoryIndex === null) return;

    const category = CATEGORY_MENU[openCategoryIndex];
    const columnIndex = category.activities.findIndex((a) => a.key === activityKey);

    if (columnIndex >= 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onActivitySelect(openCategoryIndex, columnIndex);
    }

    setOpenCategoryIndex(null);
  }, [openCategoryIndex, onActivitySelect]);

  return (
    <View style={styles.wrapper}>
      {/* Collapsed trigger — icon-only chevron button */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={handleToggle}
        activeOpacity={0.7}
        disabled={isWorkoutActive}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={isWorkoutActive ? theme.colors.textMuted : theme.colors.text}
        />
      </TouchableOpacity>

      {/* Expanded: category tabs + activity pills */}
      {isOpen && (
        <View style={styles.expanded}>
          {/* Category tabs only matter with >1 category. App is cardio-only, so hide
              the redundant single "Cardio" row and show the activities directly. */}
          {CATEGORY_MENU.length > 1 && (
            <View style={styles.categoryBar}>
              {CATEGORY_MENU.map((cat, index) => {
                const isActive = index === openCategoryIndex;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={styles.categoryButton}
                    onPress={() => handleCategoryPress(index)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryLabel,
                        isActive && styles.categoryLabelActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <ActivityDropdown
            category={CATEGORY_MENU[openCategoryIndex]}
            activeActivityKey={
              openCategoryIndex === activeCategoryIndex ? activeActivityKey : ''
            }
            isOpen={true}
            onSelectActivity={handleActivitySelect}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    zIndex: 20,
  },
  trigger: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 21,
  },
  expanded: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingBottom: 8,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  categoryLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  categoryLabelActive: {
    color: theme.colors.text,
  },
});
