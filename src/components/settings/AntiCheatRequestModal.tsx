/**
 * AntiCheatRequestModal - Request cheating verification for a suspected user
 *
 * Form collects:
 * - Suspect's npub/name (required)
 * - Competition name (optional)
 * - Reason/context (optional)
 * - Contact method (Nostr DM or email)
 *
 * On submit: publishes kind 21301 event, opens payment URL
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  publishAntiCheatRequest,
  getAntiCheatPriceDisplay,
  type ContactMethod,
} from '../../services/anticheat/AntiCheatRequestService';
import { ANTICHEAT_PAYMENT_URL } from '../../constants/anticheat';

interface AntiCheatRequestModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AntiCheatRequestModal: React.FC<AntiCheatRequestModalProps> = ({
  visible,
  onClose,
}) => {
  // Form state
  const [suspectIdentifier, setSuspectIdentifier] = useState('');
  const [competition, setCompetition] = useState('');
  const [reason, setReason] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('nostr_dm');
  const [email, setEmail] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setSuspectIdentifier('');
    setCompetition('');
    setReason('');
    setContactMethod('nostr_dm');
    setEmail('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = (): string | null => {
    if (!suspectIdentifier.trim()) {
      return 'Please enter the suspect\'s npub or name';
    }
    if (contactMethod === 'email' && !email.trim()) {
      return 'Please enter your email address';
    }
    if (contactMethod === 'email' && !email.includes('@')) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const handleSubmit = async () => {
    // Validate
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await publishAntiCheatRequest({
        suspectIdentifier: suspectIdentifier.trim(),
        competition: competition.trim() || undefined,
        reason: reason.trim() || undefined,
        contactMethod,
        email: contactMethod === 'email' ? email.trim() : undefined,
      });

      if (!result.success) {
        setError(result.error || 'Failed to submit request');
        setIsSubmitting(false);
        return;
      }

      // Success - open payment URL
      setSuccess(true);
      setTimeout(async () => {
        try {
          await Linking.openURL(ANTICHEAT_PAYMENT_URL);
        } catch (e) {
          console.error('Failed to open payment URL:', e);
        }
        handleClose();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Anti-Cheat Verification</Text>
            <View style={styles.closeButton} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Service info */}
            <View style={styles.serviceInfo}>
              <Ionicons name="shield-checkmark" size={40} color={theme.colors.primary} />
              <Text style={styles.serviceTitle}>Manual Verification Service</Text>
              <Text style={styles.servicePrice}>{getAntiCheatPriceDisplay()}</Text>

              <View style={styles.serviceBullets}>
                <Text style={styles.bulletPoint}>
                  Our team manually investigates suspected cheaters within 24-48 hours
                </Text>
                <Text style={styles.bulletPoint}>
                  We check for fake workouts, duplicate posts, and scripted activity
                </Text>
                <Text style={styles.bulletPoint}>
                  Results sent via your preferred contact method
                </Text>
                <Text style={styles.bulletPoint}>
                  If cheating confirmed, you can request removal from the event
                </Text>
              </View>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Suspect identifier */}
              <Text style={styles.label}>Who do you want to verify? *</Text>
              <TextInput
                style={styles.input}
                placeholder="npub1... or display name"
                placeholderTextColor={theme.colors.textSecondary}
                value={suspectIdentifier}
                onChangeText={setSuspectIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Event */}
              <Text style={styles.label}>Event (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Season 2 Walking"
                placeholderTextColor={theme.colors.textSecondary}
                value={competition}
                onChangeText={setCompetition}
              />

              {/* Reason */}
              <Text style={styles.label}>Why are you suspicious? (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what looks unusual..."
                placeholderTextColor={theme.colors.textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Contact method */}
              <Text style={styles.label}>How should we send results?</Text>
              <View style={styles.contactOptions}>
                <TouchableOpacity
                  style={[
                    styles.contactOption,
                    contactMethod === 'nostr_dm' && styles.contactOptionSelected,
                  ]}
                  onPress={() => setContactMethod('nostr_dm')}
                >
                  <Ionicons
                    name="chatbubble"
                    size={20}
                    color={contactMethod === 'nostr_dm' ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.contactOptionText,
                      contactMethod === 'nostr_dm' && styles.contactOptionTextSelected,
                    ]}
                  >
                    Direct Message
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contactOption,
                    contactMethod === 'email' && styles.contactOptionSelected,
                  ]}
                  onPress={() => setContactMethod('email')}
                >
                  <Ionicons
                    name="mail"
                    size={20}
                    color={contactMethod === 'email' ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.contactOptionText,
                      contactMethod === 'email' && styles.contactOptionTextSelected,
                    ]}
                  >
                    Email
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Email input (conditional) */}
              {contactMethod === 'email' && (
                <>
                  <Text style={styles.label}>Your email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              )}
            </View>

            {/* Error message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Success message */}
            {success && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={styles.successText}>Request submitted! Opening payment...</Text>
              </View>
            )}
          </ScrollView>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || success}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.background} />
                <Text style={styles.submitButtonText}>
                  Submit Request
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  content: {
    padding: 16,
  },
  serviceInfo: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
  },
  servicePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 4,
  },
  serviceBullets: {
    marginTop: 16,
    gap: 10,
  },
  bulletPoint: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  contactOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  contactOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contactOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}20`,
  },
  contactOptionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  contactOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: `${theme.colors.error}20`,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: `${theme.colors.success}20`,
    borderRadius: 8,
    marginTop: 12,
  },
  successText: {
    fontSize: 14,
    color: theme.colors.success,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
});
