/**
 * JoinRequestCard - Individual join request UI with approve/reject actions
 * Clean black and white minimalistic design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';

export interface JoinRequest {
  id: string;
  requesterPubkey: string;
  requesterName?: string;
  requesterAvatar?: string;
  competitionId: string;
  competitionType: 'challenge' | 'event';
  timestamp: number;
  eventId: string;
}

interface JoinRequestCardProps {
  request: JoinRequest;
  onApprove: (request: JoinRequest) => Promise<void>;
  onReject: (request: JoinRequest) => Promise<void>;
}

export const JoinRequestCard: React.FC<JoinRequestCardProps> = ({
  request,
  onApprove,
  onReject,
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(request);
    } catch (error) {
      console.error('Failed to approve request:', error);
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject(request);
    } catch (error) {
      console.error('Failed to reject request:', error);
      setIsRejecting(false);
    }
  };

  const getDisplayName = (): string => {
    if (request.requesterName) {
      return request.requesterName;
    }
    return `${request.requesterPubkey.slice(0, 8)}...${request.requesterPubkey.slice(-6)}`;
  };

  const getTimeAgo = (): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - request.timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const isLoading = isApproving || isRejecting;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getDisplayName().charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.name}>{getDisplayName()}</Text>
            <Text style={styles.timestamp}>{getTimeAgo()}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.requestText}>
        Wants to join your {request.competitionType}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.approveButton, isLoading && styles.buttonDisabled]}
          onPress={handleApprove}
          disabled={isLoading}
        >
          {isApproving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.approveButtonText}>Approve</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rejectButton, isLoading && styles.buttonDisabled]}
          onPress={handleReject}
          disabled={isLoading}
        >
          {isRejecting ? (
            <ActivityIndicator size="small" color={theme.colors.text} />
          ) : (
            <Text style={styles.rejectButtonText}>Decline</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  requestText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: theme.colors.orangeDeep, // Deep orange approve button
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accentText, // Black text on orange
  },
  rejectButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
