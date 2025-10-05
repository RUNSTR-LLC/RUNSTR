import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { FormattedEvent } from '../../types';
import { theme } from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NostrListService } from '../../services/nostr/NostrListService';
import { EventJoinRequestService } from '../../services/events/EventJoinRequestService';
import { getAuthenticationData } from '../../utils/nostrAuth';
import { npubToHex } from '../../utils/ndkConversion';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { Alert } from 'react-native';
import unifiedSigningService from '../../services/auth/UnifiedSigningService';

// QR Code
import { QRDisplayModal } from '../qr/QRDisplayModal';
import QRCodeService from '../../services/qr/QRCodeService';
import type { EventQRData } from '../../services/qr/QRCodeService';

interface EventsCardProps {
  events: FormattedEvent[];
  onEventPress?: (eventId: string, event?: FormattedEvent) => void;
  onAddEvent?: () => void;
  isCaptain?: boolean;
}

interface EventStatus {
  isJoined: boolean;
  isActive: boolean;
  isCompleted: boolean;
  hasRequestedJoin: boolean;
  participantCount: number;
}

export const EventsCard: React.FC<EventsCardProps> = ({
  events,
  onEventPress,
  onAddEvent,
  isCaptain = false,
}) => {
  const [eventStatuses, setEventStatuses] = useState<Record<string, EventStatus>>({});
  const [currentUserNpub, setCurrentUserNpub] = useState<string | null>(null);
  const [currentUserHex, setCurrentUserHex] = useState<string | null>(null);
  const [requestingJoin, setRequestingJoin] = useState<string | null>(null);
  const listService = NostrListService.getInstance();
  const joinRequestService = EventJoinRequestService.getInstance();

  // QR Code state
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedEventQR, setSelectedEventQR] = useState<EventQRData | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const authData = await getAuthenticationData();
        if (authData) {
          setCurrentUserNpub(authData.npub);
          setCurrentUserHex(authData.hexPubkey);
        }
      } catch (error) {
        console.log('Could not load current user data');
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const checkEventStatuses = async () => {
      if (!currentUserNpub) return;

      const statuses: Record<string, EventStatus> = {};

      for (const event of events) {
        try {
          // Check if event is active (based on date)
          const now = new Date();
          const eventDate = new Date(event.startDate || event.date);
          const isActive = eventDate.toDateString() === now.toDateString();
          const isCompleted = eventDate < now;

          // Get event captain's hex pubkey (from event data or team captain)
          const captainHex = event.captainPubkey || event.authorPubkey || '';

          // Check if user has joined this event (using kind 30000 list)
          const eventDTag = `event-${event.id}-participants`;
          const participants = await listService.getListMembers(captainHex, eventDTag);
          const isJoined = participants.includes(currentUserHex || '');

          // Check if user has pending join request
          const joinRequests = await joinRequestService.getEventJoinRequests(captainHex, event.id);
          const hasRequestedJoin = joinRequests.some(r => r.requesterId === currentUserHex);

          statuses[event.id] = {
            isJoined,
            isActive,
            isCompleted,
            hasRequestedJoin,
            participantCount: participants.length
          };
        } catch (error) {
          console.log(`Could not check status for event ${event.id}`);
          statuses[event.id] = {
            isJoined: false,
            isActive: false,
            isCompleted: false,
            hasRequestedJoin: false,
            participantCount: 0
          };
        }
      }

      setEventStatuses(statuses);
    };

    checkEventStatuses();
  }, [events, currentUserNpub]);

  const handleShowEventQR = (event: FormattedEvent) => {
    if (!currentUserNpub) return;

    // Parse date to timestamp
    const eventDate = new Date(event.startDate || event.date);
    const startTimestamp = Math.floor(eventDate.getTime() / 1000);
    const endTimestamp = startTimestamp + 86400; // Add 1 day

    // Generate QR data
    const qrData = QRCodeService.generateEventQR(
      event.id,
      event.teamId || '',
      currentUserNpub,
      event.name,
      startTimestamp,
      endTimestamp,
      event.description || event.details
    );

    // Parse to object
    const parsedQR = JSON.parse(qrData) as EventQRData;
    setSelectedEventQR(parsedQR);
    setQrModalVisible(true);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        {isCaptain && onAddEvent && (
          <TouchableOpacity onPress={onAddEvent} style={styles.addButton}>
            <Ionicons name="add" size={16} color={theme.colors.background} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollableList}
        showsVerticalScrollIndicator={true}
        indicatorStyle="#FF9D42"
      >
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventItem}
            onPress={() => onEventPress?.(event.id, event)}
            activeOpacity={0.7}
          >
            <View style={styles.eventHeader}>
              <View style={styles.eventTitleRow}>
                <Text style={styles.eventName}>{event.name}</Text>
                {eventStatuses[event.id] && (
                  <View style={styles.statusBadges}>
                    {eventStatuses[event.id].isJoined && (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Joined</Text>
                      </View>
                    )}
                    {eventStatuses[event.id].isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.statusText}>Active</Text>
                      </View>
                    )}
                    {eventStatuses[event.id].isCompleted && !eventStatuses[event.id].isJoined && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.statusText}>Past</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.eventDate}>{event.date}</Text>
            </View>
            <Text style={styles.eventDetails}>{event.details}</Text>
            {event.prizePoolSats !== undefined && (
              <Text style={styles.prizePool}>
                Prize Pool: {event.prizePoolSats === 0 ? 'N/A' : `${event.prizePoolSats.toLocaleString()} sats`}
              </Text>
            )}

            {/* Show participant count and join button */}
            <View style={styles.eventFooter}>
              <Text style={styles.participantCount}>
                {eventStatuses[event.id]?.participantCount || 0} participants
              </Text>

              {/* Captain QR button */}
              {isCaptain && (
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => handleShowEventQR(event)}
                >
                  <Ionicons name="qr-code-outline" size={16} color={theme.colors.text} />
                  <Text style={styles.qrButtonText}>QR</Text>
                </TouchableOpacity>
              )}

              {!isCaptain && !eventStatuses[event.id]?.isJoined && !eventStatuses[event.id]?.isCompleted && (
                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    eventStatuses[event.id]?.hasRequestedJoin && styles.pendingButton,
                    requestingJoin === event.id && styles.disabledButton
                  ]}
                  onPress={() => handleRequestJoin(event)}
                  disabled={eventStatuses[event.id]?.hasRequestedJoin || requestingJoin === event.id}
                >
                  <Text style={styles.joinButtonText}>
                    {requestingJoin === event.id
                      ? 'Requesting...'
                      : eventStatuses[event.id]?.hasRequestedJoin
                      ? 'Request Pending'
                      : 'Request to Join'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* QR Code Modal */}
      {selectedEventQR && (
        <QRDisplayModal
          visible={qrModalVisible}
          onClose={() => {
            setQrModalVisible(false);
            setSelectedEventQR(null);
          }}
          data={selectedEventQR}
        />
      )}
    </Card>
  );

  async function handleRequestJoin(event: FormattedEvent) {
    try {
      setRequestingJoin(event.id);

      // Get auth data
      const authData = await getAuthenticationData();
      if (!authData?.nsec) {
        Alert.alert('Error', 'Please log in to join events');
        return;
      }

      // Get captain's hex pubkey
      const captainHex = event.captainPubkey || event.authorPubkey || '';

      // Prepare join request
      const requestData = {
        eventId: event.id,
        eventName: event.name,
        teamId: event.teamId || '',
        captainPubkey: captainHex,
        message: `Request to join ${event.name}`,
      };

      const eventTemplate = joinRequestService.prepareEventJoinRequest(
        requestData,
        authData.hexPubkey
      );

      // Sign and publish (works for both nsec and Amber)
      const signer = await unifiedSigningService.getSigner();
      if (!signer) {
        Alert.alert('Error', 'No authentication found. Please login first.');
        return;
      }

      const g = globalThis as any;
      const ndk = g.__RUNSTR_NDK_INSTANCE__;
      const ndkEvent = new NDKEvent(ndk, eventTemplate);
      await ndkEvent.sign(signer);
      await ndkEvent.publish();

      Alert.alert('Success', 'Your join request has been sent to the captain');

      // Update status to show pending
      setEventStatuses(prev => ({
        ...prev,
        [event.id]: {
          ...prev[event.id],
          hasRequestedJoin: true,
        },
      }));
    } catch (error) {
      console.error('Failed to send join request:', error);
      Alert.alert('Error', 'Failed to send join request');
    } finally {
      setRequestingJoin(null);
    }
  }
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollableList: {
    flex: 1,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  eventItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventHeader: {
    flexDirection: 'column',
    marginBottom: 3,
  },

  eventTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },

  statusBadges: {
    flexDirection: 'row',
    gap: 4,
  },

  statusBadge: {
    borderWidth: 1,
    borderColor: theme.colors.text + '60',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  activeBadge: {
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  completedBadge: {
    borderWidth: 1,
    borderColor: theme.colors.textMuted + '60',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  statusText: {
    fontSize: 9,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  eventName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 16,
    flex: 1,
    marginRight: 8,
  },
  eventDate: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    flexShrink: 0,
  },
  eventDetails: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 14,
  },
  prizePool: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 4,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  participantCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pendingButton: {
    backgroundColor: theme.colors.secondary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.background,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  qrButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
