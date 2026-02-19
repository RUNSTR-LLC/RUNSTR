/**
 * SimpleEventCreationModal - Race event creation with 5K/10K/Half Marathon templates.
 * Inserts directly into Supabase competitions table with spam prevention,
 * auto-join for creators, and streamlined template-based flow.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { CustomAlert } from '../ui/CustomAlert';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { SupabaseCompetitionService } from '../../services/backend/SupabaseCompetitionService';

interface SimpleEventCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated?: (eventId: string) => void;
  clubId?: string;
}

interface RaceTemplate {
  key: string;
  label: string;
  subtitle: string;
  distanceKm: number;
  templateId: string;
  placeholder: string;
}

const RACE_TEMPLATES: RaceTemplate[] = [
  {
    key: '5k',
    label: '5K',
    subtitle: '5 kilometer race',
    distanceKm: 5,
    templateId: '5k_race',
    placeholder: 'e.g., Saturday 5K Challenge',
  },
  {
    key: '10k',
    label: '10K',
    subtitle: '10 kilometer race',
    distanceKm: 10,
    templateId: '10k_race',
    placeholder: 'e.g., Weekend 10K Showdown',
  },
  {
    key: 'half',
    label: 'Half Marathon',
    subtitle: '21.1 kilometer race',
    distanceKm: 21.1,
    templateId: 'half_marathon',
    placeholder: 'e.g., Spring Half Marathon',
  },
];

const MAX_ACTIVE_EVENTS_PER_USER = 3;

const EVENT_DURATION_DAYS = 1;

function getQuickDateOptions() {
  const now = new Date();
  // Construct dates in UTC so all users get the same midnight-to-midnight window
  // regardless of local timezone. A PST user selecting "Today" gets 00:00 UTC,
  // not 08:00 UTC (which would cause the event to show "UPCOMING" for 8 hours).
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

export const SimpleEventCreationModal: React.FC<SimpleEventCreationModalProps> = ({
  visible, onClose, onEventCreated, clubId,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<RaceTemplate | null>(null);
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const durationDays = EVENT_DURATION_DAYS;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const quickDates = getQuickDateOptions();

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

  const isValid =
    selectedTemplate !== null &&
    eventName.trim().length > 0 &&
    startDate !== null;

  const showAlert = useCallback((title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  }, []);

  const handleCreate = useCallback(async () => {
    if (isSubmittingRef.current) return; // Synchronous check prevents double-submit
    if (!isValid || !selectedTemplate) return;
    if (!isSupabaseConfigured()) {
      showAlert('Error', 'Backend not configured');
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

      // Spam prevention: limit active events per user
      const { count, error: countError } = await supabase!
        .from('competitions')
        .select('*', { count: 'exact', head: true })
        .eq('created_by_npub', npub)
        .gte('end_date', new Date().toISOString());

      if (countError) {
        console.error('[SimpleEventCreation] Count query error:', countError);
        showAlert('Error', 'Unable to verify event limit. Please try again.');
        return;
      }

      if ((count ?? 0) >= MAX_ACTIVE_EVENTS_PER_USER) {
        showAlert(
          'Event Limit Reached',
          `You can have at most ${MAX_ACTIVE_EVENTS_PER_USER} active events at a time. Wait for a current event to end or contact support.`
        );
        return;
      }

      const externalId = `${slugify(eventName)}-${randomHex(4)}`;
      const endDate = new Date(startDate!);
      endDate.setUTCDate(endDate.getUTCDate() + durationDays);

      const { data: insertedRows, error } = await supabase!
        .from('competitions')
        .insert({
          external_id: externalId,
          name: eventName.trim(),
          description: description.trim() || null,
          activity_type: 'running',
          scoring_method: 'total_distance',
          start_date: startDate!.toISOString(),
          end_date: endDate.toISOString(),
          prize_pool_sats: 0,
          is_open: true,
          template: selectedTemplate.templateId,
          created_by_npub: npub,
          club_id: clubId || null,
          config: {
            activity_types: ['running'],
            scoring_method: 'total_distance',
            target_distance_km: selectedTemplate.distanceKm,
            template: selectedTemplate.templateId,
            created_via: clubId ? 'club' : 'app',
          },
        })
        .select('id');

      if (error) {
        console.error('[SimpleEventCreation] Insert error:', error);
        showAlert('Error', error.message);
        return;
      }

      // Auto-join creator to their own event
      const competitionId = insertedRows?.[0]?.id;
      if (competitionId) {
        const { error: joinError } = await supabase!
          .from('competition_participants')
          .upsert(
            { competition_id: competitionId, npub },
            { onConflict: 'competition_id,npub' }
          );
        if (joinError) {
          console.warn('[SimpleEventCreation] Auto-join error (non-blocking):', joinError);
        } else {
          console.log(`[SimpleEventCreation] Auto-joined creator to event: ${externalId}`);
        }
      }

      console.log(`[SimpleEventCreation] Created ${selectedTemplate.label} event: ${externalId}${clubId ? ` (club: ${clubId})` : ''}`);

      // Clear caches so new event appears immediately
      if (clubId) {
        await SupabaseCompetitionService.clearClubCompetitionsCache(clubId);
      }
      await SupabaseCompetitionService.clearDynamicCompetitionsCache();

      showAlert(
        'Event Created!',
        clubId
          ? 'Your club event is live! Members can join from the club page or the Compete tab.'
          : 'Your event is live and you have been joined automatically. Share it with your community to get participants.'
      );
      onEventCreated?.(externalId);
    } catch (err) {
      console.error('[SimpleEventCreation] Exception:', err);
      showAlert('Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isValid, selectedTemplate, eventName, description, startDate, durationDays, onEventCreated, showAlert, clubId]);

  const handleAlertDismiss = useCallback(() => {
    setAlertVisible(false);
    if (alertTitle === 'Event Created!') handleClose();
  }, [alertTitle, handleClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Event</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Race Template Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Race Type</Text>
              <View style={styles.templateRow}>
                {RACE_TEMPLATES.map((tmpl) => {
                  const sel = selectedTemplate?.key === tmpl.key;
                  return (
                    <TouchableOpacity
                      key={tmpl.key}
                      style={[styles.templateButton, sel && styles.templateButtonSelected]}
                      onPress={() => setSelectedTemplate(tmpl)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.templateLabel, sel && styles.templateLabelSelected]}>
                        {tmpl.label}
                      </Text>
                      <Text style={[styles.templateSubtitle, sel && styles.templateSubtitleSelected]}>
                        {tmpl.subtitle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Event Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Name</Text>
              <TextInput
                style={styles.textInput}
                value={eventName}
                onChangeText={setEventName}
                placeholder={selectedTemplate?.placeholder ?? 'e.g., Saturday 5K Challenge'}
                placeholderTextColor={theme.colors.textMuted}
                maxLength={100}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Rules, goals, or details about your event..."
                placeholderTextColor={theme.colors.textMuted}
                maxLength={500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Start Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date</Text>
              <View style={styles.buttonRow}>
                {quickDates.map((opt) => {
                  const sel = startDate?.toISOString() === opt.date.toISOString();
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[styles.optionButton, sel && styles.selectedButton]}
                      onPress={() => setStartDate(opt.date)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionButtonText, sel && styles.selectedText]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {startDate && <Text style={styles.helperBelow}>{formatDate(startDate)}</Text>}
            </View>

            {/* Duration info */}
            {startDate && (
              <View style={styles.formGroup}>
                <Text style={styles.helperBelow}>
                  1-day event ending {formatDate((() => { const end = new Date(startDate); end.setUTCDate(end.getUTCDate() + EVENT_DURATION_DAYS); return end; })())}
                </Text>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createButton, (!isValid || isSubmitting) && styles.createButtonDisabled]}
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { fontSize: 20, color: theme.colors.text },
  title: { fontSize: 18, fontWeight: theme.typography.weights.semiBold, color: '#FFB366' },
  headerSpacer: { width: 32 },
  keyboardView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  formGroup: { marginBottom: 16 },
  label: {
    fontSize: 14, fontWeight: theme.typography.weights.medium,
    color: '#FFB366', marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.card, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 16,
    color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border,
  },
  textArea: { minHeight: 72, paddingTop: 10 },
  helperBelow: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  templateRow: { gap: 10 },
  templateButton: {
    paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: theme.colors.card, borderWidth: 1.5,
    borderColor: theme.colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  templateButtonSelected: {
    backgroundColor: 'rgba(255, 123, 28, 0.12)',
    borderColor: theme.colors.accent,
  },
  templateLabel: {
    fontSize: 20, fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  templateLabelSelected: { color: theme.colors.accent },
  templateSubtitle: {
    fontSize: 14, color: theme.colors.textMuted,
  },
  templateSubtitleSelected: { color: theme.colors.textSecondary },
  buttonRow: { flexDirection: 'row', gap: 8 },
  optionButton: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: theme.colors.card, borderWidth: 1,
    borderColor: theme.colors.border, alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 14, fontWeight: theme.typography.weights.medium, color: theme.colors.text,
  },
  selectedButton: { backgroundColor: '#FFB366', borderColor: '#FFB366' },
  selectedText: { color: theme.colors.background },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  createButton: {
    backgroundColor: '#FFB366', borderRadius: 8, paddingVertical: 14, alignItems: 'center',
  },
  createButtonDisabled: { opacity: 0.5 },
  createButtonText: {
    fontSize: 16, fontWeight: theme.typography.weights.semiBold, color: theme.colors.background,
  },
});

export default SimpleEventCreationModal;
