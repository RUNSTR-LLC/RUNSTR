/**
 * AchievementsCard - Display personal records across all workout types
 * Shows Cardio, Strength, Wellness, and Diet achievements
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type {
  AllPersonalRecords,
  CardioPR,
  StrengthPR,
  WellnessPR,
  DietPR,
} from '../../services/analytics/PersonalRecordsService';
import { PersonalRecordsService } from '../../services/analytics/PersonalRecordsService';

interface AchievementsCardProps {
  personalRecords: AllPersonalRecords;
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({
  personalRecords,
}) => {
  const hasAnyPRs =
    personalRecords.cardio.fastest5K ||
    personalRecords.cardio.fastest10K ||
    personalRecords.cardio.fastestHalfMarathon ||
    personalRecords.cardio.fastestMarathon ||
    personalRecords.cardio.longestStreak > 0 ||
    personalRecords.strength.maxWeight ||
    personalRecords.strength.bestWeightRepCombo ||
    personalRecords.strength.longestStreak > 0 ||
    personalRecords.wellness.longestStreak > 0 ||
    personalRecords.diet.maxFastingHours ||
    personalRecords.diet.longestMealStreak > 0;

  // Empty state
  if (!hasAnyPRs) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons
          name="trophy-outline"
          size={48}
          color={theme.colors.textMuted}
        />
        <Text style={styles.emptyText}>
          Start working out to unlock achievements!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cardio PRs */}
      {renderCardioSection(personalRecords.cardio)}

      {/* Strength PRs */}
      {renderStrengthSection(personalRecords.strength)}

      {/* Wellness PRs */}
      {renderWellnessSection(personalRecords.wellness)}

      {/* Diet PRs */}
      {renderDietSection(personalRecords.diet)}
    </View>
  );
};

/**
 * Render Cardio Achievements Section
 */
function renderCardioSection(cardio: CardioPR) {
  const hasCardio =
    cardio.fastest5K ||
    cardio.fastest10K ||
    cardio.fastestHalfMarathon ||
    cardio.fastestMarathon ||
    cardio.longestStreak > 0;

  if (!hasCardio) return null;

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="walk-outline" size={20} color="#FF9D42" />
        </View>
        <Text style={styles.sectionTitle}>Cardio</Text>
      </View>

      {/* PRs */}
      {cardio.fastest5K && (
        <View style={styles.prRow}>
          <Text style={styles.prLabel}>Fastest 5K</Text>
          <View style={styles.prValue}>
            <Text style={styles.prTime}>
              {PersonalRecordsService.formatDuration(cardio.fastest5K.time)}
            </Text>
            <Text style={styles.prDate}>
              {PersonalRecordsService.formatDate(cardio.fastest5K.date)}
            </Text>
          </View>
        </View>
      )}

      {cardio.fastest10K && (
        <View style={styles.prRow}>
          <Text style={styles.prLabel}>Fastest 10K</Text>
          <View style={styles.prValue}>
            <Text style={styles.prTime}>
              {PersonalRecordsService.formatDuration(cardio.fastest10K.time)}
            </Text>
            <Text style={styles.prDate}>
              {PersonalRecordsService.formatDate(cardio.fastest10K.date)}
            </Text>
          </View>
        </View>
      )}

      {cardio.fastestHalfMarathon && (
        <View style={styles.prRow}>
          <Text style={styles.prLabel}>Fastest Half Marathon</Text>
          <View style={styles.prValue}>
            <Text style={styles.prTime}>
              {PersonalRecordsService.formatDuration(
                cardio.fastestHalfMarathon.time
              )}
            </Text>
            <Text style={styles.prDate}>
              {PersonalRecordsService.formatDate(
                cardio.fastestHalfMarathon.date
              )}
            </Text>
          </View>
        </View>
      )}

      {cardio.fastestMarathon && (
        <View style={styles.prRow}>
          <Text style={styles.prLabel}>Fastest Marathon</Text>
          <View style={styles.prValue}>
            <Text style={styles.prTime}>
              {PersonalRecordsService.formatDuration(
                cardio.fastestMarathon.time
              )}
            </Text>
            <Text style={styles.prDate}>
              {PersonalRecordsService.formatDate(cardio.fastestMarathon.date)}
            </Text>
          </View>
        </View>
      )}

      {cardio.longestStreak > 0 && (
        <View style={styles.prRow}>
          <Text style={styles.prLabel}>Longest Streak</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color="#FF7B1C" />
            <Text style={styles.streakValue}>{cardio.longestStreak}</Text>
            <Text style={styles.streakLabel}>days</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Render Strength Achievements Section
 */
function renderStrengthSection(strength: StrengthPR) {
  const hasStrength =
    strength.maxWeight ||
    strength.bestWeightRepCombo ||
    strength.longestStreak > 0;

  if (!hasStrength) return null;

  return (
    <>
      <View style={styles.divider} />
      <View style={styles.section}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="barbell-outline" size={20} color="#FF9D42" />
          </View>
          <Text style={styles.sectionTitle}>Strength</Text>
        </View>

        {/* PRs */}
        {strength.maxWeight && (
          <View style={styles.prRow}>
            <Text style={styles.prLabel}>Max Weight</Text>
            <View style={styles.prValue}>
              <Text style={styles.prTime}>{strength.maxWeight.weight} lbs</Text>
              <Text style={styles.prDate}>
                {PersonalRecordsService.formatDate(strength.maxWeight.date)}
              </Text>
            </View>
          </View>
        )}

        {strength.bestWeightRepCombo && (
          <View style={styles.prRow}>
            <Text style={styles.prLabel}>Best Weight × Reps</Text>
            <View style={styles.prValue}>
              <Text style={styles.prTime}>
                {strength.bestWeightRepCombo.weight} lbs ×{' '}
                {strength.bestWeightRepCombo.reps}
              </Text>
              <Text style={styles.prDate}>
                {PersonalRecordsService.formatDate(
                  strength.bestWeightRepCombo.date
                )}
              </Text>
            </View>
          </View>
        )}

        {strength.longestStreak > 0 && (
          <View style={styles.prRow}>
            <Text style={styles.prLabel}>Longest Streak</Text>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color="#FF7B1C" />
              <Text style={styles.streakValue}>{strength.longestStreak}</Text>
              <Text style={styles.streakLabel}>days</Text>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

/**
 * Render Wellness Achievements Section
 */
function renderWellnessSection(wellness: WellnessPR) {
  if (wellness.longestStreak === 0) return null;

  return (
    <>
      <View style={styles.divider} />
      <View style={styles.section}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="flower-outline" size={20} color="#FF9D42" />
          </View>
          <Text style={styles.sectionTitle}>Wellness</Text>
        </View>

        {/* PRs */}
        <View style={styles.prRow}>
          <Text style={styles.prLabel}>Longest Streak</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color="#FF7B1C" />
            <Text style={styles.streakValue}>{wellness.longestStreak}</Text>
            <Text style={styles.streakLabel}>days</Text>
          </View>
        </View>
      </View>
    </>
  );
}

/**
 * Render Diet Achievements Section
 */
function renderDietSection(diet: DietPR) {
  const hasDiet = diet.maxFastingHours || diet.longestMealStreak > 0;

  if (!hasDiet) return null;

  return (
    <>
      <View style={styles.divider} />
      <View style={styles.section}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="restaurant-outline" size={20} color="#FF9D42" />
          </View>
          <Text style={styles.sectionTitle}>Nutrition</Text>
        </View>

        {/* PRs */}
        {diet.longestMealStreak > 0 && (
          <View style={styles.prRow}>
            <Text style={styles.prLabel}>Meal Logging Streak</Text>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color="#FF7B1C" />
              <Text style={styles.streakValue}>{diet.longestMealStreak}</Text>
              <Text style={styles.streakLabel}>days</Text>
            </View>
          </View>
        )}

        {diet.maxFastingHours && (
          <View style={styles.prRow}>
            <Text style={styles.prLabel}>Longest Fast</Text>
            <View style={styles.prValue}>
              <Text style={styles.prTime}>
                {diet.maxFastingHours.hours.toFixed(1)} hrs
              </Text>
              <Text style={styles.prDate}>
                {PersonalRecordsService.formatDate(diet.maxFastingHours.date)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
  },

  emptyCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 32,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },

  section: {
    paddingVertical: 4,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 12,
  },

  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  prLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    flex: 1,
  },

  prValue: {
    alignItems: 'flex-end',
  },

  prTime: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42',
    marginBottom: 2,
  },

  prDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  streakValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
  },

  streakLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 2,
  },
});
