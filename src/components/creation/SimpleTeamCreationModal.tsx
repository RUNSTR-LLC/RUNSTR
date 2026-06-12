/**
 * SimpleTeamCreationModal - Team creation form for subscribers
 * Inserts into Supabase user_teams table
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { CustomAlert } from '../ui/CustomAlert';
import { isSupabaseConfigured } from '../../utils/supabase';
import { callEdgeFunction } from '../../utils/edgeFunctions';
import { ClubWalletService } from '../../services/club/ClubWalletService';
import { pickBannerImage, uploadBannerImage } from '../../services/club/ClubBannerStorageService';
import { isValidLightningAddress } from '../../utils/lnurl';

interface SimpleTeamCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onTeamCreated?: (teamId: string) => void;
}


export const SimpleTeamCreationModal: React.FC<SimpleTeamCreationModalProps> = ({
  visible,
  onClose,
  onTeamCreated,
}) => {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const resetForm = useCallback(() => {
    setTeamName('');
    setDescription('');
    setLightningAddress('');
    setBannerUri(null);
  }, []);

  const handlePickBanner = useCallback(async () => {
    const result = await pickBannerImage();
    if (result.cancelled) return;
    if (result.error || !result.uri) {
      setAlertTitle('Upload Failed');
      setAlertMessage(result.error || 'Could not pick image.');
      setAlertVisible(true);
      return;
    }
    setBannerUri(result.uri);
  }, []);

  const handleRemoveBanner = useCallback(() => {
    setBannerUri(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const isValid =
    teamName.trim().length > 0 &&
    (!lightningAddress.trim() || isValidLightningAddress(lightningAddress));

  const handleCreate = useCallback(async () => {
    if (isSubmittingRef.current) return; // Synchronous check prevents double-submit
    if (!isValid) return;
    if (!isSupabaseConfigured()) {
      setAlertTitle('Error');
      setAlertMessage('Backend not configured');
      setAlertVisible(true);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!npub) {
        setAlertTitle('Error');
        setAlertMessage('Please log in first');
        setAlertVisible(true);
        return;
      }

      // Create club via Edge Function (handles duplicate name check, membership, member_count)
      const result = await callEdgeFunction<{ id?: string }>('manage-club', {
        action: 'create-club',
        npub,
        name: teamName.trim(),
        description: description.trim() || null,
        lightning_address: lightningAddress.trim() || null,
      });

      if (!result.success) {
        console.error('[SimpleTeamCreation] Create error:', result.error);
        setAlertTitle('Error');
        setAlertMessage(result.error || 'Failed to create club');
        setAlertVisible(true);
        return;
      }

      const teamId = (result.data as any)?.id || '';
      console.log(`[SimpleTeamCreation] Created team: ${teamId}`);

      // Upload banner (if picked) and set it on the new club. Non-fatal — the
      // club still exists if the upload fails; captain can retry from settings.
      if (teamId && bannerUri) {
        try {
          const uploadResult = await uploadBannerImage(bannerUri, teamId);
          if (uploadResult.success && uploadResult.url) {
            await callEdgeFunction('manage-club', {
              action: 'update-club',
              npub,
              club_id: teamId,
              updates: { banner_url: uploadResult.url },
            });
          } else {
            console.warn('[SimpleTeamCreation] Banner upload failed:', uploadResult.error);
          }
        } catch (bannerErr) {
          console.warn('[SimpleTeamCreation] Banner upload exception:', bannerErr);
        }
      }

      // Cache club state locally
      if (teamId) {
        try {
          await AsyncStorage.setItem('@runstr:club_id', teamId);
          await AsyncStorage.setItem('@runstr:club_name', teamName.trim());
          await AsyncStorage.setItem('@runstr:club_role', 'captain');
        } catch { /* non-critical */ }

        // Create CoinOS wallet for the club's rewards pool (fire-and-forget)
        ClubWalletService.createWallet(teamId)
          .then(walletResult => {
            if (walletResult.success) {
              console.log(`[SimpleTeamCreation] Club wallet created: ${walletResult.lightning_address}`);
            } else {
              console.error(`[SimpleTeamCreation] Club wallet creation failed: ${walletResult.error}`);
            }
          })
          .catch(err => console.error('[SimpleTeamCreation] Club wallet error:', err));
      }

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
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isValid, teamName, description, lightningAddress, bannerUri, onTeamCreated]);

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
                maxLength={500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Banner Image */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Banner Image (optional)</Text>
              {bannerUri ? (
                <View style={styles.bannerPreview}>
                  <Image source={{ uri: bannerUri }} style={styles.bannerPreviewImage} />
                  <View style={styles.bannerPreviewActions}>
                    <TouchableOpacity
                      style={styles.bannerActionBtn}
                      onPress={handlePickBanner}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="image-outline" size={16} color={theme.colors.text} />
                      <Text style={styles.bannerActionText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.bannerActionBtn}
                      onPress={handleRemoveBanner}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                      <Text style={[styles.bannerActionText, { color: theme.colors.error }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.bannerUploadButton}
                  onPress={handlePickBanner}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.textMuted} />
                  <Text style={styles.bannerUploadText}>Upload banner image</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.helper}>Shown on your club page. Max 5 MB.</Text>
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
    color: theme.colors.text,
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
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.text,
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
  bannerPreview: {
    borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border,
    overflow: 'hidden', backgroundColor: theme.colors.card,
  },
  bannerPreviewImage: {
    width: '100%', aspectRatio: 16 / 9, resizeMode: 'cover',
  },
  bannerPreviewActions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  bannerActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  bannerActionText: {
    fontSize: 13, fontWeight: theme.typography.weights.medium, color: theme.colors.text,
  },
  bannerUploadButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.card, borderRadius: 8, paddingVertical: 22,
    borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed',
  },
  bannerUploadText: {
    fontSize: 14, fontWeight: theme.typography.weights.medium, color: theme.colors.textMuted,
  },
});

export default SimpleTeamCreationModal;
