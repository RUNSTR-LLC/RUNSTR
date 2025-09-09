/**
 * EventCreationWizard - Single-day event creation with cascading dropdowns
 * Activity Type → Competition Type → Date Selection → Additional Settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { theme } from '../../styles/theme';
import { WizardStepContainer, WizardStep } from './WizardStepContainer';

// Activity types and their specific competition options
const ACTIVITY_COMPETITION_MAP = {
  Running: [
    'Distance Challenge',
    'Speed Challenge',
    'Duration Challenge',
    'Consistency Streak',
  ],
  Walking: [
    'Step Count',
    'Distance Challenge',
    'Duration Challenge',
    'Consistency Streak',
  ],
  Cycling: [
    'Distance Challenge',
    'Speed Challenge',
    'Duration Challenge',
    'Elevation Gain',
  ],
  'Strength Training': [
    'Workout Count',
    'Duration Challenge',
    'Personal Records',
    'Consistency Streak',
  ],
  Meditation: [
    'Duration Challenge',
    'Session Count',
    'Consistency Streak',
    'Mindfulness Points',
  ],
  Yoga: [
    'Duration Challenge',
    'Session Count',
    'Pose Mastery',
    'Consistency Streak',
  ],
  Diet: ['Calorie Tracking', 'Macro Goals', 'Meal Logging', 'Nutrition Score'],
} as const;

type ActivityType = keyof typeof ACTIVITY_COMPETITION_MAP;
type CompetitionType = (typeof ACTIVITY_COMPETITION_MAP)[ActivityType][number];

interface EventData {
  activityType: ActivityType | null;
  competitionType: CompetitionType | null;
  eventDate: Date | null;
  entryFeesSats: number;
  maxParticipants: number;
  requireApproval: boolean;
  eventName: string;
  description: string;
  targetValue?: number;
  targetUnit?: string;
}

interface EventCreationWizardProps {
  visible: boolean;
  teamId: string;
  captainPubkey: string;
  onClose: () => void;
  onEventCreated: (eventData: EventData) => void;
}

export const EventCreationWizard: React.FC<EventCreationWizardProps> = ({
  visible,
  teamId,
  captainPubkey,
  onClose,
  onEventCreated,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [eventData, setEventData] = useState<EventData>({
    activityType: null,
    competitionType: null,
    eventDate: null,
    entryFeesSats: 0,
    maxParticipants: 50,
    requireApproval: true,
    eventName: '',
    description: '',
  });

  // Reset wizard when opened
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setEventData({
        activityType: null,
        competitionType: null,
        eventDate: null,
        entryFeesSats: 0,
        maxParticipants: 50,
        requireApproval: true,
        eventName: '',
        description: '',
      });
    }
  }, [visible]);

  // Wizard steps configuration
  const steps: WizardStep[] = [
    {
      id: 'activity',
      title: 'Choose Activity Type',
      isValid: !!eventData.activityType,
    },
    {
      id: 'competition',
      title: 'Select Competition Type',
      isValid: !!eventData.competitionType,
    },
    {
      id: 'date',
      title: 'Set Event Date',
      isValid: !!eventData.eventDate,
    },
    {
      id: 'settings',
      title: 'Additional Settings',
      isValid: eventData.eventName.length > 0,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onEventCreated(eventData);
  };

  const selectActivityType = (activity: ActivityType) => {
    setEventData((prev) => ({
      ...prev,
      activityType: activity,
      competitionType: null, // Reset competition type when activity changes
    }));
  };

  const selectCompetitionType = (competition: CompetitionType) => {
    setEventData((prev) => ({ ...prev, competitionType: competition }));
  };

  const setEventDate = (date: Date) => {
    setEventData((prev) => ({ ...prev, eventDate: date }));
  };

  const updateSettings = (field: keyof EventData, value: any) => {
    setEventData((prev) => ({ ...prev, [field]: value }));
  };

  // Generate quick date options
  const getQuickDateOptions = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const thisWeekend = new Date(today);
    const daysUntilSaturday = (6 - today.getDay()) % 7;
    thisWeekend.setDate(today.getDate() + daysUntilSaturday);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return [
      { label: 'Tomorrow', date: tomorrow },
      { label: 'This Weekend', date: thisWeekend },
      { label: 'Next Week', date: nextWeek },
    ];
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Activity Type Selection
        return (
          <ScrollView
            style={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepDescription}>
              Choose the primary activity type for this event
            </Text>
            <View style={styles.optionsGrid}>
              {Object.keys(ACTIVITY_COMPETITION_MAP).map((activity) => (
                <TouchableOpacity
                  key={activity}
                  style={[
                    styles.optionCard,
                    eventData.activityType === activity &&
                      styles.optionCardSelected,
                  ]}
                  onPress={() => selectActivityType(activity as ActivityType)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionCardText,
                      eventData.activityType === activity &&
                        styles.optionCardTextSelected,
                    ]}
                  >
                    {activity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 1: // Competition Type Selection
        if (!eventData.activityType) return null;
        const competitionOptions =
          ACTIVITY_COMPETITION_MAP[eventData.activityType];

        return (
          <ScrollView
            style={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepDescription}>
              Select the competition format for {eventData.activityType}
            </Text>
            <View style={styles.optionsList}>
              {competitionOptions.map((competition) => (
                <TouchableOpacity
                  key={competition}
                  style={[
                    styles.competitionOption,
                    eventData.competitionType === competition &&
                      styles.competitionOptionSelected,
                  ]}
                  onPress={() => selectCompetitionType(competition)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.competitionOptionText,
                      eventData.competitionType === competition &&
                        styles.competitionOptionTextSelected,
                    ]}
                  >
                    {competition}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 2: // Date Selection
        return (
          <ScrollView
            style={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepDescription}>
              When should this event take place?
            </Text>

            <Text style={styles.sectionTitle}>Quick Options</Text>
            <View style={styles.quickDateOptions}>
              {getQuickDateOptions().map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.quickDateOption,
                    eventData.eventDate?.toDateString() ===
                      option.date.toDateString() &&
                      styles.quickDateOptionSelected,
                  ]}
                  onPress={() => setEventDate(option.date)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.quickDateOptionText,
                      eventData.eventDate?.toDateString() ===
                        option.date.toDateString() &&
                        styles.quickDateOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.quickDateOptionDate}>
                    {option.date.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {eventData.eventDate && (
              <View style={styles.selectedDateDisplay}>
                <Text style={styles.selectedDateLabel}>Selected Date:</Text>
                <Text style={styles.selectedDateText}>
                  {eventData.eventDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </ScrollView>
        );

      case 3: // Additional Settings
        return (
          <ScrollView
            style={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepDescription}>
              Configure event details and settings
            </Text>

            <View style={styles.settingsForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Event Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={eventData.eventName}
                  onChangeText={(text) => updateSettings('eventName', text)}
                  placeholder="Enter event name"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={eventData.description}
                  onChangeText={(text) => updateSettings('description', text)}
                  placeholder="Event description (optional)"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Entry Fee (sats)</Text>
                <TextInput
                  style={styles.textInput}
                  value={eventData.entryFeesSats.toString()}
                  onChangeText={(text) =>
                    updateSettings('entryFeesSats', parseInt(text) || 0)
                  }
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Max Participants</Text>
                <TextInput
                  style={styles.textInput}
                  value={eventData.maxParticipants.toString()}
                  onChangeText={(text) =>
                    updateSettings('maxParticipants', parseInt(text) || 50)
                  }
                  placeholder="50"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Require Captain Approval</Text>
                <Switch
                  value={eventData.requireApproval}
                  onValueChange={(value) =>
                    updateSettings('requireApproval', value)
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.accent,
                  }}
                  thumbColor={theme.colors.text}
                />
              </View>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <WizardStepContainer
      visible={visible}
      currentStep={currentStep}
      steps={steps}
      wizardTitle="Create Event"
      onClose={onClose}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onComplete={handleComplete}
      canGoNext={steps[currentStep]?.isValid}
      canGoPrevious={currentStep > 0}
      isLastStep={currentStep === steps.length - 1}
    >
      {renderStepContent()}
    </WizardStepContainer>
  );
};

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },

  stepDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 24,
    lineHeight: 20,
  },

  // Activity selection styles
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  optionCard: {
    flexBasis: '47%',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },

  optionCardSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '20',
  },

  optionCardText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },

  optionCardTextSelected: {
    color: theme.colors.accent,
  },

  // Competition selection styles
  optionsList: {
    gap: 12,
  },

  competitionOption: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
  },

  competitionOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '20',
  },

  competitionOptionText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  competitionOptionTextSelected: {
    color: theme.colors.accent,
  },

  // Date selection styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  quickDateOptions: {
    gap: 12,
    marginBottom: 24,
  },

  quickDateOption: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  quickDateOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '20',
  },

  quickDateOptionText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  quickDateOptionTextSelected: {
    color: theme.colors.accent,
  },

  quickDateOptionDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  selectedDateDisplay: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 8,
    padding: 16,
  },

  selectedDateLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },

  selectedDateText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },

  // Settings form styles
  settingsForm: {
    gap: 20,
  },

  formGroup: {
    gap: 8,
  },

  formLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  textInput: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
  },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },

  switchLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
});
