/**
 * ClubEventsSection - Events linked to a club
 *
 * Fetches competitions where club_id matches, enriches with computed status,
 * and renders each as a DynamicEventCard. Captains see a "Create" button
 * that opens SimpleEventCreationModal with the clubId pre-filled.
 * Captains can also cancel events they created via long-press.
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
}) => {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<DynamicCompetition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
  }>({ visible: false, title: '', buttons: [] });

  const loadEvents = useCallback(async () => {
    // Check in-memory cache
    const cached = cache.get(clubId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setEvents(cached.events);
      setIsLoading(false);
      return;
    }

    try {
      const competitions = await SupabaseCompetitionService.fetchCompetitionsByClubId(clubId);

      // Enrich with status and sort: active first, then upcoming, then ended
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
  }, [clubId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleEventPress = useCallback(
    (eventId: string) => {
      navigation.navigate('DynamicEventDetail', { eventId });
    },
    [navigation]
  );

  const handleEventCreated = useCallback(async () => {
    // Invalidate caches and reload
    cache.delete(clubId);
    await SupabaseCompetitionService.clearClubCompetitionsCache(clubId);
    setIsLoading(true);
    await loadEvents();
  }, [clubId, loadEvents]);

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
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={16} color={theme.colors.accent} />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={36} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>
            {isCaptain ? 'No events yet. Create one for your club!' : 'No club events yet'}
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
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelEvent(event)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={14} color={theme.colors.textMuted} />
                <Text style={styles.cancelButtonText}>Cancel Event</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      {/* Event Creation Modal (captain only) */}
      <SimpleEventCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={handleEventCreated}
        clubId={clubId}
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
// Styles
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
    borderColor: theme.colors.accent,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    marginTop: -8,
    marginBottom: 8,
  },
  cancelButtonText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});

export const ClubEventsSection = React.memo(ClubEventsSectionComponent);
export default ClubEventsSection;
