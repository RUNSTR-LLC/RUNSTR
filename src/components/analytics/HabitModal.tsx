/**
 * HabitModal - Modal for creating new habits
 * Uses RUNSTR's orange (#FF9D42) and black theme with Ionicons
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { HABIT_TEMPLATES } from '../../services/habits/HabitTrackerService';

interface HabitModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    type: 'abstinence' | 'positive',
    icon: string,
    color: string
  ) => void;
}

export const HabitModal: React.FC<HabitModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [habitName, setHabitName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [habitType, setHabitType] = useState<'abstinence' | 'positive'>(
    'abstinence'
  );

  const handleSave = () => {
    if (!habitName.trim()) {
      return;
    }

    const template =
      selectedTemplate !== null ? HABIT_TEMPLATES[selectedTemplate] : null;
    const icon = template?.icon || 'checkmark-circle-outline';
    const color = template?.color || theme.colors.orangeBright;

    onSave(habitName.trim(), habitType, icon, color);
    handleClose();
  };

  const handleClose = () => {
    setHabitName('');
    setSelectedTemplate(null);
    setHabitType('abstinence');
    onClose();
  };

  const handleSelectTemplate = (index: number) => {
    setSelectedTemplate(index);
    setHabitName(HABIT_TEMPLATES[index].name);
    setHabitType(HABIT_TEMPLATES[index].type);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add New Habit</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Habit Type Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Habit Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    habitType === 'abstinence' && styles.typeButtonActive,
                  ]}
                  onPress={() => setHabitType('abstinence')}
                >
                  <Ionicons
                    name="ban-outline"
                    size={20}
                    color={
                      habitType === 'abstinence'
                        ? theme.colors.background
                        : theme.colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      habitType === 'abstinence' && styles.typeButtonTextActive,
                    ]}
                  >
                    Avoid
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    habitType === 'positive' && styles.typeButtonActive,
                  ]}
                  onPress={() => setHabitType('positive')}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={
                      habitType === 'positive'
                        ? theme.colors.background
                        : theme.colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      habitType === 'positive' && styles.typeButtonTextActive,
                    ]}
                  >
                    Build
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Habit Templates */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Quick Templates</Text>
              <View style={styles.templateGrid}>
                {HABIT_TEMPLATES.filter((t) => t.type === habitType).map(
                  (template, index) => {
                    const actualIndex = HABIT_TEMPLATES.findIndex(
                      (t) => t.name === template.name
                    );
                    return (
                      <TouchableOpacity
                        key={template.name}
                        style={[
                          styles.templateButton,
                          selectedTemplate === actualIndex &&
                            styles.templateButtonActive,
                        ]}
                        onPress={() => handleSelectTemplate(actualIndex)}
                      >
                        <Ionicons
                          name={template.icon as any}
                          size={24}
                          color={
                            selectedTemplate === actualIndex
                              ? theme.colors.orangeBright
                              : theme.colors.textMuted
                          }
                        />
                        <Text
                          style={[
                            styles.templateText,
                            selectedTemplate === actualIndex &&
                              styles.templateTextActive,
                          ]}
                        >
                          {template.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </View>

            {/* Habit Name Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Habit Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter habit name..."
                placeholderTextColor={theme.colors.textMuted}
                value={habitName}
                onChangeText={setHabitName}
                maxLength={50}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !habitName.trim() && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!habitName.trim()}
              >
                <Text style={styles.saveButtonText}>Save Habit</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  modalContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerTitle: {
    fontSize: theme.typography.headingSecondary,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  content: {
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
  },

  section: {
    marginBottom: theme.spacing.xxl,
  },

  sectionLabel: {
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },

  typeSelector: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },

  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
  },

  typeButtonActive: {
    backgroundColor: theme.colors.orangeBright,
    borderColor: theme.colors.orangeBright,
  },

  typeButtonText: {
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },

  typeButtonTextActive: {
    color: theme.colors.background,
  },

  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
  },

  templateButton: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
  },

  templateButtonActive: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.orangeBright,
    borderWidth: 2,
  },

  templateText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    flex: 1,
  },

  templateTextActive: {
    color: theme.colors.orangeBright,
    fontWeight: theme.typography.weights.semiBold,
  },

  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
    fontSize: theme.typography.body,
    color: theme.colors.text,
  },

  actions: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
  },

  cancelButtonText: {
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },

  saveButton: {
    flex: 1,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.orangeBright,
    borderRadius: theme.borderRadius.medium,
  },

  saveButtonDisabled: {
    backgroundColor: theme.colors.border,
  },

  saveButtonText: {
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
});
