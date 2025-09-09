/**
 * LeagueSettingsStep - Configure competition settings for team creation
 * Handles competition type, duration, payout structure, and prize pool selection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../../styles/theme';
import {
  CompetitionType,
  CompetitionDuration,
  PayoutStructure,
  PrizePoolAmount,
  LeagueSettingsFormData,
  TeamCreationStepProps,
} from '../../../types';

interface RadioOption<T> {
  value: T;
  title: string;
  description: string;
  highlight?: string;
}

const competitionOptions: RadioOption<CompetitionType>[] = [
  {
    value: 'streaks',
    title: 'Streaks',
    description:
      'Reward consistency and daily activity. Perfect for building habits and encouraging regular participation.',
  },
  {
    value: 'distance',
    title: 'Distance',
    description:
      'Compete on total distance covered. Great for endurance athletes and marathon trainers.',
  },
  {
    value: 'speed',
    title: 'Speed',
    description:
      'Focus on pace and fastest times. Ideal for competitive runners who want to push their limits.',
  },
];

const durationOptions: RadioOption<CompetitionDuration>[] = [
  {
    value: 'weekly',
    title: 'Weekly',
    description:
      'Competitions reset every week. More frequent rewards and fresh starts for consistent engagement.',
  },
  {
    value: 'monthly',
    title: 'Monthly',
    description:
      'Competitions reset every month. Longer term goals with bigger prize pools and sustained effort.',
  },
];

const payoutOptions: RadioOption<PayoutStructure>[] = [
  {
    value: 'top3',
    title: 'Top 3',
    description:
      'Rewards for 1st, 2nd, and 3rd place. Higher individual rewards for top performers.',
  },
  {
    value: 'top5',
    title: 'Top 5',
    description:
      'Rewards for top 5 performers. Balanced approach with good motivation for more members.',
  },
  {
    value: 'top10',
    title: 'Top 10',
    description:
      'Rewards for top 10 performers. More members get rewarded, great for larger teams.',
  },
];

const prizePoolOptions: RadioOption<PrizePoolAmount>[] = [
  {
    value: 5000,
    title: '5,000 sats',
    description:
      'Starter pool perfect for new teams getting established and testing the waters.',
    highlight: '5,000 sats',
  },
  {
    value: 21000,
    title: '21,000 sats',
    description:
      'Standard competitive pool that attracts serious participants and regular activity.',
    highlight: '21,000 sats',
  },
  {
    value: 50000,
    title: '50,000 sats',
    description:
      'Premium high-stakes pool for elite teams and maximum competitive intensity.',
    highlight: '50,000 sats',
  },
];

export const LeagueSettingsStep: React.FC<TeamCreationStepProps> = ({
  data,
  onDataChange,
}) => {
  const [formData, setFormData] = useState<LeagueSettingsFormData>(() => ({
    competitionType: (data.competitionType as CompetitionType) || null,
    duration: (data.duration as CompetitionDuration) || null,
    payoutStructure: (data.payoutStructure as PayoutStructure) || null,
    prizePool: (data.prizePool as PrizePoolAmount) || null,
  }));

  // Update parent data when form changes
  useEffect(() => {
    if (
      formData.competitionType &&
      formData.duration &&
      formData.payoutStructure &&
      formData.prizePool
    ) {
      onDataChange({
        competitionType: formData.competitionType,
        duration: formData.duration,
        payoutStructure: formData.payoutStructure,
        prizePool: formData.prizePool,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const handleOptionSelect = <T,>(
    field: keyof LeagueSettingsFormData,
    value: T
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isOptionSelected = <T,>(
    field: keyof LeagueSettingsFormData,
    value: T
  ): boolean => {
    return formData[field] === value;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Set up your league</Text>
        <Text style={styles.stepSubtitle}>
          Configure how your team competes and how rewards are distributed to
          create the perfect competitive environment.
        </Text>
      </View>

      {/* Competition Type Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Competition Type</Text>
        <View style={styles.radioGroup}>
          {competitionOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioItem,
                isOptionSelected('competitionType', option.value) &&
                  styles.radioItemSelected,
              ]}
              onPress={() =>
                handleOptionSelect('competitionType', option.value)
              }
            >
              <View style={styles.radioContent}>
                <Text style={styles.radioTitle}>{option.title}</Text>
                <Text style={styles.radioDescription}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Competition Duration Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Competition Duration</Text>
        <View style={styles.radioGroup}>
          {durationOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioItem,
                isOptionSelected('duration', option.value) &&
                  styles.radioItemSelected,
              ]}
              onPress={() => handleOptionSelect('duration', option.value)}
            >
              <View style={styles.radioContent}>
                <Text style={styles.radioTitle}>{option.title}</Text>
                <Text style={styles.radioDescription}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Who Gets Rewarded Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Who Gets Rewarded</Text>
        <View style={styles.radioGroup}>
          {payoutOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioItem,
                isOptionSelected('payoutStructure', option.value) &&
                  styles.radioItemSelected,
              ]}
              onPress={() =>
                handleOptionSelect('payoutStructure', option.value)
              }
            >
              <View style={styles.radioContent}>
                <Text style={styles.radioTitle}>{option.title}</Text>
                <Text style={styles.radioDescription}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Prize Pool Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Prize Pool</Text>
        <View style={styles.radioGroup}>
          {prizePoolOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioItem,
                isOptionSelected('prizePool', option.value) &&
                  styles.radioItemSelected,
              ]}
              onPress={() => handleOptionSelect('prizePool', option.value)}
            >
              <View style={styles.radioContent}>
                <Text style={styles.prizeHighlight}>{option.highlight}</Text>
                <Text style={styles.radioDescription}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingTop: 24,
  },

  stepHeader: {
    marginBottom: 32,
  },

  stepTitle: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
    lineHeight: 34,
  },

  stepSubtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },

  formSection: {
    marginBottom: 32,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 16,
  },

  radioGroup: {
    gap: 12,
  },

  radioItem: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
  },

  radioItemSelected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.buttonHover,
  },

  radioContent: {
    flex: 1,
  },

  radioTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  radioDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  prizeHighlight: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
});
