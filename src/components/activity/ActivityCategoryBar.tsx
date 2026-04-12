import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    setOpenCategoryIndex((prev) => (prev === null ? activeCategoryIndex : null));
  }, [isWorkoutActive, activeCategoryIndex]);

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
      {/* Collapsed trigger — shows current activity with chevron */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={handleToggle}
        activeOpacity={0.7}
        disabled={isWorkoutActive}
      >
        <Text
          style={[
            styles.triggerLabel,
            isWorkoutActive && styles.triggerLabelDisabled,
          ]}
        >
          {activeActivityLabel || 'Select activity'}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={isWorkoutActive ? theme.colors.textMuted : theme.colors.text}
        />
      </TouchableOpacity>

      {/* Expanded: category tabs + activity pills */}
      {isOpen && (
        <View style={styles.expanded}>
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    gap: 8,
  },
  triggerLabel: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    letterSpacing: 0.5,
  },
  triggerLabelDisabled: {
    color: theme.colors.textMuted,
  },
  expanded: {
    marginTop: 8,
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
