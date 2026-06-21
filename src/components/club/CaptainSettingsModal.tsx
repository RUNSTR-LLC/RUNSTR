/**
 * CaptainSettingsModal - Settings panel for club captains
 *
 * Lets captains edit club details (description, lightning address, banner),
 * remove members, and transfer captainship.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { CustomAlert } from '../ui/CustomAlert';
import { ClubService } from '../../services/backend/ClubService';
import { ClubMembershipService } from '../../services/backend/ClubMembershipService';
import { pickAndUploadClubBanner } from '../../services/club/ClubBannerStorageService';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import { Avatar } from '../ui/Avatar';
import type { Club, ClubMembership } from '../../types/club';

interface CaptainSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  club: Club;
  userNpub: string;
  onClubUpdated?: () => void;
}

function isValidLightningAddress(addr: string): boolean {
  if (!addr) return true;
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(addr);
}

export const CaptainSettingsModal: React.FC<CaptainSettingsModalProps> = ({
  visible, onClose, club, userNpub, onClubUpdated,
}) => {
  const [description, setDescription] = useState(club.description || '');
  const [lightningAddress, setLightningAddress] = useState(club.lightning_address || '');
  const [bannerUrl, setBannerUrl] = useState(club.banner_url || '');
  const [leaderboardMetric, setLeaderboardMetric] = useState<'distance' | 'steps'>(club.leaderboard_metric || 'distance');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [members, setMembers] = useState<ClubMembership[]>([]);
  const [profiles, setProfiles] = useState<Map<string, NostrProfile>>(new Map());
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [removingNpub, setRemovingNpub] = useState<string | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (visible && !isSaving) {
      setDescription(club.description || '');
      setLightningAddress(club.lightning_address || '');
      setBannerUrl(club.banner_url || '');
      setLeaderboardMetric(club.leaderboard_metric || 'distance');
      loadMembers();
    }
  }, [visible, club]);

  const loadMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      await ClubMembershipService.clearCache();
      const data = await ClubMembershipService.getClubMembers(club.id);
      setMembers(data);

      // Fetch Nostr profiles for all members
      if (data.length > 0) {
        const npubs = data.map((m) => m.member_npub);
        const fetchedProfiles = await nostrProfileService.getProfiles(npubs);
        setProfiles(fetchedProfiles);
      }
    } catch (err) {
      console.error('[CaptainSettingsModal] Error loading members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [club.id]);

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handlePickBanner = useCallback(async () => {
    if (isUploadingBanner) return;
    setIsUploadingBanner(true);
    try {
      const result = await pickAndUploadClubBanner(club.id);
      if (result.cancelled) return;
      if (!result.success || !result.url) {
        showAlert('Upload Failed', result.error || 'Could not upload banner.');
        return;
      }
      setBannerUrl(result.url);
    } finally {
      setIsUploadingBanner(false);
    }
  }, [club.id, isUploadingBanner]);

  const handleRemoveBanner = useCallback(() => {
    setBannerUrl('');
  }, []);

  const handleSaveDetails = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updates: { description?: string; lightning_address?: string; banner_url?: string; leaderboard_metric?: string } = {};
      const newDesc = description.trim() || null;
      const newLn = lightningAddress.trim() || null;
      const newBanner = bannerUrl.trim() || null;

      if (newDesc !== (club.description || null)) updates.description = newDesc || '';
      if (newLn !== (club.lightning_address || null)) updates.lightning_address = newLn || '';
      if (newBanner !== (club.banner_url || null)) updates.banner_url = newBanner || '';
      if (leaderboardMetric !== (club.leaderboard_metric || 'distance')) updates.leaderboard_metric = leaderboardMetric;

      if (Object.keys(updates).length === 0) {
        showAlert('No Changes', 'Nothing to save.');
        return;
      }
      if (updates.lightning_address && !isValidLightningAddress(updates.lightning_address)) {
        showAlert('Invalid Address', 'Please enter a valid Lightning address (e.g., name@wallet.com).');
        return;
      }

      const success = await ClubService.updateClub(club.id, updates, userNpub);
      if (success) {
        showAlert('Saved', 'Club settings updated successfully.');
        onClubUpdated?.();
      } else {
        showAlert('Error', 'Failed to save changes. Please try again.');
      }
    } catch (err) {
      console.error('[CaptainSettingsModal] Save error:', err);
      showAlert('Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, description, lightningAddress, bannerUrl, leaderboardMetric, club, userNpub, onClubUpdated]);

  const getDisplayName = useCallback((npub: string) => {
    const profile = profiles.get(npub);
    return profile?.display_name || profile?.name || npub.slice(0, 8) + '...';
  }, [profiles]);

  const handleRemoveMember = useCallback((member: ClubMembership) => {
    const npub = member.member_npub;
    const name = getDisplayName(npub);
    Alert.alert('Remove Member', `Remove ${name} from the club?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setRemovingNpub(npub);
          try {
            const result = await ClubMembershipService.removeMember(club.id, npub, userNpub);
            if (result.success) {
              setMembers((prev) => prev.filter((m) => m.member_npub !== npub));
              onClubUpdated?.();
            } else {
              showAlert('Error', result.error || 'Failed to remove member.');
            }
          } catch (err) {
            console.error('[CaptainSettingsModal] Remove error:', err);
            showAlert('Error', 'Something went wrong. Please try again.');
          } finally {
            setRemovingNpub(null);
          }
        },
      },
    ]);
  }, [club.id, getDisplayName, onClubUpdated]);

  const handleTransferCaptainship = useCallback((member: ClubMembership) => {
    const npub = member.member_npub;
    const name = getDisplayName(npub);
    Alert.alert(
      'Transfer Captainship',
      `Make ${name} the new captain?\n\nYou will become a regular member.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer', style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const result = await ClubMembershipService.transferCaptainship(club.id, npub, userNpub);
              if (result.success) {
                showAlert('Captainship Transferred', `${name} is now the captain.`);
                onClubUpdated?.();
              } else {
                showAlert('Error', result.error || 'Failed to transfer captainship.');
              }
            } catch (err) {
              console.error('[CaptainSettingsModal] Transfer error:', err);
              showAlert('Error', 'Something went wrong. Please try again.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  }, [club.id, getDisplayName, onClubUpdated]);

  const handleAlertDismiss = useCallback(() => {
    setAlertVisible(false);
    if (alertTitle === 'Saved' || alertTitle === 'Captainship Transferred' || alertTitle === 'No Changes') onClose();
  }, [alertTitle, onClose]);

  const removableMembers = members.filter((m) => m.member_npub !== userNpub);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Captain Settings</Text>
          <View style={s.headerSpacer} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
          <ScrollView style={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.sectionLabel}>CLUB DETAILS</Text>

            <View style={s.formGroup}>
              <Text style={s.label}>Description</Text>
              <TextInput
                style={[s.textInput, s.textArea]} value={description} onChangeText={setDescription}
                placeholder="Tell people about your club..." placeholderTextColor={theme.colors.textMuted}
                maxLength={500} multiline numberOfLines={3} textAlignVertical="top"
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Wallet Address</Text>
              <TextInput
                style={s.textInput} value={lightningAddress} onChangeText={setLightningAddress}
                placeholder="e.g., club@getalby.com" placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              />
              {lightningAddress.length > 0 && !isValidLightningAddress(lightningAddress) && (
                <Text style={s.errorHelper}>Invalid wallet address format</Text>
              )}
              <Text style={s.helper}>10-sat workout rewards are sent to this address</Text>
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Banner Image</Text>
              {bannerUrl ? (
                <View style={s.bannerPreview}>
                  <Image source={{ uri: bannerUrl }} style={s.bannerPreviewImage} />
                  <View style={s.bannerPreviewActions}>
                    <TouchableOpacity
                      style={[s.bannerActionBtn, isUploadingBanner && s.disabled]}
                      onPress={handlePickBanner}
                      disabled={isUploadingBanner}
                      activeOpacity={0.7}
                    >
                      {isUploadingBanner ? (
                        <ActivityIndicator size="small" color={theme.colors.text} />
                      ) : (
                        <>
                          <Ionicons name="image-outline" size={16} color={theme.colors.text} />
                          <Text style={s.bannerActionText}>Replace</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.bannerActionBtn}
                      onPress={handleRemoveBanner}
                      disabled={isUploadingBanner}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                      <Text style={[s.bannerActionText, { color: theme.colors.error }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.bannerUploadButton, isUploadingBanner && s.disabled]}
                  onPress={handlePickBanner}
                  disabled={isUploadingBanner}
                  activeOpacity={0.7}
                >
                  {isUploadingBanner ? (
                    <ActivityIndicator color={theme.colors.textMuted} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.textMuted} />
                      <Text style={s.bannerUploadText}>Upload banner image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <Text style={s.helper}>Displayed at the top of your club page. Max 5 MB.</Text>
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Leaderboard Type</Text>
              <View style={s.toggleRow}>
                <TouchableOpacity
                  style={[s.toggleOption, leaderboardMetric === 'distance' && s.toggleOptionActive]}
                  onPress={() => setLeaderboardMetric('distance')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="speedometer-outline" size={16} color={leaderboardMetric === 'distance' ? theme.colors.background : theme.colors.textMuted} />
                  <Text style={[s.toggleOptionText, leaderboardMetric === 'distance' && s.toggleOptionTextActive]}>Distance + Time</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleOption, leaderboardMetric === 'steps' && s.toggleOptionActive]}
                  onPress={() => setLeaderboardMetric('steps')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="footsteps-outline" size={16} color={leaderboardMetric === 'steps' ? theme.colors.background : theme.colors.textMuted} />
                  <Text style={[s.toggleOptionText, leaderboardMetric === 'steps' && s.toggleOptionTextActive]}>Step Count</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.helper}>Choose how the daily leaderboard ranks members</Text>
            </View>

            <TouchableOpacity
              style={[s.saveButton, isSaving && s.disabled]} onPress={handleSaveDetails}
              disabled={isSaving} activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={s.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <Text style={[s.sectionLabel, { marginTop: 28 }]}>MEMBERS</Text>

            {isLoadingMembers ? (
              <View style={s.centered}><ActivityIndicator color={theme.colors.textMuted} /></View>
            ) : removableMembers.length === 0 ? (
              <View style={s.centered}>
                <Ionicons name="people-outline" size={32} color={theme.colors.textMuted} />
                <Text style={s.emptyText}>No other members to manage</Text>
              </View>
            ) : (
              <View style={s.membersList}>
                {removableMembers.map((member) => {
                  const profile = profiles.get(member.member_npub);
                  const displayName = profile?.display_name || profile?.name || member.member_npub.slice(0, 8) + '...';
                  const isRemoving = removingNpub === member.member_npub;
                  return (
                    <View key={member.id} style={s.memberRow}>
                      <View style={s.memberInfo}>
                        <Avatar name={displayName} size={36} imageUrl={profile?.picture} />
                        <Text style={s.memberName}>{displayName}</Text>
                      </View>
                      <View style={s.memberActions}>
                        <TouchableOpacity
                          style={s.transferBtn} onPress={() => handleTransferCaptainship(member)}
                          disabled={isSaving} activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="star-outline" size={16} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.removeBtn} onPress={() => handleRemoveMember(member)}
                          disabled={isRemoving || isSaving} activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {isRemoving ? (
                            <ActivityIndicator size="small" color={theme.colors.error} />
                          ) : (
                            <Ionicons name="person-remove-outline" size={16} color={theme.colors.error} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={s.legend}>
              <View style={s.legendItem}>
                <Ionicons name="star-outline" size={14} color={theme.colors.text} />
                <Text style={s.legendText}>Make captain</Text>
              </View>
              <View style={s.legendItem}>
                <Ionicons name="person-remove-outline" size={14} color={theme.colors.error} />
                <Text style={s.legendText}>Remove member</Text>
              </View>
            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <CustomAlert
          visible={alertVisible} title={alertTitle} message={alertMessage}
          buttons={[{ text: 'OK', style: 'default', onPress: handleAlertDismiss }]}
          onClose={handleAlertDismiss}
        />
      </SafeAreaView>
    </Modal>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: theme.typography.weights.semiBold, color: theme.colors.text },
  headerSpacer: { width: 32 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontSize: 12, fontWeight: theme.typography.weights.bold, color: theme.colors.textMuted,
    letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase',
  },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: theme.typography.weights.medium, color: theme.colors.text, marginBottom: 8 },
  textInput: {
    backgroundColor: theme.colors.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 16, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  helper: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  errorHelper: { fontSize: 12, color: theme.colors.error, marginTop: 4 },
  saveButton: { backgroundColor: theme.colors.text, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  disabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 16, fontWeight: theme.typography.weights.semiBold, color: theme.colors.background },
  centered: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 8 },
  membersList: { gap: 1 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.cardBackground, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  memberName: { fontSize: 14, color: theme.colors.text, fontWeight: theme.typography.weights.medium },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  transferBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    borderColor: theme.colors.text, alignItems: 'center', justifyContent: 'center',
  },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    borderColor: theme.colors.error, alignItems: 'center', justifyContent: 'center',
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
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  toggleOptionActive: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  toggleOptionText: { fontSize: 13, fontWeight: theme.typography.weights.medium, color: theme.colors.textMuted },
  toggleOptionTextActive: { color: theme.colors.background },
  legend: { flexDirection: 'row', gap: 20, marginTop: 8, paddingLeft: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11, color: theme.colors.textMuted },
});

export default CaptainSettingsModal;
