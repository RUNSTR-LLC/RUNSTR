/**
 * TeamBasicsStep - First step of team creation wizard
 * Collects team name and description with validation
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../../styles/theme';
import { TeamCreationData } from '../../../types';

interface TeamBasicsStepProps {
  data: TeamCreationData;
  onUpdate: (updates: Partial<TeamCreationData>) => void;
  isValid: boolean;
}

export const TeamBasicsStep: React.FC<TeamBasicsStepProps> = ({
  data,
  onUpdate,
  isValid,
}) => {
  const handleTeamNameChange = (text: string) => {
    onUpdate({ teamName: text });
  };

  const handleTeamAboutChange = (text: string) => {
    onUpdate({ teamAbout: text });
  };

  // Character count helpers
  const getCharacterCountStyle = (current: number, max: number) => {
    const percentage = current / max;
    return [
      styles.characterCount,
      percentage > 0.9 && styles.characterCountWarning,
    ];
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Step Header */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepMainTitle}>What&apos;s your team called?</Text>
        <Text style={styles.stepSubtitle}>
          Choose a name and description that represents your team&apos;s
          identity and attracts the right members.
        </Text>
      </View>

      {/* Team Name Input */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Team Name</Text>
        <TextInput
          style={styles.formInput}
          placeholder="Enter your team name"
          placeholderTextColor={theme.colors.textMuted}
          value={data.teamName}
          onChangeText={handleTeamNameChange}
          maxLength={50}
          autoCapitalize="words"
          autoCorrect={true}
        />
        <Text style={getCharacterCountStyle(data.teamName.length, 50)}>
          {data.teamName.length}/50
        </Text>
      </View>

      {/* Team Description Input */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>About Your Team</Text>
        <TextInput
          style={[styles.formInput, styles.formTextarea]}
          placeholder="Describe your team's mission, goals, and what members can expect. What makes your team unique?"
          placeholderTextColor={theme.colors.textMuted}
          value={data.teamAbout}
          onChangeText={handleTeamAboutChange}
          maxLength={300}
          multiline={true}
          numberOfLines={6}
          textAlignVertical="top"
          autoCapitalize="sentences"
          autoCorrect={true}
        />
        <Text style={getCharacterCountStyle(data.teamAbout.length, 300)}>
          {data.teamAbout.length}/300
        </Text>
      </View>

      {/* Validation Helper Text */}
      {data.teamName.length > 0 && data.teamName.length < 3 && (
        <View style={styles.validationHelper}>
          <Text style={styles.validationText}>
            Team name must be at least 3 characters
          </Text>
        </View>
      )}

      {data.teamAbout.length > 0 && data.teamAbout.length < 20 && (
        <View style={styles.validationHelper}>
          <Text style={styles.validationText}>
            Team description must be at least 20 characters
          </Text>
        </View>
      )}

      {/* Success indicator when valid */}
      {isValid && (
        <View style={styles.validationHelper}>
          <Text style={styles.validationSuccessText}>✓ Ready to continue</Text>
        </View>
      )}
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
    flexGrow: 1,
  },

  // Step Header
  stepHeader: {
    marginBottom: 32,
  },

  stepMainTitle: {
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
    paddingHorizontal: 0,
  },

  // Form Elements
  formGroup: {
    marginBottom: 24,
  },

  formLabel: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  formInput: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: theme.colors.text,
  },

  formTextarea: {
    minHeight: 120,
    maxHeight: 160,
    paddingTop: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },

  // Character Count
  characterCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: 6,
  },

  characterCountWarning: {
    color: '#ff9500', // Orange warning color from HTML mockup
  },

  // Validation Helpers
  validationHelper: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  validationText: {
    fontSize: 14,
    color: '#ff9500', // Orange for warnings
    lineHeight: 18,
  },

  validationSuccessText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 18,
  },
});
