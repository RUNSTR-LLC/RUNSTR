/**
 * LeagueCreationModal Component - Create 30-day fitness leagues
 * Integrates with competitionService for comprehensive team competitions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../../styles/theme';
import { CompetitionService } from '../../services/competition/competitionService';
import type { NostrTeam } from '../../services/nostr/NostrTeamService';
import type { CompetitionData } from '../../services/competition/competitionService';

interface LeagueCreationModalProps {
  visible: boolean;
  team: NostrTeam;
  captainPubkey: string;
  onClose: () => void;
  onLeagueCreated: (leagueId: string) => void;
}

type GoalType = 'distance' | 'speed' | 'duration' | 'consistency';

interface FormData {
  name: string;
  description: string;
  goalType: GoalType;
  goalValue: string;
  goalUnit: string;
  startTime: 'now' | 'custom';
  customStartTime?: Date;
  durationDays: number;
}

const LEAGUE_GOALS: { value: GoalType; label: string; description: string }[] =
  [
    {
      value: 'distance',
      label: 'Distance League',
      description: 'Total distance over 30 days',
    },
    {
      value: 'consistency',
      label: 'Consistency League',
      description: 'Most consistent activity',
    },
    {
      value: 'duration',
      label: 'Duration League',
      description: 'Total workout time',
    },
    {
      value: 'speed',
      label: 'Speed League',
      description: 'Best average pace maintained',
    },
  ];

const DURATION_OPTIONS = [
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 30, label: '1 Month' },
  { days: 60, label: '2 Months' },
  { days: 90, label: '3 Months' },
];

const GOAL_UNITS = {
  distance: ['km', 'mi', 'm'],
  speed: ['min/km', 'min/mi', 'mph', 'kph'],
  duration: ['hours', 'minutes'],
  consistency: ['workouts/week', 'days/week'],
};

export const LeagueCreationModal: React.FC<LeagueCreationModalProps> = ({
  visible,
  team,
  captainPubkey,
  onClose,
  onLeagueCreated,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    goalType: 'distance',
    goalValue: '',
    goalUnit: 'km',
    startTime: 'now',
    durationDays: 30,
  });
  const [isCreating, setIsCreating] = useState(false);

  const competitionService = CompetitionService.getInstance();

  const updateFormData = <K extends keyof FormData>(
    key: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleGoalTypeChange = (goalType: GoalType) => {
    const defaultUnit = GOAL_UNITS[goalType][0];
    updateFormData('goalType', goalType);
    updateFormData('goalUnit', defaultUnit);
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'League name is required';
    }
    if (formData.name.length > 50) {
      return 'League name must be 50 characters or less';
    }
    if (formData.description.length > 300) {
      return 'Description must be 300 characters or less';
    }
    if (formData.goalValue && isNaN(Number(formData.goalValue))) {
      return 'Goal value must be a number';
    }
    if (formData.goalValue && Number(formData.goalValue) <= 0) {
      return 'Goal value must be greater than zero';
    }
    if (formData.durationDays < 7) {
      return 'League duration must be at least 7 days';
    }
    return null;
  };

  const handleCreateLeague = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    if (isCreating) return;

    try {
      setIsCreating(true);

      // Prepare competition data
      const competitionData: CompetitionData = {
        name: formData.name.trim(),
        description:
          formData.description.trim() ||
          `${formData.durationDays}-day ${formData.goalType} league for ${team.name}`,
        type: 'league',
        goalType: formData.goalType,
        goalValue: formData.goalValue ? Number(formData.goalValue) : undefined,
        goalUnit: formData.goalValue ? formData.goalUnit : undefined,
        durationDays: formData.durationDays,
        startTime:
          formData.startTime === 'now'
            ? Math.floor(Date.now() / 1000)
            : formData.customStartTime
            ? Math.floor(formData.customStartTime.getTime() / 1000)
            : Math.floor(Date.now() / 1000),
      };

      // Prepare league creation (returns unsigned event template)
      const result = competitionService.prepareCompetitionCreation(
        team,
        competitionData,
        captainPubkey
      );

      console.log(`✅ Prepared league creation: ${result.competitionId}`);

      // TODO: In a real implementation, this would need to be signed by the captain
      // For now, we'll simulate successful creation
      onLeagueCreated(result.competitionId);

      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        goalType: 'distance',
        goalValue: '',
        goalUnit: 'km',
        startTime: 'now',
        durationDays: 30,
      });

      onClose();

      Alert.alert(
        'League Created!',
        `"${formData.name}" has been created as a ${formData.durationDays}-day league.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to create league:', error);
      Alert.alert('Error', 'Failed to create league. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (isCreating) return;
    onClose();
  };

  const getDurationLabel = (): string => {
    const option = DURATION_OPTIONS.find(
      (opt) => opt.days === formData.durationDays
    );
    return option ? option.label : `${formData.durationDays} days`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleClose}
            disabled={isCreating}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create League</Text>
          <TouchableOpacity
            style={[styles.createBtn, isCreating && styles.createBtnDisabled]}
            onPress={handleCreateLeague}
            disabled={isCreating}
          >
            <Text
              style={[
                styles.createBtnText,
                isCreating && styles.createBtnTextDisabled,
              ]}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* League Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>League Details</Text>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>League Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder="e.g., Spring Training League"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={50}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => updateFormData('description', value)}
                placeholder="Describe your league goals and rules..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={300}
              />
            </View>
          </View>

          {/* Duration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>League Duration</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.durationSelector}
            >
              {DURATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.days}
                  style={[
                    styles.durationOption,
                    formData.durationDays === option.days &&
                      styles.durationOptionSelected,
                  ]}
                  onPress={() => updateFormData('durationDays', option.days)}
                >
                  <Text
                    style={[
                      styles.durationOptionText,
                      formData.durationDays === option.days &&
                        styles.durationOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.durationOptionSubtext,
                      formData.durationDays === option.days &&
                        styles.durationOptionSubtextSelected,
                    ]}
                  >
                    {option.days} days
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Competition Type Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Competition Focus</Text>

            {LEAGUE_GOALS.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.optionCard,
                  formData.goalType === type.value && styles.optionCardSelected,
                ]}
                onPress={() => handleGoalTypeChange(type.value)}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      formData.goalType === type.value &&
                        styles.optionTitleSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      formData.goalType === type.value &&
                        styles.optionDescriptionSelected,
                    ]}
                  >
                    {type.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    formData.goalType === type.value &&
                      styles.radioButtonSelected,
                  ]}
                >
                  {formData.goalType === type.value && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Target Goals Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Target Goals (Optional)</Text>

            <View style={styles.goalInputRow}>
              <View style={styles.goalValueField}>
                <Text style={styles.fieldLabel}>Target Value</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.goalValue}
                  onChangeText={(value) => updateFormData('goalValue', value)}
                  placeholder="e.g., 100"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.goalUnitField}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.unitSelector}
                >
                  {GOAL_UNITS[formData.goalType].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitOption,
                        formData.goalUnit === unit && styles.unitOptionSelected,
                      ]}
                      onPress={() => updateFormData('goalUnit', unit)}
                    >
                      <Text
                        style={[
                          styles.unitOptionText,
                          formData.goalUnit === unit &&
                            styles.unitOptionTextSelected,
                        ]}
                      >
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* League Summary */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>League Summary</Text>
            <Text style={styles.infoText}>
              • Duration: {getDurationLabel()}
            </Text>
            <Text style={styles.infoText}>• Team: {team.name}</Text>
            <Text style={styles.infoText}>
              • Participants: {team.memberCount || 0} members
            </Text>
            <Text style={styles.infoText}>
              • Focus:{' '}
              {LEAGUE_GOALS.find((g) => g.value === formData.goalType)?.label}
            </Text>
            <Text style={styles.infoText}>
              • Start:{' '}
              {formData.startTime === 'now' ? 'Immediately' : 'Custom time'}
            </Text>
            {formData.goalValue && (
              <Text style={styles.infoText}>
                • Target: {formData.goalValue} {formData.goalUnit}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  cancelBtnText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  createBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  createBtnDisabled: {
    backgroundColor: theme.colors.gray,
  },

  createBtnText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  createBtnTextDisabled: {
    color: theme.colors.textMuted,
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  // Form fields
  formField: {
    marginBottom: 16,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 8,
  },

  textInput: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
  },

  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Duration selector
  durationSelector: {
    flexDirection: 'row',
  },

  durationOption: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
  },

  durationOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },

  durationOptionText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  durationOptionTextSelected: {
    color: theme.colors.accentText,
  },

  durationOptionSubtext: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  durationOptionSubtextSelected: {
    color: theme.colors.accentText,
    opacity: 0.8,
  },

  // Option cards
  optionCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  optionCardSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}10`,
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 4,
  },

  optionTitleSelected: {
    color: theme.colors.accent,
  },

  optionDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  optionDescriptionSelected: {
    color: theme.colors.text,
  },

  // Radio button
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioButtonSelected: {
    borderColor: theme.colors.accent,
  },

  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },

  // Goal input
  goalInputRow: {
    flexDirection: 'row',
    gap: 12,
  },

  goalValueField: {
    flex: 2,
  },

  goalUnitField: {
    flex: 3,
  },

  unitSelector: {
    flexDirection: 'row',
  },

  unitOption: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },

  unitOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },

  unitOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },

  unitOptionTextSelected: {
    color: theme.colors.accentText,
  },

  // Info section
  infoSection: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  infoText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
});
