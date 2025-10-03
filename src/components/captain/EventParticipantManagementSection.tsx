/**
 * EventParticipantManagementSection - Manual participant management for events
 * Allows captains to add/remove participants directly from events
 * Uses kind 30000 Nostr lists with d-tag: event-${eventId}-participants
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { NostrListService } from '../../services/nostr/NostrListService';
import { getAuthenticationData } from '../../utils/nostrAuth';
import { nsecToPrivateKey } from '../../utils/nostr';
import { NDKPrivateKeySigner, NDKEvent } from '@nostr-dev-kit/ndk';
import { ZappableUserRow } from '../ui/ZappableUserRow';

interface EventParticipantManagementSectionProps {
  eventId: string;
  eventName: string;
  captainPubkey: string; // hex format
  style?: any;
  onParticipantUpdate?: () => void;
}

export const EventParticipantManagementSection: React.FC<
  EventParticipantManagementSectionProps
> = ({ eventId, eventName, captainPubkey, style, onParticipantUpdate }) => {
  const [participants, setParticipants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParticipantPubkey, setNewParticipantPubkey] = useState('');
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);

  const listService = NostrListService.getInstance();
  const dTag = `event-${eventId}-participants`;

  // Load participants on mount
  useEffect(() => {
    loadParticipants();
  }, [eventId, captainPubkey]);

  const loadParticipants = async () => {
    try {
      setIsLoading(true);
      const members = await listService.getListMembers(captainPubkey, dTag);
      setParticipants(members);
      console.log(`✅ Loaded ${members.length} participants for event ${eventId}`);
    } catch (error) {
      console.error('Failed to load participants:', error);
      setParticipants([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipantPubkey.trim()) {
      Alert.alert('Error', 'Please enter a valid npub or hex pubkey');
      return;
    }

    try {
      setIsAddingParticipant(true);

      // Get auth data for signing
      const authData = await getAuthenticationData();
      if (!authData?.nsec) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      // Get current participant list
      const currentList = await listService.getList(captainPubkey, dTag);

      if (!currentList) {
        // Create initial list if it doesn't exist
        const listData = {
          name: `${eventName} Participants`,
          description: `Participants for ${eventName}`,
          members: [newParticipantPubkey.trim()],
          dTag,
          listType: 'people' as const,
        };

        const eventTemplate = listService.prepareListCreation(listData, captainPubkey);

        // Sign and publish
        const g = globalThis as any;
        const ndk = g.__RUNSTR_NDK_INSTANCE__;
        const privateKeyHex = nsecToPrivateKey(authData.nsec);
        const signer = new NDKPrivateKeySigner(privateKeyHex);
        const ndkEvent = new NDKEvent(ndk, eventTemplate);
        await ndkEvent.sign(signer);
        await ndkEvent.publish();

        setParticipants([newParticipantPubkey.trim()]);
      } else {
        // Check if already a participant
        if (currentList.members.includes(newParticipantPubkey.trim())) {
          Alert.alert('Info', 'This user is already a participant');
          setIsAddingParticipant(false);
          return;
        }

        // Add to existing list
        const eventTemplate = listService.prepareAddMember(
          captainPubkey,
          dTag,
          newParticipantPubkey.trim(),
          currentList
        );

        if (eventTemplate) {
          // Sign and publish updated list
          const g = globalThis as any;
          const ndk = g.__RUNSTR_NDK_INSTANCE__;
          const privateKeyHex = nsecToPrivateKey(authData.nsec);
          const signer = new NDKPrivateKeySigner(privateKeyHex);
          const ndkEvent = new NDKEvent(ndk, eventTemplate);
          await ndkEvent.sign(signer);
          await ndkEvent.publish();

          // Update local state
          const updatedMembers = [...currentList.members, newParticipantPubkey.trim()];
          listService.updateCachedList(`${captainPubkey}:${dTag}`, updatedMembers);
          setParticipants(updatedMembers);
        }
      }

      setNewParticipantPubkey('');
      setShowAddModal(false);
      Alert.alert('Success', 'Participant added to event!');
      onParticipantUpdate?.();
    } catch (error) {
      console.error('Failed to add participant:', error);
      Alert.alert('Error', 'Failed to add participant. Please try again.');
    } finally {
      setIsAddingParticipant(false);
    }
  };

  const handleRemoveParticipant = async (participantPubkey: string) => {
    Alert.alert(
      'Remove Participant',
      'Are you sure you want to remove this participant from the event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get auth data
              const authData = await getAuthenticationData();
              if (!authData?.nsec) {
                Alert.alert('Error', 'Authentication required');
                return;
              }

              // Get current list
              const currentList = await listService.getList(captainPubkey, dTag);
              if (!currentList) {
                throw new Error('Participant list not found');
              }

              // Prepare removal
              const eventTemplate = listService.prepareRemoveMember(
                captainPubkey,
                dTag,
                participantPubkey,
                currentList
              );

              if (!eventTemplate) {
                console.log('Participant not in list');
                return;
              }

              // Sign and publish
              const g = globalThis as any;
              const ndk = g.__RUNSTR_NDK_INSTANCE__;
              const privateKeyHex = nsecToPrivateKey(authData.nsec);
              const signer = new NDKPrivateKeySigner(privateKeyHex);
              const ndkEvent = new NDKEvent(ndk, eventTemplate);
              await ndkEvent.sign(signer);
              await ndkEvent.publish();

              // Update local state
              const updatedMembers = currentList.members.filter(
                (m) => m !== participantPubkey
              );
              listService.updateCachedList(`${captainPubkey}:${dTag}`, updatedMembers);
              setParticipants(updatedMembers);

              Alert.alert('Success', 'Participant removed from event');
              onParticipantUpdate?.();
            } catch (error) {
              console.error('Failed to remove participant:', error);
              Alert.alert('Error', 'Failed to remove participant');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Participants</Text>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{participants.length}</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color={theme.colors.accentText} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.participantsList} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading participants...</Text>
          </View>
        ) : participants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No participants yet</Text>
            <Text style={styles.emptySubtext}>
              Add participants manually or approve join requests
            </Text>
          </View>
        ) : (
          participants.map((pubkey, index) => (
            <View key={pubkey} style={styles.participantItem}>
              <View style={styles.participantInfo}>
                <ZappableUserRow
                  npub={pubkey}
                  fallbackName={`Participant ${index + 1}`}
                  showQuickZap={false}
                  style={{ flex: 1 }}
                />
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveParticipant(pubkey)}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Participant Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Participant</Text>
            <Text style={styles.modalDescription}>
              Enter the npub or hex pubkey of the participant to add
            </Text>

            <TextInput
              style={styles.input}
              placeholder="npub1... or hex pubkey"
              placeholderTextColor={theme.colors.textMuted}
              value={newParticipantPubkey}
              onChangeText={setNewParticipantPubkey}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewParticipantPubkey('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.addModalButton,
                  isAddingParticipant && styles.disabledButton,
                ]}
                onPress={handleAddParticipant}
                disabled={isAddingParticipant}
              >
                <Text style={styles.addButtonText}>
                  {isAddingParticipant ? 'Adding...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countBadge: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: theme.colors.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantsList: {
    maxHeight: 300,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  participantInfo: {
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: 20,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addModalButton: {
    backgroundColor: theme.colors.accent,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
