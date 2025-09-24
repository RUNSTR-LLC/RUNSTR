/**
 * LeagueCreationWizard - Multi-day league creation with date range picker
 * Activity Type → Competition Type → Date Range Selection → Additional Settings
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
import NostrCompetitionParticipantService from '../../services/nostr/NostrCompetitionParticipantService';
import { useUserStore } from '../../store/userStore';
import { getAuthenticationData } from '../../utils/nostrAuth';
import { nsecToPrivateKey } from '../../utils/nostr';
import type {
  NostrActivityType,
  NostrLeagueCompetitionType,
  NostrScoringFrequency,
} from '../../types/nostrCompetition';

// Same activity types as events but with league-specific competition options
const LEAGUE_COMPETITION_MAP = {
  Running: [
    'Total Distance',
    'Average Pace',
    'Longest Run',
    'Most Consistent',
    'Weekly Streaks',
  ],
  Walking: [
    'Total Steps',
    'Total Distance',
    'Daily Average',
    'Most Consistent',
    'Weekly Streaks',
  ],
  Cycling: [
    'Total Distance',
    'Longest Ride',
    'Total Elevation',
    'Average Speed',
    'Weekly Streaks',
  ],
  'Strength Training': [
    'Total Workouts',
    'Total Duration',
    'Personal Records',
    'Most Consistent',
    'Weekly Streaks',
  ],
  Meditation: [
    'Total Duration',
    'Session Count',
    'Daily Average',
    'Longest Session',
    'Weekly Streaks',
  ],
  Yoga: [
    'Total Duration',
    'Session Count',
    'Pose Diversity',
    'Most Consistent',
    'Weekly Streaks',
  ],
  Diet: [
    'Nutrition Score',
    'Calorie Consistency',
    'Macro Balance',
    'Meal Logging',
    'Weekly Streaks',
  ],
} as const;

type ActivityType = NostrActivityType;
type CompetitionType = NostrLeagueCompetitionType;

interface LeagueData {
  activityType: ActivityType | null;
  competitionType: CompetitionType | null;
  startDate: Date | null;
  endDate: Date | null;
  duration: number; // in days
  entryFeesSats: number;
  maxParticipants: number;
  requireApproval: boolean;
  leagueName: string;
  description: string;
  scoringFrequency: 'daily' | 'weekly' | 'total';
  allowLateJoining: boolean;
  prizePoolSats: number | undefined; // Prize pool amount in sats
}

interface LeagueCreationWizardProps {
  visible: boolean;
  teamId: string;
  captainPubkey: string;
  onClose: () => void;
  onLeagueCreated: (leagueData: LeagueData) => void;
}

export const LeagueCreationWizard: React.FC<LeagueCreationWizardProps> = ({
  visible,
  teamId,
  captainPubkey,
  onClose,
  onLeagueCreated,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const user = useUserStore((state) => state.user);
  const [leagueData, setLeagueData] = useState<LeagueData>({
    activityType: null,
    competitionType: null,
    startDate: null,
    endDate: null,
    duration: 7,
    entryFeesSats: 0,
    maxParticipants: 50,
    requireApproval: true,
    leagueName: '',
    description: '',
    scoringFrequency: 'total',
    allowLateJoining: false,
    prizePoolSats: undefined,
  });

  // Reset wizard when opened
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setLeagueData({
        activityType: null,
        competitionType: null,
        startDate: null,
        endDate: null,
        duration: 7,
        entryFeesSats: 0,
        maxParticipants: 50,
        requireApproval: true,
        leagueName: '',
        description: '',
        scoringFrequency: 'total',
        allowLateJoining: false,
      });
    }
  }, [visible]);

  // Update end date when start date or duration changes
  useEffect(() => {
    if (leagueData.startDate && leagueData.duration) {
      const endDate = new Date(leagueData.startDate);
      endDate.setDate(endDate.getDate() + leagueData.duration - 1);
      setLeagueData((prev) => ({ ...prev, endDate }));
    }
  }, [leagueData.startDate, leagueData.duration]);

  // Wizard steps configuration
  const steps: WizardStep[] = [
    {
      id: 'activity',
      title: 'Choose Activity Type',
      isValid: !!leagueData.activityType,
    },
    {
      id: 'competition',
      title: 'Select Competition Type',
      isValid: !!leagueData.competitionType,
    },
    {
      id: 'duration',
      title: 'Set Duration & Dates',
      isValid: !!leagueData.startDate && !!leagueData.endDate,
    },
    {
      id: 'settings',
      title: 'Additional Settings',
      isValid: leagueData.leagueName.length > 0,
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
    setIsCreating(true);

    try {
      console.log('🏁 Creating league with Nostr Competition Service');

      // Check for existing active leagues before proceeding
      const activeCompetitions = await NostrCompetitionService.checkActiveCompetitions(teamId);

      if (activeCompetitions.activeLeagues > 0) {
        Alert.alert(
          'Active League Exists',
          `Your team already has an active league: "${activeCompetitions.activeLeagueDetails?.name}"\n\nIt ends on ${activeCompetitions.activeLeagueDetails?.endDate}.\n\nOnly one league can be active at a time.`,
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

      // Convert nsec to private key hex
      const privateKeyHex = nsecToPrivateKey(authData.nsec);

      // Prepare league data for Nostr
      const leagueCreationData = {
        teamId,
        name: leagueData.leagueName,
        description: leagueData.description,
        activityType: leagueData.activityType!,
        competitionType: leagueData.competitionType!,
        startDate: leagueData.startDate!.toISOString(),
        endDate: leagueData.endDate!.toISOString(),
        duration: leagueData.duration,
        entryFeesSats: leagueData.entryFeesSats,
        maxParticipants: leagueData.maxParticipants,
        requireApproval: leagueData.requireApproval,
        allowLateJoining: leagueData.allowLateJoining,
        scoringFrequency: leagueData.scoringFrequency,
        prizePoolSats: leagueData.prizePoolSats,
      };

      console.log('📊 Creating league:', leagueCreationData);

      // Create league using Nostr Competition Service
      const result = await NostrCompetitionService.createLeague(
        leagueCreationData,
        privateKeyHex
      );

      if (result.success) {
        console.log('✅ League created successfully:', result.competitionId);

        // Create participant list if approval is required
        if (leagueData.requireApproval && result.competitionId) {
          console.log('📋 Creating participant list for approval-required league');
          const participantService = NostrCompetitionParticipantService.getInstance();
          await participantService.createParticipantList(
            result.competitionId,
            teamId,
            privateKeyHex,
            true // requireApproval
          );
        }

        Alert.alert(
          'Success!',
          `League "${leagueData.leagueName}" has been created and published to Nostr relays.`,
          [{ text: 'OK', onPress: () => {
            onLeagueCreated(leagueData);
            onClose();
          }}]
        );
      } else {
        throw new Error(result.message || 'Failed to create league');
      }
    } catch (error) {
      console.error('❌ Failed to create league:', error);
      Alert.alert(
        'Error', 
        `Failed to create league: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreating(false);
    }
  };

  const selectActivityType = (activity: ActivityType) => {
    setLeagueData((prev) => ({
      ...prev,
      activityType: activity,
      competitionType: null, // Reset competition type when activity changes
    }));
  };

  const selectCompetitionType = (competition: CompetitionType) => {
    setLeagueData((prev) => ({ ...prev, competitionType: competition }));
  };

  const selectDuration = (days: number) => {
    setLeagueData((prev) => ({ ...prev, duration: days }));
  };

  const setStartDate = (date: Date) => {
    setLeagueData((prev) => ({ ...prev, startDate: date }));
  };

  const updateSettings = (field: keyof LeagueData, value: any) => {
    setLeagueData((prev) => ({ ...prev, [field]: value }));
  };

  // Generate duration options
  const getDurationOptions = () => [
    { label: '1 Week', days: 7, description: 'Short sprint challenge' },
    { label: '2 Weeks', days: 14, description: 'Build momentum' },
    { label: '1 Month', days: 30, description: 'Sustained effort' },
    { label: '6 Weeks', days: 42, description: 'Habit formation' },
    { label: '3 Months', days: 90, description: 'Long-term commitment' },
  ];

  // Generate quick start date options
  const getStartDateOptions = () => {
    const today = new Date();

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Fix Monday calculation - if today is Monday, use next Monday
    const nextMonday = new Date(today);
    const currentDay = today.getDay();
    const daysUntilMonday = currentDay === 1 ? 7 : (8 - currentDay) % 7;
    nextMonday.setDate(today.getDate() + daysUntilMonday);

    const firstOfNextMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1
    );

    return [
      { label: 'Today', date: today },
      { label: 'Tomorrow', date: tomorrow },
      { label: currentDay === 1 ? 'Next Monday' : 'This Monday', date: nextMonday },
      { label: 'First of Next Month', date: firstOfNextMonth },
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
              Choose the primary activity type for this league
            </Text>
            <View style={styles.optionsGrid}>
              {Object.keys(LEAGUE_COMPETITION_MAP).map((activity) => (
                <TouchableOpacity
                  key={activity}
                  style={[
                    styles.optionCard,
                    leagueData.activityType === activity &&
                      styles.optionCardSelected,
                  ]}
                  onPress={() => selectActivityType(activity as ActivityType)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionCardText,
                      leagueData.activityType === activity &&
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
        if (!leagueData.activityType) return null;
        const competitionOptions =
          LEAGUE_COMPETITION_MAP[leagueData.activityType];

        return (
          <ScrollView
            style={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepDescription}>
              Select the scoring format for {leagueData.activityType} league
            </Text>
            <View style={styles.optionsList}>
              {competitionOptions.map((competition) => (
                <TouchableOpacity
                  key={competition}
                  style={[
                    styles.competitionOption,
                    leagueData.competitionType === competition &&
                      styles.competitionOptionSelected,
                  ]}
                  onPress={() => selectCompetitionType(competition)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.competitionOptionText,
                      leagueData.competitionType === competition &&
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

      case 2: // Duration & Date Selection
        return (
          <ScrollView
            style={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepDescription}>
              Set the league duration and start date
            </Text>

            <Text style={styles.sectionTitle}>Duration</Text>
            <View style={styles.durationOptions}>
              {getDurationOptions().map((option) => (
                <TouchableOpacity
                  key={option.days}
                  style={[
                    styles.durationOption,
                    leagueData.duration === option.days &&
                      styles.durationOptionSelected,
                  ]}
                  onPress={() => selectDuration(option.days)}
                  activeOpacity={0.7}
                >
                  <View style={styles.durationOptionContent}>
                    <Text
                      style={[
                        styles.durationOptionLabel,
                        leagueData.duration === option.days &&
                          styles.durationOptionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.durationOptionDescription}>
                      {option.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Start Date</Text>
            <View style={styles.startDateOptions}>
              {getStartDateOptions().map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.startDateOption,
                    leagueData.startDate?.toDateString() ===
                      option.date.toDateString() &&
                      styles.startDateOptionSelected,
                  ]}
                  onPress={() => setStartDate(option.date)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.startDateOptionText,
                      leagueData.startDate?.toDateString() ===
                        option.date.toDateString() &&
                        styles.startDateOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.startDateOptionDate}>
                    {option.date.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {leagueData.startDate && leagueData.endDate && (
              <View style={styles.dateRangeDisplay}>
                <Text style={styles.dateRangeLabel}>League Duration:</Text>
                <Text style={styles.dateRangeText}>
                  {leagueData.startDate.toLocaleDateString()} -{' '}
                  {leagueData.endDate.toLocaleDateString()}
                </Text>
                <Text style={styles.dateRangeDays}>
                  {leagueData.duration} days
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
              Configure league details and settings
            </Text>

            <View style={styles.settingsForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>League Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={leagueData.leagueName}
                  onChangeText={(text) => updateSettings('leagueName', text)}
                  placeholder="Enter league name"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={leagueData.description}
                  onChangeText={(text) => updateSettings('description', text)}
                  placeholder="League description (optional)"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Scoring Frequency</Text>
                <View style={styles.scoringOptions}>
                  {['daily', 'weekly', 'total'].map((frequency) => (
                    <TouchableOpacity
                      key={frequency}
                      style={[
                        styles.scoringOption,
                        leagueData.scoringFrequency === frequency &&
                          styles.scoringOptionSelected,
                      ]}
                      onPress={() =>
                        updateSettings('scoringFrequency', frequency)
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.scoringOptionText,
                          leagueData.scoringFrequency === frequency &&
                            styles.scoringOptionTextSelected,
                        ]}
                      >
                        {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Entry Fee - Hidden for now */}
              {/* <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Entry Fee (sats)</Text>
                <TextInput
                  style={styles.textInput}
                  value={leagueData.entryFeesSats.toString()}
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
                        leagueData.prizePoolSats === option.value &&
                          styles.prizeOptionSelected,
                      ]}
                      onPress={() => updateSettings('prizePoolSats', option.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.prizeOptionText,
                          leagueData.prizePoolSats === option.value &&
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
                      leagueData.prizePoolSats !== undefined &&
                        leagueData.prizePoolSats !== 0 &&
                        leagueData.prizePoolSats !== 10000 &&
                        leagueData.prizePoolSats !== 20000 &&
                        leagueData.prizePoolSats !== 30000 &&
                        styles.prizeOptionSelected,
                    ]}
                    onPress={() => updateSettings('prizePoolSats', -1)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.prizeOptionText,
                        leagueData.prizePoolSats !== undefined &&
                          leagueData.prizePoolSats !== 0 &&
                          leagueData.prizePoolSats !== 10000 &&
                          leagueData.prizePoolSats !== 20000 &&
                          leagueData.prizePoolSats !== 30000 &&
                          styles.prizeOptionTextSelected,
                      ]}
                    >
                      Custom
                    </Text>
                  </TouchableOpacity>
                </View>
                {leagueData.prizePoolSats !== undefined &&
                  leagueData.prizePoolSats !== 0 &&
                  leagueData.prizePoolSats !== 10000 &&
                  leagueData.prizePoolSats !== 20000 &&
                  leagueData.prizePoolSats !== 30000 && (
                    <TextInput
                      style={[styles.textInput, { marginTop: 12 }]}
                      value={
                        leagueData.prizePoolSats === -1
                          ? ''
                          : leagueData.prizePoolSats.toString()
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
                  value={leagueData.maxParticipants.toString()}
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
                  value={leagueData.requireApproval}
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

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Allow Late Joining</Text>
                <Switch
                  value={leagueData.allowLateJoining}
                  onValueChange={(value) =>
                    updateSettings('allowLateJoining', value)
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
      wizardTitle="Create League"
      onClose={onClose}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onComplete={handleComplete}
      canGoNext={steps[currentStep]?.isValid}
      canGoPrevious={currentStep > 0}
      isLastStep={currentStep === steps.length - 1}
      isProcessing={isCreating}
      processingText="Creating League..."
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

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
    marginTop: 16,
  },

  // Activity selection styles (reused from Event wizard)
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

  // Duration selection styles
  durationOptions: {
    gap: 12,
    marginBottom: 24,
  },

  durationOption: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
  },

  durationOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '20',
  },

  durationOptionContent: {
    gap: 4,
  },

  durationOptionLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  durationOptionLabelSelected: {
    color: theme.colors.accent,
  },

  durationOptionDescription: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  // Start date selection styles
  startDateOptions: {
    gap: 12,
    marginBottom: 24,
  },

  startDateOption: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  startDateOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '20',
  },

  startDateOptionText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  startDateOptionTextSelected: {
    color: theme.colors.accent,
  },

  startDateOptionDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  dateRangeDisplay: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },

  dateRangeLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },

  dateRangeText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },

  dateRangeDays: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
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

  scoringOptions: {
    flexDirection: 'row',
    gap: 8,
  },

  scoringOption: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },

  scoringOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '20',
  },

  scoringOptionText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  scoringOptionTextSelected: {
    color: theme.colors.accent,
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
