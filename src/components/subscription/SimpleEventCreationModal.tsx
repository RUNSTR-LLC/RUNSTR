/**
 * SimpleEventCreationModal - Event creation form for subscribers
 * Inserts directly into Supabase competitions table
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { CustomAlert } from '../ui/CustomAlert';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

interface SimpleEventCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated?: (eventId: string) => void;
}

const ACTIVITY_OPTIONS = [
  { label: 'Running', value: 'running' },
  { label: 'Walking', value: 'walking' },
  { label: 'Cycling', value: 'cycling' },
];

const SCORING_OPTIONS = [
  { label: 'Total Distance', value: 'total_distance' },
  { label: 'Most Workouts', value: 'workout_count' },
  { label: 'Total Duration', value: 'total_duration' },
];

const DURATION_OPTIONS = [
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
];

function getQuickDateOptions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekend = new Date(today);
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
  weekend.setDate(weekend.getDate() + daysUntilSaturday);

  return [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: tomorrow },
    { label: 'Weekend', date: weekend },
  ];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function randomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const SimpleEventCreationModal: React.FC<SimpleEventCreationModalProps> = ({
  visible,
  onClose,
  onEventCreated,
}) => {
  // Form state
  const [eventName, setEventName] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [scoringMethod, setScoringMethod] = useState('total_distance');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [prizePool, setPrizePool] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const quickDates = getQuickDateOptions();

  const toggleActivity = useCallback((value: string) => {
    setSelectedActivities((prev) =>
      prev.includes(value)
        ? prev.filter((a) => a !== value)
        : [...prev, value]
    );
  }, []);

  const resetForm = useCallback(() => {
    setEventName('');
    setSelectedActivities([]);
    setScoringMethod('total_distance');
    setStartDate(null);
    setDurationDays(null);
    setPrizePool('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const isValid =
    eventName.trim().length > 0 &&
    selectedActivities.length > 0 &&
    startDate !== null &&
    durationDays !== null;

  const handleCreate = useCallback(async () => {
    if (!isValid || isSubmitting) return;
    if (!isSupabaseConfigured()) {
      setAlertTitle('Error');
      setAlertMessage('Backend not configured');
      setAlertVisible(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!npub) {
        setAlertTitle('Error');
        setAlertMessage('Please log in first');
        setAlertVisible(true);
        setIsSubmitting(false);
        return;
      }

      const externalId = `${slugify(eventName)}-${randomHex(4)}`;
      const endDate = new Date(startDate!);
      endDate.setDate(endDate.getDate() + durationDays!);

      const prizePoolSats = prizePool ? parseInt(prizePool, 10) || 0 : 0;

      const { error } = await supabase!.from('competitions').insert({
        external_id: externalId,
        name: eventName.trim(),
        activity_type: selectedActivities[0],
        scoring_method: scoringMethod,
        start_date: startDate!.toISOString(),
        end_date: endDate.toISOString(),
        prize_pool_sats: prizePoolSats,
        is_open: true,
        template: 'distance_race',
        created_by_npub: npub,
        config: {
          activity_types: selectedActivities,
          created_via: 'app',
        },
      });

      if (error) {
        console.error('[SimpleEventCreation] Insert error:', error);
        setAlertTitle('Error');
        setAlertMessage(error.message);
        setAlertVisible(true);
        setIsSubmitting(false);
        return;
      }

      console.log(`[SimpleEventCreation] Created event: ${externalId}`);
      setAlertTitle('Event Created!');
      setAlertMessage('Your event is live. Share it with your community to get participants.');
      setAlertVisible(true);
      onEventCreated?.(externalId);
    } catch (err) {
      console.error('[SimpleEventCreation] Exception:', err);
      setAlertTitle('Error');
      setAlertMessage(err instanceof Error ? err.message : 'Unknown error');
      setAlertVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, eventName, selectedActivities, scoringMethod, startDate, durationDays, prizePool, onEventCreated]);

  const handleAlertDismiss = useCallback(() => {
    setAlertVisible(false);
    if (alertTitle === 'Event Created!') {
      handleClose();
    }
  }, [alertTitle, handleClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Event</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Event Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Name</Text>
              <TextInput
                style={styles.textInput}
                value={eventName}
                onChangeText={setEventName}
                placeholder="e.g., Spring Distance Challenge"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={100}
              />
            </View>

            {/* Activity Types (multi-select) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Activity Types</Text>
              <View style={styles.buttonRow}>
                {ACTIVITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      selectedActivities.includes(opt.value) &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => toggleActivity(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        selectedActivities.includes(opt.value) &&
                          styles.optionButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Scoring Method */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Scoring</Text>
              <View style={styles.buttonRow}>
                {SCORING_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      scoringMethod === opt.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => setScoringMethod(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        scoringMethod === opt.value &&
                          styles.optionButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Start Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date</Text>
              <View style={styles.buttonRow}>
                {quickDates.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.optionButton,
                      startDate?.toDateString() === opt.date.toDateString() &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => setStartDate(opt.date)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        startDate?.toDateString() === opt.date.toDateString() &&
                          styles.optionButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {startDate && (
                <Text style={styles.helper}>
                  {startDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              )}
            </View>

            {/* Duration */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.buttonRow}>
                {DURATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.days}
                    style={[
                      styles.optionButton,
                      durationDays === opt.days && styles.optionButtonSelected,
                    ]}
                    onPress={() => setDurationDays(opt.days)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        durationDays === opt.days &&
                          styles.optionButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {startDate && durationDays && (
                <Text style={styles.helper}>
                  Ends{' '}
                  {new Date(
                    startDate.getTime() + durationDays * 86400000
                  ).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              )}
            </View>

            {/* Prize Pool */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Prize Pool (sats, optional)</Text>
              <TextInput
                style={styles.textInput}
                value={prizePool}
                onChangeText={setPrizePool}
                placeholder="e.g., 21000"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* Bottom padding */}
            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              (!isValid || isSubmitting) && styles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!isValid || isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={styles.createButtonText}>Create Event</Text>
            )}
          </TouchableOpacity>
        </View>

        <CustomAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          buttons={[{ text: 'OK', style: 'default', onPress: handleAlertDismiss }]}
          onClose={handleAlertDismiss}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.text,
  },
  title: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366',
  },
  headerSpacer: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: '#FFB366',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#FFB366',
    borderColor: '#FFB366',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  optionButtonTextSelected: {
    color: theme.colors.background,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  createButton: {
    backgroundColor: '#FFB366',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
});

export default SimpleEventCreationModal;
