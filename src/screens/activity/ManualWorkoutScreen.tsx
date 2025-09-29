/**
 * ManualWorkoutScreen - Manual workout entry with presets
 * Allows users to log non-GPS tracked activities
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface WorkoutPreset {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'strength' | 'flexibility' | 'mindfulness' | 'cardio';
}

const WORKOUT_PRESETS: WorkoutPreset[] = [
  { id: 'pushups', name: 'Pushups', icon: 'fitness', category: 'strength' },
  { id: 'pullups', name: 'Pullups', icon: 'fitness', category: 'strength' },
  { id: 'situps', name: 'Situps', icon: 'fitness', category: 'strength' },
  { id: 'yoga', name: 'Yoga', icon: 'body', category: 'flexibility' },
  { id: 'meditation', name: 'Meditation', icon: 'leaf', category: 'mindfulness' },
  { id: 'treadmill', name: 'Treadmill', icon: 'speedometer', category: 'cardio' },
  { id: 'weights', name: 'Weight Training', icon: 'barbell', category: 'strength' },
  { id: 'stretching', name: 'Stretching', icon: 'body', category: 'flexibility' },
];

export const ManualWorkoutScreen: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customType, setCustomType] = useState('');
  const [duration, setDuration] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    setCustomType(''); // Clear custom type when preset is selected
  };

  const handleSave = () => {
    const workoutType = selectedPreset
      ? WORKOUT_PRESETS.find(p => p.id === selectedPreset)?.name
      : customType;

    if (!workoutType) {
      Alert.alert('Error', 'Please select a workout type or enter a custom one');
      return;
    }

    const workoutData = {
      type: workoutType,
      duration: duration ? parseInt(duration) : undefined,
      reps: reps ? parseInt(reps) : undefined,
      sets: sets ? parseInt(sets) : undefined,
      distance: distance ? parseFloat(distance) : undefined,
      notes,
      timestamp: new Date().toISOString(),
    };

    // TODO: Integrate with WorkoutPublishingService
    console.log('Saving manual workout:', workoutData);

    Alert.alert(
      'Workout Saved!',
      `${workoutType} has been logged successfully`,
      [{ text: 'OK', onPress: resetForm }]
    );
  };

  const resetForm = () => {
    setSelectedPreset(null);
    setCustomType('');
    setDuration('');
    setReps('');
    setSets('');
    setDistance('');
    setNotes('');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Preset Workouts */}
      <Text style={styles.sectionTitle}>Select Workout Type</Text>
      <View style={styles.presetsGrid}>
        {WORKOUT_PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetButton,
              selectedPreset === preset.id && styles.presetButtonActive,
            ]}
            onPress={() => handlePresetSelect(preset.id)}
          >
            <Ionicons
              name={preset.icon}
              size={24}
              color={selectedPreset === preset.id ? theme.colors.background : theme.colors.text}
            />
            <Text
              style={[
                styles.presetButtonText,
                selectedPreset === preset.id && styles.presetButtonTextActive,
              ]}
            >
              {preset.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Workout Type */}
      <Text style={styles.sectionTitle}>Or Enter Custom Type</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Rock Climbing"
        placeholderTextColor={theme.colors.textMuted}
        value={customType}
        onChangeText={(text) => {
          setCustomType(text);
          setSelectedPreset(null); // Clear preset when custom is entered
        }}
      />

      {/* Workout Details */}
      <Text style={styles.sectionTitle}>Workout Details</Text>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Duration (min)</Text>
          <TextInput
            style={styles.inputSmall}
            placeholder="30"
            placeholderTextColor={theme.colors.textMuted}
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Distance (km)</Text>
          <TextInput
            style={styles.inputSmall}
            placeholder="5.0"
            placeholderTextColor={theme.colors.textMuted}
            value={distance}
            onChangeText={setDistance}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Sets</Text>
          <TextInput
            style={styles.inputSmall}
            placeholder="3"
            placeholderTextColor={theme.colors.textMuted}
            value={sets}
            onChangeText={setSets}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reps</Text>
          <TextInput
            style={styles.inputSmall}
            placeholder="12"
            placeholderTextColor={theme.colors.textMuted}
            value={reps}
            onChangeText={setReps}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Notes */}
      <Text style={styles.sectionTitle}>Notes (Optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="How did it feel? Any PRs?"
        placeholderTextColor={theme.colors.textMuted}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Log Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  presetButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetButtonActive: {
    backgroundColor: theme.colors.text,
  },
  presetButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
  presetButtonTextActive: {
    color: theme.colors.background,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  inputSmall: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
  },
});