/**
 * Direct Nostr Profile Service
 * Pure Nostr profile data retrieval that bypasses Supabase entirely
 * Uses only stored npub + NostrProfileService for complete profile display
 */

import { getNpubFromStorage } from '../../utils/nostr';
import { nostrProfileService } from '../nostr/NostrProfileService';
import { NostrCacheService } from '../cache/NostrCacheService';
import type { UserWithWallet } from '../../types';

export interface DirectNostrUser extends Omit<UserWithWallet, 'id' | 'createdAt' | 'lastSyncAt'> {
  id: string; // Generated from npub
  npub: string;
  name: string;
  email?: string;
  role: 'member' | 'captain'; // Default to member for Nostr-only users
  teamId?: string;
  currentTeamId?: string;
  createdAt: string; // Generated timestamp
  lastSyncAt?: string;
  
  // Nostr profile fields
  bio?: string;
  website?: string;
  picture?: string;
  banner?: string;
  lud16?: string;
  displayName?: string;
  
  // Wallet fields (simplified for Nostr users)
  personalWalletAddress?: string;
  lightningAddress?: string;
  walletBalance: number; // Always 0 for members, will be managed separately
  hasWalletCredentials: boolean; // Always false for pure Nostr users
}

export class DirectNostrProfileService {
  /**
   * Get complete user profile with progressive loading and caching
   * Returns immediately with cached data, then updates with fresh data
   */
  static async getCurrentUserProfile(): Promise<DirectNostrUser | null> {
    try {
      console.log('🔍 DirectNostrProfileService: Getting profile with caching...');
      
      // Get stored npub from AsyncStorage
      const storedNpub = await getNpubFromStorage();
      
      if (!storedNpub) {
        console.log('❌ DirectNostrProfileService: No stored npub found');
        return null;
      }
      
      console.log('✅ DirectNostrProfileService: Found stored npub:', storedNpub.slice(0, 20) + '...');
      
      // Try to get cached profile first (instant display)
      const cachedProfile = await NostrCacheService.getCachedProfile<DirectNostrUser>(storedNpub);
      if (cachedProfile) {
        console.log('⚡ DirectNostrProfileService: Using cached profile data');
        // Start background refresh but return cached data immediately
        this.backgroundRefreshProfile(storedNpub);
        return cachedProfile;
      }
      
      // No cache - fetch fresh data (first time or expired)
      return await this.fetchFreshProfile(storedNpub);
    } catch (error) {
      console.error('❌ DirectNostrProfileService: Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Fetch fresh profile data with timeout protection
   */
  private static async fetchFreshProfile(storedNpub: string): Promise<DirectNostrUser | null> {
    try {
      console.log('📡 DirectNostrProfileService: Fetching fresh profile data for:', storedNpub.slice(0, 20) + '...');

      // Create timeout promise (10 seconds max for better reliability)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000);  // 10 second timeout for profile (needs more time)
      });
      
      // Create profile fetch promise
      const profilePromise = nostrProfileService.getProfile(storedNpub);
      
      // Race between fetch and timeout
      let nostrProfile = null;
      try {
        nostrProfile = await Promise.race([profilePromise, timeoutPromise]);
        
        if (nostrProfile) {
          console.log('✅ DirectNostrProfileService: Loaded fresh Nostr profile:', {
            displayName: nostrProfile.display_name || nostrProfile.name,
            picture: nostrProfile.picture ? nostrProfile.picture.substring(0, 100) : 'none',
            banner: nostrProfile.banner ? nostrProfile.banner.substring(0, 100) : 'none',
            bio: nostrProfile.about?.substring(0, 50) + '...',
            lud16: nostrProfile.lud16
          });
        }
      } catch (timeoutError) {
        console.warn('⏰ DirectNostrProfileService: Profile fetch timed out, using fallback');
        // Continue with null profile - will show basic fallback profile
      }
      
      // Generate user ID from npub (deterministic)
      const userId = 'nostr_' + storedNpub.slice(-10);
      
      // Create direct Nostr user profile
      const directUser: DirectNostrUser = {
        id: userId,
        npub: storedNpub,
        name: nostrProfile?.display_name || nostrProfile?.name || `User ${storedNpub.slice(5, 13)}`,
        role: 'member', // Default to member for Nostr-only users
        createdAt: new Date().toISOString(),
        
        // Nostr profile data
        bio: nostrProfile?.about,
        website: nostrProfile?.website,
        picture: nostrProfile?.picture,
        banner: nostrProfile?.banner,
        lud16: nostrProfile?.lud16,
        displayName: nostrProfile?.display_name || nostrProfile?.name,
        
        // Lightning address from Nostr profile
        lightningAddress: nostrProfile?.lud16,
        personalWalletAddress: nostrProfile?.lud16,
        
        // Wallet settings for pure Nostr users
        walletBalance: 0, // Members receive payments directly to Lightning address
        hasWalletCredentials: false, // No CoinOS integration for pure Nostr users
      };
      
      // Cache the fresh profile data
      await NostrCacheService.setCachedProfile(storedNpub, directUser);
      
      console.log('✅ DirectNostrProfileService: Created and cached user profile:', {
        id: directUser.id,
        name: directUser.name,
        displayName: directUser.displayName,
        hasPicture: !!directUser.picture,
        hasBanner: !!directUser.banner,
        hasBio: !!directUser.bio,
        hasLightning: !!directUser.lud16,
      });
      
      return directUser;
    } catch (error) {
      console.error('❌ DirectNostrProfileService: Error fetching fresh profile:', error);
      return null;
    }
  }

  /**
   * Background refresh of profile data (non-blocking)
   */
  private static async backgroundRefreshProfile(storedNpub: string): Promise<void> {
    try {
      console.log('🔄 DirectNostrProfileService: Starting background profile refresh...');
      
      // Fetch fresh data in background with timeout
      const freshProfile = await this.fetchFreshProfile(storedNpub);
      
      if (freshProfile) {
        console.log('✅ DirectNostrProfileService: Background refresh completed');
        // Data is automatically cached by fetchFreshProfile
      }
    } catch (error) {
      console.warn('⚠️ DirectNostrProfileService: Background refresh failed:', error);
      // Don't throw - this is background operation
    }
  }

  /**
   * Get immediate fallback profile (for instant display during loading)
   */
  static async getFallbackProfile(): Promise<DirectNostrUser | null> {
    try {
      const storedNpub = await getNpubFromStorage();
      if (!storedNpub) return null;
      
      console.log('🏃‍♂️ DirectNostrProfileService: Creating fallback profile for immediate display');
      
      const userId = 'nostr_' + storedNpub.slice(-10);
      const fallbackName = `user_${storedNpub.slice(5, 13)}`;
      
      // Basic profile with npub-derived info
      const fallbackProfile: DirectNostrUser = {
        id: userId,
        npub: storedNpub,
        name: fallbackName,
        displayName: fallbackName,
        role: 'member',
        createdAt: new Date().toISOString(),
        
        // Undefined fields - will be updated when real data loads
        bio: undefined,
        website: undefined, 
        picture: undefined,
        banner: undefined,
        lud16: undefined,
        
        // Basic wallet settings
        lightningAddress: undefined,
        personalWalletAddress: undefined,
        walletBalance: 0,
        hasWalletCredentials: false,
      };
      
      return fallbackProfile;
    } catch (error) {
      console.error('❌ DirectNostrProfileService: Error creating fallback profile:', error);
      return null;
    }
  }
  
  /**
   * Check if user has valid stored Nostr credentials
   */
  static async hasValidNostrCredentials(): Promise<boolean> {
    try {
      const storedNpub = await getNpubFromStorage();
      return !!storedNpub && storedNpub.startsWith('npub1');
    } catch (error) {
      console.error('DirectNostrProfileService: Error checking credentials:', error);
      return false;
    }
  }
  
  /**
   * Get user's stored npub
   */
  static async getStoredNpub(): Promise<string | null> {
    try {
      return await getNpubFromStorage();
    } catch (error) {
      console.error('DirectNostrProfileService: Error getting stored npub:', error);
      return null;
    }
  }
  
  /**
   * Refresh profile data by re-fetching from Nostr
   */
  static async refreshProfile(): Promise<DirectNostrUser | null> {
    console.log('🔄 DirectNostrProfileService: Refreshing profile data...');
    // Just call getCurrentUserProfile again - it will re-fetch Nostr data
    return await this.getCurrentUserProfile();
  }
}