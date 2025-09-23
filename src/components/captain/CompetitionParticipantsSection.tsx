/**
 * CompetitionParticipantsSection - Captain component for managing competition participants
 * Shows pending join requests and approved participants when requireApproval is enabled
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import { ZappableUserRow } from '../ui/ZappableUserRow';
import NostrCompetitionParticipantService, {
  JoinRequest,
  CompetitionParticipantList,
} from '../../services/nostr/NostrCompetitionParticipantService';
import { getAuthenticationData } from '../../utils/nostrAuth';
import { nsecToPrivateKey } from '../../utils/nostr';

interface CompetitionParticipantsSectionProps {
  competitionId: string;
  competitionName: string;
  requireApproval: boolean;
  onParticipantUpdate?: () => void;
}

export const CompetitionParticipantsSection: React.FC<CompetitionParticipantsSectionProps> = ({
  competitionId,
  competitionName,
  requireApproval,
  onParticipantUpdate,
}) => {
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [participantList, setParticipantList] = useState<CompetitionParticipantList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Track which request is being processed
  const [expandedSection, setExpandedSection] = useState<'pending' | 'approved' | null>(null);

  const participantService = NostrCompetitionParticipantService.getInstance();

  useEffect(() => {
    loadParticipantData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadParticipantData, 30000);
    return () => clearInterval(interval);
  }, [competitionId]);

  const loadParticipantData = async () => {
    try {
      setIsLoading(true);

      // Load participant list
      const list = await participantService.getParticipantList(competitionId);
      setParticipantList(list);

      // Load pending requests if approval is required
      if (requireApproval) {
        const requests = await participantService.getPendingJoinRequests(competitionId);
        setPendingRequests(requests);
      }
    } catch (error) {
      console.error('Error loading participant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (request: JoinRequest) => {
    setIsProcessing(request.id);

    try {
      // Get authentication data
      const authData = await getAuthenticationData();
      if (!authData || !authData.nsec) {
        Alert.alert('Error', 'Authentication required. Please log in again.');
        return;
      }

      const privateKeyHex = nsecToPrivateKey(authData.nsec);

      // Approve the participant
      const result = await participantService.approveParticipant(
        competitionId,
        request.userHexPubkey,
        privateKeyHex
      );

      if (result.success) {
        Alert.alert('Success', `${request.userName || 'User'} has been approved!`);
        // Refresh data
        await loadParticipantData();
        onParticipantUpdate?.();
      } else {
        throw new Error(result.error || 'Failed to approve participant');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to approve participant. Please try again.');
      console.error('Error approving participant:', error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectRequest = async (request: JoinRequest) => {
    setIsProcessing(request.id);

    try {
      // Get authentication data
      const authData = await getAuthenticationData();
      if (!authData || !authData.nsec) {
        Alert.alert('Error', 'Authentication required. Please log in again.');
        return;
      }

      const privateKeyHex = nsecToPrivateKey(authData.nsec);

      // Reject the participant
      const result = await participantService.rejectParticipant(
        competitionId,
        request.userHexPubkey,
        privateKeyHex
      );

      if (result.success) {
        Alert.alert('Success', `Request from ${request.userName || 'User'} has been rejected.`);
        // Refresh data
        await loadParticipantData();
        onParticipantUpdate?.();
      } else {
        throw new Error(result.error || 'Failed to reject participant');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject participant. Please try again.');
      console.error('Error rejecting participant:', error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRemoveParticipant = async (participantPubkey: string, participantName?: string) => {
    Alert.alert(
      'Remove Participant',
      `Are you sure you want to remove ${participantName || 'this participant'} from the competition?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(participantPubkey);

            try {
              const authData = await getAuthenticationData();
              if (!authData || !authData.nsec) {
                Alert.alert('Error', 'Authentication required. Please log in again.');
                return;
              }

              const privateKeyHex = nsecToPrivateKey(authData.nsec);

              const result = await participantService.removeParticipant(
                competitionId,
                participantPubkey,
                privateKeyHex
              );

              if (result.success) {
                Alert.alert('Success', `${participantName || 'Participant'} has been removed.`);
                await loadParticipantData();
                onParticipantUpdate?.();
              } else {
                throw new Error(result.error || 'Failed to remove participant');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove participant. Please try again.');
              console.error('Error removing participant:', error);
            } finally {
              setIsProcessing(null);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Loading participants...</Text>
      </View>
    );
  }

  const approvedParticipants = participantList?.participants.filter(p => p.status === 'approved') || [];
  const hasPendingRequests = pendingRequests.length > 0;
  const hasApprovedParticipants = approvedParticipants.length > 0;

  if (!requireApproval && !hasApprovedParticipants) {
    return null; // Don't show section if no approval required and no participants
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Competition Participants</Text>
      <Text style={styles.competitionName}>{competitionName}</Text>

      {/* Pending Requests Section */}
      {requireApproval && hasPendingRequests && (
        <View style={styles.subsection}>
          <TouchableOpacity
            style={styles.subsectionHeader}
            onPress={() => setExpandedSection(expandedSection === 'pending' ? null : 'pending')}
            activeOpacity={0.7}
          >
            <View style={styles.subsectionTitleRow}>
              <Text style={styles.subsectionTitle}>Pending Requests</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            </View>
            <Text style={styles.expandIcon}>
              {expandedSection === 'pending' ? '−' : '+'}
            </Text>
          </TouchableOpacity>

          {expandedSection === 'pending' && (
            <View style={styles.requestsList}>
              {pendingRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>
                      {request.userName || 'Unknown User'}
                    </Text>
                    {request.message && (
                      <Text style={styles.requestMessage}>{request.message}</Text>
                    )}
                    <Text style={styles.requestTime}>
                      {new Date(request.requestedAt * 1000).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApproveRequest(request)}
                      disabled={isProcessing === request.id}
                      activeOpacity={0.7}
                    >
                      {isProcessing === request.id ? (
                        <ActivityIndicator size="small" color={theme.colors.text} />
                      ) : (
                        <Text style={styles.actionButtonText}>Approve</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRejectRequest(request)}
                      disabled={isProcessing === request.id}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Approved Participants Section */}
      {hasApprovedParticipants && (
        <View style={styles.subsection}>
          <TouchableOpacity
            style={styles.subsectionHeader}
            onPress={() => setExpandedSection(expandedSection === 'approved' ? null : 'approved')}
            activeOpacity={0.7}
          >
            <View style={styles.subsectionTitleRow}>
              <Text style={styles.subsectionTitle}>Approved Participants</Text>
              <Text style={styles.participantCount}>{approvedParticipants.length}</Text>
            </View>
            <Text style={styles.expandIcon}>
              {expandedSection === 'approved' ? '−' : '+'}
            </Text>
          </TouchableOpacity>

          {expandedSection === 'approved' && (
            <ScrollView style={styles.participantsList}>
              {approvedParticipants.map((participant) => (
                <View key={participant.hexPubkey} style={styles.participantItem}>
                  <ZappableUserRow
                    userNpub={participant.npub || ''}
                    userName={participant.name || 'Unknown'}
                    userAvatar={participant.avatar}
                    lastSeen={new Date(participant.joinedAt).toISOString()}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveParticipant(participant.hexPubkey, participant.name)}
                    disabled={isProcessing === participant.hexPubkey}
                    activeOpacity={0.7}
                  >
                    {isProcessing === participant.hexPubkey ? (
                      <ActivityIndicator size="small" color={theme.colors.error} />
                    ) : (
                      <Text style={styles.removeButtonText}>Remove</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  competitionName: {
    fontSize: 14,
    color: theme.colors.accent,
    marginBottom: 16,
  },

  subsection: {
    marginBottom: 16,
  },

  subsectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  subsectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  subsectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  participantCount: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  expandIcon: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },

  requestsList: {
    marginTop: 12,
    gap: 12,
  },

  requestItem: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  requestInfo: {
    marginBottom: 12,
  },

  requestName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  requestMessage: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
    fontStyle: 'italic',
  },

  requestTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },

  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },

  approveButton: {
    backgroundColor: '#00ff00', // Green for approve
  },

  rejectButton: {
    backgroundColor: theme.colors.error, // Keep error color for reject
  },

  actionButtonText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  participantsList: {
    marginTop: 12,
    maxHeight: 300,
  },

  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },

  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.error,
    minWidth: 70,
    alignItems: 'center',
  },

  removeButtonText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.error,
  },
});