/**
 * CacheInvalidationService - Centralized cache invalidation after user writes
 *
 * CRITICAL: This service ensures users see their own updates immediately.
 * Without invalidation, users post workouts and can't see them after pull-to-refresh.
 *
 * Usage:
 * ```typescript
 * // After posting workout
 * await CacheInvalidationService.invalidateWorkout(userPubkey, userTeamIds);
 *
 * // After updating profile
 * await CacheInvalidationService.invalidateProfile(userPubkey);
 *
 * // After joining/leaving team
 * await CacheInvalidationService.invalidateTeamMembership(userPubkey, teamId);
 * ```
 */

import unifiedCache from './UnifiedNostrCache';
import { CacheKeys } from '../../constants/cacheTTL';

export class CacheInvalidationService {
  /**
   * Invalidate workout-related caches after user posts a workout
   *
   * Called after:
   * - Publishing kind 1301 (structured workout data)
   * - Publishing kind 1 (social workout post)
   *
   * Invalidates:
   * - User's workout history (so new workout appears in WorkoutHistoryScreen)
   * - All leaderboards user participates in (so scores update)
   * - Team activity feeds (so team sees new workout)
   */
  static async invalidateWorkout(pubkey: string, teamIds?: string[]): Promise<void> {
    console.log('[CacheInvalidation] 🔄 Invalidating workout caches for user:', pubkey);

    // Invalidate user's workout history
    await unifiedCache.invalidate(CacheKeys.USER_WORKOUTS(pubkey));
    console.log('[CacheInvalidation] ✅ Invalidated user workouts');

    // Invalidate leaderboards for all teams user is in
    if (teamIds && teamIds.length > 0) {
      for (const teamId of teamIds) {
        // Invalidate team leaderboards (pattern match for all competitions)
        const leaderboardKeys = ['SEASON_1', 'current_week', 'current_month'];
        for (const key of leaderboardKeys) {
          await unifiedCache.invalidate(`leaderboard_${teamId}_${key}`);
        }

        // Invalidate team activity feed
        await unifiedCache.invalidate(CacheKeys.TEAM_ACTIVITY(teamId));
      }
      console.log(`[CacheInvalidation] ✅ Invalidated leaderboards for ${teamIds.length} teams`);
    }

    // Invalidate global discovered teams (member counts may have changed)
    await unifiedCache.invalidate(CacheKeys.DISCOVERED_TEAMS);
    console.log('[CacheInvalidation] ✅ Invalidated discovered teams');
  }

  /**
   * Invalidate profile-related caches after user updates profile
   *
   * Called after:
   * - Publishing kind 0 (profile metadata update)
   *
   * Invalidates:
   * - User's profile cache (so new name/picture appears immediately)
   */
  static async invalidateProfile(pubkey: string): Promise<void> {
    console.log('[CacheInvalidation] 🔄 Invalidating profile cache for user:', pubkey);

    await unifiedCache.invalidate(CacheKeys.USER_PROFILE(pubkey));
    console.log('[CacheInvalidation] ✅ Invalidated user profile');
  }

  /**
   * Invalidate team membership caches after user joins/leaves team
   *
   * Called after:
   * - Captain approves join request (kind 1104)
   * - User joins team
   * - Captain removes member
   * - User leaves team
   *
   * Invalidates:
   * - User's team list (so new team appears in MyTeamsScreen)
   * - Team's member list (so user appears in team roster)
   * - Team metadata (member count changed)
   * - Join requests (request was processed)
   */
  static async invalidateTeamMembership(pubkey: string, teamId: string): Promise<void> {
    console.log('[CacheInvalidation] 🔄 Invalidating team membership for user:', pubkey, 'team:', teamId);

    // Invalidate user's team list
    await unifiedCache.invalidate(CacheKeys.USER_TEAMS(pubkey));
    console.log('[CacheInvalidation] ✅ Invalidated user teams');

    // Invalidate team's member list
    await unifiedCache.invalidate(CacheKeys.TEAM_MEMBERS(teamId));
    console.log('[CacheInvalidation] ✅ Invalidated team members');

    // Invalidate team metadata (member count changed)
    await unifiedCache.invalidate(CacheKeys.TEAM_METADATA(teamId));
    console.log('[CacheInvalidation] ✅ Invalidated team metadata');

    // Invalidate join requests
    await unifiedCache.invalidate(CacheKeys.JOIN_REQUESTS(teamId));
    console.log('[CacheInvalidation] ✅ Invalidated join requests');
  }

  /**
   * Invalidate competition-related caches after captain creates/modifies competition
   *
   * Called after:
   * - Creating league (kind 30100)
   * - Creating event (kind 30101)
   * - Modifying competition settings
   *
   * Invalidates:
   * - Global competitions list (so new competition appears in discovery)
   * - Team's competitions (so team sees new competition)
   */
  static async invalidateCompetition(teamId: string): Promise<void> {
    console.log('[CacheInvalidation] 🔄 Invalidating competition caches for team:', teamId);

    // Invalidate global competitions list
    await unifiedCache.invalidate(CacheKeys.COMPETITIONS);
    console.log('[CacheInvalidation] ✅ Invalidated global competitions');

    // Invalidate global leagues list
    await unifiedCache.invalidate(CacheKeys.LEAGUES);
    console.log('[CacheInvalidation] ✅ Invalidated leagues');
  }

  /**
   * Invalidate all user-related caches (logout scenario)
   *
   * Called on logout to ensure clean state for next login
   */
  static async invalidateAll(): Promise<void> {
    console.log('[CacheInvalidation] 🔄 Clearing all caches (logout)');

    await unifiedCache.clear();
    console.log('[CacheInvalidation] ✅ All caches cleared');
  }
}

export default CacheInvalidationService;
