/**
 * JoinRequestCard Component - Join request approval interface for captain dashboard
 * Integrates with teamMembershipService and follows existing card patterns
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { theme } from '../../styles/theme';
import { MemberAvatar } from '../ui/MemberAvatar';
import type { JoinRequest } from '../../services/team/teamMembershipService';
import { NostrListService } from '../../services/nostr/NostrListService';
import { NostrProtocolHandler } from '../../services/nostr/NostrProtocolHandler';
import { GlobalNDKService } from '../../services/nostr/GlobalNDKService';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { getNsecFromStorage, nsecToPrivateKey } from '../../utils/nostr';
import { TeamMemberCache } from '../../services/team/TeamMemberCache';

interface JoinRequestCardProps {
  request: JoinRequest;
  teamId: string;
  captainPubkey: string;
  onApprove: (requestId: string, requesterPubkey: string) => void;
  onDeny: (requestId: string) => void;
  style?: any;
}

export const JoinRequestCard: React.FC<JoinRequestCardProps> = ({
  request,
  teamId,
  captainPubkey,
  onApprove,
  onDeny,
  style,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const formatRequestTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleApprove = async () => {
    if (isProcessing) return;

    Alert.alert(
      'Approve Join Request',
      `Add ${request.requesterName || 'this user'} to the official team list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setIsProcessing(true);
            try {
              // Get current member list
              const listService = NostrListService.getInstance();
              const memberListDTag = `${teamId}-members`;
              const currentList = await listService.getList(captainPubkey, memberListDTag);

              if (!currentList) {
                throw new Error('Team member list not found');
              }

              // Prepare the updated list event
              const eventTemplate = listService.prepareAddMember(
                captainPubkey,
                memberListDTag,
                request.requesterPubkey,
                currentList
              );

              if (!eventTemplate) {
                console.log('Member already in list');
                onApprove(request.id, request.requesterPubkey);
                return;
              }

              // Get captain's private key for signing
              const nsec = await getNsecFromStorage();
              if (!nsec) {
                throw new Error('Captain credentials not found');
              }
              const privateKey = await nsecToPrivateKey(nsec);

              // Sign and publish the updated list
              const protocolHandler = new NostrProtocolHandler();
              const signedEvent = await protocolHandler.signEvent(eventTemplate, privateKey);

              // Publish using GlobalNDK
              const ndk = await GlobalNDKService.getInstance();
              const ndkEvent = new NDKEvent(ndk, signedEvent);
              await ndkEvent.publish();

              console.log(`✅ Added member to team list: ${request.requesterPubkey}`);

              // Update cache
              const listId = `${captainPubkey}:${memberListDTag}`;
              const updatedMembers = [...currentList.members, request.requesterPubkey];
              listService.updateCachedList(listId, updatedMembers);

              // Invalidate team member cache to force refresh
              const memberCache = TeamMemberCache.getInstance();
              memberCache.invalidateTeam(teamId, captainPubkey);

              onApprove(request.id, request.requesterPubkey);
            } catch (error) {
              console.error('Failed to approve join request:', error);
              Alert.alert(
                'Error',
                'Failed to approve request. Please try again.'
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleDeny = () => {
    if (isProcessing) return;

    Alert.alert(
      'Deny Join Request',
      `Deny join request from ${request.requesterName || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: () => onDeny(request.id),
        },
      ]
    );
  };

  return (
    <View style={[styles.requestCard, style]}>
      <View style={styles.requestHeader}>
        <View style={styles.userInfo}>
          <MemberAvatar
            name={request.requesterName || request.requesterPubkey.slice(0, 8)}
            size={32}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {request.requesterName ||
                `User ${request.requesterPubkey.slice(0, 8)}`}
            </Text>
            <Text style={styles.requestTime}>
              {formatRequestTime(request.requestedAt)}
            </Text>
          </View>
        </View>
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      </View>

      {request.message && request.message.trim() && (
        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Message:</Text>
          <Text style={styles.messageText}>{request.message}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={handleApprove}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionBtnText, styles.approveBtnText]}>
            {isProcessing ? 'Adding...' : 'Approve'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.denyBtn]}
          onPress={handleDeny}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionBtnText, styles.denyBtnText]}>Deny</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main card container - matches existing card patterns
  requestCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  // Header section with user info and new badge
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  userDetails: {
    flex: 1,
  },

  userName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  requestTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  // New request badge
  newBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  newBadgeText: {
    color: theme.colors.textBright,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Message section (optional)
  messageSection: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  messageLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  messageText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },

  // Action buttons section
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },

  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionBtnText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
  },

  // Approve button - uses accent color
  approveBtn: {
    backgroundColor: theme.colors.accent,
  },

  approveBtnText: {
    color: theme.colors.accentText,
  },

  // Deny button - uses border style
  denyBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.gray,
  },

  denyBtnText: {
    color: theme.colors.text,
  },
});
