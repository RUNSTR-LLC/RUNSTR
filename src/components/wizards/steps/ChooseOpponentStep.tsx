/**
 * ChooseOpponentStep - First step of challenge creation wizard
 * Allows users to select a teammate to challenge from their team
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { TeammateInfo } from '../../../types';

interface ChooseOpponentStepProps {
  teammates: TeammateInfo[];
  selectedOpponentId?: string;
  onSelectOpponent: (teammate: TeammateInfo) => void;
}

interface TeammateItemProps {
  teammate: TeammateInfo;
  isSelected: boolean;
  onSelect: () => void;
}

const SelectionIndicator: React.FC<{ isSelected: boolean }> = ({
  isSelected,
}) => (
  <View
    style={[
      styles.selectionIndicator,
      isSelected && styles.selectionIndicatorSelected,
    ]}
  >
    {isSelected && <Text style={styles.checkmark}>✓</Text>}
  </View>
);

const TeammateItem: React.FC<TeammateItemProps> = ({
  teammate,
  isSelected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[styles.teammateItem, isSelected && styles.teammateItemSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.teammateAvatar}>
        <Text style={styles.teammateAvatarText}>{teammate.avatar}</Text>
      </View>

      <View style={styles.teammateInfo}>
        <Text style={styles.teammateName}>{teammate.name}</Text>
        <Text style={styles.teammateStats}>
          {teammate.stats.challengesCount} challenges •{' '}
          {teammate.stats.winsCount} wins
        </Text>
      </View>

      <SelectionIndicator isSelected={isSelected} />
    </TouchableOpacity>
  );
};

export const ChooseOpponentStep: React.FC<ChooseOpponentStepProps> = ({
  teammates,
  selectedOpponentId,
  onSelectOpponent,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.teammatesList}
        showsVerticalScrollIndicator={false}
      >
        {teammates.map((teammate) => (
          <TeammateItem
            key={teammate.id}
            teammate={teammate}
            isSelected={teammate.id === selectedOpponentId}
            onSelect={() => onSelectOpponent(teammate)}
          />
        ))}

        {teammates.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No teammates available</Text>
            <Text style={styles.emptyStateSubtext}>
              Join a team to challenge teammates
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  teammatesList: {
    flex: 1,
  },
  teammateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  teammateItemSelected: {
    backgroundColor: theme.colors.border,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomColor: theme.colors.border,
  },
  teammateAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teammateAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  teammateInfo: {
    flex: 1,
  },
  teammateName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  teammateStats: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  selectionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIndicatorSelected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.text,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
