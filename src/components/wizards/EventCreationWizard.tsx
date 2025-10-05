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
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import { WizardStepContainer, WizardStep } from './WizardStepContainer';
import { NostrCompetitionService } from '../../services/nostr/NostrCompetitionService';
import { NostrListService } from '../../services/nostr/NostrListService';
import { npubToHex } from '../../utils/ndkConversion';
import { useUserStore } from '../../store/userStore';
import { getAuthenticationData } from '../../utils/nostrAuth';
import { DirectNostrProfileService } from '../../services/user/directNostrProfileService';
import unifiedSigningService from '../../services/auth/UnifiedSigningService';
import type {
  NostrActivityType,
  NostrEventCompetitionType,
} from '../../types/nostrCompetition';

// Activity types and their specific competition options
const ACTIVITY_COMPETITION_MAP = {
  Running: [
    '5K Race',
    '10K Race',
    'Half Marathon',
    'Marathon',
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

type ActivityType = NostrActivityType;
type CompetitionType = NostrEventCompetitionType;

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
  prizePoolSats: number | undefined; // Prize pool amount in sats
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
  const [isCreating, setIsCreating] = useState(false);
  const user = useUserStore((state) => state.user);
  const [eventData, setEventData] = useState<EventData>({
    activityType: null,
    competitionType: null,
    eventDate: null,
    entryFeesSats: 0,
    maxParticipants: 50,
    requireApproval: true,
    eventName: '',
    description: '',
    prizePoolSats: undefined,
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
        prizePoolSats: undefined,
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

  const handleComplete = async () => {
    // Try to get user from store or DirectNostrProfileService
    let currentUser = user;
    if (!currentUser) {
      console.log('⚠️ User not in store, fetching from DirectNostrProfileService...');
      try {
        currentUser = await DirectNostrProfileService.getCurrentUserProfile();
        if (!currentUser) {
          Alert.alert('Error', 'User not found. Please log in again.');
          return;
        }
      } catch (error) {
        console.error('Failed to get user from DirectNostrProfileService:', error);
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }
    }

    setIsCreating(true);

    try {
      console.log('🎯 Creating event with Nostr Competition Service');

      // Check for existing active events before proceeding
      const activeCompetitions = await NostrCompetitionService.checkActiveCompetitions(teamId);

      if (activeCompetitions.activeEvents > 0) {
        Alert.alert(
          'Active Event Exists',
          `Your team already has an active event: "${activeCompetitions.activeEventDetails?.name}"\n\nIt is scheduled for ${activeCompetitions.activeEventDetails?.eventDate}.\n\nOnly one event can be active at a time.`,
          [
            {
              text: 'OK',
              onPress: () => setIsCreating(false)
            }
          ]
        );
        return;
      }

      // Get authentication data from unified auth system
      const authData = await getAuthenticationData();
      if (!authData || !authData.nsec) {
        Alert.alert(
          'Authentication Required',
          'Please log in again to create competitions.',
          [{ text: 'OK' }]
        );
        setIsCreating(false);
        return;
      }

      console.log('✅ Retrieved auth data for:', authData.npub.slice(0, 20) + '...');

      // Get signer (works for both nsec and Amber)
      const signer = await unifiedSigningService.getSigner();
      if (!signer) {
        Alert.alert('Error', 'No authentication found. Please login first.');
        setIsCreating(false);
        return;
      }

      // Prepare event data for Nostr
      const eventCreationData = {
        teamId,
        name: eventData.eventName,
        description: eventData.description,
        activityType: eventData.activityType!,
        competitionType: eventData.competitionType!,
        eventDate: eventData.eventDate!.toISOString(),
        entryFeesSats: eventData.entryFeesSats,
        maxParticipants: eventData.maxParticipants,
        requireApproval: eventData.requireApproval,
        targetValue: eventData.targetValue,
        targetUnit: eventData.targetUnit,
        prizePoolSats: eventData.prizePoolSats,
      };

      console.log('🎯 Creating event:', eventCreationData);

      // Create event using Nostr Competition Service (works with both nsec and Amber)
      const result = await NostrCompetitionService.createEvent(
        eventCreationData,
        signer
      );

      if (result.success) {
        console.log('✅ Event created successfully:', result.competitionId);

        // Create empty participant list for opt-in participation
        if (result.competitionId) {
          console.log('📋 Creating empty participant list for event (opt-in)');
          const listService = NostrListService.getInstance();

          // Get captain's hex pubkey from npub
          const captainHexPubkey = npubToHex(authData.npub);

          // Prepare empty participant list (kind 30000)
          const participantListData = {
            name: `${eventData.eventName} Participants`,
            description: `Participants for ${eventData.eventName}`,
            members: [], // Start with empty list - fully opt-in
            dTag: `event-${result.competitionId}-participants`,
            listType: 'people' as const,
          };

          // Create the participant list event template
          const listEventTemplate = listService.prepareListCreation(
            participantListData,
            captainHexPubkey
          );

          // Sign and publish the list (you'll need to add signing logic)
          // For now, log that we've prepared it
          console.log('✅ Prepared empty participant list for event:', participantListData.dTag);
        }

        Alert.alert(
          'Success!',
          `Event "${eventData.eventName}" has been created and published to Nostr relays.`,
          [{ text: 'OK', onPress: () => {
            onEventCreated(eventData);
            onClose();
          }}]
        );
      } else {
        throw new Error(result.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      Alert.alert(
        'Error', 
        `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreating(false);
    }
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

    // Fix weekend calculation - if today is weekend, use today
    const thisWeekend = new Date(today);
    const currentDay = today.getDay();
    if (currentDay === 0 || currentDay === 6) {
      // Today is Sunday (0) or Saturday (6)
      // Keep it as today
    } else {
      // Calculate days until Saturday
      const daysUntilSaturday = 6 - currentDay;
      thisWeekend.setDate(today.getDate() + daysUntilSaturday);
    }

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return [
      { label: 'Today', date: today },
      { label: 'Tomorrow', date: tomorrow },
      { label: currentDay === 0 || currentDay === 6 ? 'This Weekend (Today)' : 'This Weekend', date: thisWeekend },
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
              {competitionOptions.map((competition) => {
                // Add descriptions for race types
                let description = '';
                if (competition === '5K Race') description = '5 kilometers (3.1 miles) - Fastest time wins';
                if (competition === '10K Race') description = '10 kilometers (6.2 miles) - Fastest time wins';
                if (competition === 'Half Marathon') description = '21.1 kilometers (13.1 miles) - Fastest time wins';
                if (competition === 'Marathon') description = '42.2 kilometers (26.2 miles) - Fastest time wins';

                return (
                  <TouchableOpacity
                    key={competition}
                    style={[
                      styles.competitionOption,
                      eventData.competitionType === competition &&
                        styles.competitionOptionSelected,
                    ]}
                    onPress={() => {
                      selectCompetitionType(competition);
                      // Auto-set target values for standard races
                      if (competition === '5K Race') {
                        updateSettings('targetValue', 5);
                        updateSettings('targetUnit', 'km');
                      } else if (competition === '10K Race') {
                        updateSettings('targetValue', 10);
                        updateSettings('targetUnit', 'km');
                      } else if (competition === 'Half Marathon') {
                        updateSettings('targetValue', 21.1);
                        updateSettings('targetUnit', 'km');
                      } else if (competition === 'Marathon') {
                        updateSettings('targetValue', 42.2);
                        updateSettings('targetUnit', 'km');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text
                        style={[
                          styles.competitionOptionText,
                          eventData.competitionType === competition &&
                            styles.competitionOptionTextSelected,
                        ]}
                      >
                        {competition}
                      </Text>
                      {description ? (
                        <Text style={styles.competitionOptionDescription}>
                          {description}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
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

              {/* Entry Fee - Hidden for now */}
              {/* <View style={styles.formGroup}>
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
              </View> */}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Prize Pool (sats)</Text>
                <View style={styles.prizePoolOptions}>
                  {[
                    { label: 'None', value: 0 },
                    { label: '10k', value: 10000 },
                    { label: '20k', value: 20000 },
                    { label: '30k', value: 30000 },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.prizeOption,
                        eventData.prizePoolSats === option.value &&
                          styles.prizeOptionSelected,
                      ]}
                      onPress={() => updateSettings('prizePoolSats', option.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.prizeOptionText,
                          eventData.prizePoolSats === option.value &&
                            styles.prizeOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.prizeOption,
                      eventData.prizePoolSats !== undefined &&
                        eventData.prizePoolSats !== 0 &&
                        eventData.prizePoolSats !== 10000 &&
                        eventData.prizePoolSats !== 20000 &&
                        eventData.prizePoolSats !== 30000 &&
                        styles.prizeOptionSelected,
                    ]}
                    onPress={() => updateSettings('prizePoolSats', -1)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.prizeOptionText,
                        eventData.prizePoolSats !== undefined &&
                          eventData.prizePoolSats !== 0 &&
                          eventData.prizePoolSats !== 10000 &&
                          eventData.prizePoolSats !== 20000 &&
                          eventData.prizePoolSats !== 30000 &&
                          styles.prizeOptionTextSelected,
                      ]}
                    >
                      Custom
                    </Text>
                  </TouchableOpacity>
                </View>
                {eventData.prizePoolSats !== undefined &&
                  eventData.prizePoolSats !== 0 &&
                  eventData.prizePoolSats !== 10000 &&
                  eventData.prizePoolSats !== 20000 &&
                  eventData.prizePoolSats !== 30000 && (
                    <TextInput
                      style={[styles.textInput, { marginTop: 12 }]}
                      value={
                        eventData.prizePoolSats === -1
                          ? ''
                          : eventData.prizePoolSats.toString()
                      }
                      onChangeText={(text) => {
                        const value = parseInt(text) || 0;
                        updateSettings('prizePoolSats', value);
                      }}
                      placeholder="Enter custom amount"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                    />
                  )}
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
      isProcessing={isCreating}
      processingText="Creating Event..."
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

  competitionOptionDescription: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
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

  prizePoolOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  prizeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },

  prizeOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '20',
  },

  prizeOptionText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  prizeOptionTextSelected: {
    color: theme.colors.accent,
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
