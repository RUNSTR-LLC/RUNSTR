import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(null);

  const activeCategoryIndex = gridPosition.row;
  const activeCategory = CATEGORY_MENU[activeCategoryIndex];
  const activeActivityKey = activeCategory?.activities[gridPosition.column]?.key || '';

  const handleCategoryPress = useCallback((index: number) => {
    if (isWorkoutActive) return;
    setOpenCategoryIndex(index);
  }, [isWorkoutActive]);

  const handleActivitySelect = useCallback((activityKey: string) => {
    if (openCategoryIndex === null) return;

    const category = CATEGORY_MENU[openCategoryIndex];
    const columnIndex = category.activities.findIndex((a) => a.key === activityKey);

    if (columnIndex >= 0) {
      onActivitySelect(openCategoryIndex, columnIndex);
    }

    setOpenCategoryIndex(null);
  }, [openCategoryIndex, onActivitySelect]);

  return (
    <View>
      {/* Category labels — inline in header */}
      <View style={styles.bar}>
        {CATEGORY_MENU.map((cat, index) => {
          const isActive = index === activeCategoryIndex;
          return (
            <TouchableOpacity
              key={cat.key}
              style={styles.categoryButton}
              onPress={() => handleCategoryPress(index)}
              activeOpacity={0.7}
              disabled={isWorkoutActive}
            >
              <Text
                style={[
                  styles.categoryLabel,
                  isActive && styles.categoryLabelActive,
                  isWorkoutActive && styles.categoryLabelDisabled,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dropdown — renders below the bar */}
      {openCategoryIndex !== null && (
        <ActivityDropdown
          category={CATEGORY_MENU[openCategoryIndex]}
          activeActivityKey={
            openCategoryIndex === activeCategoryIndex ? activeActivityKey : ''
          }
          isOpen={true}
          onSelectActivity={handleActivitySelect}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
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
  categoryLabelDisabled: {
    color: theme.colors.textMuted,
  },
});
