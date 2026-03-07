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
import { NostrListService } from '../../services/nostr/NostrListService';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { UnifiedSigningService } from '../../services/auth/UnifiedSigningService';
import { CustomAlert } from '../ui/CustomAlert';
import { GlobalNDKService } from '../../services/nostr/GlobalNDKService';

// QR Code
import { QRDisplayModal } from '../qr/QRDisplayModal';
import { QRCodeService } from '../../services/qr/QRCodeService';
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
  // ✅ NEW: Time-based event status
  timingStatus: 'upcoming' | 'active' | 'ended';
}

// ✅ NEW: Helper function to calculate event timing status
const getEventTimingStatus = (
  event: FormattedEvent
): 'upcoming' | 'active' | 'ended' => {
  const now = new Date();
  const eventStartDate = new Date(event.startDate || event.date);
  const durationMinutes = event.durationMinutes || 1440; // Default 24 hours
  const eventEndDate = new Date(
    eventStartDate.getTime() + durationMinutes * 60 * 1000
  );

  if (now < eventStartDate) {
    return 'upcoming';
  } else if (now >= eventStartDate && now <= eventEndDate) {
    return 'active';
  } else {
    return 'ended';
  }
};

export const EventsCard: React.FC<EventsCardProps> = ({
  events,
  onEventPress,
  onAddEvent,
  isCaptain = false,
}) => {
  const [eventStatuses, setEventStatuses] = useState<
    Record<string, EventStatus>
  >({});
  const [currentUserHex, setCurrentUserHex] = useState<string | null>(null);
  const [requestingJoin, setRequestingJoin] = useState<string | null>(null);
  const listService = NostrListService.getInstance();

  // QR Code state
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedEventQR, setSelectedEventQR] = useState<EventQRData | null>(
    null
  );

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const hexPubkey =
          await UnifiedSigningService.getInstance().getUserPubkey();
        if (hexPubkey) {
          setCurrentUserHex(hexPubkey);
          // Note: We only need hex pubkey for event status checking
          // npub is only used for QR code generation (captain-only feature)
        }
      } catch (error) {
        console.log('Could not load current user data');
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const checkEventStatuses = async () => {
      if (!currentUserHex || !events || events.length === 0) return;

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
          const participants = await listService.getListMembers(
            captainHex,
            eventDTag
          );
          const isJoined = participants.includes(currentUserHex || '');

          // NOTE: Join request functionality removed (old event system)
          const hasRequestedJoin = false;

          statuses[event.id] = {
            isJoined,
            isActive,
            isCompleted,
            hasRequestedJoin,
            participantCount: participants.length,
            timingStatus: getEventTimingStatus(event), // ✅ NEW: Calculate timing status
          };
        } catch (error) {
          console.log(`Could not check status for event ${event.id}`);
          statuses[event.id] = {
            isJoined: false,
            isActive: false,
            isCompleted: false,
            hasRequestedJoin: false,
            participantCount: 0,
            timingStatus: getEventTimingStatus(event), // ✅ NEW: Calculate timing status even on error
          };
        }
      }

      setEventStatuses(statuses);
    };

    checkEventStatuses().catch((error) => {
      console.error('Failed to check event statuses:', error);
    });
  }, [events, currentUserHex]);

  const handleShowEventQR = async (event: FormattedEvent) => {
    if (!currentUserHex) return;

    try {
      // Convert hex to npub for QR code
      const { nip19 } = await import('@nostr-dev-kit/ndk');
      const npub = nip19.npubEncode(currentUserHex);

      // Parse date to timestamp
      const eventDate = new Date(event.startDate || event.date);
      const startTimestamp = Math.floor(eventDate.getTime() / 1000);
      const endTimestamp = startTimestamp + 86400; // Add 1 day

      // Generate QR data
      const qrData = QRCodeService.getInstance().generateEventQR(
        event.id,
        event.teamId || '',
        npub,
        event.name,
        startTimestamp,
        endTimestamp,
        event.description || event.details
      );

      // Parse to object
      const parsedQR = JSON.parse(qrData) as EventQRData;
      setSelectedEventQR(parsedQR);
      setQrModalVisible(true);
    } catch (error) {
      console.error('Failed to generate event QR:', error);
      CustomAlert.alert('Error', 'Failed to generate QR code', [
        { text: 'OK' },
      ]);
    }
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
        indicatorStyle="white"
      >
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No events yet</Text>
            {isCaptain && (
              <Text style={styles.emptyStateHint}>
                Tap + to create your first event
              </Text>
            )}
          </View>
        ) : (
          events.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventItem}
              onPress={() => {
                // Check if event has minimum required data
                if (!event?.id) {
                  console.error('❌ Cannot navigate: Event missing ID');
                  CustomAlert.alert(
                    'Error',
                    'Unable to open event. Please try refreshing the page.',
                    [{ text: 'OK' }]
                  );
                  return;
                }

                // Log warning if teamId is missing but continue navigation
                if (!event?.teamId) {
                  console.warn(
                    '⚠️ Event missing teamId, navigation may have issues:',
                    event.id
                  );
                }

                console.log(
                  '✅ Navigating to event:',
                  event.id,
                  event.teamId
                    ? 'with teamId'
                    : 'WITHOUT teamId (may have issues)'
                );
                onEventPress?.(event.id, event);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.eventHeader}>
                <View style={styles.eventTitleRow}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  {eventStatuses[event.id] && (
                    <View style={styles.statusBadges}>
                      {/* ✅ NEW: Timing status badge (always shown) */}
                      {eventStatuses[event.id].timingStatus === 'upcoming' && (
                        <View style={styles.upcomingBadge}>
                          <Text style={styles.statusText}>Upcoming</Text>
                        </View>
                      )}
                      {eventStatuses[event.id].timingStatus === 'active' && (
                        <View style={styles.activeTimingBadge}>
                          <Text style={styles.statusText}>Active</Text>
                        </View>
                      )}
                      {eventStatuses[event.id].timingStatus === 'ended' && (
                        <View style={styles.endedBadge}>
                          <Text style={styles.statusText}>Ended</Text>
                        </View>
                      )}

                      {/* Existing participation badges */}
                      {eventStatuses[event.id].isJoined && (
                        <View style={styles.joinedBadge}>
                          <Text style={styles.statusText}>Joined</Text>
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
                  Prize Pool:{' '}
                  {event.prizePoolSats === 0
                    ? 'N/A'
                    : `${event.prizePoolSats.toLocaleString()} sats`}
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
                    <Ionicons
                      name="qr-code-outline"
                      size={16}
                      color={theme.colors.text}
                    />
                    <Text style={styles.qrButtonText}>QR</Text>
                  </TouchableOpacity>
                )}

                {!isCaptain &&
                  !eventStatuses[event.id]?.isJoined &&
                  !eventStatuses[event.id]?.isCompleted && (
                    <TouchableOpacity
                      style={[
                        styles.joinButton,
                        eventStatuses[event.id]?.hasRequestedJoin &&
                          styles.pendingButton,
                        requestingJoin === event.id && styles.disabledButton,
                      ]}
                      onPress={() => handleRequestJoin(event)}
                      disabled={
                        eventStatuses[event.id]?.hasRequestedJoin ||
                        requestingJoin === event.id
                      }
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
          ))
        )}
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

      // Get signer (works for both nsec and Amber)
      const signer = await UnifiedSigningService.getInstance().getSigner();
      if (!signer) {
        CustomAlert.alert(
          'Error',
          'No authentication found. Please login first.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get user's hex pubkey
      const userHexPubkey =
        await UnifiedSigningService.getInstance().getUserPubkey();
      if (!userHexPubkey) {
        CustomAlert.alert('Error', 'Could not determine user public key', [
          { text: 'OK' },
        ]);
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

      // NOTE: Join request functionality disabled (old event system)
      // EventJoinRequestService was removed during migration to daily leaderboards
      CustomAlert.alert(
        'Info',
        'Event join requests are currently unavailable. Please contact the team captain directly.',
        [{ text: 'OK' }]
      );

      // Update status to show pending
      setEventStatuses((prev) => ({
        ...prev,
        [event.id]: {
          ...prev[event.id],
          hasRequestedJoin: true,
        },
      }));
    } catch (error) {
      console.error('Failed to send join request:', error);
      CustomAlert.alert('Error', 'Failed to send join request', [
        { text: 'OK' },
      ]);
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
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  emptyStateHint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
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

  // ✅ Timing status badge styles (theme-compliant)
  upcomingBadge: {
    backgroundColor: theme.colors.orangeBright + '20', // Orange with opacity
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  activeTimingBadge: {
    backgroundColor: theme.colors.orangeBright + '30', // Slightly more opaque for active
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  endedBadge: {
    backgroundColor: theme.colors.textMuted + '20', // Muted gray with opacity
    borderWidth: 1,
    borderColor: theme.colors.textMuted,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  joinedBadge: {
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
    backgroundColor: theme.colors.orangeBright + '20',
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
    backgroundColor: theme.colors.textMuted,
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
