/**
 * BroadcastTokenService - Push notification token registration
 *
 * DUAL-MODE DESIGN:
 * - Community broadcasts: All devices receive the SAME notification (anonymous)
 * - Per-user notifications: token_key = SHA256(npub) enables targeted push
 *   (reward earned, auto-joined competition, etc.) without storing raw npub
 *
 * WHAT IT DOES:
 * - Registers Expo push token to Supabase (broadcast_tokens table)
 * - Optionally links token to user via hashed npub (token_key column)
 * - Enables both broadcast and per-user push notifications
 *
 * NOTIFICATIONS SENT:
 * - Community: "Daily Running: First 5K time today - 24:32!"
 * - Per-user: "You earned 100 sats for today's workout!"
 * - Per-user: "Auto-joined Season II Running! Keep going!"
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

const TOKEN_REGISTERED_KEY = '@runstr:broadcast_token_registered';
const TOKEN_VALUE_KEY = '@runstr:broadcast_token_value';

export class BroadcastTokenService {
  /**
   * Register device token for push notifications.
   *
   * When npub is provided, computes SHA256(npub) and stores as token_key
   * to enable per-user targeted notifications (reward earned, auto-join, etc.)
   * without exposing the raw npub.
   *
   * @param expoPushToken - Expo push token string
   * @param npub - Optional user npub for per-user push targeting
   */
  static async registerToken(expoPushToken: string, npub?: string): Promise<void> {
    try {
      // Skip if Supabase not configured
      if (!isSupabaseConfigured() || !supabase) {
        console.log('[BroadcastToken] Supabase not configured, skipping registration');
        return;
      }

      const currentNpub = npub || null;

      // Compute token_key from npub if provided
      let tokenKey: string | null = null;
      if (currentNpub) {
        try {
          const Crypto = require('expo-crypto');
          tokenKey = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            currentNpub
          );
        } catch (hashErr) {
          console.warn('[BroadcastToken] SHA256 hash failed:', hashErr);
        }
      }

      // Always upsert to Supabase — tokens can change after app updates or iOS updates.
      // If we have a token_key, upsert by token_key (same user, possibly new device token).
      // Otherwise upsert by token (anonymous device registration).
      const upsertData: Record<string, unknown> = {
        token: expoPushToken,
        platform: Platform.OS,
        is_active: true,
      };
      if (tokenKey) {
        upsertData.token_key = tokenKey;
      }

      const onConflict = tokenKey ? 'token_key' : 'token';
      const { error } = await supabase
        .from('broadcast_tokens')
        .upsert(upsertData, { onConflict });

      if (error) {
        // If table doesn't exist yet, log and continue silently
        if (error.code === '42P01') {
          console.log('[BroadcastToken] Table not created yet, skipping');
          return;
        }
        // If token_key conflict fails (no unique index), fall back to token conflict
        if (error.code === '42P10' || error.message?.includes('unique')) {
          const { error: fallbackError } = await supabase
            .from('broadcast_tokens')
            .upsert(upsertData, { onConflict: 'token' });
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }

      // Save token locally for reference
      await AsyncStorage.setItem(TOKEN_REGISTERED_KEY, 'true');
      await AsyncStorage.setItem(TOKEN_VALUE_KEY, expoPushToken);
      if (tokenKey) {
        await AsyncStorage.setItem('@runstr:broadcast_token_key', tokenKey);
      }

      const targetMode = tokenKey ? 'community + per-user' : 'community only';
      console.log(`[BroadcastToken] Registered for ${targetMode} notifications (token: ${expoPushToken.slice(0, 30)}...)`);
    } catch (error) {
      // Silent failure - notifications are optional
      console.warn('[BroadcastToken] Registration failed (silent):', error);
    }
  }

  /**
   * Deactivate token (on logout or opt-out)
   * Keeps token in database but marks as inactive
   */
  static async deactivateToken(): Promise<void> {
    try {
      if (!isSupabaseConfigured() || !supabase) {
        return;
      }

      const token = await AsyncStorage.getItem(TOKEN_VALUE_KEY);
      if (!token) return;

      await supabase
        .from('broadcast_tokens')
        .update({ is_active: false })
        .eq('token', token);

      await AsyncStorage.removeItem(TOKEN_REGISTERED_KEY);
      await AsyncStorage.removeItem(TOKEN_VALUE_KEY);

      console.log('[BroadcastToken] Token deactivated');
    } catch (error) {
      console.warn('[BroadcastToken] Deactivation failed:', error);
    }
  }

  /**
   * Check if token is registered
   */
  static async isRegistered(): Promise<boolean> {
    try {
      const registered = await AsyncStorage.getItem(TOKEN_REGISTERED_KEY);
      return registered === 'true';
    } catch {
      return false;
    }
  }
}
