/**
 * CacheInvalidator - Smart cache invalidation patterns
 * Handles cascade invalidation when data changes to maintain consistency
 * Ensures dependent caches are cleared when source data updates
 */

import { UnifiedCacheService } from './UnifiedCacheService';

export class CacheInvalidator {
  /**
   * When a user posts a new workout (kind 1301 event)
   * Invalidate all caches that depend on workout data
   */
  static onWorkoutPosted(userNpub: string, teamId?: string): void {
    console.log(`🏃 CacheInvalidator: New workout posted by ${userNpub.slice(0, 12)}...`);

    const patterns: string[] = [
      // User's own workout cache
      `workouts:${userNpub}`,
      `workouts:*${userNpub}*`,

      // All leaderboards that might include this user
      `leaderboards:*`,
      `rankings:*`,

      // Competition queries that include this user
      `competition-workouts:*${userNpub}*`,
    ];

    // If team is known, invalidate team-specific caches
    if (teamId) {
      patterns.push(
        `rankings:*${teamId}*`,
        `team-leaderboard:${teamId}:*`,
        `league:${teamId}:*`,
        `event:${teamId}:*`
      );
    }

    UnifiedCacheService.invalidate(patterns);
  }

  /**
   * When captain adds or approves a new team member
   * Invalidate member lists and dependent competitions
   */
  static onMemberAdded(teamId: string, memberNpub: string): void {
    console.log(`👥 CacheInvalidator: Member ${memberNpub.slice(0, 12)}... added to team ${teamId}`);

    UnifiedCacheService.invalidate([
      // Team member lists
      `members:${teamId}:*`,
      `team-members:${teamId}`,

      // All competitions for this team
      `rankings:*${teamId}*`,
      `leaderboards:*${teamId}*`,
      `league:${teamId}:*`,
      `event:${teamId}:*`,

      // User's team membership status
      `user-teams:${memberNpub}`,
      `team-membership:${memberNpub}:${teamId}`,
    ]);
  }

  /**
   * When captain removes a team member
   * Clear all their data from team competitions
   */
  static onMemberRemoved(teamId: string, memberNpub: string): void {
    console.log(`🚪 CacheInvalidator: Member ${memberNpub.slice(0, 12)}... removed from team ${teamId}`);

    UnifiedCacheService.invalidate([
      // Team member lists
      `members:${teamId}:*`,

      // Competition data needs refresh
      `rankings:*${teamId}*`,
      `leaderboards:*${teamId}*`,

      // User's team data
      `user-teams:${memberNpub}`,
      `team-membership:${memberNpub}:${teamId}`,
    ]);
  }

  /**
   * When competition settings are updated
   * Clear all cached computation results
   */
  static onCompetitionUpdated(competitionId: string, teamId?: string): void {
    console.log(`🏆 CacheInvalidator: Competition ${competitionId} updated`);

    const patterns = [
      // Competition-specific caches
      `competition:${competitionId}`,
      `competition:${competitionId}:*`,
      `rankings:${competitionId}:*`,
      `leaderboard:${competitionId}:*`,
      `winners:${competitionId}`,

      // Workout queries for this competition
      `competition-workouts:${competitionId}:*`,
    ];

    if (teamId) {
      patterns.push(
        `league:${teamId}:*`,
        `event:${teamId}:*`
      );
    }

    UnifiedCacheService.invalidate(patterns);
  }

  /**
   * When team settings are updated
   * Invalidate team and all related competition caches
   */
  static onTeamUpdated(teamId: string): void {
    console.log(`🎯 CacheInvalidator: Team ${teamId} updated`);

    UnifiedCacheService.invalidate([
      // Team data
      `team:${teamId}`,
      `team:${teamId}:*`,

      // All team competitions
      `rankings:*${teamId}*`,
      `league:${teamId}:*`,
      `event:${teamId}:*`,
      `challenge:${teamId}:*`,

      // Team discovery might show updated info
      'teams:discovery',
      'teams:all',
    ]);
  }

  /**
   * When user profile is updated (kind 0 event)
   * Clear profile caches
   */
  static onProfileUpdated(npub: string): void {
    console.log(`👤 CacheInvalidator: Profile ${npub.slice(0, 12)}... updated`);

    UnifiedCacheService.invalidate([
      // User's profile
      `profile:${npub}`,

      // Any cached data that includes profile info
      `user:${npub}:*`,
    ]);
  }

  /**
   * When user joins a team
   * Clear team discovery and membership caches
   */
  static onTeamJoined(teamId: string, userNpub: string): void {
    console.log(`🤝 CacheInvalidator: User ${userNpub.slice(0, 12)}... joined team ${teamId}`);

    UnifiedCacheService.invalidate([
      // User's teams
      `user-teams:${userNpub}`,
      `team-membership:${userNpub}:*`,

      // Team might need member count update
      `team:${teamId}`,

      // Not in member list yet (pending approval)
      // Don't invalidate members cache
    ]);
  }

  /**
   * When user leaves a team
   * Clear team and membership caches
   */
  static onTeamLeft(teamId: string, userNpub: string): void {
    console.log(`👋 CacheInvalidator: User ${userNpub.slice(0, 12)}... left team ${teamId}`);

    UnifiedCacheService.invalidate([
      // User's teams
      `user-teams:${userNpub}`,
      `team-membership:${userNpub}:${teamId}`,

      // Team data
      `team:${teamId}`,
      `members:${teamId}:*`,

      // Remove from competitions
      `rankings:*${teamId}*`,
    ]);
  }

  /**
   * When captain creates a new competition
   * Clear team competition lists
   */
  static onCompetitionCreated(teamId: string, competitionType: 'league' | 'event' | 'challenge'): void {
    console.log(`🎉 CacheInvalidator: New ${competitionType} created for team ${teamId}`);

    UnifiedCacheService.invalidate([
      // Team's competition lists
      `${competitionType}s:${teamId}`,
      `team-${competitionType}s:${teamId}`,
      `competitions:${teamId}`,

      // Team data might show competition count
      `team:${teamId}`,
    ]);
  }

  /**
   * When Bitcoin rewards are distributed
   * Clear wallet and winner caches
   */
  static onRewardsDistributed(competitionId: string, teamId: string): void {
    console.log(`💰 CacheInvalidator: Rewards distributed for competition ${competitionId}`);

    UnifiedCacheService.invalidate([
      // Competition winners
      `winners:${competitionId}`,
      `competition:${competitionId}:winners`,

      // Team wallet balances
      `wallet:${teamId}`,
      `team-wallet:${teamId}`,

      // Competition state
      `competition:${competitionId}`,
    ]);
  }

  /**
   * When relay connection status changes
   * Clear relay-dependent caches
   */
  static onRelayStatusChanged(relayUrl: string, isConnected: boolean): void {
    console.log(`📡 CacheInvalidator: Relay ${relayUrl} status: ${isConnected ? 'connected' : 'disconnected'}`);

    if (!isConnected) {
      // Don't invalidate data caches when relay disconnects
      // We want to show cached data when offline
      return;
    }

    // When relay reconnects, we might want to refresh critical data
    // But don't invalidate everything to avoid cache storms
    console.log('📡 CacheInvalidator: Relay reconnected, background refresh may occur');
  }

  /**
   * Force refresh all data for a specific user
   * Used for pull-to-refresh on profile
   */
  static onUserRefresh(userNpub: string): void {
    console.log(`🔄 CacheInvalidator: Full refresh for user ${userNpub.slice(0, 12)}...`);

    UnifiedCacheService.invalidate([
      // User's profile and workouts
      `profile:${userNpub}`,
      `workouts:${userNpub}`,
      `workouts:*${userNpub}*`,

      // User's teams
      `user-teams:${userNpub}`,
      `team-membership:${userNpub}:*`,

      // User's competition data
      `user-competitions:${userNpub}`,
      `user-rankings:*${userNpub}*`,
    ]);
  }

  /**
   * Force refresh all data for a specific team
   * Used for pull-to-refresh on team page
   */
  static onTeamRefresh(teamId: string): void {
    console.log(`🔄 CacheInvalidator: Full refresh for team ${teamId}`);

    UnifiedCacheService.invalidate([
      // All team data
      `team:${teamId}`,
      `team:${teamId}:*`,
      `members:${teamId}:*`,

      // All team competitions
      `rankings:*${teamId}*`,
      `league:${teamId}:*`,
      `event:${teamId}:*`,
      `challenge:${teamId}:*`,
      `competitions:${teamId}`,

      // Team wallet
      `wallet:${teamId}`,
    ]);
  }

  /**
   * Clear all caches (nuclear option)
   * Used for debugging or sign out
   */
  static async clearAll(): Promise<void> {
    console.log('💥 CacheInvalidator: Clearing ALL caches');
    await UnifiedCacheService.clearAll();
  }

  /**
   * Selective cache warming
   * Pre-fetch likely needed data during idle time
   */
  static async warmCache(userNpub: string, teamIds: string[]): Promise<void> {
    console.log(`🔥 CacheInvalidator: Warming cache for user ${userNpub.slice(0, 12)}...`);

    // This would be called during app startup or idle time
    // to pre-populate caches with likely-needed data
    // Implementation depends on specific warming strategy
  }
}

export default CacheInvalidator;