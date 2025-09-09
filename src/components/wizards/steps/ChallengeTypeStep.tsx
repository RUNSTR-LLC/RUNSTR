/**
 * ChallengeTypeStep - Second step of challenge creation wizard
 * Allows users to select from categorized challenge types
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
import { ChallengeType, type ChallengeCategory } from '../../../types';

interface ChallengeTypeStepProps {
  selectedChallengeType?: ChallengeType;
  onSelectChallengeType: (challengeType: ChallengeType) => void;
}

interface ChallengeOptionProps {
  challengeType: ChallengeType;
  isSelected: boolean;
  onSelect: () => void;
}

// Predefined challenge types matching the HTML mockup
const CHALLENGE_TYPES: ChallengeType[] = [
  // Race Challenges
  {
    id: 'fastest-5k',
    name: 'Fastest 5K',
    description: 'Best time to complete 5 kilometers wins',
    category: 'race',
    metric: 'time',
  },
  {
    id: 'fastest-10k',
    name: 'Fastest 10K',
    description: 'Best time to complete 10 kilometers wins',
    category: 'race',
    metric: 'time',
  },
  {
    id: 'fastest-half-marathon',
    name: 'Fastest Half Marathon',
    description: 'Best time to complete 21.1 kilometers wins',
    category: 'race',
    metric: 'time',
  },
  // Distance Challenges
  {
    id: 'weekly-distance',
    name: 'Weekly Distance',
    description: 'Most distance covered in 7 days wins',
    category: 'distance',
    metric: 'distance',
  },
  {
    id: 'monthly-distance',
    name: 'Monthly Distance',
    description: 'Most distance covered in 30 days wins',
    category: 'distance',
    metric: 'distance',
  },
  // Activity Challenges
  {
    id: 'daily-steps',
    name: 'Daily Steps',
    description: 'Most steps in a single day wins',
    category: 'activity',
    metric: 'steps',
  },
  {
    id: 'consistency',
    name: 'Consistency',
    description: 'Most active days in a week wins',
    category: 'activity',
    metric: 'consistency',
  },
];

const CATEGORY_TITLES: Record<ChallengeCategory, string> = {
  race: 'Race Challenges',
  distance: 'Distance Challenges',
  activity: 'Activity Challenges',
};

const ChallengeOption: React.FC<ChallengeOptionProps> = ({
  challengeType,
  isSelected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.challengeOption,
        isSelected && styles.challengeOptionSelected,
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <Text style={styles.challengeOptionName}>{challengeType.name}</Text>
      <Text style={styles.challengeOptionDesc}>
        {challengeType.description}
      </Text>
    </TouchableOpacity>
  );
};

interface ChallengeCategoryProps {
  category: ChallengeCategory;
  challengeTypes: ChallengeType[];
  selectedChallengeType?: ChallengeType;
  onSelectChallengeType: (challengeType: ChallengeType) => void;
}

const ChallengeCategorySection: React.FC<ChallengeCategoryProps> = ({
  category,
  challengeTypes,
  selectedChallengeType,
  onSelectChallengeType,
}) => {
  return (
    <View style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{CATEGORY_TITLES[category]}</Text>
      <View style={styles.challengeOptions}>
        {challengeTypes.map((challengeType) => (
          <ChallengeOption
            key={challengeType.id}
            challengeType={challengeType}
            isSelected={selectedChallengeType?.id === challengeType.id}
            onSelect={() => onSelectChallengeType(challengeType)}
          />
        ))}
      </View>
    </View>
  );
};

export const ChallengeTypeStep: React.FC<ChallengeTypeStepProps> = ({
  selectedChallengeType,
  onSelectChallengeType,
}) => {
  // Group challenge types by category
  const challengesByCategory = CHALLENGE_TYPES.reduce((acc, challengeType) => {
    const category = challengeType.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(challengeType);
    return acc;
  }, {} as Record<ChallengeCategory, ChallengeType[]>);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.challengeCategories}
        showsVerticalScrollIndicator={false}
      >
        {(Object.keys(challengesByCategory) as ChallengeCategory[]).map(
          (category) => (
            <ChallengeCategorySection
              key={category}
              category={category}
              challengeTypes={challengesByCategory[category]}
              selectedChallengeType={selectedChallengeType}
              onSelectChallengeType={onSelectChallengeType}
            />
          )
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  challengeCategories: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  challengeOptions: {
    gap: 8,
  },
  challengeOption: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },
  challengeOptionSelected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.border,
  },
  challengeOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  challengeOptionDesc: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
});
