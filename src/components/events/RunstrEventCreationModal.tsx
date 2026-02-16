/**
 * RunstrEventCreationModal - Single-page event creation wizard
 *
 * Compact modal for creating RUNSTR events with configurable
 * scoring, payouts, and join methods.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../styles/theme';
import { CustomAlert } from '../ui/CustomAlert';
import {
  useRunstrEventCreation,
  ACTIVITY_OPTIONS,
  SCORING_OPTIONS,
  DURATION_OPTIONS,
  PLEDGE_COST_OPTIONS,
  PLEDGE_DESTINATION_OPTIONS,
  PAYOUT_OPTIONS,
  DISTANCE_OPTIONS,
  IMPACT_TIER_OPTIONS,
} from '../../hooks/useRunstrEventCreation';
import { CHARITIES } from '../../constants/charities';
import ImageUploadService from '../../services/media/ImageUploadService';
import UnifiedSigningService from '../../services/auth/UnifiedSigningService';

interface RunstrEventCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated?: (eventId: string) => void;
}

export const RunstrEventCreationModal: React.FC<
  RunstrEventCreationModalProps
> = ({ visible, onClose, onEventCreated }) => {
  const {
    form,
    updateField,
    resetForm,
    isValid,
    validPayoutSchemes,
    isSubmitting,
    submitError,
    submitEvent,
    showDistanceInput,
    showDurationInput,
    showFixedPayoutInput,
  } = useRunstrEventCreation();

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Quick date options helper
  const getQuickDateOptions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // This weekend (next Saturday)
    const weekend = new Date(today);
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
    weekend.setDate(weekend.getDate() + daysUntilSaturday);

    return [
      { label: 'Today', date: today },
      { label: 'Tomorrow', date: tomorrow },
      { label: 'Weekend', date: weekend },
    ];
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    const result = await submitEvent();

    if (result.success) {
      setAlertTitle('Event Created!');
      setAlertMessage(
        'Your event has been published to Nostr. It will appear in the events feed shortly.'
      );
      setAlertVisible(true);
      onEventCreated?.(result.eventId || '');
    } else {
      setAlertTitle('Error');
      setAlertMessage(result.error || 'Failed to create event');
      setAlertVisible(true);
    }
  };

  const handleAlertDismiss = () => {
    setAlertVisible(false);
    if (alertTitle === 'Event Created!') {
      handleClose();
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setAlertTitle('Permission Required');
        setAlertMessage('Please allow access to your photo library to add a banner image.');
        setAlertVisible(true);
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Banner aspect ratio
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      setIsUploadingImage(true);

      // Get signer for NIP-98 auth
      const signingService = UnifiedSigningService.getInstance();
      const signer = await signingService.getSigner();

      if (!signer) {
        setAlertTitle('Error');
        setAlertMessage('Please log in to upload images');
        setAlertVisible(true);
        setIsUploadingImage(false);
        return;
      }

      // Upload image
      const uploadResult = await ImageUploadService.uploadImage(
        result.assets[0].uri,
        'event-banner.png',
        signer
      );

      if (uploadResult.success && uploadResult.url) {
        updateField('bannerImageUrl', uploadResult.url);
      } else {
        setAlertTitle('Upload Failed');
        setAlertMessage(uploadResult.error || 'Failed to upload image');
        setAlertVisible(true);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      setAlertTitle('Error');
      setAlertMessage('Failed to select image');
      setAlertVisible(true);
    } finally {
      setIsUploadingImage(false);
    }
  };

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
            <Text style={styles.closeButtonText}>✕</Text>
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
                value={form.title}
                onChangeText={(text) => updateField('title', text)}
                placeholder="e.g., New Year's 5K Challenge"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            {/* About / Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>About</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={form.description}
                onChangeText={(text) => updateField('description', text)}
                placeholder="Describe your event..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Location */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Location (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={form.location}
                onChangeText={(text) => updateField('location', text)}
                placeholder="e.g., Austin, TX or Virtual"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            {/* Event Banner Image */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Banner (optional)</Text>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handlePickImage}
                disabled={isUploadingImage}
                activeOpacity={0.7}
              >
                {isUploadingImage ? (
                  <View style={styles.imagePlaceholder}>
                    <ActivityIndicator color={theme.colors.primary} />
                    <Text style={styles.imagePlaceholderText}>Uploading...</Text>
                  </View>
                ) : form.bannerImageUrl ? (
                  <Image
                    source={{ uri: form.bannerImageUrl }}
                    style={styles.bannerPreview}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>+ Add Image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Start Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date</Text>
              <View style={styles.buttonRow}>
                {getQuickDateOptions().map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.optionButton,
                      form.startDate?.toDateString() === opt.date.toDateString() &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => updateField('startDate', opt.date)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        form.startDate?.toDateString() === opt.date.toDateString() &&
                          styles.optionButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {form.startDate && (
                <Text style={styles.helper}>
                  {form.startDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              )}
            </View>

            {/* Activity Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Activity</Text>
              <View style={styles.buttonRow}>
                {ACTIVITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      form.activityType === opt.value &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => updateField('activityType', opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        form.activityType === opt.value &&
                          styles.optionButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Scoring Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Scoring</Text>
              <View style={styles.buttonRow}>
                {SCORING_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      form.scoringType === opt.value &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => updateField('scoringType', opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        form.scoringType === opt.value &&
                          styles.optionButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target Distance (for fastest_time / Speed scoring) */}
            {showDistanceInput && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Distance</Text>
                <View style={styles.buttonRow}>
                  {DISTANCE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionButton,
                        form.targetDistance === opt.value &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => updateField('targetDistance', opt.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          form.targetDistance === opt.value &&
                            styles.optionButtonTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Duration (for most_distance / Distance scoring) */}
            {showDurationInput && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Duration</Text>
                <View style={styles.buttonRow}>
                  {DURATION_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionButton,
                        form.duration === opt.value &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => updateField('duration', opt.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          form.duration === opt.value &&
                            styles.optionButtonTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Entry Cost (Pledge) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Entry Cost (workouts)</Text>
              <View style={styles.buttonRow}>
                {PLEDGE_COST_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      form.pledgeCost === opt.value &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => updateField('pledgeCost', opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        form.pledgeCost === opt.value &&
                          styles.optionButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.helper}>
                Users commit next {form.pledgeCost} day{form.pledgeCost > 1 ? 's' : ''} of daily workout rewards ({form.pledgeCost * 50} sats) to join
              </Text>
            </View>

            {/* Pledge Destination - only show when Entry Cost > 0 */}
            {form.pledgeCost > 0 && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Rewards Go To</Text>
                <View style={styles.buttonRow}>
                  {PLEDGE_DESTINATION_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionButton,
                        form.pledgeDestination === opt.value &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => updateField('pledgeDestination', opt.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          form.pledgeDestination === opt.value &&
                            styles.optionButtonTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Team Selector - only show when destination is 'charity' */}
            {form.pledgeCost > 0 && form.pledgeDestination === 'charity' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Team</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {CHARITIES.map((charity) => (
                    <TouchableOpacity
                      key={charity.id}
                      style={[
                        styles.charityButton,
                        form.pledgeCharityId === charity.id &&
                          styles.charityButtonSelected,
                      ]}
                      onPress={() => updateField('pledgeCharityId', charity.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.charityButtonText,
                          form.pledgeCharityId === charity.id &&
                            styles.charityButtonTextSelected,
                        ]}
                      >
                        {charity.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Payout Scheme */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Payout</Text>
              <View style={styles.buttonRowWrap}>
                {PAYOUT_OPTIONS.filter((opt) =>
                  validPayoutSchemes.includes(opt.value)
                ).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButtonSmall,
                      form.payoutScheme === opt.value &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => updateField('payoutScheme', opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonTextSmall,
                        form.payoutScheme === opt.value &&
                          styles.optionButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Prize Pool */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Prize Pool (sats)</Text>
              <TextInput
                style={styles.textInput}
                value={form.prizePool}
                onChangeText={(text) => updateField('prizePool', text)}
                placeholder="e.g., 21000"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* Fixed Payout Amount (for fixed_amount scheme) */}
            {showFixedPayoutInput && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount Per Person (sats)</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.fixedPayout}
                  onChangeText={(text) => updateField('fixedPayout', text)}
                  placeholder="e.g., 1000"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Impact Level Requirement */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Require Impact Level?</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    !form.requireImpactLevel && styles.optionButtonSelected,
                  ]}
                  onPress={() => updateField('requireImpactLevel', false)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      !form.requireImpactLevel && styles.optionButtonTextSelected,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    form.requireImpactLevel && styles.optionButtonSelected,
                  ]}
                  onPress={() => updateField('requireImpactLevel', true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      form.requireImpactLevel && styles.optionButtonTextSelected,
                    ]}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Minimum Impact Level Tier (only shown if requireImpactLevel is true) */}
            {form.requireImpactLevel && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Minimum Impact Level</Text>
                <View style={styles.buttonRowWrap}>
                  {IMPACT_TIER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionButtonSmall,
                        form.minimumImpactTier === opt.value &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => {
                        updateField('minimumImpactTier', opt.value);
                        updateField('minimumImpactLevel', opt.level);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionButtonTextSmall,
                          form.minimumImpactTier === opt.value &&
                            styles.optionButtonTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Team Competition Toggle */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Team Competition</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    !form.isTeamCompetition && styles.optionButtonSelected,
                  ]}
                  onPress={() => updateField('isTeamCompetition', false)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      !form.isTeamCompetition && styles.optionButtonTextSelected,
                    ]}
                  >
                    Individual
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    form.isTeamCompetition && styles.optionButtonSelected,
                  ]}
                  onPress={() => updateField('isTeamCompetition', true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      form.isTeamCompetition && styles.optionButtonTextSelected,
                    ]}
                  >
                    Team
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helper}>
                {form.isTeamCompetition
                  ? 'Teams compete - scores aggregated by team'
                  : 'Individuals compete against each other'}
              </Text>
            </View>

            {/* Error display */}
            {submitError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            )}

            {/* Bottom padding for scroll */}
            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer with Create Button */}
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

        {/* Alert */}
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
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  imagePickerButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  bannerPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
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
  buttonRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  optionButtonSmall: {
    paddingVertical: 10,
    paddingHorizontal: 14,
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
  optionButtonTextSmall: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  optionButtonTextSelected: {
    color: theme.colors.background,
  },
  charityButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  charityButtonSelected: {
    backgroundColor: '#FFB366',
    borderColor: '#FFB366',
  },
  charityButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  charityButtonTextSelected: {
    color: theme.colors.background,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#FF6B00',
    fontSize: 14,
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

export default RunstrEventCreationModal;
