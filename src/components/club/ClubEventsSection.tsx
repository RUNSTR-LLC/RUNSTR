/**
 * ClubEventsSection - Events linked to a club
 *
 * Fetches competitions where club_id matches, enriches with computed status,
 * and renders each as a DynamicEventCard. Captains see a "Create" button
 * that opens SimpleEventCreationModal with the clubId pre-filled.
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
import { theme } from '../../styles/theme';
import { SupabaseCompetitionService } from '../../services/backend/SupabaseCompetitionService';
import { DynamicEventCard } from '../events/DynamicEventCard';
import { SimpleEventCreationModal } from '../subscription/SimpleEventCreationModal';
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
          <DynamicEventCard
            key={event.id}
            competition={event}
            onPress={() => handleEventPress(event.external_id)}
          />
        ))
      )}

      {/* Event Creation Modal (captain only) */}
      <SimpleEventCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={handleEventCreated}
        clubId={clubId}
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
});

export const ClubEventsSection = React.memo(ClubEventsSectionComponent);
export default ClubEventsSection;
