/**
 * SimpleTeamCreationModal - Team creation form for subscribers
 * Inserts into Supabase user_teams table
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

interface SimpleTeamCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onTeamCreated?: (teamId: string) => void;
}

function isValidLightningAddress(address: string): boolean {
  if (!address) return true; // Optional field
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(address);
}

export const SimpleTeamCreationModal: React.FC<SimpleTeamCreationModalProps> = ({
  visible,
  onClose,
  onTeamCreated,
}) => {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const resetForm = useCallback(() => {
    setTeamName('');
    setDescription('');
    setLightningAddress('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const isValid =
    teamName.trim().length > 0 &&
    isValidLightningAddress(lightningAddress);

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

      const { data, error } = await supabase!.from('user_teams').insert({
        name: teamName.trim(),
        description: description.trim() || null,
        lightning_address: lightningAddress.trim() || null,
        created_by_npub: npub,
      }).select('id').single();

      if (error) {
        console.error('[SimpleTeamCreation] Insert error:', error);
        setAlertTitle('Error');
        setAlertMessage(error.message);
        setAlertVisible(true);
        setIsSubmitting(false);
        return;
      }

      const teamId = data?.id || '';
      console.log(`[SimpleTeamCreation] Created team: ${teamId}`);
      setAlertTitle('Team Created!');
      setAlertMessage('Your team is now live in the RUNSTR directory.');
      setAlertVisible(true);
      onTeamCreated?.(teamId);
    } catch (err) {
      console.error('[SimpleTeamCreation] Exception:', err);
      setAlertTitle('Error');
      setAlertMessage(err instanceof Error ? err.message : 'Unknown error');
      setAlertVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, teamName, description, lightningAddress, onTeamCreated]);

  const handleAlertDismiss = useCallback(() => {
    setAlertVisible(false);
    if (alertTitle === 'Team Created!') {
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
          <Text style={styles.title}>Create Team</Text>
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
            {/* Team Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Team Name</Text>
              <TextInput
                style={styles.textInput}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="e.g., Austin Runners Club"
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
                placeholder="Tell people about your team..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Lightning Address */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Lightning Address (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={lightningAddress}
                onChangeText={setLightningAddress}
                placeholder="e.g., team@getalby.com"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {lightningAddress.length > 0 && !isValidLightningAddress(lightningAddress) && (
                <Text style={styles.errorHelper}>Invalid Lightning address format</Text>
              )}
              <Text style={styles.helper}>
                Users can zap donations to this address
              </Text>
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
              <Text style={styles.createButtonText}>Create Team</Text>
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
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  errorHelper: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
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

export default SimpleTeamCreationModal;
