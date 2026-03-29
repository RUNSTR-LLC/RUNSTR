/**
 * RunningBitcoinService - Running Bitcoin Challenge Service
 *
 * A featured charity event honoring Hal Finney (Bitcoin pioneer and ALS patient).
 * Uses Supabase workout_submissions for verified, anti-cheat validated data.
 *
 * Features:
 * - Queries Supabase for verified workouts (anti-cheat validated)
 * - Allows local joining for non-Season II users
 * - Filters for running + walking activities only
 * - Tracks 21km goal completion (finishers)
 * - All finishers earn 1,000 sats (auto-paid on share completion)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { type CachedWorkout } from '../cache/UnifiedWorkoutCache';
import {
  RUNNING_BITCOIN_CONFIG,
  getRunningBitcoinStatus,
  getRunningBitcoinStartTimestamp,
  getRunningBitcoinEndTimestamp,
} from '../../constants/runningBitcoin';
import { SEASON_2_PARTICIPANTS } from '../../constants/season2';
import { RewardLightningAddressService } from '../rewards/RewardLightningAddressService';
import { NWCGatewayService } from '../rewards/NWCGatewayService';
import { getInvoiceFromLightningAddress } from '../../utils/lnurl';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { SupabaseCompetitionService } from '../backend/SupabaseCompetitionService';
import { ProfileCache } from '../../cache/ProfileCache';
import { nip19 } from 'nostr-tools';
import { PendingSubmissionService, PendingSubmission } from '../competition/PendingSubmissionService';
import { SecureNsecStorage } from '../auth/SecureNsecStorage';

const JOINED_USERS_KEY = '@runstr:running_bitcoin_joined';
const REWARDS_CLAIMED_KEY = '@runstr:running_bitcoin_rewards_claimed';

export interface RunningBitcoinParticipant {
  pubkey: string;
  npub?: string;
  name: string;
  picture?: string;
  totalDistanceKm: number;
  workoutCount: number;
  isFinisher: boolean;
  finisherRank?: number;
  isJoined: boolean; // true if user has joined the challenge
}

export interface RunningBitcoinLeaderboard {
  participants: RunningBitcoinParticipant[];
  finishers: RunningBitcoinParticipant[];
  totalParticipants: number;
  totalDistanceKm: number;
  lastUpdated: number;
}

export interface RunningBitcoinProgress {
  distanceKm: number;
  goalKm: number;
  percentComplete: number;
  isFinisher: boolean;
  finisherRank?: number;
  workoutCount: number;
}

export interface ShareCompletionResult {
  success: boolean;
  error?: string;
  postEventId?: string;
  rewardPaid: boolean;
  rewardError?: string;
}

class RunningBitcoinServiceClass {
  private static instance: RunningBitcoinServiceClass;

  static getInstance(): RunningBitcoinServiceClass {
    if (!this.instance) {
      this.instance = new RunningBitcoinServiceClass();
    }
    return this.instance;
  }

  /**
   * Get the Running Bitcoin Challenge leaderboard
   * Queries Supabase workout_submissions for verified workouts
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   */
  async getLeaderboard(forceRefresh: boolean = false): Promise<RunningBitcoinLeaderboard> {
    const startTime = Date.now();
    console.log(`[RunningBitcoin] ========== getLeaderboard(forceRefresh=${forceRefresh}) ==========`);

    // If event hasn't started yet, return empty leaderboard
    const status = getRunningBitcoinStatus();
    if (status === 'upcoming') {
      console.log('[RunningBitcoin] Event is upcoming - returning empty leaderboard');
      return this.emptyLeaderboard();
    }

    try {
      // Get Running Bitcoin date range timestamps
      const startTs = getRunningBitcoinStartTimestamp();
      const endTs = getRunningBitcoinEndTimestamp();
      console.log(`[RunningBitcoin] Date range: ${new Date(startTs * 1000).toLocaleDateString()} - ${new Date(endTs * 1000).toLocaleDateString()}`);

      // Query Supabase for running + walking workouts in date range
      console.log(`[RunningBitcoin] 🔍 Fetching workouts from Supabase (Jan 10+ date range)`);
      const workouts = await this.fetchWorkoutsFromSupabase(startTs, endTs);
      console.log(`[RunningBitcoin] 📊 Total workouts from Supabase: ${workouts.length}`);

      const runningWorkouts = workouts.filter(w => w.activityType === 'running');
      const walkingWorkouts = workouts.filter(w => w.activityType === 'walking');

      console.log(`[RunningBitcoin] 🏃 Running: ${runningWorkouts.length}, 🚶 Walking: ${walkingWorkouts.length}`);

      // Get ALL joined participants from Supabase (source of truth)
      const joinedParticipants = await this.getAllJoinedParticipantsFromSupabase();
      const eligiblePubkeys = new Set(joinedParticipants.keys());

      // Also include local joins (for instant UI feedback before Supabase sync)
      const localJoins = await this.getLocallyJoinedUsers();
      for (const pubkey of localJoins) {
        eligiblePubkeys.add(pubkey);
      }

      console.log(`[RunningBitcoin] 👥 Eligible participants: ${eligiblePubkeys.size} (Supabase: ${joinedParticipants.size}, local: ${localJoins.length})`)

      // Aggregate distance per participant (convert npub to pubkey for compatibility)
      const stats = new Map<string, { distance: number; workoutCount: number }>();

      for (const w of [...runningWorkouts, ...walkingWorkouts]) {
        // Convert npub to pubkey for eligibility check
        let pubkey = w.pubkey;
        if (w.npub && !pubkey) {
          try {
            const decoded = nip19.decode(w.npub);
            pubkey = decoded.data as string;
          } catch {
            continue; // Skip invalid npub
          }
        }
        if (!pubkey || !eligiblePubkeys.has(pubkey)) continue;

        const existing = stats.get(pubkey) || { distance: 0, workoutCount: 0 };
        existing.distance += w.distance;
        existing.workoutCount += 1;
        stats.set(pubkey, existing);
      }

      // LOCAL-FIRST: Merge pending submissions for instant user appearance
      const pendingSubmissions = await this.getPendingForDateRange(startTs, endTs);
      const eligiblePending = pendingSubmissions.filter(
        p => p.submissionData.type?.toLowerCase() === 'running' ||
             p.submissionData.type?.toLowerCase() === 'walking'
      );

      if (eligiblePending.length > 0) {
        console.log(`[RunningBitcoin] Merging ${eligiblePending.length} pending workouts`);

        for (const pending of eligiblePending) {
          // Convert npub to pubkey
          let pubkey = '';
          try {
            const decoded = nip19.decode(pending.submissionData.npub);
            pubkey = decoded.data as string;
          } catch {
            continue; // Skip invalid npub
          }

          // Only include if user is eligible (joined)
          if (!eligiblePubkeys.has(pubkey)) continue;

          // Distance is in meters, convert to km
          const distanceKm = (pending.submissionData.distance || 0) / 1000;

          if (distanceKm > 0) {
            const existing = stats.get(pubkey) || { distance: 0, workoutCount: 0 };
            existing.distance += distanceKm;
            existing.workoutCount += 1;
            stats.set(pubkey, existing);
          }
        }
      }

      console.log(`[RunningBitcoin] ✅ Aggregated stats for ${stats.size} participants`);

      // Build participant entries with profile data from Supabase
      const participantEntries: RunningBitcoinParticipant[] = [];
      for (const [pubkey, data] of stats) {
        // Get profile from Supabase joined participants (or Season II as fallback)
        const supabaseProfile = joinedParticipants.get(pubkey);
        const season2Profile = SEASON_2_PARTICIPANTS.find(p => p.pubkey === pubkey);

        let name = supabaseProfile?.name || season2Profile?.name;
        let picture = supabaseProfile?.picture || season2Profile?.picture;
        let npub = supabaseProfile?.npub || season2Profile?.npub;

        if (!npub) {
          try {
            npub = nip19.npubEncode(pubkey);
          } catch {
            // Ignore encoding errors
          }
        }

        participantEntries.push({
          pubkey,
          npub,
          name: name || `User ${pubkey.slice(0, 8)}`,
          picture,
          totalDistanceKm: data.distance,
          workoutCount: data.workoutCount,
          isFinisher: data.distance >= RUNNING_BITCOIN_CONFIG.goalDistanceKm,
          isJoined: true,
        });
      }

      // Add joined users who have 0 workouts (so they appear on leaderboard after joining)
      const participantPubkeys = new Set(participantEntries.map(p => p.pubkey));

      // Add from Supabase joined participants with 0 workouts
      for (const [pubkey, profile] of joinedParticipants) {
        if (!participantPubkeys.has(pubkey)) {
          participantEntries.push({
            pubkey,
            npub: profile.npub,
            name: profile.name || `User ${pubkey.slice(0, 8)}`,
            picture: profile.picture,
            totalDistanceKm: 0,
            workoutCount: 0,
            isFinisher: false,
            isJoined: true,
          });
        }
      }

      // Add local joins with 0 workouts (for instant UI before Supabase sync)
      const participantPubkeysAfterSupabase = new Set(participantEntries.map(p => p.pubkey));
      for (const joinedPubkey of localJoins) {
        if (!participantPubkeysAfterSupabase.has(joinedPubkey)) {
          let npub: string | undefined;
          try {
            npub = nip19.npubEncode(joinedPubkey);
          } catch {
            // Ignore encoding errors
          }

          participantEntries.push({
            pubkey: joinedPubkey,
            npub,
            name: `User ${joinedPubkey.slice(0, 8)}`,
            picture: undefined,
            totalDistanceKm: 0,
            workoutCount: 0,
            isFinisher: false,
            isJoined: true,
          });
        }
      }

      // Sort by distance (descending)
      participantEntries.sort((a, b) => b.totalDistanceKm - a.totalDistanceKm);

      // Assign finisher ranks
      let finisherRank = 1;
      for (const participant of participantEntries) {
        if (participant.isFinisher) {
          participant.finisherRank = finisherRank;
          finisherRank++;
        }
      }

      // Get finishers list
      const finishers = participantEntries.filter(p => p.isFinisher);

      // Calculate totals
      const totalDistanceKm = participantEntries.reduce((sum, p) => sum + p.totalDistanceKm, 0);

      console.log(`[RunningBitcoin] Leaderboard built in ${Date.now() - startTime}ms`);
      console.log(`[RunningBitcoin]   - Active participants: ${participantEntries.length}`);
      console.log(`[RunningBitcoin]   - Finishers: ${finishers.length}`);
      console.log(`[RunningBitcoin]   - Total distance: ${totalDistanceKm.toFixed(2)} km`);

      return {
        participants: participantEntries,
        finishers,
        totalParticipants: eligiblePubkeys.size,
        totalDistanceKm,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('[RunningBitcoin] Error getting leaderboard:', error);
      return this.emptyLeaderboard();
    }
  }

  /**
   * Get a single user's progress in the challenge
   */
  async getUserProgress(pubkey: string): Promise<RunningBitcoinProgress> {
    const leaderboard = await this.getLeaderboard();
    const userEntry = leaderboard.participants.find(p => p.pubkey === pubkey);

    const distanceKm = userEntry?.totalDistanceKm || 0;
    const isFinisher = distanceKm >= RUNNING_BITCOIN_CONFIG.goalDistanceKm;
    const percentComplete = Math.min(100, (distanceKm / RUNNING_BITCOIN_CONFIG.goalDistanceKm) * 100);

    return {
      distanceKm,
      goalKm: RUNNING_BITCOIN_CONFIG.goalDistanceKm,
      percentComplete,
      isFinisher,
      finisherRank: userEntry?.finisherRank,
      workoutCount: userEntry?.workoutCount || 0,
    };
  }

  /**
   * Get list of finishers (those who completed 21K)
   */
  async getFinishers(): Promise<RunningBitcoinParticipant[]> {
    const leaderboard = await this.getLeaderboard();
    return leaderboard.finishers;
  }

  /**
   * Get pending submissions for a date range
   * Used for hybrid leaderboards to merge local pending workouts
   */
  private async getPendingForDateRange(startTs: number, endTs: number): Promise<PendingSubmission[]> {
    try {
      const allPending = await PendingSubmissionService.getPending();

      // Filter to submissions within the date range (using startTime)
      return allPending.filter(p => {
        const submissionTime = new Date(p.submissionData.startTime).getTime() / 1000;
        return submissionTime >= startTs && submissionTime <= endTs;
      });
    } catch (error) {
      console.warn('[RunningBitcoin] Failed to get pending submissions:', error);
      return [];
    }
  }

  /**
   * Create empty leaderboard structure
   */
  private emptyLeaderboard(): RunningBitcoinLeaderboard {
    return {
      participants: [],
      finishers: [],
      totalParticipants: 0,
      totalDistanceKm: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Fetch workouts from Supabase for Running Bitcoin date range
   * Queries running + walking workouts that have been validated by anti-cheat
   */
  private async fetchWorkoutsFromSupabase(
    startTs: number,
    endTs: number
  ): Promise<Array<{ npub: string; pubkey: string; distance: number; activityType: string; createdAt: number }>> {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[RunningBitcoin] Supabase not configured');
      return [];
    }

    try {
      const startDate = new Date(startTs * 1000).toISOString();
      const endDate = new Date(endTs * 1000).toISOString();

      // Query running + walking workouts in date range
      // Include event_id to filter out step-estimated submissions (steps_ prefix)
      const url = `${supabaseUrl}/rest/v1/workout_submissions?` +
        `activity_type=in.(running,walking)&` +
        `created_at=gte.${startDate}&` +
        `created_at=lte.${endDate}&` +
        `select=npub,distance_meters,activity_type,created_at,event_id&` +
        `limit=10000`;

      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      if (!response.ok) {
        console.error('[RunningBitcoin] Failed to fetch workouts:', response.status);
        return [];
      }

      const data = await response.json();
      console.log(`[RunningBitcoin] Fetched ${data.length} workouts from Supabase`);

      // Filter out step-estimated submissions (event_id starts with "steps_")
      // These are synthetic walking workouts from StepCompetitionService that
      // would double-count distance when a user also GPS-tracks a walk/run.
      const filtered = data.filter((row: { event_id?: string }) =>
        !row.event_id?.startsWith('steps_')
      );
      if (filtered.length < data.length) {
        console.log(`[RunningBitcoin] Excluded ${data.length - filtered.length} step-estimated submissions`);
      }

      // Transform to internal format
      return filtered.map((row: {
        npub: string;
        distance_meters: number | null;
        activity_type: string;
        created_at: string;
        event_id?: string;
      }) => {
        // Convert npub to pubkey
        let pubkey = '';
        try {
          const decoded = nip19.decode(row.npub);
          pubkey = decoded.data as string;
        } catch {
          // Keep empty if decode fails
        }

        return {
          npub: row.npub,
          pubkey,
          distance: (row.distance_meters || 0) / 1000, // Convert to km
          activityType: row.activity_type,
          createdAt: new Date(row.created_at).getTime() / 1000,
        };
      });
    } catch (error) {
      console.error('[RunningBitcoin] Error fetching workouts from Supabase:', error);
      return [];
    }
  }

  /**
   * Join the Running Bitcoin Challenge
   * Adds user pubkey to local storage AND registers in Supabase
   */
  async joinChallenge(pubkey: string): Promise<boolean> {
    try {
      // Add to local storage for fast UI updates
      const joinedUsers = await this.getLocallyJoinedUsers();
      if (!joinedUsers.includes(pubkey)) {
        joinedUsers.push(pubkey);
        await AsyncStorage.setItem(JOINED_USERS_KEY, JSON.stringify(joinedUsers));
        console.log(`[RunningBitcoin] User ${pubkey.slice(0, 8)} joined the challenge`);
      }

      // Also register in Supabase (fire-and-forget for UX)
      const npub = nip19.npubEncode(pubkey);
      this.registerInSupabase(npub).catch(err => {
        console.warn('[RunningBitcoin] Failed to register in Supabase (non-blocking):', err);
      });

      return true;
    } catch (error) {
      console.error('[RunningBitcoin] Error joining challenge:', error);
      return false;
    }
  }

  /**
   * Check if user has joined the challenge
   */
  async hasJoined(pubkey: string): Promise<boolean> {
    try {
      // Check if user is a Season II participant (auto-joined)
      const isSeason2 = SEASON_2_PARTICIPANTS.some(p => p.pubkey === pubkey);
      if (isSeason2) return true;

      // Check local join list
      const joinedUsers = await this.getLocallyJoinedUsers();
      return joinedUsers.includes(pubkey);
    } catch (error) {
      console.error('[RunningBitcoin] Error checking join status:', error);
      return false;
    }
  }

  /**
   * Get list of locally joined users (not Season II participants)
   */
  async getLocallyJoinedUsers(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(JOINED_USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[RunningBitcoin] Error getting joined users:', error);
      return [];
    }
  }

  /**
   * Leave the challenge (remove local join)
   */
  async leaveChallenge(pubkey: string): Promise<boolean> {
    try {
      const joinedUsers = await this.getLocallyJoinedUsers();
      const filtered = joinedUsers.filter(p => p !== pubkey);
      await AsyncStorage.setItem(JOINED_USERS_KEY, JSON.stringify(filtered));
      console.log(`[RunningBitcoin] User ${pubkey.slice(0, 8)} left the challenge`);
      return true;
    } catch (error) {
      console.error('[RunningBitcoin] Error leaving challenge:', error);
      return false;
    }
  }

  /**
   * Get user's validated total distance from Supabase
   * Only counts running + walking workouts within Running Bitcoin date range
   */
  async getUserTotalFromSupabase(npub: string): Promise<number> {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[RunningBitcoin] Supabase not configured');
      return 0;
    }

    try {
      // Get Running Bitcoin date range
      const startDate = RUNNING_BITCOIN_CONFIG.startDate.toISOString();
      const endDate = RUNNING_BITCOIN_CONFIG.endDate.toISOString();

      // Query workout_submissions for this user's running + walking workouts
      // within the Running Bitcoin date range (include event_id to filter step submissions)
      const url = `${supabaseUrl}/rest/v1/workout_submissions?npub=eq.${npub}&created_at=gte.${startDate}&created_at=lte.${endDate}&activity_type=in.(running,walking)&select=distance_meters,event_id`;

      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      if (!response.ok) {
        console.error('[RunningBitcoin] Failed to fetch user total:', response.status);
        return 0;
      }

      const workouts = await response.json();

      // Filter out step-estimated submissions to prevent double-counting
      const gpsWorkouts = workouts.filter(
        (w: { event_id?: string }) => !w.event_id?.startsWith('steps_')
      );

      // Sum up all distance in km
      const totalKm = gpsWorkouts.reduce((sum: number, w: { distance_meters: number | null }) => {
        return sum + ((w.distance_meters || 0) / 1000);
      }, 0);

      console.log(`[RunningBitcoin] User ${npub.slice(0, 12)} total from Supabase: ${totalKm.toFixed(2)} km`);
      return totalKm;
    } catch (error) {
      console.error('[RunningBitcoin] Error fetching user total:', error);
      return 0;
    }
  }

  /**
   * Check if user has completed 21km and auto-pay reward
   * Called after each successful workout submission to Supabase
   */
  async checkAndAutoPayReward(npub: string): Promise<{ paid: boolean; error?: string }> {
    console.log('[RunningBitcoin] Checking auto-pay eligibility...');

    try {
      // Get user's pubkey from npub for reward tracking
      let pubkey: string;
      try {
        const decoded = nip19.decode(npub);
        pubkey = decoded.data as string;
      } catch {
        console.error('[RunningBitcoin] Invalid npub format');
        return { paid: false, error: 'Invalid npub format' };
      }

      // Check if already claimed
      const alreadyClaimed = await this.hasClaimedReward(pubkey);
      if (alreadyClaimed) {
        console.log('[RunningBitcoin] Reward already claimed');
        return { paid: false };
      }

      // Get validated total from Supabase
      const totalKm = await this.getUserTotalFromSupabase(npub);

      if (totalKm < RUNNING_BITCOIN_CONFIG.goalDistanceKm) {
        console.log(`[RunningBitcoin] User has ${totalKm.toFixed(2)} km - not yet at ${RUNNING_BITCOIN_CONFIG.goalDistanceKm} km goal`);
        return { paid: false };
      }

      console.log(`[RunningBitcoin] 🎉 User completed ${totalKm.toFixed(2)} km! Initiating auto-pay...`);

      // Get user's Lightning address
      const lnAddress = await RewardLightningAddressService.getRewardLightningAddress();
      if (!lnAddress) {
        console.log('[RunningBitcoin] No Lightning address - cannot auto-pay');
        return { paid: false, error: 'No Lightning address configured' };
      }

      // Request invoice from Lightning address
      let invoice: string;
      try {
        const invoiceResult = await getInvoiceFromLightningAddress(
          lnAddress,
          RUNNING_BITCOIN_CONFIG.finisherRewardSats,
          'Running Bitcoin - 21km Finisher Reward!'
        );
        invoice = invoiceResult.invoice;
        console.log('[RunningBitcoin] Got invoice for auto-pay');
      } catch (invoiceError) {
        console.error('[RunningBitcoin] Failed to get invoice:', invoiceError);
        return { paid: false, error: 'Failed to get invoice from Lightning address' };
      }

      // Pay the invoice
      const payResult = await NWCGatewayService.payInvoice(invoice);

      if (payResult.success) {
        // Mark reward as claimed
        await this.markRewardClaimed(pubkey);
        console.log('[RunningBitcoin] ✅ Auto-paid 1000 sats for completing 21km!');
        return { paid: true };
      } else {
        console.error('[RunningBitcoin] Payment failed:', payResult.error);
        return { paid: false, error: payResult.error || 'Payment failed' };
      }
    } catch (error) {
      console.error('[RunningBitcoin] Auto-pay error:', error);
      return { paid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Register user in Supabase for Running Bitcoin competition
   * Fetches user's Nostr profile and stores name/picture for leaderboard display
   * Called when joining locally or when Season II participant submits workout
   */
  async registerInSupabase(npub: string): Promise<boolean> {
    try {
      // Decode npub to get pubkey for profile lookup
      let pubkey: string;
      try {
        const decoded = nip19.decode(npub);
        pubkey = decoded.data as string;
      } catch {
        console.warn('[RunningBitcoin] Could not decode npub for profile lookup');
        // Still register without profile data
        const result = await SupabaseCompetitionService.joinCompetition('running-bitcoin');
        return result.success;
      }

      // Fetch user's Nostr profile (kind 0) for name and picture
      let profileData: { name?: string; picture?: string } | undefined;
      try {
        const profiles = await ProfileCache.fetchProfiles([pubkey]);
        const profile = profiles.get(pubkey);
        if (profile) {
          profileData = {
            name: profile.name,
            picture: profile.picture,
          };
          console.log(`[RunningBitcoin] Fetched profile for ${npub.slice(0, 12)}: ${profile.name || 'no name'}`);
        }
      } catch (profileError) {
        console.warn('[RunningBitcoin] Profile fetch failed (non-blocking):', profileError);
        // Continue without profile data
      }

      // Register in Supabase with profile data
      const result = await SupabaseCompetitionService.joinCompetition(
        'running-bitcoin',
        profileData
      );

      if (result.success) {
        console.log(`[RunningBitcoin] Registered ${npub.slice(0, 12)} in Supabase${profileData?.name ? ` as ${profileData.name}` : ''}`);
      }
      return result.success;
    } catch (error) {
      console.error('[RunningBitcoin] Failed to register in Supabase:', error);
      return false;
    }
  }

  /**
   * Get ALL joined participants from Supabase (npub, pubkey, name, picture)
   * This is the source of truth for who is in the competition
   */
  async getAllJoinedParticipantsFromSupabase(): Promise<Map<string, { npub: string; pubkey: string; name?: string; picture?: string }>> {
    const participants = new Map<string, { npub: string; pubkey: string; name?: string; picture?: string }>();

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return participants;
    }

    try {
      // Query competition_participants for running-bitcoin
      const url = `${supabaseUrl}/rest/v1/competitions?external_id=eq.running-bitcoin&select=id`;

      const compResponse = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      if (!compResponse.ok) {
        console.warn('[RunningBitcoin] Failed to fetch competition ID');
        return participants;
      }

      const competitions = await compResponse.json();
      if (!competitions || competitions.length === 0) {
        return participants;
      }

      const competitionId = competitions[0].id;

      // Now fetch participants with profiles
      const participantsUrl = `${supabaseUrl}/rest/v1/competition_participants?competition_id=eq.${competitionId}&select=npub,name,picture`;

      const participantsResponse = await fetch(participantsUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      if (!participantsResponse.ok) {
        console.warn('[RunningBitcoin] Failed to fetch participant profiles');
        return participants;
      }

      const data = await participantsResponse.json();

      for (const row of data) {
        if (row.npub) {
          // Convert npub to pubkey
          let pubkey = '';
          try {
            const decoded = nip19.decode(row.npub);
            // npub decode returns { type: 'npub', data: string (hex pubkey) }
            pubkey = typeof decoded.data === 'string' ? decoded.data : '';
            if (!pubkey) continue;
          } catch {
            continue; // Skip invalid npub
          }

          participants.set(pubkey, {
            npub: row.npub,
            pubkey,
            name: row.name,
            picture: row.picture,
          });
        }
      }

      console.log(`[RunningBitcoin] Loaded ${participants.size} joined participants from Supabase`);

      // Enrich participants with Nostr profiles for those with null names
      await this.enrichParticipantsWithNostrProfiles(participants);

      return participants;
    } catch (error) {
      console.warn('[RunningBitcoin] Error fetching Supabase participants:', error);
      return participants;
    }
  }

  /**
   * Enrich participants with Nostr profile data for those with null names
   * Fetches kind 0 profiles from Nostr as a fallback when Supabase has no profile data
   */
  private async enrichParticipantsWithNostrProfiles(
    participants: Map<string, { npub: string; pubkey: string; name?: string; picture?: string }>
  ): Promise<void> {
    // Find participants with null names
    const pubkeysNeedingProfiles: string[] = [];
    for (const [pubkey, profile] of participants) {
      if (!profile.name) {
        pubkeysNeedingProfiles.push(pubkey);
      }
    }

    if (pubkeysNeedingProfiles.length === 0) {
      return;
    }

    console.log(`[RunningBitcoin] Fetching Nostr profiles for ${pubkeysNeedingProfiles.length} participants with null names`);

    try {
      const nostrProfiles = await ProfileCache.fetchProfiles(pubkeysNeedingProfiles);

      // Update participants with Nostr profile data
      let enrichedCount = 0;
      for (const [pubkey, nostrProfile] of nostrProfiles) {
        const participant = participants.get(pubkey);
        if (participant && !participant.name && nostrProfile.name) {
          participant.name = nostrProfile.name;
          participant.picture = participant.picture || nostrProfile.picture;
          console.log(`[RunningBitcoin] Enriched ${pubkey.slice(0, 8)} with Nostr name: ${nostrProfile.name}`);
          enrichedCount++;

          // Fire-and-forget: Update Supabase so future loads don't need Nostr fetch
          SupabaseCompetitionService.updateParticipantProfile(
            'running-bitcoin',
            participant.npub,
            { name: nostrProfile.name, picture: nostrProfile.picture }
          ).catch(err => {
            console.warn('[RunningBitcoin] Failed to persist profile to Supabase (non-blocking):', err);
          });
        }
      }

      console.log(`[RunningBitcoin] Enriched ${enrichedCount} participants with Nostr profiles`);
    } catch (error) {
      console.warn('[RunningBitcoin] Error fetching Nostr profiles (non-blocking):', error);
    }
  }

  /**
   * Get all Season II participant pubkeys
   */
  getParticipantPubkeys(): string[] {
    return SEASON_2_PARTICIPANTS.map(p => p.pubkey);
  }

  /**
   * Build leaderboard from workout array (used by hook for fresh data)
   * Filters for Running Bitcoin date range + running/walking activities
   */
  async buildLeaderboardFromWorkouts(
    workouts: CachedWorkout[],
    _currentUserPubkey?: string
  ): Promise<RunningBitcoinLeaderboard> {
    console.log(`[RunningBitcoin] Building leaderboard from ${workouts.length} workouts`);

    // Get Running Bitcoin date range timestamps
    const startTs = getRunningBitcoinStartTimestamp();
    const endTs = getRunningBitcoinEndTimestamp();

    // Get ALL joined participants from Supabase (source of truth)
    const joinedParticipants = await this.getAllJoinedParticipantsFromSupabase();
    const eligiblePubkeys = new Set(joinedParticipants.keys());

    // Also include local joins (for instant UI feedback before Supabase sync)
    const localJoins = await this.getLocallyJoinedUsers();
    for (const pubkey of localJoins) {
      eligiblePubkeys.add(pubkey);
    }

    // Filter workouts for Running Bitcoin date range and eligible activities
    // Also exclude step-estimated submissions (id starts with "steps_") to prevent double-counting
    const eligibleWorkouts = workouts.filter(w => {
      const activityLower = w.activityType?.toLowerCase() || '';
      const isEligibleActivity = activityLower === 'running' || activityLower === 'walking';
      const isInDateRange = w.createdAt >= startTs && w.createdAt <= endTs;
      const isEligibleParticipant = eligiblePubkeys.has(w.pubkey);
      const isNotStepEstimate = !w.id?.startsWith('steps_');
      return isEligibleActivity && isInDateRange && isEligibleParticipant && isNotStepEstimate;
    });

    console.log(`[RunningBitcoin] Eligible workouts: ${eligibleWorkouts.length}`);

    // Aggregate distance per participant
    const stats = new Map<string, { distance: number; workoutCount: number }>();
    for (const w of eligibleWorkouts) {
      const existing = stats.get(w.pubkey) || { distance: 0, workoutCount: 0 };
      existing.distance += w.distance;
      existing.workoutCount += 1;
      stats.set(w.pubkey, existing);
    }

    // Build participant entries with profile data from Supabase
    const participantEntries: RunningBitcoinParticipant[] = [];
    for (const [pubkey, data] of stats) {
      // Get profile from Supabase joined participants (or Season II as fallback)
      const supabaseProfile = joinedParticipants.get(pubkey);
      const season2Profile = SEASON_2_PARTICIPANTS.find(p => p.pubkey === pubkey);

      let name = supabaseProfile?.name || season2Profile?.name;
      let picture = supabaseProfile?.picture || season2Profile?.picture;
      let npub = supabaseProfile?.npub || season2Profile?.npub;

      if (!npub) {
        try {
          npub = nip19.npubEncode(pubkey);
        } catch {
          // Ignore encoding errors
        }
      }

      participantEntries.push({
        pubkey,
        npub,
        name: name || `User ${pubkey.slice(0, 8)}`,
        picture,
        totalDistanceKm: data.distance,
        workoutCount: data.workoutCount,
        isFinisher: data.distance >= RUNNING_BITCOIN_CONFIG.goalDistanceKm,
        isJoined: true,
      });
    }

    // Sort by distance (descending)
    participantEntries.sort((a, b) => b.totalDistanceKm - a.totalDistanceKm);

    // Assign finisher ranks
    let finisherRank = 1;
    for (const participant of participantEntries) {
      if (participant.isFinisher) {
        participant.finisherRank = finisherRank;
        finisherRank++;
      }
    }

    // Get finishers list
    const finishers = participantEntries.filter(p => p.isFinisher);

    // Calculate totals
    const totalDistanceKm = participantEntries.reduce((sum, p) => sum + p.totalDistanceKm, 0);

    console.log(`[RunningBitcoin] Built leaderboard: ${participantEntries.length} participants, ${finishers.length} finishers`);

    return {
      participants: participantEntries,
      finishers,
      totalParticipants: eligiblePubkeys.size,
      totalDistanceKm,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Share completion to Nostr and claim finisher reward
   * Posts a kind 1 event with completion message and triggers auto-pay
   */
  async shareCompletionAndClaimReward(pubkey: string): Promise<ShareCompletionResult> {
    console.log('[RunningBitcoin] Starting share completion and claim reward...');

    try {
      // Step 1: Verify user is a finisher
      const progress = await this.getUserProgress(pubkey);
      if (!progress.isFinisher) {
        return {
          success: false,
          error: 'You have not completed 21km yet',
          rewardPaid: false,
        };
      }

      // Step 2: Check if reward already claimed
      const alreadyClaimed = await this.hasClaimedReward(pubkey);
      if (alreadyClaimed) {
        return {
          success: false,
          error: 'Reward already claimed',
          rewardPaid: false,
        };
      }

      // Step 3: Post completion to Nostr (kind 1 event)
      let postEventId: string | undefined;
      try {
        postEventId = await this.postCompletionToNostr(pubkey, progress);
        console.log('[RunningBitcoin] Posted completion to Nostr:', postEventId);
      } catch (postError) {
        console.error('[RunningBitcoin] Failed to post to Nostr:', postError);
        // Continue even if post fails - user can still get reward
      }

      // Step 4: Get user's Lightning address
      const lnAddress = await RewardLightningAddressService.getRewardLightningAddress();
      if (!lnAddress) {
        return {
          success: true,
          postEventId,
          rewardPaid: false,
          rewardError: 'No Lightning address configured',
        };
      }

      // Step 5: Request invoice from Lightning address
      let invoice: string;
      try {
        const invoiceResult = await getInvoiceFromLightningAddress(
          lnAddress,
          RUNNING_BITCOIN_CONFIG.finisherRewardSats,
          'Running Bitcoin Challenge - Finisher Reward'
        );
        invoice = invoiceResult.invoice;
        console.log('[RunningBitcoin] Got invoice for reward');
      } catch (invoiceError) {
        console.error('[RunningBitcoin] Failed to get invoice:', invoiceError);
        return {
          success: true,
          postEventId,
          rewardPaid: false,
          rewardError: 'Failed to get invoice from Lightning address',
        };
      }

      // Step 6: Pay the invoice
      try {
        const payResult = await NWCGatewayService.payInvoice(invoice);
        if (payResult.success) {
          // Mark reward as claimed
          await this.markRewardClaimed(pubkey);
          console.log('[RunningBitcoin] ✅ Reward paid successfully!');
          return {
            success: true,
            postEventId,
            rewardPaid: true,
          };
        } else {
          console.error('[RunningBitcoin] Payment failed:', payResult.error);
          return {
            success: true,
            postEventId,
            rewardPaid: false,
            rewardError: payResult.error || 'Payment failed',
          };
        }
      } catch (payError) {
        console.error('[RunningBitcoin] Payment error:', payError);
        return {
          success: true,
          postEventId,
          rewardPaid: false,
          rewardError: 'Payment error occurred',
        };
      }
    } catch (error) {
      console.error('[RunningBitcoin] Share completion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        rewardPaid: false,
      };
    }
  }

  /**
   * Post completion message to Nostr as kind 1 event
   */
  private async postCompletionToNostr(_pubkey: string, progress: RunningBitcoinProgress): Promise<string> {
    const ndk = await GlobalNDKService.getInstance();

    // Get user's nsec from secure storage for signing (with legacy migration fallback)
    const nsec = await SecureNsecStorage.getNsec();
    if (!nsec) {
      throw new Error('No nsec found in secure storage - cannot sign event');
    }

    // Create the completion post content
    const content = `I completed the Running Bitcoin Challenge! 🏃‍♂️⚡

${progress.distanceKm.toFixed(1)}km in honor of Hal Finney - the first person to receive a Bitcoin transaction.

${progress.finisherRank ? `Finisher #${progress.finisherRank}` : ''}

#RunningBitcoin #RUNSTR #Bitcoin #HalFinney`;

    // Create kind 1 event
    const event = new NDKEvent(ndk);
    event.kind = 1;
    event.content = content;
    event.tags = [
      ['t', 'RunningBitcoin'],
      ['t', 'RUNSTR'],
      ['t', 'Bitcoin'],
      ['t', 'HalFinney'],
    ];

    // Sign and publish
    await event.sign();
    await event.publish();

    return event.id || 'published';
  }

  /**
   * Check if user has already claimed their reward
   * Checks AsyncStorage first (fast), then Supabase as fallback (survives reinstall)
   */
  async hasClaimedReward(pubkey: string): Promise<boolean> {
    try {
      // Step 1: Check AsyncStorage (fast, local)
      const claimed = await AsyncStorage.getItem(REWARDS_CLAIMED_KEY);
      const claimedList = claimed ? JSON.parse(claimed) : [];
      if (claimedList.includes(pubkey)) {
        return true;
      }

      // Step 2: Check Supabase as fallback (survives app reinstall/logout)
      const npub = nip19.npubEncode(pubkey);
      const supabaseClaimed = await this.checkSupabaseRewardClaimed(npub);
      if (supabaseClaimed) {
        // Sync to local storage so we don't hit Supabase again
        claimedList.push(pubkey);
        await AsyncStorage.setItem(REWARDS_CLAIMED_KEY, JSON.stringify(claimedList));
        console.log('[RunningBitcoin] Synced claimed status from Supabase');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[RunningBitcoin] Error checking claimed status:', error);
      return false;
    }
  }

  /**
   * Check Supabase for reward_claimed status
   */
  private async checkSupabaseRewardClaimed(npub: string): Promise<boolean> {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return false;
    }

    try {
      // Get competition ID for running-bitcoin
      const compUrl = `${supabaseUrl}/rest/v1/competitions?external_id=eq.running-bitcoin&select=id`;
      const compRes = await fetch(compUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });
      const compData = await compRes.json();
      if (!compData || compData.length === 0) return false;
      const competitionId = compData[0].id;

      // Check reward_claimed for this participant
      const url = `${supabaseUrl}/rest/v1/competition_participants?competition_id=eq.${competitionId}&npub=eq.${npub}&select=reward_claimed`;
      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });
      const data = await response.json();
      return data && data.length > 0 && data[0].reward_claimed === true;
    } catch (error) {
      console.warn('[RunningBitcoin] Error checking Supabase reward status:', error);
      return false;
    }
  }

  /**
   * Mark reward as claimed for user
   * Updates both AsyncStorage (fast) and Supabase (persistent)
   */
  private async markRewardClaimed(pubkey: string): Promise<void> {
    try {
      // Step 1: Update AsyncStorage (fast, local)
      const claimed = await AsyncStorage.getItem(REWARDS_CLAIMED_KEY);
      const claimedList = claimed ? JSON.parse(claimed) : [];
      if (!claimedList.includes(pubkey)) {
        claimedList.push(pubkey);
        await AsyncStorage.setItem(REWARDS_CLAIMED_KEY, JSON.stringify(claimedList));
        console.log('[RunningBitcoin] Marked reward as claimed locally:', pubkey.slice(0, 8));
      }

      // Step 2: Update Supabase (persistent, survives reinstall)
      const npub = nip19.npubEncode(pubkey);
      await this.markSupabaseRewardClaimed(npub);
    } catch (error) {
      console.error('[RunningBitcoin] Error marking reward claimed:', error);
    }
  }

  /**
   * Mark reward_claimed in Supabase
   */
  private async markSupabaseRewardClaimed(npub: string): Promise<void> {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return;
    }

    try {
      // Get competition ID for running-bitcoin
      const compUrl = `${supabaseUrl}/rest/v1/competitions?external_id=eq.running-bitcoin&select=id`;
      const compRes = await fetch(compUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });
      const compData = await compRes.json();
      if (!compData || compData.length === 0) return;
      const competitionId = compData[0].id;

      // Update reward_claimed for this participant
      const url = `${supabaseUrl}/rest/v1/competition_participants?competition_id=eq.${competitionId}&npub=eq.${npub}`;
      await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          reward_claimed: true,
          reward_claimed_at: new Date().toISOString(),
        }),
      });
      console.log('[RunningBitcoin] Marked reward as claimed in Supabase:', npub.slice(0, 12));
    } catch (error) {
      console.warn('[RunningBitcoin] Error marking Supabase reward claimed (non-blocking):', error);
    }
  }
}

// Export singleton instance
export const RunningBitcoinService = RunningBitcoinServiceClass.getInstance();
