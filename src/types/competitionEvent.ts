/**
 * CompetitionEvent type definition
 * Shared type used by event stores (EventSnapshotStore, CaptainEventStore, EventParticipationStore)
 * Originally defined in SimpleCompetitionService (now removed as dead code)
 */

export interface CompetitionEvent {
  id: string; // d tag
  teamId: string;
  captainPubkey: string;
  pubkey?: string; // Raw Nostr event pubkey (backwards-compat lookups)
  name: string;
  description?: string;
  activityType: string;
  location?: string;
  scoringType?: string; // 'completion' | 'fastest_time'
  metric: string; // Deprecated: Use scoringType instead
  eventDate: string; // ISO date
  durationMinutes?: number; // Duration for short events (10 min, 2 hours)
  targetDistance?: number;
  targetUnit?: string;
  entryFeesSats?: number;
  lightningAddress?: string;
  paymentDestination?: 'captain' | 'charity';
  paymentRecipientName?: string;
  scoringMode?: 'individual' | 'team-total'; // Scoring mode
  teamGoal?: number; // Team goal for team-total mode
}
