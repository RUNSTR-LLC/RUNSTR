/**
 * ClubEventsSection - Events linked to a club
 *
 * Fetches competitions where club_id matches, enriches with computed status,
 * and renders each as a compact single-line row with status dot, name, and date.
 * Captains see a "..." button that opens an action sheet for Edit/Cancel.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { SupabaseCompetitionService } from '../../services/backend/SupabaseCompetitionService';
import { SimpleEventCreationModal } from '../creation/SimpleEventCreationModal';
import { CustomAlert } from '../ui/CustomAlert';
import type { CompetitionStatus, DynamicCompetition } from '../../hooks/useDynamicCompetitions';
import { deriveStatus } from '../../utils/competitionStatus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClubEventsSectionProps {
  clubId: string;
  isCaptain: boolean;
  refreshKey?: number;
  clubName?: string;
  clubBannerUrl?: string;
}

// ---------------------------------------------------------------------------
// Cache (in-memory, 3 min TTL)
// ---------------------------------------------------------------------------

const cache = new Map<string, { events: DynamicCompetition[]; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_ORDER: Record<CompetitionStatus, number> = {
  active: 0,
  upcoming: 1,
  ended: 2,
};

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClubEventsSectionComponent: React.FC<ClubEventsSectionProps> = ({
  clubId,
  isCaptain,
  refreshKey,
  clubName,
  clubBannerUrl,
}) => {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<DynamicCompetition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DynamicCompetition | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
  }>({ visible: false, title: '', buttons: [] });

  const loadEvents = useCallback(async () => {
    if (refreshKey && refreshKey > 0) {
      cache.delete(clubId);
    } else {
      const cached = cache.get(clubId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setEvents(cached.events);
        setIsLoading(false);
        return;
      }
    }

    try {
      const competitions = await SupabaseCompetitionService.fetchCompetitionsByClubId(clubId);
      const enriched: DynamicCompetition[] = competitions
        .map((c) => ({ ...c, status: deriveStatus(c) }))
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

      cache.set(clubId, { events: enriched, timestamp: Date.now() });
      setEvents(enriched);
    } catch (err) {
      console.error('[ClubEventsSection] Error loading events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clubId, refreshKey]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleEventPress = useCallback(
    (eventId: string) => {
      navigation.navigate('DynamicEventDetail', { eventId });
    },
    [navigation]
  );

  const handleEventCreated = useCallback(async (eventId: string) => {
    cache.delete(clubId);
    await SupabaseCompetitionService.clearClubCompetitionsCache(clubId);
    setIsLoading(true);
    await loadEvents();
    navigation.navigate('DynamicEventDetail', { eventId });
  }, [clubId, loadEvents, navigation]);

  const handleEventEdited = useCallback(async () => {
    cache.delete(clubId);
    await SupabaseCompetitionService.clearClubCompetitionsCache(clubId);
    setIsLoading(true);
    await loadEvents();
  }, [clubId, loadEvents]);

  const handleCreatePress = useCallback(() => {
    setEditingEvent(null);
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setEditingEvent(null);
  }, []);

  const handleCancelEvent = useCallback(
    (event: DynamicCompetition) => {
      setAlertConfig({
        visible: true,
        title: 'Cancel Event',
        message: `Are you sure you want to cancel "${event.name}"? This will remove the event and all participants.`,
        buttons: [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Event',
            style: 'destructive',
            onPress: async () => {
              const npub = await AsyncStorage.getItem('@runstr:npub');
              if (!npub) return;

              const result = await SupabaseCompetitionService.deleteCompetition(
                event.external_id,
                npub
              );

              if (result.success) {
                cache.delete(clubId);
                setIsLoading(true);
                await loadEvents();
              } else {
                setAlertConfig({
                  visible: true,
                  title: 'Error',
                  message: result.error || 'Failed to cancel event',
                  buttons: [{ text: 'OK' }],
                });
              }
            },
          },
        ],
      });
    },
    [clubId, loadEvents]
  );

  const handleEventOptions = useCallback((event: DynamicCompetition) => {
    setAlertConfig({
      visible: true,
      title: event.name,
      buttons: [
        { text: 'Edit', onPress: () => { setEditingEvent(event); setShowModal(true); } },
        { text: 'Cancel Event', style: 'destructive', onPress: () => handleCancelEvent(event) },
        { text: 'Dismiss', style: 'cancel' },
      ],
    });
  }, [handleCancelEvent]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Hide entire section if no events and not captain (captains still see Create button)
  if (!isLoading && events.length === 0 && !isCaptain) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>EVENTS</Text>

        {isCaptain && (
          <TouchableOpacity
            onPress={handleCreatePress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.textMuted} />
      ) : events.length === 0 ? (
        <Text style={styles.emptyText}>No events yet</Text>
      ) : (
        events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventRow}
            onPress={() => handleEventPress(event.external_id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.statusDot,
              event.status === 'active' && styles.statusDotActive,
              event.status === 'upcoming' && styles.statusDotUpcoming,
              event.status === 'ended' && styles.statusDotEnded,
            ]} />
            <Text style={[styles.eventName, event.status === 'ended' && styles.eventNameEnded]} numberOfLines={1}>{event.name}</Text>
            {event.status === 'ended' && (
              <View style={styles.endedBadge}>
                <Text style={styles.endedBadgeText}>ENDED</Text>
              </View>
            )}
            <Text style={styles.eventMeta}>
              {formatShortDate(event.start_date)}
            </Text>
            {isCaptain && event.status !== 'ended' && (
              <TouchableOpacity
                onPress={() => handleEventOptions(event)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eventEditButton}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color={theme.colors.textDark} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))
      )}

      {/* Event Creation / Edit Modal */}
      <SimpleEventCreationModal
        visible={showModal}
        onClose={handleModalClose}
        onEventCreated={editingEvent ? handleEventEdited : handleEventCreated}
        clubId={clubId}
        clubName={clubName}
        clubBannerUrl={clubBannerUrl}
        existingEvent={editingEvent ? {
          id: editingEvent.id,
          external_id: editingEvent.external_id,
          name: editingEvent.name,
          recurring_interval: (editingEvent as any).recurring_interval ?? undefined,
        } : undefined}
      />

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles — dark theme
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textDark,
  },
  statusDotActive: {
    backgroundColor: theme.colors.accent,
  },
  statusDotUpcoming: {
    backgroundColor: theme.colors.accent,
  },
  statusDotEnded: {
    backgroundColor: theme.colors.textDark,
  },
  eventName: {
    flex: 1,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  eventNameEnded: {
    color: theme.colors.textDark,
  },
  endedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(153, 102, 51, 0.15)',
  },
  endedBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textDark,
    letterSpacing: 0.5,
  },
  eventMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  eventEditButton: {
    paddingLeft: 8,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textDark,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});

export const ClubEventsSection = React.memo(ClubEventsSectionComponent);
export default ClubEventsSection;
