/**
 * ClubEventsSection - Events linked to a club
 *
 * Fetches competitions where club_id matches, enriches with computed status,
 * and renders each as a DynamicEventCard. Captains see Create, Edit, and
 * Cancel controls. Uses dark theme — no bright orange.
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
import { DynamicEventCard } from '../events/DynamicEventCard';
import { SimpleEventCreationModal } from '../subscription/SimpleEventCreationModal';
import { CustomAlert } from '../ui/CustomAlert';
import type { Competition } from '../../utils/supabase';
import type { CompetitionStatus, DynamicCompetition } from '../../hooks/useDynamicCompetitions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClubEventsSectionProps {
  clubId: string;
  isCaptain: boolean;
  refreshKey?: number;
}

// ---------------------------------------------------------------------------
// Cache (in-memory, 3 min TTL)
// ---------------------------------------------------------------------------

const cache = new Map<string, { events: DynamicCompetition[]; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveStatus(comp: Competition): CompetitionStatus {
  const now = Date.now();
  const start = new Date(comp.start_date).getTime();
  const end = new Date(comp.end_date).getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

const STATUS_ORDER: Record<CompetitionStatus, number> = {
  active: 0,
  upcoming: 1,
  ended: 2,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClubEventsSectionComponent: React.FC<ClubEventsSectionProps> = ({
  clubId,
  isCaptain,
  refreshKey,
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

  const handleEditPress = useCallback((event: DynamicCompetition) => {
    setEditingEvent(event);
    setShowModal(true);
  }, []);

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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>EVENTS</Text>

        {isCaptain && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePress}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.colors.textMuted} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={36} color={theme.colors.textDark} />
          <Text style={styles.emptyText}>
            {isCaptain ? 'No events yet. Create one for your club!' : 'No events yet. Check back soon!'}
          </Text>
        </View>
      ) : (
        events.map((event) => (
          <View key={event.id}>
            <DynamicEventCard
              competition={event}
              onPress={() => handleEventPress(event.external_id)}
            />
            {isCaptain && event.status !== 'ended' && (
              <View style={styles.captainActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditPress(event)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCancelEvent(event)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}

      {/* Event Creation / Edit Modal */}
      <SimpleEventCreationModal
        visible={showModal}
        onClose={handleModalClose}
        onEventCreated={editingEvent ? handleEventEdited : handleEventCreated}
        clubId={clubId}
        existingEvent={editingEvent ? {
          id: editingEvent.id,
          external_id: editingEvent.external_id,
          name: editingEvent.name,
          description: editingEvent.description ?? null,
          template: editingEvent.template ?? null,
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
    marginTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  captainActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: -6,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});

export const ClubEventsSection = React.memo(ClubEventsSectionComponent);
export default ClubEventsSection;
