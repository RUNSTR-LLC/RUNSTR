/**
 * WalletSync - Background Nostr synchronization
 * Non-blocking sync, backup/restore, auto-claim nutzaps
 * Works independently from core wallet
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NDK, { NDKEvent, NDKPrivateKeySigner, NDKKind } from '@nostr-dev-kit/ndk';
import { Proof } from '@cashu/cashu-ts';
import WalletCore from './WalletCore';
import { unifiedNotificationStore } from '../notifications/UnifiedNotificationStore';

// Event kinds
const EVENT_KINDS = {
  WALLET_INFO: 37375,
  NUTZAP: 9321
} as const;

// Relay URLs
const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol'
];

/**
 * Background Nostr sync service
 */
export class WalletSync {
  private static instance: WalletSync;

  private ndk: NDK | null = null;
  private userPubkey: string = '';
  private isConnected: boolean = false;
  private autoClaimInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): WalletSync {
    if (!WalletSync.instance) {
      WalletSync.instance = new WalletSync();
    }
    return WalletSync.instance;
  }

  /**
   * Initialize Nostr connection (non-blocking)
   */
  async initialize(nsec: string, hexPubkey: string): Promise<void> {
    try {
      console.log('[WalletSync] Initializing Nostr connection...');

      this.userPubkey = hexPubkey;

      const signer = new NDKPrivateKeySigner(nsec);
      this.ndk = new NDK({
        explicitRelayUrls: RELAYS,
        signer
      });

      // Connect in background
      this.connectAsync();

    } catch (error) {
      console.warn('[WalletSync] Initialization failed (will retry):', error);
    }
  }

  /**
   * Connect to Nostr asynchronously
   */
  private async connectAsync(): Promise<void> {
    try {
      if (!this.ndk) return;

      await Promise.race([
        this.ndk.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);

      const connectedRelays = (this.ndk as any).pool?.connectedRelays?.size || 0;

      if (connectedRelays > 0) {
        this.isConnected = true;
        console.log(`[WalletSync] Connected to ${connectedRelays} relay(s)`);

        // Start background tasks
        this.startBackgroundTasks();
      } else {
        console.log('[WalletSync] No relays connected');
      }

    } catch (error) {
      console.log('[WalletSync] Connection failed, will retry later');
    }
  }

  /**
   * Start background tasks (sync, auto-claim)
   */
  private startBackgroundTasks(): void {
    // Auto-claim nutzaps every 30 seconds
    if (!this.autoClaimInterval) {
      this.autoClaimInterval = setInterval(() => {
        this.claimNutzaps().catch(err =>
          console.warn('[WalletSync] Auto-claim error:', err)
        );
      }, 30000);
    }

    // Initial sync
    this.syncWalletToNostr().catch(err =>
      console.warn('[WalletSync] Initial sync failed:', err)
    );
  }

  /**
   * Encrypt proofs using NIP-44 (encrypt to self)
   */
  private async encryptProofs(proofs: Proof[]): Promise<string | null> {
    try {
      if (!this.ndk || !this.ndk.signer) {
        console.warn('[WalletSync] Cannot encrypt without signer');
        return null;
      }

      const user = await this.ndk.signer.user();
      const plaintext = JSON.stringify(proofs);

      // NIP-44: Encrypt to self
      const encrypted = await user.encrypt(this.userPubkey, plaintext);
      console.log(`[WalletSync] Encrypted ${proofs.length} proofs`);
      return encrypted;
    } catch (error) {
      console.error('[WalletSync] Encryption failed:', error);
      return null;
    }
  }

  /**
   * Decrypt proofs using NIP-44
   */
  private async decryptProofs(encryptedContent: string): Promise<Proof[]> {
    try {
      if (!this.ndk || !this.ndk.signer) {
        console.warn('[WalletSync] Cannot decrypt without signer');
        return [];
      }

      const user = await this.ndk.signer.user();
      const decrypted = await user.decrypt(this.userPubkey, encryptedContent);
      const proofs = JSON.parse(decrypted);
      console.log(`[WalletSync] Decrypted ${proofs.length} proofs`);
      return proofs;
    } catch (error) {
      console.error('[WalletSync] Decryption failed:', error);
      return [];
    }
  }

  /**
   * Sync wallet to Nostr (backup)
   */
  async syncWalletToNostr(): Promise<void> {
    if (!this.ndk || !this.isConnected) {
      console.log('[WalletSync] Not connected, skipping sync');
      return;
    }

    try {
      console.log('[WalletSync] Syncing wallet to Nostr...');

      const balance = await WalletCore.getBalance();
      const dTag = `wallet-${this.userPubkey.slice(0, 16)}`;

      // Check if wallet event already exists
      const existingEvents = await this.ndk.fetchEvents({
        kinds: [EVENT_KINDS.WALLET_INFO as NDKKind],
        authors: [this.userPubkey],
        '#d': [dTag]
      });

      if (existingEvents.size > 0) {
        console.log('[WalletSync] Wallet event already exists, skipping');
        return;
      }

      // Create wallet event
      const walletEvent = new NDKEvent(this.ndk);
      walletEvent.kind = EVENT_KINDS.WALLET_INFO as NDKKind;
      walletEvent.content = JSON.stringify({
        owner: this.userPubkey,
        mints: [await AsyncStorage.getItem(`@runstr:wallet_mint:${this.userPubkey}`) || 'https://mint.coinos.io'],
        name: 'RUNSTR Wallet',
        unit: 'sat',
        balance,
        last_updated: Date.now()
      });
      walletEvent.tags = [
        ['d', dTag],
        ['mint', await AsyncStorage.getItem(`@runstr:wallet_mint:${this.userPubkey}`) || 'https://mint.coinos.io'],
        ['name', 'RUNSTR Wallet'],
        ['unit', 'sat']
      ];

      await walletEvent.publish();
      console.log('[WalletSync] Wallet synced to Nostr');

    } catch (error) {
      console.warn('[WalletSync] Sync failed:', error);
    }
  }

  /**
   * Publish nutzap event to Nostr
   */
  async publishNutzap(recipientPubkey: string, amount: number, token: string, memo: string = ''): Promise<boolean> {
    if (!this.ndk || !this.isConnected) {
      console.log('[WalletSync] Not connected, cannot publish nutzap');
      return false;
    }

    try {
      const nutzapEvent = new NDKEvent(this.ndk);
      nutzapEvent.kind = EVENT_KINDS.NUTZAP as NDKKind;
      nutzapEvent.content = memo;
      nutzapEvent.tags = [
        ['p', recipientPubkey],
        ['amount', amount.toString()],
        ['unit', 'sat'],
        ['proof', token]
      ];

      await nutzapEvent.publish();
      console.log(`[WalletSync] Published nutzap to ${recipientPubkey.slice(0, 8)}...`);
      return true;

    } catch (error) {
      console.error('[WalletSync] Publish nutzap failed:', error);
      return false;
    }
  }

  /**
   * Claim incoming nutzaps from Nostr
   */
  async claimNutzaps(): Promise<{ claimed: number; total: number }> {
    if (!this.ndk || !this.isConnected) {
      return { claimed: 0, total: 0 };
    }

    try {
      console.log('[WalletSync] Checking for incoming nutzaps...');

      const nutzapEvents = await Promise.race([
        this.ndk.fetchEvents({
          kinds: [EVENT_KINDS.NUTZAP as NDKKind],
          '#p': [this.userPubkey],
          since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
        }),
        new Promise<Set<NDKEvent>>((resolve) => setTimeout(() => resolve(new Set()), 5000))
      ]);

      let claimedAmount = 0;
      let totalAmount = 0;

      for (const event of nutzapEvents) {
        try {
          const proofTag = event.tags.find(t => t[0] === 'proof');
          const amountTag = event.tags.find(t => t[0] === 'amount');

          if (proofTag && amountTag) {
            const token = proofTag[1];
            const amount = parseInt(amountTag[1]);

            totalAmount += amount;

            // Try to receive token
            const result = await WalletCore.receiveCashuToken(token);

            if (result.amount > 0) {
              claimedAmount += result.amount;
              console.log(`[WalletSync] Claimed ${result.amount} sats from ${event.pubkey.slice(0, 8)}...`);

              // Create notification for incoming zap
              try {
                await unifiedNotificationStore.addNotification(
                  'incoming_zap',
                  `You received ${result.amount} sats!`,
                  `Lightning payment received`,
                  {
                    amount: result.amount,
                    senderPubkey: event.pubkey,
                    timestamp: event.created_at || Math.floor(Date.now() / 1000),
                  },
                  {
                    icon: 'flash',
                    actions: [
                      { id: 'view_wallet', type: 'view_wallet', label: 'View Wallet', isPrimary: true }
                    ]
                  }
                );
              } catch (notifError) {
                console.warn('[WalletSync] Failed to create zap notification:', notifError);
              }
            }
          }
        } catch (err: any) {
          console.log('[WalletSync] Error processing nutzap:', err.message);
        }
      }

      if (claimedAmount > 0) {
        console.log(`[WalletSync] Total claimed: ${claimedAmount} sats`);
      }

      return { claimed: claimedAmount, total: totalAmount };

    } catch (error: any) {
      console.warn('[WalletSync] Claim process failed:', error.message);
      return { claimed: 0, total: 0 };
    }
  }

  /**
   * Publish token event (kind 7375) - NIP-60 compliance
   * Called after every proof-changing operation (send, receive, mint)
   */
  async publishTokenEvent(proofs: Proof[], mintUrl: string): Promise<boolean> {
    if (!this.ndk || !this.isConnected) {
      console.log('[WalletSync] Not connected, skipping token event publish');
      return false;
    }

    try {
      // Encrypt proofs
      const encryptedProofs = await this.encryptProofs(proofs);
      if (!encryptedProofs) {
        console.error('[WalletSync] Failed to encrypt proofs for backup');
        return false;
      }

      // Create kind 7375 token event
      const tokenEvent = new NDKEvent(this.ndk);
      tokenEvent.kind = 7375 as NDKKind;
      tokenEvent.content = encryptedProofs; // Encrypted proof set

      // Use deterministic d-tag for replaceable event (one per mint)
      const mintHash = mintUrl.replace(/https?:\/\//, '').replace(/\//g, '-');
      tokenEvent.tags = [
        ['d', `wallet-tokens-${mintHash}`], // Replaceable per mint
        ['mint', mintUrl],
        ['balance', proofs.reduce((sum, p) => sum + p.amount, 0).toString()],
        ['proof_count', proofs.length.toString()]
      ];

      await tokenEvent.publish();
      console.log(`[WalletSync] Published token event: ${proofs.length} proofs, ${tokenEvent.tags[2][1]} sats`);
      return true;

    } catch (error) {
      console.error('[WalletSync] Token event publish failed:', error);
      return false;
    }
  }

  /**
   * Restore proofs from Nostr token events
   * Returns all proofs found across all mints
   */
  async restoreProofsFromNostr(): Promise<{ proofs: Proof[]; mintUrl: string } | null> {
    if (!this.ndk || !this.isConnected) {
      console.log('[WalletSync] Not connected, cannot restore from Nostr');
      return null;
    }

    try {
      console.log('[WalletSync] Restoring proofs from Nostr...');

      // Fetch all token events (kind 7375) for this user
      const tokenEvents = await Promise.race([
        this.ndk.fetchEvents({
          kinds: [7375 as NDKKind],
          authors: [this.userPubkey]
        }),
        new Promise<Set<NDKEvent>>((resolve) =>
          setTimeout(() => resolve(new Set()), 5000) // 5s timeout
        )
      ]);

      if (tokenEvents.size === 0) {
        console.log('[WalletSync] No token events found on Nostr');
        return null;
      }

      // Collect all proofs from all token events
      let allProofs: Proof[] = [];
      let primaryMint = '';
      let highestBalance = 0;

      for (const event of tokenEvents) {
        try {
          // Decrypt proofs from event content
          const proofs = await this.decryptProofs(event.content);

          if (proofs.length > 0) {
            allProofs.push(...proofs);

            // Track which mint has the most balance
            const mintTag = event.tags.find(t => t[0] === 'mint');
            const balance = proofs.reduce((sum, p) => sum + p.amount, 0);

            if (balance > highestBalance) {
              highestBalance = balance;
              primaryMint = mintTag?.[1] || 'https://mint.coinos.io';
            }

            console.log(`[WalletSync] Restored ${proofs.length} proofs (${balance} sats) from ${event.id.slice(0, 8)}...`);
          }
        } catch (err) {
          console.warn('[WalletSync] Failed to decrypt token event:', err);
        }
      }

      const totalBalance = allProofs.reduce((sum, p) => sum + p.amount, 0);
      console.log(`[WalletSync] Total restored: ${allProofs.length} proofs, ${totalBalance} sats`);

      return {
        proofs: allProofs,
        mintUrl: primaryMint || 'https://mint.coinos.io'
      };

    } catch (error) {
      console.error('[WalletSync] Restore failed:', error);
      return null;
    }
  }

  /**
   * Restore wallet from Nostr (for new device)
   */
  async restoreFromNostr(): Promise<{ balance: number; restored: boolean }> {
    if (!this.ndk || !this.isConnected) {
      console.log('[WalletSync] Not connected, cannot restore');
      return { balance: 0, restored: false };
    }

    try {
      console.log('[WalletSync] Attempting to restore wallet from Nostr...');

      const dTag = `wallet-${this.userPubkey.slice(0, 16)}`;

      const walletEvents = await this.ndk.fetchEvents({
        kinds: [EVENT_KINDS.WALLET_INFO as NDKKind],
        authors: [this.userPubkey],
        '#d': [dTag]
      });

      if (walletEvents.size === 0) {
        console.log('[WalletSync] No wallet found on Nostr');
        return { balance: 0, restored: false };
      }

      // Get most recent wallet event
      const latestEvent = Array.from(walletEvents)
        .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];

      const content = JSON.parse(latestEvent.content);

      console.log('[WalletSync] Found wallet on Nostr:', content);

      // Wallet restored from Nostr (proofs would need to be encrypted in content for full restore)
      // For now, just note that wallet exists
      return {
        balance: content.balance || 0,
        restored: true
      };

    } catch (error) {
      console.error('[WalletSync] Restore failed:', error);
      return { balance: 0, restored: false };
    }
  }

  /**
   * Stop background tasks
   */
  stopBackgroundTasks(): void {
    if (this.autoClaimInterval) {
      clearInterval(this.autoClaimInterval);
      this.autoClaimInterval = null;
    }
  }

  /**
   * Reset instance
   */
  reset(): void {
    this.stopBackgroundTasks();
    this.ndk = null;
    this.userPubkey = '';
    this.isConnected = false;
  }

  /**
   * Get connection status
   */
  isNostrConnected(): boolean {
    return this.isConnected;
  }
}

export default WalletSync.getInstance();
