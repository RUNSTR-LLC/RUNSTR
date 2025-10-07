/**
 * JoinRequestsSection Component - Manages join request approvals for captain dashboard
 * Integrates with existing patterns and real-time Nostr updates
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import type { NDKSubscription } from '@nostr-dev-kit/ndk';
import { theme } from '../../styles/theme';
import { JoinRequestCard } from './JoinRequestCard';
import { TeamMembershipService } from '../../services/team/teamMembershipService';
import type { JoinRequest } from '../../services/team/teamMembershipService';
import { unifiedNotificationStore } from '../../services/notifications/UnifiedNotificationStore';

interface JoinRequestsSectionProps {
  teamId: string;
  captainPubkey: string;
  onMemberApproved?: (requesterPubkey: string) => void;
  style?: any;
}

export const JoinRequestsSection: React.FC<JoinRequestsSectionProps> = ({
  teamId,
  captainPubkey,
  onMemberApproved,
  style,
}) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<NDKSubscription | null>(null);

  const membershipService = TeamMembershipService.getInstance();

  // Load initial join requests
  const loadJoinRequests = async () => {
    try {
      setIsLoading(true);
      const joinRequests = await membershipService.getTeamJoinRequests(
        teamId
      );
      setRequests(joinRequests);
    } catch (error) {
      console.error('Failed to load join requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to real-time join requests
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        // Load initial requests
        await loadJoinRequests();

        // Subscribe to new requests
        const sub = await membershipService.subscribeToJoinRequests(
          captainPubkey,
          async (newRequest: JoinRequest) => {
            setRequests((prev) => {
              // Avoid duplicates
              const exists = prev.some((req) => req.id === newRequest.id);
              if (exists) return prev;

              // Add new request at the top
              return [newRequest, ...prev];
            });

            // Create notification for join request
            try {
              await unifiedNotificationStore.addNotification(
                'team_join_request',
                'New join request',
                `${newRequest.requesterName || 'Someone'} wants to join your team`,
                {
                  teamId: newRequest.teamId,
                  requestId: newRequest.id,
                  requesterId: newRequest.requesterId,
                  requesterName: newRequest.requesterName,
                },
                {
                  icon: 'people',
                  actions: [
                    { id: 'view_dashboard', type: 'view_captain_dashboard', label: 'View', isPrimary: true }
                  ]
                }
              );
            } catch (notifError) {
              console.warn('[JoinRequestsSection] Failed to create join request notification:', notifError);
            }
          }
        );
        setSubscription(sub);
      } catch (error) {
        console.error('Failed to setup join requests subscription:', error);
      }
    };

    setupSubscription();

    // Cleanup subscription
    return () => {
      if (subscription) {
        // Unsubscribe when component unmounts
        console.log('Cleaning up join requests subscription');
        subscription.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, captainPubkey]);

  const handleApproveRequest = async (
    requestId: string,
    requesterPubkey: string
  ) => {
    try {
      // Remove request from UI immediately for better UX
      setRequests((prev) => prev.filter((req) => req.id !== requestId));

      // Notify parent component about new member
      if (onMemberApproved) {
        onMemberApproved(requesterPubkey);
      }

      console.log(`✅ Approved join request: ${requestId}`);
    } catch (error) {
      console.error('Failed to handle request approval:', error);
      // Reload requests on error
      loadJoinRequests();
    }
  };

  const handleDenyRequest = (requestId: string) => {
    try {
      // Remove request from UI
      setRequests((prev) => prev.filter((req) => req.id !== requestId));

      console.log(`❌ Denied join request: ${requestId}`);
    } catch (error) {
      console.error('Failed to handle request denial:', error);
      // Reload requests on error
      loadJoinRequests();
    }
  };

  // Show empty state when no requests

  return (
    <View style={[styles.requestsSection, style]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Join Requests</Text>
        <View style={styles.requestCount}>
          <Text style={styles.requestCountText}>{requests.length}</Text>
        </View>
      </View>

      {requests.length > 0 ? (
        <ScrollView
          style={styles.requestsList}
          showsVerticalScrollIndicator={true}
          indicatorStyle="#FF9D42"
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadJoinRequests}
              tintColor={theme.colors.text}
            />
          }
        >
          {requests.map((request) => (
            <JoinRequestCard
              key={request.id}
              request={request}
              teamId={teamId}
              captainPubkey={captainPubkey}
              onApprove={handleApproveRequest}
              onDeny={handleDenyRequest}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {isLoading ? 'Loading join requests...' : 'No pending requests'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Main section container - matches existing patterns
  requestsSection: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  // Section header with title and count
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  requestCount: {
    backgroundColor: theme.colors.text, // Black/white theme
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  requestCountText: {
    color: theme.colors.background,
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
  },

  // Scrollable requests list
  requestsList: {
    maxHeight: 300, // Limit height to avoid taking too much space
  },

  // Loading state
  loadingState: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },

  // Empty state
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});
