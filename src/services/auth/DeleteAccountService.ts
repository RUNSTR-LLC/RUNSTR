/**
 * DeleteAccountService - Handles complete account deletion
 * Implements NIP-09 deletion requests and local data cleanup
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NDK, NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { SimpleNostrService } from '../nostr/SimpleNostrService';

export class DeleteAccountService {
  private static instance: DeleteAccountService;
  private ndk: NDK | null = null;

  private constructor() {}

  static getInstance(): DeleteAccountService {
    if (!DeleteAccountService.instance) {
      DeleteAccountService.instance = new DeleteAccountService();
    }
    return DeleteAccountService.instance;
  }

  /**
   * Complete account deletion process
   * Returns true if successful, throws error otherwise
   */
  async deleteAccount(): Promise<boolean> {
    console.log('🗑️ DeleteAccountService: Starting account deletion...');

    try {
      // Step 1: Get user's nsec for signing deletion requests
      const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
      if (!nsec) {
        throw new Error('No user session found');
      }

      // Step 2: Initialize NDK with user's signer for deletion requests
      await this.initializeNDK(nsec);

      // Step 3: Send NIP-09 deletion requests to Nostr relays
      await this.sendDeletionRequests();

      // Step 4: Clear all local data
      await this.clearAllLocalData();

      // Step 5: Cleanup NDK connection
      this.cleanupNDK();

      console.log('✅ DeleteAccountService: Account deletion completed');
      return true;
    } catch (error) {
      console.error('❌ DeleteAccountService: Deletion failed', error);
      throw error;
    }
  }

  /**
   * Initialize NDK with user's signer for deletion requests
   */
  private async initializeNDK(nsec: string): Promise<void> {
    try {
      const signer = new NDKPrivateKeySigner(nsec);
      this.ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.damus.io',
          'wss://relay.primal.net',
          'wss://nos.lol',
          'wss://relay.nostr.band',
        ],
        signer,
      });

      await this.ndk.connect();
      console.log('✅ DeleteAccountService: NDK initialized for deletion');
    } catch (error) {
      console.error('Failed to initialize NDK for deletion:', error);
      throw new Error('Failed to initialize deletion service');
    }
  }

  /**
   * Send NIP-09 deletion requests for user's events
   */
  private async sendDeletionRequests(): Promise<void> {
    if (!this.ndk || !this.ndk.signer) {
      throw new Error('NDK not initialized');
    }

    try {
      const user = await this.ndk.signer.user();
      const pubkey = user.pubkey;

      console.log('📤 Sending deletion requests for user:', pubkey);

      // Get user's recent events to delete
      const eventKindsToDelete = [
        0,     // Profile metadata
        1,     // Text notes (social posts)
        1301,  // Workout events
        30000, // People lists (team memberships)
        30001, // Thing lists
      ];

      // Query user's events
      const events = await this.ndk.fetchEvents({
        authors: [pubkey],
        kinds: eventKindsToDelete,
        limit: 100, // Delete last 100 events of each kind
      });

      console.log(`Found ${events.size} events to delete`);

      // Create deletion request events (NIP-09 kind 5)
      const deletionPromises: Promise<void>[] = [];

      for (const event of events) {
        const deletionEvent = new NDKEvent(this.ndk);
        deletionEvent.kind = 5; // NIP-09 deletion request
        deletionEvent.content = 'User requested account deletion';
        deletionEvent.tags = [
          ['e', event.id], // Reference to event being deleted
        ];

        // Add kind tag for better relay handling
        if (event.kind !== undefined) {
          deletionEvent.tags.push(['k', event.kind.toString()]);
        }

        deletionPromises.push(
          deletionEvent.publish().then(() => {
            console.log(`Deletion request sent for event ${event.id}`);
          }).catch((error) => {
            console.error(`Failed to delete event ${event.id}:`, error);
          })
        );
      }

      // Send all deletion requests
      await Promise.allSettled(deletionPromises);

      console.log('✅ Deletion requests sent to Nostr relays');
    } catch (error) {
      console.error('Error sending deletion requests:', error);
      // Don't throw - continue with local deletion even if Nostr deletion fails
    }
  }

  /**
   * Clear all local data from AsyncStorage
   */
  private async clearAllLocalData(): Promise<void> {
    console.log('🧹 Clearing all local data...');

    try {
      // Get all keys from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();

      // Filter RUNSTR-related keys
      const runstrKeys = allKeys.filter(key =>
        key.includes('@runstr') ||
        key.includes('workout') ||
        key.includes('team') ||
        key.includes('captain') ||
        key.includes('competition') ||
        key.includes('notification') ||
        key.includes('wallet') ||
        key.includes('nutzap') ||
        key.includes('cache')
      );

      console.log(`Found ${runstrKeys.length} keys to delete`);

      // Delete all RUNSTR keys
      if (runstrKeys.length > 0) {
        await AsyncStorage.multiRemove(runstrKeys);
      }

      // Also clear specific known keys to be thorough
      const specificKeys = [
        '@runstr:user_nsec',
        '@runstr:npub',
        '@runstr:hex_pubkey',
        '@runstr:user_role',
        '@runstr:user_profile',
        '@runstr:joined_teams',
        '@runstr:captain_teams',
        '@runstr:notification_settings',
        '@runstr:workout_cache',
        '@runstr:team_cache',
        'user_workouts_merged',
        'workouts_merge_time',
        'workouts_cache_version',
      ];

      await AsyncStorage.multiRemove(specificKeys);

      console.log('✅ All local data cleared');
    } catch (error) {
      console.error('Error clearing local data:', error);
      throw new Error('Failed to clear local data');
    }
  }

  /**
   * Cleanup NDK connection
   */
  private cleanupNDK(): void {
    if (this.ndk) {
      // Disconnect from all relays
      for (const relay of this.ndk.pool.relays.values()) {
        relay.disconnect();
      }
      this.ndk = null;
    }
  }

  /**
   * Get a summary of data that will be deleted
   * Useful for showing to user before deletion
   */
  async getDataSummary(): Promise<{
    hasWallet: boolean;
    teamCount: number;
    workoutCount: number;
  }> {
    try {
      // Check for wallet
      const walletData = await AsyncStorage.getItem('@runstr:nutzap_wallet');
      const hasWallet = !!walletData;

      // Check team memberships
      const joinedTeams = await AsyncStorage.getItem('@runstr:joined_teams');
      const teamCount = joinedTeams ? JSON.parse(joinedTeams).length : 0;

      // Check cached workouts
      const workoutCache = await AsyncStorage.getItem('user_workouts_merged');
      const workoutCount = workoutCache ? JSON.parse(workoutCache).allWorkouts?.length || 0 : 0;

      return {
        hasWallet,
        teamCount,
        workoutCount,
      };
    } catch (error) {
      console.error('Error getting data summary:', error);
      return {
        hasWallet: false,
        teamCount: 0,
        workoutCount: 0,
      };
    }
  }
}