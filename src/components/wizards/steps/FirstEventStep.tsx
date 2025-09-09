/**
 * FirstEventStep - Create inaugural event for new team
 * Handles event name, type, date/time, prize amount, and repeat settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../../styles/theme';
import {
  EventCreationData,
  TeamCreationStepProps,
  CompetitionType,
} from '../../../types';

interface EventTypeOption {
  value: CompetitionType;
  title: string;
}

const eventTypeOptions: EventTypeOption[] = [
  { value: 'streaks', title: 'Streaks' },
  { value: 'distance', title: 'Distance' },
  { value: 'speed', title: 'Speed' },
];

export const FirstEventStep: React.FC<TeamCreationStepProps> = ({
  data,
  onDataChange,
}) => {
  const [formData, setFormData] = useState<EventCreationData>(() => ({
    name: data.eventName || 'Welcome 5K Challenge',
    type: (data.eventType as CompetitionType) || null,
    startDate: data.eventStartDate || getTodayString(),
    startTime: data.eventStartTime || '9:00 AM',
    prizeAmount: data.eventPrizeAmount || 2500,
    repeatWeekly: data.eventRepeatWeekly || false,
  }));

  // Date/Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Character count for event name
  const nameCharCount = formData.name.length;

  // Update parent data when form changes
  useEffect(() => {
    onDataChange({
      eventName: formData.name,
      eventType: formData.type,
      eventStartDate: formData.startDate,
      eventStartTime: formData.startTime,
      eventPrizeAmount: formData.prizeAmount,
      eventRepeatWeekly: formData.repeatWeekly,
    });
  }, [
    formData.name,
    formData.type,
    formData.startDate,
    formData.startTime,
    formData.prizeAmount,
    formData.repeatWeekly,
    // onDataChange intentionally excluded - comes from parent, changes every render
  ]);

  const updateFormData = <K extends keyof EventCreationData>(
    field: K,
    value: EventCreationData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Format date input (handle various inputs like "2026" -> "2026-01-01")
  const formatDateInput = (input: string): string => {
    // Remove any non-digits and dashes
    const cleaned = input.replace(/[^0-9-]/g, '');

    if (cleaned.length === 4) {
      // Just year: "2026" -> "2026-01-01"
      return `${cleaned}-01-01`;
    } else if (cleaned.match(/^\d{4}-\d{2}$/)) {
      // Year-month: "2026-03" -> "2026-03-01"
      return `${cleaned}-01`;
    } else if (cleaned.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Full date: return as is
      return cleaned;
    }

    return cleaned; // Return partial input as user types
  };

  // Format time input (handle various inputs like "830" -> "08:30")
  const formatTimeInput = (input: string): string => {
    // Remove any non-digits and colons
    const cleaned = input.replace(/[^0-9:]/g, '');

    if (cleaned.length === 3) {
      // "830" -> "08:30"
      return `0${cleaned[0]}:${cleaned.slice(1)}`;
    } else if (cleaned.length === 4 && !cleaned.includes(':')) {
      // "0830" -> "08:30"
      return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
    } else if (cleaned.match(/^\d{1,2}:\d{2}$/)) {
      // Pad hour if needed: "8:30" -> "08:30"
      const [hour, minute] = cleaned.split(':');
      return `${hour.padStart(2, '0')}:${minute}`;
    }

    return cleaned; // Return partial input as user types
  };

  // Handle date input with formatting
  const handleDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    updateFormData('startDate', formatted);
  };

  // Handle time input with formatting
  const handleTimeChange = (text: string) => {
    const formatted = formatTimeInput(text);
    updateFormData('startTime', formatted);
  };

  const getDateHelperText = (): string => {
    const selectedDate = new Date(formData.startDate);
    const today = new Date();
    const dayDiff = Math.ceil(
      (selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Tomorrow';
    if (dayDiff > 1 && dayDiff <= 7) return `In ${dayDiff} days`;
    return selectedDate.toLocaleDateString();
  };

  const toggleRepeat = () => {
    updateFormData('repeatWeekly', !formData.repeatWeekly);
  };

  // Convert string date to Date object for picker
  const getDateValue = (): Date => {
    try {
      return new Date(formData.startDate + 'T00:00:00');
    } catch {
      return new Date();
    }
  };

  // Convert string time to Date object for picker
  const getTimeValue = (): Date => {
    try {
      const today = new Date();
      const timeString = formData.startTime;

      // Handle both "HH:mm" and "h:mm AM/PM" formats
      if (timeString.includes('AM') || timeString.includes('PM')) {
        const [time, period] = timeString.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let actualHours = hours;

        if (period === 'PM' && hours !== 12) {
          actualHours = hours + 12;
        } else if (period === 'AM' && hours === 12) {
          actualHours = 0;
        }

        today.setHours(actualHours, minutes || 0, 0, 0);
      } else {
        // Handle "HH:mm" format (24-hour)
        const [hours, minutes] = timeString.split(':').map(Number);
        today.setHours(hours || 0, minutes || 0, 0, 0);
      }

      return today;
    } catch {
      const now = new Date();
      now.setHours(9, 0, 0, 0); // Default to 9:00 AM
      return now;
    }
  };

  // Handle date picker change
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false); // Always hide after selection
    if (selectedDate && event.type !== 'dismissed') {
      const dateString = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      updateFormData('startDate', dateString);
    }
  };

  // Handle time picker change
  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false); // Always hide after selection
    if (selectedTime && event.type !== 'dismissed') {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const timeString = `${displayHours}:${minutes
        .toString()
        .padStart(2, '0')} ${ampm}`;
      updateFormData('startTime', timeString);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Create your first event</Text>
        <Text style={styles.stepSubtitle}>
          Get your team started with an exciting inaugural event that will
          engage your members from day one.
        </Text>
      </View>

      {/* Event Name */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Event Name</Text>
        <TextInput
          style={styles.formInput}
          value={formData.name}
          onChangeText={(text) => updateFormData('name', text.slice(0, 60))}
          placeholder="Welcome 5K Challenge"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={60}
        />
        <Text
          style={[
            styles.characterCount,
            nameCharCount > 54 && styles.characterCountWarning,
          ]}
        >
          {nameCharCount}/60
        </Text>
      </View>

      {/* Competition Type */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Competition Type</Text>
        <View style={styles.inlineRadioGroup}>
          {eventTypeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.inlineRadioItem,
                formData.type === option.value &&
                  styles.inlineRadioItemSelected,
              ]}
              onPress={() => updateFormData('type', option.value)}
            >
              <View
                style={[
                  styles.radioInput,
                  formData.type === option.value && styles.radioInputSelected,
                ]}
              />
              <Text style={styles.inlineRadioTitle}>{option.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date & Time */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>When does it start?</Text>
        <View style={styles.dateTimeRow}>
          {/* Date Picker Button */}
          <View style={styles.dateTimeColumn}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>{formData.startDate}</Text>
            </TouchableOpacity>
            <Text style={styles.dateHelper}>{getDateHelperText()}</Text>
          </View>

          {/* Time Picker Button */}
          <View style={styles.dateTimeColumn}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeText}>{formData.startTime}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={getDateValue()}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
            themeVariant="dark"
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={getTimeValue()}
            mode="time"
            display="default"
            onChange={onTimeChange}
            themeVariant="dark"
          />
        )}
      </View>

      {/* Prize Amount */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Prize Amount</Text>
        <View style={styles.prizeInputContainer}>
          <TextInput
            style={[styles.formInput, styles.prizeInput]}
            value={formData.prizeAmount.toString()}
            onChangeText={(text) => {
              const amount = parseInt(text) || 0;
              if (amount >= 100 && amount <= 10000) {
                updateFormData('prizeAmount', amount);
              }
            }}
            placeholder="2500"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
            maxLength={5}
          />
          <Text style={styles.prizeSuffix}>sats</Text>
        </View>
      </View>

      {/* Repeat Toggle */}
      <View style={styles.repeatSection}>
        <TouchableOpacity style={styles.repeatToggle} onPress={toggleRepeat}>
          <View
            style={[
              styles.toggleSwitch,
              formData.repeatWeekly && styles.toggleSwitchActive,
            ]}
          >
            <View
              style={[
                styles.toggleHandle,
                formData.repeatWeekly && styles.toggleHandleActive,
              ]}
            />
          </View>
          <View style={styles.toggleContent}>
            <Text style={styles.toggleTitle}>Repeat This Event</Text>
            <Text style={styles.toggleDescription}>
              Automatically schedule this event to repeat weekly, keeping your
              team consistently engaged.
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Helper function to get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 24,
    paddingTop: 40,
  },

  stepHeader: {
    marginBottom: 32,
  },

  stepTitle: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
    lineHeight: 32,
  },

  stepSubtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },

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
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 52,
    justifyContent: 'center',
  },

  characterCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: 6,
  },

  characterCountWarning: {
    color: '#ff9500',
  },

  // Inline Radio Group (for event type)
  inlineRadioGroup: {
    flexDirection: 'row',
    gap: 12,
  },

  inlineRadioItem: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inlineRadioItemSelected: {
    borderColor: theme.colors.text,
    backgroundColor: '#1a1a1a',
  },

  radioInput: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    marginBottom: 8,
  },

  radioInputSelected: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },

  inlineRadioTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
  },

  // Date Time Row
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },

  dateTimeColumn: {
    flex: 1,
  },

  dateTimeButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },

  dateTimeText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },

  dateHelper: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },

  // Prize Input
  prizeInputContainer: {
    position: 'relative',
  },

  prizeInput: {
    paddingRight: 60,
  },

  prizeSuffix: {
    position: 'absolute',
    right: 20,
    top: 16,
    fontSize: 16,
    color: theme.colors.textMuted,
  },

  // Repeat Toggle
  repeatSection: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },

  repeatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  toggleSwitch: {
    width: 52,
    height: 28,
    backgroundColor: theme.colors.gray,
    borderRadius: 14,
    position: 'relative',
  },

  toggleSwitchActive: {
    backgroundColor: theme.colors.text,
  },

  toggleHandle: {
    width: 24,
    height: 24,
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    position: 'absolute',
    top: 2,
    left: 2,
  },

  toggleHandleActive: {
    backgroundColor: theme.colors.background,
    transform: [{ translateX: 24 }],
  },

  toggleContent: {
    flex: 1,
  },

  toggleTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  toggleDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});
