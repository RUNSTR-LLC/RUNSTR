/**
 * SimpleEventCreationModal - Event creation/editing for club captains.
 *
 * Templates: 5K Race, 10K Race, Half Marathon, Step Challenge, Charity Event
 * Scoring is auto-set per template:
 *   - 5K / 10K  → fastest_time
 *   - Half Marathon → total_distance
 *   - Step Challenge → total_steps (walking)
 *   - Charity Event → workout_count (running)
 *
 * Supports edit mode via `existingEvent` prop to update recurring_interval.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
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
  clubName?: string;
  clubBannerUrl?: string;
  existingEvent?: {
    id: string;
    external_id: string;
    name: string;
    recurring_interval?: string;
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
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    key: '5k',
    label: '5K Race',
    subtitle: 'Fastest 5 km run',
    icon: 'fitness-outline',
    distanceKm: 5,
    templateId: '5k_race',
    activityType: 'running',
    scoringMethod: 'fastest_time',
  },
  {
    key: '10k',
    label: '10K Race',
    subtitle: 'Fastest 10 km run',
    icon: 'fitness-outline',
    distanceKm: 10,
    templateId: '10k_race',
    activityType: 'running',
    scoringMethod: 'fastest_time',
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
  },
  {
    key: 'charity',
    label: 'Charity Event',
    subtitle: 'Rally for a cause',
    icon: 'heart-outline',
    distanceKm: 0,
    templateId: 'charity_event',
    activityType: 'running',
    scoringMethod: 'workout_count',
  },
];

const DURATION_OPTIONS = [
  { label: '1d', days: 1 },
  { label: '3d', days: 3 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
];

const RECURRING_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'Off', value: null },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SimpleEventCreationModal: React.FC<SimpleEventCreationModalProps> = ({
  visible, onClose, onEventCreated, clubId, clubName, clubBannerUrl, existingEvent,
}) => {
  const isEditMode = !!existingEvent;

  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [durationDays, setDurationDays] = useState(7);
  const [recurringInterval, setRecurringInterval] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Pre-fill form in edit mode
  useEffect(() => {
    if (visible && existingEvent) {
      setRecurringInterval(existingEvent.recurring_interval ?? null);
    }
  }, [visible, existingEvent]);

  const resetForm = useCallback(() => {
    setSelectedTemplate(null);
    setDurationDays(7);
    setRecurringInterval(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const isValid = isEditMode
    ? true
    : selectedTemplate !== null;

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
      const result = await callEdgeFunction('manage-competition', {
        action: 'update',
        competition_id: existingEvent.id,
        npub: npub || '',
        updates: { recurring_interval: recurringInterval },
      });

      if (result.success) {
        await SupabaseCompetitionService.clearDynamicCompetitionsCache();
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
  }, [existingEvent, recurringInterval, showAlert, onEventCreated]);

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

      const displayClubName = clubName || 'RUNSTR Club';
      const autoName = `${displayClubName} ${selectedTemplate.label}`;

      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + durationDays * 86400000).toISOString();

      const result = await callEdgeFunction<{
        id?: string;
        external_id?: string;
        auto_joined?: number;
      }>('manage-competition', {
        action: 'create',
        npub,
        name: autoName,
        description: null,
        activity_type: selectedTemplate.activityType,
        scoring_method: selectedTemplate.scoringMethod,
        start_date: startDate,
        end_date: endDate,
        template: selectedTemplate.templateId,
        club_id: clubId || null,
        image_url: clubBannerUrl || null,
        recurring_interval: recurringInterval || null,
        config: {
          activity_types: [selectedTemplate.activityType],
          scoring_method: selectedTemplate.scoringMethod,
          target_distance_km: selectedTemplate.distanceKm,
          template: selectedTemplate.templateId,
          created_via: clubId ? 'club' : 'app',
          score_unit: selectedTemplate.scoringMethod === 'fastest_time' ? 'seconds' : 'km',
          ticket_pledge_days: 0,
          winner_selection: 'top_ranked',
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
          : 'Event is live and you have been joined automatically.',
      );
      onEventCreated?.(externalId);
    } catch (err) {
      console.error('[SimpleEventCreation] Exception:', err);
      showAlert('Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isValid, selectedTemplate, durationDays, recurringInterval, clubId, clubName, clubBannerUrl, onEventCreated, showAlert]);

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
                <View style={s.templateGrid}>
                  {EVENT_TEMPLATES.map((tmpl) => {
                    const sel = selectedTemplate?.key === tmpl.key;
                    return (
                      <TouchableOpacity
                        key={tmpl.key}
                        style={[s.templateCard, sel && s.templateCardSelected]}
                        onPress={() => setSelectedTemplate(tmpl)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={tmpl.icon}
                          size={22}
                          color={sel ? theme.colors.text : theme.colors.textMuted}
                        />
                        <Text style={[s.templateLabel, sel && s.templateLabelSelected]}>
                          {tmpl.label}
                        </Text>
                        <Text style={[s.templateSubtitle, sel && s.templateSubtitleSelected]}>
                          {tmpl.subtitle}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Duration (create mode only) */}
            {!isEditMode && (
              <View style={s.formGroup}>
                <Text style={s.label}>Duration</Text>
                <View style={s.pillRow}>
                  {DURATION_OPTIONS.map((opt) => {
                    const sel = durationDays === opt.days;
                    return (
                      <TouchableOpacity
                        key={opt.label}
                        style={[s.pill, sel && s.pillSelected]}
                        onPress={() => setDurationDays(opt.days)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.pillText, sel && s.pillTextSelected]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Recurring */}
            <View style={s.formGroup}>
              <Text style={s.label}>Recurring</Text>
              <View style={s.pillRow}>
                {RECURRING_OPTIONS.map((opt) => {
                  const sel = recurringInterval === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[s.pill, sel && s.pillSelected]}
                      onPress={() => setRecurringInterval(opt.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.pillText, sel && s.pillTextSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

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
// Styles
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
  // Template 2x2 grid
  templateGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  templateCard: {
    width: '47%', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: theme.colors.card, borderWidth: 1.5,
    borderColor: theme.colors.border, alignItems: 'center', gap: 6,
  },
  templateCardSelected: {
    borderColor: theme.colors.text,
    backgroundColor: '#111111',
  },
  templateLabel: {
    fontSize: 15, fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted, textAlign: 'center',
  },
  templateLabelSelected: { color: theme.colors.text },
  templateSubtitle: { fontSize: 12, color: theme.colors.textDark, textAlign: 'center' },
  templateSubtitleSelected: { color: theme.colors.textMuted },
  // Pill rows for duration / recurring
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1,
    borderColor: theme.colors.border, alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  pillSelected: {
    backgroundColor: theme.colors.text, borderColor: theme.colors.text,
  },
  pillText: {
    fontSize: 14, fontWeight: theme.typography.weights.semiBold as '600',
    color: theme.colors.textMuted,
  },
  pillTextSelected: { color: theme.colors.background },
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
