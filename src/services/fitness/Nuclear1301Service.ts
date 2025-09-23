/**
 * Nuclear1301Service - Proven 1301 Workout Event Discovery
 * Extracted from workoutMergeService.ts - uses exact same NDK pattern as successful team discovery
 * 3-second timeout, nuclear approach with zero validation for maximum reliability
 */

import type { NostrWorkout } from '../../types/nostrWorkout';

export class Nuclear1301Service {
  private static instance: Nuclear1301Service;

  private constructor() {}

  static getInstance(): Nuclear1301Service {
    if (!Nuclear1301Service.instance) {
      Nuclear1301Service.instance = new Nuclear1301Service();
    }
    return Nuclear1301Service.instance;
  }

  /**
   * Get ALL 1301 events for user - NUCLEAR APPROACH (same as team discovery)
   * Uses proven 3-second timeout and NDK singleton pattern
   */
  async getUserWorkouts(pubkey: string): Promise<NostrWorkout[]> {
    try {
      if (!pubkey) {
        console.log('⚠️ No pubkey provided - returning empty array (nuclear approach)');
        return [];
      }

      console.log('🚀🚀🚀 NUCLEAR WORKOUT APPROACH: Getting ALL 1301 events for user (no filtering)...');
      console.log('🔍 Input pubkey analysis:', {
        pubkey: pubkey.slice(0, 12) + '...',
        length: pubkey.length,
        startsWithNpub: pubkey.startsWith('npub1'),
        isValidHex: /^[0-9a-fA-F]{64}$/.test(pubkey)
      });
      
      // NUCLEAR APPROACH: Use NDK (like successful team discovery)
      const { nip19 } = await import('nostr-tools');
      const NDK = await import('@nostr-dev-kit/ndk');
      
      let hexPubkey = pubkey;
      if (pubkey.startsWith('npub1')) {
        const decoded = nip19.decode(pubkey);
        hexPubkey = decoded.data as string;
        console.log(`🔧 Converted npub to hex: ${pubkey.slice(0, 20)}... → ${hexPubkey.slice(0, 20)}...`);
      }

      console.log(`📊 NDK NUCLEAR QUERY: Getting ALL kind 1301 events for ${hexPubkey.slice(0, 16)}...`);

      // Use same NDK singleton as teams (proven reliable)
      const g = globalThis as any;
      let ndk = g.__RUNSTR_NDK_INSTANCE__;
      
      if (!ndk) {
        console.log('[NDK Workout] Creating NDK instance...');
        // Nuclear relay list (comprehensive coverage like successful script)
        const relayUrls = [
          'wss://relay.damus.io',           // Primary - most important
          'wss://nos.lol',                  // Secondary  
          'wss://relay.primal.net',         // Tertiary
          'wss://nostr.wine',              // Quaternary
          'wss://relay.nostr.band',        // Additional
          'wss://relay.snort.social',      // Additional
          'wss://nostr-pub.wellorder.net', // Additional
          'wss://relay.nostrich.de',       // Extra coverage
          'wss://nostr.oxtr.dev',          // Extra coverage
          'wss://relay.wellorder.net',     // Extra coverage
        ];

        ndk = new NDK.default({
          explicitRelayUrls: relayUrls
        });
        
        await ndk.connect();
        console.log('[NDK Workout] Connected to relays');
        
        // Store in global singleton like teams
        g.__RUNSTR_NDK_INSTANCE__ = ndk;
      } else {
        console.log('[NDK Workout] Reusing existing NDK instance from teams');
      }

      const events: any[] = [];

      // NUCLEAR FILTER: Just kind 1301 + author - NO other restrictions (same as teams work)
      const nuclearFilter = {
        kinds: [1301],
        authors: [hexPubkey],
        limit: 500
        // NO time filters (since/until) - nuclear approach
        // NO content filters - nuclear approach  
        // NO tag validation - nuclear approach
      };

      console.log('🚀 NDK NUCLEAR FILTER:', nuclearFilter);

      // Use NDK subscription (like teams)
      const subscription = ndk.subscribe(nuclearFilter, {
        cacheUsage: NDK.NDKSubscriptionCacheUsage?.ONLY_RELAY
      });

      subscription.on('event', (event: any) => {
        console.log(`📥 NDK NUCLEAR 1301 EVENT:`, {
          id: event.id?.slice(0, 8),
          kind: event.kind,
          created_at: new Date(event.created_at * 1000).toISOString(),
          pubkey: event.pubkey?.slice(0, 8),
          tags: event.tags?.length
        });
        
        // ULTRA NUCLEAR: Accept ANY kind 1301 event - ZERO validation!
        if (event.kind === 1301) {
          events.push(event);
          console.log(`✅ NDK NUCLEAR ACCEPT: Event ${events.length} added - NO filtering!`);
        }
      });

      subscription.on('eose', () => {
        console.log('📨 NDK EOSE received - continuing to wait for complete timeout...');
      });

      // Wait for ALL events (nuclear approach - ultra-fast timeout proven by script) 
      console.log('⏰ NDK NUCLEAR TIMEOUT: Waiting 3 seconds for ALL 1301 events...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      subscription.stop();

      console.log(`🚀🚀🚀 NUCLEAR RESULT: Found ${events.length} raw 1301 events`);

      if (events.length === 0) {
        console.log('⚠️ NO 1301 EVENTS FOUND - This suggests:');
        console.log('   1. User has no 1301 events published to these relays');
        console.log('   2. Pubkey conversion issue');
        console.log('   3. Relay connectivity issue');
      }

      // ULTRA NUCLEAR PARSING: Create workouts from ALL 1301 events - ZERO validation!
      const workouts: NostrWorkout[] = [];
      
      for (const event of events) {
        try {
          // ULTRA NUCLEAR: Accept ANY tags, ANY content, ANY structure
          const tags = event.tags || [];
          let workoutType = 'unknown';
          let duration = 0;
          let distance = 0;
          let calories = 0;
          
          // Try to extract tags but accept ANYTHING - no requirements
          for (const tag of tags) {
            if (tag[0] === 'exercise' && tag[1]) workoutType = tag[1];
            if (tag[0] === 'duration' && tag[1]) {
              const timeStr = tag[1];
              const parts = timeStr.split(':').map((p: string) => parseInt(p));
              if (parts.length === 3) {
                duration = parts[0] * 3600 + parts[1] * 60 + parts[2]; // H:M:S
              } else if (parts.length === 2) {
                duration = parts[0] * 60 + parts[1]; // M:S
              } else {
                duration = 0;
              }
            }
            if (tag[0] === 'distance' && tag[1]) distance = parseFloat(tag[1]) || 0;
            if (tag[0] === 'calories' && tag[1]) calories = parseInt(tag[1]) || 0;
            // Could be other tag formats - just try them all
            if (tag[0] === 'type' && tag[1]) workoutType = tag[1];
            if (tag[0] === 'activity' && tag[1]) workoutType = tag[1];
          }

          // ULTRA NUCLEAR: Create workout even if ALL fields are missing/zero
          const workout: NostrWorkout = {
            id: event.id,
            userId: 'nostr_user', // Generic for tab display
            type: workoutType as any,
            startTime: new Date(event.created_at * 1000).toISOString(),
            endTime: new Date((event.created_at + Math.max(duration * 60, 60)) * 1000).toISOString(), // Min 1 minute
            duration: duration,
            distance: distance,
            calories: calories,
            source: 'nostr',
            nostrEventId: event.id,
            nostrPubkey: event.pubkey,
            syncedAt: new Date().toISOString()
          };

          workouts.push(workout);
          console.log(`✅ ULTRA NUCLEAR WORKOUT ${workouts.length}: ${workout.type} - ${new Date(workout.startTime).toDateString()} (dur:${workout.duration}, dist:${workout.distance})`);
          
        } catch (error) {
          console.warn(`⚠️ Error in ultra nuclear parsing ${event.id}:`, error);
          // ULTRA NUCLEAR: Even if parsing fails, create a basic workout
          const fallbackWorkout: NostrWorkout = {
            id: event.id,
            userId: 'nostr_user',
            type: 'raw_1301' as any,
            startTime: new Date(event.created_at * 1000).toISOString(),
            endTime: new Date((event.created_at + 60) * 1000).toISOString(),
            duration: 0,
            distance: 0,
            calories: 0,
            source: 'nostr',
            nostrEventId: event.id,
            nostrPubkey: event.pubkey,
            syncedAt: new Date().toISOString()
          };
          workouts.push(fallbackWorkout);
          console.log(`🆘 FALLBACK WORKOUT ${workouts.length}: raw_1301 - ${new Date(fallbackWorkout.startTime).toDateString()}`);
        }
      }

      console.log(`🎉 NUCLEAR SUCCESS: Created ${workouts.length} workout objects from ${events.length} raw events`);
      
      if (workouts.length > 0) {
        // Show date range
        const dates = workouts.map(w => new Date(w.startTime).getTime()).sort();
        const oldest = new Date(dates[0]);
        const newest = new Date(dates[dates.length - 1]);
        console.log(`📅 Date range: ${oldest.toDateString()} → ${newest.toDateString()}`);
      }

      return workouts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    } catch (error) {
      console.error('❌ Nuclear 1301 discovery failed:', error);
      return [];
    }
  }
}

export default Nuclear1301Service.getInstance();