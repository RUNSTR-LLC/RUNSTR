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

// Predefined challenge types with activity-specific options
const CHALLENGE_TYPES: ChallengeType[] = [
  // Cardio Challenges
  {
    id: 'fastest-5k-run',
    name: 'Fastest 5K Run',
    description: 'Best time to complete 5 kilometers running',
    category: 'cardio',
    activityType: 'running',
    metric: 'time',
  },
  {
    id: 'most-distance-walking',
    name: 'Most Distance Walking',
    description: 'Most distance covered walking in 7 days',
    category: 'cardio',
    activityType: 'walking',
    metric: 'distance',
  },
  {
    id: 'longest-cycling-ride',
    name: 'Longest Cycling Ride',
    description: 'Longest single cycling session',
    category: 'cardio',
    activityType: 'cycling',
    metric: 'distance',
  },
  {
    id: 'elevation-gain-hiking',
    name: 'Elevation Gain Hiking',
    description: 'Most elevation gained while hiking',
    category: 'cardio',
    activityType: 'hiking',
    metric: 'elevation',
  },
  {
    id: 'most-swimming-laps',
    name: 'Most Swimming Laps',
    description: 'Total laps completed in pool',
    category: 'cardio',
    activityType: 'swimming',
    metric: 'laps',
  },
  // Strength Challenges
  {
    id: 'most-pushups-single',
    name: 'Most Pushups (Single Session)',
    description: 'Most pushup reps in one session',
    category: 'strength',
    activityType: 'pushups',
    metric: 'reps',
  },
  {
    id: 'total-pullup-reps-weekly',
    name: 'Total Pullup Reps (Weekly)',
    description: 'Most pullup reps accumulated in 7 days',
    category: 'strength',
    activityType: 'pullups',
    metric: 'reps',
  },
  {
    id: 'situp-endurance-5min',
    name: 'Situp Endurance (5 Minutes)',
    description: 'Most situps completed in 5 minutes',
    category: 'strength',
    activityType: 'situps',
    metric: 'reps',
  },
  {
    id: 'heaviest-lift',
    name: 'Heaviest Lift',
    description: 'Highest weight lifted in single rep',
    category: 'strength',
    activityType: 'weights',
    metric: 'weight',
  },
  {
    id: 'most-sets-completed',
    name: 'Most Sets Completed',
    description: 'Total strength training sets in week',
    category: 'strength',
    activityType: 'strength',
    metric: 'sets',
  },
  // Wellness Challenges
  {
    id: 'weekly-meditation-minutes',
    name: 'Weekly Meditation Minutes',
    description: 'Most meditation time in 7 days',
    category: 'wellness',
    activityType: 'meditation',
    metric: 'duration',
  },
  {
    id: 'yoga-session-streak',
    name: 'Yoga Session Streak',
    description: 'Most consecutive days with yoga sessions',
    category: 'wellness',
    activityType: 'yoga',
    metric: 'sessions',
  },
  {
    id: 'most-poses-completed',
    name: 'Most Poses Completed',
    description: 'Total yoga poses completed in week',
    category: 'wellness',
    activityType: 'yoga',
    metric: 'poses',
  },
  // Endurance Challenges
  {
    id: 'longest-treadmill-session',
    name: 'Longest Treadmill Session',
    description: 'Longest single treadmill workout',
    category: 'endurance',
    activityType: 'treadmill',
    metric: 'duration',
  },
  {
    id: 'most-rowing-distance',
    name: 'Most Rowing Distance',
    description: 'Total rowing distance in week',
    category: 'endurance',
    activityType: 'rowing',
    metric: 'distance',
  },
  {
    id: 'weekly-consistency',
    name: 'Weekly Consistency',
    description: 'Most active days in a week',
    category: 'endurance',
    activityType: 'any',
    metric: 'consistency',
  },
];

const CATEGORY_TITLES: Record<ChallengeCategory, string> = {
  cardio: 'Cardio Challenges',
  strength: 'Strength Challenges',
  wellness: 'Wellness Challenges',
  endurance: 'Endurance Challenges',
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
