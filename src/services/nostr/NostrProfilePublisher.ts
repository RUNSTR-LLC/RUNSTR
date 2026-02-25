/**
 * NostrProfilePublisher - Publishes kind 0 metadata events to Nostr
 * Handles profile updates, validation, and relay publishing
 */

import { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { nostrRelayManager } from './NostrRelayManager';
import { NostrProtocolHandler } from './NostrProtocolHandler';
import { nostrProfileService } from './NostrProfileService';
import { DirectNostrProfileService } from '../user/directNostrProfileService';
import { getNsec, getNpub } from '../../utils/nostrAuth';
import { npubToHex } from '../../utils/ndkConversion';
import type { Event } from 'nostr-tools';
import unifiedCache from '../cache/UnifiedNostrCache';
import { CacheKeys, CacheTTL } from '../../constants/cacheTTL';

export interface EditableProfile {
  name?: string; // Display name
  display_name?: string; // Alternative display name field
  about?: string; // Bio/description
  picture?: string; // Profile picture URL
  banner?: string; // Banner image URL
  lud16?: string; // Lightning address
  website?: string; // Personal website
  nip05?: string; // NIP-05 verification (optional)
}

export interface ProfilePublishResult {
  success: boolean;
  eventId?: string;
  error?: string;
  publishedToRelays?: number;
  failedRelays?: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class NostrProfilePublisher {
  private static instance: NostrProfilePublisher;
  private protocolHandler: NostrProtocolHandler;

  private constructor() {
    this.protocolHandler = new NostrProtocolHandler();
  }

  static getInstance(): NostrProfilePublisher {
    if (!NostrProfilePublisher.instance) {
      NostrProfilePublisher.instance = new NostrProfilePublisher();
    }
    return NostrProfilePublisher.instance;
  }

  /**
   * Publish profile update to Nostr relays
   */
  async publishProfileUpdate(
    profile: EditableProfile
  ): Promise<ProfilePublishResult> {
    try {
      console.log('📝 NostrProfilePublisher: Starting profile update...');

      // Validate profile data
      const validation = this.validateProfileData(profile);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Get user's private key
      const nsec = await getNsec();
      if (!nsec) {
        return {
          success: false,
          error: 'No authentication found. Please login again.',
        };
      }

      // Create and sign kind 0 event
      const event = await this.createKind0Event(profile, nsec);
      if (!event) {
        return {
          success: false,
          error: 'Failed to create profile event',
        };
      }

      console.log('📮 Publishing profile event:', event.id);

      // Publish to relays
      const publishResult = await nostrRelayManager.publishEvent(event);

      if (publishResult.successful.length === 0) {
        return {
          success: false,
          error: 'Failed to publish to any relays',
          failedRelays: publishResult.failed,
        };
      }

      // Update cache to trigger UI refresh immediately
      await this.updateProfileCache(profile, nsec);

      console.log(
        `✅ Profile published to ${publishResult.successful.length} relays`
      );

      return {
        success: true,
        eventId: event.id,
        publishedToRelays: publishResult.successful.length,
        failedRelays: publishResult.failed,
      };
    } catch (error) {
      console.error(
        '❌ NostrProfilePublisher: Error publishing profile:',
        error
      );
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to publish profile',
      };
    }
  }

  /**
   * Validate profile data before publishing
   */
  validateProfileData(profile: EditableProfile): ValidationResult {
    const errors: string[] = [];

    // Validate name length
    if (profile.name && profile.name.length > 50) {
      errors.push('Name must be 50 characters or less');
    }

    // Validate bio length
    if (profile.about && profile.about.length > 500) {
      errors.push('Bio must be 500 characters or less');
    }

    // Validate Lightning address format
    if (profile.lud16) {
      const lud16Pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!lud16Pattern.test(profile.lud16)) {
        errors.push(
          'Invalid Lightning address format (should be like user@domain.com)'
        );
      }
    }

    // Validate URLs
    const urlPattern = /^https?:\/\/.+/i;

    if (profile.picture && !urlPattern.test(profile.picture)) {
      errors.push(
        'Profile picture must be a valid URL starting with http:// or https://'
      );
    }

    if (profile.banner && !urlPattern.test(profile.banner)) {
      errors.push(
        'Banner must be a valid URL starting with http:// or https://'
      );
    }

    if (profile.website && !urlPattern.test(profile.website)) {
      errors.push(
        'Website must be a valid URL starting with http:// or https://'
      );
    }

    // Validate NIP-05 format if provided
    if (profile.nip05) {
      const nip05Pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!nip05Pattern.test(profile.nip05)) {
        errors.push('Invalid NIP-05 format (should be like user@domain.com)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create kind 0 metadata event
   */
  private async createKind0Event(
    profile: EditableProfile,
    nsec: string
  ): Promise<Event | null> {
    try {
      // Build metadata content
      const metadata: any = {};

      // Use display_name or name for the name field
      if (profile.display_name) {
        metadata.name = profile.display_name;
      } else if (profile.name) {
        metadata.name = profile.name;
      }

      // Add display_name separately if different from name
      if (
        profile.display_name &&
        profile.name &&
        profile.display_name !== profile.name
      ) {
        metadata.display_name = profile.display_name;
      }

      if (profile.about) metadata.about = profile.about;
      if (profile.picture) metadata.picture = profile.picture;
      if (profile.banner) metadata.banner = profile.banner;
      if (profile.lud16) metadata.lud16 = profile.lud16;
      if (profile.website) metadata.website = profile.website;
      if (profile.nip05) metadata.nip05 = profile.nip05;

      const content = JSON.stringify(metadata);

      // Create event template
      const eventTemplate = {
        kind: 0,
        content,
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Use UnifiedSigningService to get the appropriate signer (supports both nsec and Amber)
      const { UnifiedSigningService } = await import(
        '../auth/UnifiedSigningService'
      );
      const signingService = UnifiedSigningService.getInstance();
      const signer = await signingService.getSigner();

      if (!signer) {
        console.error('No signer available for profile update');
        return null;
      }

      // Sign the event using NostrProtocolHandler's signEventWithSigner method
      const signedEvent = await this.protocolHandler.signEventWithSigner(
        eventTemplate,
        signer
      );

      console.log('✅ Created and signed kind 0 event:', signedEvent.id);
      return signedEvent;
    } catch (error) {
      console.error('Error creating kind 0 event:', error);
      return null;
    }
  }

  /**
   * Upload image to a hosting service (placeholder - can be implemented later)
   */
  async uploadImage(imageUri: string): Promise<string | null> {
    try {
      // TODO: Implement image upload to nostr.build or similar service
      // For now, users must provide direct URLs
      console.log('Image upload not yet implemented. Please use direct URLs.');
      return null;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  /**
   * Update profile cache after successful publish
   * This triggers cache subscribers to update UI immediately
   */
  private async updateProfileCache(
    profile: EditableProfile,
    nsec: string
  ): Promise<void> {
    try {
      const npub = await getNpub();
      const hexPubkey = npubToHex(npub);

      if (!npub || !hexPubkey) {
        console.warn('⚠️ Cannot update cache: missing npub or hexPubkey');
        return;
      }

      // Get existing user data from cache to preserve fields like role, teamId, etc.
      const existingUser = unifiedCache.getCached(
        CacheKeys.USER_PROFILE(hexPubkey)
      );

      // Merge existing data with new profile fields
      const updatedUser = {
        // Preserve existing fields
        ...(existingUser || {}),
        id: existingUser?.id || hexPubkey,
        npub: npub,
        createdAt: existingUser?.createdAt || new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),

        // Update with new profile fields
        name: profile.display_name || profile.name || existingUser?.name || '',
        displayName:
          profile.display_name ||
          profile.name ||
          existingUser?.displayName ||
          '',
        bio: profile.about || '',
        picture: profile.picture || '',
        banner: profile.banner || '',
        lud16: profile.lud16 || '',
        website: profile.website || '',
        nip05: profile.nip05 || '',
      };

      // Update UnifiedNostrCache (this triggers cache subscribers!)
      await unifiedCache.set(
        CacheKeys.USER_PROFILE(hexPubkey),
        updatedUser,
        CacheTTL.USER_PROFILE,
        true // persist to AsyncStorage
      );

      // CRITICAL: Force refresh NostrProfileService cache
      // This service has its own 30-min cache that must be invalidated
      // otherwise getCurrentProfile() returns stale data
      await nostrProfileService.refreshProfile(npub);

      console.log(
        '✅ Profile cache updated with new data - UI will refresh automatically'
      );
    } catch (error) {
      console.error('Error updating profile cache:', error);
    }
  }

  /**
   * Get current profile data for editing
   */
  async getCurrentProfile(): Promise<EditableProfile | null> {
    try {
      const npub = await getNpub();
      if (!npub) return null;

      const profile = await nostrProfileService.getProfile(npub);
      if (!profile) return null;

      return {
        name: profile.name,
        display_name: profile.display_name,
        about: profile.about,
        picture: profile.picture,
        banner: profile.banner,
        lud16: profile.lud16,
        website: profile.website,
        nip05: profile.nip05,
      };
    } catch (error) {
      console.error('Error getting current profile:', error);
      return null;
    }
  }
}

export const nostrProfilePublisher = NostrProfilePublisher.getInstance();
