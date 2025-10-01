/**
 * EventJoinRequestsSection Component - Manages event join request approvals
 * Displays and handles join requests for specific events
 * Integrates with NostrListService for participant management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import { JoinRequestCard } from '../team/JoinRequestCard';
import { EventJoinRequestService } from '../../services/events/EventJoinRequestService';
import type { EventJoinRequest } from '../../services/events/EventJoinRequestService';
import { NostrListService } from '../../services/nostr/NostrListService';
import { getAuthenticationData } from '../../utils/authUtils';
import { nsecToPrivateKey } from '../../utils/ndkConversion';
import { npubToHex } from '../../utils/ndkConversion';
import { NDKPrivateKeySigner, NDKEvent } from '@nostr-dev-kit/ndk';
import { getNDKInstance } from '../../services/nostr/ndkInstance';

interface EventJoinRequestsSectionProps {
  captainPubkey: string;
  teamId: string;
  onMemberApproved?: (eventId: string, requesterPubkey: string) => void;
  style?: any;
}

interface GroupedRequests {
  eventId: string;
  eventName: string;
  requests: EventJoinRequest[];
  expandedState: boolean;
}

export const EventJoinRequestsSection: React.FC<EventJoinRequestsSectionProps> = ({
  captainPubkey,
  teamId,
  onMemberApproved,
  style,
}) => {
  const [groupedRequests, setGroupedRequests] = useState<GroupedRequests[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const requestService = EventJoinRequestService.getInstance();
  const listService = NostrListService.getInstance();

  // Load initial event join requests
  const loadEventJoinRequests = async () => {
    try {
      setIsLoading(true);
      const joinRequests = await requestService.getEventJoinRequests(captainPubkey);

      // Group requests by event
      const grouped = joinRequests.reduce((acc, request) => {
        const existing = acc.find(g => g.eventId === request.eventId);
        if (existing) {
          existing.requests.push(request);
        } else {
          acc.push({
            eventId: request.eventId,
            eventName: request.eventName,
            requests: [request],
            expandedState: false,
          });
        }
        return acc;
      }, [] as GroupedRequests[]);

      setGroupedRequests(grouped);
    } catch (error) {
      console.error('Failed to load event join requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to real-time event join requests
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        // Load initial requests
        await loadEventJoinRequests();

        // Subscribe to new requests
        const subId = await requestService.subscribeToEventJoinRequests(
          captainPubkey,
          (newRequest: EventJoinRequest) => {
            setGroupedRequests((prev) => {
              const updated = [...prev];
              const eventGroup = updated.find(g => g.eventId === newRequest.eventId);

              if (eventGroup) {
                // Check for duplicates
                const exists = eventGroup.requests.some(r => r.id === newRequest.id);
                if (!exists) {
                  eventGroup.requests.unshift(newRequest);
                }
              } else {
                // New event group
                updated.unshift({
                  eventId: newRequest.eventId,
                  eventName: newRequest.eventName,
                  requests: [newRequest],
                  expandedState: true, // Auto-expand new events
                });
              }

              return updated;
            });
          }
        );
        setSubscriptionId(subId);
      } catch (error) {
        console.error('Failed to setup event join requests subscription:', error);
      }
    };

    setupSubscription();

    // Cleanup subscription
    return () => {
      if (subscriptionId) {
        console.log('Cleaning up event join requests subscription:', subscriptionId);
      }
    };
  }, [captainPubkey, teamId]);

  const toggleEventExpanded = (eventId: string) => {
    setGroupedRequests((prev) =>
      prev.map(g =>
        g.eventId === eventId
          ? { ...g, expandedState: !g.expandedState }
          : g
      )
    );
  };

  const handleApproveRequest = async (
    requestId: string,
    requesterPubkey: string,
    eventId: string,
    eventName: string
  ) => {
    try {
      // Get auth data for signing
      const authData = await getAuthenticationData();
      if (!authData?.nsec) {
        Alert.alert('Error', 'Authentication required to approve requests');
        return;
      }

      const privateKeyHex = nsecToPrivateKey(authData.nsec);
      const captainHexPubkey = npubToHex(authData.npub);

      // Get current participant list
      const dTag = `event-${eventId}-participants`;
      const currentList = await listService.getList(captainHexPubkey, dTag);

      if (!currentList) {
        // Create initial list if it doesn't exist
        const listData = {
          name: `${eventName} Participants`,
          description: `Participants for ${eventName}`,
          members: [requesterPubkey],
          dTag,
          listType: 'people' as const,
        };

        const eventTemplate = listService.prepareListCreation(listData, captainHexPubkey);

        // Sign and publish
        const ndk = await getNDKInstance();
        const signer = new NDKPrivateKeySigner(privateKeyHex);
        const ndkEvent = new NDKEvent(ndk, eventTemplate);
        await ndkEvent.sign(signer);
        await ndkEvent.publish();
      } else {
        // Add to existing list
        const eventTemplate = listService.prepareAddMember(
          captainHexPubkey,
          dTag,
          requesterPubkey,
          currentList
        );

        if (eventTemplate) {
          // Sign and publish updated list
          const ndk = await getNDKInstance();
          const signer = new NDKPrivateKeySigner(privateKeyHex);
          const ndkEvent = new NDKEvent(ndk, eventTemplate);
          await ndkEvent.sign(signer);
          await ndkEvent.publish();

          // Update cache
          listService.updateCachedList(`${captainHexPubkey}:${dTag}`, [...currentList.members, requesterPubkey]);
        }
      }

      // Remove request from UI
      setGroupedRequests((prev) => {
        const updated = [...prev];
        const eventGroup = updated.find(g => g.eventId === eventId);
        if (eventGroup) {
          eventGroup.requests = eventGroup.requests.filter(r => r.id !== requestId);
          // Remove group if no more requests
          if (eventGroup.requests.length === 0) {
            return updated.filter(g => g.eventId !== eventId);
          }
        }
        return updated;
      });

      // Notify parent component
      onMemberApproved?.(eventId, requesterPubkey);

      Alert.alert('Success', 'Participant approved and added to event');
    } catch (error) {
      console.error('Failed to approve event join request:', error);
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string, eventId: string) => {
    // Simply remove from UI - no need to update list
    setGroupedRequests((prev) => {
      const updated = [...prev];
      const eventGroup = updated.find(g => g.eventId === eventId);
      if (eventGroup) {
        eventGroup.requests = eventGroup.requests.filter(r => r.id !== requestId);
        // Remove group if no more requests
        if (eventGroup.requests.length === 0) {
          return updated.filter(g => g.eventId !== eventId);
        }
      }
      return updated;
    });

    Alert.alert('Request Declined', 'The join request has been declined');
  };

  const totalRequests = groupedRequests.reduce((sum, g) => sum + g.requests.length, 0);

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.header}>
          <Text style={styles.title}>Event Join Requests</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Join Requests</Text>
        {totalRequests > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalRequests}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadEventJoinRequests}
            tintColor={theme.colors.primary}
          />
        }
      >
        {groupedRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending event join requests</Text>
            <Text style={styles.emptySubtext}>
              Event requests will appear here when users request to join your events
            </Text>
          </View>
        ) : (
          groupedRequests.map((group) => (
            <View key={group.eventId} style={styles.eventGroup}>
              <TouchableOpacity
                style={styles.eventHeader}
                onPress={() => toggleEventExpanded(group.eventId)}
              >
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{group.eventName}</Text>
                  <Text style={styles.requestCount}>
                    {group.requests.length} request{group.requests.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.expandIcon}>
                  {group.expandedState ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {group.expandedState && (
                <View style={styles.requestsContainer}>
                  {group.requests.map((request) => (
                    <JoinRequestCard
                      key={request.id}
                      request={{
                        id: request.id,
                        teamId: request.teamId,
                        teamName: request.eventName,
                        requesterPubkey: request.requesterId,
                        requesterName: request.requesterName,
                        requestedAt: request.timestamp,
                        message: request.message,
                      }}
                      onApprove={() =>
                        handleApproveRequest(
                          request.id,
                          request.requesterId,
                          request.eventId,
                          request.eventName
                        )
                      }
                      onReject={() => handleRejectRequest(request.id, request.eventId)}
                    />
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    maxHeight: 400,
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
    paddingHorizontal: 20,
  },
  eventGroup: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: theme.colors.card,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  requestCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  expandIcon: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  requestsContainer: {
    padding: 8,
  },
});