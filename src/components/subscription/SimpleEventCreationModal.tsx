/**
 * SimpleEventCreationModal - Event creation/editing for club captains.
 *
 * Templates: 5K Race, 10K Race, Half Marathon, Step Challenge
 * Scoring is auto-set per template:
 *   - 5K / 10K  → fastest_time
 *   - Half Marathon → total_distance
 *   - Step Challenge → total_steps (walking)
 *
 * Supports edit mode via `existingEvent` prop to update name/description.
 * Inserts directly into Supabase competitions table with spam prevention
 * and auto-join for club members.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { CustomAlert } from '../ui/CustomAlert';
import { isSupabaseConfigured } from '../../utils/supabase';
import { callEdgeFunction } from '../../utils/edgeFunctions';
import { SupabaseCompetitionService } from '../../services/backend/SupabaseCompetitionService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SimpleEventCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated?: (eventId: string) => void;
  clubId?: string;
  /** Pass to open in edit mode */
  existingEvent?: {
    id: string;
    external_id: string;
    name: string;
    description: string | null;
    template: string | null;
  };
}

interface EventTemplate {
  key: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  distanceKm: number;
  templateId: string;
  activityType: string;
  scoringMethod: string;
  placeholder: string;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    key: '5k',
    label: '5K',
    subtitle: 'Fastest 5 km run',
    icon: 'fitness-outline',
    distanceKm: 5,
    templateId: '5k_race',
    activityType: 'running',
    scoringMethod: 'fastest_time',
    placeholder: 'e.g., Saturday 5K Challenge',
  },
  {
    key: '10k',
    label: '10K',
    subtitle: 'Fastest 10 km run',
    icon: 'fitness-outline',
    distanceKm: 10,
    templateId: '10k_race',
    activityType: 'running',
    scoringMethod: 'fastest_time',
    placeholder: 'e.g., Weekend 10K Showdown',
  },
  {
    key: 'half',
    label: 'Half Marathon',
    subtitle: 'Longest total distance',
    icon: 'fitness-outline',
    distanceKm: 21.1,
    templateId: 'half_marathon',
    activityType: 'running',
    scoringMethod: 'total_distance',
    placeholder: 'e.g., Spring Half Marathon',
  },
  {
    key: 'steps',
    label: 'Step Challenge',
    subtitle: 'Most steps in a day',
    icon: 'walk-outline',
    distanceKm: 0,
    templateId: 'step_challenge',
    activityType: 'walking',
    scoringMethod: 'total_steps',
    placeholder: 'e.g., 10K Steps Challenge',
  },
];

const MAX_ACTIVE_EVENTS_PER_USER = 3;
const EVENT_DURATION_DAYS = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getQuickDateOptions() {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const tomorrowUTC = new Date(todayUTC);
  tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
  const weekendUTC = new Date(todayUTC);
  const daysUntilSaturday = (6 - todayUTC.getUTCDay() + 7) % 7;
  weekendUTC.setUTCDate(weekendUTC.getUTCDate() + daysUntilSaturday);
  return [
    { label: 'Today', date: todayUTC },
    { label: 'Tomorrow', date: tomorrowUTC },
    { label: 'Weekend', date: weekendUTC },
  ];
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function randomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SimpleEventCreationModal: React.FC<SimpleEventCreationModalProps> = ({
  visible, onClose, onEventCreated, clubId, existingEvent,
}) => {
  const isEditMode = !!existingEvent;

  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const quickDates = getQuickDateOptions();

  // Pre-fill form in edit mode
  useEffect(() => {
    if (visible && existingEvent) {
      setEventName(existingEvent.name);
      setDescription(existingEvent.description || '');
      if (existingEvent.template) {
        const tmpl = EVENT_TEMPLATES.find((t) => t.templateId === existingEvent.template);
        if (tmpl) setSelectedTemplate(tmpl);
      }
    }
  }, [visible, existingEvent]);

  const resetForm = useCallback(() => {
    setSelectedTemplate(null);
    setEventName('');
    setDescription('');
    setStartDate(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const isValid = isEditMode
    ? eventName.trim().length > 0
    : selectedTemplate !== null && eventName.trim().length > 0 && startDate !== null;

  const showAlert = useCallback((title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  }, []);

  // -------------------------------------------------------------------------
  // Edit handler
  // -------------------------------------------------------------------------

  const handleEdit = useCallback(async () => {
    if (isSubmittingRef.current || !existingEvent) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      const result = await SupabaseCompetitionService.updateCompetition(
        existingEvent.id,
        {
          name: eventName.trim(),
          description: description.trim() || null,
        },
        npub || undefined,
      );

      if (result.success) {
        showAlert('Event Updated', 'Your changes have been saved.');
        onEventCreated?.(existingEvent.external_id);
      } else {
        showAlert('Error', result.error || 'Failed to update event.');
      }
    } catch (err) {
      console.error('[SimpleEventCreation] Edit exception:', err);
      showAlert('Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [existingEvent, eventName, description, showAlert, onEventCreated]);

  // -------------------------------------------------------------------------
  // Create handler
  // -------------------------------------------------------------------------

  const handleCreate = useCallback(async () => {
    if (isSubmittingRef.current) return;
    if (!isValid || !selectedTemplate) return;
    if (!isSupabaseConfigured()) {
      showAlert('Error', 'Unable to connect. Please try again later.');
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!npub) {
        showAlert('Error', 'Please log in first');
        return;
      }

      const endDate = new Date(startDate!);
      endDate.setUTCDate(endDate.getUTCDate() + EVENT_DURATION_DAYS);

      // Create competition via Edge Function (handles spam prevention, auto-join)
      const result = await callEdgeFunction<{
        id?: string;
        external_id?: string;
        auto_joined?: number;
      }>('manage-competition', {
        action: 'create',
        npub,
        name: eventName.trim(),
        description: description.trim() || null,
        activity_type: selectedTemplate.activityType,
        scoring_method: selectedTemplate.scoringMethod,
        start_date: startDate!.toISOString(),
        end_date: endDate.toISOString(),
        template: selectedTemplate.templateId,
        club_id: clubId || null,
        config: {
          activity_types: [selectedTemplate.activityType],
          scoring_method: selectedTemplate.scoringMethod,
          target_distance_km: selectedTemplate.distanceKm,
          template: selectedTemplate.templateId,
          created_via: clubId ? 'club' : 'app',
        },
      });

      if (!result.success) {
        console.error('[SimpleEventCreation] Create error:', result.error);
        showAlert('Error', result.error || 'Failed to create event. Please try again.');
        return;
      }

      const data = result.data as any;
      const externalId = data?.external_id || '';
      const autoJoinCount = data?.auto_joined ?? 0;

      console.log(`[SimpleEventCreation] Created ${selectedTemplate.label}: ${externalId}${clubId ? ` (club: ${clubId})` : ''}`);

      // Clear caches
      if (clubId) {
        await SupabaseCompetitionService.clearClubCompetitionsCache(clubId);
      }
      await SupabaseCompetitionService.clearDynamicCompetitionsCache();

      showAlert(
        'Event Created',
        clubId
          ? autoJoinCount > 0
            ? `Event is live. ${autoJoinCount} club member${autoJoinCount === 1 ? '' : 's'} enrolled automatically.`
            : 'Event is live. No club members found to auto-enroll.'
          : 'Event is live and you have been joined automatically.'
      );
      onEventCreated?.(externalId);
    } catch (err) {
      console.error('[SimpleEventCreation] Exception:', err);
      showAlert('Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isValid, selectedTemplate, eventName, description, startDate, onEventCreated, showAlert, clubId]);

  const handleAlertDismiss = useCallback(() => {
    setAlertVisible(false);
    if (alertTitle === 'Event Created' || alertTitle === 'Event Updated') handleClose();
  }, [alertTitle, handleClose]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity style={s.closeButton} onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>{isEditMode ? 'Edit Event' : 'Create Event'}</Text>
          <View style={s.headerSpacer} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboardView}>
          <ScrollView style={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Template Selection (create mode only) */}
            {!isEditMode && (
              <View style={s.formGroup}>
                <Text style={s.label}>Event Type</Text>
                <View style={s.templateRow}>
                  {EVENT_TEMPLATES.map((tmpl) => {
                    const sel = selectedTemplate?.key === tmpl.key;
                    return (
                      <TouchableOpacity
                        key={tmpl.key}
                        style={[s.templateButton, sel && s.templateButtonSelected]}
                        onPress={() => setSelectedTemplate(tmpl)}
                        activeOpacity={0.7}
                      >
                        <View style={s.templateLeft}>
                          <Ionicons
                            name={tmpl.icon}
                            size={20}
                            color={sel ? theme.colors.text : theme.colors.textMuted}
                          />
                          <View style={s.templateInfo}>
                            <Text style={[s.templateLabel, sel && s.templateLabelSelected]}>
                              {tmpl.label}
                            </Text>
                            <Text style={[s.templateSubtitle, sel && s.templateSubtitleSelected]}>
                              {tmpl.subtitle}
                            </Text>
                          </View>
                        </View>
                        {sel && (
                          <Ionicons name="checkmark-circle" size={20} color={theme.colors.text} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Event Name */}
            <View style={s.formGroup}>
              <Text style={s.label}>Event Name</Text>
              <TextInput
                style={s.textInput}
                value={eventName}
                onChangeText={setEventName}
                placeholder={selectedTemplate?.placeholder ?? 'e.g., Saturday 5K Challenge'}
                placeholderTextColor={theme.colors.textDark}
                maxLength={100}
              />
            </View>

            {/* Description */}
            <View style={s.formGroup}>
              <Text style={s.label}>Description (optional)</Text>
              <TextInput
                style={[s.textInput, s.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Rules, goals, or details about your event..."
                placeholderTextColor={theme.colors.textDark}
                maxLength={500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Start Date (create mode only) */}
            {!isEditMode && (
              <View style={s.formGroup}>
                <Text style={s.label}>Start Date</Text>
                <View style={s.buttonRow}>
                  {quickDates.map((opt) => {
                    const sel = startDate?.toISOString() === opt.date.toISOString();
                    return (
                      <TouchableOpacity
                        key={opt.label}
                        style={[s.optionButton, sel && s.selectedButton]}
                        onPress={() => setStartDate(opt.date)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.optionButtonText, sel && s.selectedText]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {startDate && (
                  <Text style={s.helperBelow}>
                    {formatDate(startDate)} — 1 day event ending{' '}
                    {formatDate((() => { const end = new Date(startDate); end.setUTCDate(end.getUTCDate() + EVENT_DURATION_DAYS); return end; })())}
                  </Text>
                )}
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.submitButton, (!isValid || isSubmitting) && s.submitButtonDisabled]}
            onPress={isEditMode ? handleEdit : handleCreate}
            disabled={!isValid || isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <Text style={s.submitButtonText}>
                {isEditMode ? 'Save Changes' : 'Create Event'}
              </Text>
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

// ---------------------------------------------------------------------------
// Styles — dark/black primary, no bright orange
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 18, fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  headerSpacer: { width: 32 },
  keyboardView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 13, fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 16,
    color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  helperBelow: { fontSize: 12, color: theme.colors.textMuted, marginTop: 6 },
  // Template selection
  templateRow: { gap: 8 },
  templateButton: {
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: theme.colors.card, borderWidth: 1.5,
    borderColor: theme.colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  templateButtonSelected: {
    borderColor: theme.colors.text,
    backgroundColor: '#111111',
  },
  templateLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1,
  },
  templateInfo: { flex: 1 },
  templateLabel: {
    fontSize: 16, fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
  },
  templateLabelSelected: { color: theme.colors.text },
  templateSubtitle: { fontSize: 13, color: theme.colors.textDark, marginTop: 2 },
  templateSubtitleSelected: { color: theme.colors.textMuted },
  // Date quick-picks
  buttonRow: { flexDirection: 'row', gap: 8 },
  optionButton: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: theme.colors.card, borderWidth: 1,
    borderColor: theme.colors.border, alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 14, fontWeight: theme.typography.weights.medium, color: theme.colors.textMuted,
  },
  selectedButton: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  selectedText: { color: theme.colors.background },
  // Footer
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  submitButton: {
    backgroundColor: theme.colors.text, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.35 },
  submitButtonText: {
    fontSize: 16, fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
});

export default SimpleEventCreationModal;
