/**
 * ActivityConfigurationStep - Configure challenge activity, metric, duration, and wager
 * Second step in global challenge creation wizard
 * Provides cascading dropdowns based on activity type selection
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../styles/theme';
import {
  ACTIVITY_METRICS,
  type ActivityType,
  type MetricType,
  type DurationOption,
  type ActivityConfiguration,
} from '../../../types/challenge';

interface ActivityConfigurationStepProps {
  configuration?: ActivityConfiguration;
  onUpdateConfiguration: (config: Partial<ActivityConfiguration>) => void;
}

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'running', label: 'Running', icon: 'walk-outline' },
  { value: 'walking', label: 'Walking', icon: 'walk-outline' },
  { value: 'cycling', label: 'Cycling', icon: 'bicycle-outline' },
  { value: 'pushups', label: 'Pushups', icon: 'fitness-outline' },
  { value: 'pullups', label: 'Pullups', icon: 'barbell-outline' },
  { value: 'situps', label: 'Situps', icon: 'body-outline' },
];

const DURATION_OPTIONS: { value: DurationOption; label: string }[] = [
  { value: 3, label: '3 Days' },
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
];

const WAGER_PRESETS = [100, 500, 1000, 5000];

export const ActivityConfigurationStep: React.FC<ActivityConfigurationStepProps> = ({
  configuration,
  onUpdateConfiguration,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | undefined>(
    configuration?.activityType
  );
  const [selectedMetric, setSelectedMetric] = useState<MetricType | undefined>(
    configuration?.metric
  );
  const [selectedDuration, setSelectedDuration] = useState<DurationOption | undefined>(
    configuration?.duration
  );
  const [wagerAmount, setWagerAmount] = useState<number>(configuration?.wagerAmount || 0);
  const [customWagerInput, setCustomWagerInput] = useState<string>('');
  const [showCustomWager, setShowCustomWager] = useState(false);

  useEffect(() => {
    if (selectedActivity && !selectedMetric) {
      const defaultMetric = ACTIVITY_METRICS[selectedActivity]?.[0];
      if (defaultMetric) {
        setSelectedMetric(defaultMetric.value);
        onUpdateConfiguration({ metric: defaultMetric.value });
      }
    }
  }, [selectedActivity]);

  const handleActivitySelect = (activity: ActivityType) => {
    setSelectedActivity(activity);
    setSelectedMetric(undefined);
    onUpdateConfiguration({
      activityType: activity,
      metric: undefined,
    });
    // Auto-scroll to metric section after short delay
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 250, animated: true });
    }, 300);
  };

  const handleMetricSelect = (metric: MetricType) => {
    setSelectedMetric(metric);
    onUpdateConfiguration({ metric });
    // Auto-scroll to duration section
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 450, animated: true });
    }, 300);
  };

  const handleDurationSelect = (duration: DurationOption) => {
    setSelectedDuration(duration);
    onUpdateConfiguration({ duration });
    // Auto-scroll to wager section
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 650, animated: true });
    }, 300);
  };

  const handleWagerPresetSelect = (amount: number) => {
    setWagerAmount(amount);
    setShowCustomWager(false);
    setCustomWagerInput('');
    onUpdateConfiguration({ wagerAmount: amount });
  };

  const handleCustomWagerSubmit = () => {
    const amount = parseInt(customWagerInput, 10);
    if (!isNaN(amount) && amount > 0) {
      setWagerAmount(amount);
      onUpdateConfiguration({ wagerAmount: amount });
    }
  };

  const metricOptions = selectedActivity ? ACTIVITY_METRICS[selectedActivity] : [];

  return (
    <ScrollView ref={scrollViewRef} style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Activity Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Activity Type</Text>
        <View style={styles.optionsGrid}>
          {ACTIVITY_TYPES.map((activity) => (
            <TouchableOpacity
              key={activity.value}
              style={[
                styles.activityOption,
                selectedActivity === activity.value && styles.activityOptionSelected,
              ]}
              onPress={() => handleActivitySelect(activity.value)}
              activeOpacity={0.7}
            >
              <Ionicons name={activity.icon} size={32} color={theme.colors.accent} />
              <Text
                style={[
                  styles.activityLabel,
                  selectedActivity === activity.value && styles.activityLabelSelected,
                ]}
              >
                {activity.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Metric Selection - Only show if activity selected */}
      {selectedActivity && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Metric</Text>
          <View style={styles.metricOptions}>
            {metricOptions.map((metric) => (
              <TouchableOpacity
                key={metric.value}
                style={[
                  styles.metricOption,
                  selectedMetric === metric.value && styles.metricOptionSelected,
                ]}
                onPress={() => handleMetricSelect(metric.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.metricLabel,
                    selectedMetric === metric.value && styles.metricLabelSelected,
                  ]}
                >
                  {metric.label}
                </Text>
                <Text style={styles.metricUnit}>{metric.unit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Duration Selection */}
      {selectedActivity && selectedMetric && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.durationOptions}>
            {DURATION_OPTIONS.map((duration) => (
              <TouchableOpacity
                key={duration.value}
                style={[
                  styles.durationOption,
                  selectedDuration === duration.value && styles.durationOptionSelected,
                ]}
                onPress={() => handleDurationSelect(duration.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.durationLabel,
                    selectedDuration === duration.value && styles.durationLabelSelected,
                  ]}
                >
                  {duration.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Wager Amount */}
      {selectedActivity && selectedMetric && selectedDuration && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wager Amount (sats)</Text>
          <View style={styles.wagerOptions}>
            {WAGER_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.wagerOption,
                  wagerAmount === preset && !showCustomWager && styles.wagerOptionSelected,
                ]}
                onPress={() => handleWagerPresetSelect(preset)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.wagerLabel,
                    wagerAmount === preset && !showCustomWager && styles.wagerLabelSelected,
                  ]}
                >
                  {preset.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.wagerOption,
                showCustomWager && styles.wagerOptionSelected,
              ]}
              onPress={() => setShowCustomWager(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.wagerLabel,
                  showCustomWager && styles.wagerLabelSelected,
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {showCustomWager && (
            <View style={styles.customWagerContainer}>
              <TextInput
                style={styles.customWagerInput}
                placeholder="Enter amount in sats..."
                placeholderTextColor={theme.colors.textMuted}
                value={customWagerInput}
                onChangeText={setCustomWagerInput}
                keyboardType="number-pad"
                autoFocus
                onSubmitEditing={handleCustomWagerSubmit}
              />
              <TouchableOpacity
                style={styles.customWagerButton}
                onPress={handleCustomWagerSubmit}
              >
                <Text style={styles.customWagerButtonText}>Set</Text>
              </TouchableOpacity>
            </View>
          )}

          {wagerAmount > 0 && (
            <View style={styles.wagerPreview}>
              <Text style={styles.wagerPreviewLabel}>You stake:</Text>
              <Text style={styles.wagerPreviewAmount}>
                {wagerAmount.toLocaleString()} sats
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityOption: {
    width: '48%',
    aspectRatio: 0.8,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  activityOptionSelected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.border,
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  activityLabelSelected: {
    color: theme.colors.text,
  },
  metricOptions: {
    gap: 8,
  },
  metricOption: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricOptionSelected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.border,
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  metricLabelSelected: {
    color: theme.colors.text,
  },
  metricUnit: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  durationOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  durationOption: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  durationOptionSelected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.border,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  durationLabelSelected: {
    color: theme.colors.text,
  },
  wagerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wagerOption: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  wagerOptionSelected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.border,
  },
  wagerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  wagerLabelSelected: {
    color: theme.colors.text,
  },
  customWagerContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  customWagerInput: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  customWagerButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  customWagerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  wagerPreview: {
    marginTop: 16,
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wagerPreviewLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  wagerPreviewAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  previewSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  previewSubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  previewDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  previewWager: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
