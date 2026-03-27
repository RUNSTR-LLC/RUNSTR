/**
 * EventCreationModal Component - Create 1-day fitness events
 * Integrates with competitionService and follows existing modal patterns
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../../styles/theme';
import { NostrCompetitionService } from '../../services/nostr/NostrCompetitionService';
import { NostrListService } from '../../services/nostr/NostrListService';
import { GlobalNDKService } from '../../services/nostr/GlobalNDKService';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import UnifiedSigningService from '../../services/auth/UnifiedSigningService';
import { CustomAlertManager } from '../ui/CustomAlert';
import type { NostrTeam } from '../../services/nostr/NostrTeamService';

interface EventCreationModalProps {
  visible: boolean;
  team: NostrTeam;
  captainPubkey: string;
  onClose: () => void;
  onEventCreated: (eventId: string) => void;
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
}

const GOAL_TYPES: { value: GoalType; label: string; description: string }[] = [
  {
    value: 'distance',
    label: 'Distance Challenge',
    description: 'Who can run the furthest',
  },
  {
    value: 'speed',
    label: 'Speed Challenge',
    description: 'Who can run the fastest pace',
  },
  {
    value: 'duration',
    label: 'Duration Challenge',
    description: 'Who can run the longest',
  },
  {
    value: 'consistency',
    label: 'Consistency Challenge',
    description: 'Who can maintain activity',
  },
];

const GOAL_UNITS = {
  distance: ['km', 'mi', 'm'],
  speed: ['min/km', 'min/mi', 'mph', 'kph'],
  duration: ['minutes', 'hours'],
  consistency: ['workouts', 'days'],
};

export const EventCreationModal: React.FC<EventCreationModalProps> = ({
  visible,
  team,
  captainPubkey,
  onClose,
  onEventCreated,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    goalType: 'distance',
    goalValue: '',
    goalUnit: 'km',
    startTime: 'now',
  });
  const [isCreating, setIsCreating] = useState(false);

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
      return 'Event name is required';
    }
    if (formData.name.length > 50) {
      return 'Event name must be 50 characters or less';
    }
    if (formData.description.length > 200) {
      return 'Description must be 200 characters or less';
    }
    if (formData.goalValue && isNaN(Number(formData.goalValue))) {
      return 'Goal value must be a number';
    }
    if (formData.goalValue && Number(formData.goalValue) <= 0) {
      return 'Goal value must be greater than zero';
    }
    return null;
  };

  const handleCreateEvent = async () => {
    const validationError = validateForm();
    if (validationError) {
      CustomAlertManager.alert('Validation Error', validationError, [{ text: 'OK' }]);
      return;
    }

    if (isCreating) return;

    try {
      setIsCreating(true);

      // Get signer (works for both nsec and Amber)
      const signingService = UnifiedSigningService.getInstance();
      const signer = await signingService.getSigner();
      if (!signer) {
        CustomAlertManager.alert(
          'Error',
          'No authentication found. Please login first.',
          [{ text: 'OK' }]
        );
        setIsCreating(false);
        return;
      }

      // Calculate event date
      const eventDate =
        formData.startTime === 'now'
          ? new Date()
          : formData.customStartTime || new Date();

      // Map goalType to competitionType for Nostr event
      const competitionTypeMap = {
        distance: 'Distance Challenge',
        speed: 'Speed Challenge',
        duration: 'Duration Challenge',
        consistency: 'Consistency Streak',
      } as const;

      // Prepare event data for Nostr
      const eventCreationData = {
        teamId: team.id,
        name: formData.name.trim(),
        description:
          formData.description.trim() ||
          `${formData.goalType} event for ${team.name}`,
        activityType: 'Running' as const, // Default to Running (NostrActivityType)
        competitionType: competitionTypeMap[formData.goalType],
        eventDate: eventDate.toISOString(),
        entryFeesSats: 0, // Default to free
        maxParticipants: 50,
        requireApproval: false,
        targetValue: formData.goalValue
          ? Number(formData.goalValue)
          : undefined,
        targetUnit: formData.goalUnit,
      };

      console.log('🎯 Creating event:', eventCreationData);

      // Create event using Nostr Competition Service
      const result = await NostrCompetitionService.createEvent(
        eventCreationData,
        signer
      );

      if (!result.success) {
        throw new Error(result.message || 'Failed to create event');
      }

      console.log('✅ Event created successfully:', result.competitionId);

      // Track participant list creation status
      let participantListCreated = false;
      let participantListError = '';

      // Create empty participant list for opt-in participation
      if (result.competitionId) {
        try {
          console.log('📋 Creating empty participant list for event (opt-in)');
          const listService = NostrListService.getInstance();

          // Get captain's hex pubkey
          const captainHexPubkey = await signingService.getHexPubkey();
          if (!captainHexPubkey) {
            throw new Error('Could not determine captain public key');
          }

          // Prepare empty participant list (kind 30000)
          const participantListData = {
            name: `${formData.name} Participants`,
            description: `Participants for ${formData.name}`,
            members: [], // Start with empty list - fully opt-in
            dTag: `event-${result.competitionId}-participants`,
            listType: 'people' as const,
          };

          // Create the participant list event template
          const listEventTemplate = listService.prepareListCreation(
            participantListData,
            captainHexPubkey
          );

          console.log('🔐 Signing participant list...');

          // Get global NDK instance
          const ndk = await GlobalNDKService.getInstance();

          // Create NDK event and sign it
          const ndkEvent = new NDKEvent(ndk, listEventTemplate);
          await ndkEvent.sign(signer);

          console.log('📤 Publishing participant list to Nostr...');

          // Publish to relays
          await ndkEvent.publish();

          participantListCreated = true;
          console.log(
            '✅ Participant list created and published:',
            participantListData.dTag
          );
        } catch (listError) {
          console.error('⚠️ Failed to create participant list:', listError);
          participantListError =
            listError instanceof Error ? listError.message : 'Unknown error';
          // Don't block event creation, just log the error
        }
      }

      // Show success message with participant list status
      const successMessage = participantListCreated
        ? `Event "${formData.name}" has been created and published to Nostr relays.\n\n✅ Participant list created successfully.`
        : participantListError
        ? `Event "${formData.name}" has been created, but participant list creation failed.\n\n⚠️ ${participantListError}\n\nYou may need to create the participant list manually from the Captain Dashboard.`
        : `Event "${formData.name}" has been created and published to Nostr relays.`;

      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        goalType: 'distance',
        goalValue: '',
        goalUnit: 'km',
        startTime: 'now',
      });

      // Notify parent of success
      if (result.competitionId) {
        onEventCreated(result.competitionId);
      }

      onClose();

      CustomAlertManager.alert('Success!', successMessage, [{ text: 'OK' }]);
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      CustomAlertManager.alert(
        'Error',
        `Failed to create event: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (isCreating) return;
    onClose();
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
          <Text style={styles.headerTitle}>Create Event</Text>
          <TouchableOpacity
            style={[styles.createBtn, isCreating && styles.createBtnDisabled]}
            onPress={handleCreateEvent}
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
          {/* Event Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Event Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder="e.g., Morning 5K Challenge"
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
                placeholder="Optional event description..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>
          </View>

          {/* Challenge Type Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Challenge Type</Text>

            {GOAL_TYPES.map((type) => (
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

          {/* Goal Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goal Settings (Optional)</Text>

            <View style={styles.goalInputRow}>
              <View style={styles.goalValueField}>
                <Text style={styles.fieldLabel}>Target Value</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.goalValue}
                  onChangeText={(value) => updateFormData('goalValue', value)}
                  placeholder="e.g., 5"
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

          {/* Team Info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Event Details</Text>
            <Text style={styles.infoText}>• Duration: 24 hours</Text>
            <Text style={styles.infoText}>• Team: {team.name}</Text>
            <Text style={styles.infoText}>
              • Participants: {team.memberCount || 0} members
            </Text>
            <Text style={styles.infoText}>
              • Start:{' '}
              {formData.startTime === 'now' ? 'Immediately' : 'Custom time'}
            </Text>
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
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Option cards for goal types
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
