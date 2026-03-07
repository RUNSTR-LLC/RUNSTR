/**
 * HealthKitBackgroundService
 * Registers for HealthKit background delivery so iOS wakes RUNSTR
 * when new workouts appear (e.g. from Apple Watch, Nike Run Club).
 * On wake, fetches new workouts and submits them to Supabase for
 * leaderboard tracking and auto-rewards.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventSubscription } from 'expo-modules-core';

// Only import HealthKit APIs on iOS
let enableBackgroundDelivery: any;
let subscribeToQuery: any;
let unsubscribeFromQuery: any;
let addQueryUpdateListener: any;
let HKUpdateFrequency: any;
let HKWorkoutTypeIdentifier: string;

if (Platform.OS === 'ios') {
  try {
    const hk = require('@yzlin/expo-healthkit');
    enableBackgroundDelivery = hk.enableBackgroundDelivery;
    subscribeToQuery = hk.subscribeToQuery;
    unsubscribeFromQuery = hk.unsubscribeFromQuery;
    addQueryUpdateListener = hk.default?.addQueryUpdateListener ?? hk.addQueryUpdateListener;
    HKUpdateFrequency = hk.HKUpdateFrequency;
    HKWorkoutTypeIdentifier = 'HKWorkoutTypeIdentifier';
  } catch (e) {
    console.warn('[HKBackground] Failed to import @yzlin/expo-healthkit:', e);
  }
}

const SUBMITTED_IDS_KEY = '@healthkit_bg:submitted_ids';
const MAX_STORED_IDS = 500;

export class HealthKitBackgroundService {
  private static instance: HealthKitBackgroundService;
  private queryId: string | null = null;
  private listener: EventSubscription | null = null;
  private isSetup = false;

  private constructor() {}

  static getInstance(): HealthKitBackgroundService {
    if (!HealthKitBackgroundService.instance) {
      HealthKitBackgroundService.instance = new HealthKitBackgroundService();
    }
    return HealthKitBackgroundService.instance;
  }

  /**
   * Register for HealthKit background delivery.
   * Must be called on every app launch (iOS requirement).
   */
  async setupBackgroundDelivery(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    if (this.isSetup) return;
    if (!enableBackgroundDelivery || !subscribeToQuery || !addQueryUpdateListener) {
      console.warn('[HKBackground] HealthKit background APIs not available');
      return;
    }

    try {
      // 1. Enable background delivery for workouts (immediate frequency)
      const enabled = await enableBackgroundDelivery(
        HKWorkoutTypeIdentifier,
        HKUpdateFrequency.immediate,
      );
      console.log(`[HKBackground] enableBackgroundDelivery: ${enabled}`);

      // 2. Subscribe to workout query updates
      this.queryId = await subscribeToQuery(HKWorkoutTypeIdentifier);
      console.log(`[HKBackground] subscribeToQuery: ${this.queryId}`);

      // 3. Listen for query update events
      this.listener = addQueryUpdateListener(this.handleWorkoutUpdate.bind(this));
      console.log('[HKBackground] Background delivery registered');

      this.isSetup = true;
    } catch (error) {
      console.error('[HKBackground] Setup failed:', error);
    }
  }

  /**
   * Handle a workout update event from HealthKit observer query.
   * Fetches recent workouts, deduplicates, and submits new ones to Supabase.
   */
  private async handleWorkoutUpdate(_event: { typeIdentifier: string }): Promise<void> {
    console.log('[HKBackground] Workout update received');

    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!npub) {
        console.log('[HKBackground] No npub found, skipping');
        return;
      }

      // Reuse HealthKitService for consistent workout fetching + normalization
      const { HealthKitService } = await import('./healthKitService');
      const healthKit = HealthKitService.getInstance();
      const recentWorkouts = await healthKit.getRecentWorkouts(npub, 1); // last 24h

      if (!recentWorkouts || recentWorkouts.length === 0) {
        console.log('[HKBackground] No recent workouts found');
        return;
      }

      // Load previously submitted IDs for dedup
      const submittedIds = await this.getSubmittedIds();
      const CARDIO_TYPES = ['running', 'walking', 'cycling', 'hiking'];

      const newWorkouts = recentWorkouts.filter((w) => {
        if (submittedIds.has(w.id)) return false;
        if (!CARDIO_TYPES.includes(w.type)) return false;
        if (!w.distance || w.distance <= 0) return false;
        return true;
      });

      if (newWorkouts.length === 0) {
        console.log('[HKBackground] No new cardio workouts to submit');
        return;
      }

      // Get reward + team context tags for Supabase trigger parsing
      const lightningAddress = await AsyncStorage.getItem('@runstr:lightning_address');
      const selectedTeamId = await AsyncStorage.getItem('@runstr:selected_team_id');

      const { SupabaseCompetitionService } = await import(
        '../backend/SupabaseCompetitionService'
      );

      for (const w of newWorkouts) {
        try {
          const eventId = `hk_bg_${w.id}`;
          const tags: string[][] = [];
          if (lightningAddress) {
            tags.push(['lightning', lightningAddress]);
          }
          if (selectedTeamId) {
            tags.push(['team', selectedTeamId]);
          }

          await SupabaseCompetitionService.submitWorkoutSimple({
            eventId,
            npub,
            type: w.type,
            distance: w.distance,
            duration: w.duration,
            calories: w.calories,
            startTime: w.startTime,
            tags,
          });

          submittedIds.add(w.id);
          console.log(`[HKBackground] Submitted ${w.type} workout: ${eventId}`);
        } catch (err) {
          console.warn(`[HKBackground] Failed to submit workout ${w.id}:`, err);
        }
      }

      // Persist updated submitted IDs
      await this.saveSubmittedIds(submittedIds);
    } catch (error) {
      console.error('[HKBackground] handleWorkoutUpdate error:', error);
    }
  }

  /** Load previously submitted workout IDs from AsyncStorage */
  private async getSubmittedIds(): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(SUBMITTED_IDS_KEY);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch {
      return new Set();
    }
  }

  /** Persist submitted workout IDs, capping at MAX_STORED_IDS */
  private async saveSubmittedIds(ids: Set<string>): Promise<void> {
    try {
      const arr = Array.from(ids);
      // Keep only the most recent IDs to avoid unbounded storage growth
      const trimmed = arr.slice(-MAX_STORED_IDS);
      await AsyncStorage.setItem(SUBMITTED_IDS_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('[HKBackground] Failed to save submitted IDs:', error);
    }
  }

  /** Unsubscribe from HealthKit observer query and remove listener */
  async cleanup(): Promise<void> {
    if (this.listener) {
      this.listener.remove();
      this.listener = null;
    }
    if (this.queryId && unsubscribeFromQuery) {
      try {
        await unsubscribeFromQuery(this.queryId);
      } catch (e) {
        console.warn('[HKBackground] Failed to unsubscribe:', e);
      }
      this.queryId = null;
    }
    this.isSetup = false;
  }
}

export default HealthKitBackgroundService.getInstance();
