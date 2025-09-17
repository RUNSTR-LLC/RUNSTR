import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import { NostrRelayManager } from './NostrRelayManager';
import { NostrTeamService } from './NostrTeamService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InitializationProgress {
  step: string;
  progress: number;
  message: string;
}

export class NostrInitializationService {
  private static instance: NostrInitializationService;
  private ndk: NDK | null = null;
  private isInitialized = false;
  private prefetchedTeams: any[] = [];
  private relayManager: NostrRelayManager;
  private teamService: NostrTeamService;

  private constructor() {
    this.relayManager = NostrRelayManager.getInstance();
    this.teamService = NostrTeamService.getInstance();
  }

  static getInstance(): NostrInitializationService {
    if (!NostrInitializationService.instance) {
      NostrInitializationService.instance = new NostrInitializationService();
    }
    return NostrInitializationService.instance;
  }

  async connectToRelays(): Promise<void> {
    console.log('🔌 Connecting to Nostr relays...');

    try {
      // Initialize relay manager with default relays
      const defaultRelays = [
        'wss://relay.damus.io',
        'wss://relay.primal.net',
        'wss://nos.lol',
        'wss://relay.nostr.band',
      ];

      // Store relay URLs for later use
      await AsyncStorage.setItem('nostr_relays', JSON.stringify(defaultRelays));

      // Pre-initialize relay connections
      for (const relay of defaultRelays) {
        try {
          console.log(`Connecting to ${relay}...`);
          // Simulate connection (actual connection happens in NDK)
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.warn(`Failed to connect to ${relay}:`, error);
        }
      }

      console.log('✅ Relay connections prepared');
    } catch (error) {
      console.error('❌ Relay connection failed:', error);
      throw error;
    }
  }

  async initializeNDK(): Promise<NDK> {
    if (this.isInitialized && this.ndk) {
      console.log('✅ NDK already initialized');
      return this.ndk;
    }

    console.log('🚀 Initializing NDK...');

    try {
      // Get stored relay URLs
      const storedRelays = await AsyncStorage.getItem('nostr_relays');
      const relayUrls = storedRelays ? JSON.parse(storedRelays) : [
        'wss://relay.damus.io',
        'wss://relay.primal.net',
        'wss://nos.lol',
        'wss://relay.nostr.band',
      ];

      // Create NDK instance
      this.ndk = new NDK({
        explicitRelayUrls: relayUrls,
        autoConnectUserRelays: true,
        autoFetchUserMutelist: false,
      });

      // Connect to relays
      await this.ndk.connect(2000); // 2 second timeout

      // Store NDK instance globally for other services
      (global as any).preInitializedNDK = this.ndk;

      this.isInitialized = true;
      console.log('✅ NDK initialized successfully');

      return this.ndk;
    } catch (error) {
      console.error('❌ NDK initialization failed:', error);
      throw error;
    }
  }

  async prefetchTeams(): Promise<void> {
    console.log('🏃 Pre-fetching teams...');

    try {
      if (!this.ndk) {
        await this.initializeNDK();
      }

      // Create filter for team discovery
      const filter: NDKFilter = {
        kinds: [31890],
        '#t': ['team'],
        limit: 50,
      };

      // Fetch team events
      const events = await this.ndk!.fetchEvents(filter);

      // Convert to array and parse
      const teams = Array.from(events).map(event => {
        try {
          const content = JSON.parse(event.content);
          return {
            id: event.id,
            name: content.name || 'Unknown Team',
            description: content.description || '',
            captain: content.captain || event.pubkey,
            memberCount: content.memberCount || 0,
            imageUrl: content.picture || content.image || null,
            tags: event.tags,
            created: event.created_at,
          };
        } catch (error) {
          console.warn('Failed to parse team event:', error);
          return null;
        }
      }).filter(Boolean);

      this.prefetchedTeams = teams;

      // Cache teams for quick access
      await AsyncStorage.setItem('prefetched_teams', JSON.stringify(teams));
      await AsyncStorage.setItem('prefetch_timestamp', Date.now().toString());

      console.log(`✅ Pre-fetched ${teams.length} teams`);
    } catch (error) {
      console.error('❌ Team pre-fetch failed:', error);
      // Don't throw - this is non-critical
    }
  }

  getPrefetchedTeams(): any[] {
    return this.prefetchedTeams;
  }

  getNDK(): NDK | null {
    return this.ndk;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async cleanup(): Promise<void> {
    if (this.ndk) {
      // Disconnect from relays
      for (const relay of this.ndk.pool.relays.values()) {
        relay.disconnect();
      }
      this.ndk = null;
      this.isInitialized = false;
    }
  }
}