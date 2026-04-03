/**
 * RunstrEventPublishService - Publish NIP-52 calendar events to Nostr
 *
 * Creates and publishes kind 31923 calendar events with RUNSTR-specific tags
 * for scoring, payout, and join method configuration.
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import type { NDKSigner } from '@nostr-dev-kit/ndk';
import type {
  RunstrEventConfig,
  RunstrActivityType,
  RunstrScoringType,
  RunstrPayoutScheme,
  RunstrJoinMethod,
  RunstrDuration,
} from '../../types/runstrEvent';
import { DISTANCE_PRESETS, getDurationSeconds } from '../../types/runstrEvent';
import { NWCWalletService } from '../wallet/NWCWalletService';
import { UnifiedCacheService } from '../cache/UnifiedCacheService';
import type { SatlantisEvent, SatlantisSportType } from '../../types/satlantis';
import { nostrProfileService } from '../nostr/NostrProfileService';

// NIP-52 Calendar Event kind
const KIND_CALENDAR_EVENT = 31923;

export interface EventPublishResult {
  success: boolean;
  eventId?: string;
  dTag?: string;
  error?: string;
}

class RunstrEventPublishServiceClass {
  private static instance: RunstrEventPublishServiceClass;

  static getInstance(): RunstrEventPublishServiceClass {
    if (!this.instance) {
      this.instance = new RunstrEventPublishServiceClass();
    }
    return this.instance;
  }

  /**
   * Publish a new RUNSTR event to Nostr
   */
  async publishEvent(
    config: RunstrEventConfig,
    signerOrPrivateKey: NDKSigner | string
  ): Promise<EventPublishResult> {
    try {
      console.log('🎯 [RunstrEventPublish] Creating event:', config.title);

      // Validate config
      const validationError = this.validateConfig(config);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Generate unique d-tag
      const dTag = this.generateDTag(config.title);
      const now = Math.floor(Date.now() / 1000);

      // Check if creator has NWC configured
      const hasNWC = await NWCWalletService.hasNWCConfigured();

      // Fetch creator's Lightning address from their profile (for pledge routing)
      let creatorLightningAddress: string | undefined;
      if (config.pledgeCost && config.pledgeCost > 0 && config.pledgeDestination === 'captain') {
        try {
          // Get the signer's pubkey to fetch their profile
          let signerPubkey: string | undefined;
          if (typeof signerOrPrivateKey === 'string') {
            const { NDKPrivateKeySigner } = await import('@nostr-dev-kit/ndk');
            const tempSigner = new NDKPrivateKeySigner(signerOrPrivateKey);
            const user = await tempSigner.user();
            signerPubkey = user.pubkey;
          } else {
            const user = await signerOrPrivateKey.user();
            signerPubkey = user.pubkey;
          }

          if (signerPubkey) {
            console.log('🔍 [RunstrEventPublish] Fetching creator Lightning address...');
            const creatorProfile = await nostrProfileService.getProfile(signerPubkey);
            creatorLightningAddress = creatorProfile?.lud16;
            if (creatorLightningAddress) {
              console.log(`✅ [RunstrEventPublish] Creator Lightning address: ${creatorLightningAddress}`);
            } else {
              console.warn('⚠️ [RunstrEventPublish] Creator has no Lightning address in profile');
            }
          }
        } catch (profileError) {
          console.warn('⚠️ [RunstrEventPublish] Failed to fetch creator profile:', profileError);
        }
      }

      // Build NIP-52 compliant tags
      const tags = this.buildEventTags(config, dTag, hasNWC, creatorLightningAddress);

      // Create event content (description or empty)
      const content = config.description || '';

      // Get NDK instance
      const ndk = await GlobalNDKService.getInstance();

      // Create NDK event
      const ndkEvent = new NDKEvent(ndk, {
        kind: KIND_CALENDAR_EVENT,
        content,
        tags,
        created_at: now,
      });

      // Sign event
      if (typeof signerOrPrivateKey === 'string') {
        const { NDKPrivateKeySigner } = await import('@nostr-dev-kit/ndk');
        const signer = new NDKPrivateKeySigner(signerOrPrivateKey);
        await ndkEvent.sign(signer);
      } else {
        await ndkEvent.sign(signerOrPrivateKey);
      }

      // Publish with timeout
      console.log('📤 [RunstrEventPublish] Publishing to relays...');
      const publishPromise = ndkEvent.publish();
      const timeoutPromise = new Promise<Set<any>>((resolve) =>
        setTimeout(() => resolve(new Set()), 10000)
      );

      const relaySet = await Promise.race([publishPromise, timeoutPromise]);
      const publishedCount = relaySet.size;

      if (publishedCount > 0) {
        console.log(
          `✅ [RunstrEventPublish] Published to ${publishedCount} relays`
        );

        // Optimistic cache: Add to local cache immediately
        await this.addToLocalCache(config, dTag, ndkEvent.pubkey, creatorLightningAddress);

        return {
          success: true,
          eventId: ndkEvent.id,
          dTag,
        };
      } else {
        return {
          success: false,
          error: 'Failed to publish to any relays. Check your connection.',
        };
      }
    } catch (error) {
      console.error('❌ [RunstrEventPublish] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate unique d-tag for event
   */
  private generateDTag(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${slug}-${timestamp}-${random}`;
  }

  /**
   * Build NIP-52 compliant tags with RUNSTR extensions
   */
  private buildEventTags(
    config: RunstrEventConfig,
    dTag: string,
    hasNWC: boolean,
    creatorLightningAddress?: string
  ): string[][] {
    const tags: string[][] = [];

    // Standard NIP-52 tags
    tags.push(['d', dTag]);
    tags.push(['title', config.title]);
    tags.push(['start', config.startTime.toString()]);
    tags.push(['end', config.endTime.toString()]);

    // Location tag (NIP-52 compliant)
    if (config.location) {
      tags.push(['location', config.location]);
    }

    // Activity type tags
    tags.push(['t', config.activityType]);

    // RUNSTR marker tag (required for discovery)
    tags.push(['t', 'runstr']);

    // Add sport category tag
    tags.push(['t', 'sports']);

    // Distance-related tags for fastest_time events
    if (config.scoringType === 'fastest_time' && config.targetDistance) {
      console.log(`[RunstrEventPublish] 📏 Adding distance tag: ${config.targetDistance} ${config.targetDistanceUnit || 'km'}`);
      tags.push([
        'distance',
        config.targetDistance.toString(),
        config.targetDistanceUnit || 'km',
      ]);

      // Add common distance tags (5k, 10k, etc.)
      const preset = DISTANCE_PRESETS.find(
        (p) => Math.abs(p.value - config.targetDistance!) < 0.5
      );
      if (preset) {
        console.log(`[RunstrEventPublish] 📏 Adding preset tags: ${preset.tags.join(', ')}`);
        preset.tags.forEach((tag) => tags.push(['t', tag]));
      }
    } else {
      console.log(`[RunstrEventPublish] ⚠️ No distance tag added - scoringType: ${config.scoringType}, targetDistance: ${config.targetDistance}`);
    }

    // RUNSTR-specific configuration tags
    tags.push(['scoring', config.scoringType]);
    tags.push(['payout', config.payoutScheme]);
    tags.push(['join_method', config.joinMethod]);
    tags.push(['duration_type', config.duration]);

    // Pledge system tags (workout commitment for event entry)
    if (config.pledgeCost && config.pledgeCost > 0) {
      tags.push(['pledge_cost', config.pledgeCost.toString()]);
      tags.push(['pledge_destination', config.pledgeDestination || 'captain']);

      // Include captain's Lightning address for reward routing
      if (config.pledgeDestination === 'captain' && creatorLightningAddress) {
        tags.push(['captain_lightning_address', creatorLightningAddress]);
      }

      // For charity destination
      if (config.pledgeDestination === 'charity') {
        if (config.pledgeCharityAddress) {
          tags.push(['pledge_charity_address', config.pledgeCharityAddress]);
        }
        if (config.pledgeCharityName) {
          tags.push(['pledge_charity_name', config.pledgeCharityName]);
        }
      }

      console.log(`[RunstrEventPublish] 📝 Added pledge tags: cost=${config.pledgeCost}, destination=${config.pledgeDestination}`);
    }

    // Suggested donation (if donation event) - legacy
    if (config.joinMethod === 'donation' && config.suggestedDonationSats) {
      tags.push(['suggested_donation', config.suggestedDonationSats.toString()]);
    }
    // Legacy: entry_fee for backward compatibility with 'paid' events
    if (config.joinMethod === 'paid' && config.suggestedDonationSats) {
      tags.push(['entry_fee', config.suggestedDonationSats.toString()]);
    }

    // Prize pool
    if (config.prizePoolSats > 0) {
      tags.push(['prize_pool', config.prizePoolSats.toString()]);
    }

    // Fixed payout amount
    if (config.payoutScheme === 'fixed_amount' && config.fixedPayoutAmount) {
      tags.push(['fixed_payout', config.fixedPayoutAmount.toString()]);
    }

    // Creator NWC status (for auto-payout)
    tags.push(['creator_nwc', hasNWC ? 'true' : 'false']);

    // Activity type for leaderboard queries
    tags.push(['activity_type', config.activityType]);

    // Banner image (if provided)
    if (config.bannerImageUrl) {
      tags.push(['image', config.bannerImageUrl]);
    }

    // Impact Level gating tags (donation-based)
    if (config.minimumImpactLevel && config.minimumImpactLevel > 0) {
      tags.push(['minimum_impact_level', config.minimumImpactLevel.toString()]);
    }
    if (config.minimumImpactTier) {
      tags.push(['minimum_impact_tier', config.minimumImpactTier]);
    }

    // Team competition tag
    if (config.isTeamCompetition) {
      tags.push(['team_competition', 'true']);
      console.log('[RunstrEventPublish] 👥 Added team_competition tag');
    }

    return tags;
  }

  /**
   * Validate event configuration
   */
  private validateConfig(config: RunstrEventConfig): string | null {
    if (!config.title?.trim()) {
      return 'Event title is required';
    }

    if (!config.activityType) {
      return 'Activity type is required';
    }

    if (!config.scoringType) {
      return 'Scoring type is required';
    }

    if (config.scoringType === 'fastest_time' && !config.targetDistance) {
      return 'Target distance is required for fastest time events';
    }

    // Donation events don't require a suggested amount (soft requirement)

    if (
      config.scoringType === 'participation' &&
      config.payoutScheme !== 'fixed_amount'
    ) {
      return 'Complete scoring requires Fixed Amount payout';
    }

    if (config.payoutScheme === 'fixed_amount' && !config.fixedPayoutAmount) {
      return 'Fixed payout amount is required';
    }

    if (config.startTime >= config.endTime) {
      return 'End time must be after start time';
    }

    return null;
  }

  /**
   * Add newly created event to local cache for optimistic UI
   */
  private async addToLocalCache(
    config: RunstrEventConfig,
    dTag: string,
    pubkey: string,
    captainLightningAddress?: string
  ): Promise<void> {
    try {
      // Build event object from config
      const satlantisEvent: SatlantisEvent = {
        id: dTag,
        pubkey,
        title: config.title,
        description: config.description || '',
        location: config.location, // Event location
        startTime: config.startTime,
        endTime: config.endTime,
        sportType: this.mapActivityToSport(config.activityType),
        distance: config.targetDistance,
        distanceUnit: config.targetDistanceUnit,
        tags: ['runstr', 'sports', config.activityType],
        isRunstrEvent: true,
        scoringType: config.scoringType,
        payoutScheme: config.payoutScheme,
        joinMethod: config.joinMethod,
        suggestedDonationSats: config.suggestedDonationSats,
        entryFeeSats: config.suggestedDonationSats, // backward compatibility
        prizePoolSats: config.prizePoolSats,
        fixedPayoutSats: config.fixedPayoutAmount,
        durationType: config.duration,
        activityType: config.activityType,
        creatorHasNWC: config.creatorHasNWC,
        // Pledge/Commitment system fields
        pledgeCost: config.pledgeCost,
        pledgeDestination: config.pledgeDestination,
        captainLightningAddress: captainLightningAddress,
        pledgeCharityAddress: config.pledgeCharityAddress,
        pledgeCharityName: config.pledgeCharityName,
        // Rank gating fields
        minimumRank: config.minimumRank,
        minimumRankTier: config.minimumRankTier,
        // Team competition
        isTeamCompetition: config.isTeamCompetition,
      };

      // Cache single event (7 days)
      const eventCacheKey = `satlantis_event_${pubkey}_${dTag}`;
      await UnifiedCacheService.setWithCustomTTL(
        eventCacheKey,
        satlantisEvent,
        604800
      );

      // Add to discovery list cache (prepend to existing)
      const listCacheKey = `satlantis_events_{}`;
      const existingList =
        await UnifiedCacheService.get<SatlantisEvent[]>(listCacheKey);
      if (existingList) {
        const updatedList = [satlantisEvent, ...existingList];
        await UnifiedCacheService.setWithCustomTTL(
          listCacheKey,
          updatedList,
          604800
        );
        console.log(
          `✅ [RunstrEventPublish] Event added to discovery cache (${updatedList.length} total)`
        );
      } else {
        // No existing cache - create new list with just this event
        await UnifiedCacheService.setWithCustomTTL(
          listCacheKey,
          [satlantisEvent],
          604800
        );
        console.log('✅ [RunstrEventPublish] Created new discovery cache');
      }

      console.log('✅ [RunstrEventPublish] Event added to local cache');
    } catch (e) {
      console.warn('⚠️ [RunstrEventPublish] Failed to add to cache:', e);
      // Don't throw - cache failure shouldn't fail the publish
    }
  }

  /**
   * Map RUNSTR activity type to sport type
   */
  private mapActivityToSport(activityType: RunstrActivityType): SatlantisSportType {
    const mapping: Record<RunstrActivityType, SatlantisSportType> = {
      running: 'running',
      cycling: 'cycling',
      walking: 'walking',
    };
    return mapping[activityType] || 'other';
  }

  /**
   * Build config from form state
   */
  buildConfigFromForm(
    formState: {
      title: string;
      description: string;
      location: string;
      activityType: RunstrActivityType;
      scoringType: RunstrScoringType;
      targetDistance: string;
      duration: RunstrDuration;
      pledgeCost: number;
      pledgeDestination: 'captain' | 'charity';
      pledgeCharityId: string | null;
      payoutScheme: RunstrPayoutScheme;
      prizePool: string;
      fixedPayout: string;
      bannerImageUrl: string;
      // Impact Level gating (donation-based)
      requireImpactLevel?: boolean;
      minimumImpactTier?: string;
      minimumImpactLevel?: number;
      // Team competition
      isTeamCompetition?: boolean;
      // Start date for the event
      startDate?: Date | null;
      // Legacy fields (optional)
      joinMethod?: RunstrJoinMethod;
      suggestedDonation?: string;
    },
    startTime?: number
  ): RunstrEventConfig {
    // Use form.startDate if provided, otherwise startTime param, otherwise now
    let start: number;
    if (formState.startDate) {
      start = Math.floor(formState.startDate.getTime() / 1000);
    } else if (startTime) {
      start = startTime;
    } else {
      start = Math.floor(Date.now() / 1000);
    }
    const durationSeconds = getDurationSeconds(formState.duration);

    // Resolve charity details if destination is charity
    let charityName: string | undefined;
    let charityAddress: string | undefined;
    if (formState.pledgeDestination === 'charity' && formState.pledgeCharityId) {
      // Import charities here to avoid circular dependency
      const { getCharityById } = require('../../constants/charities');
      const charity = getCharityById(formState.pledgeCharityId);
      if (charity) {
        charityName = charity.name;
        charityAddress = charity.lightningAddress;
      }
    }

    return {
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      location: formState.location.trim() || undefined,
      bannerImageUrl: formState.bannerImageUrl || undefined,
      activityType: formState.activityType,
      scoringType: formState.scoringType,
      targetDistance:
        formState.scoringType === 'fastest_time'
          ? parseFloat(formState.targetDistance) || undefined
          : undefined,
      targetDistanceUnit: 'km',
      payoutScheme: formState.payoutScheme,
      prizePoolSats: parseInt(formState.prizePool, 10) || 0,
      fixedPayoutAmount:
        formState.payoutScheme === 'fixed_amount'
          ? parseInt(formState.fixedPayout, 10) || undefined
          : undefined,
      // Use pledge system instead of legacy joinMethod
      joinMethod: 'open', // Legacy: default to open
      pledgeCost: formState.pledgeCost,
      pledgeDestination: formState.pledgeDestination,
      pledgeCharityAddress: charityAddress,
      pledgeCharityName: charityName,
      duration: formState.duration,
      startTime: start,
      endTime: start + durationSeconds,
      creatorHasNWC: false, // Will be checked at publish time
      // Impact Level gating (donation-based)
      minimumImpactLevel: formState.requireImpactLevel ? formState.minimumImpactLevel : undefined,
      minimumImpactTier: formState.requireImpactLevel ? formState.minimumImpactTier : undefined,
      // Team competition
      isTeamCompetition: formState.isTeamCompetition || false,
    };
  }
}

export const RunstrEventPublishService =
  RunstrEventPublishServiceClass.getInstance();
export default RunstrEventPublishService;
